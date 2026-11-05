/**
 * English copy for everything the server writes to a person: push
 * notifications (which are also the Notification Centre rows) and emails.
 *
 * This is the source catalog — `messages.fr.ts` and `messages.es.ts` are typed
 * against its keys, so adding a key here without translating it fails the
 * typecheck. `{name}` placeholders are filled by `t()`.
 */
export const en = {
  // Fallbacks used as parameters when a name is missing.
  'common.aClub': 'a club',
  'common.theClub': 'the club',
  'common.aPlayer': 'A player',

  // Clubs
  'club.added.title': "You've been added to {club}",
  'club.added.body': 'Your club membership is active. Tap to view the club.',
  'club.joined.title': "You've joined {club}",
  'club.joined.body': 'Announcements and the club feed are now open to you.',
  'club.joinRequest.title': '{name} asked to join {club}',
  'club.joinRequest.body': 'Review the request in Members.',
  'booking.request.title': '{name} requested a court booking',
  'booking.request.body': '{court} · {when}. Review it in Bookings.',
  'booking.approved.title': 'Booking confirmed',
  'booking.approved.body': '{court} · {when}{note}',
  'booking.declined.title': 'Booking declined',
  'booking.declined.body': '{court} · {when}{note}',
  'booking.cancelledByClub.title': 'Booking cancelled by the club',
  'booking.cancelledByClub.body': '{court} · {when}{note}',
  'booking.expired.title': 'Booking request expired',
  'booking.expired.body': '{court} · {when}. The club did not respond in time.',

  // Leagues and ladders
  'league.registered.title': "You're registered",
  'league.registered.body':
    "{league}. We'll let you know when your first round opens.",
  'league.waitlisted.title': "You're on the waitlist",
  'league.waitlisted.body':
    '{league} is full. You move in automatically if a spot opens.',
  'league.promoted.title': "You're in",
  'league.promoted.body': "A spot opened up in {league}. You've been enrolled.",
  'league.roundOpen.title': 'Round {round} is now open',
  'league.roundOpen.body':
    '{league} — check your fixture and get a time agreed.',
  'ladder.challenge.title': 'Ladder challenge',
  'ladder.challenge.body':
    "You've been challenged on {ladder}. Accept to schedule the match.",

  // Connections
  'connection.request.title': '{name} wants to connect',
  'connection.request.body': 'Review their request to accept or decline.',
  'connection.accepted.title': '{name} accepted your connection request',
  'connection.accepted.body': "You're now connected.",

  // Matches
  'match.challenge.title': '{name} challenged you to a match',
  'match.challenge.body': 'Review the challenge and accept or decline.',
  'match.partnerInvite.title': '{name} wants you as their doubles partner',
  'match.partnerInvite.body': 'Accept to join the match.',
  'match.everyoneIn.title': 'Everyone is in — agree a time',
  'match.everyoneIn.body': 'Propose a time to get the match scheduled.',
  'match.accepted.title': '{name} accepted your challenge',
  'match.accepted.body': 'Waiting on the rest of the players.',
  'match.declined.title': '{name} declined your challenge',
  'match.declined.body': 'Find another opponent when you’re ready.',
  'match.timeProposed.title': '{name} proposed a time',
  'match.timeProposed.body': 'Pick one that works or counter with your own.',
  'match.confirmed.title': 'Your match is confirmed',
  'match.confirmed.body': 'Locked in for {date}.',
  'match.courtSuggested.title': '{name} suggested a court',
  'match.reschedule.title': '{name} wants to reschedule',
  'match.reschedule.body': 'Propose a new time to get it back on.',
  'match.cancelled.title': '{name} cancelled the match',
  'match.cancelled.noReason': 'No reason given.',
  'match.withdrawn.title': '{name} withdrew the challenge',
  'match.withdrawn.body': 'This challenge is no longer available.',

  // Results and disputes
  'result.submitted.title': '{name} submitted a result',
  'result.submitted.body': 'Review it to confirm or dispute.',
  'result.confirmed.title': '{name} confirmed your result',
  'result.confirmed.body': 'Your rating and stats are updated.',
  'result.disputed.title': '{name} disputed the result',
  'result.disputed.body': 'Open the dispute to submit your version.',
  'result.resolved.title': 'Your dispute is resolved',
  'result.resolved.body': 'Both versions match — ratings are updated.',
  'result.revised.title': '{name} revised their version',
  'result.revised.body': 'It still doesn’t match yours — take another look.',
  'result.ruled.title': 'A club admin ruled on your dispute',
  'result.ruled.body': 'The result is final and ratings are updated.',
  'result.recorded.title': 'A club admin recorded your result',
  'result.recorded.body': 'Your rating and stats are updated.',

  // Messaging
  'message.new.title': 'New message from {name}',
  'message.newInCommunity.title': '{community}: {name}',

  // Communities
  'community.approved.title': 'Your community is live',
  'community.approved.body':
    '{community} was approved. Invite the people you play with.',
  'community.rejected.title': "Your community wasn't approved",
  'community.rejected.body': '{community}: {note}',
  'community.rejectedNoNote.body':
    "{community} didn't meet the community guidelines.",
  'community.joinRequest.title': '{name} asked to join {community}',
  'community.joinRequest.body': 'Review the request in Manage community.',
  'community.requestApproved.title': "You're in {community}",
  'community.requestApproved.body': 'Say hello in the community chat.',
  'community.requestDeclined.title': 'Request not accepted',
  'community.requestDeclined.body':
    "{community} didn't accept your request to join.",
  'community.removed.title': 'Removed from {community}',
  'community.removed.body': 'An admin removed you from this community.',
  'community.suspended.title': '{community} was suspended',
  'community.suspended.body':
    'Its chat is read-only while Drift Tennis reviews it.',
  'community.restored.title': '{community} is back',
  'community.restored.body': 'The community chat is open again.',
  'community.deleted.title': '{community} was closed',
  'community.deleted.body': 'This community no longer exists.',
  'community.madeAdmin.title': "You're now an admin of {community}",
  'community.madeAdmin.body': 'You can approve requests and manage members.',
  'community.ownershipTransferred.title': 'You now own {community}',
  'community.ownershipTransferred.body':
    'You can manage everything about this community.',
  'community.newLeague.title': 'New league in {community}',
  'community.newLadder.title': 'New ladder in {community}',
  'community.newCompetition.body':
    '{competition}. Open the community to take part.',

  // Home feed cards
  'home.empty.title': "You're all caught up",
  'home.empty.body':
    'Nothing needs you right now. Find a player nearby and set up your next match.',
  'home.action.findPlayers': 'Find players',
  'home.action.viewAll': 'View all',
  'home.action.openClub': 'Open {club}',
  'home.action.open': 'Open',
  'home.action.viewChallenge': 'View challenge',
  'home.action.openFixture': 'Open fixture',
  'home.action.findCourts': 'Find courts',
  'home.action.addPadel': 'Add Padel',
  'home.action.viewRequests': 'View requests',
  'home.action.reviewDispute': 'Review dispute',
  'home.action.reviewScore': 'Review score',
  'home.action.openInbox': 'Open inbox',
  'home.action.viewMatch': 'View match',
  'home.achievements.title': '{earned} of {total} achievements',
  'home.achievements.next': 'Next up: {title} — {criteria}',
  'home.achievements.keepPlaying': 'Keep playing to unlock the rest.',
  'home.skill.FOREHAND': 'forehand',
  'home.skill.BACKHAND': 'backhand',
  'home.skill.SERVE': 'serve',
  'home.skill.RETURN': 'return',
  'home.skill.NET_PLAY': 'net play',
  'home.skill.MOVEMENT': 'movement',
  'home.skill.MATCH_PLAY': 'match play',
  'home.recommendation.title': 'Work on your {skill}',
  'home.recommendation.drill': '"{title}" is a drill picked for your level.',
  'home.recommendation.lesson': '"{title}" is a lesson picked for your level.',
  'home.challenge.title': '{name} challenged you',
  'home.challenge.singles': 'A singles match.',
  'home.challenge.doubles': 'A doubles match.',
  'home.challenge.respond': 'Accept or decline to let them know.',
  'home.challenge.expiresToday': 'It expires today.',
  'home.challenge.expiresTomorrow': 'Expires tomorrow.',
  'home.challenge.expiresInDays': 'Expires in {days} days.',
  'home.round.title': 'Round {round} closes {when}',
  'home.round.withinHour': 'within the hour',
  'home.round.inHours': 'in {hours} hours',
  'home.round.tomorrow': 'tomorrow',
  'home.round.inDays': 'in {days} days',
  'home.round.scheduled':
    "Play your {league} fixture and record the score before the deadline, or it's recorded as a walkover.",
  'home.round.unscheduled':
    "You haven't agreed a time for your {league} fixture yet. Unplayed fixtures are recorded as a walkover.",
  'home.courts.title': 'Courts near you',
  'home.courts.distance': '{name} is about {km} km away.',
  'home.courts.nearby': '{name} and others are nearby.',
  'home.padel.title': 'Padel is ready when you are',
  'home.padel.learn':
    "You said you'd like to learn Padel. Take the short assessment and we'll set your starting level.",
  'home.padel.plays':
    'You told us you play Padel too. Add it to your profile to get a Padel rating and match history.',
  'home.connections.one': '{name} wants to connect',
  'home.connections.many': '{count} people want to connect',
  'home.connections.oneBody':
    'Connecting unlocks their full profile and lets you message each other.',
  'home.connections.manyBody':
    'Including {name}. Connecting unlocks full profiles and messaging.',
  'home.opponents.title': 'Players near your level',
  'home.opponents.one': 'One player nearby looks like a good match.',
  'home.opponents.many': '{count} players nearby look like a good match.',
  'home.result.yourOpponent': 'Your opponent',
  'home.result.disputedTitle': 'A score is disputed',
  'home.result.disputedBody':
    'You and {name} recorded different scores. Compare both versions to settle it.',
  'home.result.confirmTitle': 'Confirm your match score',
  'home.result.confirmBody':
    '{name} submitted a score. Confirm it to lock in both your ratings.',
  'home.messages.one': 'You have a new message',
  'home.messages.many': '{count} unread messages',
  'home.messages.oneThread': 'In one conversation.',
  'home.messages.manyThreads': 'Across {count} conversations.',
  'home.upcoming.yourOpponent': 'your opponent',
  'home.upcoming.title': 'Next up: {name}',
  'home.upcoming.at': 'At {venue}.',
  'home.upcoming.noCourt': 'No court agreed yet.',

  // Email — shared
  'mail.signoff': '— Drift Tennis',

  // Email — verification codes
  'mail.code.signup.subject': 'Your Drift Tennis verification code',
  'mail.code.signup.lead':
    'Welcome to Drift Tennis. Your email verification code is:',
  'mail.code.passwordReset.subject': 'Reset your Drift Tennis password',
  'mail.code.passwordReset.lead':
    'Use the code below to reset your Drift Tennis password:',
  'mail.code.expiry': 'The code expires in 10 minutes and can be used once.',
  'mail.code.ignore':
    'If you did not request this, ignore this email — your account is safe.',

  // Email — club
  'mail.clubSetup.subject':
    'Your Drift Tennis club was approved — finish setting it up',
  'mail.clubSetup.approved': 'Your club creation request has been approved.',
  'mail.clubSetup.finish': 'Finish setting up your club account:',
  'mail.ignoreIfNotRequested':
    'If you did not request this, ignore this email.',
  'mail.clubWelcome.subject': 'You have been added to {club} on Drift Tennis',
  'mail.clubWelcome.added': 'You have been added to {club} as {role}.',
  'mail.clubWelcome.open': 'Open the Drift Tennis app to see your club.',
  'mail.role.OWNER': 'owner',
  'mail.role.ADMIN': 'admin',
  'mail.role.COMPETITION_MANAGER': 'competition manager',
  'mail.role.COACH': 'coach',
  'mail.role.CONTENT_MANAGER': 'content manager',
  'mail.role.READ_ONLY': 'read-only member',

  // Email — welcome
  'mail.welcome.greetingNamed': 'Hi {name},',
  'mail.welcome.greeting': 'Hi,',
  'mail.welcome.subject': 'Welcome to Drift Tennis',
  'mail.welcome.body':
    'Welcome to Drift Tennis — we’re really glad you are here.\n\nDrift is here to help you find people to play with, develop your game,\nand stay connected to your tennis community.\n\nComplete your profile to get started, then explore players, clubs, and\nmatches near you. Whether you are here to play, coach, or build a club\ncommunity, you are part of the Drift community now.\n\nSee you on court,',
  'mail.welcomeClub.subject': 'Welcome to Drift Tennis — {club} is ready',
  'mail.welcomeClub.body':
    'Welcome to Drift Tennis — we’re delighted to have {club} join the community.\n\nYour club space is ready. Add the details that help players find you,\ninvite your team, and share your first announcement when you are ready.\n\nWe’re glad you are here and look forward to seeing your community grow.',

  // Email — waitlist
  'mail.waitlist.subject': "You're on the Drift Tennis waitlist",
  'mail.waitlist.greetingNamed': "You're on the list for Drift Tennis, {name}.",
  'mail.waitlist.greeting': "You're on the list for Drift Tennis.",
  'mail.waitlist.body':
    'We will send launch news and occasional Drift Tennis product updates\nor offers. To stop non-essential emails, contact drift@einsbrand.com\nwith "Unsubscribe" in the subject line.\nIt is free to join and free to play while we get going.\nAndroid first, iOS follows.\n\nIf you did not sign up, ignore this email and contact us if you would\nlike the address removed.',

  // Daily tennis fact (Notification Centre only, no push)
  'tennisFact.notificationTitle': 'Your daily ace',

  // Email — support
  'mail.support.subject': 'Re: {subject} — new reply from Drift Tennis support',
  'mail.support.lead': 'Support has replied to your ticket:',
  'mail.support.open':
    'Open the Drift Tennis app to continue the conversation.',
} as const;

export type MessageKey = keyof typeof en;
