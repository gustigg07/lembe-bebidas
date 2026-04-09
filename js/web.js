// ===========================
//  LEMBE BEBIDAS — web.js
// ===========================

const WA_NUMBER = '393393372014'; // <-- Reemplazá con el número de WhatsApp del local (sin + ni espacios)

let cart = [];
let allProducts = [];
let currentCat = 'todos';

// ---- INIT ----
document.addEventListener('DOMContentLoaded', async () => {
  initSupabase();
  await loadProducts();
  initTabs();
  initHistoria();
  initNavSmooth();
  document.getElementById('whatsapp-footer').href = `https://wa.me/${WA_NUMBER}`;
});

// ---- PRODUCTOS ----
async function loadProducts(cat = 'todos') {
  const grid = document.getElementById('prodsGrid');
  grid.innerHTML = '<div class="loading-msg">Cargando productos...</div>';
  allProducts = await getProductos();
  renderProducts(cat);
}

function renderProducts(cat) {
  currentCat = cat;
  const grid = document.getElementById('prodsGrid');
  const list = cat === 'todos' ? allProducts : allProducts.filter(p => p.categoria === cat);

  if (!list.length) {
    grid.innerHTML = '<div class="loading-msg">No hay productos en esta categoría.</div>';
    return;
  }

  grid.innerHTML = list.map(p => {
    const sinStock = p.stock === 0;
    const precio = `$${Math.round(p.precio).toLocaleString('es-AR')}`;
    return `
      <div class="prod">
        <div class="prod-img">
          ${p.emoji || '🍷'}
          ${p.destacado ? '<span class="prod-badge">Destacado</span>' : ''}
          ${sinStock ? '<span class="prod-out">Sin stock</span>' : ''}
        </div>
        <div class="prod-body">
          <div class="prod-region">${p.origen || ''}</div>
          <div class="prod-name">${p.nombre}</div>
          <div class="prod-varietal">${p.descripcion || p.categoria}</div>
          <div class="prod-foot">
            <div class="prod-price">${precio}</div>
            <button class="prod-add" onclick="addToCart(${p.id})" ${sinStock ? 'disabled title="Sin stock"' : ''}>+</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ---- TABS ----
function initTabs() {
  document.getElementById('catTabs').addEventListener('click', e => {
    const btn = e.target.closest('.cat-tab');
    if (!btn) return;
    document.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderProducts(btn.dataset.cat);
  });
}

// ---- CARRITO ----
function addToCart(id) {
  const prod = allProducts.find(p => p.id === id);
  if (!prod || prod.stock === 0) return;
  const existing = cart.find(c => c.id === id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ ...prod, qty: 1 });
  }
  renderCarrito();
  // Abre el carrito la primera vez
  if (cart.length === 1) openCarrito();
}

function changeQty(id, delta) {
  const item = cart.find(c => c.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(c => c.id !== id);
  renderCarrito();
}

function renderCarrito() {
  const body = document.getElementById('carritoBody');
  const footer = document.getElementById('carritoFooter');

  // Forzamos conversión a número para evitar concatenación de texto
  const count = cart.reduce((a, c) => a + Number(c.qty), 0);
  const total = cart.reduce((a, c) => a + (Number(c.precio) * Number(c.qty)), 0);

  // Badge nav
  const badge = document.getElementById('cartCount');
  if (count > 0) {
    badge.textContent = count;
    badge.classList.add('visible');
  } else {
    badge.classList.remove('visible');
  }

  if (!cart.length) {
    body.innerHTML = '<div class="carrito-empty">Agregá productos para empezar</div>';
    footer.style.display = 'none';
    return;
  }

  body.innerHTML = cart.map(item => {
    // Cálculo de subtotal individual asegurando números
    const subtotal = Number(item.precio) * Number(item.qty);

    return `
    <div class="cart-item">
      <div class="ci-ico">${item.emoji || '🍷'}</div>
      <div class="ci-info">
        <div class="ci-name">${item.nombre}</div>
        <div class="ci-price">$${Math.round(Number(item.precio)).toLocaleString('es-AR')} c/u</div>
      </div>
      <div class="ci-controls">
        <button class="ci-btn" onclick="changeQty(${item.id},-1)">−</button>
        <span class="ci-qty">${item.qty}</span>
        <button class="ci-btn" onclick="changeQty(${item.id},1)">+</button>
      </div>
      <div class="ci-subtotal">$${Math.round(subtotal).toLocaleString('es-AR')}</div>
    </div>`;
  }).join('');

  document.getElementById('carritoTotal').textContent = `$${Math.round(total).toLocaleString('es-AR')}`;
  footer.style.display = 'block';
}

function toggleCarrito() {
  const carrito = document.getElementById('carrito');
  const overlay = document.getElementById('carritoOverlay');
  const isOpen = carrito.classList.contains('open');
  carrito.classList.toggle('open', !isOpen);
  overlay.classList.toggle('open', !isOpen);
}
function openCarrito() {
  document.getElementById('carrito').classList.add('open');
  document.getElementById('carritoOverlay').classList.add('open');
}

// ---- WHATSAPP ----
async function pedirWhatsApp() {
  if (!cart.length) return;
  const entrega = document.getElementById('entregaType').value;

  // Cálculo de total asegurando números
  const total = cart.reduce((a, c) => a + (Number(c.precio) * Number(c.qty)), 0);

  const lineas = cart.map(c => {
    const subtotalItem = Number(c.precio) * Number(c.qty);
    return `• ${c.nombre} x${c.qty} — $${Math.round(subtotalItem).toLocaleString('es-AR')}`;
  }).join('\n');

  const msg = `¡Hola Lembe! 🍷 Me gustaría hacer el siguiente pedido:\n\n${lineas}\n\n*Total: $${Math.round(total).toLocaleString('es-AR')}*\n📦 Entrega: ${entrega}\n\n¿Podés confirmarme disponibilidad?`;

  // Guardar pedido en Supabase con datos numéricos limpios
  await insertPedido({
    tipo: 'pedido',
    cliente: 'Cliente web',
    telefono: '',
    canal: 'Web / WhatsApp',
    items: cart.map(c => ({
      id: c.id,
      nombre: c.nombre,
      qty: Number(c.qty),
      precio: Number(c.precio)
    })),
    total: Math.round(total),
    entrega,
    estado: 'nuevo',
    notas: 'Pedido generado desde la web'
  });

  window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ---- HISTORIA INTERACTIVA ----
const eras = [
  {
    year: '3000 AC',
    title: 'El primer <em>vino</em> de la historia',
    text: 'Los primeros rastros de vino fermentado se remontan a las civilizaciones de Mesopotamia y Georgia, hace más de 5.000 años. El Tigris y el Éufrates regaban las primeras vides que los sumerios ya cultivaban con rituales sagrados.',
    fact: '<strong>Dato curioso:</strong> La palabra "vino" en sumerio era "gestin". Los griegos lo llamaron "oinos" y fue Baco, dios romano, quien lo convirtió en símbolo de la civilización mediterránea.'
  },
  {
    year: '1500',
    title: 'Las grandes <em>bodegas</em> europeas',
    text: 'En el siglo XV los monasterios benedictinos de Francia y España perfeccionaron el arte de la vinificación. Borgoña, Burdeos y La Rioja se consolidaron como los grandes terroirs del mundo. La barrica de roble nació en estas cuevas centenarias.',
    fact: '<strong>La barrica:</strong> Los galos descubrieron que almacenar vino en barricas de roble le daba sabores de vainilla, coco y especias. Esa tradición llega intacta hasta hoy en cada botella de reserva.'
  },
  {
    year: '1800',
    title: 'Argentina <em>descubre</em> la vid',
    text: 'Inmigrantes italianos y españoles cruzaron el Atlántico trayendo cepas en sus maletas. La altura de los Andes, con sus suelos áridos y noches frías, resultó ser el terroir ideal. Mendoza y San Juan se transformaron en tierra de vinos únicos.',
    fact: '<strong>El secreto de la altura:</strong> Cultivar uvas a 900–1.500 metros hace que maduren lentamente, concentrando azúcares y aromas. Ningún vino de llanura puede replicar eso.'
  },
  {
    year: '1980',
    title: 'La revolución del <em>Malbec</em>',
    text: 'Una generación de enólogos argentinos apostó por el Malbec —cepa olvidada en Francia— y lo transformó en el emblema del vino argentino. En 2000, los mejores sommeliers del mundo lo coronaban en concursos internacionales.',
    fact: '<strong>De Francia a la gloria:</strong> El Malbec llegó a Mendoza en 1853 de la mano del agrónomo francés Michel Pouget. En su tierra natal casi desapareció. En Argentina, encontró su mejor versión.'
  },
  {
    year: 'Hoy',
    title: '<em>Lembe</em> y cada botella que elegís',
    text: 'Lembe nació de la pasión por acercar vinos con historia real a cada mesa. Seleccionamos cada botella conociendo la bodega, el enólogo y el terroir. No vendemos vino: compartimos el trabajo de quienes lo hacen con amor.',
    fact: '<strong>Nuestra promesa:</strong> Cada producto en Lembe fue elegido después de conocer su origen. Si está en nuestra tienda, es porque lo probamos y creemos que merece estar en tu copa.'
  }
];

function initHistoria() {
  const content = document.getElementById('histContent');
  content.innerHTML = eras.map((e, i) => `
    <div class="hist-panel ${i === 0 ? 'active' : ''}" id="era-${i}">
      <div class="hp-title">${e.title}</div>
      <p class="hp-text">${e.text}</p>
      <div class="hp-fact"><div class="hp-fact-text">${e.fact}</div></div>
    </div>`).join('');

  document.querySelectorAll('.hist-era').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.era);
      document.querySelectorAll('.hist-era').forEach((e, i) => e.classList.toggle('active', i === idx));
      document.querySelectorAll('.hist-panel').forEach((p, i) => p.classList.toggle('active', i === idx));
    });
  });
}

// ---- NAV SUAVE ----
function initNavSmooth() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
    });
  });
}
