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
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID",
};

window.CLOUDINARY_CONFIG = {
  // Lo encuentras en el Dashboard de Cloudinary, arriba a la izquierda
  cloudName: "TU_CLOUD_NAME",
  // Lo creas en Settings → Upload → Upload presets → Add upload preset
  // Debe estar configurado como "Unsigned" (sin firma)
  uploadPreset: "TU_UPLOAD_PRESET",
};
