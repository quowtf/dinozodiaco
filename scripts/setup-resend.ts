/**
 * Setup de Resend: contact properties y nada mas.
 *
 * El envio mensual ya no usa segments ni topics (el plan free de Resend
 * solo permite 3 segments y el envio es por contacto). Este script solo
 * asegura que existan las properties `signo` y `privacidad_aceptada`.
 *
 * Es idempotente. Requiere RESEND_API_KEY en el entorno.
 *
 *   pnpm predicciones:setup
 */

import { asegurarProperties } from "@/lib/resend";

const PROPERTIES = ["signo", "privacidad_aceptada"];

async function main() {
  console.log("== Contact properties ==");
  const properties = await asegurarProperties(PROPERTIES);

  for (const key of properties) {
    console.log(`  ${key}`);
  }

  console.log(`\nListo. ${properties.length} property(s) en la cuenta.`);
  console.log(
    "No hace falta nada mas: el envio no usa segments ni topics.",
  );
}

main().catch((error) => {
  console.error("\nsetup fallido:", error);
  process.exit(1);
});
