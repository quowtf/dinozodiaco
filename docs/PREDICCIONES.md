# Predicciones mensuales de Dinozodiaco

Este documento es todo lo que necesitas saber para escribir las predicciones de un mes.
No tienes que saber programar. Hay dos formatos aceptados: **JSON** (preferido) o **textos sueltos**.

---

## 1. De qué va

Dinozodiaco es un horóscopo donde los doce signos son dinosaurios. Cada mes sale una
predicción nueva: una general para todos y una distinta para cada uno de los doce signos.
Todo eso se manda por correo el día 1 de cada mes.

Tono: burlón pero cariñoso, en español de México. Como un amigo que sabe de ti.
Cero misticismo serio, cero predicciones del fin del mundo.

Reglas del proyecto, por si te las preguntan:

- Ningún paleontólogo fue consultado para predecir tu futuro.
- Hecho por diversión, con amor y con IA.
- La hora oficial es las 6:06 (la hora Chicxulub).

---

## 2. Formato JSON (preferido)

Un solo archivo JSON por mes. Ejemplo completo y válido (los textos son de muestra,
cámbialos):

```json
{
  "mes": "2026-12",
  "edicion": 3,
  "general": {
    "titulo": "Suelo libre para lo nuevo",
    "texto": "El cielo trae ganas de empezar cosas y poca paciencia para lo que ya no sirve. Este mes cae lo viejo y queda el terreno libre para lo nuevo. Revisa a las 6:06 de la tarde si ya se cumplió.",
    "tags": ["Energía de arranque", "Mes para soltar"]
  },
  "signos": {
    "01-tiranosaurio": {
      "titulo": "El rugido tiene fecha",
      "texto": "Llevas semanas anunciando que algo ibas a empezar y no empezaste. Este mes el cuerpo te gana: arranca, aunque sea feo y a medias. La fila no es tuya y nunca lo fue.",
      "tags": ["Arranca ya", "Cero filas"]
    },
    "02-triceratops": {
      "titulo": "Terco, pero a tiempo",
      "texto": "Tu testarudo de siempre sabe cosas que los demás no. Esta vez la terquedad te salva: hay algo que va a cambiar y solo lo vas a aceptar si alguien te lo explica tres veces.",
      "tags": ["Paciencia", "Cabezazo"]
    }
  }
}
```

**Ese ejemplo está incompleto a propósito**: el JSON final necesita los **12** signos.
Los que faltan en el ejemplo (del `03-celofisis` al `12-espinosaurio`) los escribes tú.

### Los 12 signos y sus slugs

El `slug` es la clave exacta dentro de `"signos"`. Cópiala tal cual:

| slug | Signo | Elemento | Constelación |
|---|---|---|---|
| `01-tiranosaurio` | Tiranosaurio | Fuego | Aries |
| `02-triceratops` | Triceratops | Tierra | Tauro |
| `03-celofisis` | Celofisis | Aire | Géminis |
| `04-maiasaura` | Maiasaura | Agua | Cáncer |
| `05-braquiosaurio` | Braquiosaurio | Fuego | Leo |
| `06-estegosaurio` | Estegosaurio | Tierra | Virgo |
| `07-diplodoco` | Diplodoco | Aire | Libra |
| `08-velociraptor` | Velociraptor | Agua | Escorpio |
| `09-arqueopterix` | Arqueópterix | Fuego | Sagitario |
| `10-anquilosaurio` | Anquilosaurio | Tierra | Capricornio |
| `11-therizinosaurio` | Therizinosaurio | Aire | Acuario |
| `12-espinosaurio` | Espinosaurio | Agua | Piscis |

### Reglas del contenido

| Campo | Regla |
|---|---|
| `mes` | `"YYYY-MM"`. Ejemplo: `"2026-12"`. |
| `edicion` | Número entero desde 1. La primera edición fue la 1. |
| `titulo` | Una frase corta. Máximo 120 caracteres. |
| `texto` | Entre 40 y 1200 caracteres. |
| `tags` | De 0 a 3. Cortos. Máximo 60 caracteres cada uno. |
| `<` y `>` | Prohibidos en cualquier texto. No uses HTML. |

### Reglas de escritura

- De 3 a 5 frases por predicción. Ni una más.
- Un solo idée force por texto. No intentes decir todo.
- Que termine en algo concreto que la persona pueda hacer, no en "el universo te habla".
- No uses emojis. Los tags llevan los glifos (☄ ✦ ◐).
- No uses markdown. Ni negritas, ni listas, ni `#`.
- No menciones a terceros (marcas, personas, empresas).
- No prometas salud, dinero, embarazos, empleo ni resultados legales.
- Escribe "tú" con acento cuando es pronombre ("tú ruges"), y "tu" sin acento cuando es
  posesivo ("tu manada").
- "Fósil" lleva tilde. "Hueso" y "terna" van sin tilde.
- Nada de `<script>`, `<b>` ni nada parecido.

### Cómo saber si está bien

Antes de mandarlo, alguien lo pasa por un validador:

```bash
pnpm predicciones:validar 2026-12.json
```

Si sale `OK: la prediccion es valida.`, está listo. Si no, el validador te dice exactamente
qué falla y en qué signo.

---

## 3. Formato alternativo: textos sueltos

Si te da más batería mandar un JSON, mándame **13 archivos de texto plano**:

```
general.txt
01-tiranosaurio.txt
02-triceratops.txt
03-celofisis.txt
04-maiasaura.txt
05-braquiosaurio.txt
06-estegosaurio.txt
07-diplodoco.txt
08-velociraptor.txt
09-arqueopterix.txt
10-anquilosaurio.txt
11-therizinosaurio.txt
12-espinosaurio.txt
```

También acepta el nombre del dinosaurio en vez del slug (`Tiranosaurio.txt`).

Dentro de cada archivo:

```
Título: El rugido tiene fecha
Empiezas cosas que no terminas y luego te culpas de no tener tiempo. Este mes se acabó la excusa: arranca aunque sea feo, aunque sea a medias. La fila no espera.
- Arranca ya
- Cero filas
```

- La primera línea `Título: ...` (o `# ...`) es el título.
- Las líneas que empiezan con `- ` son los tags (máximo 3).
- Todo lo demás es el texto.

Con eso yo lo convierto al JSON y lo subo.

---

## 4. Cuándo entregar

**Antes del día 25 del mes anterior.** Así hay tiempo de revisarlo, subirlo y que salga
limpio el día 1.

Ejemplo: la predicción de diciembre se entrega el 25 de noviembre o antes.

Si necesitas tiempo extra, avisa. Se puede enviar a mano el día 1 con el link
`workflow_dispatch` de GitHub Actions.

---

## 5. Ejemplos

### Mal

```
"texto": "Hoy el universo te habla. <b>Tus hermanos</b> te traicionarán pronto 💀 y perderás dinero. Compra bitcoin YA."
```

Problems: HTML (`<b>`), emoji, menciona terceros (hermanos, bitcoin), promesa de dinero,
sin idea force concreta, y no dice qué hacer.

### Bien

```
"texto": "Hoy el universo te habla poco y tus hermanos te escuchan mucho. Este mes el problema no es que no tengas razón: es que la dices tarde. Manda ese mensaje que llevas tres semanas escribiendo, aunque te tiemble el dedo.",
```

Problema: le atinas a tu culpa sin mandarte a comprar nada, y termina con algo concreto.

---

## 6. Dudas

Escríbele al que te pasó esto. Si algo del formato no queda claro, se ajusta.
