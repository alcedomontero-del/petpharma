/**
 * app.js — Tienda pública y carrito (PetPharma)
 */
let cart = [];
let allProducts = [];
let categoryMap = {}; // { slug: { nombre, emoji } }
let activeSpecies = "todos";
let activeCategory = "todos";
let searchQuery = "";

window.cuandoDBListo(async () => {
  await renderContenidoEditable();
  await cargarCategoriasYProductos();
  initCartFromStorage();
});

// ---------- Contenido editable (header, anuncio, hero, footer) ----------
async function renderContenidoEditable() {
  const c = await window.DB.getContenido();
  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
  };
  set("cEncabezadoNombre", c.nombreFarmacia);
  set("cTagline", c.tagline);
  set("cAnuncioTexto", c.anuncioTexto);
  set("cAnuncioTelefono", c.anuncioTelefono);
  set("cHeroBadge", c.heroBadge);
  set("cHeroTitulo", c.heroTitulo);
  set("cHeroDescripcion", c.heroDescripcion);
  set("cGarantiaTitulo", c.garantiaTitulo);
  set("cGarantiaLinea1", c.garantiaLinea1);
  set("cGarantiaLinea2", c.garantiaLinea2);
  set("cGarantiaLinea3", c.garantiaLinea3);
  set("cFooterNombre", c.footerNombre);
  set("cFooterTexto", c.footerTexto);
}

// ---------- Categorías + Productos ----------
async function cargarCategoriasYProductos() {
  const [categorias, productos] = await Promise.all([
    window.DB.getCategorias(),
    window.DB.getProductos(),
  ]);
  categoryMap = Object.fromEntries(categorias.map((c) => [c.id, c]));
  allProducts = productos;
  renderCategoryFilters(categorias);
  renderStoreProducts();
}

function renderCategoryFilters(categorias) {
  const cont = document.getElementById("categoryFiltersContainer");
  if (!cont) return;
  const botones = [
    `<button onclick="filterCategory('todos')" class="cat-btn active px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border bg-emerald-700 text-white border-emerald-700 shadow-xs" data-cat="todos">Todos los Medicamentos</button>`,
    ...categorias.map(
      (c) =>
        `<button onclick="filterCategory('${c.id}')" class="cat-btn px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border bg-white/5 text-emerald-100/70 border-white/10 hover:bg-white/10" data-cat="${c.id}">${c.emoji} ${window.escHtml(c.nombre)}</button>`
    ),
  ];
  cont.innerHTML = botones.join("");
}

function iconoCategoria(slug) {
  return categoryMap[slug] ? categoryMap[slug].emoji : "🐾";
}
function nombreCategoria(slug) {
  return categoryMap[slug] ? categoryMap[slug].nombre : slug;
}

