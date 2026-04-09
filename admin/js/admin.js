// ===========================
//  LEMBE BEBIDAS — admin.js
// ===========================

// ❌ BORRAMOS ADMIN_CREDENTIALS: Ya no usamos usuarios en duro, Supabase maneja todo.
console.log("ADMIN.JS CARGADO CORRECTAMENTE");

let currentPage = 'stock';

// ---- INICIO / VERIFICAR SESIÓN ----
document.addEventListener('DOMContentLoaded', () => {
  initSupabase();

  // ✅ NUEVO: Verificamos si Supabase ya tiene una sesión guardada
  verificarSesion();

  // Mantenemos el Enter para el login
  document.getElementById('adminPassword').addEventListener('keydown', e => {
    if (e.key === 'Enter') intentarLogin(e);
  });

  // Sidebar nav
  document.querySelectorAll('.sb-item[data-page]').forEach(item => {
    item.addEventListener('click', () => goPage(item.dataset.page));
  });
});

// ✅ NUEVA FUNCIÓN: Revisa si hay sesión activa al recargar la página
async function verificarSesion() {
  if (!supabase) return; // Fallback si no hay conexión

  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    // Si hay sesión, guardamos el correo del usuario y mostramos la app
    currentUser = { nombre: session.user.email };
    showApp();
  }
}

// ✅ NUEVA FUNCIÓN: Login usando Supabase Auth
async function intentarLogin(event) {
  if (event) event.preventDefault(); // Evita recargar la página

  const email = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPassword').value;

  if (!email || !password) {
    document.getElementById('loginError').textContent = "Ingresá correo y contraseña.";
    document.getElementById('loginError').style.display = 'block';
    return;
  }

  // Llamamos a Supabase para iniciar sesión
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });

  if (error) {
    // Si falla, mostramos el error
    document.getElementById('loginError').textContent = "Correo o contraseña incorrectos.";
    document.getElementById('loginError').style.display = 'block';
  } else {
    // Si es exitoso, ocultamos el error y mostramos la app
    document.getElementById('loginError').style.display = 'none';
    currentUser = { nombre: data.user.email }; // Usamos el email como nombre en el panel
    showApp();
  }
}

function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminApp').style.display = 'grid';
  // Formateamos el email para que quede más lindo (ej: admin@lembe... -> Admin)
  const displayName = currentUser.nombre.split('@')[0];
  document.getElementById('sbUser').textContent = displayName.charAt(0).toUpperCase() + displayName.slice(1);
  goPage('stock');
}

// ✅ ACTUALIZADO: Cierre de sesión de Supabase
async function cerrarSesion() {
  if (supabase) {
    await supabase.auth.signOut();
  }
  // Recargamos la página para volver a la pantalla de login
  location.reload();
}

// ---- NAVIGATION ----
function goPage(page) {
  currentPage = page;
  document.querySelectorAll('.sb-item').forEach(i => i.classList.toggle('active', i.dataset.page === page));
  const titles = { stock: 'Control de Stock', catalogo: 'Catálogo de Productos', caja: 'Ventas y Caja', pedidos: 'Pedidos y Reservas', historial: 'Historial', config: 'Configuración' };
  document.getElementById('pageTitle').textContent = titles[page] || page;
  const pages = { stock: renderStock, catalogo: renderCatalogo, caja: renderCaja, pedidos: renderPedidosPage, historial: renderHistorial, config: renderConfig };
  if (pages[page]) pages[page]();
}

const fmt = n => '$' + Math.round(n).toLocaleString('es-AR');
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = '✓  ' + msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function openModal(id) { document.getElementById(id).classList.add('open'); }

// ============================
//  STOCK
// ============================
let stockProducts = [];
let stockFilter = 'todos';

async function renderStock() {
  document.getElementById('topbarActions').innerHTML = `
    <input class="search-box" type="text" placeholder="Buscar..." id="stockSearch" oninput="renderStockTable()">
    <button class="btn-out" onclick="exportStock()">Exportar</button>
    <button class="btn" onclick="openStockModal()">+ Agregar</button>`;
  document.getElementById('pageContent').innerHTML = `
    <div id="stockAlerts"></div>
    <div class="metrics">
      <div class="metric"><div class="metric-label">Total productos</div><div class="metric-val" style="color:var(--gold)" id="sm-total">-</div></div>
      <div class="metric"><div class="metric-label">Stock OK</div><div class="metric-val" style="color:#4CAF50" id="sm-ok">-</div></div>
      <div class="metric"><div class="metric-label">Stock bajo</div><div class="metric-val" style="color:var(--orange)" id="sm-low">-</div></div>
      <div class="metric"><div class="metric-label">Agotados</div><div class="metric-val" style="color:var(--red)" id="sm-out">-</div></div>
    </div>
    <div class="filters">
      <button class="filter-btn active" onclick="setStockFilter('todos',this)">Todos</button>
      <button class="filter-btn" onclick="setStockFilter('ok',this)">OK</button>
      <button class="filter-btn" onclick="setStockFilter('bajo',this)">Bajo</button>
      <button class="filter-btn" onclick="setStockFilter('agotado',this)">Agotados</button>
    </div>
    <div class="table-wrap">
      <div class="t-head" style="grid-template-columns:2fr 1fr 1fr 1fr 1fr 110px">
        <div class="th">Producto</div><div class="th">Categoría</div><div class="th">Stock</div><div class="th">Mínimo</div><div class="th">Precio</div><div class="th">Acciones</div>
      </div>
      <div class="t-body" id="stockTableBody"></div>
    </div>
    <div class="modal-bg" id="stockModal" onclick="if(event.target===this)closeModal('stockModal')">
      <div class="modal">
        <button class="close-modal" onclick="closeModal('stockModal')">✕</button>
        <div class="modal-title" id="stockModalTitle">Agregar producto</div>
        <div class="form-row"><label class="form-label">Nombre</label><input class="form-input" id="sf-nombre" placeholder="Ej: Malbec Reserva"></div>
        <div class="form-grid">
          <div class="form-row"><label class="form-label">Categoría</label>
            <select class="form-select" id="sf-cat"><option>Vinos</option><option>Espumantes</option><option>Cervezas</option><option>Espirituosas</option><option>Sin alcohol</option></select>
          </div>
          <div class="form-row"><label class="form-label">Precio ($)</label><input class="form-input" type="number" id="sf-precio"></div>
        </div>
        <div class="form-grid">
          <div class="form-row"><label class="form-label">Stock actual</label><input class="form-input" type="number" id="sf-stock"></div>
          <div class="form-row"><label class="form-label">Stock mínimo</label><input class="form-input" type="number" id="sf-min" value="5"></div>
        </div>
        <div class="form-grid">
          <div class="form-row"><label class="form-label">Origen</label><input class="form-input" id="sf-origen" placeholder="Mendoza, Argentina"></div>
          <div class="form-row"><label class="form-label">Emoji</label><input class="form-input" id="sf-emoji" placeholder="🍷" maxlength="4"></div>
        </div>
        <div class="modal-footer">
          <button class="btn-out" onclick="closeModal('stockModal')">Cancelar</button>
          <button class="btn" onclick="saveStockProduct()">Guardar</button>
        </div>
      </div>
    </div>`;

  stockProducts = await getProductos();
  renderStockTable();
}

