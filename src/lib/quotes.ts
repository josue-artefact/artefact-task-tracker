// Lista curada de frases en español, enfocadas en crecimiento personal,
// disciplina, oficio y trabajo creativo. Sin dependencia externa.

export type Quote = { q: string; a: string };

const QUOTES: Quote[] = [
  { q: "La inspiración existe, pero tiene que encontrarte trabajando.", a: "Pablo Picasso" },
  { q: "La perfección no se alcanza cuando ya no hay nada que añadir, sino cuando ya no hay nada que quitar.", a: "Antoine de Saint-Exupéry" },
  { q: "Lo esencial es invisible a los ojos.", a: "Antoine de Saint-Exupéry" },
  { q: "Caminante, no hay camino, se hace camino al andar.", a: "Antonio Machado" },
  { q: "Empieza haciendo lo necesario, después lo posible, y de repente estarás haciendo lo imposible.", a: "Francisco de Asís" },
  { q: "El que tiene un porqué para vivir puede soportar casi cualquier cómo.", a: "Friedrich Nietzsche" },
  { q: "El éxito es ir de fracaso en fracaso sin perder el entusiasmo.", a: "Winston Churchill" },
  { q: "La duda es uno de los nombres de la inteligencia.", a: "Jorge Luis Borges" },
  { q: "El verdadero descubrimiento no consiste en buscar nuevos paisajes, sino en mirar con nuevos ojos.", a: "Marcel Proust" },
  { q: "Un viaje de mil millas comienza con un solo paso.", a: "Lao Tse" },
  { q: "Sé el cambio que quieres ver en el mundo.", a: "Mahatma Gandhi" },
  { q: "Lo que no se mide, no se puede mejorar.", a: "Peter Drucker" },
  { q: "Menos, pero mejor.", a: "Dieter Rams" },
  { q: "Menos es más.", a: "Mies van der Rohe" },
  { q: "Lo simple es lo más difícil.", a: "Charles Mingus" },
  { q: "Hazlo con miedo, pero hazlo.", a: "Susan Jeffers" },
  { q: "El secreto está en empezar.", a: "Mark Twain" },
  { q: "La disciplina es elegir entre lo que quieres ahora y lo que quieres más.", a: "Anónimo" },
  { q: "Crear es resistir. Resistir es crear.", a: "Stéphane Hessel" },
  { q: "El detalle no es el detalle. El detalle es el diseño.", a: "Charles Eames" },
  { q: "La libertad no es algo que se tenga, sino algo que se conquista.", a: "Simone de Beauvoir" },
  { q: "Quien no se mueve no siente sus cadenas.", a: "Rosa Luxemburgo" },
  { q: "Lo importante no es lo que han hecho de nosotros, sino lo que hacemos con lo que han hecho de nosotros.", a: "Jean-Paul Sartre" },
  { q: "Todo lo que somos es resultado de lo que hemos pensado.", a: "Buda" },
  { q: "La paciencia es amarga, pero su fruto es dulce.", a: "Jean-Jacques Rousseau" },
  { q: "El tiempo es lo único que no se recupera.", a: "Séneca" },
  { q: "El mundo no fue hecho de átomos, fue hecho de historias.", a: "Muriel Rukeyser" },
  { q: "No se puede dirigir el viento, pero sí ajustar las velas.", a: "Proverbio" },
  { q: "Lento, pero sin pausa.", a: "Goethe" },
  { q: "La constancia vence lo que la dicha no alcanza.", a: "Anónimo" },
  { q: "Hazlo bien, o hazlo dos veces.", a: "Mantra del estudio" },
  { q: "El oficio se hace con horas, no con talento.", a: "Mantra del estudio" },
  { q: "Confía en el proceso.", a: "Mantra del estudio" },
  { q: "El trabajo bien hecho es el mejor descanso.", a: "Anónimo" },
  { q: "Pensar es difícil. Por eso la mayoría juzga.", a: "Carl Jung" },
  { q: "Lo que se hace por amor está más allá del bien y del mal.", a: "Friedrich Nietzsche" },
  { q: "El arte es lo que hace la vida más interesante que el arte.", a: "Robert Filliou" },
  { q: "Si no sabes a dónde vas, cualquier camino te llevará allí.", a: "Lewis Carroll" },
  { q: "Lo urgente no deja tiempo para lo importante.", a: "Mario Benedetti" },
  { q: "Atrévete a ser sabio.", a: "Horacio" },
];

/** Devuelve una frase al azar (uniforme). */
export function pickQuote(): Quote {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

/** Mantengo el shape async por compatibilidad con el resto del código. */
export async function fetchRandomQuote(): Promise<Quote> {
  return pickQuote();
}
