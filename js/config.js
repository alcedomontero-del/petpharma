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
 *      Console → "App Check" → registra tu app web con reCAPTCHA v3
 *      → copia la "site key" y pégala abajo en appCheckSiteKey. Guía
 *      paso a paso en LEEME.txt.
 *
 * "modelo" usa gemini-2.5-flash por defecto (estable en la capa
 * gratuita). Puedes cambiarlo por otro modelo Flash más nuevo si
 * Google lo agrega a la capa gratuita más adelante.
 */
window.AGENTE_IA_CONFIG = {
  nombreAgente: "Vico",
  mensajeBienvenida: "",
  modelo: "gemini-2.5-flash",
  appCheckSiteKey: "",
};