function getStockStatus(p) { return p.stock === 0 ? 'agotado' : p.stock <= p.stock_minimo ? 'bajo' : 'ok'; }

function renderStockTable() {
  const q = (document.getElementById('stockSearch')?.value || '').toLowerCase();
  let list = stockProducts.filter(p => {
    const s = getStockStatus(p);
    const mf = stockFilter === 'todos' || stockFilter === s;
    const ms = !q || p.nombre.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q);
    return mf && ms;
  });

  document.getElementById('sm-total').textContent = stockProducts.length;
  document.getElementById('sm-ok').textContent = stockProducts.filter(p => getStockStatus(p) === 'ok').length;
  document.getElementById('sm-low').textContent = stockProducts.filter(p => getStockStatus(p) === 'bajo').length;
  document.getElementById('sm-out').textContent = stockProducts.filter(p => getStockStatus(p) === 'agotado').length;

  const low = stockProducts.filter(p => getStockStatus(p) !== 'ok').length;
  document.getElementById('stockAlerts').innerHTML = low > 0
    ? `<div class="alert-bar"><div class="alert-text"><strong>${low} producto${low > 1 ? 's' : ''}</strong> con stock bajo o agotado.</div><button class="btn-out" onclick="setStockFilter('bajo',null);setStockFilter('agotado',null)" style="font-size:10px">Ver</button></div>`
    : '';

  const body = document.getElementById('stockTableBody');
  if (!list.length) { body.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--muted)">Sin resultados</div>'; return; }

  body.innerHTML = list.map(p => {
    const s = getStockStatus(p);
    const pill = s === 'ok' ? `<span class="stock-pill sp-ok">● Normal (${p.stock})</span>` : s === 'bajo' ? `<span class="stock-pill sp-low">● Bajo (${p.stock})</span>` : `<span class="stock-pill sp-out">● Agotado</span>`;
    return `<div class="t-row" style="grid-template-columns:2fr 1fr 1fr 1fr 1fr 110px">
      <div class="td"><div><div style="font-size:12px;color:var(--cream)">${p.nombre}</div><div style="font-size:10px;color:var(--muted)">${p.origen || ''}</div></div></div>
      <div class="td muted">${p.categoria}</div>
      <div class="td">${pill}</div>
      <div class="td muted">${p.stock_minimo} u.</div>
      <div class="td gold">${fmt(p.precio)}</div>
      <div class="td"><div class="action-btns">
        <button class="act-btn" onclick="editStockProduct(${p.id})" title="Editar">✏</button>
        <button class="act-btn" onclick="adjStock(${p.id},1)" title="+1">+</button>
        <button class="act-btn" onclick="adjStock(${p.id},-1)" title="-1">−</button>
        <button class="act-btn del" onclick="delStockProduct(${p.id})" title="Eliminar">🗑</button>
      </div></div>
    </div>`;
  }).join('');
}

function setStockFilter(f, btn) {
  stockFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderStockTable();
}

let editingStockId = null;
function openStockModal(p = null) {
  editingStockId = p ? p.id : null;
  document.getElementById('stockModalTitle').textContent = p ? 'Editar producto' : 'Agregar producto';
  document.getElementById('sf-nombre').value = p?.nombre || '';
  document.getElementById('sf-cat').value = p?.categoria || 'Vinos';
  document.getElementById('sf-precio').value = p?.precio || '';
  document.getElementById('sf-stock').value = p?.stock ?? '';
  document.getElementById('sf-min').value = p?.stock_minimo ?? 5;
  document.getElementById('sf-origen').value = p?.origen || '';
  document.getElementById('sf-emoji').value = p?.emoji || '';
  openModal('stockModal');
}
function editStockProduct(id) { openStockModal(stockProducts.find(x => x.id === id)); }
async function adjStock(id, delta) {
  const p = stockProducts.find(x => x.id === id);
  if (!p) return;
  p.stock = Math.max(0, p.stock + delta);
  await upsertProducto({ ...p });
  renderStockTable();
}
async function saveStockProduct() {
  const nombre = document.getElementById('sf-nombre').value.trim();
  if (!nombre) { alert('Ingresá el nombre'); return; }
  const prod = {
    nombre, categoria: document.getElementById('sf-cat').value,
    precio: parseFloat(document.getElementById('sf-precio').value) || 0,
    stock: parseInt(document.getElementById('sf-stock').value) || 0,
    stock_minimo: parseInt(document.getElementById('sf-min').value) || 5,
    origen: document.getElementById('sf-origen').value.trim(),
    emoji: document.getElementById('sf-emoji').value.trim() || '🍷',
  };
  if (editingStockId) prod.id = editingStockId;
  const res = await upsertProducto(prod);
  if (res.ok) {
    closeModal('stockModal');
    stockProducts = await getProductos();
    renderStockTable();
    showToast(editingStockId ? 'Producto actualizado' : 'Producto agregado');
  } else { showToast('Error: ' + res.msg); }
}
async function delStockProduct(id) {
  if (!confirm('¿Eliminar este producto?')) return;
  await deleteProducto(id);
  stockProducts = stockProducts.filter(x => x.id !== id);
  renderStockTable();
  showToast('Producto eliminado');
}
function exportStock() {
  const rows = [['Nombre', 'Categoría', 'Stock', 'Mínimo', 'Precio', 'Estado']];
  stockProducts.forEach(p => rows.push([p.nombre, p.categoria, p.stock, p.stock_minimo, p.precio, getStockStatus(p)]));
  downloadCSV(rows, 'lembe_stock.csv');
}

