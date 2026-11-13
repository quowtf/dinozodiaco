/**
 * Ensambla el JSON de un mes a partir de textos sueltos.
 *
 * Escenario: el tercero manda 13 archivos de texto plano y hay que
 * convertirlos al JSON que espera `scripts/predicciones.ts subir`.
 *
 *   pnpm predicciones:ensamblar --dir ~/dinozodiaco/textos-2026-12 --mes 2026-12 --edicion 3 --out /tmp/2026-12.json
 *
 * Archivos esperados en --dir:
 *   general.txt              -> la prediccion general
 *   <slug>.txt               -> una por signo (ej. 01-tiranosaurio.txt)
 *   meta.json (opcional)     -> { "mes": "...", "edicion": N, "mesLabel": "..." }
 *
 * Formato de cada archivo:
 *   primera linea "Titulo: ..." o "# ..."  -> titulo
 *   lineas que empiezan con "- " o "• "     -> tags (maximo 3)
 *   resto                                     -> texto
 */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { SIGNOS } from "@/data/signos";
import { validarPrediccion } from "@/lib/predicciones";

function usage(): never {
  console.error(
    [
      "Uso:",
      "  ensamblar-predicciones.ts --dir <carpeta> --mes YYYY-MM [--edicion N] [--out archivo.json]",
    ].join("\n"),
  );
  process.exit(1);
}

function args(): {
  dir: string;
  mes: string;
  edicion: number;
  out: string;
} {
  const argv = process.argv.slice(2);
  const valor = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : undefined;
  };

  const dir = valor("--dir");
  const mes = valor("--mes");
  const edicion = valor("--edicion");
  const out = valor("--out");

  if (!dir || !mes) usage();

  if (!/^\d{4}-\d{2}$/.test(mes)) {
    console.error(`ERROR: --mes invalido: ${mes} (se esperaba YYYY-MM)`);
    process.exit(1);
  }

  return {
    dir,
    mes,
    edicion: edicion ? Number(edicion) : 1,
    out: out ?? join(process.cwd(), `predicciones-${mes}.json`),
  };
}

/** Quita acentos y pasa a minusculas, para comparar nombres. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/** Resuelve el nombre de archivo al slug del signo. */
function slugDesdeNombre(nombreArchivo: string): string | null {
  const base = basename(nombreArchivo).replace(/\.txt$/i, "");

  // 1. Coincidencia directa con el slug.
  const porSlug = SIGNOS.find((s) => s.slug === base);
  if (porSlug) return porSlug.slug;

  // 2. "01-tiranosaurio" -> "01 Tiranosaurio"
  const partes = base.match(/^(\d{1,2})[-_ ]*(.+)$/);
  const nombre = partes ? partes[2] : base;

  const porNombre = SIGNOS.find((s) => normalizar(s.nombre) === normalizar(nombre));
  if (porNombre) return porNombre.slug;

  // 3. Match laxo: el nombre sin el numero.
  const porLaxo = SIGNOS.find((s) => normalizar(s.nombre) === normalizar(base));
  if (porLaxo) return porLaxo.slug;

  return null;
}

interface Bloque {
  titulo: string;
  texto: string;
  tags: string[];
}

function parsearTexto(contenido: string): Bloque {
  const lineas = contenido.replace(/\r\n/g, "\n").split("\n");

  let titulo = "";
  const cuerpo: string[] = [];
  const tags: string[] = [];
  let enTags = false;

  for (const linea of lineas) {
    const recortada = linea.trim();

    if (recortada === "") {
      // Linea vacia: corta el bloque de tags, no el cuerpo.
      if (cuerpo.length > 0) enTags = false;
      continue;
    }

    if (!titulo) {
      const conPrefijo = /^Titulo:\s*(.+)$/i.exec(recortada);
      const conHash = /^#\s*(.+)$/.exec(recortada);

      if (conPrefijo) {
        titulo = conPrefijo[1].trim();
        continue;
      }
      if (conHash) {
        titulo = conHash[1].trim();
        continue;
      }
    }

    if (/^[-•*]\s+/.test(recortada)) {
      enTags = true;
      if (tags.length < 3) {
        tags.push(recortada.replace(/^[-•*]\s+/, "").trim());
      }
      continue;
    }

    if (enTags && tags.length >= 3) {
      // Tags extras se ignoran, pero el texto sigue.
      enTags = false;
    }

    cuerpo.push(recortada);
  }

  return {
    titulo,
    texto: cuerpo.join("\n\n"),
    tags,
  };
}

function main() {
  const opciones = args();

  let meta: { mes?: string; edicion?: number; mesLabel?: string } = {};
  try {
    meta = JSON.parse(readFileSync(join(opciones.dir, "meta.json"), "utf8"));
  } catch {
    // meta.json es opcional.
  }

  const edicion = meta.edicion ?? opciones.edicion;

  const archivos = readdirSync(opciones.dir).filter((f) => f.toLowerCase().endsWith(".txt"));

  const signos: Record<string, Bloque> = {};
  const sobrantes: string[] = [];

  for (const archivo of archivos) {
    if (basename(archivo).toLowerCase() === "general.txt") continue;

    const slug = slugDesdeNombre(archivo);
    if (!slug) {
      sobrantes.push(archivo);
      continue;
    }

    const contenido = readFileSync(join(opciones.dir, archivo), "utf8");
    signos[slug] = parsearTexto(contenido);
  }

  // General.
  let general: Bloque;
  const rutaGeneral = join(opciones.dir, "general.txt");
  try {
    general = parsearTexto(readFileSync(rutaGeneral, "utf8"));
  } catch {
    console.error(`ERROR: falta general.txt en ${opciones.dir}`);
    process.exit(1);
  }

  const datos = {
    mes: meta.mes ?? opciones.mes,
    edicion,
    general,
    signos,
  };

  const resultado = validarPrediccion(datos);

  console.log(`signos ensamblados: ${Object.keys(signos).length}/12`);
  if (sobrantes.length > 0) {
    console.log(
      `archivos sin signo reconocible (ignorados): ${sobrantes.join(", ")}`,
    );
  }

  if (!resultado.ok) {
    console.error(`\n${resultado.errores.length} problema(s):`);
    for (const error of resultado.errores) {
      console.error(`  - ${error}`);
    }
    console.error("\nNo se escribio el archivo. Revisa los textos.");
    process.exit(1);
  }

  writeFileSync(opciones.out, JSON.stringify(datos, null, 2), "utf8");
  console.log(`\nOK: escrito ${opciones.out}`);
  console.log("Revisalo y luego subelo con: predicciones.ts subir <archivo>");
}

main();
