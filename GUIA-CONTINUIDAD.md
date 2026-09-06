# GUÍA DE CONTINUIDAD — PetPharma (para el propio Claude, futuras sesiones)

## Qué pidió el usuario (mensaje original, resumen fiel)
Partiendo de dos zips subidos (`tienda_de_mascota_con_carrito.zip` = referencia
de arquitectura ya validada, `petpharma---farmacia-veterinaria__3_.zip` =
proyecto real a mejorar), implementar en PetPharma:
1. Categorías nuevas con selector de emoji (editable por el admin).
2. Editar productos (no solo borrar).
3. Descripción opcional en productos.
4. Investigar y corregir un bug de "stock" que en la versión de prueba
   marcaba que "solo queda uno" sin razón aparente.
5. Preparar el proyecto para Firebase (auth + textos/datos) y Cloudinary
   (fotos).
6. Lupa/zoom para ver la foto completa de un medicamento si la miniatura
   no se ve bien.
7. Eliminar todo lo innecesario: el proyecto traía Vite + React (AI
   Studio / Gemini) pero el usuario quiere HTML+CSS+JS puro, sin pagar
   servidores.
8. Todo el texto visible (encabezado, pie de página, anuncios, etc.)
   debe ser editable por el administrador.
9. La calculadora de dosis debe estar del lado del administrador, y
   opcionalmente cada medicamento puede tener su "primer formato"
   (mg/kg + frecuencia) para que la calculadora lo use automáticamente.
10. Corregir/mejorar cualquier otra cosa que se note, sin preguntar.
11. Avisar solo al terminar todo.
12. **Guardar zips incrementales muy seguido** (petpharma_v1_0.zip,
    v1_1, v1_2...) por si se agotan los tokens a media tarea — el
    usuario insistió mucho en esto, es de alta prioridad.
13. Mantener esta guía de continuidad actualizada.

## Diagnóstico hecho sobre los dos zips originales
- `tienda_de_mascota_con_carrito.zip`: proyecto HTML/CSS/JS puro, YA
  tenía exactamente el patrón que el usuario pedía: env.js/config.js/
  boot.js/local-db.js/firebase-real.js (detección automática local vs
  producción), categorías dinámicas con emoji, edición de productos,
  lupa/lightbox para ver foto completa. Se usó como plantilla de
  arquitectura para PetPharma.
- `petpharma---farmacia-veterinaria__3_.zip`: tenía DOS versiones
  mezcladas — una app React/Vite/AI-Studio (carpeta `src/`, con Gemini
  API, Firebase en `src/lib/firebase.ts`, Cloudinary en
  `src/lib/cloudinary.ts`) y una versión ya vanilla HTML/CSS/JS en
  `public/` (más completa que la copia duplicada en la raíz — se usó
  `public/` como base). La versión vanilla NO tenía Firebase conectado
  (solo localStorage) ni control de stock en el carrito.
- **Bug del "solo queda 1"**: viene de `src/components/ProductCard.tsx`
  (versión React de prueba, ya descartada) — mostraba "Últimas X un."
  cuando `stock <= 5`, pero esa versión de prueba nunca restaba stock al
  confirmar un pedido, así que el aviso podía quedar inconsistente. La
  versión vanilla de `public/js/app.js` no tenía NINGÚN control de stock
  en el carrito (se podía agregar infinitas unidades). Se corrigió de
  raíz en la reescritura: stock real, se descuenta al confirmar pedido,
  no deja agregar más de lo disponible, aviso de "quedan X" siempre
  fiel al dato real del producto.

## Qué se construyó (carpeta final: petpharma/)
Estructura: `index.html`, `admin.html`, `login.html`, `css/style.css`,
`js/{env,config,boot,local-db,firebase-real,ui,auth,app,admin}.js`,
`firestore.rules`, `LEEME.txt` (guía usuario final), este archivo.

