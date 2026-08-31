/**
 * admin.js — Panel de Administración / Regente Farmacéutica
 */
let products = [];
let categorias = [];
let categoryMap = {};
let editingProductId = null;
let archivoImagenSeleccionado = null;
let emojiSeleccionadoCategoria = null;
let valorCategoriaAnterior = "";

window.requerirSesionAdmin(async (user) => {
  window.pintarBadgeModo("badge-modo");
  document.getElementById("adminUserName").innerText = user.email || "Administrador";

  window.construirEmojiGrid("emoji-grid", (emoji) => { emojiSeleccionadoCategoria = emoji; });

  await cargarCategorias();
  await cargarProductos();
  await cargarContenidoForm();
  await renderAdminPrescriptions();
  await renderAdminOrders();
  loadAdminStats();
  poblarSelectMedicamentosCalculadora();
});

document.getElementById("btn-logout")?.addEventListener("click", async () => {
  await window.DB.logout();
  window.location.href = "login.html";
});

function switchAdminTab(tab) {
  document.querySelectorAll(".admin-tab-content").forEach((el) => el.classList.add("hidden"));
  document.querySelectorAll(".admin-nav-btn").forEach((btn) => {
    btn.classList.remove("bg-emerald-800", "text-white");
    btn.classList.add("text-slate-300", "hover:bg-slate-800");
  });
  document.getElementById(`tab-content-${tab}`).classList.remove("hidden");
  const activeBtn = document.getElementById(`nav-btn-${tab}`);
  if (activeBtn) {
    activeBtn.classList.add("bg-emerald-800", "text-white");
    activeBtn.classList.remove("text-slate-300");
  }
  loadAdminStats();
}

// ---------- 1. Estadísticas ----------
async function loadAdminStats() {
  const prescriptions = await window.DB.getRecetas();
  const orders = await window.DB.getPedidos();

  const pendingRx = prescriptions.filter((p) => p.status === "pendiente").length;
  const activeOrders = orders.filter((o) => o.status !== "entregado" && o.status !== "cancelado").length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const lowStock = products.filter((p) => (p.stock || 0) < 15).length;

  // Pedidos que tienen algún medicamento Rx y NO tienen una receta
  // APROBADA de este cliente (mismo teléfono) — o sea, pedidos que no se
  // le pueden despachar todavía al cliente aunque ya estén pagados.
  const ordersMissingRx = orders.filter((o) => {
    if (!o.hasPrescriptionProducts) return false;
    const telCliente = window.normalizarTelefono(o.customer.phone);
    return !prescriptions.some(
      (r) => window.normalizarTelefono(r.ownerPhone) === telCliente && r.status === "aprobada"
    );
  }).length;

  document.getElementById("statPendingRx").innerText = pendingRx;
  document.getElementById("statActiveOrders").innerText = activeOrders;
  document.getElementById("statOrdersMissingRx").innerText = ordersMissingRx;
  document.getElementById("statRevenue").innerText = window.formatearPrecio(totalRevenue);
  document.getElementById("statLowStock").innerText = lowStock;
}

// ---------- 2. Recetas Rx ----------
async function renderAdminPrescriptions() {
  const rxList = await window.DB.getRecetas();
  const container = document.getElementById("adminRxTableBody");
  if (!container) return;

  if (rxList.length === 0) {
    container.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400">No hay recetas registradas.</td></tr>`;
    return;
  }

  container.innerHTML = rxList.map((rx) => {
    let statusBadge = '<span class="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-[10px] font-black">⏳ Pendiente</span>';
    if (rx.status === "validada") statusBadge = '<span class="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-[10px] font-black">✓ Validada</span>';
    if (rx.status === "rechazada") statusBadge = '<span class="bg-rose-100 text-rose-800 px-2.5 py-1 rounded-full text-[10px] font-black">✕ Rechazada</span>';

    return `
      <tr class="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
        <td class="p-3.5 font-mono font-bold text-slate-800 text-xs">${rx.id}</td>
        <td class="p-3.5">
          <p class="font-bold text-slate-900">${window.escHtml(rx.petName)} <span class="text-slate-400 font-normal">(${window.escHtml(rx.petType || 'perro')})</span></p>
          <p class="text-[11px] text-slate-500">Tutor: ${window.escHtml(rx.ownerName)} • ${window.escHtml(rx.ownerPhone)}</p>
        </td>
        <td class="p-3.5">
          <p class="font-bold text-slate-800">${window.escHtml(rx.vetName)}</p>
          <p class="text-[11px] text-slate-500 font-mono">Lic: ${window.escHtml(rx.vetLicense)}</p>
        </td>
        <td class="p-3.5"><p class="text-xs text-slate-700">${window.escHtml(rx.prescribedMedicines || rx.notes || '')}</p></td>
        <td class="p-3.5">${statusBadge}</td>
        <td class="p-3.5 text-right space-x-1">
          <button onclick="viewRxModal('${rx.id}')" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold">Ver Doc</button>
          ${rx.status === "pendiente" ? `
            <button onclick="updateRxStatus('${rx.id}', 'validada')" class="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold">Aprobar</button>
            <button onclick="updateRxStatus('${rx.id}', 'rechazada')" class="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold">Rechazar</button>
          ` : ''}
        </td>
      </tr>`;
  }).join("");
}

