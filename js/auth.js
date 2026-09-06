/**
 * auth.js — login del administrador (login.html) y guardia de acceso (admin.html)
 * Solo existe un tipo de cuenta: administrador/regente farmacéutico.
 * Los clientes compran y suben recetas sin necesidad de iniciar sesión.
 */
(function () {
  const formulario = document.getElementById("form-login");
  if (!formulario) return; // este script también podría cargarse en otras páginas a futuro

  window.pintarBadgeModo("badge-modo");

  window.cuandoDBListo(() => {
    window.DB.onAuthChange((user) => {
      if (user) window.location.href = "admin.html";
    });
  });

  if (window.ES_LOCAL) {
    const pista = document.getElementById("pista-demo");
    if (pista) pista.style.display = "block";
  }

  const errorBox = document.getElementById("login-error");
  const boton = document.getElementById("btn-login");

  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    errorBox.classList.remove("show");

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    boton.disabled = true;
    boton.innerHTML = '<span class="spinner-pp"></span> Entrando...';

    try {
      await window.DB.login(email, password);
      window.location.href = "admin.html";
    } catch (error) {
      errorBox.textContent = error.message || "No se pudo iniciar sesión";
      errorBox.classList.add("show");
      boton.disabled = false;
      boton.textContent = "Iniciar Sesión";
    }
  });
})();

// Guardia de seguridad reutilizada por admin.html — redirige si no hay sesión.
// Usa onAuthChange (no getCurrentUser) porque en Firebase real la sesión se
// confirma de forma asíncrona al cargar la página: leerla de forma síncrona
// justo al inicio casi siempre da "null" incluso con sesión válida, y
// expulsaría al administrador a login.html en cada carga de admin.html.
window.requerirSesionAdmin = function (callback) {
  window.cuandoDBListo(() => {
    let yaResuelto = false;
    window.DB.onAuthChange((user) => {
      if (yaResuelto) return; // solo procesar la primera confirmación de estado
      yaResuelto = true;
      if (!user) {
        window.location.href = "login.html";
        return;
      }
      // callback(user) carga categorías/productos/contenido/recetas/pedidos
      // y es async — si Firestore no conecta, sin este try/catch el error
      // quedaba solo en consola y el panel se veía "colgado" sin explicar
      // nada. Promise.resolve(...) atrapa tanto el throw síncrono como el
      // rechazo de la promesa.
      Promise.resolve(callback(user)).catch((error) => {
        console.error("Error cargando el panel de administración:", error);
        if (typeof window.avisarErrorConexion === "function") {
          window.avisarErrorConexion(error);
        }
      });
    });
  });
};