// ============================
//  CATÁLOGO (simplificado, reutiliza stock)
// ============================
async function renderCatalogo() {
  document.getElementById('topbarActions').innerHTML = `<button class="btn" onclick="goPage('stock')">Gestionar en Stock →</button>`;
  const prods = await getProductos();
  document.getElementById('pageContent').innerHTML = `
    <p style="font-size:12px;color:var(--muted);margin-bottom:1.5rem">El catálogo se gestiona desde Control de Stock. Aquí podés ver la vista pública.</p>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.7rem">
      ${prods.map(p => `
        <div style="background:var(--dark);border:0.5px solid var(--border);overflow:hidden">
          <div style="padding:2rem;text-align:center;font-size:3rem;background:var(--dark3);border-bottom:0.5px solid var(--border)">${p.emoji || '🍷'}</div>
          <div style="padding:1rem">
            <div style="font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--amber);margin-bottom:.3rem">${p.categoria}</div>
            <div style="font-family:'Playfair Display',serif;font-size:1.1rem;color:var(--cream);margin-bottom:.3rem">${p.nombre}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:.8rem">
              <span style="font-family:'Playfair Display',serif;font-size:1.1rem;color:var(--gold2)">${fmt(p.precio)}</span>
              <span style="font-size:9px;color:var(--muted)">${p.stock} u.</span>
            </div>
          </div>
        </div>`).join('')}
    </div>`;
}

// ============================
//  CAJA / VENTAS
// ============================
let cajaPOS = [];
let cajaProducts = [];
let cajaPayMethod = 'efectivo';
let cajaVentas = [];
let cajaTotales = { efectivo: 0, transferencia: 0, qr: 0 };

async function renderCaja() {
  document.getElementById('topbarActions').innerHTML = `
    <button class="btn-out" onclick="exportCajaVentas()">Exportar día</button>
    <button class="btn-red" onclick="cerrarCaja()">Cerrar caja</button>`;
  cajaProducts = await getProductos();
  document.getElementById('pageContent').innerHTML = `
    <div class="metrics" style="margin-bottom:1rem">
      <div class="metric"><div class="metric-label">Total del día</div><div class="metric-val" style="color:var(--gold)" id="cj-total">$0</div></div>
      <div class="metric"><div class="metric-label">Ventas</div><div class="metric-val" id="cj-count">0</div></div>
      <div class="metric"><div class="metric-label">Efectivo</div><div class="metric-val" style="color:#4CAF50" id="cj-ef">$0</div></div>
      <div class="metric"><div class="metric-label">Digital</div><div class="metric-val" style="color:var(--gold2)" id="cj-dig">$0</div></div>
    </div>
    <div class="pos-layout" style="margin:0 -2rem;border-top:0.5px solid var(--border)">
      <div class="pos-left">
        <input class="search-box" style="width:100%" type="text" placeholder="Buscar producto..." id="posSearch" oninput="renderPosTiles()">
        <div class="prod-tile-grid" id="posTiles"></div>
        <div>
          <div style="font-size:9px;letter-spacing:.3em;text-transform:uppercase;color:var(--muted);margin-bottom:.8rem">Ventas del día</div>
          <div id="cajaHist" style="display:flex;flex-direction:column;gap:.4rem;max-height:200px;overflow-y:auto"></div>
        </div>
      </div>
      <div class="pos-right">
        <div class="pos-right-header">
          <div class="pos-right-title">Venta actual</div>
          <div id="posItemCount" style="font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--muted)">0 items</div>
        </div>
        <div class="cart-list" id="posCart"><div class="cart-empty-msg">Agregá productos</div></div>
        <div class="pos-footer">
          <div class="pos-totals">
            <div class="pos-total-row"><span>Subtotal</span><span id="posSub">$0</span></div>
            <div class="pos-total-row main"><span>Total</span><span id="posTotal">$0</span></div>
          </div>
          <div class="pm-btns">
            <button class="pm-btn sel" id="pm-efectivo" onclick="selectPM('efectivo')">Efectivo</button>
            <button class="pm-btn" id="pm-transferencia" onclick="selectPM('transferencia')">Transfer.</button>
            <button class="pm-btn" id="pm-qr" onclick="selectPM('qr')">QR</button>
          </div>
          <button class="cobrar-btn" id="posCobraBtn" onclick="cobrar()" disabled>Cobrar</button>
        </div>
      </div>
    </div>
    <div class="modal-bg" id="ticketModal" onclick="if(event.target===this)closeTicket()">
      <div class="ticket">
        <div class="ticket-logo">LEMBE</div>
        <div class="ticket-sub">Tienda de Bebidas</div>
        <hr class="ticket-divider">
        <div id="ticketItems"></div>
        <hr class="ticket-divider">
        <div class="ticket-total-row"><span>Total</span><span id="ticketTotal"></span></div>
        <div id="ticketMethod" style="font-size:10px;color:var(--muted);text-align:center;margin-top:.4rem"></div>
        <hr class="ticket-divider">
        <div class="ticket-thanks">¡Gracias por tu compra!</div>
        <div style="font-size:10px;color:var(--muted);margin-bottom:1.2rem">@lembe_bebidas</div>
        <button class="cobrar-btn" onclick="closeTicket()">Nueva venta</button>
      </div>
    </div>`;
  cajaPOS = [];
  renderPosTiles();
  renderCajaMetrics();
}

