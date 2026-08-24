import 'package:drift_tennis/core/onboarding/onboarding_step.dart';
import 'package:drift_tennis/features/assessment/data/assessment_repository.dart';
import 'package:drift_tennis/features/clubs/data/clubs_repository.dart';
import 'package:drift_tennis/features/competitions/data/competitions_repository.dart';
import 'package:drift_tennis/features/connections/data/connections_repository.dart';
import 'package:drift_tennis/features/courts/data/courts_repository.dart';
import 'package:drift_tennis/features/home/data/home_repository.dart';
import 'package:drift_tennis/features/learning/data/learning_repository.dart';
import 'package:drift_tennis/features/matches/data/matches_repository.dart';
import 'package:drift_tennis/features/matches/data/player_stats.dart';
import 'package:drift_tennis/features/messaging/data/messaging_repository.dart';
import 'package:drift_tennis/features/news/data/news_repository.dart';
import 'package:drift_tennis/features/notifications/data/notifications_repository.dart';
import 'package:drift_tennis/features/padel/data/padel_repository.dart';
import 'package:drift_tennis/features/players/data/players_repository.dart';
import 'package:drift_tennis/features/safety/data/safety_repository.dart';
import 'package:drift_tennis/features/users/data/users_repository.dart';

/// Canned domain objects shared across the widget tests, so a schema change
/// breaks one file rather than every screen test.

DriftNotification notification({
  String id = 'n1',
  NotificationCategory category = NotificationCategory.clubs,
  String title = 'Court closed',
  String body = 'Court 3 is shut for maintenance.',
  String? entityType = 'CLUB_ANNOUNCEMENT',
  String? entityId = 'club-1',
  DateTime? readAt,
}) => DriftNotification(
  id: id,
  category: category,
  title: title,
  body: body,
  relatedEntityType: entityType,
  relatedEntityId: entityId,
  readAt: readAt,
  createdAt: DateTime(2026, 8, 23, 10),
);

NotificationsPage notificationsPage({List<DriftNotification>? items}) {
  final list = items ?? [notification()];
  return NotificationsPage(
    total: list.length,
    unreadCount: list.where((n) => n.isUnread).length,
    notifications: list,
  );
}

const notificationPreferences = NotificationPreferences(
  connections: true,
  matches: true,
  messages: true,
  competitions: true,
  learning: true,
  news: false,
  clubs: true,
);

// ------------------------------------------------------------------ clubs

Announcement announcement({
  String id = 'a1',
  String title = 'Court closed',
  String body = 'Court 3 is shut for maintenance.',
  bool pinned = false,
}) => Announcement(
  id: id,
  title: title,
  body: body,
  pinned: pinned,
  publishedAt: DateTime(2026, 8, 23, 9),
);

ClubPost clubPost({
  String id = 'p1',
  String body = 'Anyone up for doubles Saturday?',
  ClubPostAuthor? author = const ClubPostAuthor(id: 'u1', name: 'Ana Diaz'),
  bool isMine = false,
  List<ClubPostReaction> reactions = const [],
}) => ClubPost(
  id: id,
  body: body,
  createdAt: DateTime(2026, 8, 23, 10),
  author: author,
  isMine: isMine,
  reactions: reactions,
);

ClubSummary clubSummary({
  String id = 'club-1',
  String name = 'Riverside Tennis',
}) => ClubSummary(
  id: id,
  name: name,
  address: '1 River Rd',
  latitude: 51.5,
  longitude: -0.12,
  distanceKm: 2.5,
  verificationStatus: ListingVerificationStatus.verified,
  courtCount: 2,
);

ClubProfile clubProfile({
  String id = 'club-1',
  String name = 'Riverside Tennis',
  ClubMembership membership = ClubMembership.none,
}) => ClubProfile(
  summary: clubSummary(id: id, name: name),
  membership: membership,
  description: 'A friendly club',
  phone: null,
  website: null,
  amenities: const ['Parking'],
  openingHoursNote: null,
  photoUrls: const [],
  courts: const [],
);

ClubSearchResult clubSearchResult({List<ClubSummary>? clubs}) {
  final list = clubs ?? [clubSummary()];
  return ClubSearchResult(total: list.length, clubs: list);
}

