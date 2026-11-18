import type { Signo } from "@/data/signos";
import type { EmailInput } from "@/lib/email-prediccion";
import { etiquetaMes, type PrediccionMes } from "@/lib/predicciones";

/**
 * Logica compartida por el endpoint de envio:
 * ventana horaria y armado del contenido del correo.
 */

const PREFIJO_SEGMENTO = () =>
  process.env.PREDICCIONES_SEGMENT_PREFIX || "dinozodiaco";

/** Prefijo de los segments (exportado para quitar contacts de segments viejos). */
export function prefijoSegmento(): string {
  return PREFIJO_SEGMENTO();
}

export function zonaHoraria(): string {
  return process.env.PREDICCIONES_ZONA || "America/Mexico_City";
}

export function diaEnvio(): number {
  const bruto = process.env.PREDICCIONES_DIA || "1";
  const n = Number(bruto);
  return Number.isInteger(n) && n >= 1 && n <= 31 ? n : 1;
}

/** "18:06" -> 1086 (minutos desde medianoche). */
export function minutoObjetivo(): number {
  const bruto = process.env.PREDICCIONES_HORA || "18:06";
  const match = /^(\d{1,2}):(\d{2})$/.exec(bruto.trim());

  if (!match) {
    throw new Error(
      `PREDICCIONES_HORA invalido: "${bruto}" (se esperaba HH:MM en 24 h)`,
    );
  }

  const hora = Number(match[1]);
  const minuto = Number(match[2]);

  if (hora > 23 || minuto > 59) {
    throw new Error(`PREDICCIONES_HORA fuera de rango: "${bruto}"`);
  }

  return hora * 60 + minuto;
}

export interface PartesLocales {
  anio: number;
  mes: number;
  dia: number;
  hora: number;
  minuto: number;
  minutoDelDia: number;
  iso: string;
}

/** Descompone una fecha en la zona horaria configurada. */
export function partesLocales(fecha: Date): PartesLocales {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: zonaHoraria(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const partes = Object.fromEntries(
    fmt.formatToParts(fecha).map((p) => [p.type, p.value]),
  );

  const anio = Number(partes.year);
  const mes = Number(partes.month);
  const dia = Number(partes.day);
  const hora = Number(partes.hour);
  const minuto = Number(partes.minute);

  const iso = `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")} ${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;

  return { anio, mes, dia, hora, minuto, minutoDelDia: hora * 60 + minuto, iso };
}

export interface Ventana {
  dentro: boolean;
  ahoraLocal: string;
  motivo: string;
}

/**
 * El envio solo procede el dia configurado (PREDICCIONES_DIA) y a partir de
 * la hora configurada (PREDICCIONES_HORA), en la zona horaria configurada.
 *
 * El cron de GitHub Actions corre en UTC y puede retrasarse; por eso la
 * decision se toma aqui, no en el cron.
 */
export function dentroDeVentana(fecha: Date = new Date()): Ventana {
  const local = partesLocales(fecha);
  const objetivo = minutoObjetivo();
  const dia = diaEnvio();

  if (local.dia !== dia) {
    return {
      dentro: false,
      ahoraLocal: local.iso,
      motivo: `fuera-de-ventana: hoy es el dia ${local.dia} local y se envia el dia ${dia}`,
    };
  }

  if (local.minutoDelDia < objetivo) {
    return {
      dentro: false,
      ahoraLocal: local.iso,
      motivo: `fuera-de-ventana: son las ${local.hora}:${String(local.minuto).padStart(2, "0")} local y se envia a las ${process.env.PREDICCIONES_HORA || "18:06"}`,
    };
  }

  return {
    dentro: true,
    ahoraLocal: local.iso,
    motivo: "dentro-de-ventana",
  };
}

export function sitioUrl(): string {
  return (process.env.SITE_URL || "https://dinozodiaco.com").replace(/\/+$/, "");
}

export function remitente(): string {
  const from = process.env.RESEND_FROM;
  if (!from) throw new Error("falta RESEND_FROM");
  const nombre = process.env.RESEND_FROM_NAME || "Dinozodiaco";
  return `${nombre} <${from}>`;
}

/** Nombre del segment de un signo. */
export function nombreSegmento(slug: string): string {
  return `${PREFIJO_SEGMENTO()}:${slug}`;
}

/**
 * Arma el contenido del correo de un signo.
 *
 * `unsubscribeUrl` llega con el placeholder literal `{{{RESEND_UNSUBSCRIBE_URL}}}`
 * en los broadcasts: Resend lo sustituye por un link unico por destinatario.
 * En los correos de prueba (no broadcast) se sustituye por el aviso de
 * privacidad, porque Resend no resuelve ese placeholder fuera de broadcasts.
 */
export function construirEmailInput(
  signo: Signo,
  prediccion: PrediccionMes,
  opciones: { unsubscribeUrl: string; sitio: string },
): EmailInput {
  const bloque = prediccion.signos[signo.slug];

  if (!bloque) {
    throw new Error(`la prediccion no tiene el signo ${signo.slug}`);
  }

  return {
    nombre: signo.nombre,
    slug: signo.slug,
    latin: signo.latin,
    constelacion: signo.constelacion,
    elemento: signo.elemento,
    modalidad: signo.modalidad,
    era: signo.era,
    frase: signo.frase,
    dia: signo.dia,
    color: signo.color,
    num: signo.num,
    piedra: signo.piedra,
    manada: signo.manada,
    bloque,
    secciones: bloque.secciones ?? [],
    edicion: prediccion.edicion,
    mes: prediccion.mes,
    mesLabel: etiquetaMes(prediccion.mes),
    unsubscribeUrl: opciones.unsubscribeUrl,
    sitioUrl: opciones.sitio,
  };
}
