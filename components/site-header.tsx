import { Clock } from "./clock";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="wrap site-header__inner">
        <a className="brand" href="#inicio">
          <span className="brand__mark" aria-hidden="true">✦</span>
          <span className="brand__name">Dinozodiaco</span>
        </a>

        <nav className="site-nav" aria-label="Navegación principal">
          <a href="#semana">Este mes</a>
          <a href="#ritual">La hora 6:06</a>
          <a href="#signos">Los 12 signos</a>
        </nav>

        <Clock />
      </div>
    </header>
  );
}
