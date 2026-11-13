/**
 * Verifica que el CRON_SECRET que tieneslocal coincide con el que acepta
 * el deployment. Sirve para confirmar una rotacion sin tener que leer
 * el secreto de ningun lado.
 *
 *   pnpm predicciones:verificar
 *
 * Lee CRON_SECRET y SITE_URL del entorno (o de .env.local).
 */

const url = process.env.SITE_URL || "https://dinozodiaco.com";
const secret = process.env.CRON_SECRET;

if (!secret) {
  console.error("Falta CRON_SECRET en el entorno (o en .env.local).");
  process.exit(1);
}

if (secret.includes("<") || secret.includes(">")) {
  console.error(
    "El CRON_SECRET parece un placeholder, no un valor generado. " +
      "Genera uno con: openssl rand -hex 32",
  );
  process.exit(1);
}

async function main() {
const res = await fetch(`${url}/api/cron/predicciones`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ dry: true }),
});

const texto = await res.text();

console.log(`endpoint: ${url}/api/cron/predicciones`);
console.log(`status:   ${res.status}`);

let cuerpo: { ok?: boolean; error?: string; motivo?: string } = {};
try {
  cuerpo = JSON.parse(texto);
} catch {
  // respuesta no JSON
}

if (res.status === 401) {
  console.log("\nNO COINCIDE. El deployment no acepta este CRON_SECRET.");
  console.log("El valor de Vercel y el de GitHub son distintos.");
  console.log("Rota los dos con el MISMO valor y vuelve a correr esto.");
} else if (res.status === 500 && /falta CRON_SECRET/.test(texto)) {
  console.log("\nEl deployment NO tiene CRON_SECRET configurado.");
  console.log("Cargalo en Vercel (Production) y vuelve a correr esto.");
} else if (res.ok) {
  console.log("\nCOINCIDE. El secret es el mismo en Vercel y en GitHub.");
  if (cuerpo.motivo) console.log(`motivo: ${cuerpo.motivo}`);
} else {
  console.log(`\nRespuesta: ${texto.slice(0, 300)}`);
}
}

main().catch((error) => {
  console.error("ERROR:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
