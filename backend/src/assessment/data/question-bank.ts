import { AnswerOption, AssessmentPillar } from '@prisma/client';

export type QuestionFraming = 'basic' | 'advanced';

export interface QuestionOption {
  key: AnswerOption;
  text: string;
  points: number;
}

export interface Question {
  id: string;
  pillar: AssessmentPillar;
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
 * One authored question per pillar per framing tier (`basic` for
 * Beginner/Foundational, `advanced` for Intermediate/Advanced — see
 * `03-user-journeys.md` §3.1). Net Play and Competition Experience only ever
 * surface at tiers where `advanced` framing applies, so they have one
 * variant each.
 */
export const QUESTION_BANK: Question[] = [
  {
    id: 'FOREHAND_BASIC',
    pillar: AssessmentPillar.FOREHAND,
    framing: 'basic',
    prompt: 'When you hit a forehand, which best describes you?',
    options: options([
      'I often miss the ball entirely or send it well outside the court.',
      'I can make contact but the ball rarely goes where I intend.',
      'I can hit the ball over the net and in the general direction I want.',
      'I can consistently land forehands in the court with some control of direction.',
      'I can control both direction and depth on most forehands.',
      'I can vary pace and spin on my forehand and rarely miss.',
    ]),
  },
  {
    id: 'FOREHAND_ADVANCED',
    pillar: AssessmentPillar.FOREHAND,
    framing: 'advanced',
    prompt:
      'When rallying forehand-to-forehand from the baseline, which best describes you?',
    options: options([
      'I struggle to keep the ball in play consistently.',
      'I can exchange a few shots at a comfortable pace.',
      'I can maintain longer rallies consistently.',
      'I can control direction and depth.',
      'I can vary pace/spin and attack shorter balls.',
      'I can execute these skills consistently under match pressure.',
    ]),
  },
  {
    id: 'BACKHAND_BASIC',
    pillar: AssessmentPillar.BACKHAND,
    framing: 'basic',
    prompt: 'When you hit a backhand, which best describes you?',
    options: options([
      'I avoid hitting backhands whenever possible.',
      'I can make contact but often mishit or send it off-target.',
      'I can get the ball back over the net most of the time.',
      'I can consistently land backhands in the court.',
      'I can direct my backhand with reasonable control.',
      "I'm comfortable hitting backhands with pace and control.",
    ]),
  },
  {
    id: 'BACKHAND_ADVANCED',
    pillar: AssessmentPillar.BACKHAND,
    framing: 'advanced',
    prompt:
      'When rallying backhand-to-backhand from the baseline, which best describes you?',
    options: options([
      'My backhand breaks down quickly under any pace.',
      'I can hang in a backhand exchange for a few shots.',
      'I can sustain a backhand rally at a moderate pace.',
      'I can control direction and depth off my backhand.',
      'I can vary spin/pace and attack short balls off my backhand.',
      'My backhand holds up reliably under match pressure.',
    ]),
  },
  {
    id: 'SERVE_BASIC',
    pillar: AssessmentPillar.SERVE,
    framing: 'basic',
    prompt: 'When you serve, which best describes you?',
    options: options([
      'I have trouble getting the ball into the service box.',
      "I can get some serves in, but it's inconsistent.",
      'I can get most first or second serves in play.',
      'I can reliably start the point with a serve I control.',
      'I can place my serve to different parts of the box.',
      'I can vary spin and placement on my serve consistently.',
    ]),
  },
  {
    id: 'SERVE_ADVANCED',
    pillar: AssessmentPillar.SERVE,
    framing: 'advanced',
    prompt: 'When serving in a match, which best describes you?',
    options: options([
      'My serve is unreliable and often breaks down under pressure.',
      'I can get a serviceable first or second serve in most of the time.',
      'I can consistently start points with a serve that sets me up well.',
      'I can place serves to set up my next shot.',
      'I can vary spin, speed, and placement to keep opponents off balance.',
      'I can execute serve strategy and hold up under pressure points.',
    ]),
  },
  {
    id: 'RETURN_BASIC',
    pillar: AssessmentPillar.RETURN,
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
    pillar: AssessmentPillar.RETURN,
    framing: 'advanced',
    prompt:
      'When returning serve in a competitive rally, which best describes you?',
    options: options([
      'I struggle to get a reliable return started.',
      'I can get the return back but rarely with intent.',
      "I can return consistently and neutralize the server's advantage.",
      'I can direct my returns to set up the next shot.',
      "I can attack weaker serves and adjust my return to the server's pace.",
      'I return reliably and with purpose even against strong serves under pressure.',
    ]),
  },
  {
    id: 'NET_PLAY_ADVANCED',
    pillar: AssessmentPillar.NET_PLAY,
    framing: 'advanced',
    prompt: "When you're at the net, which best describes you?",
    options: options([
      'I avoid coming to the net and feel uncomfortable there.',
      'I can make basic contact at net but often mishit or hit it out.',
      'I can put away easy volleys close to the net.',
      'I can handle volleys from mid-court with reasonable control.',
      'I can volley with touch and finish points from a variety of positions.',
      'I can handle fast exchanges and pressure volleys reliably at net.',
    ]),
  },
  {
    id: 'MOVEMENT_BASIC',
    pillar: AssessmentPillar.MOVEMENT,
    framing: 'basic',
    prompt:
      'When moving around the court during a point, which best describes you?',
    options: options([
      "I struggle to reach balls that aren't hit right to me.",
      'I can reach balls with some extra steps, but recovery is slow.',
      'I can move to most balls and get back to a ready position.',
      'I move efficiently and recover well between shots.',
      'I can cover the court well and stay balanced while hitting on the run.',
      'My movement lets me consistently get in good position, even under pressure.',
    ]),
  },
  {
    id: 'MOVEMENT_ADVANCED',
    pillar: AssessmentPillar.MOVEMENT,
    framing: 'advanced',
    prompt:
      'When covering the court during a fast-paced rally, which best describes you?',
    options: options([
      'I get caught out of position and struggle to recover.',
      'I can react to shots but my recovery is often late.',
      'I can track the ball and get back to a solid base most of the time.',
      'I anticipate well and move efficiently to cover the court.',
      'I can cover the court and still hit with control while on the move.',
      'My footwork and anticipation hold up reliably under match pressure.',
    ]),
  },
  {
    id: 'MATCH_PLAY_BASIC',
    pillar: AssessmentPillar.MATCH_PLAY,
    framing: 'basic',
    prompt:
      'When you play a practice point or short match, which best describes you?',
    options: options([
      "I'm still learning how scoring works and rarely finish a point.",
      'I understand the basics of scoring but points end quickly.',
      'I can play out a full point and know the score as we go.',
      "I can construct a point with a clear idea of what I'm trying to do.",
      'I can adapt my game plan based on how the point is going.',
      'I play with a clear strategy and execute it consistently.',
    ]),
  },
  {
    id: 'MATCH_PLAY_ADVANCED',
    pillar: AssessmentPillar.MATCH_PLAY,
    framing: 'advanced',
    prompt:
      "When you're playing a competitive match, which best describes you?",
    options: options([
      'I lose focus or composure quickly once the score matters.',
      'I can play solid points but tend to fade under pressure.',
      'I can hold my level through most of a match.',
      'I adjust my tactics based on my opponent and the score.',
      'I stay composed and execute my game plan at important moments.',
      'I consistently perform at my best in high-pressure match situations.',
    ]),
  },
  {
    id: 'COMPETITION_EXPERIENCE_ADVANCED',
    pillar: AssessmentPillar.COMPETITION_EXPERIENCE,
    framing: 'advanced',
    prompt: 'What best describes your competitive tennis experience?',
    options: options([
      "I haven't played in any organized or competitive matches.",
      "I've played a few casual or friendly competitive matches.",
      "I've played in club-level competitive matches or social leagues.",
      "I've competed in local tournaments or organized leagues.",
      "I've competed at a regional level with consistent results.",
      "I've competed at a national or elite level.",
    ]),
  },
];

export function findQuestion(
  pillar: AssessmentPillar,
  framing: QuestionFraming,
): Question {
  const question = QUESTION_BANK.find(
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
  return QUESTION_BANK.find((q) => q.id === id);
}
