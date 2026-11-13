# Plan: envío mensual de predicciones por correo (Dinozodiaco)

Fecha: 2026-11-12
Proyecto: Dinozodiaco — Next.js 16.4.2 (`cacheComponents: true`), React 19, Resend SDK v6, Vercel + GitHub Actions
Deploy: Vercel (`https://dinozodiaco.com`) + GitHub Actions como scheduler (ver Tarea 10)

> Documento autocontenido. Agentes nuevos ejecutan tareas sin repetir la auditoría. Los números de línea corresponden al estado del repo al escribir el plan; si cambian, usar nombres de archivo/función.
>
> Regla de ejecución: **cada tarea es independiente**. Un agente ejecuta SOLO las tareas asignadas, no lee el trabajo de otros ni verifica tareas ajenas. El único punto de contacto entre tareas son los contratos de tipos definidos en la Tarea 1 (`lib/predicciones.ts`) y los endpoints descritos aquí.

---

## 0. Contexto verificado (hechos, no suposiciones)

- `app/actions.ts:32` llama `resend.contacts.create({ email, unsubscribed: false, properties: { signo, privacidad_aceptada } })`.
- **Las suscripciones SÍ funcionan en producción** (el usuario + una amiga se inscribieron). Conclusión: las contact properties `signo` y `privacidad_aceptada` **ya existen** en la cuenta de Resend (la API de Resend rechaza properties con keys inexistentes). El setup de la Tarea 6 debe ser idempotente y no romper nada.
- Los contactos creados **no tienen segment** → no entran en ningún Broadcast. Falta segment + topic.
- `data/signos.ts` tiene 12 signos con `slug` (`01-tiranosaurio` … `12-espinosaurio`), `nombre`, `tarjeta`, `constelacion`, `elemento`, `modalidad`, `era`, `frase`, etc.
- La predicción mensual está **hardcodeada** en `app/page.tsx:38` ("Octubre · Edición n.º 2") y `app/page.tsx:50-56` (texto general).
- Repo GitHub **público** (`quowtf/dinozodiaco`) → el contenido de predicciones NO puede vivir en un archivo del repo si queremos que no sea público.
- Next 16 con `cacheComponents: true`: los Route Handlers `GET` se prerenderizan; `POST` nunca se cachea. **Prohibido** exportar `dynamic`/`revalidate`/`fetchCache`/`runtime` (error de build). Los helpers que leen datos externos usan `"use cache"` + `cacheLife`.
- `app/page.tsx:36-62` renderiza la sección "Predicción mensual". `app/aviso-de-privacidad/page.tsx` ya menciona el enlace de baja.
- Resend: Audiences → **Segments** (los audiences están deprecados). El SDK v6 expone `resend.segments`, `resend.topics`, `resend.contactProperties`, `resend.broadcasts`, `resend.contacts`.
- `resend.contacts.list()` **no** devuelve `properties`; hay que usar `resend.contacts.get({ email })` para leerlas.
- Plan Resend Free: marketing (Broadcasts) hasta 1.000 contactos/mes, dominios ilimitados para broadcasts, sin coste. Rate limit: 10 req/s por equipo.
- Broadcasts gestionan la baja one-click con `{{{RESEND_UNSUBSCRIBE_URL}}}` y la lista de supresión. No hace falta pixel de apertura (tracking es server-side, sin imagen).

---

## 1. Decisiones cerradas (no re-debatir)

| Tema | Decisión |
|---|---|
| Transporte | Broadcasts de Resend (marketing), **no** `emails.send` transaccional. Da baja one-click y supresión automáticas. |
| Segmentación | **12 segments**, uno por signo (`dinozodiaco:01-tiranosaurio` …). Un contacto pertenece al segment de su signo. El texto del correo es estático por signo → no hace falta templating por contacto. |
| Topics | 2 topics: `predicciones` (opt_in) y `merch` (opt_in). El mensual usa `predicciones`; los avisos de tienda usarán `merch`. |
| Almacenamiento de contenido | **Upstash Redis free** vía REST con `fetch` (sin SDK nuevo). Key por mes: `prediccion:YYYY-MM`, valor = string JSON. Privado. |
| Email | Sin imágenes. Sin `<img>`, sin SVG inline (Gmail/Outlook lo descartan). Solo texto + CSS inline + glifos Unicode del sitio (`☄ ✦ ◐`). Versión `text/plain` gemela. |
| Layout email | Tablas, ancho 600 px, estilos inline, fondo `#15223b`, crema `#efe6d2`, oro `#d69a2d`. |
| Hora de envío | Configurable, **reloj de 24 h**. Default `18:06` hora Ciudad de México (`America/Mexico_City`). Se evalúa dentro de la app, no en el cron. |
| Scheduler | **GitHub Actions** con cron `6,21,36,51 * * * *` (cada 15 min). **No** se usa Vercel Cron/Schedules: el plan Vercel Free del usuario ya tiene su único cron ocupado. La ventana horaria y la deduplicación se evalúan dentro de la app (Tarea 5), así que la hora exacta la define `PREDICCIONES_HORA`, no el cron. |
| Endpoint de envío | `POST /api/cron/predicciones` (nunca `GET`, para no chocar con el prerender de `cacheComponents`). |
| Origen del contenido | Un tercero genera los textos. Se le pide con el formato de la Tarea 12. Fallback: manda textos sueltos y un script los ensambla (Tarea 8). |
| Privacidad del contenido | La predicción **general** es pública (ya vive en la home). Las **12 predicciones por signo** son privadas: solo se leen server-side y van al correo de ese signo. |

---

## 2. Contratos compartidos (los define la Tarea 1, nadie más los escribe)

### 2.1 TypeScript — `lib/predicciones.ts` (Tarea 1)

```ts
export interface PrediccionTags { tags: string[] }

export interface PrediccionBloque {
  titulo: string;
  texto: string;
  tags: string[];
}

export interface PrediccionMes {
  mes: string;                 // "2026-12"
  edicion: number;             // 3
  general: PrediccionBloque;
  signos: Record<string, PrediccionBloque>; // clave = slug de data/signos.ts
}

export interface ResultadoValidacion {
  ok: boolean;
  errores: string[];
}

// Claves y helpers (implementados en Tarea 1)
export function clavesSignosEsperadas(): string[];
export function validarPrediccion(datos: unknown): ResultadoValidacion;
export function prediccionDelMes(mes: string): Promise<PrediccionMes>; // lee Upstash, ver Tarea 2
export function slugSignoActual(): string;                             // "YYYY-MM" en America/Mexico_City
export function etiquetaMes(mes: string): string;                             // "2026-12" -> "Diciembre"
```

### 2.2 Upstash — `lib/upstash.ts` (Tarea 2)

```ts
export async function upstashGet(key: string): Promise<string | null>;
export async function upstashSet(key: string, value: string): Promise<void>;
export async function upstashDel(key: string): Promise<void>;
export async function upstashMget(keys: string[]): Promise<(string | null)[]>;
```

