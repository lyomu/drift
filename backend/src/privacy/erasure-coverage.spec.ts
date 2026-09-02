import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * The guard that makes erasure stay correct.
 *
 * Twice on 2026-09-02, a table carrying personal data was added — social
 * identities, then device tokens — and neither reached the erasure path. Both
 * were caught by reading the schema afterwards, which is luck, not process.
 *
 * This test enumerates every model related to `User` straight from
 * `schema.prisma` and fails when one appears that has not been consciously
 * placed in exactly one of the two lists below. It cannot judge whether the
 * handling is *right* — only that somebody decided. That is the failure mode
 * worth automating: silence, not disagreement.
 */

const SCHEMA = fs.readFileSync(
  path.join(__dirname, '..', '..', 'prisma', 'schema.prisma'),
  'utf8',
);

/** Redacted or deleted by ErasureService.eraseUser. */
const ERASED = new Set([
  'TennisProfile',
  'PadelProfile',
  'CoachProfile',
  'VerificationCode',
  'RefreshToken',
  'SocialIdentity',
  'DeviceToken',
  'Message',
  'MatchReflection',
  'SupportTicket',
  'PlayerReport',
  'Notification',
  'SavedStory',
  'DismissedHomeCard',
  'ClubPostReaction',
  'PrivacyRequest',
]);

/**
 * Deliberately kept, each for a stated reason. Erasure here is anonymisation,
 * not deletion, precisely so these survive — they are other people's records
 * as much as the erased person's.
 */
const KEPT: Record<string, string> = {
  Match: 'another player was in it',
  MatchParticipant: 'the opponent needs their own match history',
  MatchResult: 'results decide other players standings',
  TimeProposal: 'the counterparty needs the negotiation intact',
  Conversation: 'the other participant keeps their thread',
  ConversationParticipant: 'membership shape of the other party thread',
  Connection: 'the other side of the connection is their record',
  Block: 'safety records must outlive the account',
  AbuseCase: 'safety records must outlive the account',
  CourtReport: 'moderation record about a venue, not about the reporter',
  MessageReport: 'safety record belonging to the moderation queue',
  ClubPostModerationReport: 'safety record belonging to the moderation queue',
  League: 'competition integrity for every other entrant',
  LeagueRegistration: 'competition integrity for every other entrant',
  LeagueAward: 'competition integrity for every other entrant',
  Fixture: 'competition integrity for every other entrant',
  Standing: 'competition integrity for every other entrant',
  Round: 'competition integrity for every other entrant',
  TournamentEntry: 'competition integrity for every other entrant',
  TournamentFixture: 'competition integrity for every other entrant',
  LadderEntry: 'competition integrity for every other entrant',
  LadderChallenge: 'competition integrity for every other entrant',
  ClubEvent: 'the club keeps its own event record',
  ClubEventRegistration: 'the club keeps its own attendance record',
  ClubMembership: 'the club keeps its own membership record',
  ClubPost: 'club content, redacted by author anonymisation',
  Announcement: 'club communication authored on the club behalf',
  ClubAuditLog: 'audit trail must not be rewritable by its subject',
  ClubMediaAsset: 'club-owned asset, not personal data',
  CourtInquiry: 'venue-side record with no free text from the user',
  VenueVerificationRequest: 'venue record submitted on the venue behalf',
  BillingAccount: 'financial records carry a statutory retention duty',
  NotificationPreference: 'booleans only, no personal data',
  AssessmentSession: 'skill assessment feeds ratings others are ranked against',
  PadelAssessmentSession: 'skill assessment feeds ratings others are ranked against',
};

/** Model names referenced as relations from the `User` block. */
function userRelationModels(): string[] {
  const block = SCHEMA.match(/^model User \{$([\s\S]*?)^\}$/m);
  if (!block) throw new Error('User model not found in schema.prisma');

  const models = new Set<string>();
  for (const raw of block[1].split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('//') || line.startsWith('@@')) continue;
    // `fieldName  ModelName[]?` — a relation is any field whose type starts
    // uppercase and is declared as its own model in the schema.
    const m = line.match(/^(\w+)\s+([A-Z]\w*)(\[\])?\??/);
    if (!m) continue;
    const type = m[2];
    if (new RegExp(`^model ${type} \{$`, 'm').test(SCHEMA)) models.add(type);
  }
  return [...models].sort();
}

describe('erasure coverage', () => {
  const related = userRelationModels();

  it('finds the relations to check (guards the parser itself)', () => {
    // If the schema format changes and the regex silently matches nothing,
    // every other assertion here would vacuously pass.
    expect(related.length).toBeGreaterThan(30);
    expect(related).toContain('SocialIdentity');
    expect(related).toContain('DeviceToken');
  });

  it('has a decision recorded for every model related to User', () => {
    const undecided = related.filter((m) => !ERASED.has(m) && !(m in KEPT));

    expect(undecided).toEqual([]);
    // Reading this because a new model appeared? Add it to ERASED if it holds
    // anything about the person, or to KEPT with the reason it survives.
    // Do not add it to KEPT just to make this pass.
  });

  it('never lists a model as both erased and kept', () => {
    const both = [...ERASED].filter((m) => m in KEPT);
    expect(both).toEqual([]);
  });

  it('gives every kept model a real reason, not a placeholder', () => {
    const weak = Object.entries(KEPT)
      .filter(([, reason]) => reason.trim().length < 15)
      .map(([model]) => model);
    expect(weak).toEqual([]);
  });
});
