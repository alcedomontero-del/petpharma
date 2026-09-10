/**
 * chat-agent.js — "Vico", el asistente virtual de la farmacia
 * ---------------------------------------------------------
 * Usa Firebase AI Logic (el SDK oficial de Firebase para llamar a
 * Gemini directo desde el navegador, SIN backend propio) en vez de
 * pegar una API key de un proveedor externo directo en el código.
 *
 * Por qué este cambio frente a la primera versión (DeepSeek):
 *  - Es 100% gratis: usa la "capa gratuita" de la Gemini Developer
 *    API a través de tu MISMO proyecto Firebase (el de window.
 *    FIREBASE_CONFIG en config.js) — no hace falta crear cuenta en
 *    otro proveedor ni pegar una clave nueva.
 *  - No requiere backend: es un SDK cliente pensado para apps web/
 *    móviles, igual de "sin servidor" que el resto de PetPharma.
 *  - Más seguro: en vez de una clave secreta suelta en el código
 *    (que cualquiera puede copiar desde "Ver código fuente"), usa la
 *    configuración pública normal de Firebase + Firebase App Check
 *    para verificar que las peticiones vienen de tu propio sitio.
 *
 * Requisito en la consola de Firebase (una sola vez, gratis):
 *  1. Ve a Firebase Console → tu proyecto → "AI Logic" (o "Build" →
 *     "AI Logic" en el menú lateral) → Comenzar → elige "Gemini
 *     Developer API" (la opción con capa gratuita, no pide tarjeta).
 *  2. Eso activa el servicio para tu proyecto. No necesitas más
 *     configuración aquí: usa las mismas credenciales de
 *     window.FIREBASE_CONFIG que ya tienes en config.js.
 *
 * Firebase exige "App Check" (verificación de que la app es la tuya)
 * para usar AI Logic a partir del 2 de noviembre de 2026. Antes de
 * esa fecha, o si ya configuraste una site key de reCAPTCHA en
 * window.AGENTE_IA_CONFIG.appCheckSiteKey (ver config.js), Vico
 * funciona igual; guía de cómo sacar esa site key en LEEME.txt.
 *
 * Firebase ahora recomienda reCAPTCHA Enterprise para integraciones
 * nuevas (más señales anti-fraude que v3, y sigue siendo gratis hasta
 * 10,000 verificaciones/mes). Por eso este archivo usa
 * ReCaptchaEnterpriseProvider por defecto. Si en vez de eso registraste
 * tu app con el proveedor "reCAPTCHA v3" clásico en la consola de
 * Firebase, cambia window.AGENTE_IA_CONFIG.appCheckProveedor a "v3" en
 * config.js (ver comentario ahí) — el site key de un proveedor NO
 * funciona con el otro, así que deben coincidir.
 * ---------------------------------------------------------
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { initializeAppCheck, ReCaptchaEnterpriseProvider, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app-check.js";
import { getAI, getGenerativeModel, GoogleAIBackend } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-ai.js";

let chatSession = null;
let productosCache = [];
let bienvenidaMostrada = false;
let cargandoRespuesta = false;
let catalogoTextoActual = "";

function cfg() {
  return window.AGENTE_IA_CONFIG || {};
}

function proyectoConfigurado() {
  const fc = window.FIREBASE_CONFIG || {};
  return !!fc.apiKey && !/^TU_/.test(fc.apiKey);
}

// ---------- Construir el "conocimiento" del catálogo ----------
function truncar(texto, max) {
  if (!texto) return "";
  return texto.length > max ? texto.slice(0, max) + "…" : texto;
}

function construirCatalogoTexto(productos, categorias) {
  const mapaCategorias = Object.fromEntries((categorias || []).map((c) => [c.id, c.nombre || c.id]));
  const MAX_PRODUCTOS = 220; // límite prudente para no disparar el tamaño del prompt
  const lista = productos.slice(0, MAX_PRODUCTOS).map((p) => {
    const cat = mapaCategorias[p.category] || p.category || "sin categoría";
    const especies = (p.species || []).join("/") || "no especificado";
    const rx = p.requiresPrescription ? "SÍ requiere receta" : "no requiere receta";
    const stockTxt = (p.stock || 0) > 0 ? `${p.stock} unidades disponibles` : "agotado";
    const partes = [
      `• "${p.name}"`,
      p.brand ? `marca ${p.brand}` : null,
      p.activeSubstance ? `principio activo: ${p.activeSubstance}` : null,
      `categoría: ${cat}`,
      `especie(s): ${especies}`,
      `precio: ${window.formatearPrecio ? window.formatearPrecio(p.price) : "$" + p.price}`,
      stockTxt,
      rx,
      p.dosage ? `dosis indicada: ${truncar(p.dosage, 140)}` : null,
      p.indications ? `indicaciones: ${truncar(p.indications, 200)}` : null,
      p.description ? `descripción: ${truncar(p.description, 200)}` : null,
    ].filter(Boolean);
    return partes.join(" | ");
  });
  let texto = lista.join("\n");
  if (productos.length > MAX_PRODUCTOS) {
    texto += `\n(catálogo truncado: hay ${productos.length} medicamentos en total, se muestran los primeros ${MAX_PRODUCTOS})`;
  }
  return texto;
}

function systemPrompt(catalogoTexto) {
  const nombre = cfg().nombreAgente || "Vico";
  return `Eres ${nombre}, el asistente virtual de una farmacia veterinaria online.
Tu tono es cálido, claro y profesional, como el de un auxiliar de farmacia con buena
disposición. Nunca digas que eres un modelo de lenguaje ni menciones qué IA te da soporte.

REGLAS IMPORTANTES:
- Solo puedes hablar de los medicamentos que aparecen en el catálogo de abajo. Si preguntan
  por algo que no está en la lista, dilo con honestidad y sugiere contactar a la farmacia.
- Nunca inventes precios, dosis, stock ni indicaciones que no estén en el catálogo.
- Si un medicamento "SÍ requiere receta", acláralo siempre que lo menciones y recuerda que
  hay que subir la receta desde la tienda para poder recibirlo.
- No reemplazas a un veterinario: si preguntan por una dosis exacta para un animal
  específico, o algo que no está en el catálogo, recomienda confirmarlo con su veterinario.
- Sé breve (2-4 frases por respuesta salvo que pidan una lista).

CATÁLOGO ACTUAL DE LA FARMACIA:
${catalogoTexto || "(catálogo vacío por ahora)"}`;
}

// ---------- Firebase AI Logic ----------
async function iniciarSesionDeChat() {
  // Nombre de instancia propio ("vico-ai-app") para no chocar con la
  // instancia por defecto que usa firebase-real.js (Auth/Firestore).
  const firebaseApp = initializeApp(window.FIREBASE_CONFIG, "vico-ai-app");

  const siteKey = cfg().appCheckSiteKey;
  if (siteKey) {
    try {
      // "enterprise" (default) o "v3" — debe coincidir con el proveedor
      // que elegiste al registrar la app en Firebase Console → App Check.
      const proveedor = cfg().appCheckProveedor || "enterprise";
      const provider = proveedor === "v3"
        ? new ReCaptchaV3Provider(siteKey)
        : new ReCaptchaEnterpriseProvider(siteKey);
      initializeAppCheck(firebaseApp, {
        provider,
        isTokenAutoRefreshEnabled: true,
      });
    } catch (error) {
      console.error("Vico: no se pudo iniciar App Check", error);
    }
  }

  const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
  const model = getGenerativeModel(ai, {
    model: cfg().modelo || "gemini-2.5-flash",
    systemInstruction: systemPrompt(catalogoTextoActual),
  });
  return model.startChat({ history: [] });
}

async function cargarCatalogo() {
  try {
    const [productos, categorias] = await Promise.all([
      window.DB.getProductos(),
      window.DB.getCategorias(),
    ]);
    productosCache = productos || [];
    catalogoTextoActual = construirCatalogoTexto(productosCache, categorias || []);
  } catch (error) {
    console.error("Vico: no se pudo cargar el catálogo", error);
    catalogoTextoActual = "(no se pudo cargar el catálogo de medicamentos)";
  }
}

async function preguntarAgente(mensajeUsuario) {
  if (!chatSession) {
    chatSession = await iniciarSesionDeChat();
  }
  const resultado = await chatSession.sendMessage(mensajeUsuario);
  return resultado.response.text().trim() || "No pude generar una respuesta, intenta de nuevo.";
}

// ---------- Interfaz (widget) ----------
function escaparHtml(texto) {
  const div = document.createElement("div");
  div.innerText = texto;
  return div.innerHTML;
}

function inyectarEstilos() {
  const style = document.createElement("style");
  style.textContent = `
    .vico-bubble {
      position: fixed; bottom: 22px; right: 22px; z-index: 9998;
      width: 58px; height: 58px; border-radius: 999px;
      background: linear-gradient(135deg, #d97706, #f59e0b);
      color: #1c1917; font-size: 26px; border: none; cursor: pointer;
      box-shadow: 0 10px 30px rgba(0,0,0,.35);
      display: flex; align-items: center; justify-content: center;
      transition: transform .15s ease;
    }
    .vico-bubble:hover { transform: scale(1.06); }
    .vico-panel {
      position: fixed; bottom: 92px; right: 22px; z-index: 9998;
      width: min(360px, 92vw); height: min(480px, 70vh);
      background: #0f172a; border: 1px solid rgba(255,255,255,.1);
      border-radius: 18px; box-shadow: 0 20px 60px rgba(0,0,0,.5);
      display: none; flex-direction: column; overflow: hidden;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }
    .vico-panel.open { display: flex; }
    .vico-header {
      background: #064e3b; color: #ecfdf5; padding: 14px 16px;
      display: flex; align-items: center; justify-content: space-between;
      font-weight: 800; font-size: 14px;
    }
    .vico-header button { background: none; border: none; color: #ecfdf5; font-size: 18px; cursor: pointer; }
    .vico-messages {
      flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px;
    }
    .vico-msg { max-width: 85%; padding: 9px 12px; border-radius: 14px; font-size: 13px; line-height: 1.4; white-space: pre-wrap; }
    .vico-msg.user { align-self: flex-end; background: #047857; color: #fff; border-bottom-right-radius: 4px; }
    .vico-msg.bot { align-self: flex-start; background: #1e293b; color: #e2e8f0; border-bottom-left-radius: 4px; }
    .vico-msg.system { align-self: center; background: transparent; color: #94a3b8; font-size: 11px; text-align: center; }
    .vico-input-row { display: flex; gap: 8px; padding: 10px; border-top: 1px solid rgba(255,255,255,.08); }
    .vico-input-row input {
      flex: 1; background: #1e293b; border: 1px solid rgba(255,255,255,.1); color: #fff;
      border-radius: 10px; padding: 9px 12px; font-size: 13px; outline: none;
    }
    .vico-input-row button {
      background: #d97706; color: #1c1917; border: none; border-radius: 10px;
      padding: 0 14px; font-weight: 800; cursor: pointer; font-size: 13px;
    }
    .vico-input-row button:disabled { opacity: .5; cursor: not-allowed; }
  `;
  document.head.appendChild(style);
}

function agregarMensaje(texto, tipo) {
  const cont = document.getElementById("vicoMessages");
  const div = document.createElement("div");
  div.className = "vico-msg " + tipo;
  div.innerHTML = escaparHtml(texto);
  cont.appendChild(div);
  cont.scrollTop = cont.scrollHeight;
}

function construirWidget() {
  const nombre = cfg().nombreAgente || "Vico";
  const bienvenida = cfg().mensajeBienvenida ||
    `¡Hola! Soy ${nombre} 🩺, tu asistente de farmacia. Pregúntame por cualquier medicamento del catálogo: dosis, precio, si necesita receta, o para qué se usa.`;

  const bubble = document.createElement("button");
  bubble.className = "vico-bubble";
  bubble.setAttribute("aria-label", "Abrir chat con " + nombre);
  bubble.innerText = "💬";

  const panel = document.createElement("div");
  panel.className = "vico-panel";
  panel.innerHTML = `
    <div class="vico-header">
      <span>🩺 ${nombre} — Asistente de Farmacia</span>
      <button id="vicoCerrar" aria-label="Cerrar chat">✕</button>
    </div>
    <div class="vico-messages" id="vicoMessages"></div>
    <div class="vico-input-row">
      <input id="vicoInput" type="text" placeholder="Escribe tu pregunta..." maxlength="400" />
      <button id="vicoEnviar">Enviar</button>
    </div>
  `;

  document.body.appendChild(bubble);
  document.body.appendChild(panel);

  let abierto = false;

  bubble.addEventListener("click", () => {
    abierto = !abierto;
    panel.classList.toggle("open", abierto);
    if (abierto && !bienvenidaMostrada) {
      bienvenidaMostrada = true;
      if (!proyectoConfigurado()) {
        agregarMensaje(
          "⚠️ Este asistente todavía no está configurado. El administrador debe completar window.FIREBASE_CONFIG en js/config.js con las credenciales reales del proyecto.",
          "system"
        );
      } else {
        agregarMensaje(bienvenida, "bot");
      }
      document.getElementById("vicoInput").focus();
    }
  });

  document.getElementById("vicoCerrar").addEventListener("click", () => {
    abierto = false;
    panel.classList.remove("open");
  });

  async function enviar() {
    if (cargandoRespuesta) return;
    const input = document.getElementById("vicoInput");
    const texto = input.value.trim();
    if (!texto) return;

    if (!proyectoConfigurado()) {
      agregarMensaje(
        "⚠️ Este asistente todavía no está configurado. El administrador debe completar window.FIREBASE_CONFIG en js/config.js.",
        "system"
      );
      return;
    }

    input.value = "";
    agregarMensaje(texto, "user");

    const btn = document.getElementById("vicoEnviar");
    cargandoRespuesta = true;
    btn.disabled = true;
    agregarMensaje("Escribiendo…", "system");
    const cont = document.getElementById("vicoMessages");
    const indicador = cont.lastElementChild;

    try {
      const respuesta = await preguntarAgente(texto);
      indicador.remove();
      agregarMensaje(respuesta, "bot");
    } catch (error) {
      console.error("Vico: error consultando Gemini", error);
      indicador.remove();
      agregarMensaje(
        "No pude conectarme con el asistente en este momento (revisa que la Gemini Developer API esté activada en Firebase AI Logic). Intenta de nuevo en un momento.",
        "system"
      );
    } finally {
      cargandoRespuesta = false;
      btn.disabled = false;
    }
  }

  document.getElementById("vicoEnviar").addEventListener("click", enviar);
  document.getElementById("vicoInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") enviar();
  });
}

window.cuandoDBListo(async () => {
  inyectarEstilos();
  construirWidget();
  await cargarCatalogo();
});