function renderStoreProducts() {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;

  const filtered = allProducts.filter((p) => {
    const matchesSpecies = activeSpecies === "todos" || (p.species && p.species.includes(activeSpecies));
    const matchesCategory = activeCategory === "todos" || p.category === activeCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.activeSubstance && p.activeSubstance.toLowerCase().includes(q)) ||
      (p.brand && p.brand.toLowerCase().includes(q));
    return matchesSpecies && matchesCategory && matchesSearch;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-12 text-center bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 p-6">
        <p class="text-emerald-100/60 text-sm font-semibold">No se encontraron medicamentos para los filtros seleccionados.</p>
        <button onclick="resetFilters()" class="mt-3 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold">
          Restablecer Filtros
        </button>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map((p) => {
    const sinStock = (p.stock || 0) <= 0;
    const pocoStock = !sinStock && (p.stock || 0) <= 5;
    return `
    <div class="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-4 flex flex-col justify-between hover:bg-white/10 hover:shadow-lg hover:shadow-black/20 transition-all space-y-3 group">
      <div class="relative">
        <img
          src="${p.image}"
          alt="${window.escAttr(p.name)}"
          onclick="openProductDetailModal('${p.id}')"
          class="w-full h-40 object-cover rounded-xl bg-white/5 mb-2 cursor-pointer group-hover:scale-102 transition-transform"
        >
        <button onclick="event.stopPropagation(); window.abrirLightbox('${window.escAttr(p.image)}', '${window.escAttr(p.name)}')" title="Ver foto completa" class="absolute bottom-3 right-2 bg-black/50 hover:bg-black/70 text-white w-7 h-7 rounded-full shadow-xs flex items-center justify-center text-xs">🔍</button>
        ${p.requiresPrescription ? '<span class="absolute top-2 left-2 bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">Rx Receta</span>' : '<span class="absolute top-2 left-2 bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">Venta Libre</span>'}
        ${p.requiresColdChain ? '<span class="absolute top-2 right-2 bg-sky-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">❄️ Frío (2-8°C)</span>' : ''}
      </div>
      <div>
        <span class="text-[10px] uppercase font-bold text-emerald-300/50 tracking-wider">${window.escHtml(p.brand)}</span>
        <h4 onclick="openProductDetailModal('${p.id}')" class="text-xs font-extrabold text-white leading-snug cursor-pointer hover:text-emerald-300">${window.escHtml(p.name)}</h4>
        <p class="text-[11px] text-emerald-400 font-bold mt-1">🧪 ${window.escHtml(p.activeSubstance)}</p>
        <p class="text-[10px] text-emerald-100/50 mt-1 line-clamp-2">${window.escHtml(p.dosage || p.indications || '')}</p>
        ${pocoStock ? `<p class="text-[10px] text-rose-400 font-bold mt-1">⚠️ ¡Solo quedan ${p.stock} unidad${p.stock === 1 ? '' : 'es'}!</p>` : ''}
        ${sinStock ? `<p class="text-[10px] text-emerald-200/40 font-bold mt-1">Agotado temporalmente</p>` : ''}
      </div>
      <div class="pt-2 border-t border-white/10 flex items-center justify-between">
        <div>
          <span class="text-base font-black text-white">${window.formatearPrecio(p.price)}</span>
          ${p.originalPrice ? `<span class="text-[11px] text-emerald-300/40 line-through ml-1">${window.formatearPrecio(p.originalPrice)}</span>` : ''}
        </div>
        <button onclick="addToCart('${p.id}')" ${sinStock ? 'disabled' : ''} class="bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition-all flex items-center gap-1">
          <span>${sinStock ? 'Agotado' : '+ Agregar'}</span>
        </button>
      </div>
    </div>`;
  }).join("");
}

// ---------- Filtros ----------
function filterSpecies(sp) {
  activeSpecies = sp;
  document.querySelectorAll(".species-btn").forEach((btn) => {
    btn.className = btn.dataset.species === sp
      ? "species-btn active px-3.5 py-1.5 rounded-full text-xs font-bold border bg-emerald-500 text-slate-950 border-emerald-500 shadow-xs"
      : "species-btn px-3.5 py-1.5 rounded-full text-xs font-bold border bg-white/5 text-emerald-100/70 border-white/10 hover:bg-white/10";
  });
  renderStoreProducts();
}

function filterCategory(cat) {
  activeCategory = cat;
  document.querySelectorAll(".cat-btn").forEach((btn) => {
    btn.className = btn.dataset.cat === cat
      ? "cat-btn active px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border bg-emerald-700 text-white border-emerald-700 shadow-xs"
      : "cat-btn px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border bg-white/5 text-emerald-100/70 border-white/10 hover:bg-white/10";
  });
  renderStoreProducts();
}

function handleSearch(val) {
  searchQuery = val;
  renderStoreProducts();
}

function resetFilters() {
  searchQuery = "";
  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.value = "";
  filterSpecies("todos");
  filterCategory("todos");
}

// ---------- Carrito (con control real de stock) ----------
function initCartFromStorage() {
  try {
    const saved = localStorage.getItem("petpharma_cart");
    if (saved) cart = JSON.parse(saved);
  } catch (e) {
    cart = [];
  }
  // Revalida el carrito contra el stock actual (por si cambió desde la última visita)
  cart = cart.filter((item) => {
    const prod = allProducts.find((p) => p.id === item.id);
    return prod && prod.stock > 0;
  }).map((item) => {
    const prod = allProducts.find((p) => p.id === item.id);
    if (prod && item.quantity > prod.stock) item.quantity = prod.stock;
    return item;
  });
  saveCartToStorage();
  updateCartUI();
}

function saveCartToStorage() {
  try {
    localStorage.setItem("petpharma_cart", JSON.stringify(cart));
  } catch (e) {}
}

function addToCart(productId) {
  const prod = allProducts.find((p) => p.id === productId);
  if (!prod) return;
  if ((prod.stock || 0) <= 0) {
    window.mostrarToast("Este medicamento está agotado temporalmente.", "error");
    return;
  }

  const existing = cart.find((i) => i.id === productId);
  const cantidadEnCarrito = existing ? existing.quantity : 0;

  if (cantidadEnCarrito + 1 > prod.stock) {
    window.mostrarToast(`Solo hay ${prod.stock} unidad(es) disponibles de este medicamento.`, "error");
    return;
  }

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ id: prod.id, name: prod.name, price: prod.price, quantity: 1, requiresPrescription: prod.requiresPrescription, requiresColdChain: prod.requiresColdChain });
  }

  saveCartToStorage();
  updateCartUI();
  toggleCart(true);
}