Patrón de datos (idéntico en espíritu a `tienda_de_mascota`): `env.js`
detecta local vs producción → `boot.js` carga `local-db.js` (demo con
localStorage) o `firebase-real.js` (Firebase Auth + Firestore +
Cloudinary) y expone SIEMPRE `window.DB` con la misma forma. Ni
`app.js` ni `admin.js` necesitan saber cuál de los dos está activo.

Colecciones Firestore: `products`, `categories` ({nombre, emoji}),
`content` (doc único "site" con todos los textos editables), 
`prescriptions`, `orders`. Reglas en `firestore.rules`: lectura pública
de products/categories/content, escritura solo con sesión (admin);
prescriptions/orders se pueden CREAR sin sesión (cliente anónimo) pero
solo el admin las lee/edita/borra.

Login simplificado: se eliminó el concepto de "cuenta de cliente/tutor"
que tenía la versión original (no aportaba nada real sin backend de
pedidos por cuenta). Solo existe la cuenta de administrador via
Firebase Auth (o admin@petpharma.com/admin123 en modo demo local).

Producto ahora tiene: `description` (opcional), `doseMgPerKg` +
`doseFrequency` (opcional, "primer formato" para la calculadora).
Categorías son documentos propios `{id: slug, nombre, emoji}` creados
desde el mismo formulario de "agregar medicamento" (como en
tienda_de_mascota), con selector visual de emoji (`window.EMOJIS_
CATEGORIAS` en `ui.js`).

Admin tiene 5 pestañas: Recetas Rx, Pedidos, Catálogo (con editar real,
no solo borrar), Contenido del Sitio (formulario que escribe en
`content/site`, consumido por `app.js` en la tienda pública), y
Calculadora de Dosis (usa `doseMgPerKg` de cualquier producto que lo
tenga configurado, o un cálculo genérico manual).

Lupa/lightbox: `window.abrirLightbox(url, alt)` en `ui.js`, enganchada
en las tarjetas de producto, el modal de detalle y la miniatura de cada
fila del catálogo admin.

Se eliminó todo lo React/Vite/AI-Studio del zip original
(`src/`, `vite.config.ts`, `tsconfig.json`, `package.json`, `bun.lock`,
`metadata.json`, `assets/.aistudio/`, `firebase-blueprint.json`,
`firebase-applet-config.json`) — el proyecto final es 100% estático.

## Estado de verificación (actualizado en v1_3)
Todos los `.js` pasaron `node --check` (sintaxis válida), incluyendo
`firebase-real.js` verificado como módulo ES (`--check` sobre copia
`.mjs`). Además, en v1_2 se hizo una auditoría estática completa:
- Los 3 HTML pasaron un parser real (`html.parser` de Python) sin
  ningún tag desbalanceado.
- Se verificó que NINGÚN `id` esté duplicado en ningún HTML.
- Se cruzó CADA `getElementById(...)` de `app.js`/`admin.js`/`auth.js`
  contra los ids reales de su HTML correspondiente — coinciden todos.
- Se cruzó CADA función invocada desde `onclick`/`onchange`/`onsubmit`
  (tanto inline en el HTML como generada dentro de plantillas JS) contra
  las funciones realmente definidas — coinciden todas.
- Bug real encontrado y corregido en esta pasada: `cancelarEdicionProducto()`
  en `js/admin.js` no reseteaba `valorCategoriaAnterior` a `""`, así que
  al cancelar una edición y abrir "Agregar Medicamento" después, el
  selector de categoría podía quedar en la categoría del producto editado
  anteriormente en vez de en "Elegir...". Corregido.
- Se agregó gestión de categorías existentes en el admin (listar +
  borrar, bloqueando el borrado si hay medicamentos usando esa
  categoría) — antes la función `eliminarCategoria` existía en la capa
  de datos pero no tenía botón en la interfaz.

## Ronda v1_3 — auditoría enfocada en comportamiento real con Firebase
(no solo sintaxis: se repasó cada flujo pensando específicamente en qué
pasa cuando `window.DB` es `FirebaseDB` en vez de `LocalDB`, ya que el
modo demo local esconde varias clases de bug por ser síncrono y sin
reglas de seguridad reales). Se encontraron y corrigieron tres fallas
reales que NO se habían notado antes porque solo se manifiestan en
producción:

