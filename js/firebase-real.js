/**
 * firebase-real.js
 * ---------------------------------------------------------
 * Conexión REAL a Firebase (Authentication + Firestore) y a
 * Cloudinary (subida de imágenes). Se carga como módulo de
 * JavaScript SOLO cuando env.js detecta que la página ya no
 * está en local (es decir, ya está desplegada de verdad).
 *
 * Antes de que esto funcione, edita js/config.js con tus
 * credenciales reales. Guía paso a paso completa en LEEME.txt.
 *
 * Crea la cuenta de administrador en Firebase Authentication
 * (Authentication > Users > Add user) con el correo y clave
 * reales que quieras usar para entrar a admin.html.
 * ---------------------------------------------------------
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  initializeFirestore,
  collection,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp(window.FIREBASE_CONFIG);
const auth = getAuth(app);

// Se usa initializeFirestore (en vez de getFirestore) forzando detección
// automática de "long polling" y desactivando fetch streams. El canal de
// conexión normal de Firestore (WebChannel por streaming) es el que suelen
// bloquear silenciosamente ciertos antivirus, VPNs, proxies corporativos y
// extensiones de bloqueo de anuncios — el síntoma es exactamente
// "Failed to get document because the client is offline" aunque el resto de
// internet (incluido Firebase Auth) funcione normal. Este ajuste resuelve la
// gran mayoría de esos casos sin pedirle nada al usuario final.
// Lo que pegaste (INCORRECTO):


// Lo correcto:
const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  useFetchStreams: false,
}, "default");


async function subirImagenCloudinary(archivo) {
  if (!archivo) return "";
  const { cloudName, uploadPreset } = window.CLOUDINARY_CONFIG;
  const formData = new FormData();
  formData.append("file", archivo);
  formData.append("upload_preset", uploadPreset);

  const respuesta = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!respuesta.ok) {
    throw new Error("No se pudo subir la imagen a Cloudinary. Revisa tu cloudName y upload preset en config.js");
  }
  const datos = await respuesta.json();
  return datos.secure_url;
}

function ordenarPorFecha(lista, campo) {
  return lista.slice().sort((a, b) => (b[campo] || 0) - (a[campo] || 0));
}

const CATEGORIAS_DEFAULT = [
  { id: "antiparasitarios", nombre: "Antiparasitarios", emoji: "🐜" },
  { id: "antibioticos", nombre: "Antibióticos", emoji: "💊" },
  { id: "antiinflamatorios", nombre: "Antiinflamatorios", emoji: "🩹" },
  { id: "articular_movilidad", nombre: "Articular & Movilidad", emoji: "🦴" },
  { id: "dermatologia", nombre: "Dermatología", emoji: "🧴" },
  { id: "cardiologia_renal", nombre: "Cardiología & Renal", emoji: "❤️" },
  { id: "vacunas", nombre: "Vacunas", emoji: "💉" },
  { id: "otros", nombre: "Otros", emoji: "🐾" },
];

const CONTENIDO_DEFAULT = {
  nombreFarmacia: "PetPharma",
  tagline: "Farmacia Veterinaria Especializada",
  anuncioTexto: "❄️ Cadena de Frío Garantizada (2°C - 8°C) • Despachos express con neveras térmicas monitoreadas",
  anuncioTelefono: "📞 Urgencias: +1 (809) 555-VETS",
  heroTitulo: "Medicamentos Veterinarios Originales con Control de Dosis",
  heroDescripcion: "Antibióticos, analgésicos, antiparasitarios y fórmulas especiales para perros, gatos, equinos y aves.",
  heroBadge: "🛡️ Dispensación Certificada Bajo Regencia Farmacéutica",
  garantiaTitulo: "✨ Garantía PetPharma",
  garantiaLinea1: "✅ Fórmulas 100% de laboratorios reconocidos.",
  garantiaLinea2: "✅ Supervisión de regente farmacéutico colegiado.",
  garantiaLinea3: "✅ Empaques con aislante y geles de frío certificados.",
  footerNombre: "PetPharma Farmacia Veterinaria Certificada",
  footerTexto: "Dispensación oficial bajo normas de salud animal y cadena de frío.",
};

window.FirebaseDB = {
  // ---------- Autenticación ----------
  async login(email, password) {
    const credencial = await signInWithEmailAndPassword(auth, email, password);
    return credencial.user;
  },
  async logout() {
    await signOut(auth);
  },
  getCurrentUser() {
    return auth.currentUser;
  },
  onAuthChange(callback) {
    return onAuthStateChanged(auth, callback);
  },

  // ---------- Productos ----------
  async getProductos() {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async agregarProducto(datos, archivoImagen) {
    let imagenUrl = datos.image || "";
    if (archivoImagen) imagenUrl = await subirImagenCloudinary(archivoImagen);
    const nuevo = {
      name: datos.name,
      brand: datos.brand || "",
      activeSubstance: datos.activeSubstance || "",
      category: datos.category,
      species: datos.species || ["perros", "gatos"],
      price: Number(datos.price) || 0,
      originalPrice: datos.originalPrice ? Number(datos.originalPrice) : null,
      requiresPrescription: !!datos.requiresPrescription,
      requiresColdChain: !!datos.requiresColdChain,
      stock: Number(datos.stock) || 0,
      image: imagenUrl,
      dosage: datos.dosage || "Según indicación de médico veterinario colegiado",
      indications: datos.indications || "",
      description: datos.description || "",
      doseMgPerKg: datos.doseMgPerKg ? Number(datos.doseMgPerKg) : null,
      doseFrequency: datos.doseFrequency || "",
      createdAt: Date.now(),
    };
    const ref = await addDoc(collection(db, "products"), nuevo);
    return { id: ref.id, ...nuevo };
  },

  async actualizarProducto(id, datos, archivoImagen) {
    const cambios = {
      name: datos.name,
      brand: datos.brand || "",
      activeSubstance: datos.activeSubstance || "",
      category: datos.category,
      species: datos.species && datos.species.length ? datos.species : ["perros", "gatos"],
      price: Number(datos.price) || 0,
      originalPrice: datos.originalPrice ? Number(datos.originalPrice) : null,
      requiresPrescription: !!datos.requiresPrescription,
      requiresColdChain: !!datos.requiresColdChain,
      stock: Number(datos.stock) || 0,
      dosage: datos.dosage || "",
      indications: datos.indications || "",
      description: datos.description || "",
      doseMgPerKg: datos.doseMgPerKg ? Number(datos.doseMgPerKg) : null,
      doseFrequency: datos.doseFrequency || "",
    };
    if (archivoImagen) {
      cambios.image = await subirImagenCloudinary(archivoImagen);
    } else if (datos.image) {
      cambios.image = datos.image;
    }
    await updateDoc(doc(db, "products", id), cambios);
    return { id, ...cambios };
  },

  async eliminarProducto(id) {
    await deleteDoc(doc(db, "products", id));
  },

  async descontarStock(items) {
    // Lectura + escritura simple (sin transacción) — suficiente para el
    // volumen de una farmacia pequeña/mediana. Si se necesita blindaje
    // ante ventas simultáneas exactas al mismo segundo, usar runTransaction.
    for (const item of items) {
      const ref = doc(db, "products", item.id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const actual = snap.data().stock || 0;
        await updateDoc(ref, { stock: Math.max(0, actual - item.quantity) });
      }
    }
  },

  // ---------- Categorías ----------
  async getCategorias() {
    const snap = await getDocs(collection(db, "categories"));
    if (snap.empty) return CATEGORIAS_DEFAULT.slice();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async agregarCategoria(datos) {
    const nombre = (datos.nombre || "").trim();
    if (!nombre) throw new Error("El nombre de la categoría no puede estar vacío");
    const id = window.generarSlug(nombre);
    const nueva = { nombre, emoji: datos.emoji || "🐾" };
    await setDoc(doc(db, "categories", id), nueva);
    return { id, ...nueva };
  },

  async eliminarCategoria(id) {
    await deleteDoc(doc(db, "categories", id));
  },

  // ---------- Contenido editable del sitio ----------
  async getContenido() {
    const snap = await getDoc(doc(db, "content", "site"));
    return { ...CONTENIDO_DEFAULT, ...(snap.exists() ? snap.data() : {}) };
  },

  async guardarContenido(datos) {
    await setDoc(doc(db, "content", "site"), datos, { merge: true });
    return this.getContenido();
  },

  // ---------- Recetas Rx ----------
  async getRecetas() {
    const q = query(collection(db, "prescriptions"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async subirReceta(datos, archivoImagen) {
    const fileUrl = archivoImagen ? await subirImagenCloudinary(archivoImagen) : "";
    const nueva = { ...datos, fileUrl, status: "pendiente", createdAt: new Date().toISOString() };
    const ref = await addDoc(collection(db, "prescriptions"), nueva);
    return { id: ref.id, ...nueva };
  },

  async actualizarEstadoReceta(id, status) {
    await updateDoc(doc(db, "prescriptions", id), { status });
  },

  // ---------- Pedidos ----------
  async getPedidos() {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async crearPedido(datos) {
    // OJO: aquí NO cruzamos con la colección "prescriptions" — un cliente
    // sin sesión no tiene permiso de lectura sobre esa colección
    // (firestore.rules la protege a propósito, son fotos de receta con
    // datos del dueño y su mascota) y no queremos abrir esa lectura
    // pública solo para este cruce. El cruce "¿este pedido ya tiene su
    // receta subida?" se hace del lado del admin, al mostrar la pestaña
    // de Pedidos (ver renderAdminOrders en admin.js), donde sí hay sesión.
    const nuevo = {
      orderNumber: "PED-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000),
      createdAt: new Date().toISOString(),
      status: "recibido",
      ...datos,
    };
    const ref = await addDoc(collection(db, "orders"), nuevo);
    await this.descontarStock(datos.items || []);
    return { id: ref.id, ...nuevo };
  },

  async actualizarEstadoPedido(id, status) {
    await updateDoc(doc(db, "orders", id), { status });
  },

  async actualizarTemperaturaPedido(id, temp) {
    await updateDoc(doc(db, "orders", id), { temperatureVerified: temp });
  },
};
