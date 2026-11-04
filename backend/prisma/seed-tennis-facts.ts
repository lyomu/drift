import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

/**
 * Starter catalogue for the daily tennis fact. Safe to run against any
 * environment, production included: rows are keyed by fixed ids and
 * `update: {}` means a re-run never overwrites edits made in platform-admin.
 * Seeded without images — admins add photos later and the app shows a
 * branded fallback until then.
 *
 * Kept to well-established, non-time-sensitive facts (no "current record"
 * claims that go stale). Limits: title ≤ 60, body ≤ 280, source ≤ 80.
 *
 *   npx ts-node prisma/seed-tennis-facts.ts
 */

interface SeedFact {
  en: [title: string, body: string];
  fr: [title: string, body: string];
  es: [title: string, body: string];
  source?: string;
}

const ITF = 'ITF Rules of Tennis';

const FACTS: SeedFact[] = [
  {
    en: ['The 11-hour match', 'John Isner beat Nicolas Mahut at Wimbledon in 2010 after 11 hours and 5 minutes over three days. The fifth set alone finished 70–68.'],
    fr: ['Le match de 11 heures', 'À Wimbledon en 2010, John Isner a battu Nicolas Mahut après 11 h 05 de jeu réparties sur trois jours. Le cinquième set s’est terminé à 70–68.'],
    es: ['El partido de 11 horas', 'En Wimbledon 2010, John Isner venció a Nicolas Mahut tras 11 horas y 5 minutos repartidos en tres días. Solo el quinto set terminó 70–68.'],
  },
  {
    en: ['The oldest tournament', 'Wimbledon was first played in 1877, making it the oldest tennis tournament in the world.'],
    fr: ['Le plus vieux tournoi', 'Wimbledon s’est joué pour la première fois en 1877 : c’est le plus ancien tournoi de tennis au monde.'],
    es: ['El torneo más antiguo', 'Wimbledon se disputó por primera vez en 1877, lo que lo convierte en el torneo de tenis más antiguo del mundo.'],
  },
  {
    en: ['Why tennis balls are yellow', 'Balls used to be white or black. The ITF introduced yellow balls in 1972 because they show up better on colour TV. Wimbledon kept white balls until 1986.'],
    fr: ['Pourquoi les balles sont jaunes', 'Les balles étaient blanches ou noires. L’ITF a introduit la balle jaune en 1972, plus visible à la télévision couleur. Wimbledon a gardé la blanche jusqu’en 1986.'],
    es: ['Por qué las pelotas son amarillas', 'Antes eran blancas o negras. La ITF introdujo la pelota amarilla en 1972 porque se ve mejor en la televisión en color. Wimbledon usó blancas hasta 1986.'],
  },
  {
    en: ['How big is a court?', 'A tennis court is 23.77 m long. It is 8.23 m wide for singles and 10.97 m wide for doubles.'],
    fr: ['Quelle taille fait un court ?', 'Un court de tennis mesure 23,77 m de long, 8,23 m de large en simple et 10,97 m en double.'],
    es: ['¿Cuánto mide una pista?', 'Una pista de tenis mide 23,77 m de largo, 8,23 m de ancho en individuales y 10,97 m en dobles.'],
    source: ITF,
  },
  {
    en: ['The net dips in the middle', 'The net is 0.914 m high at the centre strap but 1.07 m at the posts. That is why a cross-court shot over the middle is the safer play.'],
    fr: ['Le filet est plus bas au centre', 'Le filet mesure 0,914 m au centre mais 1,07 m aux poteaux. C’est pourquoi passer la balle au milieu est plus sûr.'],
    es: ['La red baja en el centro', 'La red mide 0,914 m en el centro pero 1,07 m en los postes. Por eso pasar la bola por el medio es la opción más segura.'],
    source: ITF,
  },
  {
    en: ['What is clay, really?', 'The red surface at Roland-Garros is a thin top layer of crushed brick over limestone. It slows the ball and makes it bounce higher.'],
    fr: ['La terre battue, c’est quoi ?', 'La surface rouge de Roland-Garros est une fine couche de brique pilée posée sur du calcaire. Elle ralentit la balle et la fait rebondir plus haut.'],
    es: ['¿Qué es la tierra batida?', 'La superficie roja de Roland-Garros es una fina capa de ladrillo triturado sobre piedra caliza. Frena la bola y la hace botar más alto.'],
  },
  {
    en: ['The King of Clay', 'Rafael Nadal won the Roland-Garros singles title 14 times, the most titles any player has won at a single Grand Slam.'],
    fr: ['Le roi de la terre battue', 'Rafael Nadal a remporté Roland-Garros en simple 14 fois, le plus grand nombre de titres jamais gagnés dans un même tournoi du Grand Chelem.'],
    es: ['El rey de la tierra batida', 'Rafael Nadal ganó Roland-Garros en individuales 14 veces, el mayor número de títulos de un jugador en un mismo Grand Slam.'],
  },
  {
    en: ['The Golden Slam', 'In 1988, Steffi Graf won all four Grand Slams and Olympic gold in the same year. That feat is called the Golden Slam.'],
    fr: ['Le Grand Chelem doré', 'En 1988, Steffi Graf a remporté les quatre tournois du Grand Chelem et l’or olympique la même année : le « Golden Slam ».'],
    es: ['El Golden Slam', 'En 1988, Steffi Graf ganó los cuatro Grand Slams y el oro olímpico en el mismo año. A esa hazaña se le llama Golden Slam.'],
  },
  {
    en: ['Birth of the tiebreak', 'James Van Alen invented the tiebreak to stop endless sets. In 1970, the US Open became the first Grand Slam to use it.'],
    fr: ['La naissance du tie-break', 'James Van Alen a inventé le tie-break pour éviter les sets sans fin. En 1970, l’US Open a été le premier Grand Chelem à l’adopter.'],
    es: ['El nacimiento del tie-break', 'James Van Alen inventó el tie-break para evitar sets interminables. En 1970, el US Open fue el primer Grand Slam en usarlo.'],
  },
  {
    en: ['Hawk-Eye arrives', 'Electronic line calling with player challenges made its Grand Slam debut at the 2006 US Open.'],
    fr: ['L’arrivée du Hawk-Eye', 'L’arbitrage vidéo des lignes, avec des challenges pour les joueurs, a fait ses débuts en Grand Chelem à l’US Open 2006.'],
    es: ['Llega el Ojo de Halcón', 'El arbitraje electrónico de líneas, con desafíos para los jugadores, debutó en un Grand Slam en el US Open de 2006.'],
  },
  {
    en: ['The Open Era', 'Until 1968, professionals were barred from the Grand Slams. That year the events opened to everyone, starting the Open Era.'],
    fr: ['L’ère Open', 'Jusqu’en 1968, les professionnels n’avaient pas accès aux Grands Chelems. Cette année-là, ils se sont ouverts à tous : c’est le début de l’ère Open.'],
    es: ['La Era Open', 'Hasta 1968 los profesionales no podían jugar los Grand Slams. Ese año se abrieron a todos y comenzó la Era Open.'],
  },
  {
    en: ['Back at the Olympics', 'Tennis left the Olympics after 1924 and returned as a full medal sport at the 1988 Seoul Games.'],
    fr: ['Le retour aux Jeux', 'Le tennis a quitté les Jeux olympiques après 1924 et y est revenu comme sport officiel aux Jeux de Séoul en 1988.'],
    es: ['De vuelta a los Juegos', 'El tenis salió de los Juegos Olímpicos después de 1924 y volvió como deporte oficial en Seúl 1988.'],
  },
  {
    en: ['24 major titles', 'Margaret Court won 24 Grand Slam singles titles between 1960 and 1973, a record across both the amateur and Open eras.'],
    fr: ['24 titres majeurs', 'Margaret Court a remporté 24 titres du Grand Chelem en simple entre 1960 et 1973, un record toutes époques confondues.'],
    es: ['24 títulos de Grand Slam', 'Margaret Court ganó 24 títulos de Grand Slam en individuales entre 1960 y 1973, un récord entre la era amateur y la Open.'],
  },
  {
    en: ['Nine at Wimbledon', 'Martina Navratilova won the Wimbledon singles title nine times, including six in a row from 1982 to 1987.'],
    fr: ['Neuf fois à Wimbledon', 'Martina Navratilova a remporté Wimbledon en simple neuf fois, dont six d’affilée de 1982 à 1987.'],
    es: ['Nueve en Wimbledon', 'Martina Navratilova ganó Wimbledon en individuales nueve veces, seis de ellas seguidas entre 1982 y 1987.'],
  },
  {
    en: ['Why "love" means zero', 'Nobody knows for sure. One popular theory says it comes from the French "l’œuf" (the egg), because a zero looks like an egg.'],
    fr: ['Pourquoi « love » veut dire zéro', 'Personne n’en est sûr. Une théorie populaire le fait venir du français « l’œuf », car un zéro ressemble à un œuf.'],
    es: ['Por qué "love" significa cero', 'Nadie lo sabe con certeza. Una teoría popular dice que viene del francés « l’œuf » (el huevo), porque un cero parece un huevo.'],
  },
  {
    en: ['15, 30, 40… why?', 'One theory links scoring to a clock face: 15, 30, 45. The 45 may have been shortened to 40 to make room for "advantage".'],
    fr: ['15, 30, 40… pourquoi ?', 'Une théorie relie le score à un cadran d’horloge : 15, 30, 45. Le 45 aurait été raccourci en 40 pour laisser place à l’« avantage ».'],
    es: ['15, 30, 40… ¿por qué?', 'Una teoría vincula la puntuación a la esfera de un reloj: 15, 30, 45. El 45 se habría acortado a 40 para dejar sitio a la "ventaja".'],
  },
  {
    en: ['From grass to hard court', 'The Australian Open was played on grass until 1987. It moved to hard courts at Melbourne Park in 1988.'],
    fr: ['Du gazon au dur', 'L’Open d’Australie s’est joué sur gazon jusqu’en 1987. Il est passé sur dur à Melbourne Park en 1988.'],
    es: ['De la hierba a la pista dura', 'El Abierto de Australia se jugó sobre hierba hasta 1987. En 1988 pasó a pista dura en Melbourne Park.'],
  },
  {
    en: ['Three surfaces, one Slam', 'The US Open is the only Grand Slam played on three surfaces: grass until 1974, clay from 1975 to 1977, and hard courts since 1978.'],
    fr: ['Trois surfaces, un Chelem', 'L’US Open est le seul Grand Chelem joué sur trois surfaces : gazon jusqu’en 1974, terre battue de 1975 à 1977, puis dur depuis 1978.'],
    es: ['Tres superficies, un Slam', 'El US Open es el único Grand Slam jugado en tres superficies: hierba hasta 1974, tierra batida de 1975 a 1977 y pista dura desde 1978.'],
  },
  {
    en: ['The bounce test', 'An approved ball dropped from 254 cm onto a hard floor must bounce between 135 and 147 cm.'],
    fr: ['Le test du rebond', 'Une balle homologuée lâchée de 254 cm sur un sol dur doit rebondir entre 135 et 147 cm.'],
    es: ['La prueba del bote', 'Una pelota homologada soltada desde 254 cm sobre un suelo duro debe botar entre 135 y 147 cm.'],
    source: ITF,
  },
  {
    en: ['The doubles alleys', 'Each doubles alley — the strip between the singles and doubles sidelines — is 1.37 m wide.'],
    fr: ['Les couloirs de double', 'Chaque couloir de double, entre la ligne de simple et celle de double, mesure 1,37 m de large.'],
    es: ['Los pasillos de dobles', 'Cada pasillo de dobles, entre la línea de individuales y la de dobles, mide 1,37 m de ancho.'],
    source: ITF,
  },
  {
    en: ['Where the Davis Cup began', 'The Davis Cup started in 1900 as a match between the United States and the British Isles. It is now the largest annual team competition in sport.'],
    fr: ['Les débuts de la Coupe Davis', 'La Coupe Davis est née en 1900 d’une rencontre entre les États-Unis et les îles Britanniques. C’est aujourd’hui la plus grande compétition annuelle par équipes du sport.'],
    es: ['El origen de la Copa Davis', 'La Copa Davis nació en 1900 como un duelo entre Estados Unidos y las Islas Británicas. Hoy es la mayor competición anual por equipos del deporte.'],
  },
  {
    en: ['The Battle of the Sexes', 'In 1973, Billie Jean King beat Bobby Riggs in straight sets in front of a huge TV audience, a landmark moment for women’s sport.'],
    fr: ['La bataille des sexes', 'En 1973, Billie Jean King a battu Bobby Riggs en trois sets secs devant un immense public télévisé, un moment clé pour le sport féminin.'],
    es: ['La batalla de los sexos', 'En 1973, Billie Jean King venció a Bobby Riggs en sets corridos ante una enorme audiencia televisiva, un hito para el deporte femenino.'],
  },
  {
    en: ['Arthur Ashe, 1975', 'Arthur Ashe became the first Black man to win the Wimbledon singles title when he beat Jimmy Connors in the 1975 final.'],
    fr: ['Arthur Ashe, 1975', 'Arthur Ashe est devenu le premier homme noir à remporter Wimbledon en simple en battant Jimmy Connors en finale en 1975.'],
    es: ['Arthur Ashe, 1975', 'Arthur Ashe fue el primer hombre negro en ganar Wimbledon en individuales al vencer a Jimmy Connors en la final de 1975.'],
  },
  {
    en: ['Padel was born in Mexico', 'Enrique Corcuera created padel at his home in Acapulco, Mexico, in 1969, walling in a small court with a net in the middle.'],
    fr: ['Le padel est né au Mexique', 'Enrique Corcuera a créé le padel chez lui à Acapulco, au Mexique, en 1969, sur un petit terrain fermé de murs avec un filet au milieu.'],
    es: ['El pádel nació en México', 'Enrique Corcuera creó el pádel en su casa de Acapulco, México, en 1969, en una pequeña pista cerrada por paredes con una red en medio.'],
  },
  {
    en: ['23 Grand Slam titles', 'Serena Williams won 23 Grand Slam singles titles, the most by any player in the Open Era when she retired in 2022.'],
    fr: ['23 titres du Grand Chelem', 'Serena Williams a remporté 23 titres du Grand Chelem en simple, le record de l’ère Open lorsqu’elle a pris sa retraite en 2022.'],
    es: ['23 títulos de Grand Slam', 'Serena Williams ganó 23 títulos de Grand Slam en individuales, el récord de la Era Open cuando se retiró en 2022.'],
  },
  {
    en: ['Five in a row', 'Björn Borg won Wimbledon five years in a row, from 1976 to 1980.'],
    fr: ['Cinq d’affilée', 'Björn Borg a remporté Wimbledon cinq années de suite, de 1976 à 1980.'],
    es: ['Cinco seguidos', 'Björn Borg ganó Wimbledon cinco años seguidos, de 1976 a 1980.'],
  },
  {
    en: ['Eight Wimbledon crowns', 'Roger Federer won the Wimbledon men’s singles title eight times, the record for a man at the All England Club.'],
    fr: ['Huit couronnes à Wimbledon', 'Roger Federer a remporté Wimbledon en simple messieurs huit fois, le record masculin au All England Club.'],
    es: ['Ocho coronas en Wimbledon', 'Roger Federer ganó Wimbledon en individuales masculino ocho veces, el récord masculino en el All England Club.'],
  },
  {
    en: ['Dressed in white', 'Wimbledon asks players to wear almost entirely white clothing, a tradition that dates back to the 19th century.'],
    fr: ['Tout en blanc', 'Wimbledon impose aux joueurs une tenue presque entièrement blanche, une tradition qui remonte au XIXe siècle.'],
    es: ['Vestidos de blanco', 'Wimbledon exige a los jugadores vestir casi totalmente de blanco, una tradición que se remonta al siglo XIX.'],
  },
  {
    en: ['Played with the palm', 'Tennis grew out of "jeu de paume", a French game where players hit the ball with the palm of the hand before rackets came along.'],
    fr: ['Joué avec la paume', 'Le tennis descend du jeu de paume, un jeu français où l’on frappait la balle avec la paume de la main avant l’arrivée des raquettes.'],
    es: ['Se jugaba con la palma', 'El tenis surgió del "jeu de paume", un juego francés en el que se golpeaba la bola con la palma de la mano antes de que existieran las raquetas.'],
  },
  {
    en: ['Inside the service box', 'Each service box is 6.40 m deep from the net to the service line, and 4.115 m wide.'],
    fr: ['Dans le carré de service', 'Chaque carré de service mesure 6,40 m de profondeur, du filet à la ligne de service, et 4,115 m de large.'],
    es: ['Dentro del cuadro de saque', 'Cada cuadro de saque mide 6,40 m de profundidad, de la red a la línea de saque, y 4,115 m de ancho.'],
    source: ITF,
  },
];

