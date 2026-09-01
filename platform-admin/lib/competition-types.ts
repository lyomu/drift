export type CompetitionType = "LEAGUE" | "TOURNAMENT" | "LADDER";
export type MatchSport = "TENNIS" | "PADEL";
export type MatchFormat = "SINGLES" | "DOUBLES";

export type CompetitionClub = {
  id: string;
  name: string;
  verificationStatus: string;
  platformStatus: string;
} | null;

export type CompetitionSummary = {
  id: string;
  type: CompetitionType;
  name: string;
  description: string | null;
  sport: MatchSport;
  format: MatchFormat | null;
  state: string;
  club: CompetitionClub;
  primaryCountLabel: string;
  primaryCount: number;
  secondaryCountLabel: string;
  secondaryCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CompetitionListResponse = {
  total: number;
  competitions: CompetitionSummary[];
  totalsByType: {
    leagues: number;
    tournaments: number;
    ladders: number;
  };
};

export type CompetitionRuleset = {
  id: string;
  name: string;
  description: string | null;
  sport: MatchSport;
  format: MatchFormat;
  competitionTypes: CompetitionType[];
  scoringFormat: string;
  walkoverRule: string;
  unfinishedMatchPolicy: string;
  rulesText: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CompetitionRulesetInput = {
  name: string;
  description: string | null;
  sport: MatchSport;
  format: MatchFormat;
  competitionTypes: CompetitionType[];
  scoringFormat: string;
  walkoverRule: string;
  unfinishedMatchPolicy: string;
  rulesText: string | null;
  isDefault: boolean;
  isActive: boolean;
};

export type CompetitionDetailResponse = {
  competition:
    | (LeagueDetail & { type: "LEAGUE" })
    | (TournamentDetail & { type: "TOURNAMENT" })
    | (LadderDetail & { type: "LADDER" });
};

export type LeagueDetail = {
  id: string;
  name: string;
  description: string | null;
  sport: MatchSport;
  format: MatchFormat;
  state: string;
  club: CompetitionClub;
  rulesText: string | null;
  scoringFormat: string | null;
  walkoverRule: string | null;
  unfinishedMatchPolicy: string | null;
  createdAt: string;
  updatedAt: string;
  // Since M15 a league is a single competition run — the scheduling that
  // used to live on a Season row now lives here directly.
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  startsAt: string | null;
  roundCount: number | null;
  roundIntervalMinutes: number;
  capacity: number | null;
  cancelledAt: string | null;
  completedAt: string | null;
  _count: {
    registrations: number;
    rounds: number;
    standings: number;
    awards: number;
  };
};

export type TournamentDetail = {
  id: string;
  name: string;
  description: string | null;
  sport: MatchSport;
  drawSize: number;
  state: string;
  registrationClosesAt: string;
  createdAt: string;
  club: CompetitionClub;
  entries: Array<{
    id: string;
    seed: number | null;
    createdAt: string;
    user: { id: string; firstName: string; lastName: string; email: string };
  }>;
  rounds: Array<{
    id: string;
    index: number;
    fixtures: Array<{
      id: string;
      slotIndex: number;
      isBye: boolean;
      winnerUserId: string | null;
      sideA: { id: string; firstName: string; lastName: string } | null;
      sideB: { id: string; firstName: string; lastName: string } | null;
      match: { id: string; state: string } | null;
    }>;
  }>;
};

export type LadderDetail = {
  id: string;
  name: string;
  sport: MatchSport;
  challengeRange: number;
  state: string;
  createdAt: string;
  club: CompetitionClub;
  entries: Array<{
    id: string;
    position: number;
    wins: number;
    losses: number;
    createdAt: string;
    user: { id: string; firstName: string; lastName: string; email: string };
  }>;
  challenges: Array<{
    id: string;
    state: string;
    createdAt: string;
    challenger: { id: string; firstName: string; lastName: string };
    defender: { id: string; firstName: string; lastName: string };
    match: { id: string; state: string } | null;
  }>;
};
