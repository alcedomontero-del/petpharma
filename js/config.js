/**
 * config.js
 * ---------------------------------------------------------
 * ÚNICO archivo que debes editar para conectar PetPharma a tus
 * cuentas REALES de Firebase y Cloudinary.
 *
 * Mientras la página corre en local (localhost o doble clic al
 * archivo), estos valores se ignoran por completo y se usa la
 * base de datos de demostración (local-db.js) — así que puedes
 * dejar los valores de ejemplo tal cual mientras solo estás
 * probando en tu computador.
 *
 * Antes de publicar la tienda de verdad en internet, reemplaza
 * cada "TU_..." con los datos reales de tu proyecto. Guía
 * completa paso a paso en LEEME.txt.
 * ---------------------------------------------------------
 */


window.FIREBASE_CONFIG = {
apiKey: "AIzaSyA8afB-OiCZPTAkKWrw3dCUNeRKozazZhE",
  authDomain: "petpharma2-b906c.firebaseapp.com",
  projectId: "petpharma2-b906c",
  storageBucket: "petpharma2-b906c.firebasestorage.app",
  messagingSenderId: "781594038628",
  appId: "1:781594038628:web:c94382cb4c7c43ff10ea71",
  measurementId: "G-RP4DK9B5L8"
};

window.CLOUDINARY_CONFIG = {
  // Lo encuentras en el Dashboard de Cloudinary, arriba a la izquierda
  cloudName: "kv4gbmx0",
  // Lo creas en Settings → Upload → Upload presets → Add upload preset
  // Debe estar configurado como "Unsigned" (sin firma)
  uploadPreset: "petpharma2",
};

/**
 * AGENTE_IA_CONFIG — "Vico", el asistente de chat de la tienda pública.
 * ---------------------------------------------------------
 * Vico usa Firebase AI Logic (Gemini, capa 100% gratis) a través del
 * MISMO proyecto de FIREBASE_CONFIG de arriba — no necesita una API
 * key aparte aquí. Lo único que debes hacer una sola vez:
 *
 *   1. Firebase Console → tu proyecto → "AI Logic" en el menú lateral
 *      → Comenzar → elige "Gemini Developer API" (la que NO pide
 *      tarjeta ni Plan Blaze). Con eso ya queda activo.
 *   2. (Recomendado, obligatorio a partir del 2 nov. 2026) Firebase
 *      Console → "App Check" → registra tu app web. La consola ahora
 *      ofrece "reCAPTCHA Enterprise" como opción principal (gratis
 *      hasta 10,000 verificaciones/mes) — si eliges esa, deja
 *      appCheckProveedor en "enterprise" (default). Si en cambio
 *      elegiste el proveedor clásico "reCAPTCHA v3", cambia
 *      appCheckProveedor a "v3". Copia la "site key" que te den y
 *      pégala abajo en appCheckSiteKey. Guía paso a paso en LEEME.txt.
 *      IMPORTANTE: el site key de un proveedor no sirve para el otro
 *      — deben coincidir exactamente con lo que registraste.
 *
 * "modelo" usa gemini-3.7-flash por defecto (estable, gratis, sin
 * Plan Blaze). NO uses gemini-2.5-flash: esos modelos se dan de baja
 * en octubre de 2026 y dejarán de responder (error 404).
 */
window.AGENTE_IA_CONFIG = {
  nombreAgente: "Vico",
  mensajeBienvenida: "",
  modelo: "gemini-3.7-flash",
  appCheckSiteKey: "6LdUY7QtAAAAABNKrxO6As83tJoyFWj8HjqLA8V5",
  appCheckProveedor: "enterprise", // "enterprise" o "v3" — debe coincidir con lo elegido en Firebase Console → App Check
};

