/**
 * ui.js — pequeñas utilidades visuales compartidas por todas las páginas
 */
window.pintarBadgeModo = function (contenedorId) {
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor) return;
  if (window.ES_LOCAL) {
    contenedor.innerHTML =
      '<span class="mode-badge-local">🧪 Modo demostración local — nada de esto está en internet todavía</span>';
  }
};

// Convierte texto en algo seguro de meter dentro de un atributo HTML
window.escAttr = function (valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

// Convierte texto en algo seguro de insertar como contenido HTML
window.escHtml = function (valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
};

// Deja solo los dígitos de un teléfono, para poder comparar dos números
// escritos con formatos distintos (espacios, guiones, +1, etc.)
window.normalizarTelefono = function (valor) {
  return String(valor ?? "").replace(/\D/g, "");
};

// Arma un link de WhatsApp a partir de un teléfono (agrega 1 si parece
// un número dominicano de 10 dígitos sin código de país)
window.linkWhatsApp = function (telefono) {
  let digitos = window.normalizarTelefono(telefono);
  if (digitos.length === 10) digitos = "1" + digitos;
  return `https://wa.me/${digitos}`;
};

window.mostrarToast = function (mensaje, tipo, duracionMs) {
  let toast = document.getElementById("toast-global");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast-global";
    toast.className = "toast-pp";
    document.body.appendChild(toast);
  }
  toast.textContent = mensaje;
  toast.className = "toast-pp show" + (tipo === "error" ? " error" : "");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove("show");
  }, duracionMs || 3200);
};

// Traduce un error de Firebase/Firestore a un mensaje entendible y lo
// muestra en un toast con más tiempo en pantalla que uno normal (los
// errores de conexión al cargar la página son fáciles de perderse si
// desaparecen en 3 segundos). Se usa desde boot.js y auth.js cada vez que
// falla algo al hablar con la base de datos.
window.avisarErrorConexion = function (error) {
  const codigo = error && error.code ? String(error.code) : "";
  let mensaje;
  if (codigo.includes("unavailable")) {
    mensaje =
      "No se pudo conectar con la base de datos. Revisa tu conexión a internet; si usas un bloqueador de anuncios, VPN o antivirus, prueba desactivarlo y recargar la página.";
  } else if (codigo.includes("permission-denied")) {
    mensaje = "No tienes permiso para esta acción. Verifica que iniciaste sesión como administrador.";
  } else if (codigo.includes("unauthenticated")) {
    mensaje = "Tu sesión expiró o no es válida. Inicia sesión de nuevo.";
  } else {
    mensaje = (error && error.message) || "Ocurrió un error inesperado. Intenta de nuevo.";
  }
  window.mostrarToast(mensaje, "error", 7000);
};

// ---------- Lupa / visor de foto completa (lightbox) ----------
// Uso: window.abrirLightbox(urlDeLaImagen, textoAlternativo)
(function () {
  function asegurarLightbox() {
    let lb = document.getElementById("pp-lightbox");
    if (lb) return lb;
    lb = document.createElement("div");
    lb.id = "pp-lightbox";
    lb.className = "pp-lightbox-overlay hidden";
    lb.innerHTML = `
      <div class="pp-lightbox-frame">
        <button type="button" id="pp-lightbox-close" class="pp-lightbox-close" title="Cerrar">✕</button>
        <img id="pp-lightbox-img" src="" alt="" />
      </div>`;
    document.body.appendChild(lb);
    lb.addEventListener("click", (e) => {
      if (e.target === lb) window.cerrarLightbox();
    });
    document.getElementById("pp-lightbox-close").addEventListener("click", window.cerrarLightbox);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") window.cerrarLightbox();
    });
    return lb;
  }

  window.abrirLightbox = function (url, alt) {
    if (!url) return;
    const lb = asegurarLightbox();
    document.getElementById("pp-lightbox-img").src = url;
    document.getElementById("pp-lightbox-img").alt = alt || "Foto ampliada";
    lb.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  };

  window.cerrarLightbox = function () {
    const lb = document.getElementById("pp-lightbox");
    if (lb) lb.classList.add("hidden");
    document.body.style.overflow = "";
  };
})();

// ---------- Selector de emoji reutilizable para categorías ----------
window.EMOJIS_CATEGORIAS = [
  "🐜", "💊", "🩹", "🦴", "🧴", "❤️", "💉", "🐾",
  "🐕", "🐈", "🐎", "🦜", "🐰", "🦎", "🩺", "🧪",
  "🌡️", "🧬", "🦷", "👁️", "🧠", "🫀", "🫁", "🦵",
  "🩸", "🧻", "🧼", "🍖", "🥩", "🧶", "🎗️", "⚕️",
];

window.construirEmojiGrid = function (contenedorId, onSeleccionar, seleccionActual) {
  const grid = document.getElementById(contenedorId);
  if (!grid) return;
  grid.innerHTML = window.EMOJIS_CATEGORIAS.map(
    (e) => `<button type="button" class="emoji-btn${e === seleccionActual ? " selected" : ""}" data-emoji="${e}">${e}</button>`
  ).join("");
  grid.querySelectorAll(".emoji-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      grid.querySelectorAll(".emoji-btn").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      onSeleccionar(btn.dataset.emoji);
    });
  });
};
