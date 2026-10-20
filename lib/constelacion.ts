import { readFile } from "node:fs/promises";
import path from "node:path";

/* Lee el SVG local de la constelación e inserta las clases de animación.
   Son archivos propios de public/, así que es seguro inyectarlos como HTML. */
export async function getConstelacion(slug: string): Promise<string> {
  "use cache";
  const file = path.join(process.cwd(), "public", "assets", "svg", `${slug}.svg`);
  const svg = await readFile(file, "utf8");

  let i = 0;
  return svg
    .replace("<svg ", '<svg class="constellation" ')
    .replace(/<circle ([^>]*opacity="0.45"[^>]*)>/g, (_, attrs: string) => {
      const delay = `${(i++ % 6) * 0.5}s`;
      return `<circle class="twinkle" style="--d:${delay}" ${attrs}>`;
    });
}