Endpoint REST: `GET {UPSTASH_REDIS_REST_URL}/get/{key}` → `{ "result": string | null }`.
Escritura: `POST {UPSTASH_REDIS_REST_URL}/set/{key}` con body = valor crudo (string) y header `Authorization: Bearer {UPSTASH_REDIS_REST_TOKEN}`.
Claves siempre URL-encoded (`encodeURIComponent`). Errores: si `result` es `null` en `GET` → key inexistente (no error). Cualquier otro shape → lanzar `Error`.

### 2.3 Resend — `lib/resend.ts` (Tarea 3)

```ts
export function resendClient(): Resend;
export async function segmentPorNombre(nombre: string): Promise<string | null>; // id
export async function topicPorNombre(nombre: string): Promise<string | null>;   // id
export async function propertiesExistentes(): Promise<string[]>;                // keys
export async function asegurarProperties(overrides: string[]): Promise<string[]>;
export async function asegurarSegments(nombres: string[]): Promise<Record<string, string>>;
export async function asegurarTopics(defs: { nombre: string; descripcion: string }[]): Promise<Record<string, string>>;
```

### 2.4 Contrato HTTP del endpoint de envío (Tarea 5)

`POST /api/cron/predicciones`
Headers: `Authorization: Bearer {CRON_SECRET}` (si falta o no coincide → `401`).
Body JSON opcional:
```json
{ "mes": "2026-12", "dry": false, "force": false, "destino": "tu@correo.com" }
```
- `mes` (opcional): si falta, se usa el mes local actual (`slugSignoActual()`).
- `dry: true` → genera y devuelve el HTML (array de 12) **sin enviar nada**. Respuesta `{ ok: true, dry: true, html: [...] }`.
- `force: true` → salta la ventana horaria y la deduplicación (solo para pruebas manuales; exige `destino` o usa el `from`).
- `destino` (opcional): en `dry` o `force`, envía **un solo** email de prueba a esa dirección en vez de los 12 broadcasts.
Respuesta OK: `{ ok: true, mes, enviados: [{ slug, broadcastId }], omitidos: [{ slug, motivo }] }`.
Respuesta de error: `{ ok: false, error }` con status 4xx/5xx.

Idempotencia: antes de enviar, se lee la key `enviado:{mes}` en Upstash. Si existe y no es `force`, se responde con todos los signos en `omitidos` (motivo `ya-enviado`). Tras enviar, se escribe `enviado:{mes}` = JSON con `{ ts, signos: [...] }`.

### 2.5 Contrato del scheduler (Tarea 10)

GitHub Actions -> `POST https://{SITE_URL}/api/cron/predicciones` con header `Authorization: Bearer {CRON_SECRET}`.
El workflow **no** manda `mes` (la app lo calcula) ni `force` en la corrida programada. El dispatch manual si puede mandar `mes` y `force`.

Configuracion (`.github/workflows/envio-predicciones.yml`):
```yaml
on:
  schedule:
    - cron: "6,21,36,51 * * * *"
```

Notas (verificadas 2026-11):
- El cron de GitHub Actions corre **en UTC**. 18:06 hora de Ciudad de Mexico = 00:06 UTC del dia siguiente. Por eso el cron dispara cada 15 min y **la app** decide si esta en la ventana `PREDICCIONES_HORA` del dia `PREDICCIONES_DIA` (Tarea 5, punto 6). Cambiar la hora de envio = cambiar la env, no el YAML.
- Los cron de GitHub Actions pueden retrasarse (~10 min en hora punta) o saltarse. Como dispara cada 15 min y la app dedupe con la key `enviado:{mes}`, un retraso no pierde el envio.
- **GitHub desactiva los workflows programados tras 60 dias sin actividad en el repo.** El repo es publico y hay commits cada mes (la prediccion del mes siguiente se sube antes del dia 25), asi que no se llega a ese estado. Vigilarlo igual.
- La ruta del cron es publica: `CRON_SECRET` es la unica barrera -> fail-closed (Tarea 5).

---

## 3. Variables de entorno

**Vercel (Environment Variables -> Production)** — la app lee todas estas:
```
RESEND_API_KEY=re_...                  # Full access (segments/topics/properties/broadcasts)
RESEND_FROM=predicciones@dinozodiaco.com  # dominio verificado en Resend
RESEND_FROM_NAME=Dinozodiaco
CRON_SECRET=<openssl rand -hex 32>     # VER BLOQUE DE ADVERTENCIA ABAJO
UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=...
SITE_URL=https://dinozodiaco.com
PREDICCIONES_HORA=18:06                # 24 h, "HH:MM"
PREDICCIONES_ZONA=America/Mexico_City
PREDICCIONES_DIA=1
PREDICCIONES_SEGMENT_PREFIX=dinozodiaco
```

`CRON_SECRET` la usa la app para validar el header del cron. `SITE_URL` = `https://dinozodiaco.com` (dominio canonico ya configurado en Vercel) y se usa para links absolutos en el email (CTA, aviso de privacidad).

**GitHub Actions secrets** (repo -> Settings -> Secrets and variables -> Actions):
```
CRON_SECRET=<mismo valor que en Vercel>   # VER BLOQUE DE ADVERTENCIA ABAJO
SITE_URL=https://dinozodiaco.com
```

---

### 3.1 ADVERTENCIA — rotar `CRON_SECRET` antes de desplegar

**Estado actual (capturas 2026-11-12):** tanto en Vercel como en GitHub, el valor de `CRON_SECRET` es el **placeholder literal** `<openssl rand -hex 32>`, no un valor generado. Esto **rompe** y **expone**:

1. **No es un secreto.** El repo `quowtf/dinozodiaco` es publico y este plan (commiteado en `docs/`) documenta la ruta exacta `/api/cron/predicciones`. Cualquiera que lo lea puede mandar `Authorization: Bearer <openssl rand -hex 32>` y disparar el envio real de los 12 broadcasts a los suscriptores, o jugar con `force`/`destino`.
2. **Caracteres invalidos en header HTTP.** `<` y `>` no son caracteres validos en el valor de un header. `curl -H "Authorization: Bearer <openssl rand -hex 32>"` es invalido; algunos clientes lo rechazan y otros lo envian corrupto. La comparacion en la app (`auth !== \`Bearer ${cronSecret}\``) fallaria de forma impredecible.
3. **Vercel doc:** un `CRON_SECRET` con caracteres no validos hace fallar el build de un deployment que define un cron path con `INVALID_CRON_SECRET`.

**Fix (5 minutos, antes de la Tarea 15):**
```bash
openssl rand -hex 32        # -> 64 chars hex, ej. 3f9a...  (copiar el VALOR, no el comando)
```
1. Vercel -> Environment Variables -> Production -> `CRON_SECRET` -> editar -> pegar el valor -> Save. Marcarlo como **Secret** (icono del ojo tachado), no como variable visible.
2. GitHub -> Settings -> Secrets and variables -> Actions -> `CRON_SECRET` -> editar -> pegar el **mismo** valor -> Save.
3. Vercel -> "Rotate Variable" / redeploy: la env no cambia hasta el proximo deployment. **Hacer redeploy** tras cambiarla.
4. Verificar: `curl -i -X POST https://dinozodiaco.com/api/cron/predicciones` -> `401`.

