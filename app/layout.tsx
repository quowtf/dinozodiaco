import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Fraunces } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: "variable",
  axes: ["opsz"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: "variable",
  axes: ["opsz"],
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
      <body>
        <a className="skip-link" href="#contenido">Saltar al contenido</a>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
