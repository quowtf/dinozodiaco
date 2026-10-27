const WHEEL_SIGNS = [
  { slug: "01-tiranosaurio", nombre: "Tiranosaurio", constelacion: "Aries", x: 280, y: 68 },
  { slug: "02-triceratops", nombre: "Triceratops", constelacion: "Tauro", x: 384, y: 95.9 },
  { slug: "03-celofisis", nombre: "Celofisis", constelacion: "Géminis", x: 460.1, y: 172 },
  { slug: "04-maiasaura", nombre: "Maiasaura", constelacion: "Cáncer", x: 488, y: 276 },
  { slug: "05-braquiosaurio", nombre: "Braquiosaurio", constelacion: "Leo", x: 460.1, y: 380 },
  { slug: "06-estegosaurio", nombre: "Estegosaurio", constelacion: "Virgo", x: 384, y: 456.1 },
  { slug: "07-diplodoco", nombre: "Diplodoco", constelacion: "Libra", x: 280, y: 484 },
  { slug: "08-velociraptor", nombre: "Velociraptor", constelacion: "Escorpio", x: 176, y: 456.1 },
  { slug: "09-arqueopterix", nombre: "Arqueópterix", constelacion: "Sagitario", x: 99.9, y: 380 },
  { slug: "10-anquilosaurio", nombre: "Anquilosaurio", constelacion: "Capricornio", x: 72, y: 276 },
  { slug: "11-therizinosaurio", nombre: "Therizinosaurio", constelacion: "Acuario", x: 99.9, y: 172 },
  { slug: "12-espinosaurio", nombre: "Espinosaurio", constelacion: "Piscis", x: 176, y: 95.9 },
];

const STARS: Array<[number, number, number]> = [
  [285.7, 355.1, 1.1], [337.8, 246.3, 1.5], [290.6, 284.6, 1.1], [277.8, 318.1, 1.5],
  [171.5, 300.5, 1.1], [189.5, 348.2, 0.8], [204.4, 194.4, 1.5], [270.9, 287.5, 0.8],
  [347.3, 385.2, 0.8], [275.7, 293.0, 1.1], [185.1, 296.4, 1.1], [253.1, 162.5, 1.1],
  [269.1, 201.5, 0.8], [295.7, 265.0, 0.8], [239.1, 281.3, 1.5], [201.6, 313.3, 1.1],
  [183.2, 332.3, 1.5], [232.5, 344.6, 1.5], [285.6, 330.1, 0.8], [359.9, 178.8, 1.5],
  [248.5, 191.6, 1.1], [395.6, 253.9, 1.5], [350.4, 333.9, 1.5], [318.7, 211.3, 1.1],
  [328.1, 327.8, 1.5], [300.6, 278.7, 0.8], [256.2, 295.0, 1.1], [226.3, 306.4, 0.8],
  [360.5, 303.0, 0.8], [222.2, 335.8, 1.5], [373.6, 193.1, 1.5], [281.3, 294.3, 0.8],
  [352.6, 318.1, 0.8], [400.1, 240.1, 1.1], [257.9, 261.6, 0.8], [330.4, 273.6, 1.1],
  [393.7, 249.8, 1.1], [198.2, 360.0, 1.1], [229.6, 216.0, 1.5], [381.3, 356.1, 1.5],
];

const toRad = (deg: number) => (deg * Math.PI) / 180;
const pointAt = (angle: number, radius: number) => ({
  x: 280 + radius * Math.sin(toRad(angle)),
  y: 280 - radius * Math.cos(toRad(angle)),
});

export function DinoWheel() {
  return (
    <svg
      className="wheel"
      viewBox="0 0 560 560"
      role="group"
      aria-label="Rueda del Dinozodiaco: elige un signo para ver su tarjeta"
    >
      <circle cx="280" cy="280" r="272" fill="none" stroke="#efe6d2" strokeWidth="1.2" />
      <circle cx="280" cy="280" r="262" fill="none" stroke="#2e4166" strokeWidth="1" />
      <circle cx="280" cy="280" r="150" fill="none" stroke="#efe6d2" strokeWidth="1.2" />
      <circle cx="280" cy="280" r="138" fill="none" stroke="#2e4166" strokeWidth="0.8" strokeDasharray="2 6" />

      {WHEEL_SIGNS.map((_, i) => {
        const angle = i * 30 - 15;
        const start = pointAt(angle, 150);
        const end = pointAt(angle, 272);
        return (
          <g key={`divider-${i}`}>
            <line
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke="#2e4166"
              strokeWidth="1"
            />
            <circle cx={end.x} cy={end.y} r="3" fill="#e0a458" />
          </g>
        );
      })}

      {WHEEL_SIGNS.map((sign) => (
        <a
          key={sign.slug}
          className="wheel-sign"
          href={`#${sign.slug}`}
          aria-label={`${sign.nombre}, ${sign.constelacion}`}
        >
          <text
            className="wheel-sign__name"
            x={sign.x}
            y={sign.y}
            textAnchor="middle"
            fontSize="15"
            fontWeight="600"
            fill="#efe6d2"
          >
            {sign.nombre}
          </text>
          <text
            className="wheel-sign__constelacion"
            x={sign.x}
            y={sign.y + 18}
            textAnchor="middle"
            fontStyle="italic"
            fontSize="13"
            fill="#e0a458"
          >
            {sign.constelacion}
          </text>
        </a>
      ))}

      {STARS.map(([cx, cy, r], i) => (
        <circle key={`star-${i}`} cx={cx} cy={cy} r={r} fill="#efe6d2" opacity="0.5" />
      ))}

      <text x="280" y="270" textAnchor="middle" fontSize="30" fontWeight="600" fill="#efe6d2">
        12 signos
      </text>
      <text x="280" y="300" textAnchor="middle" fontStyle="italic" fontSize="16" fill="#a9b3c7">
        4 elementos, 3 eras
      </text>
    </svg>
  );
}
