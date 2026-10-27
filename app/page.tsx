import { SignCard } from "@/components/sign-card";
import { DinoWheel } from "@/components/wheel";
import { SubscribeForm } from "@/components/subscribe-form";
import { SIGNOS } from "@/data/signos";

export default function Home() {
  return (
    <main id="contenido">
      {/* ===== HERO ===== */}
      <section className="hero" id="inicio">
        <div className="wrap hero__inner">
          <div className="hero__copy">
            <p className="eyebrow">Un horóscopo con 66 millones de años de antigüedad</p>
            <h1 className="hero__title">Dino&shy;zodiaco</h1>
            <p className="hero__lead">
              Tu signo no está escrito en las estrellas.
              Está escrito en los fósiles.
            </p>
            <p className="hero__text">
              Doce dinosaurios, doce personalidades. Busca tu fecha de nacimiento,
              conoce a tu dinosaurio y descubre con quién haces mejor manada. Hecho
              por diversión: ningún paleontólogo fue consultado para predecir tu futuro.
            </p>
          </div>

          <div className="hero__wheel">
            <DinoWheel />
          </div>
        </div>
      </section>

      {/* ===== HORÓSCOPO DE LA SEMANA ===== */}
      <section className="week" id="semana" aria-labelledby="week-title">
        <div className="wrap week__inner">
          <header className="section-head section-head--center">
            <p className="kicker">Predicción mensual</p>
            <h2 className="section-title" id="week-title">Lo de este mes</h2>
            <p className="week__dates">Oct · Edición nº 2</p>
          </header>

          <blockquote className="chicxulub">
            <p>Son las 6:06, la hora Chicxulub. Lo que leas ahora cae con fuerza de meteorito.</p>
          </blockquote>

          <article className="week-card">
            <div className="week-card__top">
              <span className="tag tag--gold">Predicción general</span>
              <span className="week-card__icon" aria-hidden="true">☄</span>
            </div>
            <p className="week-card__forecast">
              Semana de impacto. El cielo trae ganas de empezar cosas y poca
              paciencia para lo que ya no sirve. Los de tierra sostienen, los de
              fuego arrancan, los de aire proponen y los de agua sienten todo al
              doble. Si algo se va a caer, que caiga esta semana: después queda el
              terreno libre para lo nuevo. Revisa a las 6:06 de la tarde si ya cayó.
            </p>
            <ul className="week-card__tags">
              <li>☄ Energía de arranque</li>
              <li>✦ Semana para soltar</li>
              <li>◐ Revisa a las 6:06 pm</li>
            </ul>
          </article>

          <p className="week__note">
            Nueva predicción cada mes.
          </p>
        </div>
      </section>

      {/* ===== EL RITUAL / LA HORA CHICXULUB ===== */}
      <section className="ritual" id="ritual" aria-labelledby="ritual-title">
        <div className="wrap ritual__inner">
          <div className="ritual__copy">
            <p className="kicker kicker--gold">El ritual</p>
            <h2 className="section-title" id="ritual-title">6:06, la hora Chicxulub</h2>
            <p className="ritual__text">
              Lee los dígitos como <strong>66</strong> y tienes los 66 millones de años
              que han pasado desde que el asteroide cayó en Chicxulub, Yucatán, y terminó
              con la era de los dinosaurios. Ese impacto cerró su historia y abrió la
              nuestra, así que no hay mejor minuto para mirar hacia adelante.
            </p>
            <p className="ritual__text">
              Y hay un detalle que ningún otro zodiaco tiene: el momento más importante
              en la historia de los dinosaurios pasó aquí, en México.
            </p>
          </div>

          <ol className="ritual__steps">
            <li className="ritual-step">
              <span className="ritual-step__time">6:06 <em>am</em></span>
              <span className="ritual-step__text">Lees tu predicción del día.</span>
            </li>
            <li className="ritual-step">
              <span className="ritual-step__time">6:06 <em>pm</em></span>
              <span className="ritual-step__text">Revisas si se cumplió.</span>
            </li>
            <li className="ritual-step">
              <span className="ritual-step__time">11:11 <em>vibe</em></span>
              <span className="ritual-step__text">Es un número que se repite: lo cachas en tu celular sin buscarlo.</span>
            </li>
          </ol>
        </div>
      </section>

      {/* ===== CÓMO LEER TU SIGNO ===== */}
      <section className="howto" aria-labelledby="howto-title">
        <div className="wrap howto__inner">
          <header className="section-head">
            <h2 className="section-title" id="howto-title">Cómo leer tu signo</h2>
          </header>

          <div className="howto__cols">
            <div className="howto-col">
              <h3 className="howto-col__title">Elementos</h3>
              <dl className="deflist">
                <dt>Fuego</dt>
                <dd>Tiranosaurio, Braquiosaurio y Arqueoptérix. Energía, pasión y cero paciencia para lo tibio.</dd>
                <dt>Tierra</dt>
                <dd>Triceratops, Estegosaurio y Anquilosaurio. Constancia, estructura y los pies bien plantados.</dd>
                <dt>Aire</dt>
                <dd>Celofisis, Diplodoco y Therizinosaurio. Ideas, conversación y mente siempre en movimiento.</dd>
                <dt>Agua</dt>
                <dd>Maiasaura, Velociraptor y Espinosaurio. Intuición, emoción y profundidad.</dd>
              </dl>
            </div>

            <div className="howto-col">
              <h3 className="howto-col__title">Modalidades</h3>
              <dl className="deflist">
                <dt>Cardinal</dt>
                <dd>Tiranosaurio, Maiasaura, Diplodoco y Anquilosaurio. Los que arrancan: abren camino y empiezan proyectos.</dd>
                <dt>Fijo</dt>
                <dd>Triceratops, Braquiosaurio, Velociraptor y Therizinosaurio. Los que sostienen: firmes, leales y difíciles de mover.</dd>
                <dt>Mutable</dt>
                <dd>Celofisis, Estegosaurio, Arqueoptérix y Espinosaurio. Los que se adaptan: flexibles y listos para el cambio.</dd>
              </dl>
            </div>

            <div className="howto-col">
              <h3 className="howto-col__title">Eras regentes</h3>
              <dl className="deflist">
                <dt>Triásico</dt>
                <dd>Hace 252 a 201 millones de años. Los pioneros, los primeros en salir a escena.</dd>
                <dt>Jurásico</dt>
                <dd>Hace 201 a 145 millones de años. Los gigantes de cuello largo y los que aprendieron a volar.</dd>
                <dt>Cretácico</dt>
                <dd>Hace 145 a 66 millones de años. La era más diversa, y la de los dinosaurios más famosos.</dd>
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* ===== LOS DOCE SIGNOS ===== */}
      <section className="signs" id="signos" aria-labelledby="signs-title">
        <div className="wrap signs__inner">
          <header className="section-head signs__head">
            <div>
              <h2 className="section-title" id="signs-title">Los doce signos</h2>
            </div>
            <p className="signs__sub">Mismas fechas que el zodiaco tradicional, así que ya sabes cuál te toca.</p>
          </header>

          <div className="signs__grid">
            {SIGNOS.map((s) => (
              <SignCard key={s.slug} signo={s} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className="cta" aria-labelledby="cta-title">
        <div className="wrap cta__inner">
          <h2 className="cta__title" id="cta-title">Recibe tu predicción</h2>
          <p className="cta__text">
            Cada mes una predicción nueva. Déjanos tu correo y te mandamos la siguiente.
          </p>
          <SubscribeForm />
          <p className="cta__fine">Sin spam. Solo dinosaurios y predicciones una vez por mes. Y avisos cuando este lista la merch.</p>
        </div>
      </section>
    </main>
  );
}