function updateCartUI() {
  const badge = document.getElementById("cartBadge");
  const totalCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  if (badge) badge.innerText = totalCount;

  const list = document.getElementById("cartItemsList");
  const totalEl = document.getElementById("cartTotal");
  const rxNotice = document.getElementById("cartRxNotice");
  if (!list) return;

  if (cart.length === 0) {
    list.innerHTML = '<p class="text-xs text-emerald-200/40 text-center py-8">Tu carrito está vacío.</p>';
    if (totalEl) totalEl.innerText = window.formatearPrecio(0);
    if (rxNotice) rxNotice.classList.add("hidden");
    return;
  }

  let total = 0;
  let hasRx = false;

  list.innerHTML = cart.map((i) => {
    total += i.price * i.quantity;
    if (i.requiresPrescription) hasRx = true;
    const prod = allProducts.find((p) => p.id === i.id);
    const stockMax = prod ? prod.stock : 999;
    return `
      <div class="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/10 text-xs">
        <div class="flex-1 pr-2">
          <p class="font-bold text-white">${window.escHtml(i.name)}</p>
          <p class="text-emerald-200/50 text-[11px] font-medium">${window.formatearPrecio(i.price)} cada uno</p>
          ${i.requiresPrescription ? '<span class="text-[9px] bg-rose-500/15 text-rose-300 font-bold px-1.5 py-0.2 rounded">Requiere Rx</span>' : ''}
          ${i.requiresColdChain ? '<span class="text-[9px] bg-sky-500/15 text-sky-300 font-bold px-1.5 py-0.2 rounded ml-1">❄️ Frío</span>' : ''}
        </div>
        <div class="flex items-center gap-2">
          <button onclick="changeQty('${i.id}', -1)" class="w-6 h-6 bg-white/10 border border-white/10 rounded-lg font-bold text-white hover:bg-white/20 flex items-center justify-center">-</button>
          <span class="font-bold text-xs text-white">${i.quantity}</span>
          <button onclick="changeQty('${i.id}', 1)" ${i.quantity >= stockMax ? 'disabled title="No hay más stock disponible"' : ''} class="w-6 h-6 bg-white/10 border border-white/10 rounded-lg font-bold text-white hover:bg-white/20 disabled:opacity-30 flex items-center justify-center">+</button>
        </div>
      </div>`;
  }).join("");

  if (totalEl) totalEl.innerText = window.formatearPrecio(total);
  if (rxNotice) rxNotice.classList.toggle("hidden", !hasRx);
}

function changeQty(id, delta) {
  const item = cart.find((i) => i.id === id);
  if (!item) return;

  if (delta > 0) {
    const prod = allProducts.find((p) => p.id === id);
    if (prod && item.quantity + 1 > prod.stock) {
      window.mostrarToast(`Solo hay ${prod.stock} unidad(es) disponibles de este medicamento.`, "error");
      return;
    }
  }

  item.quantity += delta;
  if (item.quantity <= 0) {
    cart = cart.filter((i) => i.id !== id);
  }
  saveCartToStorage();
  updateCartUI();
}

function toggleCart(forceOpen) {
  const drawer = document.getElementById("cartDrawer");
  if (!drawer) return;
  if (forceOpen === true) drawer.classList.remove("hidden");
  else if (forceOpen === false) drawer.classList.add("hidden");
  else drawer.classList.toggle("hidden");
}

function openCheckoutModal() {
  if (cart.length === 0) {
    window.mostrarToast("Tu carrito está vacío.", "error");
    return;
  }
  toggleCart(false);
  document.getElementById("checkoutModal").classList.remove("hidden");
}
function closeCheckoutModal() {
  document.getElementById("checkoutModal").classList.add("hidden");
}