**Nunca** loguear el valor. **Nunca** commitearlo. `docs/PLAN-ENVIO-MENSUAL.md` solo menciona el comando, no el resultado.

---

### 3.2 Estado actual de la configuracion (confirmado 2026-11-12)

| Donde | Variable | Estado |
|---|---|---|
| Vercel | `UPSTASH_REDIS_REST_URL` | [x] ya existe |
| Vercel | `UPSTASH_REDIS_REST_TOKEN` | [x] ya existe |
| Vercel | `RESEND_API_KEY` | [x] ya existe (Full access) |
| Vercel | `RESEND_FROM` | [x] ya existe -> `predicciones@dinozodiaco.com` (confirmado por el usuario) |
| Vercel | `RESEND_FROM_NAME` | [x] ya existe -> `Dinozodiaco` |
| Vercel | `CRON_SECRET` | [!] **placeholder -> rotar** |
| Vercel | `SITE_URL` | [ ] falta -> `https://dinozodiaco.com` |
| Vercel | `PREDICCIONES_HORA` | [ ] falta -> `18:06` |
| Vercel | `PREDICCIONES_ZONA` | [ ] falta -> `America/Mexico_City` |
| Vercel | `PREDICCIONES_DIA` | [ ] falta -> `1` |
| Vercel | `PREDICCIONES_SEGMENT_PREFIX` | [ ] falta -> `dinozodiaco` |
| GitHub Actions | `CRON_SECRET` | [!] **placeholder -> rotar** (mismo valor que Vercel) |
| GitHub Actions | `SITE_URL` | [x] ya existe -> `https://dinozodiaco.com` |

Nota: `PREDICCIONES_*` tienen defaults en el codigo (`18:06`, `America/Mexico_City`, `1`, `dinozodiaco`). Se listan como envs para poder cambiarlos sin redeploy de codigo.

---

## 4. Tareas

Leyenda de dependencia: `→` significa "requiere que la tarea previa esté **terminada y commiteada**".
Las tareas del mismo grupo son paralelizables.

### GRUPO A — paralelizables, sin dependencias entre sí

---

#### Tarea 1 — Tipos y validación del contenido mensual

**Archivos (solo estos):** `lib/predicciones.ts` (crear)
**No toca:** ningún otro archivo del repo.

Implementar exactamente los tipos y firmas de §2.1.

`clavesSignoEsperadas()`: importa `SIGNOS` de `@/data/signos` y devuelve `SIGNOS.map(s => s.slug)`. Orden estable, el mismo del array.

`validarPrediccion(datos: unknown)` reglas (todas deben pasar):
1. `datos` es objeto plano.
2. `mes` es string con formato `^\d{4}-\d{2}$`.
3. `edicion` es entero ≥ 1.
4. `general` y cada bloque de signo tienen `titulo` (string no vacío, ≤ 120 chars), `texto` (string no vacío, 40–1200 chars) y `tags` (array de strings, 0–3 elementos, cada uno ≤ 60 chars).
5. `signos` tiene **exactamente** las 12 claves de `clavesSignosEsperadas()`. Ni una de más, ni una de menos. Reporta claves faltantes y sobrantes por nombre.
6. Ningún texto contiene `<` ni `>` (evita inyección de HTML al email).
7. Los 12 `texto` deben ser distintos entre sí (predicciones repetidas = error de contenido).

Devuelve `{ ok: errores.length === 0, errores }`. Los mensajes de error en español, con el slug o la ruta affected (ej. `"signos.01-tiranosaurio.texto: texto vacío"`).

`prediccionDelMes(mes)`: implementarlo aquí **solo como stub** que lanza `Error("implementado en Tarea 2")` — la Tarea 2 lo completa. (Evita dependencia circular: Tarea 2 implementa Upstash, Tarea 2 finishes esta función.)

**Criterio de aceptación**
- `npx tsc --noEmit` pasa.
- Test manual: `validarPrediccion({...})` con un objeto válido devuelve `{ ok: true, errores: [] }`; con un signo faltante devuelve error mencionando ese slug.

---

#### Tarea 2 — Cliente Upstash Redis por REST

**Archivos (solo estos):** `lib/upstash.ts` (crear)
**No toca:** `lib/predicciones.ts` (solo importa).

Implementar §2.2 con `fetch` nativo (Node 18+). Nada de SDK.

Detalles:
- Lee `process.env.UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` **dentro de cada función** (no a nivel de módulo) → permite build sin envs.
- Si falta cualquiera de las dos → `throw new Error("faltan UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN")`.
- `upstashGet`: `GET {url}/get/{encodeURIComponent(key)}` con header `Authorization`. Si `res.status !== 200` → lanzar con el body truncado a 300 chars. Parsear JSON; si `typeof body.result === "string"` devolverla; si `body.result === null` devolver `null`; si no hay `result` → lanzar.
- `upstashSet`: `POST {url}/set/{key}` con `body: value` (string crudo, `Content-Type: text/plain` no requerido) y header `Authorization`. Exigir `body.result === "OK"`.
- `upstashDel`: `POST {url}/del/{key}`.
- `upstashMget`: `POST {url}/mget` con body `JSON.stringify(keys)` → `body.result` es array de string|null.
- Timeout por request: `AbortSignal.timeout(10000)`; en timeout, lanzar.

**Criterio de aceptación**
- `npx tsc --noEmit` pasa.
- Con envs reales: `upstashSet('prueba:tmp','hola')` y luego `upstashGet('prueba:tmp')` devuelve `"hola"`; `upstashDel` deja `null`.

---

#### Tarea 3 — Helpers de Resend (segments, topics, properties)

**Archivos (solo estos):** `lib/resend.ts` (crear)
**No toca:** `app/actions.ts`.

Usa el SDK ya instalado: `import { Resend } from "resend"`.

Implementar §2.3:

- `resendClient()`: `new Resend(process.env.RESEND_API_KEY)` — instanciar **dentro** de la función (no a nivel de módulo).
- `segmentPorNombre(nombre)`: `resend.segments.list({ limit: 100 })` → buscar `s.name === nombre` → devolver `s.id` o `null`. Paginar con `after` si `has_more` (máx. 5 páginas).
- `topicPorNombre(nombre)`: `resend.topics.list()` → `t.name === nombre` → `t.id` o `null`.
- `propertiesExistentes()`: `resend.contactProperties.list({ limit: 100 })` → array de keys (`cp.key`).
- `asegurarProperties(overrides)`: para cada key que no exista → `resend.contactProperties.create({ key, type: "string" })`. Devuelve la lista final de keys. **Idempotente**: si ya existe, no crear (Resend devolvería error de duplicado).
- `asegurarSegments(nombres)`: por cada nombre, `segmentPorNombre`; si `null` → `resend.segments.create({ name })`. Devolver `Record<nombre, id>`.
- `asegurarTopics(defs)`: por cada def, `topicPorNombre`; si `null` → `resend.topics.create({ name, description, defaultSubscription: "opt_in" })`. Devolver `Record<nombre, id>`.

Todos los listados/create loguean en `console.log` con prefijo `[resend]`.