async function updateRxStatus(id, newStatus) {
  await window.DB.actualizarEstadoReceta(id, newStatus);
  await renderAdminPrescriptions();
  // Si esta receta desbloquea (o bloquea) la entrega de algún pedido con
  // Rx, refrescamos también la pestaña de Pedidos para que se vea al
  // toque, sin que el admin tenga que cambiar de pestaña y volver.
  await renderAdminOrders();
  loadAdminStats();
  window.mostrarToast(`Receta ${id} actualizada a: ${newStatus.toUpperCase()}`);
}

async function viewRxModal(id) {
  const rxList = await window.DB.getRecetas();
  const rx = rxList.find((r) => r.id === id);
  if (!rx) return;
  document.getElementById("rxModalPet").innerText = rx.petName;
  document.getElementById("rxModalVet").innerText = rx.vetName + " (" + rx.vetLicense + ")";
  document.getElementById("rxModalMeds").innerText = rx.prescribedMedicines || rx.notes || "";
  const img = document.getElementById("rxModalImage");
  img.src = rx.fileUrl || "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80";
  img.onclick = () => window.abrirLightbox(img.src, "Receta de " + rx.petName);
  document.getElementById("rxDetailModal").classList.remove("hidden");
}
function closeRxModal() {
  document.getElementById("rxDetailModal").classList.add("hidden");
}

