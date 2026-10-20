import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Fraunces } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Dinozodiaco · Tu horóscopo con 66 millones de años de antigüedad",
  description:
    "El horóscopo dinosaurio que se lee a las 6:06, la hora Chicxulub. Doce dinosaurios, doce personalidades, y una predicción nueva cada mes.",
  openGraph: {
    type: "website",
    title: "Dinozodiaco",
    description: "Tu signo no está escrito en las estrellas. Está escrito en los fósiles.",
  },
};

export const viewport: Viewport = {
  themeColor: "#15223b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX" className={`${fraunces.variable} ${bricolage.variable}`}>
      <body>{children}</body>
    </html>
  );
}
