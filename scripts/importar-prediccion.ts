/**
 * Convierte el formato del generador de contenido al JSON que espera la app.
 *
 *   pnpm predicciones:importar <archivo-del-generador.json> --edicion 3 [--mes 2026-11] [--out archivo.json]
 *
 * Formato de entrada (el que produce el generador):
 * {
 *   "mes": "noviembre", "anio": 2026,
 *   "signos": [{ "dinosaurio": "Tiranosaurio", "intro": "...", "tech": "...",
 *                "manada": "...", "plata": "...", "hobby": "...",
 *                "tu_superpoder": "...", "tu_rabbit_hole": "...",
 *                "fosil_de_la_suerte": "..." }]
 * }
 *
 * Salida: el esquema de PrediccionMes (sin `general`: eso es del sitio, no del correo).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { SIGNOS } from "@/data/signos";
import { validarPrediccion } from "@/lib/predicciones";

const MESES: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10,
  noviembre: 11, diciembre: 12,
};

/** Etiqueta visible de cada seccion del generador, en orden. */
const SECCIONES: { clave: string; etiqueta: string }[] = [
  { clave: "tech", etiqueta: "Tu tech" },
  { clave: "manada", etiqueta: "Tu manada" },
  { clave: "plata", etiqueta: "Tu plata" },
  { clave: "hobby", etiqueta: "Tu hobby" },
  { clave: "tu_rabbit_hole", etiqueta: "Tu rabbit hole" },
  { clave: "fosil_de_la_suerte", etiqueta: "Tu fosil de la suerte" },
];

function usage(): never {
  console.error(
    [
      "Uso:",
      "  predicciones:importar <archivo.json> --edicion N [--mes YYYY-MM] [--out salida.json]",
      "",
      "  --edicion  numero de edicion (obligatorio)",
      "  --mes      si el archivo no trae mes/anio legibles",
      "  --out      por defecto prediccion-<mes>.json en el cwd",
    ].join("\n"),
  );
  process.exit(1);
}

function arg(flag: string): string | undefined {
  const argv = process.argv.slice(2);
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : undefined;
}

/** Quita acentos y normaliza para comparar nombres. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function resolverSlug(nombre: string): string | null {
  const buscado = normalizar(nombre);
  const encontrado = SIGNOS.find((s) => normalizar(s.nombre) === buscado);
  return encontrado ? encontrado.slug : null;
}

/** "Cortar por lo sano. Sabes cuándo..." -> "Cortar por lo sano" */
function primeraFrase(texto: string, max = 120): string {
  const limpio = texto.trim();
  const corte = limpio.split(/(?<=\.)\s/)[0] ?? limpio;
  const sinPunto = corte.replace(/\.$/, "").trim();
  const base = sinPunto.length > 0 ? sinPunto : limpio;
  return base.length > max ? `${base.slice(0, max - 1).trimEnd()}…` : base;
}

interface SignoGenerador {
  dinosaurio?: string;
  intro?: string;
  [clave: string]: unknown;
}

function main() {
  const argv = process.argv.slice(2);
  const entrada = argv.find((a) => !a.startsWith("--") && !argv[argv.indexOf(a) - 1]?.startsWith("--"));
  const edicion = arg("--edicion");
  const mesArg = arg("--mes");
  const out = arg("--out");

  if (!entrada || !edicion) usage();

  const edicionNum = Number(edicion);
  if (!Number.isInteger(edicionNum) || edicionNum < 1) {
    console.error(`ERROR: --edicion invalido: ${edicion}`);
    process.exit(1);
  }

  let datos: Record<string, unknown>;
  try {
    datos = JSON.parse(readFileSync(entrada, "utf8"));
  } catch (error) {
    console.error(
      `ERROR: no pude leer ${entrada}: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }

  // --- Mes: del archivo (mes + anio) o de --mes ------------------------
  let mes = mesArg;

  if (!mes) {
    const nombreMes = String(datos.mes ?? "").trim().toLowerCase();
    const anio = Number(datos.anio);
    const numeroMes = MESES[normalizar(nombreMes)] ?? MESES[nombreMes];

    if (numeroMes && Number.isInteger(anio)) {
      mes = `${anio}-${String(numeroMes).padStart(2, "0")}`;
    }
  }

  if (!mes || !/^\d{4}-\d{2}$/.test(mes)) {
    console.error(
      `ERROR: no pude determinar el mes. Trae "mes"/"anio" legibles o pasa --mes YYYY-MM.`,
    );
    process.exit(1);
  }

  // --- Signos -----------------------------------------------------------
  const lista = datos.signos;

  if (!Array.isArray(lista)) {
    console.error(`ERROR: el archivo no trae "signos" como lista.`);
    process.exit(1);
  }

  const signos: Record<string, {
    titulo: string;
    texto: string;
    tags: string[];
    secciones: { etiqueta: string; texto: string }[];
  }> = {};

  const problemas: string[] = [];

  for (const item of lista as SignoGenerador[]) {
    const nombre = String(item.dinosaurio ?? "").trim();
    const slug = resolverSlug(nombre);

    if (!slug) {
      problemas.push(`signo sin match: "${nombre}"`);
      continue;
    }

    if (signos[slug]) {
      problemas.push(`signo repetido: ${slug}`);
      continue;
    }

    const intro = String(item.intro ?? "").trim();
    const superpoder = String(item.tu_superpoder ?? "").trim();

    if (!intro) problemas.push(`${slug}: falta "intro"`);

    const secciones = SECCIONES
      .map(({ clave, etiqueta }) => ({
        etiqueta,
        texto: String(item[clave] ?? "").trim(),
      }))
      .filter((s) => s.texto.length > 0);

    signos[slug] = {
      titulo: superpoder ? primeraFrase(superpoder) : nombre,
      texto: intro,
      tags: [],
      secciones,
    };
  }

  const faltantes = SIGNOS.map((s) => s.slug).filter((slug) => !signos[slug]);
  for (const slug of faltantes) problemas.push(`falta el signo ${slug}`);

  const salida = { mes, edicion: edicionNum, signos };

  const validacion = validarPrediccion(salida);

  console.log(`mes:     ${mes}`);
  console.log(`edicion: ${edicionNum}`);
  console.log(`signos:  ${Object.keys(signos).length}/12`);
  const totalSecciones = Object.values(signos).reduce((n, s) => n + s.secciones.length, 0);
  console.log(`secciones: ${totalSecciones}`);

  if (problemas.length > 0) {
    console.log("\navisos:");
    for (const p of problemas) console.log(`  - ${p}`);
  }

  if (!validacion.ok) {
    console.info(`\n${validacion.errores.length} problema(s) de formato:`);
    for (const e of validacion.errores) console.error(`  - ${e}`);
    console.info("\nNo se escribio el archivo.");
    process.exit(1);
  }

  const destino = out ?? `prediccion-${mes}.json`;
  writeFileSync(destino, JSON.stringify(salida, null, 2), "utf8");

  console.log(`\nOK: escrito ${destino} (${basename(destino)})`);
  console.log("Revisalo y subelo con: pnpm predicciones:subir " + destino);
}

main();
