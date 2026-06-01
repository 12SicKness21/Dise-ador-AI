# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Next.js app (root)
```bash
pnpm dev          # desarrollo local en localhost:3000
pnpm build        # build de producción
pnpm lint         # ESLint
```

### Cloud Functions (`functions/`)
```bash
cd functions
npm run build          # compila TypeScript → lib/
npm run build:watch    # watch mode
npm run deploy         # firebase deploy --only functions
```

### Firebase (desde raíz)
```bash
firebase deploy --only firestore:rules   # solo reglas Firestore
firebase deploy --only storage           # solo reglas Storage
firebase functions:secrets:set GEMINI_API_KEY  # configurar secret de producción
```

## Arquitectura general

El proyecto es una PWA mobile-first (Next.js 16 App Router + Tailwind 4) que permite a usuarios subir fotos de zapatillas y generar imágenes profesionales con IA. Tiene dos partes independientes:

### 1. Frontend — `app/` + `components/` + `lib/`

**Routing (App Router):**
- `app/(auth)/login/` — pantalla de login con Firebase Auth (email/password)
- `app/(app)/upload/` — pantalla principal: subir foto, elegir estilo, ver resultados
- `app/(app)/orders/` — historial de pedidos
- `app/admin/prompts/` — panel admin para CRUD de prompts (protegido por email)
- `app/page.tsx` — solo redirige a `/upload` o `/login`

**Flujo de la app:**
1. Usuario sube imagen → `lib/storage.ts:uploadOriginal()` la guarda en `uploads/{uid}/{orderId}/original.jpg`
2. Ese path específico dispara la Cloud Function automáticamente
3. Cliente escucha el doc de Firestore en tiempo real via `onSnapshot` hasta que status cambie a `done` o `error`
4. Al terminar, los resultados son rutas `gs://` que se resuelven a HTTPS con `lib/download.ts:resolveGsUrl()`

**Auth:**
- `components/AuthProvider.tsx` expone `{ user, loading, isAdmin }` via contexto
- Admin se determina comparando `user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL`
- `app/(app)/layout.tsx` y `app/admin/layout.tsx` protegen sus rutas con este contexto

### 2. Cloud Functions — `functions/src/`

Un único trigger: `processUpload` (`onObjectFinalized`) escucha `uploads/{uid}/{orderId}/original.jpg`.

**Flujo interno:**
1. Descarga la imagen de Storage
2. Lee el campo `promptName` del doc de Firestore del pedido
3. Obtiene el prompt activo con ese nombre desde la colección `prompts`
4. Llama a `generateImage()` → Gemini 2.5 Flash (`gemini-2.5-flash-image`) vía `@google/genai`
5. Guarda el PNG resultante en `orders/{orderId}/{slug}.png`
6. Actualiza el doc de Firestore con `status: "done"` y la ruta `gs://`

Configuración del trigger: región `southamerica-west1`, timeout 540s, memoria 1GiB, secret `GEMINI_API_KEY`.

### Firestore — colecciones

| Colección | Quién escribe | Quién lee |
|-----------|--------------|-----------|
| `prompts` | Admin (email hardcodeado en reglas: `admin@causas.com`) | Cualquier usuario autenticado |
| `orders`  | Cliente crea con `status: "pending"`; Cloud Function hace update | Dueño del pedido (`uid` match) |

> ⚠️ Inconsistencia conocida: las reglas de Firestore para `prompts` usan `admin@causas.com` hardcodeado, pero `lib/auth.ts` usa `NEXT_PUBLIC_ADMIN_EMAIL`. Si se cambia el email de admin, hay que actualizar ambos lugares.

### Paleta de colores (UI)

El diseño sigue la paleta "Google Pixel":
```
Obsidiana    #2D2B2D   (header, botones primarios)
Glaciar      #A8C4D4   (acentos, botón descargar)
Piedra Lunar #C8BAA8   (bordes, placeholders)
Porcelana    #F5F2EC   (fondo general)
Spearmint    #3EBF85   (seleccionado, check)
Coral        #F5856A   (errores, badges)
Avellana     #B39C80   (textos secundarios)
Sage         #8DAF9A   (links suaves)
```

No se usa Tailwind para colores — todos los colores de la paleta van como `style={{ color: "..." }}` inline.

## Variables de entorno

El archivo `.env.example` lista todas las variables necesarias. El secret de Gemini **nunca va en `.env`** — solo en Firebase Secrets:
```bash
firebase functions:secrets:set GEMINI_API_KEY
```

## Assets públicos

- `public/logo/logo.webp` — logo rectangular (usado en admin header)
- `public/logo/Logo_circulo.webp` — logo circular (usado en login y upload header)
- `public/logo/favicon.ico` — favicon (copiado también a `app/favicon.ico`)
- `public/styles/*.webp` — imágenes de vista previa para cada estilo/prompt en la UI
- `public/icons/` — iconos PWA (192px, 512px, 512px maskable)

Los nombres de archivo en `public/styles/` deben coincidir con el slug del nombre del prompt (generado por `styleImage()` en `upload/page.tsx`).
