import { Injectable } from '@nestjs/common';
import { PadelInterestValue } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { HOME_CARD_PRIORITY, type HomeCard } from '../home-card';
import type { HomeCardContributor, HomeContext } from './home-contributor';
import {
  DEFAULT_LOCALE,
  type MessageKey,
  type MessageParam,
  t,
} from '../../common/i18n';

/**
 * Replaces M4's `PADEL_TEASER`, which was still telling users "Padel is
 * coming to Drift — we'll let you know the moment it's ready" **after Padel
 * shipped in M13**. That card was a live correctness bug, not just a dull
 * one: it asked people to wait for something they could already use.
 *
 * The prompt is shown only to users who expressed interest during onboarding
 * and have not yet created a Padel profile. Once the profile exists there is
 * nothing to prompt — Padel lives under Profile → My Sports from then on.
 */
@Injectable()
export class PadelPromptContributor implements HomeCardContributor {
  readonly key = 'padel-prompt';

  constructor(private readonly prisma: PrismaService) {}

  async contribute(ctx: HomeContext): Promise<HomeCard[]> {
    const tr = (key: MessageKey, params?: Record<string, MessageParam>) =>
      t(ctx.locale ?? DEFAULT_LOCALE, key, params);
    const interest = ctx.profile.padelInterest;
    const interested =
      interest === PadelInterestValue.YES ||
      interest === PadelInterestValue.WANT_TO_LEARN;
    if (!interested) return [];

    const existing = await this.prisma.padelProfile.findUnique({
      where: { userId: ctx.userId },
      select: { id: true },
    });
    if (existing) return [];

    return [
      {
        id: 'padel-prompt',
        type: 'PADEL_PROMPT',
        priority: HOME_CARD_PRIORITY.PADEL_PROMPT,
        title: tr('home.padel.title'),
        body: tr(
          interest === PadelInterestValue.WANT_TO_LEARN
            ? 'home.padel.learn'
            : 'home.padel.plays',
        ),
        accent: 'neutral',
        action: {
          label: tr('home.action.addPadel'),
          route: '/profile/padel/add',
        },
        dismissible: true,
        data: null,
      },
    ];
  }
}