**Criterio de aceptación**
- `npx tsc --noEmit` pasa.
- Script de prueba manual (no commitear): `asegurarSegments(['dinozodiaco:test'])` crea el segment; la segunda llamada **no** lo duplica y devuelve el mismo id.

---

#### Tarea 10 — Workflow de GitHub Actions (se activa en la Tarea 15)

**Archivos (solo estos):** `.github/workflows/envio-predicciones.yml` (crear)
**No toca:** nada del codigo de la app. **No** se toca `vercel.json` (el plan Vercel Free del usuario ya tiene su unico cron ocupado).

```yaml
name: Envio mensual de predicciones

on:
  schedule:
    - cron: "6,21,36,51 * * * *"
  workflow_dispatch:
    inputs:
      mes:
        description: "Mes a enviar (YYYY-MM). Vacio = mes actual."
        required: false
        type: string
      force:
        description: "Forzar envio aunque ya se haya enviado ese mes"
        required: false
        default: "false"
        type: string

concurrency:
  group: envio-predicciones
  cancel-in-progress: false

jobs:
  enviar:
    runs-on: ubuntu-latest
    steps:
      - name: Enviar predicciones
        env:
          SITE_URL: ${{ secrets.SITE_URL }}
          CRON_SECRET: ${{ secrets.CRON_SECRET }}
          MES: ${{ inputs.mes }}
          FORCE: ${{ inputs.force }}
        run: |
          set -euo pipefail
          args=(-sS -X POST "$SITE_URL/api/cron/predicciones" \
                -H "Authorization: Bearer $CRON_SECRET" \
                -H "Content-Type: application/json")
          if [ -n "${MES:-}" ]; then args+=(-d "{\"mes\":\"$MES\"}"); fi
          if [ "${FORCE:-false}" = "true" ]; then args+=(-d '{"force":true}'); fi
          curl "${args[@]}"
```

Notas obligatorias (comentarios `#` en el propio YAML):
- El cron dispara cada 15 min. La **app** decide si esta en la ventana `PREDICCIONES_HORA` del dia `PREDICCIONES_DIA` y deduplica con la key `enviado:{mes}` de Upstash. Por eso cambiar la hora de envio es cambiar una env, no este YAML.
- El cron de GitHub Actions corre en **UTC**. 18:06 hora de Ciudad de Mexico = 00:06 UTC del dia siguiente. De ahi que el cron sea frecuente y la decision sea de la app.
- El repo es publico -> GitHub Actions no tiene coste de minutos.
- `concurrency` evita que dos corridas se pisen si GitHub retrasa y solapa.

**Criterio de aceptacion**
- YAML valido: `python3 -c "import yaml,sys;yaml.safe_load(open(sys.argv[1]))" .github/workflows/envio-predicciones.yml`.
- `workflow_dispatch` manual permite `mes` y `force`.
- El workflow corre en el branch por defecto del repo (`main`).

---

#### Tarea 13 — Aviso de privacidad: texto de envío y baja

**Archivos (solo estos):** `app/aviso-de-privacidad/page.tsx` (editar)
**No toca:** `app/page.tsx`.

Cambios mínimos dentro del `<main>` existente, respetando el estilo actual (`h2` + `p`):

1. En "Datos que recabamos" añadir: número de segmento/tipo de contenido no es dato personal → **no** añadir nada. En cambio, en "Finalidades", dejar el párrafo actual y añadir: "Enviamos una predicción al día 1 de cada mes a las 18:06 (hora de Ciudad de México)".
2. Añadir una sección nueva `h2` "Proveedores" con: "Resend (envío de correo) y Upstash Redis (almacenamiento del contenido de las predicciones). No vendemos ni cedemos tus datos."
3. En "Derechos ARCO" ampliar la frase de baja: hoy dice "usa el enlace de baja que aparece en cada envío" → añadir "El enlace permite darte de baja de las predicciones mensuales y de los avisos de la tienda por separado."
4. Añadir `h2` "Frecuencia" con: "Un correo al mes. Sin más."

No cambiar `<title>`, ni el `metadata`, ni la estructura de clases.

**Criterio de aceptación**
- `npx tsc --noEmit` y `pnpm lint` pasan.
- `pnpm build` termina sin errores de prerender (la página es estática, no debe tocar envs).

---

### GRUPO B — paralelizables, dependen del Grupo A

---

#### Tarea 4 — Constructor del email de predicción (texto primero)

**Archivos (solo estos):** `lib/email-prediccion.ts` (crear)
**Depende de:** Tarea 1 (tipos).
**No toca:** `app/page.tsx`, `lib/predicciones.ts`.

Firmas:
```ts
export interface EmailInput {
  nombre: string;        // "Tiranosaurio"
  slug: string;          // "01-tiranosaurio"
  latin: string;
  constelacion: string;
  elemento: string;
  modalidad: string;
  era: string;
  frase: string;
  dia: string;
  color: string;
  num: string;
  piedra: string;
  manada: string;
  bloque: PrediccionBloque;      // titulo/texto/tags del mes para ese signo
  general: PrediccionBloque;
  edicion: number;
  mes: string;                    // "2026-12"
  mesLabel: string;               // "Diciembre"
  unsubscribeUrl: string;         // "{{{RESEND_UNSUBSCRIBE_URL}}}"
  sitioUrl: string;
}

export function emailHtml(input: EmailInput): string;
export function emailTexto(input: EmailInput): string;
```

Reglas de `emailHtml`:
- Documento HTML completo `<!doctype html>`, `lang="es-MX"`, `meta charset`.
- Tabla exterior `width="100%"` bgcolor `#15223b`; tabla interior `width="600"` bgcolor `#1d2c4a`.
- **Cero** `<img>`, cero `<svg>`, cero `background-image` remoto. Solo backgrounds de color plano y bordes.
- Estilos **inline** en cada celda (Outlook). Nada de `<style>` en `<head>` como única fuente.
- Jerarquía: preheader oculto (texto gris claro sobre fondo del color del body, `display:none;max-height:0;overflow:hidden`), `h1` con `{{nombre}}`, línea de `{{mesLabel}} · Edición n.º {{edicion}}`, bloque `{{bloque.titulo}}`, `{{bloque.texto}}`, tags como fila de chips (`☄ {{tag}}` con borde redondeado), bloque general en recuadro más tenue, "Tu dinosaurio" con 2×2 de datos (elemento, modalidad, día, color, número, piedra → elegir 6 pares en dos filas de 3), `{{frase}}` en cursiva, link "Ver tu dinosaurio" → `{{sitioUrl}}/#{{slug}}`, footer con `{{unsubscribeUrl}}` como link "Darte de baja", link "Aviso de privacidad" → `{{sitioUrl}}/aviso-de-privacidad`, y línea "Dinozodiaco · hola@dinozodiaco.com".
- Botones: tabla con `bgcolor`, `border-radius` y padding, texto con `<a>`.
- Tipografía: `Georgia, 'Times New Roman', serif` para títulos y `Arial, Helvetica, sans-serif` para cuerpo.
- Escapar cualquier texto que venga de contenido (`escapeHtml` local) — los tags de `PrediccionBloque` vienen de terceros.

