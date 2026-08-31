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
 apiKey: "AIzaSyAbz6tijfSzMv6kH0wSmskG1aqPQP2v8Ko",
    authDomain: "petpharma-5cc38.firebaseapp.com",
    projectId: "petpharma-5cc38",
    storageBucket: "petpharma-5cc38.firebasestorage.app",
    messagingSenderId: "738518033586",
    appId: "1:738518033586:web:ba14b7300f0cae36a195ab",
    measurementId: "G-YN2P3Y838E"
};

window.CLOUDINARY_CONFIG = {
  // Lo encuentras en el Dashboard de Cloudinary, arriba a la izquierda
  cloudName: "kv4gbmx0",
  // Lo creas en Settings → Upload → Upload presets → Add upload preset
  // Debe estar configurado como "Unsigned" (sin firma)
  uploadPreset: "petpharma",
};