1. **`subirReceta()` nunca recibía la foto real de la receta.**
   `index.html` (modal de subir receta) no tenía ningún `<input
   type="file">`; `handlePrescriptionSubmit()` en `app.js` guardaba
   siempre la misma URL de foto de stock como `fileUrl`. El admin jamás
   veía la receta real del cliente. Corregido: se agregó
   `<input type="file" id="rxFile" accept="image/*" capture="environment"
   required>` al formulario; `handlePrescriptionSubmit` ahora lee ese
   archivo y lo pasa como segundo argumento a `window.DB.subirReceta(datos,
   archivo)`; `subirReceta` en `local-db.js` lo guarda como base64 (mismo
   patrón que ya usaban productos) y en `firebase-real.js` lo sube a
   Cloudinary con `subirImagenCloudinary()` (misma función ya usada para
   fotos de producto).

2. **Race condition en la guarda de sesión del admin (`requerirSesionAdmin`
   en `auth.js`).** Llamaba a `window.DB.getCurrentUser()` justo después
   del evento `db-listo`, que se dispara apenas termina de *cargar* el
   módulo `firebase-real.js` — no cuando Firebase termina de *confirmar*
   la sesión guardada (`auth.currentUser` es síncrono y casi siempre
   `null` en ese instante exacto en producción real, aunque sí exista
   sesión). Esto expulsaría al administrador a `login.html` en casi
   cualquier carga/recarga de `admin.html` ya publicado. No se notaba en
   el modo demo porque `LocalDB.getCurrentUser()` lee de `localStorage`
   de forma realmente síncrona. Corregido: tanto `requerirSesionAdmin`
   como el auto-redirect de `login.html` ahora usan
   `window.DB.onAuthChange(callback)` (que por dentro usa
   `onAuthStateChanged` de Firebase) en vez de leer el valor síncrono.

3. **`descontarStock()` habría fallado siempre en Firebase real por
   las reglas de seguridad**, no por el código JS. `crearPedido()` (llamado
   por un cliente SIN sesión al pagar) intenta hacer `updateDoc` sobre
   `products/{id}` para bajar el stock, pero `firestore.rules` original
   solo permitía escribir en `products` con `request.auth != null`. El
   pedido se habría creado igual (sí estaba permitido `create` en
   `orders`), pero la actualización de stock habría lanzado un error de
   permisos, y como `handleCheckoutSubmit()` en `app.js` envuelve todo en
   un mismo try/catch, el cliente habría visto un aviso de "no se pudo
   registrar el pedido" **aunque el pedido sí se hubiera creado** — y el
   stock jamás habría bajado. Corregido en `firestore.rules`: se separó
   `create`/`delete` de `products` (solo admin) de `update`, que ahora
   también permite a cualquiera (sin sesión) un cambio MUY acotado —
   solo el campo `stock`, solo hacia abajo (`request.resource.data.stock
   <= resource.data.stock`), usando `diff().affectedKeys().hasOnly([...])`
   para que no pueda tocar ningún otro campo del producto (precio,
   nombre, etc.). **Importante:** si el usuario ya había publicado la
   versión anterior de `firestore.rules` en un proyecto Firebase real,
   tiene que volver a publicar la de este paquete para que esta
   corrección tenga efecto — se le avisó explícitamente en `LEEME.txt`.

Limpieza menor adicional: se eliminó `stockDisponiblePara()` en `app.js`
(función sin usar en ningún lado, quedaba de una iteración anterior).

**Sigue sin poder abrirse en un navegador real en este entorno** — todo
lo de v1_3 también es auditoría estática (código + reglas leídas
"a mano" pensando en el comportamiento real de Firebase), no clics
reales. Es el nivel de revisión más alto posible sin un navegador, pero
no reemplaza la prueba de punta a punta.

