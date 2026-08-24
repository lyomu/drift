import {
  computeSkillScores,
  deriveGoalStatus,
  recommendContent,
  weakestSkill,
} from './skill-score';

const DAY = 24 * 60 * 60 * 1000;

describe('computeSkillScores', () => {
  it('returns null score/maturity for a dimension with no data at all', () => {
    const scores = computeSkillScores(null, []);
    expect(scores.every((s) => s.score === null && s.maturity === null)).toBe(
      true,
    );
  });

  it('uses the assessment baseline directly with DIRECTIONAL maturity when no practice exists', () => {
    const scores = computeSkillScores({ FOREHAND: 4 }, []);
    const forehand = scores.find((s) => s.skill === 'FOREHAND')!;
    expect(forehand.score).toBe(4);
    expect(forehand.maturity).toBe('DIRECTIONAL');
  });

  it('blends assessment and practice signal once practice exists, with ESTABLISHED maturity', () => {
    const scores = computeSkillScores({ FOREHAND: 3 }, [
      { skillFocus: 'FOREHAND', perceivedPerformance: 5 },
      { skillFocus: 'FOREHAND', perceivedPerformance: 5 },
    ]);
    const forehand = scores.find((s) => s.skill === 'FOREHAND')!;
    // practice signal for perceivedPerformance=5 -> ((5-1)/4)*6 = 6
    // blended = 0.6*3 + 0.4*6 = 1.8 + 2.4 = 4.2
    expect(forehand.score).toBeCloseTo(4.2);
    expect(forehand.maturity).toBe('ESTABLISHED');
  });

  it('uses practice signal alone when no assessment baseline exists for that pillar', () => {
    const scores = computeSkillScores({}, [
      { skillFocus: 'BACKHAND', perceivedPerformance: 3 },
    ]);
    const backhand = scores.find((s) => s.skill === 'BACKHAND')!;
    // ((3-1)/4)*6 = 3
    expect(backhand.score).toBeCloseTo(3);
    expect(backhand.maturity).toBe('ESTABLISHED');
  });

  it('clamps the blended score within [0, 6]', () => {
    const scores = computeSkillScores({ SERVE: 6 }, [
      { skillFocus: 'SERVE', perceivedPerformance: 5 },
      { skillFocus: 'SERVE', perceivedPerformance: 5 },
    ]);
    const serve = scores.find((s) => s.skill === 'SERVE')!;
    expect(serve.score).toBeLessThanOrEqual(6);
  });

  it('excludes COMPETITION_EXPERIENCE from the seven dimensions', () => {
    const scores = computeSkillScores({ COMPETITION_EXPERIENCE: 5 }, []);
    expect(scores.some((s) => s.skill === 'COMPETITION_EXPERIENCE')).toBe(
      false,
    );
    expect(scores).toHaveLength(7);
  });
});

describe('weakestSkill', () => {
  it('returns null when nothing has a score', () => {
    const scores = computeSkillScores(null, []);
    expect(weakestSkill(scores)).toBeNull();
  });

  it('picks the lowest-scoring dimension, ignoring dimensions with no data', () => {
    const scores = computeSkillScores(
      { FOREHAND: 5, BACKHAND: 2, SERVE: 4 },
      [],
    );
    expect(weakestSkill(scores)).toBe('BACKHAND');
  });
});

describe('deriveGoalStatus', () => {
  const base = {
    baseline: 2,
    target: 5,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    deadline: new Date('2026-01-31T00:00:00Z'),
    achievedAt: null,
    now: new Date('2026-01-01T00:00:00Z'),
  };

  it('is ACHIEVED when achievedAt is set, regardless of score', () => {
    expect(
      deriveGoalStatus({ ...base, achievedAt: new Date(), currentScore: 0 }),
    ).toBe('ACHIEVED');
  });

  it('is ACHIEVED when the current score has reached the target', () => {
    expect(deriveGoalStatus({ ...base, currentScore: 5 })).toBe('ACHIEVED');
  });

  it('is ON_TRACK when there is no deadline', () => {
    expect(deriveGoalStatus({ ...base, deadline: null, currentScore: 2 })).toBe(
      'ON_TRACK',
    );
  });

  it('is ON_TRACK when there is no current score yet (not enough data to call it behind)', () => {
    expect(deriveGoalStatus({ ...base, currentScore: null })).toBe('ON_TRACK');
  });

  it('is ON_TRACK when progress matches or beats the expected linear pace', () => {
    // Halfway through the window (15 of 30 days), expected progress is
    // half of (5-2)=3, i.e. 1.5 above baseline -> expected score 3.5.
    const halfway = new Date(base.createdAt.getTime() + 15 * DAY);
    expect(deriveGoalStatus({ ...base, now: halfway, currentScore: 4 })).toBe(
      'ON_TRACK',
    );
  });

  it('is BEHIND when progress lags the expected linear pace', () => {
    const halfway = new Date(base.createdAt.getTime() + 15 * DAY);
    expect(deriveGoalStatus({ ...base, now: halfway, currentScore: 2.5 })).toBe(
      'BEHIND',
    );
  });
});

describe('recommendContent', () => {
  const content = [
    { id: 'a', type: 'DRILL', targetSkill: 'BACKHAND', branch: 'BEGINNER' },
    { id: 'b', type: 'LESSON', targetSkill: 'BACKHAND', branch: null },
    { id: 'c', type: 'DRILL', targetSkill: 'BACKHAND', branch: 'ADVANCED' },
    { id: 'd', type: 'TRAINING_PLAN', targetSkill: 'BACKHAND', branch: null },
    { id: 'e', type: 'DRILL', targetSkill: 'FOREHAND', branch: 'BEGINNER' },
  ] as const;

  it('filters to the requested skill and excludes training plans', () => {
    const result = recommendContent([...content], 'BACKHAND', 'BEGINNER');
    expect(result.map((c) => c.id)).not.toContain('d');
    expect(result.map((c) => c.id)).not.toContain('e');
  });

  it('ranks matching-branch content first, then branch-agnostic, then mismatched branch', () => {
    const result = recommendContent([...content], 'BACKHAND', 'BEGINNER');
    expect(result.map((c) => c.id)).toEqual(['a', 'b', 'c']);
  });

  it('respects the limit', () => {
    const result = recommendContent([...content], 'BACKHAND', 'BEGINNER', 1);
    expect(result).toHaveLength(1);
  });
});
