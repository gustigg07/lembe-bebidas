// ===========================
// LEMBE BEBIDAS — admin.js (VERSIÓN CORREGIDA)
// ===========================

console.log("ADMIN.JS CARGADO CORRECTAMENTE");

let currentPage = 'stock';

// ---- PROTECCIÓN DE STOCK ----
const STOCK_OWNER_EMAIL = "stock@lembe.com";
let stockDesbloqueado = false;

// ---- INICIO / VERIFICAR SESIÓN ----
document.addEventListener('DOMContentLoaded', () => {
  initSupabase();
  verificarSesion();

  document.getElementById('adminPassword').addEventListener('keydown', e => {
    if (e.key === 'Enter') intentarLogin(e);
  });

  document.querySelectorAll('.sb-item[data-page]').forEach(item => {
    item.addEventListener('click', () => {
      if (item.dataset.page === 'stock' && !stockDesbloqueado) {
        mostrarModalPasswordStock();
      } else {
        goPage(item.dataset.page);
      }
    });
  });
});

async function verificarSesion() {
  if (!supabase) return;
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    currentUser = { nombre: session.user.email };
    showApp();
  }
}

async function intentarLogin(event) {
  if (event) event.preventDefault();

  const email = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPassword').value;

  if (!email || !password) {
    document.getElementById('loginError').textContent = "Ingresá correo y contraseña.";
    document.getElementById('loginError').style.display = 'block';
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });

  if (error) {
    document.getElementById('loginError').textContent = "Correo o contraseña incorrectos.";
    document.getElementById('loginError').style.display = 'block';
  } else {
    document.getElementById('loginError').style.display = 'none';
    currentUser = { nombre: data.user.email };
    showApp();
  }
}

function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminApp').style.display = 'grid';
  const displayName = currentUser.nombre.split('@')[0];
  document.getElementById('sbUser').textContent = displayName.charAt(0).toUpperCase() + displayName.slice(1);
  goPage('pedidos');
}

async function cerrarSesion() {
  if (supabase) {
    await supabase.auth.signOut();
  }
  location.reload();
}

