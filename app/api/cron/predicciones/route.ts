import { SIGNOS } from "@/data/signos";
import { urlBaja } from "@/lib/baja";
import { emailHtml, emailTexto } from "@/lib/email-prediccion";
import {
  construirEmailInput,
  dentroDeVentana,
  remitente,
  sitioUrl,
} from "@/lib/envio";
import { prediccionDelMes, slugSignoActual } from "@/lib/predicciones";
import { conLimite, resendClient } from "@/lib/resend";
import { upstashGet, upstashSet } from "@/lib/upstash";

const MES_RE = /^\d{4}-\d{2}$/;
const LOTE = 100; // maximo de emails por llamada en resend.batch.send

interface Body {
  mes?: string;
  dry?: boolean;
  force?: boolean;
  destino?: string;
}

interface Destinatario {
  email: string;
  signo: string;
}

/**
 * Lista a quien hay que mandarle que, leyendo los contactos de Resend.
 *
 * `contacts.list()` no devuelve properties, asi que hay un `get` por
 * contacto. Con listas grandes esto es el cuello de botella: a 1.000
 * contactos son 1.000 llamadas (10 req/s = 100 s). Si la lista crece,
 * conviene cachear el signo en Upstash al suscribirse.
 */
async function destinatarios(): Promise<{
  validos: Destinatario[];
  sinSigno: string[];
}> {
  const resend = resendClient();

  const emails: string[] = [];
  let cursor: string | undefined;

  for (let pagina = 0; pagina < 20; pagina++) {
    const { data, error } = await resend.contacts.list({
      limit: 100,
      ...(cursor ? { after: cursor } : {}),
    });

    if (error) throw new Error(`contacts.list -> ${error.message}`);

    for (const contacto of data.data) {
      if (!contacto.unsubscribed) emails.push(contacto.email);
    }

    if (!data.has_more || data.data.length === 0) break;
    cursor = data.data[data.data.length - 1].id;
  }

  const slugs = new Set(SIGNOS.map((s) => s.slug));
  const validos: Destinatario[] = [];
  const sinSigno: string[] = [];

  const resultados = await conLimite(
    emails.map((email) => async () => {
      const { data, error } = await resend.contacts.get({ email });
      if (error) return { email, signo: null };

      const properties = data.properties as
        | Record<string, { value: unknown }>
        | undefined;
      const signo = properties?.signo?.value;

      if (typeof signo !== "string" || !slugs.has(signo)) {
        return { email, signo: null };
      }
      return { email, signo };
    }),
  );

  for (const [i, r] of resultados.entries()) {
    if (r instanceof Error) {
      sinSigno.push(emails[i]);
      continue;
    }
    if (r.signo) validos.push({ email: r.email, signo: r.signo });
    else sinSigno.push(r.email);
  }

  return { validos, sinSigno };
}