async function handleCheckoutSubmit(e) {
  e.preventDefault();

  // Última verificación de stock justo antes de confirmar (evita vender de más
  // si alguien más compró mientras este cliente tenía el carrito abierto).
  for (const item of cart) {
    const prod = allProducts.find((p) => p.id === item.id);
    if (!prod || prod.stock < item.quantity) {
      window.mostrarToast(`"${item.name}" ya no tiene suficiente stock disponible. Ajusta tu carrito.`, "error");
      return;
    }
  }

  const name = document.getElementById("chkName").value;
  const phone = document.getElementById("chkPhone").value;
  const address = document.getElementById("chkAddress").value;
  const notes = document.getElementById("chkNotes").value;

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const hasRx = cart.some((i) => i.requiresPrescription);
  const hasCold = cart.some((i) => i.requiresColdChain);

  const btn = e.target.querySelector('button[type="submit"]');
  if (btn) { btn.disabled = true; btn.innerText = "Procesando..."; }

  try {
    const nuevoPedido = await window.DB.crearPedido({
      customer: { name, phone, address, city: "Santo Domingo", deliveryType: "domicilio", notes },
      items: [...cart],
      subtotal,
      deliveryCost: 0,
      total: subtotal,
      paymentMethod: "contra_entrega",
      paymentStatus: "pago_al_recibir",
      hasPrescriptionProducts: hasRx,
      temperatureVerified: hasCold ? "3.9°C (Bolsa de Frío)" : "N/A",
    });

    cart = [];
    saveCartToStorage();
    updateCartUI();
    closeCheckoutModal();
    e.target.reset();
    await cargarCategoriasYProductos(); // refresca stock mostrado en el catálogo
    window.mostrarToast(`🎉 ¡Pedido #${nuevoPedido.orderNumber} registrado con éxito!`);
  } catch (error) {
    console.error(error);
    window.mostrarToast(error.message || "No se pudo registrar el pedido", "error");
  } finally {
    if (btn) { btn.disabled = false; btn.innerText = "Confirmar Pedido (Pago Contra Entrega)"; }
  }
}

// ---------- Modal Detalle de Producto ----------
function openProductDetailModal(id) {
  const prod = allProducts.find((p) => p.id === id);
  if (!prod) return;

  const img = document.getElementById("modalProdImg");
  img.src = prod.image;
  img.onclick = () => window.abrirLightbox(prod.image, prod.name);
  document.getElementById("modalProdName").innerText = prod.name;
  document.getElementById("modalProdBrand").innerText = prod.brand;
  document.getElementById("modalProdActive").innerText = "🧪 " + (prod.activeSubstance || "");
  document.getElementById("modalProdPrice").innerText = window.formatearPrecio(prod.price);
  document.getElementById("modalProdDosage").innerText = prod.dosage || "Consulte al médico veterinario";
  document.getElementById("modalProdIndications").innerText = prod.indications || "Medicamento de uso veterinario certificado";

  const descBox = document.getElementById("modalProdDescriptionBox");
  if (prod.description) {
    descBox.classList.remove("hidden");
    document.getElementById("modalProdDescription").innerText = prod.description;
  } else {
    descBox.classList.add("hidden");
  }

  const addBtn = document.getElementById("modalProdAddBtn");
  const sinStock = (prod.stock || 0) <= 0;
  addBtn.disabled = sinStock;
  addBtn.innerText = sinStock ? "Agotado Temporalmente" : "Agregar al Carrito de Compras";
  addBtn.onclick = () => {
    addToCart(prod.id);
    closeProductDetailModal();
  };

  document.getElementById("productDetailModal").classList.remove("hidden");
}
function closeProductDetailModal() {
  document.getElementById("productDetailModal").classList.add("hidden");
}

// ---------- Subir Receta Rx ----------
function openPrescriptionModal() {
  document.getElementById("prescriptionModal").classList.remove("hidden");
}
function closePrescriptionModal() {
  document.getElementById("prescriptionModal").classList.add("hidden");
}

async function handlePrescriptionSubmit(e) {
  e.preventDefault();
  const petName = document.getElementById("rxPetName").value;
  const ownerName = document.getElementById("rxOwnerName").value;
  const ownerPhone = document.getElementById("rxOwnerPhone").value;
  const vetName = document.getElementById("rxVetName").value;
  const vetLicense = document.getElementById("rxVetLicense").value;
  const meds = document.getElementById("rxMedicines").value;
  const archivo = document.getElementById("rxFile").files[0];

  if (!archivo) {
    window.mostrarToast("Adjunta una foto de la receta antes de enviarla.", "error");
    return;
  }

  const btn = e.target.querySelector('button[type="submit"]');
  if (btn) { btn.disabled = true; btn.innerText = "Enviando..."; }

  try {
    const newRx = await window.DB.subirReceta({
      petName, petType: "perro", ownerName, ownerPhone, vetName, vetLicense,
      prescribedMedicines: meds,
    }, archivo);
    closePrescriptionModal();
    e.target.reset();
    window.mostrarToast(`✅ Receta para ${petName} subida con código ${newRx.id}.`);
  } catch (error) {
    window.mostrarToast(error.message || "No se pudo subir la receta", "error");
  } finally {
    if (btn) { btn.disabled = false; btn.innerText = "Enviar Receta para Aprobación"; }
  }
}