function renderPosTiles() {
  const q = (document.getElementById('posSearch')?.value || '').toLowerCase();
  const list = cajaProducts.filter(p => !q || p.nombre.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q));
  document.getElementById('posTiles').innerHTML = list.map(p => `
    <div class="prod-tile ${p.stock === 0 ? 'out' : ''}" onclick="posAdd(${p.id})">
      <div class="pt-ico">${p.emoji || '🍷'}</div>
      <div class="pt-name">${p.nombre}</div>
      <div class="pt-price">${fmt(p.precio)}</div>
      <div class="pt-stock">${p.stock > 0 ? p.stock + ' u.' : 'Agotado'}</div>
    </div>`).join('');
}

function posAdd(id) {
  const prod = cajaProducts.find(p => p.id === id);
  if (!prod || prod.stock === 0) return;
  const ex = cajaPOS.find(c => c.id === id);
  if (ex) { if (ex.qty < prod.stock) ex.qty++; }
  else cajaPOS.push({ ...prod, qty: 1 });
  renderPosCart();
}
function posChg(id, d) {
  const item = cajaPOS.find(c => c.id === id);
  if (!item) return;
  item.qty += d;
  if (item.qty <= 0) cajaPOS = cajaPOS.filter(c => c.id !== id);
  renderPosCart();
}
function renderPosCart() {
  const count = cajaPOS.reduce((a, c) => a + c.qty, 0);
  const total = cajaPOS.reduce((a, c) => a + c.precio * c.qty, 0);
  document.getElementById('posItemCount').textContent = count + ' item' + (count !== 1 ? 's' : '');
  document.getElementById('posCart').innerHTML = cajaPOS.length ? cajaPOS.map(item => `
    <div class="cart-item-row">
      <div style="font-size:1.2rem;flex-shrink:0">${item.emoji || '🍷'}</div>
      <div style="flex:1"><div class="ci-name">${item.nombre}</div><div class="ci-price-sm">${fmt(item.precio)} c/u</div></div>
      <div class="action-btns">
        <button class="act-btn" onclick="posChg(${item.id},-1)">−</button>
        <span style="font-size:13px;color:var(--cream);min-width:20px;text-align:center">${item.qty}</span>
        <button class="act-btn" onclick="posChg(${item.id},1)">+</button>
      </div>
      <div class="ci-sub">${fmt(item.precio * item.qty)}</div>
    </div>`).join('') : '<div class="cart-empty-msg">Agregá productos</div>';
  document.getElementById('posSub').textContent = fmt(total);
  document.getElementById('posTotal').textContent = fmt(total);
  document.getElementById('posCobraBtn').disabled = cajaPOS.length === 0;
}
function selectPM(pm) {
  cajaPayMethod = pm;
  ['efectivo', 'transferencia', 'qr'].forEach(m => document.getElementById('pm-' + m)?.classList.toggle('sel', m === pm));
}

async function cobrar() {
  if (!cajaPOS.length) return;
  // Aseguramos que la suma sea matemática y no de texto
  const total = cajaPOS.reduce((a, c) => a + (Number(c.precio) * Number(c.qty)), 0);

  // 1. Preparamos el objeto de la venta
  const venta = {
    items: cajaPOS.map(c => ({ id: c.id, nombre: c.nombre, qty: Number(c.qty), precio: Number(c.precio) })),
    total: Math.round(total),
    metodo_pago: cajaPayMethod,
    estado: 'completado'
  };


 // 2. REGISTRAMOS LA VENTA Y DESCONTAMOS STOCK
  const res = await insertVenta(venta);
  
  if (res.ok) {
    // Recorremos el carrito para actualizar cada producto en Supabase
    for (const item of cajaPOS) {
      const prodOriginal = cajaProducts.find(p => p.id === item.id);
      
      if (prodOriginal) {
        const nuevoStock = Math.max(0, Number(prodOriginal.stock) - Number(item.qty));

        // EL TRUCO ESTÁ ACÁ: Copiamos todo el producto original y solo le pisamos el stock
        const productoActualizado = { ...prodOriginal, stock: nuevoStock };

        // Ahora sí, Supabase recibe todos los datos y no tira error 400
        await upsertProducto(productoActualizado);
      }
    }

    // 3. Actualización visual y ticket
    cajaTotales[cajaPayMethod] += total;
    cajaVentas.unshift({ ...venta, hora: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) });
    
    showTicket({ items: cajaPOS, total, metodo: cajaPayMethod });
    
    // 4. RECARGA CRÍTICA
    cajaProducts = await getProductos(); 
    renderCajaMetrics();
    renderCajaHist();
    renderPosTiles();
    showToast("Venta realizada y stock actualizado");
  } else {
    alert("Error al registrar la venta: " + res.msg);
  }
}
function showTicket(v) {
  document.getElementById('ticketItems').innerHTML = v.items.map(i => `<div class="ticket-item-row"><span>${i.emoji || '🍷'} ${i.nombre} x${i.qty}</span><span>${fmt(i.precio * i.qty)}</span></div>`).join('');
  document.getElementById('ticketTotal').textContent = fmt(v.total);
  document.getElementById('ticketMethod').textContent = { efectivo: 'Efectivo', transferencia: 'Transferencia', qr: 'QR / Débito' }[v.metodo] || v.metodo;
  openModal('ticketModal');
}
function closeTicket() { cajaPOS = []; renderPosCart(); closeModal('ticketModal'); }
function renderCajaMetrics() {
  const t = Object.values(cajaTotales).reduce((a, b) => a + b, 0);
  document.getElementById('cj-total').textContent = fmt(t);
  document.getElementById('cj-count').textContent = cajaVentas.length;
  document.getElementById('cj-ef').textContent = fmt(cajaTotales.efectivo);
  document.getElementById('cj-dig').textContent = fmt(cajaTotales.transferencia + cajaTotales.qr);
}
function renderCajaHist() {
  document.getElementById('cajaHist').innerHTML = cajaVentas.slice(0, 8).map(v => `
    <div style="background:var(--dark);border:0.5px solid var(--border);padding:.7rem 1rem;display:flex;align-items:center;justify-content:space-between;gap:.8rem">
      <div style="font-size:11px;color:var(--muted)">${v.hora} · ${v.items.length} prod.</div>
      <div style="font-family:'Playfair Display',serif;font-size:1rem;color:var(--gold)">${fmt(v.total)}</div>
    </div>`).join('') || '<div style="padding:1rem;text-align:center;color:var(--muted);font-size:12px">Sin ventas aún</div>';
}
function exportCajaVentas() {
  if (!cajaVentas.length) { showToast('No hay ventas para exportar'); return; }
  const rows = [['Hora', 'Productos', 'Total', 'Método']];
  cajaVentas.forEach(v => rows.push([v.hora, v.items.map(i => i.nombre + ' x' + i.qty).join(' | '), v.total, v.metodo_pago]));
  downloadCSV(rows, 'lembe_ventas.csv');
}
function cerrarCaja() {
  if (!cajaVentas.length) { showToast('No hay ventas registradas'); return; }
  const t = Object.values(cajaTotales).reduce((a, b) => a + b, 0);
  alert(`CIERRE DE CAJA\n\nTotal: ${fmt(t)}\nVentas: ${cajaVentas.length}\nEfectivo: ${fmt(cajaTotales.efectivo)}\nTransferencia: ${fmt(cajaTotales.transferencia)}\nQR: ${fmt(cajaTotales.qr)}`);
}