## v1_4 — el admin no podía asignar especie a un medicamento (bug real
reportado por el usuario)
El usuario preguntó si, para un medicamento que funciona en 3 especies
distintas, tocaba subirlo 3 veces. Al revisar `admin.html`/`admin.js` se
confirmó que el formulario de Agregar/Editar Medicamento **no tenía
ningún campo de especie** — `species` solo existía en la capa de datos
(`local-db.js`/`firebase-real.js`), con un valor fijo por defecto
`["perros", "gatos"]` que ni siquiera se podía cambiar al editar. Así
que ni subiéndolo 3 veces se resolvía bien (siempre quedaba
perros+gatos, nunca equinos/aves). Corregido:
- 4 checkboxes de especie (Perros/Gatos/Equinos/Aves) en el formulario
  de producto, con al menos una obligatoria (`leerCheckboxesEspecies()`
  valida esto antes de guardar).
- `iniciarEdicionProducto()` marca las especies que ya tenía el
  producto (`marcarCheckboxesEspecies(p.species)`); un producto nuevo
  arranca con perros+gatos marcados por defecto, editable antes de
  guardar.
- `actualizarProducto()` en AMBAS capas de datos (`local-db.js` y
  `firebase-real.js`) ahora sí persiste el cambio de especie al editar
  — antes ninguna de las dos lo tocaba en la actualización.
- Tabla de catálogo del admin ahora muestra qué especies tiene cada
  medicamento (emoji debajo de la categoría), para verificarlo de un
  vistazo sin abrir el modal de editar.

Revalidado tras el cambio: sintaxis de los 9 `.js`, cruce de
`getElementById`/funciones `onclick` — sin errores nuevos.


## v1_5 — marcar en Pedidos si falta la receta (decisión ya confirmada
por el usuario, sin bloquear el checkout)
El usuario decidió explícitamente NO bloquear el pago cuando falta la
receta (rechazó la opción de "obligar a subir receta antes de pagar").
En su lugar pidió: el cliente siempre puede enviar el pedido; si el
carrito tenía algo con Rx y no hay receta suya, el pedido queda marcado
"sin receta" del lado del admin, con el teléfono visible para que lo
contacte por WhatsApp/llamada y la pida por otra vía.

Implementado:
- `js/ui.js`: dos helpers nuevos, `window.normalizarTelefono(tel)` (deja
  solo dígitos, para comparar números escritos distinto) y
  `window.linkWhatsApp(tel)` (arma `https://wa.me/...`, antepone "1" si
  detecta 10 dígitos sin código de país — números dominicanos).
- El cruce receta↔pedido se hace por **teléfono del cliente**, y
  **solo del lado del admin** (`renderAdminOrders` y `loadAdminStats`
  en `js/admin.js`), NO durante el checkout público. Motivo importante:
  `firestore.rules` protege la colección `prescriptions` para que solo
  el admin (con sesión) pueda leerla — son fotos de receta con datos
  del dueño y la mascota, no debía abrirse esa lectura a cualquier
  cliente anónimo solo para hacer este cruce. Se evaluó hacerlo en
  `crearPedido()` (ambas capas) pero se revirtió por esa razón; quedó
  documentado con un comentario en `local-db.js` y `firebase-real.js`
  explicando por qué NO se hace ahí.
- `renderAdminOrders()`: por cada pedido con `hasPrescriptionProducts`,
  busca en la lista de recetas (que el admin sí puede leer completa) una
  con el mismo teléfono normalizado. Si encuentra: badge verde
  "✅ Receta rx-XXXX (pendiente/aprobada/rechazada)". Si no encuentra:
  badge rojo "⚠️ Sin receta — pedir por WhatsApp", que es un link real
  a `wa.me` con el teléfono del cliente (abre WhatsApp Web/app con el
  chat ya armado).
