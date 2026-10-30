"use client";

import { useState } from "react";

type Props = {
  src: string;
  nombre: string;
  slug: string;
};

export function ShareCardButton({ src, nombre, slug }: Props) {
  const [preparando, setPreparando] = useState(false);
  const filename = `dinozodiaco-${slug}.png`;

  function descargar() {
    const a = document.createElement("a");
    a.href = src;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function compartir(event: React.MouseEvent<HTMLAnchorElement>) {
    if (typeof navigator === "undefined" || !navigator.share || !navigator.canShare) {
      return; // deja que el enlace descargue normalmente
    }

    event.preventDefault();
    setPreparando(true);

    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: "image/png" });

      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Dinozodiaco · ${nombre}`,
          text: `Mi tarjeta de ${nombre} en Dinozodiaco`,
        });
      } else {
        descargar();
      }
    } catch (error) {
      // Si la persona cancela el menú de compartir, no forzamos la descarga.
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        descargar();
      }
    } finally {
      setPreparando(false);
    }
  }

  return (
    <a
      className="btn btn--ghost sign__share"
      href={src}
      download={filename}
      onClick={compartir}
      aria-label={`Descargar tarjeta de ${nombre}`}
      aria-busy={preparando}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3v12" />
        <path d="m7 8 5-5 5 5" />
        <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
      </svg>
      {preparando ? "Preparando…" : "Descargar tarjeta"}
    </a>
  );
}
