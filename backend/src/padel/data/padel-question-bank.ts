import { AnswerOption, PadelAssessmentPillar } from '@prisma/client';

export type QuestionFraming = 'basic' | 'advanced';

export interface QuestionOption {
  key: AnswerOption;
  text: string;
  points: number;
}

export interface Question {
  id: string;
  pillar: PadelAssessmentPillar;
  framing: QuestionFraming;
  prompt: string;
  options: QuestionOption[];
}

function options(
  texts: [string, string, string, string, string, string],
): QuestionOption[] {
  const keys: AnswerOption[] = [
    AnswerOption.A,
    AnswerOption.B,
    AnswerOption.C,
    AnswerOption.D,
    AnswerOption.E,
    AnswerOption.F,
  ];
  return texts.map((text, i) => ({ key: keys[i], text, points: i + 1 }));
}

/**
 * `RALLY_CONSISTENCY_BASIC` doubles as the branch-determining question —
 * `padel-assessment.service.ts` reads its point value to decide
 * BEGINNER vs EXPERIENCED before picking the rest of the session's
 * pillars, since Padel has no separate "Padel Experience" onboarding step
 * the way Tennis's branch comes from `experienceSignal`. Every other
 * beginner-eligible pillar has both framings; BANDEJA/VIBORA/WALL_USAGE/
 * SMASH/OVERHEAD/POSITIONING/NET_CONTROL/TRANSITION/
 * PARTNER_COMMUNICATION/TACTICAL_AWARENESS are advanced-only — never
 * asked on the BEGINNER branch, mirroring how NET_PLAY/
 * COMPETITION_EXPERIENCE are Tennis's advanced-only pillars.
 */