- **Importante — el cruce es solo una pista, no una garantía**: compara
  por teléfono, no por un id explícito, porque el usuario rechazó
  explícitamente cualquier flujo que obligue al cliente a subir la
  receta en la misma sesión de compra (lo cual sí habría permitido un
  id exacto). Si un mismo cliente hizo dos pedidos con Rx y solo subió
  una receta, ambos pedidos se van a marcar como "con receta" aunque
  uno le falte — el comentario en el código deja esto explícito para
  que el admin sepa que igual debe fijarse si el pedido es grande o
  raro. Es una mejora sobre el estado anterior (cero cruce automático),
  no una solución perfecta — el usuario fue informado de esta
  limitación al explicarle la implementación.
- Nueva tarjeta KPI en el dashboard del admin: "Pedidos Sin Receta"
  (`statOrdersMissingRx` en `admin.html`, calculada en
  `loadAdminStats()`), para verlo de un vistazo sin entrar a la pestaña
  de Pedidos. El grid de KPIs pasó de 4 a 5 columnas
  (`md:grid-cols-5`).

Revalidado tras el cambio: sintaxis de los 9 `.js` (`node --check`,
incluyendo `firebase-real.js` como módulo ES), los 3 HTML parsean sin
tags desbalanceados, sin ids duplicados, cruce completo de
`getElementById(...)` en `admin.js` contra `admin.html` (sin
faltantes) y cruce de funciones invocadas desde `onclick`/`onchange`/
`onsubmit` contra funciones definidas (sin faltantes).

## v1_6 — bloquear la ENTREGA (no el pago) hasta que la receta esté
APROBADA por el regente
El usuario preguntó cómo lo hacen las farmacias reales en este caso, se
le explicó que lo más seguro es que el pago se reciba pero el
medicamento NO se entregue sin receta aprobada — y eligió esa opción
explícitamente (rechazó dejarlo igual y rechazó "el repartidor decide
caso por caso").

Implementado en `js/admin.js`:
- El `<select>` de estado del pedido (pestaña Pedidos) ahora se arma
  pasando el elemento `this` completo, no solo `this.value`
  (`onchange="updateOrderStatus('${ord.id}', this)"`), para poder
  revertir la selección visualmente si el cambio se bloquea.
- `updateOrderStatus(id, selectEl)`: si el nuevo estado es "en_camino" o
  "entregado" Y el pedido tiene `hasPrescriptionProducts`, busca en
  `getRecetas()` una receta con el mismo teléfono normalizado (ver
  `window.normalizarTelefono` en `ui.js`) Y `status === "aprobada"`. Si
  no la encuentra: revierte el `<select>` a su valor anterior
  (`selectEl.value = ord.status`), muestra un toast de error explicando
  qué falta, y NO llama a `actualizarEstadoPedido` (o sea, no se guarda
  el cambio). El pedido puede seguir pasando libremente por "Recibido"
  y "En Prep. Frío" sin ninguna receta — el bloqueo es solo para las dos
  fases de despacho/entrega.
- `renderAdminOrders()`: las opciones "En Camino" y "Entregado" del
  `<select>` llevan el atributo `disabled` (con texto
  "(requiere Rx aprobada)" en la etiqueta) cuando corresponde, para que
  el admin vea el bloqueo ANTES de intentar cambiarlo, no solo después
  del toast de error.
- El badge de receta por pedido ahora tiene 4 estados (antes tenía 2):
  - Sin ninguna receta subida con ese teléfono → 🔴 "Sin receta — pedir
    por WhatsApp" (link a wa.me).
  - Receta subida pero con `status: "pendiente"` → 🟡 "Receta rx-XXXX
    pendiente de aprobar" (avisa que hay que ir a aprobarla en la
    pestaña Recetas Rx).
  - Receta subida con `status: "rechazada"` → 🔴 "Receta rechazada —
    pedir otra" (link a wa.me).
  - Receta con `status: "aprobada"` → 🟢 "Receta rx-XXXX aprobada" (el
    único caso en que se desbloquea la entrega).
