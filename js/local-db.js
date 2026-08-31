/**
 * local-db.js
 * ---------------------------------------------------------
 * Simula Firebase Authentication + Firestore + Cloudinary
 * usando SOLO localStorage. No hace ninguna llamada de red.
 *
 * Se carga ÚNICAMENTE cuando env.js detecta ES_LOCAL = true.
 * Sirve para que el administrador pueda probar y mostrar el
 * sistema completo (login, catálogo, categorías, contenido
 * editable, recetas, pedidos) sin tener todavía una cuenta
 * real de Firebase ni de Cloudinary, y sin arriesgar datos
 * reales.
 *
 * Credenciales de la cuenta de administrador de demostración:
 *   correo:      admin@petpharma.com
 *   contraseña:  admin123
 * ---------------------------------------------------------
 */
window.LocalDB = (function () {
  const K_PRODUCTOS = "pp_demo_productos";
  const K_CATEGORIAS = "pp_demo_categorias";
  const K_SESION = "pp_demo_sesion";
  const K_RECETAS = "pp_demo_recetas";
  const K_PEDIDOS = "pp_demo_pedidos";
  const K_CONTENIDO = "pp_demo_contenido";

  const ADMIN_DEMO = { email: "admin@petpharma.com", password: "admin123" };

  const CATEGORIAS_DEFAULT = [
    { id: "antiparasitarios", nombre: "Antiparasitarios", emoji: "🐜" },
    { id: "antibioticos", nombre: "Antibióticos", emoji: "💊" },
    { id: "antiinflamatorios", nombre: "Antiinflamatorios", emoji: "🩹" },
    { id: "articular_movilidad", nombre: "Articular & Movilidad", emoji: "🦴" },
    { id: "dermatologia", nombre: "Dermatología", emoji: "🧴" },
    { id: "cardiologia_renal", nombre: "Cardiología & Renal", emoji: "❤️" },
    { id: "vacunas", nombre: "Vacunas", emoji: "💉" },
    { id: "otros", nombre: "Otros", emoji: "🐾" },
  ];

  const CONTENIDO_DEFAULT = {
    nombreFarmacia: "PetPharma",
    tagline: "Farmacia Veterinaria Especializada",
    anuncioTexto: "❄️ Cadena de Frío Garantizada (2°C - 8°C) • Despachos express con neveras térmicas monitoreadas",
    anuncioTelefono: "📞 Urgencias: +1 (809) 555-VETS",
    heroTitulo: "Medicamentos Veterinarios Originales con Control de Dosis",
    heroDescripcion: "Antibióticos, analgésicos, antiparasitarios y fórmulas especiales para perros, gatos, equinos y aves.",
    heroBadge: "🛡️ Dispensación Certificada Bajo Regencia Farmacéutica",
    garantiaTitulo: "✨ Garantía PetPharma",
    garantiaLinea1: "✅ Fórmulas 100% de laboratorios reconocidos.",
    garantiaLinea2: "✅ Supervisión de regente farmacéutico colegiado.",
    garantiaLinea3: "✅ Empaques con aislante y geles de frío certificados.",
    footerNombre: "PetPharma Farmacia Veterinaria Certificada",
    footerTexto: "Dispensación oficial bajo normas de salud animal y cadena de frío.",
  };

  const DEFAULT_PRODUCTS = [
    {
      id: "prod-1",
      name: "Bravecto Antiparasitario 10-20kg",
      brand: "MSD Animal Health",
      activeSubstance: "Fluralaner",
      category: "antiparasitarios",
      species: ["perros"],
      price: 38.50,
      originalPrice: 45.00,
      requiresPrescription: true,
      requiresColdChain: false,
      stock: 24,
      image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80",
      dosage: "1 tableta masticable cada 12 semanas",
      indications: "Tratamiento de infestaciones por pulgas y garrapatas en perros.",
      description: "",
      doseMgPerKg: null,
      doseFrequency: "",
    },
    {
      id: "prod-2",
      name: "NexGard Spectra 3.5-7.5kg (3 Comprimidos)",
      brand: "Boehringer Ingelheim",
      activeSubstance: "Afoxolaner + Milbemicina Oxima",
      category: "antiparasitarios",
      species: ["perros"],
      price: 46.00,
      originalPrice: 52.00,
      requiresPrescription: true,
      requiresColdChain: false,
      stock: 18,
      image: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=600&q=80",
      dosage: "1 masticable mensual con o sin comida",
      indications: "Prevención contra pulgas, garrapatas y dirofilaria (gusano del corazón).",
      description: "",
      doseMgPerKg: null,
      doseFrequency: "",
    },
    {
      id: "prod-3",
      name: "Clavaseptin 500mg Antibiótico (10 Comprimidos)",
      brand: "Vetoquinol",
      activeSubstance: "Amoxicilina + Ácido Clavulánico",
      category: "antibioticos",
      species: ["perros", "gatos"],
      price: 29.80,
      originalPrice: 34.00,
      requiresPrescription: true,
      requiresColdChain: false,
      stock: 15,
      image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=600&q=80",
      dosage: "12.5 mg/kg cada 12 horas vía oral",
      indications: "Infecciones bacterianas respiratorias, urinarias y dermatológicas.",
      description: "",
      doseMgPerKg: 12.5,
      doseFrequency: "cada 12 horas",
    },
    {
      id: "prod-4",
      name: "Rimadyl 100mg Analgésico Antiinflamatorio",
      brand: "Zoetis",
      activeSubstance: "Carprofeno",
      category: "antiinflamatorios",
      species: ["perros"],
      price: 34.00,
      originalPrice: 39.00,
      requiresPrescription: true,
      requiresColdChain: false,
      stock: 20,
      image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=80",
      dosage: "4.4 mg/kg una vez al día con alimento",
      indications: "Alivio del dolor e inflamación asociados con osteoartritis y cirugías.",
      description: "",
      doseMgPerKg: 4.4,
      doseFrequency: "una vez al día",
    },
    {
      id: "prod-5",
      name: "Cosequin Advanced Condroprotector Articular",
      brand: "Nutramax Laboratories",
      activeSubstance: "Glucosamina + Condroitín Sulfato + MSM",
      category: "articular_movilidad",
      species: ["perros", "gatos", "equinos"],
      price: 49.90,
      originalPrice: 58.00,
      requiresPrescription: false,
      requiresColdChain: false,
      stock: 35,
      image: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=600&q=80",
      dosage: "1 a 2 comprimidos diarios según peso",
      indications: "Mantenimiento del cartílago articular y soporte de movilidad.",
      description: "",
      doseMgPerKg: null,
      doseFrequency: "",
    },
    {
      id: "prod-6",
      name: "Apoquel 16mg Antialérgico Dermatológico",
      brand: "Zoetis",
      activeSubstance: "Oclacitinib Maleato",
      category: "dermatologia",
      species: ["perros"],
      price: 68.00,
      originalPrice: 75.00,
      requiresPrescription: true,
      requiresColdChain: false,
      stock: 4,
      image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80",
      dosage: "0.4 a 0.6 mg/kg cada 12 o 24 horas",
      indications: "Control del prurito asociado a dermatitis alérgica y atópica.",
      description: "",
      doseMgPerKg: 0.5,
      doseFrequency: "cada 12-24 horas",
    },
    {
      id: "prod-7",
      name: "Vacuna Nobivac Antirrábica Líquida",
      brand: "MSD Animal Health",
      activeSubstance: "Virus Rábico Inactivado Cepa Pasteur",
      category: "vacunas",
      species: ["perros", "gatos", "equinos"],
      price: 22.50,
      originalPrice: 26.00,
      requiresPrescription: true,
      requiresColdChain: true,
      stock: 40,
      image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=600&q=80",
      dosage: "1 dosis subcutánea anual (Conservar entre 2°C y 8°C)",
      indications: "Inmunización activa frente a la rabia.",
      description: "",
      doseMgPerKg: null,
      doseFrequency: "",
    },
  ];

  const DEFAULT_PRESCRIPTIONS = [
    {
      id: "rx-101",
      petName: "Thor",
      petType: "perro",
      ownerName: "Carlos Mendoza",
      ownerPhone: "+1 (809) 555-1920",
      vetName: "Dr. Manuel Santos",
      vetLicense: "MED-VET-84920",
      prescribedMedicines: "Bravecto 20-40kg (1 tableta), Apoquel 16mg (30 comprimidos)",
      fileUrl: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80",
      status: "validada",
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
    {
      id: "rx-102",
      petName: "Luna",
      petType: "gato",
      ownerName: "Sofía Valenzuela",
      ownerPhone: "+1 (809) 555-3811",
      vetName: "Dra. Patricia Gómez",
      vetLicense: "MED-VET-41928",
      prescribedMedicines: "Clavaseptin 50mg / 14 días",
      fileUrl: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80",
      status: "pendiente",
      createdAt: new Date().toISOString(),
    },
  ];

  const DEFAULT_ORDERS = [];

  // ---------- Lectura / escritura ----------
  function leer(clave, porDefecto) {
    try {
      const crudo = localStorage.getItem(clave);
      return crudo ? JSON.parse(crudo) : porDefecto;
    } catch (e) {
      return porDefecto;
    }
  }
  function guardar(clave, valor) {
    localStorage.setItem(clave, JSON.stringify(valor));
  }

  function getProductosRaw() {
    let lista = leer(K_PRODUCTOS, null);
    if (!lista) {
      lista = DEFAULT_PRODUCTS;
      guardar(K_PRODUCTOS, lista);
    }
    return lista;
  }

  function retrasoFalso(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function leerArchivoComoBase64(archivo) {
    return new Promise((resolve, reject) => {
      if (!archivo) return resolve("");
      const lector = new FileReader();
      lector.onload = () => resolve(lector.result);
      lector.onerror = () => reject(new Error("No se pudo leer la imagen"));
      lector.readAsDataURL(archivo);
    });
  }

  return {
    // ---------- Autenticación (solo administrador) ----------
    async login(email, password) {
      await retrasoFalso(350);
      if (email.trim().toLowerCase() === ADMIN_DEMO.email && password === ADMIN_DEMO.password) {
        const user = { email: ADMIN_DEMO.email, uid: "demo-admin" };
        guardar(K_SESION, user);
        return user;
      }
      throw new Error("Correo o contraseña incorrectos (demo: admin@petpharma.com / admin123)");
    },
    async logout() {
      await retrasoFalso(150);
      localStorage.removeItem(K_SESION);
    },
    getCurrentUser() {
      return leer(K_SESION, null);
    },
    onAuthChange(callback) {
      callback(this.getCurrentUser());
      return () => {};
    },

    // ---------- Productos ----------
    async getProductos() {
      await retrasoFalso(200);
      return getProductosRaw();
    },

    async agregarProducto(datos, archivoImagen) {
      await retrasoFalso(400);
      const lista = getProductosRaw();
      let imagenUrl = datos.image || "";
      if (archivoImagen) imagenUrl = await leerArchivoComoBase64(archivoImagen);
      const nuevo = {
        id: "prod-" + Date.now(),
        name: datos.name,
        brand: datos.brand || "",
        activeSubstance: datos.activeSubstance || "",
        category: datos.category,
        species: datos.species || ["perros", "gatos"],
        price: Number(datos.price) || 0,
        originalPrice: datos.originalPrice ? Number(datos.originalPrice) : null,
        requiresPrescription: !!datos.requiresPrescription,
        requiresColdChain: !!datos.requiresColdChain,
        stock: Number(datos.stock) || 0,
        image: imagenUrl,
        dosage: datos.dosage || "Según indicación de médico veterinario colegiado",
        indications: datos.indications || "",
        description: datos.description || "",
        doseMgPerKg: datos.doseMgPerKg ? Number(datos.doseMgPerKg) : null,
        doseFrequency: datos.doseFrequency || "",
      };
      lista.unshift(nuevo);
      guardar(K_PRODUCTOS, lista);
      return nuevo;
    },

    async actualizarProducto(id, datos, archivoImagen) {
      await retrasoFalso(400);
      const lista = getProductosRaw();
      const idx = lista.findIndex((p) => p.id === id);
      if (idx === -1) throw new Error("Medicamento no encontrado");
      let imagenUrl = lista[idx].image;
      if (archivoImagen) imagenUrl = await leerArchivoComoBase64(archivoImagen);
      else if (datos.image) imagenUrl = datos.image;
      lista[idx] = {
        ...lista[idx],
        name: datos.name,
        brand: datos.brand || "",
        activeSubstance: datos.activeSubstance || "",
        category: datos.category,
        species: datos.species && datos.species.length ? datos.species : lista[idx].species,
        price: Number(datos.price) || 0,
        originalPrice: datos.originalPrice ? Number(datos.originalPrice) : null,
        requiresPrescription: !!datos.requiresPrescription,
        requiresColdChain: !!datos.requiresColdChain,
        stock: Number(datos.stock) || 0,
        image: imagenUrl,
        dosage: datos.dosage || lista[idx].dosage,
        indications: datos.indications || "",
        description: datos.description || "",
        doseMgPerKg: datos.doseMgPerKg ? Number(datos.doseMgPerKg) : null,
        doseFrequency: datos.doseFrequency || "",
      };
      guardar(K_PRODUCTOS, lista);
      return lista[idx];
    },

    async eliminarProducto(id) {
      await retrasoFalso(250);
      const lista = getProductosRaw().filter((p) => p.id !== id);
      guardar(K_PRODUCTOS, lista);
    },

    // Descuenta stock real al confirmarse un pedido (evita vender de más)
    async descontarStock(items) {
      const lista = getProductosRaw();
      items.forEach((item) => {
        const p = lista.find((x) => x.id === item.id);
        if (p) p.stock = Math.max(0, (p.stock || 0) - item.quantity);
      });
      guardar(K_PRODUCTOS, lista);
    },

    // ---------- Categorías ----------
    async getCategorias() {
      await retrasoFalso(120);
      let lista = leer(K_CATEGORIAS, null);
      if (!lista) {
        lista = CATEGORIAS_DEFAULT.slice();
        guardar(K_CATEGORIAS, lista);
      }
      return lista;
    },

    async agregarCategoria(datos) {
      await retrasoFalso(250);
      const nombre = (datos.nombre || "").trim();
      if (!nombre) throw new Error("El nombre de la categoría no puede estar vacío");
      const lista = leer(K_CATEGORIAS, null) || CATEGORIAS_DEFAULT.slice();
      const id = window.generarSlug(nombre);
      if (lista.some((c) => c.id === id)) throw new Error("Ya existe una categoría con ese nombre");
      const nueva = { id, nombre, emoji: datos.emoji || "🐾" };
      lista.push(nueva);
      guardar(K_CATEGORIAS, lista);
      return nueva;
    },

    async eliminarCategoria(id) {
      await retrasoFalso(200);
      const lista = (leer(K_CATEGORIAS, null) || CATEGORIAS_DEFAULT.slice()).filter((c) => c.id !== id);
      guardar(K_CATEGORIAS, lista);
    },

    // ---------- Contenido editable del sitio ----------
    async getContenido() {
      await retrasoFalso(100);
      const guardado = leer(K_CONTENIDO, null);
      return { ...CONTENIDO_DEFAULT, ...(guardado || {}) };
    },

    async guardarContenido(datos) {
      await retrasoFalso(300);
      const actual = leer(K_CONTENIDO, null) || {};
      const nuevo = { ...CONTENIDO_DEFAULT, ...actual, ...datos };
      guardar(K_CONTENIDO, nuevo);
      return nuevo;
    },

    // ---------- Recetas Rx ----------
    async getRecetas() {
      await retrasoFalso(200);
      let lista = leer(K_RECETAS, null);
      if (!lista) {
        lista = DEFAULT_PRESCRIPTIONS;
        guardar(K_RECETAS, lista);
      }
      return lista;
    },

    async subirReceta(datos, archivoImagen) {
      await retrasoFalso(400);
      const lista = leer(K_RECETAS, null) || [];
      const fileUrl = archivoImagen ? await leerArchivoComoBase64(archivoImagen) : "";
      const nueva = {
        id: "rx-" + Math.floor(1000 + Math.random() * 9000),
        ...datos,
        fileUrl,
        status: "pendiente",
        createdAt: new Date().toISOString(),
      };
      lista.unshift(nueva);
      guardar(K_RECETAS, lista);
      return nueva;
    },

    async actualizarEstadoReceta(id, status) {
      await retrasoFalso(200);
      const lista = leer(K_RECETAS, null) || [];
      const rx = lista.find((r) => r.id === id);
      if (rx) rx.status = status;
      guardar(K_RECETAS, lista);
      return rx;
    },

    // ---------- Pedidos ----------
    async getPedidos() {
      await retrasoFalso(200);
      return leer(K_PEDIDOS, DEFAULT_ORDERS);
    },

    async crearPedido(datos) {
      await retrasoFalso(400);
      const lista = leer(K_PEDIDOS, DEFAULT_ORDERS) || [];
      // El cruce "¿este pedido ya tiene su receta subida?" se hace del
      // lado del admin (ver renderAdminOrders en admin.js), no aquí, para
      // que el comportamiento sea idéntico al modo Firebase real (donde
      // un cliente sin sesión no puede leer la colección de recetas).
      const nuevo = {
        id: "ord-" + Date.now(),
        orderNumber: "PED-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000),
        createdAt: new Date().toISOString(),
        status: "recibido",
        ...datos,
      };
      lista.unshift(nuevo);
      guardar(K_PEDIDOS, lista);
      await this.descontarStock(datos.items || []);
      return nuevo;
    },

    async actualizarEstadoPedido(id, status) {
      await retrasoFalso(200);
      const lista = leer(K_PEDIDOS, DEFAULT_ORDERS) || [];
      const ord = lista.find((o) => o.id === id);
      if (ord) ord.status = status;
      guardar(K_PEDIDOS, lista);
      return ord;
    },

    async actualizarTemperaturaPedido(id, temp) {
      await retrasoFalso(150);
      const lista = leer(K_PEDIDOS, DEFAULT_ORDERS) || [];
      const ord = lista.find((o) => o.id === id);
      if (ord) ord.temperatureVerified = temp;
      guardar(K_PEDIDOS, lista);
      return ord;
    },

    // Permite reiniciar la demo a su estado inicial desde la consola:
    // LocalDB.borrarDatosDeDemo()
    borrarDatosDeDemo() {
      [K_PRODUCTOS, K_CATEGORIAS, K_SESION, K_RECETAS, K_PEDIDOS, K_CONTENIDO].forEach((k) =>
        localStorage.removeItem(k)
      );
      console.log("Datos de demostración borrados. Recarga la página.");
    },
  };
})();
