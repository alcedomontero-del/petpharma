/**
 * boot.js
 * ---------------------------------------------------------
 * Punto de entrada que arma window.DB con la implementación
 * correcta según el entorno (env.js ya definió ES_LOCAL).
 *
 * El resto de las páginas (app.js, admin.js, auth.js) solo
 * usan window.DB.algo(...) — nunca les importa si por dentro
 * es la demo local o Firebase real.
 * ---------------------------------------------------------
 */
(function () {
  function cargarScriptClasico(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error("No se pudo cargar " + src));
      document.head.appendChild(script);
    });
  }

  async function iniciar() {
    if (window.ES_LOCAL) {
      await cargarScriptClasico("js/local-db.js");
      window.DB = window.LocalDB;
    } else {
      await import("./firebase-real.js");
      window.DB = window.FirebaseDB;
    }
    window.dispatchEvent(new Event("db-listo"));
  }

  iniciar().catch((error) => {
    console.error("Error iniciando la base de datos:", error);
    window.dispatchEvent(new CustomEvent("db-error", { detail: error }));
  });

  // Utilidad para que las páginas esperen a que window.DB exista,
  // sin importar si el evento ya pasó o no.
  //
  // El callback se ejecuta dentro de un try/catch que también atrapa
  // rechazos de promesas (los callbacks suelen ser async): así, si falla
  // la conexión a Firestore (o cualquier otra cosa) al cargar la tienda o
  // el panel admin, en vez de quedar como un error silencioso solo visible
  // en la consola del navegador, se avisa de forma visible con
  // window.avisarErrorConexion (definido en ui.js).
  window.cuandoDBListo = function (callback) {
    function ejecutarConProteccion() {
      Promise.resolve()
        .then(() => callback())
        .catch((error) => {
          console.error("Error usando la base de datos:", error);
          if (typeof window.avisarErrorConexion === "function") {
            window.avisarErrorConexion(error);
          }
        });
    }
    if (window.DB) {
      ejecutarConProteccion();
    } else {
      window.addEventListener("db-listo", ejecutarConProteccion, { once: true });
    }
  };
})();