// ---------- 3. Pedidos ----------
async function renderAdminOrders() {
  const [orders, recetas] = await Promise.all([window.DB.getPedidos(), window.DB.getRecetas()]);
  const container = document.getElementById("adminOrdersTableBody");
  if (!container) return;

  if (orders.length === 0) {
    container.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400">No hay pedidos registrados.</td></tr>`;
    return;
  }

  // Para cada pedido con Rx, buscamos si este cliente (mismo teléfono) ya
  // subió alguna receta, y en qué estado está. Es una pista por teléfono,
  // NO una garantía 1-a-1 de que sea exactamente la receta de ESE pedido
  // (el cliente pudo haber hecho dos compras) — por eso el regente debe
  // revisar la receta real en la pestaña "Recetas Rx" antes de aprobarla,
  // no confiar ciegamente en este cruce automático.
  container.innerHTML = orders.map((ord) => {
    let rxBadge = "";
    let entregaBloqueada = false;
    if (ord.hasPrescriptionProducts) {
      const telCliente = window.normalizarTelefono(ord.customer.phone);
      const match = recetas.find((r) => window.normalizarTelefono(r.ownerPhone) === telCliente);
      if (!match) {
        entregaBloqueada = true;
        rxBadge = `<a href="${window.linkWhatsApp(ord.customer.phone)}" target="_blank" rel="noopener"
             class="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-1 mt-1 hover:bg-rose-200"
             title="El cliente no ha subido receta para este pedido — pídesela por WhatsApp">
             ⚠️ Sin receta — pedir por WhatsApp</a>`;
      } else if (match.status === "aprobada") {
        rxBadge = `<span class="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded inline-block mt-1">✅ Receta ${window.escHtml(match.id)} aprobada</span>`;
      } else if (match.status === "rechazada") {
        entregaBloqueada = true;
        rxBadge = `<a href="${window.linkWhatsApp(ord.customer.phone)}" target="_blank" rel="noopener"
             class="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-1 mt-1 hover:bg-rose-200"
             title="La receta subida fue rechazada — pídele una nueva por WhatsApp">
             ❌ Receta rechazada — pedir otra</a>`;
      } else {
        entregaBloqueada = true;
        rxBadge = `<span class="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded inline-block mt-1"
             title="El cliente ya subió una receta, falta que la apruebes en la pestaña 'Recetas Rx'">
             🕓 Receta ${window.escHtml(match.id)} pendiente de aprobar</span>`;
      }
    }
    return `
      <tr class="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
        <td class="p-3.5 font-mono font-bold text-slate-900">${ord.orderNumber}</td>
        <td class="p-3.5">
          <p class="font-bold text-slate-900">${window.escHtml(ord.customer.name)}</p>
          <p class="text-[11px] text-slate-500">${window.escHtml(ord.customer.address)}, ${window.escHtml(ord.customer.city)}</p>
          <p class="text-[11px] text-emerald-700 font-mono">${window.escHtml(ord.customer.phone)}</p>
        </td>
        <td class="p-3.5">
          <p class="text-xs text-slate-700 font-medium">${ord.items.map((i) => `${window.escHtml(i.name)} (x${i.quantity})`).join(", ")}</p>
          <div>${rxBadge}</div>
        </td>
        <td class="p-3.5 font-bold text-slate-900">${window.formatearPrecio(ord.total)}</td>
        <td class="p-3.5">
          <select onchange="updateOrderStatus('${ord.id}', this)" class="bg-white border border-slate-300 rounded-lg p-1 text-xs font-bold text-slate-800">
            <option value="recibido" ${ord.status === 'recibido' ? 'selected' : ''}>📥 Recibido</option>
            <option value="en_preparacion" ${ord.status === 'en_preparacion' ? 'selected' : ''}>❄️ En Prep. Frío</option>
            <option value="en_camino" ${ord.status === 'en_camino' ? 'selected' : ''} ${entregaBloqueada ? 'disabled' : ''}>🚚 En Camino${entregaBloqueada ? ' (requiere Rx aprobada)' : ''}</option>
            <option value="entregado" ${ord.status === 'entregado' ? 'selected' : ''} ${entregaBloqueada ? 'disabled' : ''}>✅ Entregado${entregaBloqueada ? ' (requiere Rx aprobada)' : ''}</option>
            <option value="cancelado" ${ord.status === 'cancelado' ? 'selected' : ''}>✕ Cancelado</option>
          </select>
        </td>
        <td class="p-3.5 text-right">
          <button onclick="editOrderTemp('${ord.id}')" class="text-xs bg-sky-50 text-sky-700 border border-sky-200 px-2 py-1 rounded font-bold hover:bg-sky-100">
            🌡️ ${ord.temperatureVerified || 'Reg. Temp'}
          </button>
        </td>
      </tr>`;
  }).join("");
}

async function updateOrderStatus(id, selectEl) {
  const newStatus = selectEl.value;
  const avanzaAEntrega = newStatus === "en_camino" || newStatus === "entregado";

  if (avanzaAEntrega) {
    const [orders, recetas] = await Promise.all([window.DB.getPedidos(), window.DB.getRecetas()]);
    const ord = orders.find((o) => o.id === id);
    if (ord && ord.hasPrescriptionProducts) {
      const telCliente = window.normalizarTelefono(ord.customer.phone);
      const recetaAprobada = recetas.find(
        (r) => window.normalizarTelefono(r.ownerPhone) === telCliente && r.status === "aprobada"
      );
      if (!recetaAprobada) {
        selectEl.value = ord.status; // revertimos el select, no dejamos avanzar
        window.mostrarToast(
          "Este pedido tiene medicamento con Rx sin receta APROBADA de este cliente. Pide/revisa la receta y apruébala en la pestaña 'Recetas Rx' antes de despachar.",
          "error"
        );
        return;
      }
    }
  }

  await window.DB.actualizarEstadoPedido(id, newStatus);
  await renderAdminOrders();
  loadAdminStats();
}

async function editOrderTemp(id) {
  const temp = prompt("Ingresa la lectura del termómetro digital en la nevera de envío (ej: 3.8°C):", "4.0°C");
  if (temp) {
    await window.DB.actualizarTemperaturaPedido(id, `${temp} (Verificado)`);
    await renderAdminOrders();
  }
}

// ---------- 4. Catálogo: categorías ----------
async function cargarCategorias() {
  categorias = await window.DB.getCategorias();
  categoryMap = Object.fromEntries(categorias.map((c) => [c.id, c]));
  pintarSelectCategorias();
}

