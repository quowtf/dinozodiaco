import { tokenValido } from "@/lib/baja";
import { resendClient } from "@/lib/resend";

/**
 * Baja de la lista.
 *
 * GET  -> pagina de confirmacion (el link visible del correo).
 * POST -> baja inmediata, para el boton "Cancelar suscripcion" del cliente
 *         de correo (RFC 8058, List-Unsubscribe-Post).
 *
 * La firma HMAC del link impide dar de baja a otra persona.
 */

function pagina(titulo: string, cuerpo: string, estado = 200): Response {
  const html = `<!doctype html>
<html lang="es-MX">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${titulo} · Dinozodiaco</title>
<style>
  body { margin:0; background:#15223b; color:#efe6d2;
         font-family: Georgia, 'Times New Roman', serif;
         display:flex; min-height:100vh; align-items:center; justify-content:center; }
  main { max-width:560px; padding:32px; text-align:center; }
  h1 { font-size:28px; font-weight:normal; margin:0 0 12px; }
  p { color:#dcd5c6; font-family: Arial, Helvetica, sans-serif; line-height:1.6; }
  button { margin-top:20px; padding:13px 26px; border:0; border-radius:8px;
           background:#e0a458; color:#101b30; font:bold 15px Arial, Helvetica, sans-serif;
           cursor:pointer; }
  a { color:#a9b3c7; }
</style>
</head>
<body><main>${cuerpo}</main></body>
</html>`;

  return new Response(html, {
    status: estado,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = (url.searchParams.get("e") ?? "").trim().toLowerCase();
  const token = url.searchParams.get("t") ?? "";

  if (!email || !token) {
    return pagina(
      "Enlace inválido",
      "<h1>Enlace inválido</h1><p>Este link de baja no trae los datos necesarios. Escríbenos a hola@dinozodiaco.com y lo resolvemos.</p>",
      400,
    );
  }

  let valido = false;
  try {
    valido = await tokenValido(email, token);
  } catch {
    valido = false;
  }

  if (!valido) {
    return pagina(
      "Enlace inválido",
      "<h1>Enlace inválido</h1><p>Este link ya no sirve o fue modificado. Escríbenos a hola@dinozodiaco.com y lo resolvemos.</p>",
      400,
    );
  }

  const accion = `/api/baja?e=${encodeURIComponent(email)}&t=${encodeURIComponent(token)}`;

  return pagina(
    "Darte de baja",
    `<h1>¿Dejar de recibir predicciones?</h1>
     <p>Vas a dejar de recibir el correo mensual en <strong>${email.replace(/</g, "&lt;")}</strong>.</p>
     <form method="post" action="${accion}">
       <button type="submit">Sí, darme de baja</button>
     </form>
     <p><a href="https://dinozodiaco.com">Mejor no, volver al sitio</a></p>`,
  );
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const email = (url.searchParams.get("e") ?? "").trim().toLowerCase();
  const token = url.searchParams.get("t") ?? "";

  if (!email || !token) {
    return new Response("faltan parametros", { status: 400 });
  }

  let valido = false;
  try {
    valido = await tokenValido(email, token);
  } catch {
    valido = false;
  }

  if (!valido) {
    return new Response("token invalido", { status: 400 });
  }

  try {
    const resend = resendClient();
    const { error } = await resend.contacts.update({
      email,
      unsubscribed: true,
    });

    if (error) {
      console.error("[baja] contacts.update ->", error.message);
      return new Response("no se pudo procesar", { status: 500 });
    }
  } catch (error) {
    console.error("[baja]", error);
    return new Response("no se pudo procesar", { status: 500 });
  }

  // RFC 8058: el POST de un solo clic debe responder 200.
  if (request.headers.get("content-type")?.includes("application/json")) {
    return Response.json({ ok: true });
  }

  return pagina(
    "Listo",
    `<h1>Listo, quedaste fuera</h1>
     <p>No vas a recibir más predicciones en <strong>${email.replace(/</g, "&lt;")}</strong>.</p>
     <p><a href="https://dinozodiaco.com">Volver al sitio</a></p>`,
  );
}
