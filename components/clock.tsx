"use client";

import { useEffect, useState } from "react";

export function Clock() {
  const [isNow, setIsNow] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      setIsNow((h === 6 || h === 18) && m === 6);
    };
    update();
    const id = setInterval(update, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <a
      className={`clock${isNow ? " is-now" : ""}`}
      href="#ritual"
      title={
        isNow
          ? "Es la hora Chicxulub. Lo que leas ahora cae con fuerza de meteorito."
          : "La hora Chicxulub. Vuelve a las 6:06."
      }
    >
      <span className="clock__dot" aria-hidden="true" />
      <span className="clock__time">{isNow ? "¡6:06!" : "6:06"}</span>
    </a>
  );
}
