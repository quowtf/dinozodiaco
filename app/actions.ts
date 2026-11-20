"use server";

import { SIGNOS } from "@/data/signos";
import { resendClient } from "@/lib/resend";

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

/**
 * Alta en la lista.
 *
 * No se usan segments ni topics: el plan free de Resend solo permite 3
 * segments y el envio mensual es por contacto. El signo vive en la
 * contact property `signo`, y la baja en el flag `unsubscribed`.
 */
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

  const properties = {
    signo,
    privacidad_aceptada: new Date().toISOString(),
  };

  const { error } = await resend.contacts.create({
    email,
    unsubscribed: false,
    properties,
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

    // Vuelve a la lista: si estaba dado de baja, se reactiva (arriba).
    // El signo se actualiza con el update de properties.
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