`emailTexto`: versión plano con el mismo contenido en orden legible, terminaciones `\n`, sin HTML. Incluir al final: `"Darte de baja: {unsubscribeUrl}"` y `"Aviso de privacidad: {sitioUrl}/aviso-de-privacidad"`.

**Criterio de aceptación**
- `npx tsc --noEmit` pasa.
- `emailHtml` no contiene `<img`, `<svg` ni `background-image` (grep sobre el output de una llamada de prueba).
- Ambos outputs contienen `{{nombre}}` y `{{bloque.texto}}`.

---

#### Tarea 6 — Script de setup de Resend (properties, topics, segments) + backfill

> **Nota de ejecucion (2026-11-12):** los scripts usan `tsx` (devDependency) porque resuelven los alias `@/*` de tsconfig, que `node --experimental-strip-types` no resuelve. `package.json` no lleva `pnpm.onlyBuiltDependencies`: pnpm 11 lo lee de `pnpm-workspace.yaml` (`allowBuilds.esbuild: true`).

**Archivos (solo estos):** `scripts/setup-resend.ts` (crear), `package.json` (editar solo para añadir el script `"predicciones:setup": "tsx scripts/setup-resend.ts"`)
**Depende de:** Tarea 3 (`lib/resend.ts`).
**No toca:** `app/actions.ts`.

El script se ejecuta **en local** con `RESEND_API_KEY` y `UPSTASH_REDIS_REST_URL/TOKEN` en `.env.local` (usar `node --env-file=.env.local`; Node 24 ya lo soporta).

Si `tsx` no está en el repo, el script puede ejecutarse con `npx tsx`. **No añadir dependencias al `package.json`** salvo el script npm; si `tsx` hace falta como dependencia, declararlo en `devDependencies` y anotarlo en el handoff.

Qué hace, en este orden, **idempotente** (re-ejecutable sin duplicar):
1. `asegurarProperties(["signo", "privacidad_aceptada"])` → log de las keys. Si `signo` ya existe, NO se toca.
2. `asegurarTopics([{ nombre: "predicciones", descripcion: "Predicciones mensuales de Dinozodiaco" }, { nombre: "merch", descripcion: "Avisos de la tienda de Dinozodiaco" }])`.
3. `asegurarSegments([...12 nombres "dinozodiaco:" + slug de data/signos.ts])` + 1 segment maestro `dinozodiaco:inscritos` (lo usa el broadcast de "todos" si algún día hace falta).
4. **Backfill de contactos**: listar contactos con `resend.contacts.list({ limit: 100 })` paginando con `after` (máx. 10 páginas). Por cada contacto:
   - `resend.contacts.get({ email })` → `properties.signo`.
   - Si hay `signo` y el slug existe en `data/signos.ts`: `resend.contacts.segments.add({ email, segmentId })` y `resend.contacts.topics.update({ email, topics: [{ id: topicPredicciones, subscription: "opt_in" }, { id: topicMerch, subscription: "opt_in" }] })`.
   - Si falta `signo`: reportarlo en una lista `SIN_SIGNO` (no fallar).
   - Pacear 8 requests/segundo (rate limit 10/s).
5. Imprimir resumen: segmentos creados/encontrados, topics, topics de contacto, total de contactos, lista `SIN_SIGNO`, y **volcar a `.env.local`** las constantes que necesita la app: no (la app las busca por nombre en runtime). Imprimir solo para revisión.

Salida esperada al final (log): tabla con nombre→id de los 12 segments y de los 2 topics.

**Criterio de aceptación**
- Correr dos veces seguidas no duplica segments/topics (comprobar con `resend.segments.list()`).
- Los contactos existentes (usuario + amiga) quedan en el segment de su signo y suscriptos a ambos topics.

---

#### Tarea 7 — CLI de contenido: subir / ver / validar

**Archivos (solo estos):** `scripts/predicciones.ts` (crear), `package.json` (editar solo para añadir `"predicciones:up": "tsx scripts/predicciones.ts subir"`, `"predicciones:ver": "tsx scripts/predicciones.ts ver"`, `"predicciones:validar": "tsx scripts/predicciones.ts validar"`)
**Depende de:** Tarea 1 (validación) y Tarea 2 (Upstash).
**No toca:** `lib/predicciones.ts` (solo importa).

Uso:
```
pnpm predicciones:validar <archivo.json>
pnpm predicciones:subir <archivo.json> [--mes YYYY-MM]
pnpm predicciones:ver [YYYY-MM]
```

- `validar`: lee el JSON local, llama `validarPrediccion`, imprime cada error en español; exit code 1 si hay errores, 0 si no.
- `subir`: valida primero (aborta si hay errores), deriva `mes` del propio JSON salvo `--mes`, exige que `mes` del JSON coincida con `--mes` si se pasó (error si no), escribe en Upstash la key `prediccion:{mes}` con `JSON.stringify(datos)`, y **verifica re-leyendo** la key y comparando. Imprime la key y el tamaño.
- `ver`: sin args usa el mes actual; con mes, lee la key e imprime el JSON formateado.

Nunca escribe en el repo.

**Criterio de aceptación**
- `pnpm predicciones:validar` sobre un JSON de ejemplo con un signo faltante → exit 1 y error nombrando el slug.
- `pnpm predicciones:subir` sobre un JSON válido → key existe en Upstash y `ver` devuelve lo mismo.

---

#### Tarea 8 — Ensamblador desde textos sueltos (fallback)

**Archivos (solo estos):** `scripts/ensamblar-predicciones.ts` (crear), `package.json` (editar solo para añadir `"predicciones:ensamblar": "tsx scripts/ensamblar-predicciones.ts"`)
**Depende de:** Tarea 1 (tipos/validación).
**No toca:** otros archivos.

Escenario que cubre: el tercero manda 13 archivos de texto plano sueltos y hay que convertirlos al JSON del mes.

Uso:
```
pnpm predicciones:ensamblar --dir ~/dinozodiaco/textos-2026-12 --mes 2026-12 --edicion 3 --out /tmp/2026-12.json
```

Formato de entrada esperado (tolerante):
- Un archivo por signo, nombrado `<slug>.txt` (ej. `01-tiranosaurio.txt`) **o** `<NN>-<nombre>.txt` donde se resuelve el slug contra `data/signos.ts` comparando en minúsculas y sin acentos (`normalizar`: quitar acentos, minúsculas, quitar espacios). Si hay ambigüedad o no hay match → error nombrando el archivo.
- `general.txt` para la predicción general.
- Opcional `meta.json` en el dir con `{ "edicion": 3, "mes": "2026-12", "mesLabel": "Diciembre" }`. Si falta, usar `--edicion`/`--mes` de CLI y `mesLabel` derivado del mes con un mapa ES de los 12 nombres de mes.
- Dentro de cada archivo: la primera línea no vacía que empiece con `Título:` o `#` es el título; el resto del archivo es el texto (se conserva el salto de línea simple, se colapsan 3+ líneas en blanco). Las líneas que empiezan con `- ` o `• ` se convierten en tags (hasta 3).

