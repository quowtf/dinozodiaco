/**
 * CLI de contenido de predicciones.
 *
 *   pnpm predicciones:validar <archivo.json>
 *   pnpm predicciones:subir   <archivo.json> [--mes YYYY-MM]
 *   pnpm predicciones:ver     [YYYY-MM]
 *
 * Nunca escribe en el repo: el contenido vive solo en Upstash.
 */

import { readFileSync } from "node:fs";
import { validarPrediccion } from "@/lib/predicciones";
import { upstashGet, upstashSet } from "@/lib/upstash";

const MES_RE = /^\d{4}-\d{2}$/;

function usage(): never {
  console.error(
    [
      "Uso:",
      "  predicciones.ts validar <archivo.json>",
      "  predicciones.ts subir   <archivo.json> [--mes YYYY-MM]",
      "  predicciones.ts ver     [YYYY-MM]",
    ].join("\n"),
  );
  process.exit(1);
}

function leerArchivo(ruta: string): unknown {
  const texto = readFileSync(ruta, "utf8");

  try {
    return JSON.parse(texto);
  } catch (error) {
    console.error(
      `El archivo ${ruta} no es JSON valido: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    process.exit(1);
  }
}

function validar(datos: unknown): boolean {
  const resultado = validarPrediccion(datos);

  if (resultado.ok) {
    console.log("OK: la prediccion es valida.");
    return true;
  }

  console.error(`ERROR: ${resultado.errores.length} problema(s):`);
  for (const error of resultado.errores) {
    console.error(`  - ${error}`);
  }
  return false;
}

function mesActual(): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.PREDICCIONES_ZONA || "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return partes.slice(0, 7);
}

async function subir(archivo: string, mesArg: string | undefined) {
  const datos = leerArchivo(archivo);

  if (!validar(datos)) {
    process.exit(1);
  }

  const mes = mesArg ?? (datos as { mes?: string }).mes;

  if (!mes || !MES_RE.test(mes)) {
    console.error(`ERROR: el JSON no trae un "mes" valido (${mes})`);
    process.exit(1);
  }

  if (mesArg && (datos as { mes?: string }).mes !== mesArg) {
    console.error(
      `ERROR: --mes ${mesArg} no coincide con el "mes" del JSON (${(datos as { mes?: string }).mes})`,
    );
    process.exit(1);
  }

  const contenido = JSON.stringify(datos);
  await upstashSet(`prediccion:${mes}`, contenido);

  // Verificacion: se relee y se compara.
  const releido = await upstashGet(`prediccion:${mes}`);
  if (releido !== contenido) {
    console.error(`ERROR: la lectura de verificacion no coincide con lo escrito.`);
    process.exit(1);
  }

  console.log(`OK: subida la prediccion ${mes} (${contenido.length} bytes).`);
  console.log(`    key: prediccion:${mes}`);
}

async function ver(mes: string) {
  const contenido = await upstashGet(`prediccion:${mes}`);

  if (contenido === null) {
    console.log(`No hay prediccion para ${mes}.`);
    return;
  }

  try {
    console.log(JSON.stringify(JSON.parse(contenido), null, 2));
  } catch {
    console.log(contenido);
  }
}

async function main() {
  const [, , comando, ...args] = process.argv;

  switch (comando) {
    case "validar": {
      if (!args[0]) usage();
      const datos = leerArchivo(args[0]);
      if (!validar(datos)) process.exit(1);
      return;
    }

    case "subir": {
      if (!args[0]) usage();
      const indiceMes = args.indexOf("--mes");
      const mesArg =
        indiceMes >= 0 && args[indiceMes + 1] ? args[indiceMes + 1] : undefined;
      await subir(args[0], mesArg);
      return;
    }

    case "ver": {
      const mes = args[0] ?? mesActual();
      if (!MES_RE.test(mes)) usage();
      await ver(mes);
      return;
    }

    default:
      usage();
  }
}

main().catch((error) => {
  console.error("ERROR:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
