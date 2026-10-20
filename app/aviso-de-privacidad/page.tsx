import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Aviso de privacidad · Dinozodiaco",
};

export default function AvisoDePrivacidad() {
  return (
    <main className="legal wrap">
      <p className="kicker"><Link href="/">← Volver a Dinozodiaco</Link></p>
      <h1 className="section-title">Aviso de privacidad</h1>
      <p className="legal__pending">
        [Pendiente de revisión legal: este texto es una plantilla y debe completarse antes de publicar.]
      </p>

      <h2>Responsable de los datos</h2>
      <p>[Nombre o razón social], con domicilio en [dirección], correo de contacto [correo].</p>

      <h2>Datos que recabamos</h2>
      <p>Correo electrónico, dinosaurio de interés (signo) y la fecha en que aceptaste este aviso.</p>

      <h2>Finalidades</h2>
      <p>
        Enviarte las predicciones mensuales de Dinozodiaco a la dirección que nos diste. No compartimos
        tus datos con terceros para fines comerciales.
      </p>

      <h2>Derechos ARCO</h2>
      <p>
        Puedes acceder, rectificar, cancelar u oponerte al tratamiento de tus datos escribiendo a [correo].
        Para dejar de recibir correos, usa el enlace de baja que aparece en cada envío.
      </p>

      <h2>Cambios al aviso</h2>
      <p>Cualquier cambio se publicará en esta misma página.</p>
    </main>
  );
}