- `updateRxStatus()` (al aprobar/rechazar una receta en la pestaña
  Recetas Rx) ahora también llama a `renderAdminOrders()`, para que si
  esa aprobación desbloquea algún pedido, se vea reflejado al toque en
  la pestaña de Pedidos sin que el admin tenga que cambiar de tab y
  volver.
- KPI del dashboard renombrado de "Pedidos Sin Receta" a **"Pedidos Sin
  Rx Aprobada"** (`statOrdersMissingRx`), porque ahora cuenta los tres
  casos que bloquean entrega (sin receta, pendiente, rechazada), no
  solo "sin receta".

Sigue siendo un cruce por teléfono, no por id explícito — mismo
límite explicado en v1_5: si un cliente hizo dos pedidos con Rx y solo
una receta suya está aprobada, el sistema podría dejar avanzar el
pedido equivocado. El regente debe seguir revisando la receta real
(foto) en la pestaña Recetas Rx antes de aprobarla, no aprobar a ciegas
solo porque el sistema encontró "algo" con ese teléfono.

Revalidado tras el cambio: `node --check js/admin.js` sin errores,
cruce de `getElementById` en `admin.js` contra `admin.html` sin
faltantes, cruce de funciones invocadas desde `onclick`/`onchange`
contra funciones definidas sin faltantes.

## v1_7 — corrección de conexión real a Firestore ("client is offline")
El usuario reportó: con Firebase Auth funcionando (login exitoso), no se
guardaban ni fotos ni textos de productos desde el panel admin. Diagnóstico
guiado paso a paso en el chat, en este orden, ANTES de tocar código:

1. Se revisó `config.js`: credenciales reales cargadas correctamente (no
   placeholders), proyecto `petpharma-5cc38`.
2. El error de consola exacto que dio el usuario fue
   `FirebaseError: Failed to get document because the client is offline`
   en `app.js:15` — es decir, fallaba ya al cargar la TIENDA PÚBLICA
   (`getContenido()` en `renderContenidoEditable`), no solo al guardar en
   el admin. Esto descartó que fuera específico del flujo de guardado.
3. El usuario compartió el contenido real de `firestore.rules` publicado
   en su consola de Firebase: coincide exactamente con el de este
   proyecto → se descartó reglas no publicadas y base de datos no creada
   (si no existiera, no habría pestaña de Reglas para pegar nada).
4. El usuario subió `petpharma_v1_6.zip` pensando que "esa sí funcionaba".
   Se hizo diff completo contra el paquete actual: `env.js`, `boot.js`,
   `firebase-real.js`, `auth.js`, `admin.js`, `local-db.js`, `ui.js` y
   `firestore.rules` son BYTE POR BYTE IDÉNTICOS entre ambas versiones —
   la única diferencia real es CSS/tema visual y que el `config.js` de
   v1_6 tenía placeholders sin rellenar (`TU_API_KEY`, etc.), lo cual
   significa que v1_6 JAMÁS se conectó a Firebase real: cuando "funcionaba"
   era porque `env.js` la mandaba a `local-db.js` (demo). Se descartó así
   cualquier regresión de código — el proyecto nunca había sido probado
   contra Firebase real hasta ahora.
5. Con reglas+DB confirmadas OK y código sin regresión, el diagnóstico se
   redujo a: (a) el canal de streaming que usa Firestore por defecto
   siendo bloqueado por algo del lado del cliente (antivirus, VPN,
   extensión, proxy) ya que Auth sí conecta con otro canal, o (b) la API
   key restringida en Google Cloud sin incluir Cloud Firestore API. El
   usuario pidió avanzar y corregir el código directamente en vez de
   seguir depurando manualmente, ofreciendo crear un proyecto Firebase
   nuevo si hiciera falta.

Cambios implementados en este paquete:
- `js/firebase-real.js`: `getFirestore(app)` → `initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true, useFetchStreams: false })`.
  Es el fix estándar recomendado por Firebase para exactamente este
  síntoma cuando el canal WebChannel normal es bloqueado por el cliente.