// ---------------------------------------------------------------- players

PlayerSummary playerSummary({
  String id = 'u2',
  String? firstName = 'Ana',
  String? lastName = 'Diaz',
  double? level = 4.0,
}) => PlayerSummary(
  id: id,
  firstName: firstName,
  lastName: lastName,
  photoUrl: null,
  level: level,
  levelLabel: level?.toStringAsFixed(1),
  generalLocation: 'Richmond',
  distanceBand: 'Under 5 km',
  preferredClubName: 'Riverside Tennis',
  formatPreference: 'SINGLES',
  stylePreference: 'COMPETITIVE',
  availabilitySummary: 'Weekday evenings',
);

const formatStats = FormatStats(
  rating: 4.0,
  ratingLabel: '4.0',
  wins: 6,
  losses: 3,
);

const playerStats = PlayerStats(
  singles: formatStats,
  doubles: formatStats,
  recentForm: ['W', 'W', 'L'],
);

PlayerProfile playerProfile({
  String id = 'u2',
  PlayerConnectionState connectionState = PlayerConnectionState.none,
  Map<String, num>? skillBreakdown = const {'SERVE': 4, 'FOREHAND': 3},
  List<AvailabilitySlot>? slots = const [
    AvailabilitySlot(dayOfWeek: 2, timeBlock: 'EVENING'),
  ],
}) => PlayerProfile(
  summary: playerSummary(id: id),
  dominantHand: 'RIGHT',
  connectionState: connectionState,
  skillBreakdown: skillBreakdown,
  availabilitySlots: slots,
  stats: playerStats,
);

// ------------------------------------------------------------- assessment

AssessmentQuestion assessmentQuestion({
  String questionId = 'q1',
  String prompt = 'How consistent is your serve?',
}) => AssessmentQuestion(
  questionId: questionId,
  pillar: 'SERVE',
  prompt: prompt,
  options: const [
    AssessmentOption(key: 'A', text: 'Rarely lands in'),
    AssessmentOption(key: 'B', text: 'Usually lands in'),
    AssessmentOption(key: 'C', text: 'Almost always lands in'),
  ],
);

AssessmentSessionState assessmentSession({
  int answeredCount = 2,
  bool withQuestion = true,
}) => AssessmentSessionState(
  sessionId: 'session-1',
  branch: 'basic',
  questionBudget: 13,
  answeredCount: answeredCount,
  nextQuestion: withQuestion ? assessmentQuestion() : null,
);

AssessmentResult assessmentResult({double level = 4.0}) => AssessmentResult(
  level: level,
  label: 'Strong intermediate',
  skillBreakdown: const {'SERVE': 3, 'FOREHAND': 4, 'BACKHAND': 3},
);

// ------------------------------------------------------------------ users

UserProfile userProfile({
  String id = 'u1',
  OnboardingStep step = OnboardingStep.complete,
}) => UserProfile(
  id: id,
  email: 'ana@test.com',
  firstName: 'Ana',
  lastName: 'Diaz',
  photoUrl: null,
  bio: 'Plays weekday evenings.',
  onboardingStep: step,
);

const privacySettings = PrivacySettings(
  skillBreakdownVisibility: FieldVisibility.connectionsOnly,
  availabilityVisibility: FieldVisibility.everyone,
);

// ---------------------------------------------------------------- matches

MatchParticipant participant({
  String userId = 'u1',
  String side = 'A',
  String role = 'CHALLENGER',
  ParticipantStatus status = ParticipantStatus.accepted,
}) => MatchParticipant(
  userId: userId,
  side: side,
  role: role,
  status: status,
  player: playerSummary(id: userId),
);

TimeProposal timeProposal({
  String proposedById = 'u2',
  String status = 'PENDING',
  String? acceptedOptionId,
}) => TimeProposal(
  id: 'tp1',
  round: 1,
  status: status,
  proposedById: proposedById,
  acceptedOptionId: acceptedOptionId,
  options: [
    TimeOption(id: 'to1', startsAt: DateTime(2026, 9, 1, 18)),
    TimeOption(id: 'to2', startsAt: DateTime(2026, 9, 2, 18)),
  ],
);