export const PADEL_QUESTION_BANK: Question[] = [
  {
    id: 'RALLY_CONSISTENCY_BASIC',
    pillar: PadelAssessmentPillar.RALLY_CONSISTENCY,
    framing: 'basic',
    prompt: 'When rallying from the baseline, which best describes you?',
    options: options([
      "I'm completely new to padel and haven't rallied before.",
      'I can make contact but rarely keep the ball in play for long.',
      'I can sustain a short rally at a gentle pace.',
      'I can keep a steady rally going with some control of direction.',
      'I can rally consistently and vary depth and direction.',
      'I can sustain long rallies with control even at a faster pace.',
    ]),
  },
  {
    id: 'RALLY_CONSISTENCY_ADVANCED',
    pillar: PadelAssessmentPillar.RALLY_CONSISTENCY,
    framing: 'advanced',
    prompt:
      'When rallying with an experienced partner or opponent, which best describes you?',
    options: options([
      'I struggle to keep a rally going against any real pace.',
      'I can hang in a rally for a few shots at moderate pace.',
      'I can sustain a rally consistently at a comfortable pace.',
      'I can control direction and depth through a longer rally.',
      'I can vary pace and placement to dictate the rally.',
      'I hold up reliably in extended rallies under match pressure.',
    ]),
  },
  {
    id: 'FOREHAND_BASIC',
    pillar: PadelAssessmentPillar.FOREHAND,
    framing: 'basic',
    prompt: 'When you hit a forehand, which best describes you?',
    options: options([
      'I often miss the ball entirely or send it well off target.',
      'I can make contact but the ball rarely goes where I intend.',
      'I can get the ball over the net in the general direction I want.',
      'I can consistently land forehands with some control of direction.',
      'I can control both direction and depth on most forehands.',
      'I can vary pace and spin on my forehand and rarely miss.',
    ]),
  },
  {
    id: 'FOREHAND_ADVANCED',
    pillar: PadelAssessmentPillar.FOREHAND,
    framing: 'advanced',
    prompt:
      'When hitting forehands under match pace, which best describes you?',
    options: options([
      'My forehand breaks down against any real pace.',
      'I can exchange a few forehands at a comfortable pace.',
      'I can maintain a forehand exchange consistently.',
      'I can control direction and depth off my forehand.',
      'I can vary pace/spin and attack shorter balls off my forehand.',
      'My forehand holds up reliably under match pressure.',
    ]),
  },
  {
    id: 'BACKHAND_BASIC',
    pillar: PadelAssessmentPillar.BACKHAND,
    framing: 'basic',
    prompt: 'When you hit a backhand, which best describes you?',
    options: options([
      'I avoid hitting backhands whenever possible.',
      'I can make contact but often mishit or send it off-target.',
      'I can get the ball back over the net most of the time.',
      'I can consistently land backhands with reasonable control.',
      'I can direct my backhand with reasonable control.',
      "I'm comfortable hitting backhands with pace and control.",
    ]),
  },
  {
    id: 'BACKHAND_ADVANCED',
    pillar: PadelAssessmentPillar.BACKHAND,
    framing: 'advanced',
    prompt:
      'When hitting backhands under match pace, which best describes you?',
    options: options([
      'My backhand breaks down quickly against any real pace.',
      'I can hang in a backhand exchange for a few shots.',
      'I can sustain a backhand exchange at a moderate pace.',
      'I can control direction and depth off my backhand.',
      'I can vary spin/pace and attack short balls off my backhand.',
      'My backhand holds up reliably under match pressure.',
    ]),
  },
  {
    id: 'SERVE_BASIC',
    pillar: PadelAssessmentPillar.SERVE,
    framing: 'basic',
    prompt: 'When you serve underarm in padel, which best describes you?',
    options: options([
      'I have trouble getting the serve into the correct box.',
      "I can get some serves in, but it's inconsistent.",
      'I can get most serves in play.',
      'I can reliably start the point with a serve I control.',
      'I can place my serve to different parts of the box.',
      'I can vary spin and placement on my serve consistently.',
    ]),
  },
  {
    id: 'SERVE_ADVANCED',
    pillar: PadelAssessmentPillar.SERVE,
    framing: 'advanced',
    prompt: 'When serving in a competitive point, which best describes you?',
    options: options([
      'My serve is unreliable and often breaks down under pressure.',
      'I can get a serviceable serve in most of the time.',
      'I can consistently start points with a serve that sets me up well.',
      'I can place serves to set up my next shot.',
      'I can vary spin, speed, and placement to keep opponents off balance.',
      'I can execute serve strategy and hold up under pressure points.',
    ]),
  },
  {
    id: 'RETURN_BASIC',
    pillar: PadelAssessmentPillar.RETURN,
    framing: 'basic',
    prompt: 'When returning a serve, which best describes you?',
    options: options([
      'I often miss the return completely.',
      'I can get some returns back, but not consistently.',
      'I can get most returns back in play.',
      'I can return with some direction and depth.',
      'I can return with good control most of the time.',
      'I can return aggressively and put the server on the defensive.',
    ]),
  },
  {
    id: 'RETURN_ADVANCED',
    pillar: PadelAssessmentPillar.RETURN,
    framing: 'advanced',
    prompt:
      'When returning serve in a competitive rally, which best describes you?',
    options: options([
      'I struggle to get a reliable return started.',
      'I can get the return back but rarely with intent.',
      "I can return consistently and neutralize the server's advantage.",
      'I can direct my returns to set up the next shot.',
      "I can attack weaker serves and adjust to the server's pace.",
      'I return reliably and with purpose even under pressure.',
    ]),
  },
  {
    id: 'VOLLEY_BASIC',
    pillar: PadelAssessmentPillar.VOLLEY,
    framing: 'basic',
    prompt: "When you're at the net, which best describes you?",
    options: options([
      'I avoid coming to the net and feel uncomfortable there.',
      'I can make basic contact at net but often mishit it.',
      'I can put away easy volleys close to the net.',
      'I can handle volleys from mid-court with reasonable control.',
      'I can volley with touch and finish points from a range of positions.',
      'I can handle fast exchanges and pressure volleys reliably at net.',
    ]),
  },
  {
    id: 'VOLLEY_ADVANCED',
    pillar: PadelAssessmentPillar.VOLLEY,
    framing: 'advanced',
    prompt: 'In a fast net exchange, which best describes you?',
    options: options([
      'I get overwhelmed and rarely control the exchange.',
      'I can block a few volleys back but lose the exchange quickly.',
      'I can hold my own in a moderate-pace net exchange.',
      'I can direct volleys and start controlling the point at net.',
      'I can finish points from net with touch and placement.',
      'I win most fast net exchanges I get drawn into.',
    ]),
  },
  {
    id: 'OVERHEAD_ADVANCED',
    pillar: PadelAssessmentPillar.OVERHEAD,
    framing: 'advanced',
    prompt: 'When hitting an overhead smash setup, which best describes you?',
    options: options([
      'I avoid overheads and let easy setups go past me.',
      'I can make contact on an overhead but rarely finish the point.',
      'I can put away straightforward overhead setups.',
      'I can finish overheads from a range of court positions.',
      'I can vary placement and pace on my overhead.',
      'I reliably convert overhead opportunities into won points.',
    ]),
  },
  {
    id: 'BANDEJA_ADVANCED',
    pillar: PadelAssessmentPillar.BANDEJA,
    framing: 'advanced',
    prompt:
      'The bandeja (a defensive overhead that holds the net position) — which best describes you?',
    options: options([
      "I don't know this shot or haven't tried it.",
      "I've attempted it but rarely execute it cleanly.",
      'I can hit a basic bandeja to stay in the point.',
      'I can use the bandeja to hold my net position reliably.',
      'I can vary depth and placement on my bandeja.',
      'I use the bandeja tactically to control the point from net.',
    ]),
  },
  {
    id: 'VIBORA_ADVANCED',
    pillar: PadelAssessmentPillar.VIBORA,
    framing: 'advanced',
    prompt:
      'The vibora (an aggressive, sliced overhead) — which best describes you?',
    options: options([
      "I don't know this shot or haven't tried it.",
      "I've attempted it but rarely execute it cleanly.",
      'I can hit a basic vibora with some success.',
      'I can use the vibora to pressure my opponents.',
      'I can vary pace and angle on my vibora.',
      'I use the vibora as a reliable attacking weapon.',
    ]),
  },
  {
    id: 'SMASH_ADVANCED',
    pillar: PadelAssessmentPillar.SMASH,
    framing: 'advanced',
    prompt: 'When you get a clean smash opportunity, which best describes you?',
    options: options([
      'I rarely convert a clean smash opportunity.',
      'I can put away an easy smash most of the time.',
      'I can finish smashes from a range of heights and positions.',
      'I can place my smash to avoid a defensive lob back.',
      'I can vary pace and angle on my smash under pressure.',
      'I reliably close out points on any real smash opportunity.',
    ]),
  },
  {
    id: 'WALL_USAGE_ADVANCED',
    pillar: PadelAssessmentPillar.WALL_USAGE,
    framing: 'advanced',
    prompt:
      'When the ball comes off the back or side wall, which best describes you?',
    options: options([
      'I get caught out and rarely play the ball off the wall cleanly.',
      'I can play a simple ball off one wall if it bounces kindly.',
      'I can read a single-wall bounce and get the ball back reliably.',
      'I can play both back- and side-wall balls with control.',
      'I can use double-wall situations to build an attacking response.',
      'I read and use wall bounces as a real tactical weapon.',
    ]),
  },
  {
    id: 'POSITIONING_ADVANCED',
    pillar: PadelAssessmentPillar.POSITIONING,
    framing: 'advanced',
    prompt:
      'How you position yourself on court during a point — which best describes you?',
    options: options([
      "I'm often out of position and unsure where I should be.",
      'I can find a reasonable position when the point is slow.',
      'I hold a sensible court position most of the time.',
      'I adjust my position well as the point develops.',
      'I read the game well and position myself to cut off angles.',
      'My positioning consistently creates pressure on opponents.',
    ]),
  },
  {
    id: 'NET_CONTROL_ADVANCED',
    pillar: PadelAssessmentPillar.NET_CONTROL,
    framing: 'advanced',
    prompt: 'When your team is at the net together, which best describes you?',
    options: options([
      "I'm uncomfortable holding a net position as a pair.",
      'I can hold a net position but often get passed or lobbed.',
      'I can hold the net reasonably well with my partner.',
      'I coordinate court coverage at net with my partner.',
      'I can pressure opponents and close out points from net as a pair.',
      'Our net control consistently forces opponent errors.',
    ]),
  },
  {
    id: 'TRANSITION_ADVANCED',
    pillar: PadelAssessmentPillar.TRANSITION,
    framing: 'advanced',
    prompt:
      'Moving from the back of the court to the net (or back again), which best describes you?',
    options: options([
      "I get caught in no-man's-land and struggle from there.",
      "I can transition but I'm often late or out of position.",
      'I can move forward or back with reasonable timing.',
      'I transition with good timing most of the time.',
      'I read the point well and transition to gain an advantage.',
      'My transitions consistently put my team in a stronger position.',
    ]),
  },
  {
    id: 'PARTNER_COMMUNICATION_ADVANCED',
    pillar: PadelAssessmentPillar.PARTNER_COMMUNICATION,
    framing: 'advanced',
    prompt:
      'Communicating with your partner during a point, which best describes you?',
    options: options([
      "We rarely communicate and often get in each other's way.",
      'We call obvious shots but little beyond that.',
      'We communicate enough to avoid basic mix-ups.',
      'We coordinate positioning and calls reasonably well.',
      'We actively communicate to set up tactical plays together.',
      'Our communication consistently creates an advantage as a pair.',
    ]),
  },
  {
    id: 'TACTICAL_AWARENESS_ADVANCED',
    pillar: PadelAssessmentPillar.TACTICAL_AWARENESS,
    framing: 'advanced',
    prompt:
      'Your overall tactical approach during a match — which best describes you?',
    options: options([
      "I'm still learning how points are typically won or lost in padel.",
      'I have a rough idea of tactics but rarely apply them mid-point.',
      'I can follow a simple game plan through a point.',
      'I adjust my tactics based on my opponents.',
      "I actively construct points around my and my opponents' weaknesses.",
      'I consistently execute a clear tactical plan under match pressure.',
    ]),
  },
];

export function findQuestion(
  pillar: PadelAssessmentPillar,
  framing: QuestionFraming,
): Question {
  const question = PADEL_QUESTION_BANK.find(
    (q) => q.pillar === pillar && q.framing === framing,
  );
  if (!question) {
    throw new Error(
      `No question authored for pillar=${pillar} framing=${framing}`,
    );
  }
  return question;
}

export function findQuestionById(id: string): Question | undefined {
  return PADEL_QUESTION_BANK.find((q) => q.id === id);
}
