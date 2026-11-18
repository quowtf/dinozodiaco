import type { PrediccionBloque, PrediccionSeccion } from "@/lib/predicciones";

/**
 * Constructor del correo mensual de predicciones.
 *
 * Reglas (ver Tarea 4 del plan):
 * - Sin imagenes: nada de <img>, nada de SVG inline, nada de background-image remoto.
 *   El tracking de apertura de Resend es server-side, no necesita pixel.
 * - Estilos INLINE en cada celda (Outlook no lee <style> de forma fiable).
 * - Tablas, ancho 600 px.
 * - La version text/plain es gemela: mismo contenido, mismo orden.
 */

export interface EmailInput {
  nombre: string; // "Tiranosaurio"
  slug: string; // "01-tiranosaurio"
  latin: string;
  constelacion: string;
  elemento: string;
  modalidad: string;
  era: string;
  frase: string;
  dia: string;
  color: string;
  num: string;
  piedra: string;
  manada: string;
  bloque: PrediccionBloque; // titulo/texto/tags del mes para este signo
  secciones: PrediccionSeccion[]; // tech, manada, plata, hobby...
  edicion: number;
  mes: string; // "2026-12"
  mesLabel: string; // "Diciembre"
  unsubscribeUrl: string; // "{{{RESEND_UNSUBSCRIBE_URL}}}"
  sitioUrl: string;
}

const COLORES = {
  navy: "#15223b",
  navyCard: "#1a2946",
  navyDeep: "#101b30",
  line: "#2e4166",
  cream: "#efe6d2",
  creamDim: "#dcd5c6",
  muted: "#a9b3c7",
  gold: "#e0a458",
  goldSoft: "#f0c38a",
};

const SERIF = "Georgia, 'Times New Roman', Times, serif";
const SANS = "Arial, Helvetica, sans-serif";

