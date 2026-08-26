import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ClubMembershipStatus,
  MatchResultStatus,
  MatchState,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type AchievementRule = {
  id: string;
  title: string;
  description: string;
  criteria: string;
  target: number;
  icon: string;
};

const RULES: AchievementRule[] = [
  {
    id: 'first_match',
    title: 'First hit-out',
    description: 'Finish your first recorded Drift match.',
    criteria: 'Complete 1 match.',
    target: 1,
    icon: 'sports_tennis',
  },
  {
    id: 'match_winner',
    title: 'On the board',
    description: 'Record your first confirmed match win.',
    criteria: 'Win 1 confirmed match.',
    target: 1,
    icon: 'emoji_events',
  },
  {
    id: 'practice_starter',
    title: 'Practice logged',
    description: 'Start building your development history.',
    criteria: 'Log 1 practice session.',
    target: 1,
    icon: 'fitness_center',
  },
  {
    id: 'lesson_finisher',
    title: 'Lesson learner',
    description: 'Complete your first lesson or drill.',
    criteria: 'Mark 1 learning item complete.',
    target: 1,
    icon: 'school',
  },
  {
    id: 'goal_setter',
    title: 'Target set',
    description: 'Create a skill goal you can track over time.',
    criteria: 'Create 1 development goal.',
    target: 1,
    icon: 'flag',
  },
  {
    id: 'club_member',
    title: 'Club connected',
    description: 'Join a club community.',
    criteria: 'Hold 1 active club membership.',
    target: 1,
    icon: 'groups',
  },
  {
    id: 'league_rookie',
    title: 'League rookie',
    description: 'Step into structured competition.',
    criteria: 'Register for 1 league season.',
    target: 1,
    icon: 'leaderboard',
  },
];

const PLAYED_STATES: MatchState[] = [
  MatchState.COMPLETED,
  MatchState.WALKOVER,
  MatchState.RETIRED,
];

@Injectable()
export class AchievementsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const profile = await this.prisma.tennisProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) throw new NotFoundException('Tennis profile not found.');

    const [
      completedMatches,
      confirmedResults,
      practiceSessions,
      completions,
      goals,
      activeClubMemberships,
      seasonRegistrations,
    ] = await Promise.all([
      this.prisma.matchParticipant.count({
        where: { userId, match: { state: { in: PLAYED_STATES } } },
      }),
      this.prisma.matchResult.findMany({
        where: {
          status: MatchResultStatus.CONFIRMED,
          winningSide: { not: null },
          match: { participants: { some: { userId } } },
        },
        select: {
          winningSide: true,
          match: {
            select: { participants: { select: { userId: true, side: true } } },
          },
        },
      }),
      this.prisma.practiceSession.count({
        where: { tennisProfileId: profile.id },
      }),
      this.prisma.learningContentCompletion.count({
        where: { tennisProfileId: profile.id },
      }),
      this.prisma.goal.count({ where: { tennisProfileId: profile.id } }),
      this.prisma.clubMembership.count({
        where: { userId, status: ClubMembershipStatus.ACTIVE },
      }),
      this.prisma.seasonRegistration.count({ where: { userId } }),
    ]);

    const wins = confirmedResults.filter((result) => {
      const participant = result.match.participants.find(
        (p) => p.userId === userId,
      );
      return participant?.side === result.winningSide;
    }).length;

    const progressById: Record<string, number> = {
      first_match: completedMatches,
      match_winner: wins,
      practice_starter: practiceSessions,
      lesson_finisher: completions,
      goal_setter: goals,
      club_member: activeClubMemberships,
      league_rookie: seasonRegistrations,
    };

    const achievements = RULES.map((rule) => {
      const current = progressById[rule.id] ?? 0;
      const earned = current >= rule.target;
      return {
        ...rule,
        state: earned ? 'EARNED' : 'LOCKED',
        current: Math.min(current, rule.target),
      };
    });

    return {
      achievements,
      earnedCount: achievements.filter((a) => a.state === 'EARNED').length,
      totalCount: achievements.length,
    };
  }
}
