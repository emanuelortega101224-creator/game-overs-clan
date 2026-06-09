# Desplegar en Vercel

El proyecto está configurado para construirse en dos targets sin tocar código:

- **Lovable / Cloudflare Workers** (por defecto): salida en `dist/`, usada por el
  botón Publicar de Lovable.
- **Vercel** (cuando la variable de entorno `VERCEL=1` está presente, lo cual
  Vercel inyecta automáticamente en cada build): nitro usa el preset `vercel`
  y genera `.vercel/output/` que Vercel sirve directamente.

## Pasos

1. Sube el repo a GitHub (botón GitHub arriba a la derecha en Lovable).
2. En https://vercel.com → **Add New… → Project** e importa el repo.
3. Framework Preset: **Other** (lo deja vacío, `vercel.json` ya define
   `buildCommand` y `installCommand`).
4. Añade las variables de entorno del backend:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`
   - (Server) `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
     `SUPABASE_SERVICE_ROLE_KEY` si usas server functions/admin.
5. Deploy.

## Notas

- No quites `src/server.ts` ni cambies `tanstackStart.server.entry`: lo usa
  Cloudflare. En Vercel el preset de nitro envuelve ese mismo entry.
- Si añades dominios personalizados, hazlo en el dashboard de Vercel.
- El backend (Lovable Cloud / Supabase) sigue siendo el mismo en ambos
  hostings; cambia solo el frontend/SSR.