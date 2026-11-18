# Predicciones mensuales de Dinozodiaco

Todo lo que hay que saber para escribir un mes. No hace falta saber programar.

---

## 1. De qué va

Dinozodiaco es un horóscopo donde los doce signos son dinosaurios. Cada mes sale una
predicción nueva: una distinta para cada signo, que se manda por correo el día 1.

La predicción general del mes es aparte: va **solo en el sitio web**, no en el correo.

Tono: burlón pero cariñoso, en español de México. Como un amigo que sabe de ti.
Cero misticismo serio, cero predicciones del fin del mundo.

---

## 2. Formato: un archivo JSON por mes

```json
{
  "titulo": "Predicciones de diciembre 2026",
  "marca": "Dinozodiaco",
  "mes": "diciembre",
  "anio": 2026,
  "signos": [
    {
      "orden": 1,
      "dinosaurio": "Tiranosaurio",
      "fechas": "21 de marzo al 19 de abril",
      "intro": "Diciembre te pide cerrar el año con la presa en la boca. Lo que soltaste en noviembre ahora se convierte en impulso.",
      "tech": "Ese proyecto que arrastraste todo el año por fin entra en su última semana. Ciérralo, aunque no esté perfecto.",
      "manada": "Vas a tener una conversación que venías evitando desde octubre. Después del 20, todo se acomoda.",
      "plata": "El dinero que apartaste a mitad de año se convierte en el regalo que de verdad quieres dar.",
      "hobby": "Tu hobby vuelve a ser juego cuando dejas de medirlo por resultados.",
      "tu_superpoder": "Cerrar ciclos. Sabes cuándo algo terminó y no miras atrás.",
      "tu_rabbit_hole": "Sue, el tiranosaurio más completo del mundo, está en Chicago. Lleva el nombre de quien lo encontró.",
      "fosil_de_la_suerte": "Huella de terópodo. Dejas marca por donde pasas."
    }
  ]
}
```

El ejemplo está incompleto a propósito: el archivo real lleva los **12** signos.

### Los 12 signos

El campo `dinosaurio` tiene que ser el nombre exacto. El número de `orden` es opcional
pero ayuda a revisar.

| Nombre | Fechas |
|---|---|
| Tiranosaurio | 21 de marzo al 19 de abril |
| Triceratops | 20 de abril al 20 de mayo |
| Celofisis | 21 de mayo al 20 de junio |
| Maiasaura | 21 de junio al 22 de julio |
| Braquiosaurio | 23 de julio al 22 de agosto |
| Estegosaurio | 23 de agosto al 22 de septiembre |
| Diplodoco | 23 de septiembre al 22 de octubre |
| Velociraptor | 23 de octubre al 21 de noviembre |
| Arqueoptérix | 22 de noviembre al 21 de diciembre |
| Anquilosaurio | 22 de diciembre al 19 de enero |
| Therizinosaurio | 20 de enero al 18 de febrero |
| Espinosaurio | 19 de febrero al 20 de marzo |

### Campos de cada signo

| Campo | Qué es | Largo |
|---|---|---|
| `intro` | La entrada. Qué le pide el mes a ese signo. | 60–200 caracteres |
| `tech` | Lo digital: apps, cuentas, proyectos, pantallas. | 60–200 |
| `manada` | Vínculos: amistades, familia, pareja, equipo. | 60–200 |
| `plata` | Dinero, gastos, suscripciones, decisiones de compra. | 60–200 |
| `hobby` | Lo que hace por gusto. | 60–200 |
| `tu_superpoder` | Frase corta. **La primera oración se usa como título del correo.** | 20–80 |
| `tu_rabbit_hole` | Un dato real de paleontología, contado como curiosidad. | 40–200 |
| `fosil_de_la_suerte` | Un fósil con una frase que lo conecte con la personalidad. | 20–120 |

Los seis campos del medio (`tech`, `manada`, `plata`, `hobby`, `tu_rabbit_hole`,
`fosil_de_la_suerte`) salen en el correo como **bloques con etiqueta**, uno debajo del
otro. El `intro` sale como párrafo de entrada y `tu_superpoder` como título.

### Reglas de escritura

- Una sola idea por campo. No metas tres consejos donde cabe uno.
- Que cada campo termine en algo concreto que la persona pueda hacer.
- Nada de emojis. Nada de markdown. Nada de `<` ni `>`.
- No menciones marcas, empresas ni personas reales que no sean paleontólogos.
- No prometas salud, dinero, embarazos, empleo ni resultados legales.
- "Tú" con acento cuando es pronombre ("tú ruges"); "tu" sin acento cuando es
  posesivo ("tu manada").
- "Fósil" lleva tilde.
- Los datos de `tu_rabbit_hole` deben ser reales y verificables.
- Los 12 `intro` deben ser distintos entre sí.

---

## 3. Cómo se procesa

Del JSON del generador sale el archivo que se sube. La conversión la hace un script:

```bash
pnpm predicciones:importar diciembre-2026.json --edicion 4
```

Ese comando:

1. Lee `mes` + `anio` y arma `2026-12`.
2. Empareja cada `dinosaurio` con su slug interno.
3. Pone `intro` como texto y la primera oración de `tu_superpoder` como título.
4. Convierte las seis secciones restantes en bloques etiquetados.
5. Valida todo y escribe `prediccion-2026-12.json`.

Después se sube:

```bash
pnpm predicciones:validar prediccion-2026-12.json
pnpm predicciones:subir  prediccion-2026-12.json
```

---

## 4. Cuándo entregar

**Antes del día 25 del mes anterior.** Así hay tiempo de revisarlo, subirlo y que salga
limpio el día 1.

Ejemplo: la predicción de diciembre se entrega el 25 de noviembre o antes.

---

## 5. Ejemplos

### Mal

```
"tech": "El universo conspira a tu favor 💀 y tus hermanos te van a traicionar. <b>Compra bitcoin YA</b>."
```

Problemas: emoji, HTML, menciona terceros, promete dinero y no tiene idea fuerza.

### Bien

```
"tech": "Ese proyecto zombie que ocupa espacio en tu disco y en tu cabeza por fin se va. Con el terreno limpio, lo nuevo arranca a la primera."
```

Le atina a algo concreto, sin mandarte a comprar nada, y cierra con una imagen clara.

---

## 6. Dudas

Escríbele a quien te pasó esto. Si algo del formato no queda claro, se ajusta.
