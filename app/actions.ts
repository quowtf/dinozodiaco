"use server";

import { Resend } from "resend";
import { SIGNOS } from "@/data/signos";

export type SubscribeState = {
  ok: boolean;
  message: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.contacts.create({
    email,
    unsubscribed: false,
    properties: {
      signo,
      privacidad_aceptada: new Date().toISOString(),
    },
  });

  if (error) {
    return { ok: false, message: "No pudimos guardar tu correo. Intenta de nuevo en un momento." };
  }

  return { ok: true, message: "¡Listo! Te avisamos de lo que sigue en Dinozodiaco." };
}