function pintarSelectCategorias(seleccionar) {
  const select = document.getElementById("newProdCategory");
  if (!select) return;
  const opciones = categorias.map((c) => `<option value="${c.id}">${c.emoji} ${window.escHtml(c.nombre)}</option>`).join("");
  select.innerHTML = `<option value="">Elegir...</option>${opciones}<option value="__nueva__">➕ Agregar categoría nueva</option>`;
  if (seleccionar) select.value = seleccionar;
}

document.getElementById("newProdCategory")?.addEventListener("change", (e) => {
  const panel = document.getElementById("panel-nueva-categoria");
  if (e.target.value === "__nueva__") {
    panel.classList.remove("hidden");
    document.getElementById("nc-nombre").focus();
  } else {
    valorCategoriaAnterior = e.target.value;
    panel.classList.add("hidden");
  }
});

function cerrarPanelCategoria() {
  document.getElementById("panel-nueva-categoria").classList.add("hidden");
  document.getElementById("nc-nombre").value = "";
  emojiSeleccionadoCategoria = null;
  document.querySelectorAll("#emoji-grid .emoji-btn").forEach((b) => b.classList.remove("selected"));
  document.getElementById("newProdCategory").value = valorCategoriaAnterior;
}

async function guardarNuevaCategoria() {
  const nombre = document.getElementById("nc-nombre").value.trim();
  if (!nombre) { window.mostrarToast("Escribe un nombre para la categoría", "error"); return; }
  if (!emojiSeleccionadoCategoria) { window.mostrarToast("Elige un emoji para la categoría", "error"); return; }
  try {
    const nueva = await window.DB.agregarCategoria({ nombre, emoji: emojiSeleccionadoCategoria });
    await cargarCategorias();
    document.getElementById("newProdCategory").value = nueva.id;
    valorCategoriaAnterior = nueva.id;
    document.getElementById("panel-nueva-categoria").classList.add("hidden");
    document.getElementById("nc-nombre").value = "";
    emojiSeleccionadoCategoria = null;
    document.querySelectorAll("#emoji-grid .emoji-btn").forEach((b) => b.classList.remove("selected"));
    window.mostrarToast(`Categoría "${nombre}" creada 🎉`);
  } catch (error) {
    window.mostrarToast(error.message || "No se pudo crear la categoría", "error");
  }
}

function toggleGestionCategorias() {
  const panel = document.getElementById("panel-gestion-categorias");
  const abrir = panel.classList.contains("hidden");
  panel.classList.toggle("hidden");
  if (abrir) renderListaCategoriasExistentes();
}

function renderListaCategoriasExistentes() {
  const panel = document.getElementById("panel-gestion-categorias");
  if (categorias.length === 0) {
    panel.innerHTML = '<p class="text-[11px] text-slate-400">Todavía no hay categorías.</p>';
    return;
  }
  panel.innerHTML = categorias.map((c) => {
    const enUso = products.some((p) => p.category === c.id);
    return `
      <div class="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-3 py-1.5">
        <span class="font-bold text-slate-700">${c.emoji} ${window.escHtml(c.nombre)}</span>
        <button type="button" onclick="eliminarCategoriaExistente('${c.id}')" ${enUso ? 'disabled title="Hay medicamentos usando esta categoría — reasígnalos antes de borrarla"' : ''} class="text-[11px] font-bold text-rose-600 hover:text-rose-800 disabled:text-slate-300 disabled:cursor-not-allowed">
          ${enUso ? 'En uso' : '🗑️ Borrar'}
        </button>
      </div>`;
  }).join("");
}

async function eliminarCategoriaExistente(id) {
  const c = categorias.find((x) => x.id === id);
  if (!confirm(`¿Eliminar la categoría "${c ? c.nombre : id}"?`)) return;
  try {
    await window.DB.eliminarCategoria(id);
    await cargarCategorias();
    renderListaCategoriasExistentes();
    window.mostrarToast("Categoría eliminada 🗑️");
  } catch (error) {
    window.mostrarToast(error.message || "No se pudo eliminar la categoría", "error");
  }
}

// ---------- 4b. Catálogo: productos (crear / editar / eliminar) ----------
async function cargarProductos() {
  products = await window.DB.getProductos();
  renderAdminProducts();
  poblarSelectMedicamentosCalculadora();
}