MatchResult matchResult({
  String status = 'PENDING_CONFIRMATION',
  ResultOutcome outcome = ResultOutcome.score,
  String submittedById = 'u2',
  String? disputedById,
}) => MatchResult(
  status: status,
  outcome: outcome,
  sets: const [
    SetScore(sideAGames: 6, sideBGames: 4),
    SetScore(sideAGames: 6, sideBGames: 3),
  ],
  winningSide: 'A',
  submittedById: submittedById,
  disputedById: disputedById,
  disputantOutcome: disputedById == null ? null : ResultOutcome.score,
  disputantSets: disputedById == null
      ? null
      : const [SetScore(sideAGames: 4, sideBGames: 6)],
  disputantWinningSide: disputedById == null ? null : 'B',
  ratingDeltaA: null,
  ratingDeltaB: null,
);

DriftMatch match({
  String id = 'match-1',
  String sport = 'TENNIS',
  String format = 'SINGLES',
  MatchState state = MatchState.scheduled,
  String createdById = 'u1',
  DateTime? confirmedTime,
  String? viewerRole = 'CHALLENGER',
  ParticipantStatus? viewerStatus = ParticipantStatus.accepted,
  List<MatchParticipant>? participants,
  TimeProposal? latestProposal,
  MatchResult? result,
  MatchCompetitionContext? competitionContext,
}) => DriftMatch(
  id: id,
  sport: sport,
  format: format,
  state: state,
  createdById: createdById,
  confirmedTime: confirmedTime ?? DateTime(2026, 9, 1, 18),
  courtName: 'Riverside Court 2',
  courtNote: null,
  roundsRemaining: 2,
  conversationId: 'conv-1',
  viewerRole: viewerRole,
  viewerStatus: viewerStatus,
  participants:
      participants ??
      [
        participant(userId: 'u1', side: 'A'),
        participant(userId: 'u2', side: 'B'),
      ],
  latestProposal: latestProposal,
  cancelReason: null,
  result: result,
  competitionContext: competitionContext,
);

// ----------------------------------------------------------- competitions

League league({String id = 'league-1', String name = 'Richmond Singles'}) =>
    League(
      id: id,
      sport: 'TENNIS',
      name: name,
      description: 'A local ladder.',
      rulesText: 'Best of three sets.',
      format: 'SINGLES',
      seasons: const [LeagueSeasonRef(id: 'season-1', label: 'Autumn 2026')],
    );

SeasonDetail seasonDetail({
  String id = 'season-1',
  SeasonState state = SeasonState.registrationOpen,
  SeasonRegistrationStatus? viewerRegistrationStatus,
}) => SeasonDetail(
  id: id,
  leagueId: 'league-1',
  leagueName: 'Richmond Singles',
  label: 'Autumn 2026',
  state: state,
  registrationOpensAt: DateTime(2026, 8, 1),
  registrationClosesAt: DateTime(2026, 8, 31),
  startsAt: DateTime(2026, 9, 1),
  roundCount: 6,
  enrolledCount: 12,
  capacity: 16,
  viewerRegistrationStatus: viewerRegistrationStatus,
);

MySeasonSummary mySeason({
  String seasonId = 'season-1',
  SeasonState state = SeasonState.active,
  SeasonRegistrationStatus registrationStatus =
      SeasonRegistrationStatus.enrolled,
}) => MySeasonSummary(
  seasonId: seasonId,
  leagueId: 'league-1',
  leagueName: 'Richmond Singles',
  label: 'Autumn 2026',
  state: state,
  registrationStatus: registrationStatus,
);

CompetitionRound competitionRound({
  String id = 'round-1',
  int index = 1,
  bool bye = false,
}) => CompetitionRound(
  id: id,
  seasonId: 'season-1',
  index: index,
  deadline: DateTime(2026, 9, 14),
  openedAt: DateTime(2026, 9, 1),
  closedAt: null,
  fixtures: [
    Fixture(
      id: 'fx1',
      sideA: playerSummary(id: 'u1', firstName: 'Ana'),
      sideB: bye ? null : playerSummary(id: 'u2', firstName: 'Ben'),
      isBye: bye,
      match: bye ? null : match(),
    ),
  ],
);