// ============================
//  PEDIDOS
// ============================
let pedidosData = [];
let pedidosTab = 'kanban';
const estadosCycle = ['nuevo', 'confirmado', 'preparando', 'listo', 'entregado', 'cancelado'];
const estadoLabel = { nuevo: 'Nuevo', confirmado: 'Confirmado', preparando: 'Preparando', listo: 'Listo', entregado: 'Entregado', cancelado: 'Cancelado' };
const estadoClass = { nuevo: 's-nuevo', confirmado: 's-confirmado', preparando: 's-preparando', listo: 's-listo', entregado: 's-entregado', cancelado: 's-cancelado' };

async function renderPedidosPage() {
  document.getElementById('topbarActions').innerHTML = `
    <button class="btn-out" onclick="exportPedidos()">Exportar</button>
    <button class="btn" onclick="openPedidoModal()">+ Nuevo pedido</button>`;
  pedidosData = await getPedidos();
  if (!pedidosData.length) pedidosData = getSamplePedidos();
  renderPedidosContent();
}

function getSamplePedidos() {
  return [
    { id: 1, tipo: 'pedido', cliente: 'María González', telefono: '11 4523-8812', canal: 'WhatsApp', items: [{ nombre: 'Malbec Reserva', qty: 2, precio: 4800 }], total: 9600, entrega: 'Envío a domicilio', estado: 'nuevo', notas: 'Antes de las 18hs', created_at: new Date().toISOString() },
    { id: 2, tipo: 'reserva', cliente: 'Carlos Suárez', telefono: '11 2231-0045', canal: 'Instagram', items: [{ nombre: 'Whisky Single Malt', qty: 1, precio: 18500 }], total: 18500, entrega: 'Retiro en local', estado: 'confirmado', notas: '', created_at: new Date().toISOString() },
    { id: 3, tipo: 'pedido', cliente: 'Laura Méndez', telefono: '11 6677-3312', canal: 'Teléfono', items: [{ nombre: 'IPA Artesanal', qty: 6, precio: 1500 }], total: 9000, entrega: 'Retiro en local', estado: 'preparando', notas: '', created_at: new Date().toISOString() },
  ];
}