- `js/boot.js`: `window.cuandoDBListo` ahora envuelve el callback en
  `Promise.resolve().then().catch()`, así cualquier fallo (sync o async)
  se reporta en vez de quedar como "Uncaught (in promise)" silencioso.
- `js/auth.js`: `requerirSesionAdmin` ahora también atrapa el error del
  `callback(user)` async (antes corría dentro de `onAuthChange` sin
  ningún try/catch, así que el wrapper de `boot.js` no lo cubría).
- `js/ui.js`: nueva `window.avisarErrorConexion(error)` que traduce
  `error.code` de Firebase (`unavailable`, `permission-denied`,
  `unauthenticated`) a mensajes en español entendibles para el
  admin/cliente, mostrados con `mostrarToast(..., "error", 7000)` (7s en
  vez de los 3.2s normales, para que no se pierda un error de carga de
  página). `mostrarToast` ahora acepta un tercer parámetro opcional de
  duración, retrocompatible (default sigue siendo 3200ms).

Revalidado: `node --check` en los 9 `.js` (incluyendo `firebase-real.js`
como módulo ES vía copia `.mjs`) sin errores; los 3 HTML siguen
balanceados. No se tocó ningún HTML ni ningún id/función invocada desde
`onclick`/`onchange`, así que no hace falta re-cruzar esa auditoría.

Pendiente de que el usuario confirme en su navegador real:
- Si el fix de long-polling resuelve la conexión, debería funcionar todo
  (contenido público, guardar productos, fotos) sin tocar nada más.
- Si sigue igual: revisar restricciones de la API key en Google Cloud
  Console (Credenciales > API key > "Restricciones de API" → confirmar
  que "Cloud Firestore API" esté permitida junto a Identity Toolkit), y
  si aun así persiste, el usuario ya aceptó crear un proyecto Firebase
  nuevo desde cero como última opción — pasos para eso ya están en
  LEEME.txt sección "CORRECCIÓN v1_7".

## Pendiente / siguiente paso si retomas esto
1. Cuando el usuario (u otra sesión) pueda abrir esto en un navegador
   real, probar de punta a punta: agregar/editar/eliminar producto
   (incluyendo marcar varias especies y confirmar que el filtro de
   especie en la tienda pública responde bien), crear categoría nueva
   con emoji y luego borrarla, subir receta CON foto adjunta y verla en
   el admin, hacer un pedido completo y confirmar que el stock baja de
   verdad (idealmente probando también con Firebase real, no solo en
   modo demo, para validar las correcciones de la ronda v1_3), probar la
   lupa en tarjeta/modal/admin, editar el Contenido del Sitio y
   confirmar que se refleja en `index.html`, probar la Calculadora de
   Dosis con y sin `doseMgPerKg` configurado, y confirmar que el admin
   NO es expulsado a login.html al recargar `admin.html` ya en Firebase
   real.
2. Seguir generando zips incrementales cada vez que se corrija algo,
   tal como pidió el usuario (siguiente sería `petpharma_v1_5.zip`).
3. RESUELTO en v1_5 y reforzado en v1_6: el usuario decidió no bloquear
   el pago, pero SÍ bloquear la entrega/despacho hasta que el regente
   apruebe la receta (ver secciones "v1_5" y "v1_6" arriba). El cruce
   sigue siendo por teléfono, no por id explícito — si en el futuro
   pide subir el nivel de exigencia (guardar un id explícito de receta
   en el pedido en vez de cruzar por teléfono, para casos de clientes
   con más de un pedido Rx a la vez), retomar desde ahí.
4. Ya se avisó al usuario de las correcciones de v1_3 (receta sin foto
   real, expulsión del admin por race condition de sesión, descuento de
   stock bloqueado por las reglas de seguridad), v1_4 (especie no
   asignable desde el admin), v1_5 (marcado de "sin receta" en Pedidos)
   y v1_6 (bloqueo de entrega hasta receta aprobada). Si retoma la
   conversación, seguir desde acá en vez de reexplicar todo desde cero.
