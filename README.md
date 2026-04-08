# Lembe Bebidas 🍷

Sitio web y panel de gestión para **Lembe Bebidas** — tienda de vinos, espumantes, cervezas artesanales y más.

## Estructura del proyecto

```
lembe-bebidas/
├── index.html          → Página web pública (clientes)
├── admin/
│   └── index.html      → Panel de gestión (solo dueños)
├── css/
│   └── web.css         → Estilos de la web pública
├── js/
│   ├── web.js          → Lógica de la web pública
│   └── supabase.js     → Conexión a base de datos
├── admin/
│   ├── css/admin.css   → Estilos del panel
│   └── js/admin.js     → Lógica del panel admin
└── vercel.json         → Configuración de Vercel
```

## Stack

| Servicio | Uso | Costo |
|----------|-----|-------|
| [Vercel](https://vercel.com) | Hosting web | Gratis |
| [Supabase](https://supabase.com) | Base de datos | Gratis |
| [MercadoPago](https://mercadopago.com.ar) | Pagos online | Solo comisión |

## Despliegue rápido

1. Subir este repositorio a GitHub como `lembe-bebidas`
2. Conectar el repo en [vercel.com](https://vercel.com)
3. Crear proyecto en [supabase.com](https://supabase.com)
4. Copiar las claves de Supabase en `js/supabase.js`
5. ¡Listo! La web queda online automáticamente

## Credenciales admin (cambiar antes de publicar)

- Usuario: `admin`
- Contraseña: `lembe2026`

## Contacto

Instagram: [@lembe_bebidas](https://instagram.com/lembe_bebidas)