function escapar(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Convierte saltos de linea sueltos en <br />. */
function parrafos(texto: string): string {
  return texto
    .trim()
    .split(/\n{2,}/)
    .map(
      (p) =>
        `<p style="margin:0 0 16px 0;font-family:${SANS};font-size:16px;line-height:1.6;color:${COLORES.cream};">${escapar(p).replace(/\n/g, "<br />")}</p>`,
    )
    .join("");
}

/** Fila de datos: etiqueta arriba, valor abajo. */
function celdaDato(etiqueta: string, valor: string): string {
  return `
        <td width="33%" style="padding:10px 8px;vertical-align:top;border:1px solid ${COLORES.line};">
          <div style="font-family:${SANS};font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${COLORES.muted};">${escapar(etiqueta)}</div>
          <div style="font-family:${SERIF};font-size:15px;color:${COLORES.cream};padding-top:3px;">${escapar(valor)}</div>
        </td>`;
}

/** Bloque con etiqueta (tech, manada, plata, hobby...). */
function bloqueSeccion(etiqueta: string, texto: string): string {
  return `
          <tr>
            <td style="padding:22px 32px 0 32px;">
              <p style="margin:0 0 6px 0;font-family:${SANS};font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${COLORES.gold};">${escapar(etiqueta)}</p>
              <p style="margin:0;font-family:${SANS};font-size:15px;line-height:1.6;color:${COLORES.creamDim};">${escapar(texto)}</p>
            </td>
          </tr>`;
}

/** Chips de tags. */
function filaTags(tags: string[]): string {
  if (tags.length === 0) return "";

  const chips = tags
    .map(
      (tag) =>
        `<span style="display:inline-block;border:1px solid ${COLORES.line};border-radius:999px;padding:5px 12px;margin:0 6px 6px 0;font-family:${SANS};font-size:13px;color:${COLORES.goldSoft};">${escapar(tag)}</span>`,
    )
    .join("");

  return `<tr>
            <td style="padding:4px 0 8px 0;">${chips}</td>
          </tr>`;
}

export function emailHtml(input: EmailInput): string {
  const {
    nombre,
    slug,
    latin,
    constelacion,
    elemento,
    modalidad,
    era,
    frase,
    dia,
    color,
    num,
    piedra,
    manada,
    bloque,
    secciones,
    edicion,
    mesLabel,
    unsubscribeUrl,
    sitioUrl,
  } = input;

  const preheader = `${bloque.titulo} — ${nombre}`;

  return `<!doctype html>
<html lang="es-MX">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Tu prediccion de ${escapar(mesLabel)}</title>
</head>
<body style="margin:0;padding:0;background-color:${COLORES.navy};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapar(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLORES.navy};">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:${COLORES.navyCard};border:1px solid ${COLORES.line};border-radius:12px;">

        <!-- Encabezado -->
        <tr>
          <td style="padding:28px 32px 8px 32px;">
            <p style="margin:0;font-family:${SANS};font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:${COLORES.gold};">Dinozodiaco</p>
            <h1 style="margin:8px 0 0 0;font-family:${SERIF};font-size:30px;line-height:1.2;font-weight:normal;color:${COLORES.cream};">${escapar(nombre)}</h1>
            <p style="margin:4px 0 0 0;font-family:${SANS};font-size:14px;font-style:italic;color:${COLORES.muted};">${escapar(latin)}</p>
            <p style="margin:10px 0 0 0;font-family:${SANS};font-size:13px;color:${COLORES.creamDim};">${escapar(mesLabel)} &middot; Edicion n.&deg; ${edicion}</p>
          </td>
        </tr>

        <!-- Prediccion del signo -->
        <tr>
          <td style="padding:22px 32px 0 32px;">
            <p style="margin:0;font-family:${SERIF};font-size:20px;line-height:1.35;color:${COLORES.goldSoft};">${escapar(bloque.titulo)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 32px 0 32px;">
            ${parrafos(bloque.texto)}
          </td>
        </tr>
        <tr>
          <td style="padding:4px 32px 0 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${filaTags(bloque.tags)}</table>
          </td>
        </tr>

        <!-- Secciones del signo (tech, manada, plata, hobby...) -->
        ${secciones.map((s) => bloqueSeccion(s.etiqueta, s.texto)).join("")}

        <!-- Ficha del dinosaurio -->
        <tr>
          <td style="padding:28px 32px 0 32px;">
            <p style="margin:0 0 10px 0;font-family:${SANS};font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${COLORES.muted};">Tu dinosaurio</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
              <tr>
                ${celdaDato("Constelacion", constelacion)}
                ${celdaDato("Elemento", elemento)}
                ${celdaDato("Modalidad", modalidad)}
              </tr>
              <tr>
                ${celdaDato("Era", era)}
                ${celdaDato("Dia de suerte", dia)}
                ${celdaDato("Piedra", piedra)}
              </tr>
              <tr>
                ${celdaDato("Color", color)}
                ${celdaDato("Numero", num)}
                <td width="33%" style="padding:10px 8px;vertical-align:top;border:1px solid ${COLORES.line};"></td>
              </tr>
            </table>
            <p style="margin:12px 0 0 0;font-family:${SANS};font-size:14px;color:${COLORES.creamDim};">Haces mejor manada con ${escapar(manada)}.</p>
          </td>
        </tr>

        <!-- Frase -->
        <tr>
          <td style="padding:24px 32px 0 32px;">
            <p style="margin:0;font-family:${SERIF};font-size:18px;font-style:italic;color:${COLORES.goldSoft};">&ldquo;${escapar(frase)}&rdquo;</p>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td align="center" style="padding:28px 32px 0 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
              <tr>
                <td align="center" bgcolor="${COLORES.gold}" style="border-radius:8px;">
                  <a href="${sitioUrl}/#${slug}" style="display:inline-block;padding:13px 26px;font-family:${SANS};font-size:15px;font-weight:bold;color:${COLORES.navyDeep};text-decoration:none;border-radius:8px;">Ver tu dinosaurio</a>
                </td>
              </tr>
            </table>
            <p style="margin:14px 0 0 0;font-family:${SANS};font-size:13px;color:${COLORES.muted};">Son las 6:06, la hora Chicxulub. Revisa a las 6:06 pm si ya se cumplio.</p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:28px 32px 26px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${COLORES.line};">
              <tr>
                <td style="padding-top:16px;">
                  <p style="margin:0;font-family:${SANS};font-size:12px;line-height:1.7;color:${COLORES.muted};">
                    Dinozodiaco &middot; hola@dinozodiaco.com<br />
                    <a href="${sitioUrl}/aviso-de-privacidad" style="color:${COLORES.muted};text-decoration:underline;">Aviso de privacidad</a>
                    &nbsp;&middot;&nbsp;
                    <a href="${unsubscribeUrl}" style="color:${COLORES.muted};text-decoration:underline;">Darte de baja</a>
                  </p>
                  <p style="margin:8px 0 0 0;font-family:${SANS};font-size:12px;line-height:1.6;color:${COLORES.muted};">Hecho por diversion, con amor y con IA. Ningun paleontologo fue consultado para predecir tu futuro.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

export function emailTexto(input: EmailInput): string {
  const {
    nombre,
    slug,
    latin,
    constelacion,
    elemento,
    modalidad,
    era,
    frase,
    dia,
    color,
    num,
    piedra,
    manada,
    bloque,
    secciones,
    edicion,
    mesLabel,
    unsubscribeUrl,
    sitioUrl,
  } = input;

  const lineas: string[] = [];

  lineas.push("DINOZODIACO");
  lineas.push("");
  lineas.push(`${nombre} — ${latin}`);
  lineas.push(`${mesLabel} · Edicion n.o ${edicion}`);
  lineas.push("");
  lineas.push("=".repeat(46));
  lineas.push("");
  lineas.push(bloque.titulo);
  lineas.push("");
  lineas.push(bloque.texto);
  lineas.push("");

  if (bloque.tags.length > 0) {
    lineas.push(bloque.tags.map((t) => `· ${t}`).join("   "));
    lineas.push("");
  }

  for (const seccion of secciones) {
    lineas.push("-".repeat(46));
    lineas.push(seccion.etiqueta.toUpperCase());
    lineas.push("");
    lineas.push(seccion.texto);
    lineas.push("");
  }

  lineas.push("-".repeat(46));
  lineas.push("TU DINOSAURIO");
  lineas.push("");
  lineas.push(`Constelacion: ${constelacion}`);
  lineas.push(`Elemento:     ${elemento}`);
  lineas.push(`Modalidad:    ${modalidad}`);
  lineas.push(`Era:          ${era}`);
  lineas.push(`Dia de suerte: ${dia}`);
  lineas.push(`Piedra:       ${piedra}`);
  lineas.push(`Color:        ${color}`);
  lineas.push(`Numero:       ${num}`);
  lineas.push(`Haces mejor manada con ${manada}.`);
  lineas.push("");
  lineas.push(`"${frase}"`);
  lineas.push("");
  lineas.push("=".repeat(46));
  lineas.push("");
  lineas.push(`Ver tu dinosaurio: ${sitioUrl}/#${slug}`);
  lineas.push("");
  lineas.push("Son las 6:06, la hora Chicxulub. Revisa a las 6:06 pm si ya se cumplio.");
  lineas.push("");
  lineas.push("Dinozodiaco · hola@dinozodiaco.com");
  lineas.push(`Aviso de privacidad: ${sitioUrl}/aviso-de-privacidad`);
  lineas.push(`Darte de baja: ${unsubscribeUrl}`);

  return lineas.join("\n");
}