export async function POST(request: Request) {
  try {
    // --- Auth fail-closed -------------------------------------------------
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return Response.json(
        { ok: false, error: "falta CRON_SECRET" },
        { status: 500 },
      );
    }

    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return Response.json(
        { ok: false, error: "no autorizado" },
        { status: 401 },
      );
    }

    // --- Body -------------------------------------------------------------
    let body: Body = {};
    try {
      body = (await request.json()) as Body;
    } catch {
      body = {};
    }

    const forzar = body.force === true;
    const seco = body.dry === true;

    // --- Mes objetivo -----------------------------------------------------
    const mes = body.mes ?? slugSignoActual();
    if (!MES_RE.test(mes)) {
      return Response.json(
        { ok: false, error: `mes invalido: ${mes}` },
        { status: 400 },
      );
    }

    // --- Ventana horaria --------------------------------------------------
    // No aplica a force, dry ni destino: los tres son acciones manuales.
    // (Un destino es una prueba a un solo correo, no toca a los suscritos.)
    const esPrueba = Boolean(body.destino);
    if (!forzar && !seco && !esPrueba) {
      const ventana = dentroDeVentana();
      if (!ventana.dentro) {
        return Response.json({
          ok: true,
          enviado: false,
          motivo: ventana.motivo,
          ahoraLocal: ventana.ahoraLocal,
          hint: "Para mandar fuera de la ventana: force=true. Para una prueba a un solo correo: destino=<email>.",
        });
      }
    }

    // --- Prediccion del mes ----------------------------------------------
    let prediccion;
    try {
      prediccion = await prediccionDelMes(mes);
    } catch (error) {
      return Response.json(
        {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        },
        { status: 404 },
      );
    }

    const sitio = sitioUrl();
    const remitenteFinal = remitente();

    const armar = (slug: string, unsubscribeUrl: string) => {
      const signo = SIGNOS.find((s) => s.slug === slug);
      if (!signo) throw new Error(`signo desconocido: ${slug}`);

      const input = construirEmailInput(signo, prediccion, {
        unsubscribeUrl,
        sitio,
      });

      return {
        slug,
        subject: `Tu prediccion de ${input.mesLabel} · ${signo.nombre}`,
        html: emailHtml(input),
        text: emailTexto(input),
      };
    };

    // --- Modo dry: devuelve el HTML, no envia nada ------------------------
    // Usa un link de baja de ejemplo: no hay destinatario real.
    if (seco) {
      const ejemplo = `${sitio}/api/baja?e=ejemplo%40dinozodiaco.com&t=ejemplo`;
      const generados = SIGNOS.map((s) => armar(s.slug, ejemplo));

      return Response.json({
        ok: true,
        dry: true,
        mes,
        html: generados.map((g) => g.html),
        texto: generados.map((g) => g.text),
      });
    }

    // --- Envio de un solo correo de prueba --------------------------------
    if (body.destino) {
      // Si el destino ya es contacto, se usa SU signo para que la prueba
      // se vea como el correo real. Si no, el primero.
      const slug = await signoDeContacto(body.destino).catch(() => null);
      const baja = await urlBaja(body.destino, sitio);
      const generado = armar(slug ?? SIGNOS[0].slug, baja);

      const resend = resendClient();
      const { data, error } = await resend.emails.send({
        from: remitenteFinal,
        to: body.destino,
        replyTo: "hola@dinozodiaco.com",
        subject: generado.subject,
        html: generado.html,
        text: generado.text,
        headers: cabecerasBaja(baja),
      });

      if (error) {
        return Response.json(
          { ok: false, error: `emails.send -> ${error.message}` },
          { status: 502 },
        );
      }

      return Response.json({
        ok: true,
        preview: true,
        mes,
        enviadoA: body.destino,
        emailId: data?.id ?? null,
      });
    }

    // --- Dedupe -----------------------------------------------------------
    if (!forzar) {
      const marcador = await upstashGet(`enviado:${mes}`);
      if (marcador !== null) {
        return Response.json({
          ok: true,
          enviado: false,
          motivo: "ya-enviado",
          mes,
        });
      }
    }

    // --- Destinatarios ----------------------------------------------------
    const { validos, sinSigno } = await destinatarios();

    if (validos.length === 0) {
      return Response.json({
        ok: true,
        enviado: false,
        motivo: "sin-destinatarios",
        mes,
        sinSigno,
      });
    }

    // --- Armado por persona ----------------------------------------------
    type Correo = {
      from: string;
      to: string;
      replyTo: string;
      subject: string;
      html: string;
      text: string;
      headers: Record<string, string>;
    };

    const preparados = await conLimite<Correo>(
      validos.map(({ email, signo }) => async () => {
        const baja = await urlBaja(email, sitio);
        const generado = armar(signo, baja);
        return {
          from: remitenteFinal,
          to: email,
          replyTo: "hola@dinozodiaco.com",
          subject: generado.subject,
          html: generado.html,
          text: generado.text,
          headers: cabecerasBaja(baja),
        };
      }),
    );

    const correos = preparados.filter((c): c is Correo => !(c instanceof Error));

    if (correos.length !== validos.length) {
      const fallidos = preparados.length - correos.length;
      return Response.json(
        {
          ok: false,
          error: `no se pudieron armar ${fallidos} correo(s)`,
        },
        { status: 500 },
      );
    }

    // --- Envio en lotes de 100 -------------------------------------------
    const resend = resendClient();
    let enviados = 0;
    const errores: string[] = [];

    for (let i = 0; i < correos.length; i += LOTE) {
      const lote = correos.slice(i, i + LOTE);

      const { data, error } = await resend.batch.send(lote, {
        batchValidation: "permissive",
      });

      if (error) {
        errores.push(error.message);
        continue;
      }

      enviados += data.data.length;

      for (const e of data.errors ?? []) {
        errores.push(`indice ${i + e.index}: ${e.message}`);
      }
    }

    // Marcador de idempotencia: solo si no hubo errores.
    if (errores.length === 0) {
      await upstashSet(
        `enviado:${mes}`,
        JSON.stringify({ ts: new Date().toISOString(), enviados }),
      );
    }

    return Response.json({
      ok: errores.length === 0,
      mes,
      enviados,
      sinSigno,
      errores,
    });
  } catch (error) {
    console.error("[cron/predicciones]", error);
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

/** Signo de un contacto, o null si no existe o no tiene uno valido. */
async function signoDeContacto(email: string): Promise<string | null> {
  const resend = resendClient();
  const { data, error } = await resend.contacts.get({ email });
  if (error) return null;

  const properties = data.properties as
    | Record<string, { value: unknown }>
    | undefined;
  const signo = properties?.signo?.value;

  if (typeof signo !== "string") return null;
  return SIGNOS.some((s) => s.slug === signo) ? signo : null;
}

/**
 * Cabeceras para la baja de un solo clic (RFC 8058).
 * Gmail y Yahoo las usan para mostrar el boton "Cancelar suscripcion".
 */
function cabecerasBaja(url: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${url}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