function renderAdminProducts() {
  const container = document.getElementById("adminProductsTableBody");
  if (!container) return;

  container.innerHTML = products.map((prod) => `
      <tr class="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
        <td class="p-3.5 flex items-center gap-3">
          <img src="${prod.image}" onclick="window.abrirLightbox('${window.escAttr(prod.image)}', '${window.escAttr(prod.name)}')" class="w-10 h-10 object-cover rounded-lg bg-slate-100 cursor-pointer" title="Ver foto completa" />
          <div>
            <p class="font-bold text-slate-900 text-xs">${window.escHtml(prod.name)}</p>
            <p class="text-[11px] text-slate-500 font-mono">${window.escHtml(prod.activeSubstance)}</p>
          </div>
        </td>
        <td class="p-3.5 text-xs font-bold text-slate-700 uppercase">
          ${iconoCategoria(prod.category)} ${window.escHtml(nombreCategoria(prod.category))}
          <p class="text-[10px] text-slate-400 font-normal normal-case mt-0.5">${(prod.species || []).map(emojiEspecie).join(" ") || "Sin especie"}</p>
        </td>
        <td class="p-3.5 text-xs font-bold text-slate-900">${window.formatearPrecio(prod.price)}</td>
        <td class="p-3.5 text-xs">
          <span class="font-bold ${(prod.stock || 0) < 15 ? 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded' : 'text-slate-700'}">${prod.stock ?? 0} uds</span>
        </td>
        <td class="p-3.5 text-xs">
          ${prod.requiresPrescription ? '<span class="text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded font-bold text-[10px]">Rx Obligatoria</span>' : '<span class="text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-bold text-[10px]">Libre</span>'}
          ${prod.requiresColdChain ? '<span class="text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.2 rounded font-bold text-[10px] ml-1">❄️ Frío</span>' : ''}
        </td>
        <td class="p-3.5 text-right space-x-1">
          <button onclick="iniciarEdicionProducto('${prod.id}')" class="px-2 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded text-xs font-bold">✏️ Editar</button>
          <button onclick="deleteProduct('${prod.id}')" class="px-2 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded text-xs font-bold">🗑️ Eliminar</button>
        </td>
      </tr>`).join("");
}

function iconoCategoria(slug) {
  return categoryMap[slug] ? categoryMap[slug].emoji : "🐾";
}
function nombreCategoria(slug) {
  return categoryMap[slug] ? categoryMap[slug].nombre : slug;
}

const EMOJIS_ESPECIES = { perros: "🐕", gatos: "🐈", equinos: "🐎", aves: "🦜" };
function emojiEspecie(especie) {
  return EMOJIS_ESPECIES[especie] || especie;
}

/** Marca en el formulario los checkboxes de especie que traiga el
 *  producto (usado al editar). Si no se pasa nada (producto nuevo),
 *  deja marcadas perros+gatos como punto de partida razonable, pero
 *  el admin puede des/marcar cualquiera antes de guardar. */
function marcarCheckboxesEspecies(especies) {
  const lista = especies && especies.length ? especies : ["perros", "gatos"];
  document.querySelectorAll(".newProdSpecies").forEach((cb) => {
    cb.checked = lista.includes(cb.value);
  });
}

function leerCheckboxesEspecies() {
  return Array.from(document.querySelectorAll(".newProdSpecies:checked")).map((cb) => cb.value);
}

function openAddProductModal() {
  cancelarEdicionProducto(); // asegura que el formulario empiece limpio, en modo "agregar"
  document.getElementById("addProductModal").classList.remove("hidden");
}
function closeAddProductModal() {
  document.getElementById("addProductModal").classList.add("hidden");
}

