// =============================================
//  SUPABASE CONFIG — Lembe Bebidas
//  Reemplazá las dos variables de abajo con
//  tus credenciales de supabase.com
// =============================================

const SUPABASE_URL = 'https://vlmehdraehakytqtggip.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsbWVoZHJhZWhha3l0cXRnZ2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NjUwOTEsImV4cCI6MjA5MTI0MTA5MX0.SRG8JGa2ghIbjleP8PHzfG8LzwazUSoOWUPCyKmdZ5g';

// Cliente Supabase (cargado desde CDN en el HTML)
if (typeof supabase === 'undefined') { var supabase = null; }

function initSupabase() {
  if (typeof window.supabase !== 'undefined') {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('✓ Supabase conectado');
  } else {
    console.warn('Supabase SDK no cargado — usando datos locales');
  }
}

// =============================================
//  PRODUCTOS
// =============================================

async function getProductos(categoria = null) {
  if (!supabase) return getProductosLocales(categoria);
  let query = supabase.from('productos').select('*').order('nombre');
  if (categoria && categoria !== 'todos') query = query.eq('categoria', categoria);
  const { data, error } = await query;
  if (error) { console.error(error); return getProductosLocales(categoria); }
  return data;
}

async function upsertProducto(producto) {
  if (!supabase) return { ok: false, msg: 'Sin conexión a Supabase' };
  const { data, error } = await supabase.from('productos').upsert(producto).select();
  return error ? { ok: false, msg: error.message } : { ok: true, data };
}

async function deleteProducto(id) {
  if (!supabase) return { ok: false };
  const { error } = await supabase.from('productos').delete().eq('id', id);
  return { ok: !error };
}

// =============================================
//  PEDIDOS
// =============================================

async function getPedidos() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('pedidos').select('*').order('created_at', { ascending: false });
  if (error) return [];
  return data;
}

async function insertPedido(pedido) {
  if (!supabase) return { ok: false, msg: 'Sin conexión a Supabase' };
  const { data, error } = await supabase.from('pedidos').insert(pedido).select();
  return error ? { ok: false, msg: error.message } : { ok: true, data };
}

async function updatePedidoEstado(id, estado) {
  if (!supabase) return { ok: false };
  const { error } = await supabase.from('pedidos').update({ estado }).eq('id', id);
  return { ok: !error };
}

// =============================================
//  VENTAS / HISTORIAL
// =============================================

async function insertVenta(venta) {
  if (!supabase) return { ok: false };
  const { data, error } = await supabase.from('ventas').insert(venta).select();
  return error ? { ok: false, msg: error.message } : { ok: true, data };
}

async function getVentas(fechaDesde = null) {
  if (!supabase) return [];
  let query = supabase.from('ventas').select('*').order('created_at', { ascending: false });
  if (fechaDesde) query = query.gte('created_at', fechaDesde);
  const { data, error } = await query;
  return error ? [] : data;
}

// =============================================
//  DATOS LOCALES (fallback sin Supabase)
// =============================================

function getProductosLocales(categoria) {
  const todos = [
    { id: 1, nombre: 'Malbec Reserva', categoria: 'Vinos', precio: 4800, stock: 42, stock_minimo: 10, origen: 'Mendoza, Argentina', descripcion: 'Tinto seco · Notas de ciruela y chocolate amargo.', destacado: true, emoji: '🍷' },
    { id: 2, nombre: 'Torrontés Clásico', categoria: 'Vinos', precio: 3200, stock: 18, stock_minimo: 8, origen: 'Salta, Argentina', descripcion: 'Blanco seco · Floral y frutal.', destacado: false, emoji: '🍷' },
    { id: 3, nombre: 'Cabernet Sauvignon', categoria: 'Vinos', precio: 5100, stock: 7, stock_minimo: 10, origen: 'Mendoza, Argentina', descripcion: 'Tinto intenso · Taninos firmes.', destacado: false, emoji: '🍷' },
    { id: 4, nombre: 'Extra Brut Rosé', categoria: 'Espumantes', precio: 6200, stock: 14, stock_minimo: 6, origen: 'Río Negro, Argentina', descripcion: 'Espumante rosado · Burbujas finas.', destacado: true, emoji: '🥂' },
    { id: 5, nombre: 'IPA Artesanal', categoria: 'Cervezas', precio: 1500, stock: 55, stock_minimo: 12, origen: 'Buenos Aires', descripcion: 'Ale lupulada · Amargor cítrico.', destacado: true, emoji: '🍺' },
    { id: 6, nombre: 'Whisky Single Malt', categoria: 'Espirituosas', precio: 18500, stock: 11, stock_minimo: 3, origen: 'Escocia', descripcion: '12 años en roble · Ahumado suave.', destacado: true, emoji: '🥃' },
    { id: 7, nombre: 'Gin Botánico', categoria: 'Espirituosas', precio: 8900, stock: 9, stock_minimo: 4, origen: 'Buenos Aires', descripcion: 'Destilado con hierbas locales.', destacado: false, emoji: '🥃' },
    { id: 8, nombre: 'Agua Mineral x12', categoria: 'Sin alcohol', precio: 900, stock: 30, stock_minimo: 10, origen: 'Argentina', descripcion: 'Pack 12 unidades 500ml.', destacado: false, emoji: '💧' },
  ];
  if (!categoria || categoria === 'todos') return todos;
  return todos.filter(p => p.categoria === categoria);
}

// =============================================
//  SQL para crear las tablas en Supabase
//  Ejecutar en: Supabase → SQL Editor
// =============================================
/*
-- Tabla productos
create table productos (
  id bigint generated always as identity primary key,
  nombre text not null,
  categoria text not null,
  precio numeric not null default 0,
  stock integer not null default 0,
  stock_minimo integer not null default 5,
  origen text,
  descripcion text,
  destacado boolean default false,
  emoji text default '🍷',
  created_at timestamptz default now()
);

-- Tabla pedidos
create table pedidos (
  id bigint generated always as identity primary key,
  tipo text not null default 'pedido',
  cliente text not null,
  telefono text,
  canal text default 'WhatsApp',
  items jsonb,
  total numeric default 0,
  entrega text default 'Retiro en local',
  estado text default 'nuevo',
  notas text,
  created_at timestamptz default now()
);

-- Tabla ventas
create table ventas (
  id bigint generated always as identity primary key,
  items jsonb,
  total numeric not null,
  metodo_pago text default 'efectivo',
  estado text default 'completado',
  created_at timestamptz default now()
);

-- Habilitar acceso público (anon key)
alter table productos enable row level security;
alter table pedidos enable row level security;
alter table ventas enable row level security;

create policy "public read productos" on productos for select using (true);
create policy "public insert pedidos" on pedidos for insert with check (true);
create policy "admin all productos" on productos for all using (true);
create policy "admin all pedidos" on pedidos for all using (true);
create policy "admin all ventas" on ventas for all using (true);
*/