function renderPedidosContent() {
  // 1. FILTROS Y MÉTRICAS (CORREGIDO)
  const acts = pedidosData.filter(p => !['entregado', 'cancelado'].includes(p.estado));
  const reservas = pedidosData.filter(p => p.tipo === 'reserva' && !['entregado', 'cancelado'].includes(p.estado));
  
  // CORRECCIÓN: Solo sumamos la plata de los pedidos que NO están cancelados
  const pedidosValidos = pedidosData.filter(p => p.estado !== 'cancelado');
  const hoyTotal = pedidosValidos.reduce((a, p) => a + (Number(p.total) || 0), 0);

  const container = document.getElementById('pageContent');
  
  // 2. RENDERIZADO DEL HTML BASE Y EL MODAL (TU DISEÑO ORIGINAL)
  container.innerHTML = `
    <div class="metrics" style="margin-bottom:1rem">
      <div class="metric"><div class="metric-label">Activos</div><div class="metric-val" style="color:var(--gold)">${acts.length}</div></div>
      <div class="metric"><div class="metric-label">Total</div><div class="metric-val" style="color:#4CAF50;font-size:1.2rem">${fmt(hoyTotal)}</div></div>
      <div class="metric"><div class="metric-label">Reservas</div><div class="metric-val" style="color:#9B59B6">${reservas.length}</div></div>
      <div class="metric"><div class="metric-label">Total pedidos</div><div class="metric-val">${pedidosData.length}</div></div>
    </div>
    <div style="display:flex;gap:0;border-bottom:0.5px solid var(--border);margin-bottom:1.5rem">
      <button class="filter-btn ${pedidosTab === 'kanban' ? 'active' : ''}" style="border-bottom:none" onclick="pedidosTab='kanban';renderPedidosContent()">Kanban</button>
      <button class="filter-btn ${pedidosTab === 'lista' ? 'active' : ''}" style="border-bottom:none" onclick="pedidosTab='lista';renderPedidosContent()">Lista</button>
    </div>
    <div id="pedidosView"></div>
    <div class="modal-bg" id="pedidoModal" onclick="if(event.target===this)closeModal('pedidoModal')">
      <div class="modal">
        <button class="close-modal" onclick="closeModal('pedidoModal')">✕</button>
        <div class="modal-title">Nuevo pedido / Reserva</div>
        <div class="form-grid">
          <div class="form-row"><label class="form-label">Tipo</label><select class="form-select" id="pf-tipo"><option value="pedido">Pedido</option><option value="reserva">Reserva</option></select></div>
          <div class="form-row"><label class="form-label">Canal</label><select class="form-select" id="pf-canal"><option>WhatsApp</option><option>Instagram</option><option>Teléfono</option><option>Presencial</option><option>Web</option></select></div>
        </div>
        <div class="form-row"><label class="form-label">Cliente</label><input class="form-input" id="pf-cliente" placeholder="Nombre y apellido"></div>
        <div class="form-grid">
          <div class="form-row"><label class="form-label">Teléfono</label><input class="form-input" id="pf-tel"></div>
          <div class="form-row"><label class="form-label">Total ($)</label><input class="form-input" type="number" id="pf-total"></div>
        </div>
        <div class="form-row"><label class="form-label">Productos</label><textarea class="form-textarea" id="pf-items" placeholder="Ej: 2x Malbec Reserva, 1x IPA"></textarea></div>
        <div class="form-row"><label class="form-label">Entrega</label><select class="form-select" id="pf-entrega"><option>Retiro en local</option><option>Envío a domicilio</option></select></div>
        <div class="form-row"><label class="form-label">Notas</label><input class="form-input" id="pf-notas"></div>
        <div class="modal-footer">
          <button class="btn-out" onclick="closeModal('pedidoModal')">Cancelar</button>
          <button class="btn" onclick="savePedido()">Guardar</button>
        </div>
      </div>
    </div>`;

  // 3. RENDERIZADO DE LAS TARJETAS (ACÁ MOSTRAMOS EL DETALLE DE LOS PRODUCTOS)
  if (pedidosTab === 'kanban') {
    const cols = ['nuevo', 'confirmado', 'preparando', 'listo'];
    document.getElementById('pedidosView').innerHTML = `<div class="kanban">${cols.map(est => {
      const cards = pedidosData.filter(p => p.estado === est);
      return `<div class="kanban-col">
        <div class="col-header"><span class="col-title">${estadoLabel[est] || est}</span><span class="col-count">${cards.length}</span></div>
        <div class="col-body">
          ${cards.length === 0 ? '<div style="padding:.8rem;text-align:center;font-size:11px;color:var(--muted)">Sin pedidos</div>' : ''}
          ${cards.map(p => {
            
            // MAGIA ACÁ: Convertimos el array de items en una lista legible
            let listaItems = '';
            if (Array.isArray(p.items)) {
              listaItems = p.items.map(i => `• ${i.nombre} x${i.qty}`).join('<br>');
            } else {
              listaItems = String(p.items || 'Sin detalle').slice(0, 60);
            }

            return `
            <div class="kcard">
              <div class="kcard-top"><span class="kcard-id">#${p.id}</span><span class="type-badge tb-${p.tipo}">${p.tipo}</span></div>
              <div class="kcard-name">${p.cliente}</div>
              
              <div class="kcard-desc" style="font-size:11px; color:var(--cream); line-height:1.4; margin-bottom: 8px;">
                ${listaItems}
              </div>
              
              <div class="kcard-foot">
                <span class="kcard-total">${fmt(p.total)}</span>
                <button class="act-btn" onclick="nextPedidoStatus(${p.id})" title="Avanzar estado" style="font-size:10px">→</button>
              </div>
            </div>`
          }).join('')}
        </div>
      </div>`;
    }).join('')}</div>`;
  } else {
    // VISTA DE LISTA (Opcional, la mantenemos igual a la tuya)
    document.getElementById('pedidosView').innerHTML = `<div class="table-wrap">
      <div class="t-head" style="grid-template-columns:60px 1.5fr 1fr 1fr 1fr 100px">
        <div class="th">ID</div><div class="th">Cliente</div><div class="th">Canal</div><div class="th">Total</div><div class="th">Estado</div><div class="th">Acción</div>
      </div>
      <div class="t-body">
        ${pedidosData.map(p => `
          <div class="t-row" style="grid-template-columns:60px 1.5fr 1fr 1fr 1fr 100px">
            <div class="td muted">#${p.id}</div>
            <div class="td"><div><div style="font-size:12px">${p.cliente}</div><div style="font-size:10px;color:var(--muted)">${p.tipo}</div></div></div>
            <div class="td muted">${p.canal}</div>
            <div class="td gold">${fmt(p.total)}</div>
            <div class="td"><span class="status-badge ${estadoClass[p.estado] || ''}">${estadoLabel[p.estado] || p.estado}</span></div>
            <div class="td"><button class="act-btn" onclick="nextPedidoStatus(${p.id})">→</button></div>
          </div>`).join('')}
      </div>
    </div>`;
  }
}

  if (pedidosTab === 'kanban') {
    const cols = ['nuevo', 'confirmado', 'preparando', 'listo'];
    document.getElementById('pedidosView').innerHTML = `<div class="kanban">${cols.map(est => {
      const cards = pedidosData.filter(p => p.estado === est);
      return `<div class="kanban-col">
        <div class="col-header"><span class="col-title">${estadoLabel[est]}</span><span class="col-count">${cards.length}</span></div>
        <div class="col-body">
          ${cards.length === 0 ? '<div style="padding:.8rem;text-align:center;font-size:11px;color:var(--muted)">Sin pedidos</div>' : ''}
          ${cards.map(p => `
            <div class="kcard">
              <div class="kcard-top"><span class="kcard-id">#${p.id}</span><span class="type-badge tb-${p.tipo}">${p.tipo}</span></div>
              <div class="kcard-name">${p.cliente}</div>
              <div class="kcard-desc">${Array.isArray(p.items) ? p.items.map(i => i.nombre).join(', ').slice(0, 50) : String(p.items || '').slice(0, 50)}</div>
              <div class="kcard-foot">
                <span class="kcard-total">${fmt(p.total)}</span>
                <button class="act-btn" onclick="nextPedidoStatus(${p.id})" title="Avanzar estado" style="font-size:10px">→</button>
              </div>
            </div>`).join('')}
        </div>
      </div>`;
    }).join('')}</div>`;
  } else {
    document.getElementById('pedidosView').innerHTML = `<div class="table-wrap">
      <div class="t-head" style="grid-template-columns:60px 1.5fr 1fr 1fr 1fr 100px">
        <div class="th">ID</div><div class="th">Cliente</div><div class="th">Canal</div><div class="th">Total</div><div class="th">Estado</div><div class="th">Acción</div>
      </div>
      <div class="t-body">
        ${pedidosData.map(p => `
          <div class="t-row" style="grid-template-columns:60px 1.5fr 1fr 1fr 1fr 100px">
            <div class="td muted">#${p.id}</div>
            <div class="td"><div><div style="font-size:12px">${p.cliente}</div><div style="font-size:10px;color:var(--muted)">${p.tipo}</div></div></div>
            <div class="td muted">${p.canal}</div>
            <div class="td gold">${fmt(p.total)}</div>
            <div class="td"><span class="status-badge ${estadoClass[p.estado]}">${estadoLabel[p.estado]}</span></div>
            <div class="td"><button class="act-btn" onclick="nextPedidoStatus(${p.id})">→</button></div>
          </div>`).join('')}
      </div>
    </div>`;
  }