function iniciarEdicionProducto(id) {
  const p = products.find((x) => x.id === id);
  if (!p) return;
  editingProductId = id;
  archivoImagenSeleccionado = null;

  document.getElementById("newProdName").value = p.name || "";
  document.getElementById("newProdBrand").value = p.brand || "";
  document.getElementById("newProdActive").value = p.activeSubstance || "";
  pintarSelectCategorias(p.category);
  valorCategoriaAnterior = p.category;
  marcarCheckboxesEspecies(p.species || []);
  document.getElementById("newProdPrice").value = p.price ?? "";
  document.getElementById("newProdOriginalPrice").value = p.originalPrice ?? "";
  document.getElementById("newProdStock").value = p.stock ?? 0;
  document.getElementById("newProdRx").checked = !!p.requiresPrescription;
  document.getElementById("newProdCold").checked = !!p.requiresColdChain;
  document.getElementById("newProdImage").value = p.image || "";
  document.getElementById("newProdDosage").value = p.dosage || "";
  document.getElementById("newProdIndications").value = p.indications || "";
  document.getElementById("newProdDescription").value = p.description || "";
  document.getElementById("newProdDoseMgKg").value = p.doseMgPerKg ?? "";
  document.getElementById("newProdDoseFreq").value = p.doseFrequency || "";

  const preview = document.getElementById("newProdImgPreview");
  if (p.image) { preview.src = p.image; preview.classList.remove("hidden"); }
  else preview.classList.add("hidden");

  document.getElementById("addProductModalTitle").innerText = "Editar Medicamento";
  document.getElementById("addProductSubmitBtn").innerText = "Actualizar Medicamento";
  document.getElementById("addProductModal").classList.remove("hidden");
}

function cancelarEdicionProducto() {
  editingProductId = null;
  archivoImagenSeleccionado = null;
  const form = document.getElementById("form-producto");
  if (form) form.reset();
  document.getElementById("newProdImgPreview").classList.add("hidden");
  document.getElementById("addProductModalTitle").innerText = "Agregar Medicamento";
  document.getElementById("addProductSubmitBtn").innerText = "Guardar Medicamento";
  valorCategoriaAnterior = "";
  pintarSelectCategorias();
  marcarCheckboxesEspecies();
  cerrarPanelCategoria();
}

document.getElementById("newProdImageFile")?.addEventListener("change", (e) => {
  const archivo = e.target.files[0];
  if (!archivo) return;
  archivoImagenSeleccionado = archivo;
  const lector = new FileReader();
  lector.onload = () => {
    const preview = document.getElementById("newProdImgPreview");
    preview.src = lector.result;
    preview.classList.remove("hidden");
  };
  lector.readAsDataURL(archivo);
});

async function handleAddProductSubmit(e) {
  e.preventDefault();

  const category = document.getElementById("newProdCategory").value;
  if (!category || category === "__nueva__") {
    window.mostrarToast("Elige (o crea) una categoría para el medicamento", "error");
    return;
  }

  const species = leerCheckboxesEspecies();
  if (species.length === 0) {
    window.mostrarToast("Marca al menos una especie para el medicamento", "error");
    return;
  }

  const datos = {
    name: document.getElementById("newProdName").value.trim(),
    brand: document.getElementById("newProdBrand").value.trim(),
    activeSubstance: document.getElementById("newProdActive").value.trim(),
    category,
    species,
    price: document.getElementById("newProdPrice").value,
    originalPrice: document.getElementById("newProdOriginalPrice").value,
    stock: document.getElementById("newProdStock").value,
    requiresPrescription: document.getElementById("newProdRx").checked,
    requiresColdChain: document.getElementById("newProdCold").checked,
    image: document.getElementById("newProdImage").value.trim(),
    dosage: document.getElementById("newProdDosage").value.trim(),
    indications: document.getElementById("newProdIndications").value.trim(),
    description: document.getElementById("newProdDescription").value.trim(),
    doseMgPerKg: document.getElementById("newProdDoseMgKg").value,
    doseFrequency: document.getElementById("newProdDoseFreq").value.trim(),
  };

  if (!datos.name || !datos.price) {
    window.mostrarToast("Completa al menos el nombre y el precio", "error");
    return;
  }

  const btn = document.getElementById("addProductSubmitBtn");
  const textoOriginal = btn.innerText;
  btn.disabled = true;
  btn.innerText = "Guardando...";

  try {
    if (editingProductId) {
      await window.DB.actualizarProducto(editingProductId, datos, archivoImagenSeleccionado);
      window.mostrarToast("Medicamento actualizado ✏️");
    } else {
      await window.DB.agregarProducto(datos, archivoImagenSeleccionado);
      window.mostrarToast("Medicamento agregado al catálogo 🎉");
    }
    cancelarEdicionProducto();
    closeAddProductModal();
    await cargarProductos();
    loadAdminStats();
  } catch (error) {
    console.error(error);
    window.mostrarToast(error.message || "No se pudo guardar el medicamento", "error");
    btn.innerText = textoOriginal;
  } finally {
    btn.disabled = false;
  }
}