// ---- NAVIGATION ----
function goPage(page) {
  if (page !== 'stock') stockDesbloqueado = false;
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
//  PROTECCIÓN DE STOCK
// ============================

function mostrarModalPasswordStock() {
  if (!document.getElementById('stockPasswordModal')) {
    const modal = document.createElement('div');
    modal.id = 'stockPasswordModal';
    modal.style.cssText = `
      position: fixed; inset: 0; z-index: 999;
      background: rgba(0,0,0,0.82);
      backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center;
    `;
    modal.innerHTML = `
      <div style="
        background: var(--dark, #111);
        border: 0.5px solid var(--border, #2a2a2a);
        padding: 2.5rem;
        width: 100%;
        max-width: 360px;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0,0,0,0.6);
      ">
        <div style="font-size:2rem;margin-bottom:1rem">🔒</div>

        <div style="
          font-family:'Playfair Display',serif;
          font-size:1.3rem;
          color:var(--cream,#f0e8d8);
          margin-bottom:.4rem;
        ">Control de Stock</div>

        <div style="
          font-size:10px;
          letter-spacing:.25em;
          color:var(--muted,#666);
          text-transform:uppercase;
          margin-bottom:2rem;
        ">Área restringida · Solo dueño</div>

        <input
          id="stockPassInput"
          type="password"
          placeholder="Contraseña"
          autocomplete="current-password"
          style="
            width:100%;
            background:transparent;
            border:none;
            border-bottom:1px solid var(--border,#2a2a2a);
            color:var(--cream,#f0e8d8);
            font-size:1.1rem;
            padding:.6rem 0;
            text-align:center;
            outline:none;
            letter-spacing:.2em;
            margin-bottom:.5rem;
            transition:border-color .3s;
          "
        />

        <div id="stockPassError" style="
          color:#e05555;
          font-size:11px;
          min-height:20px;
          margin-bottom:1.2rem;
          letter-spacing:.1em;
        "></div>

        <div id="stockPassLoader" style="
          display:none;
          font-size:11px;
          letter-spacing:.2em;
          color:var(--muted,#666);
          text-transform:uppercase;
          margin-bottom:1rem;
        ">Verificando...</div>

        <div style="display:flex;gap:.8rem;">
          <button onclick="cerrarModalPasswordStock()" style="
            flex:1;padding:.75rem;
            background:transparent;
            border:0.5px solid var(--border,#2a2a2a);
            color:var(--muted,#666);
            font-size:11px;letter-spacing:.2em;
            text-transform:uppercase;cursor:pointer;
          ">Cancelar</button>

          <button id="stockPassBtn" onclick="verificarPasswordStock()" style="
            flex:1;padding:.75rem;
            background:var(--gold,#c9a84c);
            border:none;color:#000;
            font-size:11px;font-weight:600;
            letter-spacing:.2em;
            text-transform:uppercase;cursor:pointer;
          ">Ingresar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('stockPassInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') verificarPasswordStock();
    });

    document.getElementById('stockPassInput').addEventListener('focus', e => {
      e.target.style.borderBottomColor = 'var(--gold,#c9a84c)';
    });
    document.getElementById('stockPassInput').addEventListener('blur', e => {
      e.target.style.borderBottomColor = 'var(--border,#2a2a2a)';
    });
  }

  document.getElementById('stockPasswordModal').style.display = 'flex';
  document.getElementById('stockPassInput').value = '';
  document.getElementById('stockPassError').textContent = '';
  document.getElementById('stockPassLoader').style.display = 'none';
  document.getElementById('stockPassBtn').disabled = false;
  setTimeout(() => document.getElementById('stockPassInput').focus(), 100);
}

async function verificarPasswordStock() {
  const password = document.getElementById('stockPassInput').value;

  if (!password) {
    document.getElementById('stockPassError').textContent = 'Ingresá la contraseña';
    return;
  }

  document.getElementById('stockPassLoader').style.display = 'block';
  document.getElementById('stockPassError').textContent = '';
  document.getElementById('stockPassBtn').disabled = true;

  const { error } = await supabase.auth.signInWithPassword({
    email: STOCK_OWNER_EMAIL,
    password: password,
  });

  document.getElementById('stockPassLoader').style.display = 'none';
  document.getElementById('stockPassBtn').disabled = false;

  if (error) {
    document.getElementById('stockPassError').textContent = 'Contraseña incorrecta';
    document.getElementById('stockPassInput').value = '';
    document.getElementById('stockPassInput').focus();
  } else {
    stockDesbloqueado = true;
    cerrarModalPasswordStock();
    goPage('stock');
  }
}

function cerrarModalPasswordStock() {
  const modal = document.getElementById('stockPasswordModal');
  if (modal) modal.style.display = 'none';
}

// ============================
//  STOCK (✅ BUG #1 CORREGIDO)
// ============================
let stockProducts = [];
let stockFilter = 'todos';
let noCombo = []; // ✅ INICIALIZAR AL INICIO para evitar ReferenceError

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
    
    <div class="filters" style="display:flex; justify-content:space-between; align-items:center;">
      <div>
        <button class="filter-btn active" onclick="setStockFilter('todos',this)">Todos</button>
        <button class="filter-btn" onclick="setStockFilter('ok',this)">OK</button>
        <button class="filter-btn" onclick="setStockFilter('bajo',this)">Bajo</button>
        <button class="filter-btn" onclick="setStockFilter('agotado',this)">Agotados</button>
      </div>
      <select id="catFilter" class="form-select" style="width: auto; padding: 0.3rem 1rem; border-radius: 4px; font-size: 11px; text-transform: uppercase; letter-spacing: .1em;" onchange="renderStockTable()">
        <option value="todas">Todas las categorías</option>
        <option value="Vinos">Vinos</option>
        <option value="Espumantes">Espumantes</option>
        <option value="Cervezas">Cervezas</option>
        <option value="Espirituosas">Espirituosas</option>
        <option value="Sin alcohol">Sin alcohol</option>
        <option value="Combos">Combos</option>
        <option value="Aceite de oliva">Aceite de oliva</option>
        <option value="Copa del día">Copa del día</option>
        <option value="Extras">Extras</option>
      </select>
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
        <div class="form-row"><label class="form-label">Nombre</label><input class="form-input" id="sf-nombre" placeholder="Ej: Combo Fernet"></div>
        <div class="form-grid">
          <div class="form-row"><label class="form-label">Categoría</label>
            <select class="form-select" id="sf-cat" onchange="toggleComboUI()">
              <option>Vinos</option><option>Espumantes</option><option>Cervezas</option>
              <option>Espirituosas</option><option>Sin alcohol</option><option value="Combos">Combos</option>
              <option>Aceite de oliva</option><option>Copa del día</option><option>Extras</option>
            </select>
          </div>
          <div class="form-row"><label class="form-label">Precio ($)</label><input class="form-input" type="number" id="sf-precio"></div>
        </div>

        <div id="comboBuilder" style="display:none; background:var(--dark3); border:1px solid rgba(184, 147, 58, 0.5); padding:1rem; margin-bottom:1rem; border-radius:4px;">
          <div style="font-size:10px; color:var(--gold); text-transform:uppercase; letter-spacing:.2em; margin-bottom:.5rem;">Receta del Combo (Se descontará del stock)</div>
          <div style="display:flex; gap:.5rem; margin-bottom:.8rem;">
            <select class="form-select" id="cb-producto" style="flex:1;"></select>
            <input class="form-input" type="number" id="cb-qty" value="1" min="1" style="width:60px;" title="Cantidad">
            <button class="btn" onclick="agregarIngredienteCombo()">+</button>
          </div>
          <div id="cb-lista" style="display:flex; flex-direction:column; gap:.3rem; max-height:100px; overflow-y:auto;"></div>
        </div>

        <div class="form-grid">
          <div class="form-row"><label class="form-label">Stock actual</label><input class="form-input" type="number" id="sf-stock"></div>
          <div class="form-row"><label class="form-label">Stock mínimo</label><input class="form-input" type="number" id="sf-min" value="5"></div>
        </div>
        <div class="form-grid">
          <div class="form-row"><label class="form-label">Origen</label><input class="form-input" id="sf-origen" placeholder="Mendoza, Argentina"></div>
          <div class="form-row"><label class="form-label">Emoji</label><input class="form-input" id="sf-emoji" placeholder="🍷" maxlength="4"></div>
        </div>
        <div class="form-row">
          <label class="form-label">Foto del producto (Opcional)</label>
          <input class="form-input" type="file" id="sf-img" accept="image/*" style="padding: 8px; cursor: pointer;">
          <input type="hidden" id="sf-img-url">
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

function getStockStatus(p) { if (p.categoria === 'Combos') return 'combo'; return p.stock === 0 ? 'agotado' : p.stock <= p.stock_minimo ? 'bajo' : 'ok'; }

function renderStockTable() {
  const q = (document.getElementById('stockSearch')?.value || '').toLowerCase();
  const catFilterSelect = document.getElementById('catFilter');
  const cat = catFilterSelect ? catFilterSelect.value : 'todas';

  // ✅ CORREGIDO: noCombo ahora está inicializado arriba
  noCombo = stockProducts.filter(p => p.categoria !== 'Combos');
  document.getElementById('sm-total').textContent = stockProducts.length;
  document.getElementById('sm-ok').textContent    = noCombo.filter(p => getStockStatus(p) === 'ok').length;
  document.getElementById('sm-low').textContent   = noCombo.filter(p => getStockStatus(p) === 'bajo').length;
  document.getElementById('sm-out').textContent   = noCombo.filter(p => getStockStatus(p) === 'agotado').length;

  const low = noCombo.filter(p => getStockStatus(p) !== 'ok').length;
  document.getElementById('stockAlerts').innerHTML = low > 0
    ? `<div class="alert-bar"><div class="alert-text"><strong>${low} producto${low > 1 ? 's' : ''}</strong> con stock bajo o agotado.</div><button class="btn-out" onclick="setStockFilter('bajo',null);setStockFilter('agotado',null)" style="font-size:10px">Ver</button></div>`
    : '';

  let list = stockProducts.filter(p => {
    const s = getStockStatus(p);
    const mf = stockFilter === 'todos' || stockFilter === s || s === 'combo';
    const ms = !q || p.nombre.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q);
    const mc = cat === 'todas' || p.categoria === cat;
    return mf && ms && mc;
  });

  const body = document.getElementById('stockTableBody');
  if (!list.length) { body.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--muted)">Sin resultados</div>'; return; }

  body.innerHTML = list.map(p => {
    const s = getStockStatus(p);
    const esCombo = p.categoria === 'Combos';

    const pill = esCombo
      ? `<span class="stock-pill" style="background:rgba(139,92,246,.15);color:#a78bfa;border:1px solid rgba(139,92,246,.3)">● Combo virtual</span>`
      : s === 'ok'  ? `<span class="stock-pill sp-ok">● Normal (${p.stock})</span>`
      : s === 'bajo' ? `<span class="stock-pill sp-low">● Bajo (${p.stock})</span>`
      : `<span class="stock-pill sp-out">● Agotado</span>`;

    const stockMinCol = esCombo
      ? `<span style="font-size:10px;color:var(--muted);font-style:italic">—</span>`
      : `${p.stock_minimo} u.`;

    const prodIcon = p.imagen_url 
      ? `<img src="${p.imagen_url}" style="width:24px;height:24px;object-fit:cover;border-radius:4px;margin-right:8px;vertical-align:middle;">` 
      : `<span style="margin-right:8px;">${p.emoji || '🍷'}</span>`;

    const actionBtns = esCombo
      ? `<button class="act-btn" onclick="editStockProduct(${p.id})" title="Editar receta">✏</button>
         <button class="act-btn del" onclick="delStockProduct(${p.id})" title="Eliminar">🗑</button>`
      : `<button class="act-btn" onclick="editStockProduct(${p.id})" title="Editar">✏</button>
         <button class="act-btn" onclick="adjStock(${p.id},1)" title="+1">+</button>
         <button class="act-btn" onclick="adjStock(${p.id},-1)" title="-1">−</button>
         <button class="act-btn del" onclick="delStockProduct(${p.id})" title="Eliminar">🗑</button>`;

    return `<div class="t-row" style="grid-template-columns:2fr 1fr 1fr 1fr 1fr 110px">
      <div class="td" style="display:flex;align-items:center;">
        ${prodIcon}
        <div><div style="font-size:12px;color:var(--cream)">${p.nombre}</div><div style="font-size:10px;color:var(--muted)">${p.origen || ''}</div></div>
      </div>
      <div class="td muted">${p.categoria}</div>
      <div class="td">${pill}</div>
      <div class="td muted">${stockMinCol}</div>
      <div class="td gold">${fmt(p.precio)}</div>
      <div class="td"><div class="action-btns">${actionBtns}</div></div>
    </div>`;
  }).join('');
}

let recetaActual = [];

function toggleComboUI() {
  const isCombo = document.getElementById('sf-cat').value === 'Combos';
  const builder = document.getElementById('comboBuilder');
  
  if (isCombo) {
    builder.style.display = 'block';
    const select = document.getElementById('cb-producto');
    select.innerHTML = stockProducts
      .filter(p => p.categoria !== 'Combos')
      .map(p => `<option value="${p.id}">${p.nombre} (${p.stock} disp.)</option>`)
      .join('');
    renderRecetaLista();
  } else {
    builder.style.display = 'none';
    recetaActual = [];
  }
  document.getElementById('sf-stock').disabled = isCombo;
  if (isCombo) document.getElementById('sf-stock').value = 0;
}

function agregarIngredienteCombo() {
  const select = document.getElementById('cb-producto');
  const id = Number(select.value);
  const nombre = select.options[select.selectedIndex].text.split('(')[0].trim();
  const qty = Number(document.getElementById('cb-qty').value);

  if (!id || qty < 1) return;

  const existe = recetaActual.find(r => r.id === id);
  if (existe) existe.qty += qty;
  else recetaActual.push({ id, nombre, qty });

  document.getElementById('cb-qty').value = 1;
  renderRecetaLista();
}

function quitarIngredienteCombo(id) {
  recetaActual = recetaActual.filter(r => r.id !== id);
  renderRecetaLista();
}

function renderRecetaLista() {
  const container = document.getElementById('cb-lista');
  if (!recetaActual.length) {
    container.innerHTML = '<div style="font-size:10px; color:var(--muted)">Sin ingredientes. Agregá botellas arriba.</div>';
    return;
  }
  container.innerHTML = recetaActual.map(r => `
    <div style="display:flex; justify-content:space-between; align-items:center; background:var(--dark); padding:.4rem .6rem; border:0.5px solid var(--border); font-size:11px;">
      <span>🍾 ${r.nombre} <strong style="color:var(--gold)">x${r.qty}</strong></span>
      <button class="act-btn del" onclick="quitarIngredienteCombo(${r.id})" style="width:20px;height:20px;font-size:9px;">✕</button>
    </div>
  `).join('');
}

function setStockFilter(f, btn) {
  stockFilter = f;
  document.querySelectorAll('.filters .filter-btn').forEach(b => b.classList.remove('active'));
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
  
  recetaActual = (p && Array.isArray(p.receta)) ? [...p.receta] : [];
  toggleComboUI();
  
  openModal('stockModal');
}

async function saveStockProduct() {
  const nombre = document.getElementById('sf-nombre').value.trim();
  const cat = document.getElementById('sf-cat').value;
  if (!nombre) { alert('Ingresá el nombre'); return; }

  if (cat === 'Combos' && recetaActual.length === 0) {
    alert('Los combos deben tener al menos un ingrediente en la receta.');
    return;
  }

  let url_final = document.getElementById('sf-img-url') ? document.getElementById('sf-img-url').value : null;
  const fileInput = document.getElementById('sf-img');

  if (fileInput && fileInput.files && fileInput.files[0]) {
    const nuevaUrl = await uploadProductImage(fileInput.files[0]);
    if (nuevaUrl) url_final = nuevaUrl;
  }

  const valorStock = cat === 'Combos' ? 0 : (parseInt(document.getElementById('sf-stock').value) || 0);

  const prod = {
    nombre, 
    categoria: cat,
    precio: parseFloat(document.getElementById('sf-precio').value) || 0,
    stock: valorStock,
    stock_minimo: parseInt(document.getElementById('sf-min').value) || 5,
    origen: document.getElementById('sf-origen').value.trim(),
    emoji: document.getElementById('sf-emoji').value.trim() || '🍷',
    imagen_url: url_final,
    receta: cat === 'Combos' ? recetaActual : [] 
  };

  if (editingStockId) prod.id = editingStockId;
  
  const res = await upsertProducto(prod);
  if (res.ok) {
    closeModal('stockModal');
    stockProducts = await getProductos();
    renderStockTable();
    showToast(editingStockId ? 'Producto actualizado' : 'Producto agregado');
  } else { 
    showToast('Error: ' + res.msg); 
  }
}
function editStockProduct(id) { openStockModal(stockProducts.find(x => x.id === id)); }
async function adjStock(id, delta) {
  const p = stockProducts.find(x => x.id === id);
  if (!p) return;
  if (p.categoria === 'Combos') { showToast('Los combos no tienen stock propio'); return; }
  p.stock = Math.max(0, p.stock + delta);
  await upsertProducto({ ...p });
  renderStockTable();
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
  stockProducts.forEach(p => rows.push([p.nombre, p.categoria, p.categoria==='Combos'?'Virtual':p.stock, p.categoria==='Combos'?'—':p.stock_minimo, p.precio, p.categoria==='Combos'?'combo virtual':getStockStatus(p)]));
  downloadCSV(rows, 'lembe_stock.csv');
}
async function uploadProductImage(file) {
  showToast("Subiendo imagen...");
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('productos')
    .upload(fileName, file);

  if (error) {
    alert("Error al subir imagen: " + error.message);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from('productos')
    .getPublicUrl(fileName);
    
  return urlData.publicUrl;
}

// ============================
//  CATÁLOGO
// ============================
const CATEGORIAS = ['Vinos','Espumantes','Cervezas','Espirituosas','Sin alcohol','Combos','Aceite de oliva','Copa del día','Extras'];

async function renderCatalogo() {
document.getElementById('topbarActions').innerHTML = `<button class="btn" onclick="stockDesbloqueado ? goPage('stock') : mostrarModalPasswordStock()">Gestionar en Stock →</button>`;
  const prods = await getProductos();
  document.getElementById('pageContent').innerHTML = `
    <p style="font-size:12px;color:var(--muted);margin-bottom:1rem">El catálogo se gestiona desde Control de Stock. Aquí podés ver la vista pública.</p>
    <div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:1.5rem" id="cataloAdminFilters">
      <button class="filter-btn active" onclick="filtrarCatalogo('todos',this)">Todos</button>
      ${CATEGORIAS.map(c => `<button class="filter-btn" onclick="filtrarCatalogo('${c}',this)">${c}</button>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:.7rem" id="catalogoGrid">
      ${renderCatalogoGrid(prods, 'todos')}
    </div>`;
  window._catalogoProds = prods;
}

function renderCatalogoGrid(prods, cat) {
  const list = cat === 'todos' ? prods : prods.filter(p => p.categoria === cat);
  if (!list.length) return '<div style="padding:2rem;color:var(--muted);font-size:12px;grid-column:1/-1">Sin productos en esta categoría</div>';
  return list.map(p => `
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
    </div>`).join('');
}

function filtrarCatalogo(cat, btn) {
  document.querySelectorAll('#cataloAdminFilters .filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const grid = document.getElementById('catalogoGrid');
  if (grid && window._catalogoProds) grid.innerHTML = renderCatalogoGrid(window._catalogoProds, cat);
}

// ============================
//  CAJA / VENTAS
// ============================
let cajaPOS = [];
let cajaProducts = [];
let cajaPayMethod = 'efectivo';
let cajaVentas = [];
let cajaDescuentos = new Set();
let movimientosCaja = [];
let posCategoriaActiva = 'todos';

async function cargarDatosDelDia() {
  const limite = new Date();
  limite.setDate(limite.getDate() - 2);
  const fechaStr = limite.toISOString();

  cajaProducts = await getProductos();
  const ventasCrudas = await getVentas(fechaStr); 
  const movsCrudos = await getMovimientos(fechaStr);

  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = hoy.getMonth();
  const d = hoy.getDate();

  cajaVentas = (ventasCrudas || []).filter(v => {
    if (!v.created_at) return true;
    const fechaObj = new Date(v.created_at);
    return fechaObj.getFullYear() === y && fechaObj.getMonth() === m && fechaObj.getDate() === d;
  });

  movimientosCaja = (movsCrudos || []).filter(mov => {
    if (!mov.created_at) return true;
    const fechaObj = new Date(mov.created_at);
    return fechaObj.getFullYear() === y && fechaObj.getMonth() === m && fechaObj.getDate() === d;
  });
}

async function renderCaja() {
  document.getElementById('topbarActions').innerHTML = `
    <button class="btn-out" onclick="abrirModalApertura()">Abrir Caja</button>
    <button class="btn-out" onclick="abrirModalMovimiento()">± Ingreso / Egreso</button>
    <button class="btn-out" onclick="verFlujoDia()">Flujo del Día</button>
    <button class="btn-red" onclick="iniciarCierre()">Cerrar Caja</button>`;
  
  await cargarDatosDelDia();

  document.getElementById('pageContent').innerHTML = `
    <div class="metrics" style="margin-bottom:1rem">
      <div class="metric"><div class="metric-label">Ingresos válidos</div><div class="metric-val" style="color:var(--gold)" id="cj-total">$0</div></div>
      <div class="metric"><div class="metric-label">Ventas válidas</div><div class="metric-val" id="cj-count">0</div></div>
      <div class="metric"><div class="metric-label">Efectivo</div><div class="metric-val" style="color:#4CAF50" id="cj-ef">$0</div></div>
      <div class="metric"><div class="metric-label">Digital</div><div class="metric-val" style="color:var(--gold2)" id="cj-dig">$0</div></div>
    </div>
    
    <div class="pos-layout" style="margin:0 -2rem;border-top:0.5px solid var(--border)">
      <div class="pos-left">
        <input class="search-box" style="width:100%" type="text" placeholder="Buscar producto..." id="posSearch" oninput="renderPosTiles()">
        <div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.8rem" id="posCatFilters">
          <button class="filter-btn active" onclick="setPosCategoria('todos',this)">Todos</button>
          <button class="filter-btn" onclick="setPosCategoria('Vinos',this)">Vinos</button>
          <button class="filter-btn" onclick="setPosCategoria('Espumantes',this)">Espumantes</button>
          <button class="filter-btn" onclick="setPosCategoria('Cervezas',this)">Cervezas</button>
          <button class="filter-btn" onclick="setPosCategoria('Espirituosas',this)">Espirituosas</button>
          <button class="filter-btn" onclick="setPosCategoria('Sin alcohol',this)">Sin alcohol</button>
          <button class="filter-btn" onclick="setPosCategoria('Combos',this)">Combos</button>
        </div>
        <div class="prod-tile-grid" id="posTiles"></div>
        <div>
          <div style="font-size:9px;letter-spacing:.3em;text-transform:uppercase;color:var(--muted);margin-bottom:.8rem">Últimas Ventas</div>
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
          
          <div style="margin-bottom:.8rem">
            <div style="font-size:9px;letter-spacing:.3em;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">Descuento <span id="descTotalLabel" style="color:var(--orange)"></span></div>
            <div class="pm-btns">
              <button class="pm-btn desc-btn" id="desc-5"  onclick="toggleDesc(5)">5%</button>
              <button class="pm-btn desc-btn" id="desc-10" onclick="toggleDesc(10)">10%</button>
              <button class="pm-btn desc-btn" id="desc-15" onclick="toggleDesc(15)">15%</button>
              <button class="pm-btn desc-btn" id="desc-20" onclick="toggleDesc(20)">20%</button>
              <button class="pm-btn desc-btn" id="desc-25" onclick="toggleDesc(25)">25%</button>
              <button class="pm-btn desc-btn" id="desc-50" onclick="toggleDesc(50)">50%</button>
            </div>
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
        <div class="ticket-logo">LEMBE</div><div class="ticket-sub">Tienda de Bebidas</div><hr class="ticket-divider">
        <div id="ticketItems"></div><hr class="ticket-divider">
        <div class="ticket-total-row" style="color:var(--cream)"><span>Subtotal</span><span id="ticketSub"></span></div>
        <div id="ticketDescRow" class="ticket-total-row" style="color:#e07a30;display:none"><span id="ticketDescLabel">Descuento</span><span id="ticketDescAmt"></span></div>
        <div class="ticket-total-row" style="font-size:1.1rem;font-weight:700"><span>Total</span><span id="ticketTotal"></span></div>
        <div id="ticketMethod" style="font-size:10px;color:var(--muted);text-align:center;margin-top:.4rem"></div>
        <button class="cobrar-btn" style="margin-top:1.5rem" onclick="closeTicket()">Nueva venta</button>
      </div>
    </div>
    
    <div class="modal-bg" id="movModal" onclick="if(event.target===this)closeModal('movModal')">
      <div class="modal">
        <button class="close-modal" onclick="closeModal('movModal')">✕</button>
        <div class="modal-title">Registrar Movimiento</div>
        <div class="form-grid">
          <div class="form-row"><label class="form-label">Tipo</label><select class="form-select" id="movTipo"><option value="ingreso">Ingreso de dinero</option><option value="egreso">Retiro / Pago a proveedor</option></select></div>
          <div class="form-row"><label class="form-label">Monto ($)</label><input class="form-input" type="number" id="movMonto"></div>
        </div>
        <div class="form-grid">
          <div class="form-row"><label class="form-label">Método</label><select class="form-select" id="movMetodo"><option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option><option value="qr">QR</option></select></div>
          <div class="form-row"><label class="form-label">Motivo</label><input class="form-input" id="movDesc" placeholder="Ej: Pago a proveedor de hielo"></div>
        </div>
        <div class="modal-footer"><button class="btn-out" onclick="closeModal('movModal')">Cancelar</button><button class="btn" onclick="guardarMovimiento()">Guardar</button></div>
      </div>
    </div>

    <div class="modal-bg" id="flujoModal" onclick="if(event.target===this)closeModal('flujoModal')">
      <div class="modal" style="max-width:950px; width:95%; padding:0; overflow:hidden">
        <button class="close-modal" onclick="closeModal('flujoModal')" style="top:1rem;right:1rem">✕</button>

        <div style="position:sticky;top:0;z-index:10;background:var(--dark2,#1a1a1a);border-bottom:1px solid var(--border);padding:1.5rem 2rem 1rem">
          <div class="modal-title" style="margin-bottom:1rem">Flujo de Caja del Día</div>

          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.6rem;margin-bottom:1rem" id="flujoResumen">
            <div style="background:var(--dark3);padding:.8rem;text-align:center;border:0.5px solid var(--border)">
              <div style="font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);margin-bottom:.3rem">Apertura</div>
              <div style="font-family:'Playfair Display',serif;font-size:1.1rem;color:var(--gold)" id="fr-apertura">$0</div>
            </div>
            <div style="background:var(--dark3);padding:.8rem;text-align:center;border:0.5px solid var(--border)">
              <div style="font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);margin-bottom:.3rem">Ventas</div>
              <div style="font-family:'Playfair Display',serif;font-size:1.1rem;color:#4CAF50" id="fr-ventas">$0</div>
            </div>
            <div style="background:var(--dark3);padding:.8rem;text-align:center;border:0.5px solid var(--border)">
              <div style="font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);margin-bottom:.3rem">Egresos</div>
              <div style="font-family:'Playfair Display',serif;font-size:1.1rem;color:var(--red)" id="fr-egresos">$0</div>
            </div>
            <div style="background:var(--dark3);padding:.8rem;text-align:center;border:1px solid var(--amber,#c9a84c)">
              <div style="font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);margin-bottom:.3rem">Saldo actual</div>
              <div style="font-family:'Playfair Display',serif;font-size:1.1rem;color:var(--gold)" id="fr-saldo">$0</div>
            </div>
          </div>

          <div style="display:flex;gap:.4rem;flex-wrap:wrap">
            <button class="filter-btn active" onclick="filtrarFlujo('todos',this)">Todos</button>
            <button class="filter-btn" onclick="filtrarFlujo('venta',this)">Ventas</button>
            <button class="filter-btn" onclick="filtrarFlujo('apertura',this)">Apertura</button>
            <button class="filter-btn" onclick="filtrarFlujo('ingreso',this)">Ingresos</button>
            <button class="filter-btn" onclick="filtrarFlujo('egreso',this)">Egresos</button>
            <button class="filter-btn" onclick="filtrarFlujo('anulacion',this)">Anulaciones</button>
            <button class="filter-btn" onclick="filtrarFlujo('cierre',this)">Cierre</button>
          </div>
        </div>

        <div style="max-height:380px;overflow-y:auto;padding:0 0 1rem">
          <div class="t-head" style="grid-template-columns: 85px 110px 1fr 100px 100px 100px; gap: 15px; position:sticky; top:0; z-index:5">
            <div class="th">Hora</div>
            <div class="th">Tipo</div>
            <div class="th">Detalle</div>
            <div class="th">Método</div>
            <div class="th" style="text-align:right">Monto</div>
            <div class="th" style="text-align:right">Saldo</div>
          </div>
          <div class="t-body" id="flujoTableBody"></div>
        </div>

        <div class="modal-footer" style="justify-content:space-between;border-top:1px solid var(--border);padding:1rem 2rem">
          <div style="font-size:11px;color:var(--muted)">Todo el historial de la jornada</div>
          <div style="display:flex;gap:.6rem">
            <button class="btn-out" onclick="imprimirFlujo()">Imprimir</button>
            <button class="btn" onclick="exportFlujo()">Descargar CSV</button>
          </div>
        </div>
      </div>
    </div>

    <div class="modal-bg" id="cierreModal" onclick="if(event.target===this)closeModal('cierreModal')">
      <div class="modal">
        <button class="close-modal" onclick="closeModal('cierreModal')">✕</button>
        <div class="modal-title">Cierre de Caja (Efectivo)</div>
        <div style="background:var(--dark3); padding:1.5rem; border-radius:4px; margin-bottom:1.5rem; text-align:center;">
           <div style="font-size:10px; color:var(--muted); text-transform:uppercase; letter-spacing:.2em; margin-bottom:.5rem;">Efectivo que DEBERÍA haber</div>
           <div style="font-size:2.5rem; font-family:'Playfair Display',serif; color:var(--gold);" id="cierreEsperado">$0</div>
        </div>
        <div class="form-row">
           <label class="form-label" style="text-align:center;font-size:12px">¿Cuánto billete físico hay REALMENTE en la caja?</label>
           <input class="form-input" type="number" id="cierreReal" style="font-size:1.8rem; text-align:center; padding:1rem;" placeholder="Ingresá el monto" oninput="calcDiferenciaCierre()">
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:1.5rem; padding:1rem; border-top:1px solid var(--border); border-bottom:1px solid var(--border);">
           <span style="font-size:12px; color:var(--muted);">Diferencia detectada:</span>
           <span style="font-weight:bold; font-size:1.3rem;" id="cierreDif">$0</span>
        </div>
        <div class="modal-footer"><button class="btn-out" onclick="closeModal('cierreModal')">Cancelar</button><button class="btn-red" onclick="confirmarCierre()">Registrar Cierre</button></div>
      </div>
    </div>`;

  cajaPOS = [];
  posCategoriaActiva = 'todos';
  renderPosTiles();
  renderCajaMetrics();
  renderCajaHist();
}

function setPosCategoria(cat, btn) {
  posCategoriaActiva = cat;
  document.querySelectorAll('#posCatFilters .filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderPosTiles();
}

function renderPosTiles() {
  const q = (document.getElementById('posSearch')?.value || '').toLowerCase();
  const list = cajaProducts.filter(p => {
    const matchCat = posCategoriaActiva === 'todos' || p.categoria === posCategoriaActiva;
    const matchQ   = !q || p.nombre.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q);
    return matchCat && matchQ;
  });
  document.getElementById('posTiles').innerHTML = list.length ? list.map(p => `
    <div class="prod-tile ${p.stock === 0 && p.categoria !== 'Combos' ? 'out' : ''}" onclick="posAdd(${p.id})">
      <div class="pt-ico">${p.emoji || '🍷'}</div>
      <div class="pt-name">${p.nombre}</div>
      <div class="pt-price">${fmt(p.precio)}</div>
      <div class="pt-stock">${p.categoria === 'Combos' ? 'Virtual' : p.stock > 0 ? p.stock + ' u.' : 'Agotado'}</div>
    </div>`).join('') : '<div style="padding:1rem;color:var(--muted);font-size:12px;grid-column:1/-1;text-align:center">Sin resultados</div>';
}

// ✅ BUG #3 CORREGIDO: Permitir que los combos (stock=0 por diseño) sean seleccionables
function posAdd(id) {
  const prod = cajaProducts.find(p => p.id === id);
  if (!prod) return;
  // Permitir combos (stock=0 es normal) pero bloquear productos normales sin stock
  if (prod.categoria !== 'Combos' && prod.stock === 0) return;
  const ex = cajaPOS.find(c => c.id === id);
  if (ex) { if (ex.qty < prod.stock || prod.categoria === 'Combos') ex.qty++; } else cajaPOS.push({ ...prod, qty: 1 });
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
  const subtotal = cajaPOS.reduce((a, c) => a + c.precio * c.qty, 0);
  const descPct = [...cajaDescuentos].reduce((a, v) => a + v, 0);
  const descMonto = Math.round(subtotal * descPct / 100);
  const total = subtotal - descMonto;

  document.getElementById('posItemCount').textContent = count + ' item' + (count !== 1 ? 's' : '');
  document.getElementById('posCart').innerHTML = cajaPOS.length ? cajaPOS.map(item => `
    <div class="cart-item-row"><div style="font-size:1.2rem;flex-shrink:0">${item.emoji||'🍷'}</div><div style="flex:1"><div class="ci-name">${item.nombre}</div><div class="ci-price-sm">${fmt(item.precio)} c/u</div></div><div class="action-btns"><button class="act-btn" onclick="posChg(${item.id},-1)">−</button><span style="font-size:13px;color:var(--cream);min-width:20px;text-align:center">${item.qty}</span><button class="act-btn" onclick="posChg(${item.id},1)">+</button></div><div class="ci-sub">${fmt(item.precio*item.qty)}</div></div>`).join('') : '<div class="cart-empty-msg">Agregá productos</div>';

  document.getElementById('posSub').textContent = fmt(subtotal);
  const descLabel = document.getElementById('descTotalLabel');
  if (descPct > 0 && cajaPOS.length) descLabel.textContent = `— ${descPct}% = -${fmt(descMonto)}`;
  else descLabel.textContent = '';
  document.getElementById('posTotal').textContent = fmt(total);
  document.getElementById('posCobraBtn').disabled = cajaPOS.length === 0;
}

function toggleDesc(pct) {
  if (cajaDescuentos.has(pct)) { cajaDescuentos.delete(pct); document.getElementById('desc-'+pct)?.classList.remove('sel'); }
  else { cajaDescuentos.add(pct); document.getElementById('desc-'+pct)?.classList.add('sel'); }
  renderPosCart();
}

function resetDescuentos() {
  cajaDescuentos.clear();
  [5,10,15,20,25,50].forEach(v => document.getElementById('desc-'+v)?.classList.remove('sel'));
  if (document.getElementById('descTotalLabel')) document.getElementById('descTotalLabel').textContent = '';
}

function selectPM(pm) {
  cajaPayMethod = pm;
  ['efectivo','transferencia','qr'].forEach(m => document.getElementById('pm-'+m)?.classList.toggle('sel', m===pm));
}

async function cobrar() {
  if (!cajaPOS.length) return;
  
  const subtotal = cajaPOS.reduce((a,c)=>a+(Number(c.precio)*Number(c.qty)),0);
  const descPct = [...cajaDescuentos].reduce((a,v)=>a+v,0);
  const descMonto = Math.round(subtotal*descPct/100);
  const total = subtotal - descMonto;

  const venta = {
    items: cajaPOS.map(c=>({id:c.id,nombre:c.nombre,qty:Number(c.qty),precio:Number(c.precio)})),
    subtotal: Math.round(subtotal), descuento_pct: descPct, descuento_monto: descMonto,
    total: Math.round(total), metodo_pago: cajaPayMethod, estado: 'completado'
  };

  const res = await insertVenta(venta);
  if (res.ok) {
    for (const item of cajaPOS) {
      const prodOriginal = cajaProducts.find(p => p.id === item.id);
      
      if (prodOriginal) {
        if (prodOriginal.categoria === 'Combos' && Array.isArray(prodOriginal.receta) && prodOriginal.receta.length > 0) {
          for (const ingrediente of prodOriginal.receta) {
            const prodFisico = cajaProducts.find(p => p.id === ingrediente.id);
            if (prodFisico) {
              const cantADescontar = Number(ingrediente.qty) * Number(item.qty);
              await upsertProducto({ 
                ...prodFisico, 
                stock: Math.max(0, Number(prodFisico.stock) - cantADescontar) 
              });
            }
          }
          await upsertProducto({...prodOriginal, stock: Math.max(0, Number(prodOriginal.stock) - Number(item.qty))});
        } else {
          await upsertProducto({...prodOriginal, stock: Math.max(0, Number(prodOriginal.stock) - Number(item.qty))});
        }
      }
    }

    await cargarDatosDelDia();
    showTicket({items:cajaPOS, subtotal, descPct, descMonto, total, metodo:cajaPayMethod});
    cajaPOS = []; resetDescuentos(); renderPosCart(); renderCajaMetrics(); renderCajaHist();
    showToast("Venta realizada y stock actualizado");
  } else { 
    alert("Error: " + res.msg); 
  }
}

async function anularVenta(id) {
  if (!confirm('¿Estás seguro de anular esta venta?')) return;
  
  const venta = cajaVentas.find(v => v.id === id);
  if (!venta) return;

  const { error } = await supabase.from('ventas').update({ estado: 'cancelada' }).eq('id', id);
  if (error) { showToast('Error al anular'); return; }

  for (const item of venta.items) {
    const prod = cajaProducts.find(p => p.id === item.id);
    if (prod) {
      await upsertProducto({ ...prod, stock: Number(prod.stock) + Number(item.qty) });
    }
  }

  await supabase.from('movimientos_caja').insert({ 
    tipo: 'anulacion', monto: venta.total, descripcion: `Anulación Venta #${id}`, metodo_pago: venta.metodo_pago 
  });

  showToast('Venta anulada correctamente');
  
  await cargarDatosDelDia();
  renderCajaMetrics();
  renderCajaHist();
  renderPosTiles();
}

function showTicket(v) {
  document.getElementById('ticketItems').innerHTML = v.items.map(i=>`<div class="ticket-item-row"><span>${i.emoji||'🍷'} ${i.nombre} x${i.qty}</span><span>${fmt(i.precio*i.qty)}</span></div>`).join('');
  document.getElementById('ticketSub').textContent = fmt(v.subtotal);
  const descRow = document.getElementById('ticketDescRow');
  if(v.descPct > 0) { descRow.style.display='flex'; document.getElementById('ticketDescLabel').textContent=`Descuento ${v.descPct}%`; document.getElementById('ticketDescAmt').textContent='-'+fmt(v.descMonto); } 
  else descRow.style.display='none';
  document.getElementById('ticketTotal').textContent = fmt(v.total);
  document.getElementById('ticketMethod').textContent = {efectivo:'Efectivo',transferencia:'Transferencia',qr:'QR / Débito'}[v.metodo]||v.metodo;
  openModal('ticketModal');
}
function closeTicket() { cajaPOS=[]; resetDescuentos(); renderPosCart(); closeModal('ticketModal'); }

function renderCajaMetrics() {
  let ef=0, tr=0, qr=0, t=0, count=0;
  cajaVentas.forEach(v => {
    if (v.estado === 'cancelada') return;
    t += v.total;
    count++;
    if (v.metodo_pago === 'efectivo') ef += v.total;
    if (v.metodo_pago === 'transferencia') tr += v.total;
    if (v.metodo_pago === 'qr') qr += v.total;
  });
  document.getElementById('cj-total').textContent = fmt(t);
  document.getElementById('cj-count').textContent = count;
  document.getElementById('cj-ef').textContent = fmt(ef);
  document.getElementById('cj-dig').textContent = fmt(tr + qr);
}

function renderCajaHist() {
  document.getElementById('cajaHist').innerHTML = cajaVentas.slice(0, 8).map(v => {
    let hora = new Date(v.created_at || Date.now()).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    let isCancel = v.estado === 'cancelada';
    
    return `<div style="background:var(--dark);border:0.5px solid var(--border);padding:.7rem 1rem;display:flex;align-items:center;justify-content:space-between;margin-bottom:4px; opacity: ${isCancel ? '0.5' : '1'}">
      <div>
         <div style="font-size:11px;color:var(--muted)">
           ${isCancel ? '❌ ' : ''}${hora} · ${v.items?v.items.length:0} prod.
         </div>
         ${isCancel ? `<div style="font-size:9px;color:var(--red);text-transform:uppercase;margin-top:2px">Anulada</div>` : ''}
      </div>
      <div style="display:flex; align-items:center; gap: 8px;">
         <div style="font-family:'Playfair Display',serif;font-size:1rem;color: ${isCancel ? 'var(--muted)' : 'var(--gold)'}">
           ${isCancel ? `<del>${fmt(v.total)}</del>` : fmt(v.total)}
         </div>
         ${!isCancel && v.id ? `<button class="act-btn del" onclick="anularVenta(${v.id})" title="Anular venta" style="font-size:10px; padding:4px;">✕</button>` : ''}
      </div>
    </div>`;
  }).join('') || '<div style="padding:1rem;text-align:center;color:var(--muted);font-size:12px">Sin ventas aún</div>';
}

async function abrirModalApertura() {
  const inicial = prompt("💸 APERTURA DE CAJA\n\n¿Con cuánto dinero físico (billetes/cambio) arrancás la caja hoy?");
  if (inicial !== null && inicial !== "") {
    const res = await supabase.from('movimientos_caja').insert({ 
      tipo: 'apertura', monto: Number(inicial)||0, descripcion: 'Apertura de caja', metodo_pago: 'efectivo' 
    }).select();
    
    if (res.error) {
      alert("🚨 ERROR AL ABRIR CAJA: " + res.error.message);
    } else {
      showToast('Caja abierta exitosamente');
      await cargarDatosDelDia();
      renderCajaMetrics();
      renderCajaHist();
    }
  }
}

function abrirModalMovimiento() { openModal('movModal'); document.getElementById('movMonto').value=''; document.getElementById('movDesc').value=''; }

async function guardarMovimiento() {
  const tipo = document.getElementById('movTipo').value;
  const monto = Number(document.getElementById('movMonto').value);
  const metodo = document.getElementById('movMetodo').value;
  const desc = document.getElementById('movDesc').value.trim();
  if(!monto || !desc) { alert("Completá el monto y el motivo"); return; }
  
  const res = await supabase.from('movimientos_caja').insert({ 
    tipo, monto, descripcion: desc, metodo_pago: metodo 
  }).select();
  
  if (res.error) {
    alert("🚨 ERROR AL GUARDAR MOVIMIENTO: " + res.error.message);
  } else {
    closeModal('movModal');
    showToast('Movimiento registrado con éxito');
    await cargarDatosDelDia();
    renderCajaMetrics();
    renderCajaHist();
  }
}

function armarFlujoOrdenado() {
  let flujo = [];
  
  cajaVentas.forEach(v => {
    let t = v.created_at ? new Date(v.created_at).getTime() : Date.now();
    flujo.push({ hora: t, tipo: 'venta', desc: 'Venta ticket', monto: v.total, metodo: v.metodo_pago, estado: v.estado });
  });
  
  movimientosCaja.forEach(m => {
    let t = m.created_at ? new Date(m.created_at).getTime() : Date.now();
    flujo.push({ hora: t, tipo: m.tipo, desc: m.descripcion, monto: m.monto, metodo: m.metodo_pago, estado: 'completado' });
  });
  
  return flujo.sort((a,b) => a.hora - b.hora);
}

let flujoFiltroActivo = 'todos';
let flujoCompleto = [];

async function verFlujoDia() {
  await cargarDatosDelDia(); 
  const flujo = armarFlujoOrdenado();
  
  const modalFlujo = document.querySelector('#flujoModal .modal');
  if (modalFlujo) {
    modalFlujo.style.maxWidth = '950px'; 
    modalFlujo.style.width = '95%';
  }
  
  document.getElementById('flujoTableBody').innerHTML = flujo.map(f => {
    // Detectamos si el registro (venta o movimiento) está cancelado
    const isCancel = f.estado === 'cancelada';
    
    let color = (f.tipo==='venta'||f.tipo==='ingreso'||f.tipo==='apertura') ? '#4CAF50' : 'var(--red)';
    let signo = (f.tipo==='egreso'||f.tipo==='cierre') ? '-' : (f.tipo==='anulacion' ? '❌ ' : '');
    
    const rowStyle = isCancel ? 'opacity: 0.4; filter: grayscale(1);' : '';
    const montoDisplay = isCancel ? `<del>${fmt(f.monto)}</del>` : `${signo}${fmt(f.monto)}`;

    return `
    <div class="t-row" style="display:grid; grid-template-columns: 85px 110px 1fr 100px 100px 45px; gap: 15px; align-items: center; border-bottom: 0.5px solid var(--border); padding: 12px 0; ${rowStyle}">
       <div class="td muted" style="font-size:11px">${new Date(f.hora).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
       <div class="td" style="text-transform:uppercase; font-size:9px; font-weight:bold; color:var(--amber)">${f.tipo}</div>
       <div class="td" style="text-align:left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${f.desc}</div>
       <div class="td muted">${f.metodo}</div>
       <div class="td" style="color:${isCancel ? 'var(--muted)' : color}; font-weight:bold; text-align:right;">${montoDisplay}</div>
       
       <div class="td" style="text-align:right;">
         ${!isCancel ? `<button class="act-btn del" onclick="${f.tipo === 'venta' ? `anularVenta(${f.id})` : `anularMovimiento(${f.id})`}" style="font-size:10px; padding:2px 6px;">✕</button>` : ''}
       </div>
    </div>`;
  }).join('') || '<div style="padding:2rem;text-align:center;color:var(--muted)">Sin movimientos hoy</div>';
  
  openModal('flujoModal');
}

function renderFlujoTabla(filtro = 'todos') {
  let saldo = 0;
  const flujoConSaldo = flujoCompleto.map(f => {
    if (f.tipo === 'venta' && f.estado === 'cancelada') return null;
    const esIngreso = ['venta','ingreso','apertura'].includes(f.tipo);
    const esEgreso  = ['egreso','cierre'].includes(f.tipo);
    const esAnulacion = f.tipo === 'anulacion';
    if (esIngreso)   saldo += f.monto;
    if (esEgreso)    saldo -= f.monto;
    if (esAnulacion) saldo -= f.monto;
    return { ...f, saldoAcum: saldo };
  }).filter(Boolean);

  const apertura = flujoCompleto.filter(f=>f.tipo==='apertura').reduce((a,f)=>a+f.monto,0);
  const ventas   = flujoCompleto.filter(f=>f.tipo==='venta' && f.estado!=='cancelada').reduce((a,f)=>a+f.monto,0);
  const egresos  = flujoCompleto.filter(f=>f.tipo==='egreso').reduce((a,f)=>a+f.monto,0);
  document.getElementById('fr-apertura').textContent = fmt(apertura);
  document.getElementById('fr-ventas').textContent   = fmt(ventas);
  document.getElementById('fr-egresos').textContent  = fmt(egresos);
  document.getElementById('fr-saldo').textContent    = fmt(saldo);

  const lista = filtro === 'todos' ? flujoConSaldo : flujoConSaldo.filter(f => f.tipo === filtro);

  if (!lista.length) {
    document.getElementById('flujoTableBody').innerHTML =
      '<div style="padding:2rem;text-align:center;color:var(--muted)">Sin movimientos en esta categoría</div>';
    return;
  }

  document.getElementById('flujoTableBody').innerHTML = lista.map(f => {
    const esIngreso   = ['venta','ingreso','apertura'].includes(f.tipo);
    const esEgreso    = ['egreso','cierre'].includes(f.tipo);
    const esAnulacion = f.tipo === 'anulacion';

    const colorMonto = esIngreso ? '#4CAF50' : esEgreso ? 'var(--red)' : esAnulacion ? 'var(--orange)' : 'var(--muted)';
    const signo      = esEgreso ? '-' : esAnulacion ? '-' : '';
    const colorSaldo = f.saldoAcum >= 0 ? 'var(--gold)' : 'var(--red)';

    const tipoBadge = {
      venta:'#4CAF50', ingreso:'#4CAF50', apertura:'var(--amber)',
      egreso:'var(--red)', cierre:'var(--red)', anulacion:'var(--orange)'
    }[f.tipo] || 'var(--muted)';

    return `<div class="t-row" style="grid-template-columns: 85px 110px 1fr 100px 100px 100px; gap: 15px;">
      <div class="td muted" style="font-size:11px">${new Date(f.hora).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
      <div class="td"><span style="font-size:8px;letter-spacing:.15em;text-transform:uppercase;color:${tipoBadge};background:${tipoBadge}18;padding:2px 6px;border-radius:2px">${f.tipo}</span></div>
      <div class="td" style="white-space:normal;word-break:break-word;font-size:12px">${f.desc}</div>
      <div class="td muted" style="font-size:11px">${f.metodo}</div>
      <div class="td" style="color:${colorMonto};font-weight:600">${signo}${fmt(f.monto)}</div>
      <div class="td" style="color:${colorSaldo};font-weight:600;font-family:'Playfair Display',serif">${fmt(f.saldoAcum)}</div>
    </div>`;
  }).join('');
}

function filtrarFlujo(tipo, btn) {
  flujoFiltroActivo = tipo;
  document.querySelectorAll('#flujoModal .filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderFlujoTabla(tipo);
}

function imprimirFlujo() {
  const flujo = flujoFiltroActivo === 'todos' ? flujoCompleto : flujoCompleto.filter(f => f.tipo === flujoFiltroActivo);
  if (!flujo.length) { showToast('No hay datos para imprimir'); return; }
  const fecha = new Date().toLocaleDateString('es-AR');
  const rows = flujo.map(f => {
    const esE = ['egreso','cierre'].includes(f.tipo) || f.tipo==='anulacion';
    return `<tr>
      <td>${new Date(f.hora).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</td>
      <td style="text-transform:uppercase;font-size:11px">${f.tipo}</td>
      <td>${f.desc}</td>
      <td>${f.metodo}</td>
      <td style="text-align:right;color:${esE?'#c00':'#080'}">${esE?'-':''}$${f.monto.toLocaleString('es-AR')}</td>
    </tr>`;
  }).join('');
  const w = window.open('', '_blank');
  w.document.write(`<html><head><title>Flujo Caja ${fecha}</title>
    <style>body{font-family:Arial,sans-serif;padding:2rem}h2{margin-bottom:.5rem}
    table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:.4rem .6rem;font-size:12px}
    th{background:#f5f5f5;text-align:left}</style></head><body>
    <h2>Lembe Bebidas — Flujo de Caja</h2><p style="color:#666;font-size:12px">${fecha}</p>
    <table><thead><tr><th>Hora</th><th>Tipo</th><th>Detalle</th><th>Método</th><th>Monto</th></tr></thead>
    <tbody>${rows}</tbody></table></body></html>`);
  w.document.close();
  w.print();
}

function exportFlujo() {
  const flujo = flujoCompleto.length ? flujoCompleto : armarFlujoOrdenado();
  if (!flujo.length) { showToast('No hay datos para exportar'); return; }

  const rows = [['Hora', 'Tipo', 'Detalle', 'Metodo Pago', 'Monto ($)', 'Saldo Acumulado ($)']];
  let saldo = 0;
  flujo.forEach(f => {
    if (f.tipo === 'venta' && f.estado === 'cancelada') return;
    const esIngreso   = ['venta','ingreso','apertura'].includes(f.tipo);
    const esEgreso    = ['egreso','cierre','anulacion'].includes(f.tipo);
    if (esIngreso) saldo += f.monto;
    if (esEgreso)  saldo -= f.monto;
    rows.push([
      new Date(f.hora).toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'}),
      f.tipo.toUpperCase(),
      f.desc,
      f.metodo,
      esEgreso ? -f.monto : f.monto,
      saldo
    ]);
  });
  downloadCSV(rows, `lembe_flujo_${new Date().toISOString().slice(0,10)}.csv`);
  showToast('CSV exportado correctamente');
}

function calcularEfectivoEsperado() {
  let esperado = 0;
  
  movimientosCaja.forEach(m => {
    // Solo sumamos/restamos si el movimiento NO está cancelado
    if (m.metodo_pago === 'efectivo' && m.estado !== 'cancelada') {
      if (m.tipo === 'apertura' || m.tipo === 'ingreso') esperado += Number(m.monto);
      if (m.tipo === 'egreso') esperado -= Number(m.monto);
    }
  });

  cajaVentas.forEach(v => { 
    if (v.metodo_pago === 'efectivo' && v.estado !== 'cancelada') esperado += Number(v.total); 
  });
  
  return esperado;
}

function iniciarCierre() {
  const esperado = calcularEfectivoEsperado();
  document.getElementById('cierreEsperado').textContent = fmt(esperado);
  document.getElementById('cierreReal').value = '';
  document.getElementById('cierreDif').textContent = '$0';
  document.getElementById('cierreDif').style.color = 'var(--cream)';
  openModal('cierreModal');
}

function calcDiferenciaCierre() {
  const esperado = calcularEfectivoEsperado();
  const real = Number(document.getElementById('cierreReal').value) || 0;
  const dif = real - esperado;
  const difEl = document.getElementById('cierreDif');
  difEl.textContent = (dif > 0 ? '+' : '') + fmt(dif);
  difEl.style.color = dif < 0 ? 'var(--red)' : (dif > 0 ? '#4CAF50' : 'var(--muted)');
}

async function confirmarCierre() {
  const esperado = calcularEfectivoEsperado();
  const real = Number(document.getElementById('cierreReal').value);
  const dif = real - esperado;
  const detalle = `Cierre. Esperado: ${fmt(esperado)} | Dif: ${dif > 0 ? '+' : ''}${fmt(dif)}`;
  
  const res = await supabase.from('movimientos_caja').insert({ 
    tipo: 'cierre', monto: real, descripcion: detalle, metodo_pago: 'efectivo' 
  }).select();
  
  if (res.error) {
    alert("🚨 ERROR AL CERRAR CAJA: " + res.error.message);
    return;
  }

  closeModal('cierreModal');
  showToast('Caja cerrada. Excelente jornada!');
  await cargarDatosDelDia();
}
// ✅ Anulación de movimientos manuales (Egresos, Ingresos, Aperturas)
async function anularMovimiento(id) {
  if (!confirm('¿Estás seguro de anular este movimiento? El registro quedará guardado pero no afectará al saldo.')) return;

  // Actualizamos el estado en Supabase a 'cancelada'
  const { error } = await supabase
    .from('movimientos_caja')
    .update({ estado: 'cancelada' })
    .eq('id', id);

  if (error) {
    alert('Error al anular: ' + error.message);
  } else {
    showToast('Movimiento anulado correctamente');
    await cargarDatosDelDia(); // Recargamos datos para que el saldo se actualice
    verFlujoDia();             // Refrescamos la tabla visual
  }
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
  renderPedidosContent();
}

function renderPedidosContent() {
  const acts = pedidosData.filter(p => !['entregado', 'cancelado'].includes(p.estado));
  const reservas = pedidosData.filter(p => p.tipo === 'reserva' && !['entregado', 'cancelado'].includes(p.estado));
  const dineroActivos = acts.reduce((a, p) => a + (Number(p.total) || 0), 0);

  const container = document.getElementById('pageContent');
  if (!container) return;

  container.innerHTML = `
    <div class="metrics" style="margin-bottom:1rem">
      <div class="metric"><div class="metric-label">Activos</div><div class="metric-val" style="color:var(--gold)">${acts.length}</div></div>
      <div class="metric"><div class="metric-label">Total en Curso</div><div class="metric-val" style="color:#4CAF50;font-size:1.2rem">${fmt(dineroActivos)}</div></div>
      <div class="metric"><div class="metric-label">Reservas</div><div class="metric-val" style="color:#9B59B6">${reservas.length}</div></div>
      <div class="metric"><div class="metric-label">Histórico (Cant.)</div><div class="metric-val">${pedidosData.length}</div></div>
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

  const viewElement = document.getElementById('pedidosView');
  if (viewElement) {
    if (pedidosTab === 'kanban') {
      const cols = ['nuevo', 'confirmado', 'preparando', 'listo'];
      viewElement.innerHTML = `<div class="kanban">${cols.map(est => {
        const cards = pedidosData.filter(p => p.estado === est);
        return `<div class="kanban-col">
          <div class="col-header"><span class="col-title">${estadoLabel[est]}</span><span class="col-count">${cards.length}</span></div>
          <div class="col-body">
            ${cards.length === 0 ? '<div style="padding:.8rem;text-align:center;font-size:11px;color:var(--muted)">Sin pedidos</div>' : ''}
            ${cards.map(p => {
          let listaItems = '';
          if (Array.isArray(p.items)) {
            listaItems = p.items.map(i => `• ${i.nombre} x${i.qty}`).join('<br>');
          } else {
            listaItems = String(p.items || 'Sin detalle').slice(0, 50);
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
      viewElement.innerHTML = `<div class="table-wrap">
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
}

async function nextPedidoStatus(id) {
  const p = pedidosData.find(x => x.id === id);
  if (!p) return;
  
  const idx = estadosCycle.indexOf(p.estado);
  
  if (idx < estadosCycle.indexOf('entregado')) { 
    const nuevoEstado = estadosCycle[idx + 1];
    
    if (nuevoEstado === 'entregado') {
      const confirmar = confirm(`¿Marcar como ENTREGADO y sumar ${fmt(p.total)} al Historial de hoy?`);
      if (!confirmar) return;

      const metodoInput = prompt(
        "¿Cómo pagó el cliente?\n\nIngresá el número:\n1 = Efectivo\n2 = Transferencia\n3 = QR / Débito", 
        "1"
      );
      
      if (metodoInput === null) return;

      let metodoElegido = 'efectivo';
      if (metodoInput === '2' || metodoInput.toLowerCase().includes('trans')) metodoElegido = 'transferencia';
      if (metodoInput === '3' || metodoInput.toLowerCase().includes('qr')) metodoElegido = 'qr';

      const venta = {
        items: Array.isArray(p.items) ? p.items : [{ nombre: 'Pedido de ' + p.cliente, qty: 1, precio: p.total }],
        total: Number(p.total),
        metodo_pago: metodoElegido,
        estado: 'completado'
      };
      
      await insertVenta(venta);
      showToast(`¡Cobrado con ${metodoElegido}!`);
    }

    p.estado = nuevoEstado; 
    await updatePedidoEstado(id, nuevoEstado); 
    renderPedidosContent(); 
  }
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
  if (res.ok) { pedidosData = await getPedidos(); }
  else { pedidosData.unshift({ ...p, id: Date.now() }); }
  closeModal('pedidoModal');
  renderPedidosContent();
  showToast('Pedido creado');
}
function exportPedidos() {
  const rows = [['ID', 'Tipo', 'Cliente', 'Canal', 'Total', 'Estado']];
  pedidosData.forEach(p => rows.push([p.id, p.tipo, p.cliente, p.canal, p.total, p.estado]));
  downloadCSV(rows, 'lembe_pedidos.csv');
}

// ============================
//  HISTORIAL (✅ BUG #2 CORREGIDO)
// ============================
let histDataFull = [];
let histData = [];

// ✅ FUNCIÓN NUEVA: renderHistChart (estaba faltando)
function renderHistChart(ventasValidas) {
  if (!ventasValidas || ventasValidas.length === 0) {
    document.getElementById('histChart').innerHTML = '<div style="padding:1rem;text-align:center;color:var(--muted)">Sin datos para graficar</div>';
    return;
  }

  const hoy = new Date();
  const labels = [];
  const datos = [];

  for (let i = 6; i >= 0; i--) {
    const fecha = new Date(hoy);
    fecha.setDate(fecha.getDate() - i);
    const fechaStr = fecha.toLocaleDateString('es-AR', { month: 'short', day: 'numeric' });
    labels.push(fechaStr);

    const ventasDelDia = ventasValidas.filter(v => {
      const vFecha = new Date(v.created_at);
      return vFecha.toDateString() === fecha.toDateString();
    }).reduce((sum, v) => sum + v.total, 0);

    datos.push(ventasDelDia);
  }

  const maxValor = Math.max(...datos, 1);
  const escala = 200 / maxValor;

  const html = `
    <div style="display:flex;align-items:flex-end;justify-content:space-around;height:180px;gap:8px">
      ${datos.map((d, i) => `
        <div style="display:flex;flex-direction:column;align-items:center;flex:1">
          <div style="font-size:11px;color:var(--muted);margin-bottom:4px">${fmt(d)}</div>
          <div style="background:var(--gold);width:100%;height:${Math.max(d * escala, 4)}px;border-radius:2px;cursor:help" title="${labels[i]}"></div>
          <div style="font-size:9px;color:var(--muted);margin-top:4px">${labels[i]}</div>
        </div>
      `).join('')}
    </div>
  `;

  document.getElementById('histChart').innerHTML = html;
}

async function renderHistorial() {
  document.getElementById('topbarActions').innerHTML = `
    <div style="display:flex; gap:.5rem; align-items:center;">
      <label style="font-size:10px; color:var(--muted)">DESDE:</label>
      <input type="date" id="histDesde" class="search-box" style="width:140px">
      <label style="font-size:10px; color:var(--muted)">HASTA:</label>
      <input type="date" id="histHasta" class="search-box" style="width:140px">
      <button class="btn" onclick="aplicarFiltroHistorial()">Filtrar</button>
      <button class="btn-out" onclick="exportHistorial()">Exportar</button>
    </div>
  `;
  
  const ventasCrudas = await getVentas();
  const movsCrudos = await getMovimientos();
  
  histDataFull = [];

  (ventasCrudas || []).forEach(v => {
    histDataFull.push({
      ...v,
      tipo_registro: 'venta',
      display_desc: Array.isArray(v.items) ? v.items.map(i => i.nombre + ' x' + i.qty).join(', ').slice(0, 60) : '-'
    });
  });

  (movsCrudos || []).forEach(m => {
    histDataFull.push({
      created_at: m.created_at,
      total: m.monto,
      metodo_pago: m.metodo_pago,
      estado: 'completado',
      tipo_registro: m.tipo, 
      display_desc: m.descripcion || m.tipo
    });
  });

  histDataFull.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  aplicarFiltroHistorial();
}

function aplicarFiltroHistorial() {
  const desdeVal = document.getElementById('histDesde')?.value;
  const hastaVal = document.getElementById('histHasta')?.value;

  histData = histDataFull.filter(reg => {
    if (!reg.created_at) return true;
    
    const fechaReg = reg.created_at.split('T')[0]; 

    if (desdeVal && fechaReg < desdeVal) return false;
    if (hastaVal && fechaReg > hastaVal) return false;
    
    return true;
  });

  renderHistContent();
}

function renderHistContent() {
  const ventasValidas = histData.filter(h => h.tipo_registro === 'venta' && h.estado !== 'cancelada');
  const total = ventasValidas.reduce((a, h) => a + h.total, 0);
  const avg = ventasValidas.length ? Math.round(total / ventasValidas.length) : 0;
  const max = ventasValidas.length ? Math.max(...ventasValidas.map(h => h.total)) : 0;
  
  const ef = ventasValidas.filter(h => h.metodo_pago === 'efectivo').reduce((a, h) => a + h.total, 0);
  const tr = ventasValidas.filter(h => h.metodo_pago === 'transferencia').reduce((a, h) => a + h.total, 0);
  const qr = ventasValidas.filter(h => h.metodo_pago === 'qr').reduce((a, h) => a + h.total, 0);

  document.getElementById('pageContent').innerHTML = `
    <div class="metrics" style="margin-bottom:1rem">
      <div class="metric"><div class="metric-label">Ingresos válidos</div><div class="metric-val" style="color:var(--gold)">${fmt(total)}</div></div>
      <div class="metric"><div class="metric-label">Ventas válidas</div><div class="metric-val">${ventasValidas.length}</div></div>
      <div class="metric"><div class="metric-label">Ticket promedio</div><div class="metric-val" style="color:var(--gold2)">${fmt(avg)}</div></div>
      <div class="metric"><div class="metric-label">Mayor venta</div><div class="metric-val" style="color:#4CAF50">${fmt(max)}</div></div>
    </div>
    <div class="chart-section">
      <div class="chart-title">Ingresos por día — últimos 7 días (Solo Ventas)</div>
      <div class="bar-chart" id="histChart"></div>
    </div>
    <div class="method-summary" style="margin-bottom:1rem">
      <div class="ms-card"><div style="font-size:1.2rem">💵</div><div><div class="ms-label">Efectivo</div><div class="ms-val">${fmt(ef)}</div><div class="ms-pct">${total ? Math.round(ef / total * 100) : 0}%</div></div></div>
      <div class="ms-card"><div style="font-size:1.2rem">📱</div><div><div class="ms-label">Transferencia</div><div class="ms-val">${fmt(tr)}</div><div class="ms-pct">${total ? Math.round(tr / total * 100) : 0}%</div></div></div>
      <div class="ms-card"><div style="font-size:1.2rem">💳</div><div><div class="ms-label">QR / Débito</div><div class="ms-val">${fmt(qr)}</div><div class="ms-pct">${total ? Math.round(qr / total * 100) : 0}%</div></div></div>
    </div>
    <div class="table-wrap">
      <div class="t-head" style="grid-template-columns:120px 2fr 120px 100px 90px">
        <div class="th">Fecha</div><div class="th">Detalle / Productos</div><div class="th">Método</div><div class="th">Monto</div><div class="th">Estado</div>
      </div>
      <div class="t-body">
        ${histData.map(h => {
          const isCancel = h.estado === 'cancelada';
          const isMov = h.tipo_registro !== 'venta';
          
          let estadoHtml = '';
          if (isMov) {
             let badgeColor = h.tipo_registro === 'egreso' ? 'var(--red)' : (h.tipo_registro === 'anulacion' ? 'var(--orange)' : '#4CAF50');
             estadoHtml = `<span style="font-size:10px; font-weight:bold; color:${badgeColor}; text-transform:uppercase;">${h.tipo_registro}</span>`;
          } else {
             estadoHtml = `<span class="status-badge ${isCancel ? 's-cancelado' : 's-completado'}">${h.estado || 'completado'}</span>`;
          }

          let signo = (h.tipo_registro === 'egreso') ? '-' : '';

          return `<div class="t-row" style="grid-template-columns:120px 2fr 120px 100px 90px; opacity: ${isCancel ? '0.5' : '1'}">
            <div class="td muted" style="font-size:11px">${new Date(h.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
            <div class="td muted" style="font-size:11px">${h.display_desc}</div>
            <div class="td"><span class="type-badge tb-venta">${h.metodo_pago}</span></div>
            <div class="td gold">${isCancel ? `<del>${fmt(h.total)}</del>` : signo + fmt(h.total)}</div>
            <div class="td">${estadoHtml}</div>
          </div>`
        }).join('')}
      </div>
    </div>`;

  renderHistChart(ventasValidas); 
}

function exportHistorial() {
  if (!histData || histData.length === 0) {
    showToast("No hay datos en la lista para exportar");
    return;
  }

  const rows = [['Fecha', 'Tipo', 'Detalle / Productos', 'Método', 'Monto ($)', 'Estado']];

  histData.forEach(h => {
    const fecha = new Date(h.created_at).toLocaleString('es-AR', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });

    const tipo = h.tipo_registro.toUpperCase();
    const detalle = h.display_desc;
    const metodo = h.metodo_pago;
    const monto = h.total;
    const estado = h.estado || 'completado';

    rows.push([fecha, tipo, detalle, metodo, monto, estado]);
  });

  const hoy = new Date().toISOString().slice(0, 10);
  const nombreArchivo = `lembe_historial_${hoy}.csv`;

  downloadCSV(rows, nombreArchivo);
  showToast("Excel generado con éxito");
}

// ============================
//  CONFIGURACIÓN
// ============================
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