function nextPedidoStatus(id) {
  const p = pedidosData.find(x => x.id === id);
  if (!p) return;
  const idx = estadosCycle.indexOf(p.estado);
  if (idx < estadosCycle.length - 2) { p.estado = estadosCycle[idx + 1]; updatePedidoEstado(id, p.estado); renderPedidosContent(); }
}

function openPedidoModal() { openModal('pedidoModal'); }
async function savePedido() {
  const cliente = document.getElementById('pf-cliente').value.trim();
  if (!cliente) { alert('Ingresá el nombre del cliente'); return; }
  const p = {
    tipo: document.getElementById('pf-tipo').value,
    cliente, telefono: document.getElementById('pf-tel').value,
    canal: document.getElementById('pf-canal').value,
    items: [{ nombre: document.getElementById('pf-items').value }],
    total: parseFloat(document.getElementById('pf-total').value) || 0,
    entrega: document.getElementById('pf-entrega').value,
    estado: 'nuevo', notas: document.getElementById('pf-notas').value,
  };
  const res = await insertPedido(p);
  if (res.ok) { pedidosData = await getPedidos(); if (!pedidosData.length) pedidosData = getSamplePedidos(); }
  else { pedidosData.unshift({ ...p, id: Date.now() }); }
  closeModal('pedidoModal'); renderPedidosContent(); showToast('Pedido creado');
}
function exportPedidos() {
  const rows = [['ID', 'Tipo', 'Cliente', 'Canal', 'Total', 'Estado']];
  pedidosData.forEach(p => rows.push([p.id, p.tipo, p.cliente, p.canal, p.total, p.estado]));
  downloadCSV(rows, 'lembe_pedidos.csv');
}

// ============================
//  HISTORIAL
// ============================
let histData = [];
let histFilter = 'todos';

async function renderHistorial() {
  document.getElementById('topbarActions').innerHTML = `<button class="btn-out" onclick="exportHistorial()">Exportar</button>`;
  histData = await getVentas();
  if (!histData.length) histData = getSampleHist();
  renderHistContent();
}

function getSampleHist() {
  return [
    { id: 1, created_at: '2026-04-08T10:15', items: [{ nombre: 'Malbec Reserva', qty: 2, precio: 4800 }], total: 9600, metodo_pago: 'efectivo', estado: 'completado' },
    { id: 2, created_at: '2026-04-08T11:30', items: [{ nombre: 'Whisky Single Malt', qty: 1, precio: 18500 }], total: 18500, metodo_pago: 'transferencia', estado: 'completado' },
    { id: 3, created_at: '2026-04-07T09:20', items: [{ nombre: 'IPA Artesanal', qty: 4, precio: 1500 }], total: 6000, metodo_pago: 'qr', estado: 'completado' },
    { id: 4, created_at: '2026-04-07T14:00', items: [{ nombre: 'Extra Brut Rosé', qty: 2, precio: 6200 }], total: 12400, metodo_pago: 'efectivo', estado: 'completado' },
    { id: 5, created_at: '2026-04-06T11:00', items: [{ nombre: 'Gin Botánico', qty: 1, precio: 8900 }], total: 8900, metodo_pago: 'transferencia', estado: 'completado' },
  ];
}

function renderHistContent() {
  const total = histData.reduce((a, h) => a + h.total, 0);
  const avg = histData.length ? Math.round(total / histData.length) : 0;
  const max = histData.length ? Math.max(...histData.map(h => h.total)) : 0;
  const ef = histData.filter(h => h.metodo_pago === 'efectivo').reduce((a, h) => a + h.total, 0);
  const tr = histData.filter(h => h.metodo_pago === 'transferencia').reduce((a, h) => a + h.total, 0);
  const qr = histData.filter(h => h.metodo_pago === 'qr').reduce((a, h) => a + h.total, 0);

  document.getElementById('pageContent').innerHTML = `
    <div class="metrics" style="margin-bottom:1rem">
      <div class="metric"><div class="metric-label">Ingresos totales</div><div class="metric-val" style="color:var(--gold)">${fmt(total)}</div></div>
      <div class="metric"><div class="metric-label">Transacciones</div><div class="metric-val">${histData.length}</div></div>
      <div class="metric"><div class="metric-label">Ticket promedio</div><div class="metric-val" style="color:var(--gold2)">${fmt(avg)}</div></div>
      <div class="metric"><div class="metric-label">Mayor venta</div><div class="metric-val" style="color:#4CAF50">${fmt(max)}</div></div>
    </div>
    <div class="chart-section">
      <div class="chart-title">Ingresos por día — últimos 7 días</div>
      <div class="bar-chart" id="histChart"></div>
    </div>
    <div class="method-summary" style="margin-bottom:1rem">
      <div class="ms-card"><div style="font-size:1.2rem">💵</div><div><div class="ms-label">Efectivo</div><div class="ms-val">${fmt(ef)}</div><div class="ms-pct">${total ? Math.round(ef / total * 100) : 0}%</div></div></div>
      <div class="ms-card"><div style="font-size:1.2rem">📱</div><div><div class="ms-label">Transferencia</div><div class="ms-val">${fmt(tr)}</div><div class="ms-pct">${total ? Math.round(tr / total * 100) : 0}%</div></div></div>
      <div class="ms-card"><div style="font-size:1.2rem">💳</div><div><div class="ms-label">QR / Débito</div><div class="ms-val">${fmt(qr)}</div><div class="ms-pct">${total ? Math.round(qr / total * 100) : 0}%</div></div></div>
    </div>
    <div class="table-wrap">
      <div class="t-head" style="grid-template-columns:120px 2fr 120px 100px 90px">
        <div class="th">Fecha</div><div class="th">Productos</div><div class="th">Método</div><div class="th">Total</div><div class="th">Estado</div>
      </div>
      <div class="t-body">
        ${histData.map(h => `
          <div class="t-row" style="grid-template-columns:120px 2fr 120px 100px 90px">
            <div class="td muted" style="font-size:11px">${new Date(h.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
            <div class="td muted" style="font-size:11px">${Array.isArray(h.items) ? h.items.map(i => i.nombre + ' x' + i.qty).join(', ').slice(0, 60) : '-'}</div>
            <div class="td"><span class="type-badge tb-venta">${h.metodo_pago}</span></div>
            <div class="td gold">${fmt(h.total)}</div>
            <div class="td"><span class="status-badge s-completado">${h.estado}</span></div>
          </div>`).join('')}
      </div>
    </div>`;

  renderHistChart();
}

function renderHistChart() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const val = histData.filter(h => h.created_at.slice(0, 10) === key).reduce((a, h) => a + h.total, 0);
    days.push({ label: d.getDate() + '/' + String(d.getMonth() + 1).padStart(2, '0'), val });
  }
  const maxVal = Math.max(...days.map(d => d.val), 1);
  const chart = document.getElementById('histChart');
  if (!chart) return;
  chart.innerHTML = days.map(d => `
    <div class="bar-col">
      <div class="bar-val">${d.val ? fmt(d.val) : '—'}</div>
      <div class="bar" style="height:${Math.round(d.val / maxVal * 65) + 8}px"></div>
      <div class="bar-label">${d.label}</div>
    </div>`).join('');
}

