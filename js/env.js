/**
 * env.js
 * ---------------------------------------------------------
 * Detecta automáticamente si la página está corriendo:
 *   - LOCAL: abierta desde el computador (doble clic, Live
 *     Server, localhost, etc.) -> se usa la base de datos de
 *     demostración (local-db.js), sin tocar Firebase ni
 *     Cloudinary. Ideal para probar todo sin arriesgar datos
 *     reales ni necesitar cuentas configuradas todavía.
 *
 *   - PRODUCCIÓN: la página fue desplegada de verdad (Firebase
 *     Hosting, GitHub Pages, un dominio propio, etc.)
 *     -> se activan las conexiones reales a Firebase
 *        (Autenticación + Firestore) y Cloudinary (fotos).
 *
 * No hay que tocar este archivo para desplegar: la detección
 * es automática según el dominio donde el navegador cargó la
 * página. Lo único que hay que editar es js/config.js.
 * ---------------------------------------------------------
 */
(function () {
  const host = location.hostname;
  const esLocal =
    host === "" ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.startsWith("192.168.") ||
    location.protocol === "file:";

  window.ES_LOCAL = esLocal;

  // Utilidad compartida para formatear precios en dólares
  window.formatearPrecio = function (numero) {
    const valor = Number(numero) || 0;
    return "$" + valor.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Convierte un texto en un slug seguro para usarlo como id de categoría
  // (sin tildes, minúsculas, espacios -> guion bajo)
  window.generarSlug = function (texto) {
    return String(texto || "")
      .trim()
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || ("cat_" + Date.now());
  };
})();
