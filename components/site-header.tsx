import Link from "next/link";
import { Clock } from "./clock";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="wrap site-header__inner">
        <Link className="brand" href="/#inicio">
          <span className="brand__mark" aria-hidden="true">✦</span>
          <span className="brand__name">Dinozodiaco</span>
        </Link>

        <nav className="site-nav" aria-label="Navegación principal">
          <Link href="/#semana">Este mes</Link>
          <Link href="/#ritual">La hora 6:06</Link>
          <Link href="/#signos">Los 12 signos</Link>
          <Link href="/tienda">Tienda</Link>
        </nav>

        <Clock />
      </div>
    </header>
  );
}