StandingRow standingRow({
  String userId = 'u1',
  int rank = 1,
  int? previousRank = 2,
}) => StandingRow(
  userId: userId,
  displayName: 'Ana Diaz',
  rank: rank,
  points: 9,
  wins: 3,
  losses: 1,
  previousRank: previousRank,
);

RegisteredPlayer registeredPlayer({
  String id = 'u2',
  SeasonRegistrationStatus status = SeasonRegistrationStatus.enrolled,
}) => RegisteredPlayer(status: status, player: playerSummary(id: id));

// ----------------------------------------------------------------- courts

CourtSummary courtSummary({
  String id = 'court-1',
  String name = 'Riverside Courts',
}) => CourtSummary(
  id: id,
  name: name,
  address: '1 River Rd',
  latitude: 51.5,
  longitude: -0.12,
  distanceKm: 1.2,
  surfaces: const ['HARD'],
  indoorAvailable: false,
  outdoorAvailable: true,
  verificationStatus: ListingVerificationStatus.verified,
  bookingType: CourtBookingType.contactOnly,
  clubId: 'club-1',
  clubName: 'Riverside Tennis',
);

CourtProfile courtProfile({String id = 'court-1'}) => CourtProfile(
  summary: courtSummary(id: id),
  phone: '020 7000 0000',
  website: 'https://example.test',
  bookingUrl: null,
  amenities: const ['Parking', 'Floodlights'],
  openingHoursNote: 'Open 7am to 10pm',
  isPublic: true,
  photoUrls: const [],
  courtGroups: const [
    CourtGroupSummary(
      id: 'cg1',
      sport: 'TENNIS',
      surface: 'HARD',
      indoor: false,
      lighting: true,
      count: 4,
    ),
  ],
  club: const ClubRef(
    id: 'club-1',
    name: 'Riverside Tennis',
    verificationStatus: ListingVerificationStatus.verified,
  ),
);

CourtSearchResult courtSearchResult({List<CourtSummary>? courts}) {
  final list = courts ?? [courtSummary()];
  return CourtSearchResult(total: list.length, courts: list);
}

// --------------------------------------------------------------- learning

ContentSummary contentSummary({
  String id = 'c1',
  String type = 'DRILL',
  String title = 'Serve placement ladder',
}) => ContentSummary(
  id: id,
  type: type,
  sport: 'TENNIS',
  targetSkill: 'SERVE',
  branch: null,
  title: title,
  summary: 'Ten minutes of targets.',
  durationMinutes: 10,
);

ContentDetail contentDetail({
  String id = 'c1',
  String type = 'DRILL',
  String? title,
  List<ContentSummary> steps = const [],
}) => ContentDetail(
  summary: contentSummary(id: id, type: type, title: title ?? 'Serve placement ladder'),
  bodyText: 'Stand side-on and swing up through the ball.',
  videoUrl: null,
  steps: steps,
);

PracticeSessionEntry practiceSession({String id = 'ps1'}) =>
    PracticeSessionEntry(
      id: id,
      occurredAt: DateTime(2026, 8, 23, 9),
      durationMinutes: 45,
      skillFocus: 'SERVE',
      notes: 'Felt good',
      perceivedPerformance: 4,
      drill: contentSummary(),
    );

SkillProfile skillProfile({String? weakest = 'SERVE'}) => SkillProfile(
  skills: const [
    SkillScoreEntry(skill: 'SERVE', score: 3.0, maturity: 'DEVELOPING'),
    SkillScoreEntry(skill: 'FOREHAND', score: 4.0, maturity: 'ESTABLISHED'),
  ],
  weakestSkill: weakest,
  recommendations: [contentSummary()],
);

SkillDetail skillDetail({String skill = 'SERVE'}) => SkillDetail(
  skill: skill,
  score: 3.5,
  maturity: 'DEVELOPING',
  assessmentBaseline: 3.0,
  practiceSessions: [practiceSession()],
  recommendations: [contentSummary()],
);

ProgressReport progressReport({bool withHistory = true}) => ProgressReport(
  skills: const [
    SkillScoreEntry(skill: 'SERVE', score: 3.0, maturity: 'DEVELOPING'),
  ],
  assessmentHistory: withHistory
      ? [
          AssessmentHistoryEntry(
            id: 'as1',
            completedAt: DateTime(2026, 8, 20, 9),
            resultSystemSuggestedLevel: 4.0,
          ),
        ]
      : const [],
);