async function deleteProduct(id) {
  const p = products.find((x) => x.id === id);
  if (!confirm(`¿Estás seguro de que deseas retirar "${p ? p.name : 'este medicamento'}" del catálogo?`)) return;
  await window.DB.eliminarProducto(id);
  if (editingProductId === id) cancelarEdicionProducto();
  await cargarProductos();
  loadAdminStats();
}

// ---------- 5. Contenido editable del sitio ----------
async function cargarContenidoForm() {
  const c = await window.DB.getContenido();
  const campos = [
    "nombreFarmacia", "tagline", "anuncioTexto", "anuncioTelefono",
    "heroBadge", "heroTitulo", "heroDescripcion",
    "garantiaTitulo", "garantiaLinea1", "garantiaLinea2", "garantiaLinea3",
    "footerNombre", "footerTexto",
  ];
  campos.forEach((campo) => {
    const el = document.getElementById("cont-" + campo);
    if (el) el.value = c[campo] || "";
  });
}

async function guardarContenidoSitio(e) {
  e.preventDefault();
  const campos = [
    "nombreFarmacia", "tagline", "anuncioTexto", "anuncioTelefono",
    "heroBadge", "heroTitulo", "heroDescripcion",
    "garantiaTitulo", "garantiaLinea1", "garantiaLinea2", "garantiaLinea3",
    "footerNombre", "footerTexto",
  ];
  const datos = {};
  campos.forEach((campo) => {
    const el = document.getElementById("cont-" + campo);
    if (el) datos[campo] = el.value;
  });
  try {
    await window.DB.guardarContenido(datos);
    window.mostrarToast("Contenido del sitio actualizado ✅");
  } catch (error) {
    window.mostrarToast(error.message || "No se pudo guardar el contenido", "error");
  }
}

// ---------- 6. Calculadora de Dosis (herramienta del administrador) ----------
function poblarSelectMedicamentosCalculadora() {
  const select = document.getElementById("calcMedSelect");
  if (!select) return;
  const conFormula = products.filter((p) => p.doseMgPerKg);
  select.innerHTML =
    '<option value="__generico__">Cálculo genérico (mg/kg manual)</option>' +
    conFormula.map((p) => `<option value="${p.id}">${window.escHtml(p.name)} (${p.doseMgPerKg} mg/kg)</option>`).join("");
  toggleCalcModoGenerico();
}

function toggleCalcModoGenerico() {
  const select = document.getElementById("calcMedSelect");
  const panelGenerico = document.getElementById("calc-panel-generico");
  if (!select || !panelGenerico) return;
  panelGenerico.classList.toggle("hidden", select.value !== "__generico__");
}

function calcularDosisAdmin() {
  const select = document.getElementById("calcMedSelect");
  const weight = parseFloat(document.getElementById("calcWeight").value) || 0;
  const resultEl = document.getElementById("calcResult");

  if (weight <= 0) {
    window.mostrarToast("Ingresa el peso del paciente en kg", "error");
    return;
  }

  let mgPorKg, frecuencia, nombreMed;

  if (select.value === "__generico__") {
    mgPorKg = parseFloat(document.getElementById("calcGenericoMgKg").value) || 0;
    frecuencia = document.getElementById("calcGenericoFrecuencia").value || "según indicación";
    nombreMed = "Cálculo genérico";
    if (mgPorKg <= 0) {
      window.mostrarToast("Ingresa los mg/kg para el cálculo genérico", "error");
      return;
    }
  } else {
    const prod = products.find((p) => p.id === select.value);
    if (!prod) return;
    mgPorKg = prod.doseMgPerKg;
    frecuencia = prod.doseFrequency || "según indicación del veterinario";
    nombreMed = prod.name;
  }

  const totalMg = (weight * mgPorKg).toFixed(2);
  resultEl.innerHTML = `
    💊 <strong>${window.escHtml(nombreMed)}</strong><br>
    Paciente de ${weight} kg × ${mgPorKg} mg/kg = <strong>${totalMg} mg</strong>, ${window.escHtml(frecuencia)}.`;
  resultEl.classList.remove("hidden");
}

// Al agregar/editar un medicamento con "primer formato" de dosis (mg/kg),
// el select de la calculadora se refresca automáticamente al guardar
// (ver cargarProductos -> poblarSelectMedicamentosCalculadora).