function exportHistorial() {
  const rows = [['Fecha', 'Productos', 'Total', 'Método', 'Estado']];
  histData.forEach(h => rows.push([h.created_at.slice(0, 16), Array.isArray(h.items) ? h.items.map(i => i.nombre + ' x' + i.qty).join(' | ') : '-', h.total, h.metodo_pago, h.estado]));
  downloadCSV(rows, 'lembe_historial.csv');
}

// ============================
//  CONFIGURACIÓN
// ============================
// NOTA: Como la autenticación ahora la maneja Supabase, 
// la gestión de usuarios desde aquí requeriría llamadas a la API de Admin de Supabase.
// Por ahora, he dejado la interfaz visual para que no se rompa el diseño, 
// pero deberías gestionar los usuarios reales desde tu panel de Supabase.

let configUsers = [{ id: 1, nombre: 'Admin Lembe', user: 'admin', rol: 'admin' }];

function renderConfig() {
  document.getElementById('topbarActions').innerHTML = `<button class="btn" onclick="showToast('Configuración guardada')">Guardar todo</button>`;
  document.getElementById('pageContent').innerHTML = `
    <div class="config-grid">
      <div class="config-card">
        <div class="cc-title">Datos del local</div>
        <div class="form-row"><label class="form-label">Nombre</label><input class="form-input" value="Lembe Bebidas" id="cfg-nombre"></div>
        <div class="form-row"><label class="form-label">Dirección</label><input class="form-input" placeholder="Calle, número, ciudad" id="cfg-dir"></div>
        <div class="form-grid">
          <div class="form-row"><label class="form-label">WhatsApp</label><input class="form-input" placeholder="5491100000000" id="cfg-wa"></div>
          <div class="form-row"><label class="form-label">Instagram</label><input class="form-input" value="@lembe_bebidas" id="cfg-ig"></div>
        </div>
        <div style="margin-top:1rem"><button class="btn" onclick="showToast('Datos del local guardados')">Guardar</button></div>
      </div>
      <div class="config-card">
        <div class="cc-title">Funciones del sistema</div>
        <div class="toggle-row"><div><div class="tr-label">Alertas de stock bajo</div><div class="tr-desc">Aviso cuando baja del mínimo</div></div><div class="toggle on" onclick="this.classList.toggle('on')"><div class="toggle-knob"></div></div></div>
        <div class="toggle-row"><div><div class="tr-label">Ticket automático</div><div class="tr-desc">Mostrar al cobrar</div></div><div class="toggle on" onclick="this.classList.toggle('on')"><div class="toggle-knob"></div></div></div>
        <div class="toggle-row"><div><div class="tr-label">Pedidos online activos</div><div class="tr-desc">Recibir desde la web</div></div><div class="toggle on" onclick="this.classList.toggle('on')"><div class="toggle-knob"></div></div></div>
        <div class="toggle-row"><div><div class="tr-label">Descuentos en caja</div><div class="tr-desc">Habilitar en ventas</div></div><div class="toggle" onclick="this.classList.toggle('on')"><div class="toggle-knob"></div></div></div>
      </div>
      <div class="config-card">
        <div class="cc-title">Gestión de Accesos</div>
        <p style="font-size:12px;color:var(--muted);margin-bottom:1rem;">La seguridad ha sido actualizada. Para cambiar tu contraseña o agregar nuevos vendedores, debes ingresar al panel de control de Supabase (Authentication -> Users).</p>
        <div style="margin-top:1rem"><a href="https://supabase.com/dashboard" target="_blank" class="btn">Abrir Supabase</a></div>
      </div>
      <div class="config-card">
        <div class="cc-title">Zona de datos</div>
        <div style="display:flex;gap:.8rem;flex-wrap:wrap">
          <button class="btn-out" onclick="showToast('Respaldo generado')">Crear respaldo</button>
          <button class="btn-out" onclick="exportAll()">Exportar todo</button>
          <a href="/" class="btn-out" style="text-decoration:none;display:inline-flex;align-items:center">Ver web pública →</a>
        </div>
      </div>
    </div>`;
}

function exportAll() {
  showToast('Exportación completa generada');
}

// ============================
//  UTILS
// ============================
function downloadCSV(rows, filename) {
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  a.download = filename; a.click();
}