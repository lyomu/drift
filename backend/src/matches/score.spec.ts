import { BadRequestException } from '@nestjs/common';
import { MatchSide } from '@prisma/client';
import { matchWinner } from './score';

const s = (a: number, b: number, tbA?: number, tbB?: number) => ({
  sideAGames: a,
  sideBGames: b,
  sideATiebreak: tbA,
  sideBTiebreak: tbB,
});

describe('matchWinner', () => {
  it('best of 3: two straight sets decide the match', () => {
    expect(matchWinner([s(6, 4), s(6, 3)], 3)).toBe(MatchSide.A);
  });

  it('best of 3: a deciding third set', () => {
    expect(matchWinner([s(6, 4), s(3, 6), s(2, 6)], 3)).toBe(MatchSide.B);
  });

  it('accepts a 7-6 set with a valid tiebreak (8-6)', () => {
    expect(matchWinner([s(7, 6, 8, 6), s(5, 7), s(6, 4)], 3)).toBe(
      MatchSide.A,
    );
  });

  it('rejects an unfinished best-of-3 (one set)', () => {
    expect(() => matchWinner([s(6, 3)], 3)).toThrow(BadRequestException);
  });

  it('rejects a third set after the match was decided', () => {
    expect(() => matchWinner([s(6, 3), s(6, 4), s(6, 1)], 3)).toThrow(
      BadRequestException,
    );
  });

  it('best of 5 needs three sets and allows up to five', () => {
    expect(() => matchWinner([s(6, 3), s(6, 4)], 5)).toThrow(
      BadRequestException,
    );
    expect(
      matchWinner([s(6, 3), s(3, 6), s(6, 4), s(4, 6), s(6, 2)], 5),
    ).toBe(MatchSide.A);
  });

  it('rejects more sets than the format allows', () => {
    expect(() =>
      matchWinner([s(6, 3), s(3, 6), s(6, 4), s(4, 6), s(6, 2), s(6, 1)], 5),
    ).toThrow(BadRequestException);
  });

  it.each([
    [s(6, 5)],
    [s(8, 6)],
    [s(5, 5)],
    [s(7, 6)], // tiebreak points missing
    [s(7, 6, 7, 6)], // tiebreak not won by 2
    [s(6, 4, 7, 5)], // tiebreak on a set that had none
  ])('rejects illegal set %j', (bad) => {
    expect(() => matchWinner([bad, s(6, 3)], 3)).toThrow(BadRequestException);
  });
});
