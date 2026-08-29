import { Injectable } from '@nestjs/common';
import { CourtsService } from '../../courts/courts.service';
import { HOME_CARD_PRIORITY, type HomeCard } from '../home-card';
import type { HomeCardContributor, HomeContext } from './home-contributor';

const SUGGESTION_COUNT = 3;
const NEARBY_RADIUS_KM = 15;

/**
 * Courts near the player. Closes the "nearby courts Home card" M9 explicitly
 * flagged as a live decision point rather than a dropped feature.
 *
 * Requires stored coordinates and returns nothing without them. That is the
 * honest behaviour, not a limitation to work around: `CourtsService.search`
 * ranks by distance, and calling it with no origin would return an arbitrary
 * slice of the court table dressed up as "near you".
 */
@Injectable()
export class NearbyCourtsContributor implements HomeCardContributor {
  readonly key = 'nearby-courts';

  constructor(private readonly courts: CourtsService) {}

  async contribute(ctx: HomeContext): Promise<HomeCard[]> {
    const { latitude, longitude } = ctx.profile;
    if (latitude === null || longitude === null) return [];

    const { courts } = await this.courts.search({
      latitude,
      longitude,
      maxDistanceKm: NEARBY_RADIUS_KM,
      take: SUGGESTION_COUNT,
    });
    if (courts.length === 0) return [];

    const nearest = courts[0];

    return [
      {
        id: 'nearby-courts',
        type: 'NEARBY_COURTS',
        priority: HOME_CARD_PRIORITY.NEARBY_COURTS,
        title: 'Courts near you',
        body:
          nearest.distanceKm !== null
            ? `${nearest.name} is about ${nearest.distanceKm.toFixed(1)} km away.`
            : `${nearest.name} and others are nearby.`,
        accent: 'neutral',
        action: {
          label: 'Find courts',
          route: '/home?tab=discover&discover=courts',
        },
        dismissible: true,
        data: { kind: 'courts', courts },
      },
    ];
  }
}
