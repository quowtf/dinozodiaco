/**
 * Setup de Resend: contact properties, topics, segments y backfill de contactos.
 *
 * Idempotente: se puede re-ejecutar sin duplicar nada.
 *
 * Uso:
 *   pnpm predicciones:setup
 *
 * Requiere en .env.local: RESEND_API_KEY.
 */

import { SIGNOS } from "@/data/signos";
import {
  asegurarProperties,
  asegurarSegments,
  asegurarTopics,
  conLimite,
  resendClient,
} from "@/lib/resend";

const PREFIJO = process.env.PREDICCIONES_SEGMENT_PREFIX || "dinozodiaco";

const PROPERTIES = ["signo", "privacidad_aceptada"];

const TOPICS = [
  {
    nombre: "predicciones",
    descripcion: "Predicciones mensuales de Dinozodiaco",
  },
  {
    nombre: "merch",
    descripcion: "Avisos de la tienda de Dinozodiaco",
  },
];

async function main() {
  const resend = resendClient();

  // --- 1. Contact properties --------------------------------------------
  console.log("\n== Contact properties ==");
  const properties = await asegurarProperties(PROPERTIES);
  console.log("properties en la cuenta:", properties.join(", "));

  // --- 2. Topics ---------------------------------------------------------
  console.log("\n== Topics ==");
  const topics = await asegurarTopics(TOPICS);
  for (const [nombre, id] of Object.entries(topics)) {
    console.log(`  ${nombre} -> ${id}`);
  }

  // --- 3. Segments -------------------------------------------------------
  console.log("\n== Segments ==");
  const nombresSegments = [
    ...SIGNOS.map((s) => `${PREFIJO}:${s.slug}`),
    `${PREFIJO}:inscritos`,
  ];
  const segments = await asegurarSegments(nombresSegments);
  for (const [nombre, id] of Object.entries(segments)) {
    console.log(`  ${nombre} -> ${id}`);
  }

  // --- 4. Backfill de contactos -----------------------------------------
  console.log("\n== Backfill de contactos ==");

  const topicPredicciones = topics.predicciones;
  const topicMerch = topics.merch;

  if (!topicPredicciones) {
    throw new Error('no se pudo crear el topic "predicciones"');
  }

  const emails: string[] = [];
  let cursor: string | undefined;

  for (let pagina = 0; pagina < 10; pagina++) {
    const { data, error } = await resend.contacts.list({
      limit: 100,
      ...(cursor ? { after: cursor } : {}),
    });

    if (error) {
      throw new Error(`contacts.list -> ${error.message}`);
    }

    for (const contacto of data.data) {
      emails.push(contacto.email);
    }

    if (!data.has_more || data.data.length === 0) break;
    cursor = data.data[data.data.length - 1].id;
  }

  console.log(`contactos en la cuenta: ${emails.length}`);

  const sinSigno: string[] = [];
  let actualizados = 0;

  const resultados = await conLimite(
    emails.map((email) => async () => {
      // contacts.list() no trae properties: hay que pedir el contacto.
      const { data, error } = await resend.contacts.get({ email });

      if (error) {
        return { email, estado: `error al leer: ${error.message}` };
      }

      const properties = data.properties as
        | Record<string, { value: unknown; type: string }>
        | undefined;
      const signo = properties?.signo?.value;

      if (typeof signo !== "string" || !SIGNOS.some((s) => s.slug === signo)) {
        return { email, estado: "sin-signo" };
      }

      const segmentId = segments[`${PREFIJO}:${signo}`];
      if (!segmentId) {
        return { email, estado: `sin segment para ${signo}` };
      }

      const { error: errorSegment } = await resend.contacts.segments.add({
        email,
        segmentId,
      });
      if (errorSegment) {
        return { email, estado: `error al anadir al segment: ${errorSegment.message}` };
      }

      const { error: errorTopic } = await resend.contacts.topics.update({
        email,
        topics: [
          { id: topicPredicciones, subscription: "opt_in" },
          ...(topicMerch ? [{ id: topicMerch, subscription: "opt_out" as const }] : []),
        ],
      });
      if (errorTopic) {
        return { email, estado: `error al actualizar topics: ${errorTopic.message}` };
      }

      return { email, estado: "ok" };
    }),
  );

  for (const resultado of resultados) {
    if (resultado instanceof Error) {
      console.log(`  ERROR: ${resultado.message}`);
      continue;
    }
    if (resultado.estado === "ok") {
      actualizados++;
    } else if (resultado.estado === "sin-signo") {
      sinSigno.push(resultado.email);
    } else {
      console.log(`  ${resultado.email}: ${resultado.estado}`);
    }
  }

  console.log(`\ncontactos actualizados: ${actualizados}`);
  if (sinSigno.length > 0) {
    console.log(`contactos SIN signo (revisar a mano): ${sinSigno.join(", ")}`);
  }

  console.log("\n== Resumen ==");
  console.log(`properties: ${properties.length}`);
  console.log(`topics:     ${Object.keys(topics).length}`);
  console.log(`segments:   ${Object.keys(segments).length}`);
  console.log(`contactos:  ${emails.length} (actualizados ${actualizados})`);
  console.log(
    "\nTodo listo. No hace falta copiar ids a ningun archivo: la app los resuelve por nombre.",
  );
}

main().catch((error) => {
  console.error("\nsetup fallido:", error);
  process.exit(1);
});