Salida: escribe el JSON con la forma de `PrediccionMes` en `--out` (por defecto `./predicciones-{mes}.json` en el CWD), **no** lo sube a Upstash (eso es Tarea 7, paso manual y revisable). Imprime resumen: cuántos signos se armaron, cuáles faltan.

**Criterio de aceptación**
- Con 13 archivos de prueba (12 signos + general) genera un JSON que `validarPrediccion` da por válido.
- Con un archivo de nombre desconocido, falla con mensaje claro.

---

### GRUPO C — paralelizables entre sí, dependen del Grupo B

---

#### Tarea 5 — Endpoint `POST /api/cron/predicciones`

**Archivos (solo estos):** `app/api/cron/predicciones/route.ts` (crear)
**Depende de:** Tareas 1, 2, 3, 4.
**No toca:** `app/page.tsx`, `app/actions.ts`, `lib/predicciones.ts` salvo completar `prediccionDelMes` **solo si** la Tarea 2 lo dejó como stub (si la Tarea 2 ya lo implementó, no tocar).

Implementación (respetando `cacheComponents: true` — **sin** exportar `dynamic`/`runtime`/`revalidate`):

1. `export async function POST(request: Request)`.
2. Auth **fail-closed** (la ruta es pública; Vercel manda `Authorization: Bearer $CRON_SECRET`):
   ```ts
   const cronSecret = process.env.CRON_SECRET;
   const auth = request.headers.get("authorization");
   if (!cronSecret) return Response.json({ ok: false, error: "falta CRON_SECRET" }, { status: 500 });
   if (auth !== `Bearer ${cronSecret}`) return Response.json({ ok: false, error: "no autorizado" }, { status: 401 });
   ```
   - Comparación estricta de string completo (`!==`), nunca `==` ni "si contiene".
   - Si `CRON_SECRET` falta → 500, **nunca** "paso". Un `Bearer undefined` hardcodeado abriría la ruta al mundo.
   - Nunca loguear el valor del header ni el secret.
3. Parsear body tolerante (try/catch → `{}`). En la corrida programada de GitHub Actions el body viene **vacío** → body = `{}`.
4. Resolver mes: `body.mes ?? slugSignoActual()`. Validar `^\d{4}-\d{2}$` → si no, `400`.
5. Cargar predicción: `await prediccionDelMes(mes)`. Si no existe en Upstash → `404 { ok:false, error:"no hay predicción para {mes}" }`.
6. Ventana horaria (salvo `force`):
   - `PREDICCIONES_DIA` (default 1), `PREDICCIONES_HORA` (default "18:06"), `PREDICCIONES_ZONA` (default "America/Mexico_City").
   - Calcular fecha/hora local con `Intl.DateTimeFormat("en-CA", { timeZone: zona, year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", hour12:false })`.
   - Si el día local != `PREDICCIONES_DIA` o la hora local es **anterior** a `PREDICCIONES_HORA` → responder `200 { ok:true, enviado:false, motivo:"fuera-de-ventana", ahoraLocal:"..." }` **sin enviar**.
   - `18:06` se compara como minutos desde medianoche: `hora*60+min >= objetivo`.
7. Deduplicación (salvo `force`): leer key `enviado:{mes}` en Upstash. Si existe → `200 { ok:true, enviado:false, motivo:"ya-enviado", ...omitidos }`.
8. Resolver ids: por cada signo, `segmentPorNombre("dinozodiaco:" + slug)` y `topicPorNombre("predicciones")`. Si falta un segment → error `500` indicando el slug. Si falta el topic → crear/asegurar con `asegurarTopics`.
9. `dry: true` → construir los 12 HTML/text con `emailHtml`/`emailTexto` y devolver `{ ok:true, dry:true, html:[...], texto:[...] }` sin enviar nada.
10. Envío:
    - Si `body.destino` está definido → enviar **un solo** email de prueba con `resend.emails.send({ from, to: destino, subject, html, text })` y devolver `{ ok:true, enviados:[{ slug: primerSigno, preview:true }] }` (no toca los broadcasts).
    - Si no → por cada uno de los 12 signos, `resend.broadcasts.create({ segmentId, topicId, from: `${RESEND_FROM_NAME} <${RESEND_FROM}>`, subject, html, text, name: `pred-{mes}-{slug}`, previewText, send: true })`. Pacear 8 requests/segundo. Registrar id de broadcast.
    - `subject`: `Tu predicción de {mesLabel} · {nombre}` (ej. `Tu predicción de Diciembre · Tiranosaurio`).
    - `previewText`: `{bloque.titulo} — {nombre}`.
    - `replyTo`: `hola@dinozodiaco.com`.
    - `text`: la versión de `emailTexto`.
11. Tras enviar los 12, escribir en Upstash la key `enviado:{mes}` con `{ ts: new Date().toISOString(), signos: [slugs] }`.
12. Responder `200 { ok:true, mes, enviados:[{slug, broadcastId}], omitidos:[] }`.
13. `catch` global → `500 { ok:false, error: mensaje }` (loguear stack en consola).

Detalle importante: el texto del email usa `{{{RESEND_UNSUBSCRIBE_URL}}}` **literal** (no resolverse), porque Resend lo sustituye por un link único por destinatario y broadcast.

**Criterio de aceptación**
- `npx tsc --noEmit` y `pnpm build` pasan (build sin envs debe pasar: todo lee envs en runtime, nunca a nivel de módulo).
- Con `CRON_SECRET` incorrecto → `401`.
- **Con `CRON_SECRET` ausente → `500`, no 200.** (fail-closed: es el test que garantiza que la ruta pública no quede abierta).
- Con `dry:true` → devuelve 12 HTML sin crear broadcasts (verificable en el dashboard de Resend).
- Fuera de la ventana horaria → `200` con `motivo:"fuera-de-ventana"` y 0 broadcasts.

---

#### Tarea 9 — Home lee la predicción general desde Upstash

**Archivos (solo estos):** `app/page.tsx` (editar)
**Depende de:** Tareas 1, 2.
**No toca:** `app/aviso-de-privacidad/page.tsx`, `app/actions.ts`.

Cambios:
1. Sustituir el bloque hardcodeado (líneas ~38-62) por datos de la predicción del mes actual.
2. Añadir en `app/page.tsx` un helper **en el mismo archivo** (no crear `lib/` nuevo, para no pisar la Tarea 1):
   ```ts
   async function prediccionGeneral() {
     "use cache";
     cacheLife("hours");
     cacheTag("predicciones");
     try {
       const datos = await prediccionDelMes(slugSignoActual());
       return datos.general;
     } catch {
       return null;
     }
   }
   ```
   Importar `cacheLife`, `cacheTag` de `next/cache`, `prediccionDelMes` y `slugSignoActual` de `@/lib/predicciones`.
3. En el JSX: `const general = await prediccionGeneral();` y renderizar:
   - Si `general` existe: `<p className="week__dates">{mesLabel} · Edición n.º {edicion}</p>` y el texto de `general.texto` + tags de `general.tags`.
   - Si no existe (**fallback**, caso normal hasta que se suba la primera predicción): mantener exactamente el texto actual hardcodeado ("Octubre · Edición n.º 2" y el párrafo actual) para no romper el sitio. El fallback va en una constante local del archivo.