/** Stable ids so re-runs upsert instead of duplicating (UUID-shaped because
 * the API validates fact ids with ParseUUIDPipe). */
function factId(index: number): string {
  return `7e5f7ac7-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
}

export async function seedTennisFacts(prisma: PrismaClient): Promise<void> {
  for (const [i, fact] of FACTS.entries()) {
    for (const [title, body] of [fact.en, fact.fr, fact.es]) {
      if (title.length > 60 || body.length > 280) {
        throw new Error(`Fact ${i + 1} exceeds length limits: "${title}"`);
      }
    }
    await prisma.tennisFact.upsert({
      where: { id: factId(i) },
      update: {},
      create: {
        id: factId(i),
        titleEn: fact.en[0],
        bodyEn: fact.en[1],
        titleFr: fact.fr[0],
        bodyFr: fact.fr[1],
        titleEs: fact.es[0],
        bodyEs: fact.es[1],
        sourceEn: fact.source ?? null,
        sourceFr: fact.source ? 'Règles du tennis de l’ITF' : null,
        sourceEs: fact.source ? 'Reglas del tenis de la ITF' : null,
        sortOrder: i,
      },
    });
  }
  console.log(`Seeded ${FACTS.length} daily tennis facts.`);
}

if (require.main === module) {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  seedTennisFacts(prisma)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
