export interface Signo {
  slug: string;
  nombre: string;
  latin: string;
  constelacion: string;
  fechas: string;
  elemento: string;
  modalidad: string;
  era: string;
  desc: string;
  fortalezas: string[];
  debilidades: string[];
  manada: string;
  dia: string;
  num: string;
  piedra: string;
  color: string;
  accent: string;
  frase: string;
}

export const SIGNOS: Signo[] = [
  {
    slug: "01-tiranosaurio", nombre: "Tiranosaurio", latin: "Tyrannosaurus rex",
    constelacion: "Aries", fechas: "21 de marzo al 19 de abril",
    elemento: "Fuego", modalidad: "Cardinal", era: "Cretácico",
    desc: "Entras a cualquier lugar como si fuera tu territorio, y casi siempre lo es. Tienes energía de arranque: decides rápido, actúas más rápido y convences con puro impulso. Tus brazos serán cortos, pero tu ambición llega lejos.",
    fortalezas: ["Liderazgo nato", "Valentía", "Iniciativa"],
    debilidades: ["Impaciencia", "Rugir antes de pensar", "Odiar las filas"],
    manada: "Braquiosaurio y Arqueoptérix",
    dia: "Martes", num: "1", piedra: "Obsidiana",
    color: "Rojo lava", accent: "#c2412d",
    frase: "Primero ruges, después preguntas.",
  },
  {
    slug: "02-triceratops", nombre: "Triceratops", latin: "Triceratops horridus",
    constelacion: "Tauro", fechas: "20 de abril al 20 de mayo",
    elemento: "Tierra", modalidad: "Fijo", era: "Cretácico",
    desc: "Firme, leal y con tres cuernos listos para defender lo que amas. No te gusta que te apuren ni que te muevan de tu lugar favorito. Disfrutas lo bueno: comida rica, siestas largas y gente que no cambia los planes a última hora.",
    fortalezas: ["Constancia", "Lealtad", "Paciencia"],
    debilidades: ["Terquedad", "Resistencia al cambio", "Posesividad"],
    manada: "Estegosaurio y Anquilosaurio",
    dia: "Viernes", num: "6", piedra: "Jade",
    color: "Verde helecho", accent: "#5f7f3f",
    frase: "Lento, pero nadie me mueve.",
  },
  {
    slug: "03-celofisis", nombre: "Celofisis", latin: "Coelophysis bauri",
    constelacion: "Géminis", fechas: "21 de mayo al 20 de junio",
    elemento: "Aire", modalidad: "Mutable", era: "Triásico",
    desc: "Nunca andas solo. De la celofisis se han encontrado cientos de fósiles juntos, y tú también vives en manada: conversaciones, ideas nuevas y chismes de buena fuente. Eres ágil, curioso y cambias de tema a la velocidad de tus patas.",
    fortalezas: ["Ingenio", "Sociabilidad", "Adaptabilidad"],
    debilidades: ["Dispersión", "Indecisión", "Aburrirte rápido"],
    manada: "Diplodoco y Therizinosaurio",
    dia: "Miércoles", num: "5", piedra: "Ágata",
    color: "Amarillo polen", accent: "#d9b43c",
    frase: "¿Y si mejor lo platicamos en manada?",
  },
  {
    slug: "04-maiasaura", nombre: "Maiasaura", latin: "Maiasaura peeblesorum",
    constelacion: "Cáncer", fechas: "21 de junio al 22 de julio",
    elemento: "Agua", modalidad: "Cardinal", era: "Cretácico",
    desc: "Su nombre significa \u201clagarto buena madre\u201d y te queda a la medida. Cuidas tu nido, recuerdas cumpleaños y siempre hay lugar en tu casa para quien necesita refugio. Por fuera eres suave, y tu memoria emocional es de otra era.",
    fortalezas: ["Protección", "Empatía", "Intuición"],
    debilidades: ["Nostalgia", "Cambios de humor", "Aferrarte al pasado"],
    manada: "Espinosaurio y Velociraptor",
    dia: "Lunes", num: "2", piedra: "Piedra de luna",
    color: "Azul laguna", accent: "#4f86a6",
    frase: "Mi nido, mis reglas, tu plato servido.",
  },
  {
    slug: "05-braquiosaurio", nombre: "Braquiosaurio", latin: "Brachiosaurus altithorax",
    constelacion: "Leo", fechas: "23 de julio al 22 de agosto",
    elemento: "Fuego", modalidad: "Fijo", era: "Jurásico",
    desc: "Llevas la cabeza en alto y todos voltean hacia arriba para verte. Tienes presencia, generosidad y un corazón del tamaño de tu cuello. Te encanta brillar, pero también compartes tu sombra con quien la necesita.",
    fortalezas: ["Carisma", "Generosidad", "Confianza"],
    debilidades: ["Orgullo", "Necesitar aplausos", "Drama escénico"],
    manada: "Tiranosaurio y Arqueoptérix",
    dia: "Domingo", num: "19", piedra: "Ámbar",
    color: "Dorado", accent: "#d69a2d",
    frase: "No es que sea alto, es que tú miras desde abajo.",
  },
  {
    slug: "06-estegosaurio", nombre: "Estegosaurio", latin: "Stegosaurus stenops",
    constelacion: "Virgo", fechas: "23 de agosto al 22 de septiembre",
    elemento: "Tierra", modalidad: "Mutable", era: "Jurásico",
    desc: "Tus placas están alineadas y tu agenda también. Analizas, organizas y encuentras el error que nadie más vio. Ayudas sin que te lo pidan, aunque a veces tu cola de picos sale a corregir de más.",
    fortalezas: ["Precisión", "Servicio", "Método"],
    debilidades: ["Perfeccionismo", "Autocrítica", "Controlar cada detalle"],
    manada: "Triceratops y Anquilosaurio",
    dia: "Miércoles", num: "7", piedra: "Jaspe",
    color: "Verde salvia", accent: "#8a9a6b",
    frase: "Todo tiene su lugar, incluso mis placas.",
  },
  {
    slug: "07-diplodoco", nombre: "Diplodoco", latin: "Diplodocus carnegii",
    constelacion: "Libra", fechas: "23 de septiembre al 22 de octubre",
    elemento: "Aire", modalidad: "Cardinal", era: "Jurásico",
    desc: "Tu cuello y tu cola se equilibran como una balanza, y así llevas tu vida. Buscas armonía, huyes de los pleitos y tu buen gusto se nota a kilómetros. Tardas en decidir, pero cuando lo haces, todo cuadra.",
    fortalezas: ["Diplomacia", "Encanto", "Sentido de justicia"],
    debilidades: ["Indecisión", "Evitar conflictos", "Querer quedar bien con todos"],
    manada: "Celofisis y Therizinosaurio",
    dia: "Viernes", num: "15", piedra: "Ópalo",
    color: "Rosa coral", accent: "#d98a8a",
    frase: "¿Y si lo vemos desde los dos lados?",
  },
  {
    slug: "08-velociraptor", nombre: "Velociraptor", latin: "Velociraptor mongoliensis",
    constelacion: "Escorpio", fechas: "23 de octubre al 21 de noviembre",
    elemento: "Agua", modalidad: "Fijo", era: "Cretácico",
    desc: "Eres más pequeño de lo que cuentan las películas y más listo de lo que la gente sospecha. Observas en silencio, estudias cada movimiento y actúas en el momento exacto. Tu garra en forma de hoz es tu intuición: rara vez falla.",
    fortalezas: ["Estrategia", "Intensidad", "Lealtad profunda"],
    debilidades: ["Desconfianza", "Celos", "Guardar rencores"],
    manada: "Maiasaura y Espinosaurio",
    dia: "Martes", num: "8", piedra: "Granate",
    color: "Vino", accent: "#8a3342",
    frase: "No me viste venir, y esa era la idea.",
  },
  {
    slug: "09-arqueopterix", nombre: "Arqueoptérix", latin: "Archaeopteryx lithographica",
    constelacion: "Sagitario", fechas: "22 de noviembre al 21 de diciembre",
    elemento: "Fuego", modalidad: "Mutable", era: "Jurásico",
    desc: "Fuiste de los primeros en intentar volar, y todavía no aterrizas. Te mueven la aventura, los viajes y las preguntas grandes. Tu optimismo contagia, y tu honestidad a veces cae sin paracaídas.",
    fortalezas: ["Optimismo", "Espíritu libre", "Curiosidad"],
    debilidades: ["Promesas al aire", "Inquietud", "Franqueza sin filtro"],
    manada: "Tiranosaurio y Braquiosaurio",
    dia: "Jueves", num: "3", piedra: "Turquesa",
    color: "Morado", accent: "#7b5ea7",
    frase: "Si tiene alas, tiene plan.",
  },
  {
    slug: "10-anquilosaurio", nombre: "Anquilosaurio", latin: "Ankylosaurus magniventris",
    constelacion: "Capricornio", fechas: "22 de diciembre al 19 de enero",
    elemento: "Tierra", modalidad: "Cardinal", era: "Cretácico",
    desc: "Tienes armadura, disciplina y una cola en forma de mazo para cuando alguien se pasa de listo. Construyes a largo plazo, subes la montaña paso a paso y no te distraen las modas. Cuando por fin te relajas, eres el más divertido del grupo.",
    fortalezas: ["Disciplina", "Responsabilidad", "Resistencia"],
    debilidades: ["Rigidez", "Trabajar de más", "Pesimismo"],
    manada: "Triceratops y Estegosaurio",
    dia: "Sábado", num: "10", piedra: "Ónix",
    color: "Gris piedra", accent: "#8a867d",
    frase: "Blindado por fuera, estratégico por dentro.",
  },
  {
    slug: "11-therizinosaurio", nombre: "Therizinosaurio", latin: "Therizinosaurus cheloniformis",
    constelacion: "Acuario", fechas: "20 de enero al 18 de febrero",
    elemento: "Aire", modalidad: "Fijo", era: "Cretácico",
    desc: "Vienes de una familia de carnívoros y decidiste comer plantas. Así eres: original, independiente y siempre un paso adelante de lo que el resto considera normal. Tus garras de casi un metro asustan, pero las usas para alcanzar ideas, no para pelear.",
    fortalezas: ["Originalidad", "Visión de futuro", "Espíritu humanitario"],
    debilidades: ["Distancia emocional", "Rebeldía por deporte", "Terquedad intelectual"],
    manada: "Celofisis y Diplodoco",
    dia: "Sábado", num: "11", piedra: "Amatista",
    color: "Azul eléctrico", accent: "#3f7fd9",
    frase: "Raro no, adelantado.",
  },
  {
    slug: "12-espinosaurio", nombre: "Espinosaurio", latin: "Spinosaurus aegyptiacus",
    constelacion: "Piscis", fechas: "19 de febrero al 20 de marzo",
    elemento: "Agua", modalidad: "Mutable", era: "Cretácico",
    desc: "Vives entre dos mundos, igual que el espinosaurio, que pasaba buena parte de su vida en el agua. Eres soñador, creativo y sientes todo al doble. Tu vela es tu imaginación: grande, visible y lista para llevarte a donde sople el viento.",
    fortalezas: ["Imaginación", "Compasión", "Sensibilidad artística"],
    debilidades: ["Evasión", "Despiste", "Absorber emociones ajenas"],
    manada: "Maiasaura y Velociraptor",
    dia: "Jueves", num: "12", piedra: "Aguamarina",
    color: "Verde agua", accent: "#4fa39a",
    frase: "Si no está en el agua, está en mis sueños.",
  },
];
