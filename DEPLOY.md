# Guía de deploy — Lembe Bebidas
## Paso 1 — Subir a GitHub

1. Abrí github.com e iniciá sesión
2. Clic en **"New repository"** (botón verde arriba a la derecha)
3. Nombre: `lembe-bebidas`
4. Visibility: **Public** (o Private si preferís)
5. Clic en **"Create repository"**
6. Seguí las instrucciones que te da GitHub para subir los archivos:

```bash
git init
git add .
git commit -m "Lembe Bebidas - primera versión"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/lembe-bebidas.git
git push -u origin main
```

O más simple: arrastrá la carpeta `lembe-bebidas` directamente a la página del repo en GitHub.

---

## Paso 2 — Publicar en Vercel

1. Abrí vercel.com e iniciá sesión con tu cuenta GitHub
2. Clic en **"Add New Project"**
3. Seleccioná el repositorio `lembe-bebidas`
4. Framework Preset: **Other** (no es Next.js, es HTML puro)
5. Clic en **Deploy**
6. En 30 segundos tenés la URL: `lembe-bebidas.vercel.app`

---

## Paso 3 — Configurar Supabase (para base de datos real)

1. Abrí supabase.com y creá una cuenta gratuita
2. Clic en **"New project"**
3. Nombre: `lembe-bebidas`
4. Elegí región: South America (São Paulo)
5. Clic en **Create project** y esperá ~2 minutos

### Crear las tablas:
1. En el panel de Supabase, ir a **SQL Editor**
2. Copiar y pegar el SQL que está al final del archivo `js/supabase.js`
3. Clic en **Run**

### Obtener las credenciales:
1. En Supabase, ir a **Settings → API**
2. Copiar **Project URL** y **anon public key**
3. Abrir `js/supabase.js` y reemplazar:
   - `https://TU_PROYECTO.supabase.co` → tu URL
   - `TU_ANON_KEY_AQUI` → tu key
4. Guardar y hacer push a GitHub (Vercel se actualiza solo)

---

## Paso 4 — WhatsApp

En `js/web.js`, línea 5, reemplazá:
```js
const WA_NUMBER = '5491100000000';
```
Con el número de WhatsApp del local en formato internacional (sin + ni espacios).
Ejemplo para Argentina: `5491165432100` (549 + código área sin 0 + número sin 15)

---

## Paso 5 — Dominio propio (opcional, ~$5/año)

1. Comprá un dominio en nic.ar (.com.ar) o en namecheap.com (.com)
2. En Vercel → Settings → Domains → agregar el dominio
3. Seguir las instrucciones DNS que te da Vercel

---

## URLs finales

- **Web pública**: `https://lembe-bebidas.vercel.app`
- **Panel admin**: `https://lembe-bebidas.vercel.app/admin`
- **Credenciales admin**: usuario `admin` / contraseña `lembe2026`

⚠️ Antes de publicar, cambiá la contraseña desde el panel → Configuración → Seguridad
