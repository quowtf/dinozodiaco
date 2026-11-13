import { SIGNOS } from "@/data/signos";
import { emailHtml, emailTexto } from "@/lib/email-prediccion";
import {
  construirEmailInput,
  dentroDeVentana,
  nombreSegmento,
  remitente,
  sitioUrl,
} from "@/lib/envio";
import { prediccionDelMes, slugSignoActual } from "@/lib/predicciones";
import { conLimite, resendClient, segmentPorNombre, topicPorNombre } from "@/lib/resend";
import { upstashGet, upstashSet } from "@/lib/upstash";

const MES_RE = /^\d{4}-\d{2}$/;
const UNSUBSCRIBE_PLACEHOLDER = "{{{RESEND_UNSUBSCRIBE_URL}}}";

interface Body {
  mes?: string;
  dry?: boolean;
  force?: boolean;
  destino?: string;
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

    // --- Ventana horaria (salvo force y dry) ------------------------------
    // `dry` no tiene efectos: se puede previsualizar cualquier dia.
    if (!forzar && !seco) {
      const ventana = dentroDeVentana();
      if (!ventana.dentro) {
        return Response.json({
          ok: true,
          enviado: false,
          motivo: ventana.motivo,
          ahoraLocal: ventana.ahoraLocal,
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

    // --- Armado de los 12 correos ----------------------------------------
    const entradas = SIGNOS.map((signo) => {
      const input = construirEmailInput(signo, prediccion, {
        unsubscribeUrl: UNSUBSCRIBE_PLACEHOLDER,
        sitio,
      });
      return {
        slug: signo.slug,
        nombre: signo.nombre,
        subject: `Tu prediccion de ${input.mesLabel} · ${signo.nombre}`,
        previewText: `${input.bloque.titulo} — ${signo.nombre}`,
        html: emailHtml(input),
        text: emailTexto(input),
      };
    });

    // --- Modo dry: devuelve el HTML, no envia nada ------------------------
    if (seco) {
      return Response.json({
        ok: true,
        dry: true,
        mes,
        html: entradas.map((e) => e.html),
        texto: entradas.map((e) => e.text),
      });
    }

    // --- Envio de un solo correo de prueba --------------------------------
    if (body.destino) {
      const resend = resendClient();
      const primera = entradas[0];

      // Fuera de un broadcast, Resend no resuelve el placeholder de baja.
      const html = primera.html.replaceAll(
        UNSUBSCRIBE_PLACEHOLDER,
        `${sitio}/aviso-de-privacidad`,
      );
      const text = primera.text.replaceAll(
        UNSUBSCRIBE_PLACEHOLDER,
        `${sitio}/aviso-de-privacidad`,
      );

      const { data, error } = await resend.emails.send({
        from: remitente(),
        to: body.destino,
        replyTo: "hola@dinozodiaco.com",
        subject: primera.subject,
        html,
        text,
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
          omitidos: SIGNOS.map((s) => ({ slug: s.slug, motivo: "ya-enviado" })),
        });
      }
    }

    // --- Ids de Resend ----------------------------------------------------
    const topicId = await topicPorNombre("predicciones");
    if (!topicId) {
      return Response.json(
        { ok: false, error: 'no existe el topic "predicciones"' },
        { status: 500 },
      );
    }

    const segmentos = new Map<string, string>();
    for (const signo of SIGNOS) {
      const id = await segmentPorNombre(nombreSegmento(signo.slug));
      if (!id) {
        return Response.json(
          {
            ok: false,
            error: `no existe el segment ${nombreSegmento(signo.slug)} (corre el setup de Resend)`,
          },
          { status: 500 },
        );
      }
      segmentos.set(signo.slug, id);
    }

    // --- 12 broadcasts ----------------------------------------------------
    const resend = resendClient();

    const resultados = await conLimite(
      entradas.map(
        (entrada) => async () => {
          const { data, error } = await resend.broadcasts.create({
            segmentId: segmentos.get(entrada.slug)!,
            topicId,
            from: remitente(),
            replyTo: "hola@dinozodiaco.com",
            subject: entrada.subject,
            previewText: entrada.previewText,
            html: entrada.html,
            text: entrada.text,
            name: `pred-${mes}-${entrada.slug}`,
            send: true,
          });

          if (error) {
            throw new Error(`${entrada.slug} -> ${error.message}`);
          }
          return { slug: entrada.slug, broadcastId: data?.id ?? null };
        },
      ),
    );

    const enviados: { slug: string; broadcastId: string | null }[] = [];
    const omitidos: { slug: string; motivo: string }[] = [];

    for (const [i, resultado] of resultados.entries()) {
      const slug = entradas[i].slug;
      if (resultado instanceof Error) {
        omitidos.push({ slug, motivo: resultado.message });
      } else {
        enviados.push(resultado);
      }
    }

    // Marcador de idempotencia: solo si se mandaron los 12.
    if (omitidos.length === 0) {
      await upstashSet(
        `enviado:${mes}`,
        JSON.stringify({ ts: new Date().toISOString(), signos: enviados.map((e) => e.slug) }),
      );
    }

    return Response.json({ ok: omitidos.length === 0, mes, enviados, omitidos });
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
