import {
  engagementBand,
  engagementScore,
  type EngagementInputs,
} from './member-engagement';

const none: EngagementInputs = {
  matchesPlayed: 0,
  eventsAttended: 0,
  posts: 0,
  reactions: 0,
  activeLeagues: 0,
};

describe('engagementScore', () => {
  it('is 0 with no activity', () => {
    expect(engagementScore(none)).toBe(0);
  });

  it('weights each signal and sums them', () => {
    expect(
      engagementScore({
        matchesPlayed: 2, // 16
        eventsAttended: 1, // 5
        posts: 1,
        reactions: 2, // 3 interactions -> 6
        activeLeagues: 1, // 5
      }),
    ).toBe(32);
  });

  it('caps every signal so none can dominate', () => {
    expect(
      engagementScore({
        matchesPlayed: 50,
        eventsAttended: 50,
        posts: 500,
        reactions: 500,
        activeLeagues: 50,
      }),
    ).toBe(100);
  });

  it('counts posts and reactions together against one cap', () => {
    expect(engagementScore({ ...none, posts: 6, reactions: 6 })).toBe(20);
    expect(engagementScore({ ...none, posts: 10 })).toBe(20);
  });

  it('ignores negative or fractional counts rather than going below 0', () => {
    expect(engagementScore({ ...none, matchesPlayed: -3 })).toBe(0);
    expect(engagementScore({ ...none, matchesPlayed: 1.9 })).toBe(8);
  });
});

describe('engagementBand', () => {
  it.each([
    [0, 'INACTIVE'],
    [1, 'LOW'],
    [39, 'LOW'],
    [40, 'ACTIVE'],
    [69, 'ACTIVE'],
    [70, 'HIGHLY_ACTIVE'],
    [100, 'HIGHLY_ACTIVE'],
  ])('score %d is %s', (score, band) => {
    expect(engagementBand(score)).toBe(band);
  });
});