4. `mesLabel`: función local `MES_LABELS` (12 meses en español, ej. `2026-12` → `Diciembre`).
5. No cambiar clases CSS ni el resto de la home.

**Criterio de aceptación**
- `pnpm build` pasa.
- Con Upstash vacío → la home muestra exactamente el texto actual (sin error visible).
- Con una predicción subida → la home muestra el texto nuevo sin tocar el build (la caché `predicciones` se refresca por `cacheLife("hours")`).

---

### GRUPO D — secuencial final

---

#### Tarea 11 — Signup: segment + topic + re-suscriptor

**Archivos (solo estos):** `app/actions.ts` (editar)
**Depende de:** Tarea 6 **ejecutada** en la cuenta de Resend (los segments/topics deben existir antes de desplegar este cambio).
**No toca:** `components/subscribe-form.tsx`.

Cambios en `subscribe()`:
1. Seguir validando email, signo y privacidad igual que hoy.
2. Resolver ids **por nombre en runtime** (no hardcodear ids): `segmentPorNombre("dinozodiaco:" + signo)` y `topicPorNombre("predicciones")` / `topicPorNombre("merch")`. Importar de `@/lib/resend`.
3. Construir `segments` y `topics` solo si los ids existen:
   ```ts
   const segments = segmentId ? [{ id: segmentId }] : undefined;
   const topics = topicPredicciones
     ? [{ id: topicPredicciones, subscription: "opt_in" as const },
        ...(topicMerch ? [{ id: topicMerch, subscription: "opt_out" as const }] : [])]
     : undefined;
   ```
   (merch en `opt_out` por defecto: el sitio promete "avisos cuando la merch esté lista", pero el consentimiento explícito del form es para predicciones → dejar merch como opt-out evita spam; el usuario lo puede activar en la página de baja de Resend.)
4. `resend.contacts.create({ email, unsubscribed: false, properties: { signo, privacidad_aceptada }, segments, topics })`.
5. **Re-suscripción (mismo email, ya existe)**: `contacts.create` devuelve error. Capturar el error y, si parece duplicado, llamar `resend.contacts.update({ email, unsubscribed: false, properties: { signo, privacidad_aceptada } })` y después `resend.contacts.segments.add({ email, segmentId })` + `resend.contacts.topics.update({ email, topics })`. Si el update falla, devolver el mensaje de error actual ("No pudimos guardar tu correo…").
   - Detección de duplicado: `error.message` que contenga "already" / "exists" / "duplicate" (case-insensitive) **o** `error.statusCode === 422`. Si no coincide con ninguno, tratar como error real.
6. Si el email está en la lista de supresión o `unsubscribed: true` en Resend, `contacts.create`/`update` puede fallar → en ese caso **no** dar error al usuario: si el fallo es por supresión/baja, responder `{ ok: true, message: "¡Listo! Te avisamos de lo que sigue en Dinozodiaco." }` y loguear en consola. (Reinscribir a alguien que pidió la baja sin su consentimiento es un problema legal.)
7. Mensajes de usuario: mantener los actuales tal cual (éxito/errores de validación). Solo cambiar el texto de error de Resend si hace falta, sin prometer nada.

**Criterio de aceptación**
- `npx tsc --noEmit`, `pnpm lint`, `pnpm build` pasan.
- Suscribirse con un email nuevo → contact creado **con** segment y topics.
- Suscribirse dos veces con el mismo email → mensaje de éxito, sin error, y sin contact duplicado.
- Suscribirse con un email en lista de supresión → mensaje de éxito, sin envío.

---

#### Tarea 15 — Integración, pruebas y despliegue (cierre)

**Archivos (solo estos):** `README.md` (editar, sección nueva "Envío mensual de predicciones") y `.env.example` (crear, si no existe).
**Depende de:** Tareas 1–11, 13, y Tarea 6 ejecutada en la cuenta real.

Checklist (en este orden, porque hay dependencias de datos reales):
1. `.env.example` con todas las vars de §3 (valores de ejemplo, sin secretos reales).
2. `README.md`: sección con (a) prerequisites, (b) `pnpm predicciones:setup` una vez, (c) flujo mensual: pedir textos con el formato de la Tarea 12 → ensamblar/subir → el día 1 sale solo, (d) cómo forzar un envío manual, (e) qué revisar en el dashboard de Resend.
3. Verificación local del flujo completo, con `dry: true` primero:
   - `pnpm predicciones:validar <json>` → ok.
   - `pnpm predicciones:subir <json>` → key escrita.
   - `curl -X POST .../api/cron/predicciones` con `{"dry":true}` → devuelve 12 HTML, 0 broadcasts.
   - Con `{"force":true,"destino":"<tu-email>"}` → llega **un** email de prueba. Revisar en un cliente real (Gmail) que el layout no se rompe.
   - Con `{"force":true}` (sin destino) → 12 broadcasts creados. **OJO**: esto envía de verdad a los suscriptores reales. Confirmar con el usuario antes de ejecutar.
4. Deploy a Vercel: confirmar que **todas** las envs de §3 estan en Production. `RESEND_FROM` = `predicciones@dinozodiaco.com`, `RESEND_FROM_NAME` = `Dinozodiaco`, `CRON_SECRET` rotado (ver 3.1), `SITE_URL` = `https://dinozodiaco.com`, `PREDICCIONES_*` con los valores de §3.
5. Activar el workflow: anadir secrets en el repo (Settings -> Secrets and variables -> Actions):
   - `CRON_SECRET` -> **el mismo valor** que en Vercel.
   - `SITE_URL` -> `https://dinozodiaco.com`.
   Verificar en la pestaña **Actions** que el workflow aparece y se puede launched manualmente (`workflow_dispatch`).
6. Prueba del endpoint en produccion:
   ```bash
   curl -X POST https://dinozodiaco.com/api/cron/predicciones \
     -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: application/json" -d '{"dry":true}'
   ```
   -> debe devolver 12 HTML y **0** broadcasts.
7. Confirmar que sin header -> `401`:
   ```bash
   curl -i -X POST https://dinozodiaco.com/api/cron/predicciones
   ```
   -> `401`.
8. Lanzar el workflow manualmente desde la pestana Actions con `mes` vacio -> debe responder `fuera-de-ventana` o `ya-enviado` segun la hora, **sin** enviar.

**Criterio de aceptacion**
- Un email de prueba llega bien formateado.
- El workflow manual responde 200 sin enviar nada fuera de ventana.
- El schedule queda visible en la pestana Actions con el cron `6,21,36,51 * * * *`.
- `README.md` permite a otra persona ejecutar el flujo mensual sin preguntar nada.

---

#### Tarea 12 — Formato de solicitud al tercero (generador de predicciones)

**Archivos (solo este):** `docs/PREDICCIONES.md` (crear)
**Depende de:** Tarea 1 (para documentar el esquema exacto).
**No toca:** código de la app.

