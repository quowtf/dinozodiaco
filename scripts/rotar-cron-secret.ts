/**
 * Genera un CRON_SECRET nuevo y deja las instrucciones para pegarlo en
 * Vercel y en GitHub.
 *
 *   pnpm predicciones:rotar
 *
 * El secreto NUNCA se sube al repo: se imprime para que lo copies.
 * Vercel y GitHub solo permiten escribir secretos, no leerlos, asi que
 * esta es la unica forma de tenerlos sincronizados.
 */

import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const secreto = randomBytes(32).toString("hex");

console.log("\n============================================================");
console.log("CRON_SECRET nuevo");
console.log("============================================================");
console.log(secreto);
console.log("\nCopia ese valor y pegalo en estos DOS lugares:");
console.log("\n  1. Vercel -> Project dinozodiaco -> Settings -> Environment");
console.log("     Variables -> Production -> CRON_SECRET -> Editar -> pegar");
console.log("     -> Save. (Marcalo como Secret.)");
console.log("\n  2. GitHub -> repo quowtf/dinozodiaco -> Settings -> Secrets");
console.log("     and variables -> Actions -> CRON_SECRET -> Editar -> pegar");
console.log("     -> Update secret.");
console.log("\n  3. Vercel -> Deployments -> el deploy actual -> ... -> Redeploy");
console.log("     (Vercel congela las variables en cada deploy: sin redeploy");
console.log("      el secret viejo sigue vivo.)");
console.log("\n  4. Verifica que los dos quedaron igual:");
console.log("     pnpm predicciones:verificar");
console.log("\n  5. Enrolla el valor en tu .env.local para poder probarlo:");
console.log(`     CRON_SECRET=${secreto}`);

// Guarda el valor en .env.local si existe, para que `pnpm predicciones:verificar`
// y las pruebas locales usen el mismo valor.
if (existsSync(".env.local")) {
  const contenido = readFileSync(".env.local", "utf8");
  const limpio = contenido.replace(/^CRON_SECRET=.*$/m, "");
  writeFileSync(
    ".env.local",
    `${limpio.trimEnd()}\nCRON_SECRET=${secreto}\n`,
    "utf8",
  );
  console.log("\n  .env.local actualizado con el valor nuevo.");
} else {
  console.log("\n  (no hay .env.local, se salta)");
}