Goal goal({
  String id = 'g1',
  String status = 'ON_TRACK',
  DateTime? achievedAt,
}) => Goal(
  id: id,
  skill: 'SERVE',
  baseline: 3.0,
  target: 4.5,
  deadline: DateTime(2026, 12, 1),
  achievedAt: achievedAt,
  currentScore: 3.5,
  status: status,
  milestones: [
    GoalMilestoneEntry(
      id: 'm1',
      label: 'Reach 3.5',
      achievedAt: DateTime(2026, 9, 1),
    ),
    const GoalMilestoneEntry(id: 'm2', label: 'Reach 4.0', achievedAt: null),
  ],
);

// ------------------------------------------------------- news / messaging

StorySummary storySummary({String id = 'n1', bool saved = false}) =>
    StorySummary(
      id: id,
      headline: 'A big win at Richmond',
      publisher: 'Drift Wire',
      imageUrl: null,
      highlight: 'A short highlight.',
      publicationDate: DateTime(2026, 8, 23, 8),
      categories: const ['LATEST'],
      topics: const ['tennis'],
      savedByViewer: saved,
    );

StoryDetail storyDetail({String id = 'n1'}) => StoryDetail(
  summary: storySummary(id: id),
  originalUrl: 'https://example.test/story',
);

ChatMessage chatMessage({
  String id = 'm1',
  String? senderId = 'u2',
  String kind = 'TEXT',
  String body = 'See you Saturday',
  String? systemEvent,
}) => ChatMessage(
  id: id,
  conversationId: 'conv-1',
  senderId: senderId,
  kind: kind,
  body: body,
  systemEvent: systemEvent,
  relatedMatchId: null,
  createdAt: DateTime(2026, 8, 23, 10),
);

Conversation conversation({String id = 'conv-1', int unread = 2}) =>
    Conversation(
      id: id,
      type: 'MATCH',
      matchId: 'match-1',
      unreadCount: unread,
      lastMessage: chatMessage(),
      participants: [playerSummary(id: 'u1'), playerSummary(id: 'u2')],
      lastMessageAt: DateTime(2026, 8, 23, 10),
    );

// ------------------------------------------------------ home / connections

HomeCard homeCard({
  String id = 'card-1',
  String type = 'UNCONFIRMED_RESULT',
  String title = 'Confirm a result',
}) => HomeCard(
  id: id,
  type: type,
  priority: 10,
  title: title,
  body: 'Ana submitted a score.',
);

ConnectionEntry connectionEntry({String id = 'conn-1', bool accepted = true}) =>
    ConnectionEntry(
      connectionId: id,
      player: playerSummary(id: 'u2'),
      connectedAt: accepted ? DateTime(2026, 8, 23, 10) : null,
      requestedAt: DateTime(2026, 8, 22, 10),
    );

PendingRequests pendingRequests({int incoming = 1, int outgoing = 1}) =>
    PendingRequests(
      incoming: List.generate(
        incoming,
        (i) => connectionEntry(id: 'in-$i', accepted: false),
      ),
      outgoing: List.generate(
        outgoing,
        (i) => connectionEntry(id: 'out-$i', accepted: false),
      ),
    );

BlockedPlayer blockedPlayer({String id = 'u3'}) => BlockedPlayer(
  blockedAt: DateTime(2026, 8, 23, 10),
  player: playerSummary(id: id),
);

// ------------------------------------------------------------------ padel

PadelProfile padelProfile({
  PadelSide? preferredSide = PadelSide.left,
  double? level = 3.0,
}) => PadelProfile(
  id: 'pp1',
  dominantHand: 'RIGHT',
  singlesRating: null,
  doublesRating: level,
  systemSuggestedLevel: level,
  levelLabel: level?.toStringAsFixed(1),
  skillBreakdown: const {'VOLLEY': 4, 'BANDEJA': 2},
  preferredSide: preferredSide,
  partnerPreference: 'REGULAR',
  goals: const ['improve_technique'],
);