Contenido del documento (autocontenido, listo para copiar-pegar en un chat o correo):
1. Contexto: Dinozodiaco, 12 dinosaurios = 12 signos, un envío al mes, tono burlón-but-cariñoso en español de México, sin consultarle a ningún paleontólogo.
2. Los 12 slugs exactos con su nombre (copiados de `data/signos.ts`).
3. El **esquema JSON exacto** con un ejemplo completo y válido de un mes (los 12 signos con texto de ejemplo, 40–1200 chars cada uno, tags ≤ 3).
4. Reglas de escritura por signo: 3–5 frases, un solo idée force, un aviso concreto, sin HTML, sin markdown, sin emojis (los tags llevan los glifos), sin mencionar a terceros, sin promesas de salud/dinero/legal, "fósil/fósil" con ortografía correcta, escribir "Tú" con acento, evitar "tu" sin acento como pronombre.
5. Formato alternativo aceptado: 13 archivos de texto plano (`general.txt` + `<slug>.txt`) con el formato exacto de la Tarea 8 → el usuario lo ensambla con `pnpm predicciones:ensamblar`.
6. Fecha límite: entregar el texto **antes del día 25** del mes anterior, para subirlo y revisar.
7. Ejemplo "mal" vs "bien" de un texto.

**Criterio de aceptación**
- Un tercero que solo lea `docs/PREDICCIONES.md` puede entregar un JSON que pase `pnpm predicciones:validar` sin escribir código.

---

## 5. Grafo de dependencias y qué corre en paralelo

```
Tarea 1  (tipos/validación) ──┬──> Tarea 4 (email HTML) ──┐
Tarea 2  (Upstash REST) ──────┼──> Tarea 7 (CLI contenido) │
                               ├──> Tarea 9 (home lee Upstash)
                               └──> Tarea 5 (endpoint envío) <── Tarea 3 (helpers Resend)
                                                        └──> Tarea 10 (workflow GH) ───┐
Tarea 3  (helpers Resend) ───> Tarea 6 (setup + backfill) ──────────────────────────┤
Tarea 8  (ensamblador) <── Tarea 1                                                  │
Tarea 12 (formato terceros) <── Tarea 1                                               │
Tarea 13 (aviso privacidad) ──────────────────────────────────────────────┐          │
Tarea 11 (signup segment/topic) <── Tarea 6 EJECUTADA ───────────────────┤          │
                                                                              v          v
                                                                    Tarea 15 (cierre)
```

Ejecución sugerida en oleadas (cada oleada puede ir a agentes distintos en paralelo):

| Ola | Tareas | Bloqueo |
|---|---|---|
| 1 | 1, 2, 3, 10, 13 | ninguna |
| 2 | 4, 6, 7, 8, 12 | Ola 1 (1, 2, 3) |
| 3 | 5, 9 | Ola 2 (4) — y 1, 2, 3 |
| 4 | 11 | Tarea 6 ejecutada en la cuenta real |
| 5 | 15 | todo lo anterior + envs de §3 en Vercel Production |

Paralelizables dentro de una ola: todas salvo donde hay flecha.
Agentes de una misma ola **no** deben revisar el código de otro agente ni hacer merge entre ellos: cada uno entrega su diff y el orquestador integra.

---

## 6. Requisitos manuales del usuario (bloquean la Tarea 6 y la 15)

**Listo:**
- [x] Resend: dominio `dinozodiaco.com` verificado. API key **Full access** lista.
- [x] Upstash: base Redis free creada, `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` listas.
- [x] Vercel: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_FROM_NAME` configuradas.
- [x] GitHub Actions: `CRON_SECRET` y `SITE_URL` creadas (el valor de `CRON_SECRET` hay que rotarlo, ver 3.1).
- [x] Dominio `dinozodiaco.com` ya apunta a Vercel (verificado: HTTP 200, `server: Vercel`). Es el canonico, no `*.vercel.app`.

**Pendiente — Vercel (Environment Variables -> Production):**
1. `CRON_SECRET` -> **rotar** con un valor real de `openssl rand -hex 32`. Ver 3.1. Marcarlo como Secret.
2. `SITE_URL` -> `https://dinozodiaco.com`.
3. `PREDICCIONES_HORA` -> `18:06`.
4. `PREDICCIONES_ZONA` -> `America/Mexico_City`.
5. `PREDICCIONES_DIA` -> `1`.
6. `PREDICCIONES_SEGMENT_PREFIX` -> `dinozodiaco`.

**Pendiente — GitHub (Settings -> Secrets and variables -> Actions):**
7. `CRON_SECRET` -> mismo valor que en Vercel. Ver 3.1.

**Pendiente — deploy:**
8. Redeploy de Vercel despues de cambiar `CRON_SECRET` (la env no cambia hasta el proximo deployment).

**No se toca Vercel Cron.** El plan Vercel Free del usuario ya tiene su unico cron ocupado por otra cosa. El scheduler de esto es GitHub Actions.

---

## 7. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| `cacheComponents` rompe el build por exportar `dynamic`/`runtime` | Ninguna tarea nueva exporta configs de segmento; los datos externos van en `"use cache"` + `cacheLife`. |
| Properties de Resend inexistentes rompen el signup | Tarea 6 es idempotente y `asegurarProperties` corre antes de tocar `app/actions.ts`. |
| El cron de GitHub Actions se atrasa o se salta | El cron dispara cada 15 min y la app acepta cualquier hora posterior al objetivo dentro del dia configurado; la key `enviado:{mes}` evita duplicados. Si GitHub se salta la ventana entera, el `workflow_dispatch` manual recupera el mes. |
| GitHub desactiva los workflows programados tras 60 dias sin actividad | El repo es publico y hay commits cada mes (la prediccion del mes siguiente se sube antes del dia 25). Aun asi, revisar la pestana Actions de vez en cuando. |
| El workflow corre en un branch equivocado | Los `schedule` solo corren en el branch por defecto. El repo tiene `main`, `v3`, `main-v3`: el workflow debe vivir en `main`. |
| `CRON_SECRET` distinto en Vercel y GitHub | El 401 en los logs del workflow delata el mismatch. Se prueba con `curl` en la Tarea 15. |
| `CRON_SECRET` sigue siendo el placeholder `<openssl rand -hex 32>` | Bloquea el deploy: ademas de no ser secreto, `<`/`>` son invalidos en un header HTTP y el repo es publico (la ruta del cron esta documentada en este plan). Rotar segun 3.1 antes de la Tarea 15. |
| La ruta del cron queda publica | Fail-closed: sin env -> 500, header incorrecto -> 401. El test de aceptacion lo cubre. |
| Doble envío por re-ejecución | Key `enviado:{mes}` en Upstash + `force` explícito. |
| El tercero manda texto con HTML o acentos mal puestos | `validarPrediccion` rechaza `<`/`>`; `emailHtml` escapa. |
| Layout roto en Outlook | Tablas + estilos inline + cero imágenes + fuentes web-safe. |
| Colisión de ids hardcodeados | Todos los ids se resuelven por nombre en runtime (`segmentPorNombre`, `topicPorNombre`). |
| Rebuild de Vercel sin envs (preview builds) | Ningún env se lee a nivel de módulo; todo dentro de funciones. |
