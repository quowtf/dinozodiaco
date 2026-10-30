import { getConstelacion } from "@/lib/constelacion";
import { ShareCardButton } from "@/components/share-card-button";
import type { Signo } from "@/data/signos";

export async function SignCard({ signo: s }: { signo: Signo }) {
  const orb = await getConstelacion(s.slug);

  return (
    <article id={s.slug} className="sign">
      <div className="sign__orb" dangerouslySetInnerHTML={{ __html: orb }} />

      <div className="sign__head">
        <h3 className="sign__name">{s.nombre}</h3>
        <p className="sign__latin">{s.latin}</p>
        <p className="sign__dates">{s.fechas}</p>
      </div>

      <div className="sign__attrs">
        <div><span className="attr__label">Elemento</span><span className="attr__value">{s.elemento}</span></div>
        <div><span className="attr__label">Modalidad</span><span className="attr__value">{s.modalidad}</span></div>
        <div><span className="attr__label">Era regente</span><span className="attr__value">{s.era}</span></div>
      </div>

      <p className="sign__desc">{s.desc}</p>

      <div className="sign__lists">
        <div>
          <h4>Fortalezas</h4>
          <ul>
            {s.fortalezas.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4>Debilidades</h4>
          <ul>
            {s.debilidades.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </div>

      <p className="sign__manada">
        <span className="attr__label">Haces mejor manada con</span>
        <span className="attr__value">{s.manada}</span>
      </p>

      <div className="sign__facts">
        <div><span className="facts__label">Día de suerte</span><span className="facts__value">{s.dia}</span></div>
        <div>
          <span className="facts__label">Color</span>
          <span className="facts__value">
            <span className="dot" style={{ background: s.accent }} />
            {s.color}
          </span>
        </div>
        <div><span className="facts__label">Número</span><span className="facts__value">{s.num}</span></div>
        <div><span className="facts__label">Piedra</span><span className="facts__value">{s.piedra}</span></div>
      </div>

      <p className="sign__quote">“{s.frase}”</p>

      <ShareCardButton src={s.tarjeta} nombre={s.nombre} slug={s.slug} />
    </article>
  );
}
