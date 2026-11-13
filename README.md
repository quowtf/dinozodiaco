# Dinozodiaco

Horóscopo dinosaurio: doce dinosaurios, doce personalidades, una predicción nueva cada mes.
Next.js 16 (App Router, Cache Components) + Resend + Upstash Redis + Vercel.

```bash
pnpm install
pnpm dev
```

---

## Envío mensual de predicciones

Cada día 1, a las 18:06 hora de Ciudad de México, se manda un correo a cada persona
suscrita con la predicción de su dinosaurio. El texto vive en Upstash Redis; el envío
lo dispara GitHub Actions contra un endpoint de la app.

### Cómo funciona

```
Tercero                  Tú                         App                       Resend
──────                  ──                         ───                       ──────
textos del mes  →   pnpm predicciones:subir  →  Upstash (prediccion:YYYY-MM)
                                                 │
                    GitHub Actions (cada 15 min) │
                          ↓                       │
                    POST /api/cron/predicciones ──┘
                          ↓
                    12 Broadcasts (uno por signo)  →  correos
```

La app decide si está en la ventana de envío y deduplica con la key `enviado:{mes}` de
Upstash. Por eso el cron puede dispararse cada 15 minutos sin miedo a duplicados.

### Configuración (una vez)

**1. Resend.** Verificar el dominio `dinozodiaco.com` (SPF + DKIM) y crear una API key
con **Full access**. El remitente es `predicciones@dinozodiaco.com`.

**2. Upstash.** Crear una base Redis free en `console.upstash.com` y copiar
`UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`.

**3. Variables de entorno** en Vercel (Production) y en `.env.local` para local.
Copia [`.env.example`](.env.example) y llénalo. Lo que falta configurar:

| Variable | Valor |
|---|---|
| `RESEND_API_KEY` | la key de Full access |
| `RESEND_FROM` | `predicciones@dinozodiaco.com` |
| `RESEND_FROM_NAME` | `Dinozodiaco` |
| `UPSTASH_REDIS_REST_URL` | `https://xxx.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | el token |
| `CRON_SECRET` | `openssl rand -hex 32` |
| `SITE_URL` | `https://dinozodiaco.com` |
| `PREDICCIONES_HORA` | `18:06` (24 h) |
| `PREDICCIONES_ZONA` | `America/Mexico_City` |
| `PREDICCIONES_DIA` | `1` |
| `PREDICCIONES_SEGMENT_PREFIX` | `dinozodiaco` |

**4. Setup de Resend.** Crea contact properties, topics, los 12 segments (uno por signo)
y mete a los contactos existentes en el segment de su dinosaurio. Es idempotente:

```bash
pnpm predicciones:setup
```

**5. GitHub Actions.** Settings → Secrets and variables → Actions:

- `CRON_SECRET` → **el mismo valor** que en Vercel
- `SITE_URL` → `https://dinozodiaco.com`

**6. Redeploy.** `CRON_SECRET` no cambia hasta el siguiente deploy.

> **Aviso**: el plan Vercel Free ya tiene su único cron ocupado, así que el scheduler es
> GitHub Actions, no Vercel Cron.

### Flujo mensual

1. **Antes del día 25** te llega el texto de las predicciones del mes siguiente. El
   formato está en [`docs/PREDICCIONES.md`](docs/PREDICCIONES.md).
2. Si te lo mandan como JSON:

   ```bash
   pnpm predicciones:validar 2026-12.json    # revisa el formato
   pnpm predicciones:subir 2026-12.json      # lo sube a Upstash
   ```

   Si te lo mandan como 13 archivos de texto:

   ```bash
   pnpm predicciones:ensamblar --dir ~/textos-2026-12 --mes 2026-12 --edicion 3 --out 2026-12.json
   pnpm predicciones:validar 2026-12.json
   pnpm predicciones:subir 2026-12.json
   ```

3. La home muestra la predicción general en menos de 5 minutos (revalidación automática).
4. El día 1 a las 18:06 salen los 12 correos solos.

### Probar sin enviar nada

```bash
# Ver los 12 correos que se generarían, sin enviar nada:
curl -X POST https://dinozodiaco.com/api/cron/predicciones \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"dry":true}'

# Mandarte UN solo correo de prueba (no toca los broadcasts):
curl -X POST https://dinozodiaco.com/api/cron/predicciones \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"force":true,"destino":"tu@correo.com"}'
```

Sin header `Authorization` la ruta responde `401`. Sin `CRON_SECRET` en el entorno,
responde `500`: nunca deja pasar a un desconocido.

### Forzar el envío de un mes

Si se te pasó la fecha, lánzalo a mano desde **GitHub → Actions → Envío mensual de
predicciones → Run workflow**, con `mes` = `2026-12` y `force` = `true`.

### Dónde revisar qué pasó

- **Resend → Broadcasts**: los 12 envíos del mes, con entregas, aperturas y clics.
- **Resend → Contacts**: los segmentos y quién está en cada uno.
- **Upstash**: la key `prediccion:YYYY-MM` (contenido) y `enviado:YYYY-MM` (marca de que
  ya se envió). `pnpm predicciones:ver` imprime el contenido desde la terminal.
- **GitHub → Actions**: el log de cada corrida.

### Estructura

```
app/api/cron/predicciones/route.ts   endpoint que envia (POST, protegido con CRON_SECRET)
lib/predicciones.ts                    tipos + validacion del contenido del mes
lib/upstash.ts                         cliente Upstash por REST (sin SDK)
lib/resend.ts                          helpers de Resend (segments, topics, properties)
lib/envio.ts                           ventana horaria y armado del correo
lib/email-prediccion.ts                HTML y texto plano del correo (sin imagenes)
scripts/setup-resend.ts                setup idempotente de Resend
scripts/predicciones.ts                CLI: validar / subir / ver
scripts/ensamblar-predicciones.ts      convierte textos sueltos en JSON
docs/PREDICCIONES.md                   formato que se le pide al tercero
docs/PLAN-ENVIO-MENSUAL.md             plan de implementacion
```

---

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Resend](https://resend.com/docs)
- [Upstash Redis](https://upstash.com/docs/redis)
