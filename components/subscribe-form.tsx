"use client";

import { useActionState } from "react";
import { subscribe, type SubscribeState } from "@/app/actions";
import { SIGNOS } from "@/data/signos";

const initialState: SubscribeState = { ok: false, message: "" };

export function SubscribeForm() {
  const [state, formAction, pending] = useActionState(subscribe, initialState);

  if (state.ok) {
    return <p className="cta__message cta__message--ok" role="status">{state.message}</p>;
  }

  return (
    <form className="cta__form" action={formAction}>
      <div className="cta__fields">
        <label className="sr-only" htmlFor="email">Tu correo electrónico</label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          required
        />

        <label className="sr-only" htmlFor="signo">Tu dinosaurio</label>
        <select id="signo" name="signo" defaultValue="" required>
          <option value="" disabled>Tu dinosaurio</option>
          {SIGNOS.map((s) => (
            <option key={s.slug} value={s.slug}>{s.nombre}</option>
          ))}
        </select>
      </div>

      <label className="cta__consent">
        <input type="checkbox" name="privacidad" value="si" required />
        <span>
          Acepto el <a href="/aviso-de-privacidad">aviso de privacidad</a> y el uso
          de mi correo para enviarme las predicciones.
        </span>
      </label>

      <button type="submit" className="btn btn--primary" disabled={pending}>
        {pending ? "Enviando…" : "Avísame"}
      </button>

      {state.message && (
        <p className="cta__message cta__message--error" role="alert">{state.message}</p>
      )}
    </form>
  );
}
