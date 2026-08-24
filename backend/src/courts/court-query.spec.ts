import { buildCourtWhere } from './court-query';

describe('buildCourtWhere', () => {
  it('returns an empty where when no filters are supplied', () => {
    expect(buildCourtWhere({})).toEqual({});
  });

  it('applies the bounding box when supplied', () => {
    const box = {
      minLatitude: 51.0,
      maxLatitude: 52.0,
      minLongitude: -0.5,
      maxLongitude: 0.5,
    };
    const where = buildCourtWhere({}, box);
    expect(where.latitude).toEqual({ gte: 51.0, lte: 52.0 });
    expect(where.longitude).toEqual({ gte: -0.5, lte: 0.5 });
  });

  it('filters isPublic only when explicitly supplied', () => {
    expect(buildCourtWhere({ isPublic: false }).isPublic).toBe(false);
    expect(buildCourtWhere({}).isPublic).toBeUndefined();
  });

  it('filters on bookingType only when hasBookingInfo is true', () => {
    expect(buildCourtWhere({ hasBookingInfo: true }).bookingType).toEqual({
      not: 'UNKNOWN',
    });
    expect(
      buildCourtWhere({ hasBookingInfo: false }).bookingType,
    ).toBeUndefined();
  });

  it('scopes to clubless courts when independentOnly is set, overriding clubId', () => {
    const where = buildCourtWhere({ independentOnly: true, clubId: 'club-1' });
    expect(where.clubId).toBeNull();
  });

  it('scopes to a specific club when clubId is set without independentOnly', () => {
    expect(buildCourtWhere({ clubId: 'club-1' }).clubId).toBe('club-1');
  });

  it('composes surface/indoor/lighting into a nested courtGroups filter', () => {
    const where = buildCourtWhere({
      surfaces: ['CLAY', 'GRASS'],
      indoor: false,
      lighting: true,
    });
    expect(where.courtGroups).toEqual({
      some: {
        surface: { in: ['CLAY', 'GRASS'] },
        indoor: false,
        lighting: true,
      },
    });
  });

  it('an explicit false for indoor/lighting survives (not treated as unset)', () => {
    const where = buildCourtWhere({ indoor: false });
    expect(where.courtGroups).toEqual({ some: { indoor: false } });
  });

  it('omits courtGroups entirely when no group-level filter is supplied', () => {
    expect(buildCourtWhere({ clubId: 'club-1' }).courtGroups).toBeUndefined();
  });

  it('applies a case-insensitive name search', () => {
    expect(buildCourtWhere({ search: 'Regent' }).name).toEqual({
      contains: 'Regent',
      mode: 'insensitive',
    });
  });
});
