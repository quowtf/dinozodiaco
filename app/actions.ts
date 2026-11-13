"use server";

import { SIGNOS } from "@/data/signos";
import { nombreSegmento, prefijoSegmento } from "@/lib/envio";
import {
  resendClient,
  segmentPorNombre,
  topicPorNombre,
} from "@/lib/resend";

export type SubscribeState = {
  ok: boolean;
  message: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* Un fallo de Resend que NO es culpa del visitante: no hay que asustarlo.
   Si el correo esta dado de baja o suprimido, responder igual de bien. */
function esFalloDeSupresion(mensaje: string): boolean {
  return /suppress|unsubscrib|bounced|blocked|complain/i.test(mensaje);
}

function esDuplicado(mensaje: string, statusCode?: number): boolean {
  if (statusCode === 422) return true;
  return /already|exists|duplicate|taken/i.test(mensaje);
}

export async function subscribe(
  _prev: SubscribeState,
  formData: FormData,
): Promise<SubscribeState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const signo = String(formData.get("signo") ?? "");
  const privacidad = formData.get("privacidad") === "si";

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return { ok: false, message: "Revisa que el correo sea válido." };
  }
  if (!SIGNOS.some((s) => s.slug === signo)) {
    return { ok: false, message: "Elige tu dinosaurio." };
  }
  if (!privacidad) {
    return { ok: false, message: "Acepta el aviso de privacidad para suscribirte." };
  }

  const resend = resendClient();

  // Los ids se resuelven por nombre: no hay ids hardcodeados.
  // Si el setup de Resend todavia no se ha corrido, la suscripcion
  // sigue funcionando (solo sin segment ni topics).
  const [segmentId, topicPredicciones, topicMerch] = await Promise.all([
    segmentPorNombre(nombreSegmento(signo)).catch(() => null),
    topicPorNombre("predicciones").catch(() => null),
    topicPorNombre("merch").catch(() => null),
  ]);

  const properties = {
    signo,
    privacidad_aceptada: new Date().toISOString(),
  };

  const segments = segmentId ? [{ id: segmentId }] : undefined;
  const topics = topicPredicciones
    ? [
        { id: topicPredicciones, subscription: "opt_in" as const },
        // merch en opt_out: el consentimiento explicito del form es para
        // predicciones. Quien quiera la tienda la activa en la pagina de baja.
        ...(topicMerch
          ? [{ id: topicMerch, subscription: "opt_out" as const }]
          : []),
      ]
    : undefined;

  const { error } = await resend.contacts.create({
    email,
    unsubscribed: false,
    properties,
    segments,
    topics,
  });

  if (!error) {
    return { ok: true, message: "¡Listo! Te avisamos de lo que sigue en Dinozodiaco." };
  }

  // --- El correo ya existia: re-suscripcion ------------------------------
  if (esDuplicado(error.message, error.statusCode ?? undefined)) {
    const { error: errorUpdate } = await resend.contacts.update({
      email,
      unsubscribed: false,
      properties,
    });

    if (errorUpdate) {
      if (esFalloDeSupresion(errorUpdate.message)) {
        console.warn("[subscribe] correo suprimido:", errorUpdate.message);
        return {
          ok: true,
          message: "¡Listo! Te avisamos de lo que sigue en Dinozodiaco.",
        };
      }
      return {
        ok: false,
        message: "No pudimos guardar tu correo. Intenta de nuevo en un momento.",
      };
    }

    // Sincroniza segment y topics: si cambio de dinosaurio, sale del
    // segment viejo para no recibir dos predicciones al mes.
    if (segmentId) {
      const { error: errorSegment } = await resend.contacts.segments.add({
        email,
        segmentId,
      });
      if (errorSegment) {
        console.warn("[subscribe] no se pudo agregar al segment:", errorSegment.message);
      }

      // Quita el contact de los segments de dinosaurio que ya no le
      // corresponden (solo si el properties.signo cambio).
      const { data: segmentosActuales } = await resend.contacts.segments.list({
        email,
        limit: 100,
      });
      const segmentosDino = (segmentosActuales?.data ?? []).filter(
        (s) =>
          s.name.startsWith(`${prefijoSegmento()}:`) &&
          s.name !== nombreSegmento(signo),
      );

      for (const viejo of segmentosDino) {
        const { error: errorRemove } = await resend.contacts.segments.remove({
          email,
          segmentId: viejo.id,
        });
        if (errorRemove) {
          console.warn(
            "[subscribe] no se pudo quitar del segment anterior:",
            errorRemove.message,
          );
        }
      }
    }

    if (topics) {
      const { error: errorTopic } = await resend.contacts.topics.update({
        email,
        topics,
      });
      if (errorTopic) {
        console.warn("[subscribe] no se pudieron actualizar los topics:", errorTopic.message);
      }
    }

    return { ok: true, message: "¡Listo! Te avisamos de lo que sigue en Dinozodiaco." };
  }

  // --- El correo esta dado de baja o suprimido ---------------------------
  if (esFalloDeSupresion(error.message)) {
    console.warn("[subscribe] correo suprimido:", error.message);
    return {
      ok: true,
      message: "¡Listo! Te avisamos de lo que sigue en Dinozodiaco.",
    };
  }

  console.error("[subscribe] error de Resend:", error.message);
  return {
    ok: false,
    message: "No pudimos guardar tu correo. Intenta de nuevo en un momento.",
  };
}
