import type { Metadata } from "next";
import Link from "next/link";
import { SubscribeForm } from "@/components/subscribe-form";

export const metadata: Metadata = {
  title: "Tienda · Dinozodiaco",
  description: "La tienda de Dinozodiaco está en construcción. Suscríbete para saber cuándo abre.",
};

export default function Tienda() {
  return (
    <main id="contenido">
      <section className="cta" aria-labelledby="tienda-title">
        <div className="wrap cta__inner">
          <p className="kicker kicker--gold">Merch</p>
          <h1 className="cta__title" id="tienda-title">La tienda está en construcción</h1>
          <p className="cta__text">
            Estamos preparando playeras, stickers y más dinosaurios para tu clóset.
            Déjanos tu correo y te avisamos en cuanto abra.
          </p>
          <SubscribeForm />
          <p className="cta__fine">
            <Link href="/">← Volver al inicio</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
