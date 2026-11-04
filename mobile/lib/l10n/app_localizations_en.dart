// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get achievementsCriteria => 'Criteria';

  @override
  String get achievementsEarned => 'Earned';

  @override
  String get achievementsLoadFailed => 'Couldn\'t load achievements.';

  @override
  String get achievementsLocked => 'Locked';

  @override
  String get achievementsYourBadges => 'Your badges';

  @override
  String get assessmentGoodProgress => 'Good progress';

  @override
  String get assessmentHalfway =>
      'You are halfway through. The next questions fine-tune your level so Drift can suggest better matches.';

  @override
  String get assessmentHistory => 'Assessment History';

  @override
  String get assessmentLoadFailed => 'Unable to load the assessment.';

  @override
  String get assessmentOnlyOne => 'Only one assessment so far';

  @override
  String assessmentQuestionOf(int current, int total) {
    return 'Question $current of $total';
  }

  @override
  String get assessmentTitle => 'Tennis Assessment';

  @override
  String get authAgePolicy =>
      'I confirm I am 18 or older and agree to the Terms and Conditions and Privacy Policy.';

  @override
  String authAppleFailed(String details) {
    return 'Apple sign-in could not be completed. $details';
  }

  @override
  String get authAppleNoToken =>
      'Apple returned no identity token. Please try again.';

  @override
  String get authAppleUnavailable =>
      'Apple sign-in isn\'t available on this device yet.';

  @override
  String get authBackToLogin => 'Back to Log In';

  @override
  String get authCode => 'Code';

  @override
  String get authConfirmNewPassword => 'Confirm new password';

  @override
  String get authContinueApple => 'Continue with Apple';

  @override
  String get authContinueGoogle => 'Continue with Google';

  @override
  String get authCreateAccount => 'Create account';

  @override
  String get authEmail => 'Email';

  @override
  String get authFirstName => 'First name';

  @override
  String get authForgotPasswordIntro =>
      'Enter the email address on your account and we’ll send a six-digit code you can use to set a new password.';

  @override
  String get authForgotPasswordLink => 'Forgot Password?';

  @override
  String get authForgotPasswordTitle => 'Forgot Password';

  @override
  String get authGoogleFailed => 'Google sign-in could not be completed.';

  @override
  String get authGoogleNoToken =>
      'Google returned no identity token. The app is missing its server client ID.';

  @override
  String get authHaveAccount => 'Already have an account? ';

  @override
  String get authLastName => 'Last name';

  @override
  String get authLink => 'Link';

  @override
  String authLinkBody(String email) {
    return '$email already has a Drift Tennis account. Enter its password once and the two will be linked — after that you can use either to sign in.';
  }

  @override
  String get authLinkTitle => 'Link your account';

  @override
  String get authLogIn => 'Log in';

  @override
  String get authLogin => 'Login';

  @override
  String get authNeedAccount => 'Need an account? ';

  @override
  String get authNewPassword => 'New password';

  @override
  String get authOnWhatsApp => 'This number is on WhatsApp';

  @override
  String get authPassword => 'Password';

  @override
  String get authPasswordRule => 'Use 8 to 72 characters.';

  @override
  String get authPasswordUpdated =>
      'Password updated. Log in with your new password.';

  @override
  String get authPasswordsDontMatch => 'Those passwords don’t match.';

  @override
  String get authPhone => 'Phone number';

  @override
  String get authPhoneOptional => 'Phone number (optional)';

  @override
  String get authResendCode => 'Resend code';

  @override
  String authResendCodeIn(int seconds) {
    return 'Resend code in ${seconds}s';
  }

  @override
  String authResendIn(int seconds) {
    return 'Resend in ${seconds}s';
  }

  @override
  String authResetPasswordIntro(String email) {
    return 'If an account exists for $email, a six-digit code is on its way. Enter it below with your new password.';
  }

  @override
  String get authResetPasswordTitle => 'Reset Password';

  @override
  String get authSearchCountries => 'Search countries';

  @override
  String authSelectCountry(String country, String code) {
    return 'Select country, currently $country, plus $code';
  }

  @override
  String get authSendCode => 'Send Code';

  @override
  String get authSetNewPassword => 'Set New Password';

  @override
  String get authSignUp => 'Sign up';

  @override
  String get authSixDigitCode => 'Six-digit code';

  @override
  String get authVerify => 'Verify';

  @override
  String authVerifyIntro(String email) {
    return 'Enter the 6-digit code we sent to $email.';
  }

  @override
  String get authVerifying => 'Verifying…';

  @override
  String get availBookOnline => 'Book online';

  @override
  String get availComingSoon => 'Booking coming soon';

  @override
  String get availContactToBook => 'Contact to book';

  @override
  String get availUnknown => 'Booking unknown';

  @override
  String get blockedLoadFailed => 'Couldn\'t load your blocked users.';

  @override
  String get blockedNone => 'You haven\'t blocked anyone.';

  @override
  String get blockedUnblock => 'Unblock';

  @override
  String get blockedUnblocking => 'Unblocking…';

  @override
  String get clubAnnouncements => 'Announcements';

  @override
  String get clubFeed => 'Club Feed';

  @override
  String get clubFormerMember => 'Former member';

  @override
  String get clubInvited => 'You have been invited to this club.';

  @override
  String get clubJoin => 'Join';

  @override
  String get clubJoinRequestSent => 'Join request sent.';

  @override
  String get clubJoinToSeeAnnouncements =>
      'Join this club to see its announcements.';

  @override
  String get clubJoinToSeeFeed => 'Join this club to see and post to its feed.';

  @override
  String get clubLeave => 'Leave club';

  @override
  String get clubLoadFailed => 'Couldn\'t load clubs. Pull to retry.';

  @override
  String get clubNoAnnouncements => 'No announcements yet';

  @override
  String get clubNoCourtsListed => 'No courts listed';

  @override
  String get clubNoPosts => 'No posts yet';

  @override
  String get clubNoneNearby => 'No clubs nearby yet';

  @override
  String get clubRequestPending => 'Your request is waiting for a club admin.';

  @override
  String get clubRequestToJoin => 'Request to join';

  @override
  String get clubRequested => 'Requested';

  @override
  String get clubRequesting => 'Requesting…';

  @override
  String get clubShareHint => 'Share something with the club';

  @override
  String get clubSuspended => 'Your membership of this club is suspended.';

  @override
  String get clubTitle => 'Club';

  @override
  String get clubUnavailable => 'Club not available.';

  @override
  String get clubViewCoaches => 'View coaches';

  @override
  String get clubWithdrawRequest => 'Withdraw request';

  @override
  String get coachContactBook => 'Contact / Book';

  @override
  String get coachContactFailed => 'Could not open that contact method.';

  @override
  String coachContactName(String name) {
    return 'Contact $name';
  }

  @override
  String get coachEmail => 'Email coach';

  @override
  String get coachFallbackName => 'Coach';

  @override
  String get coachFilters => 'Coach filters';

  @override
  String get coachLoadFailed => 'Couldn\'t load coaches. Pull to retry.';

  @override
  String get coachNoneNearby => 'No coaches listed near you yet';

  @override
  String get coachOpenBooking => 'Open booking page';

  @override
  String get coachPlayersCoached => 'Players coached';

  @override
  String get coachQualifications => 'Qualifications';

  @override
  String get coachSearchClub => 'Search by club name';

  @override
  String get coachSelectedClub => 'Selected club';

  @override
  String get coachSpecialisation => 'Specialisation';

  @override
  String get coachSpecialisationHint => 'e.g. Serve, juniors, match play';

  @override
  String get coachSpecialisations => 'Specialisations';

  @override
  String get coachTitle => 'Coach';

  @override
  String get coachUnavailable => 'Coach profile is not available.';

  @override
  String get comingSoon => 'Coming soon';

  @override
  String get comingSoonApple =>
      'Apple sign-in isn\'t ready yet — we\'re still setting it up. Please continue with Google or email for now.';

  @override
  String get commonAccept => 'Accept';

  @override
  String get commonAvailability => 'Availability';

  @override
  String get commonBack => 'Back';

  @override
  String commonCallNumber(String phone) {
    return 'Call $phone';
  }

  @override
  String get commonCancel => 'Cancel';

  @override
  String get commonCancelling => 'Cancelling…';

  @override
  String get commonClose => 'Close';

  @override
  String get commonCompleted => 'Completed';

  @override
  String get commonConfirm => 'Confirm';

  @override
  String get commonContact => 'Contact';

  @override
  String get commonContinue => 'Continue';

  @override
  String commonCourtCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count courts',
      one: '1 court',
    );
    return '$_temp0';
  }

  @override
  String get commonDecline => 'Decline';

  @override
  String get commonDelete => 'Delete';

  @override
  String get commonDistanceUnknown => 'Distance unknown';

  @override
  String get commonDone => 'Done';

  @override
  String get commonErrorGeneric => 'Something went wrong. Please try again.';

  @override
  String get commonGoBack => 'Go back';

  @override
  String get commonGotIt => 'Got it';

  @override
  String get commonInProgress => 'In progress';

  @override
  String commonKmAway(String km) {
    return '$km km away';
  }

  @override
  String commonLevel(String level) {
    return 'Level $level';
  }

  @override
  String get commonLoading => 'Loading…';

  @override
  String get commonNotAvailable => 'Not available.';

  @override
  String get commonNotSet => 'Not set';

  @override
  String get commonNotesOptional => 'Notes (optional)';

  @override
  String get commonOpen => 'Open';

  @override
  String get commonOpenAction => 'Open';

  @override
  String get commonOptionalSuffix => ' (optional)';

  @override
  String get commonPlayer => 'Player';

  @override
  String commonPlayerCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count players',
      one: '1 player',
    );
    return '$_temp0';
  }

  @override
  String get commonRetry => 'Retry';

  @override
  String get commonSave => 'Save';

  @override
  String get commonSaving => 'Saving…';

  @override
  String get commonSearch => 'Search';

  @override
  String get commonSeeAll => 'See all';

  @override
  String get commonSending => 'Sending…';

  @override
  String get commonSkip => 'Skip';

  @override
  String get commonSubmit => 'Submit';

  @override
  String get commonSubmitting => 'Submitting…';

  @override
  String get commonThem => 'Them';

  @override
  String get commonToday => 'Today';

  @override
  String get commonTryAgain => 'Try again';

  @override
  String get commonUnknown => 'Unknown';

  @override
  String get commonUnknownDate => 'Unknown date';

  @override
  String get commonUnrated => 'Unrated';

  @override
  String get commonUpdating => 'Updating…';

  @override
  String get commonVerified => 'Verified';

  @override
  String get commonView => 'View';

  @override
  String get commonViewAll => 'View all';

  @override
  String get commonViewDetails => 'View details';

  @override
  String get commonViewProfile => 'View profile';

  @override
  String get commonVs => 'vs';

  @override
  String get commonWorking => 'Working…';

  @override
  String get commonYesterday => 'Yesterday';

  @override
  String get commonYou => 'You';

  @override
  String get communityAboutHint =>
      'Who it\'s for, level, where you usually play…';

  @override
  String get communityAboutOptional => 'About · Optional';

  @override
  String get communityAddPhoto => 'Add a photo';

  @override
  String get communityAddPhotoOptional => 'Add a photo (optional)';

  @override
  String get communityApprove => 'Approve';

  @override
  String communityChallengeRange(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Players can challenge up to $count rungs up',
      one: 'Players can challenge 1 rung up',
    );
    return '$_temp0';
  }

  @override
  String get communityChallengeRangeHint =>
      'How far above their own position a player may challenge.';

  @override
  String get communityChangePhoto => 'Change photo';

  @override
  String communityChatPreview(String name, String message) {
    return '$name: $message';
  }

  @override
  String get communityChatReadOnly =>
      'This community is suspended, so its chat is read-only.';

  @override
  String get communityChatUnavailable =>
      'The chat opens once the community is approved.';

  @override
  String get communityCity => 'City';

  @override
  String get communityCityHint => 'Nairobi';

  @override
  String get communityCreate => 'Create';

  @override
  String get communityDecline => 'Decline';

  @override
  String get communityDelete => 'Delete community';

  @override
  String get communityDeleteBody =>
      'The chat, ladders and leagues go with it, and every member is told it was closed. This can\'t be undone.';

  @override
  String get communityDeleted => 'Community deleted';

  @override
  String communityDeleteTitle(String name) {
    return 'Delete $name?';
  }

  @override
  String get communityDetails => 'Details';

  @override
  String get communityDisputeHint =>
      'The players disagree on the score. Your ruling settles it.';

  @override
  String get communityDisputeKeep => 'Keep submitted score';

  @override
  String get communityDisputeResolved => 'Dispute resolved';

  @override
  String communityDisputes(int count) {
    return 'Disputed results ($count)';
  }

  @override
  String get communityDisputeUseDisputed => 'Use disputed score';

  @override
  String communityDisputeVs(String a, String b) {
    return '$a vs $b';
  }

  @override
  String get communityEmptyBody =>
      'A community is a standing session with its own members and chat. Start one and invite the people you play with.';

  @override
  String get communityEmptyTitle => 'No communities yet';

  @override
  String get communityFilterAnyCity => 'Any city';

  @override
  String get communityFilterCity => 'City';

  @override
  String get communityFilterCityTitle => 'Communities in…';

  @override
  String get communityFilterNearMe => 'Near me';

  @override
  String get communityFrequencyBiweekly => 'Every two weeks';

  @override
  String get communityFrequencyMonthly => 'Monthly';

  @override
  String get communityFrequencyOther => 'Other';

  @override
  String get communityFrequencyWeekly => 'Weekly';

  @override
  String get communityHowOften => 'How often';

  @override
  String get communityJoin => 'Join';

  @override
  String get communityJoinAnyone => 'Anyone';

  @override
  String get communityJoinAnyoneHint =>
      'Anyone on Drift Tennis can join straight away';

  @override
  String get communityJoinByRequest => 'By request';

  @override
  String get communityJoinByRequestHint => 'You approve each request';

  @override
  String get communityJoined => 'Joined';

  @override
  String communityJoinedToast(String name) {
    return 'You\'ve joined $name';
  }

  @override
  String communityJoinRequests(int count) {
    return 'Join requests ($count)';
  }

  @override
  String get communityLadderCreated =>
      'Ladder created. Members have been notified.';

  @override
  String get communityLadderName => 'Ladder name';

  @override
  String communityLadderPlayers(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count players',
      one: '1 player',
      zero: 'No players yet',
    );
    return '$_temp0';
  }

  @override
  String get communityLadders => 'Ladders';

  @override
  String communityLadderYourRung(int position, int total) {
    return 'You\'re #$position of $total';
  }

  @override
  String get communityLeagueCapacity => 'Player limit (optional)';

  @override
  String get communityLeagueCapacityHint => 'Extra sign-ups join a waitlist.';

  @override
  String get communityLeagueCloseBeforeStart =>
      'Registration has to close on or before the start date.';

  @override
  String get communityLeagueCreate => 'Create league';

  @override
  String get communityLeagueCreated =>
      'League created. Members have been notified.';

  @override
  String get communityLeagueDaysBetweenRounds => 'Days per round';

  @override
  String get communityLeagueDescription => 'Description (optional)';

  @override
  String get communityLeagueName => 'League name';

  @override
  String get communityLeagueOpenBeforeClose =>
      'Registration has to open before it closes.';

  @override
  String get communityLeagueRegistrationCloses => 'Registration closes';

  @override
  String get communityLeagueRegistrationOpens => 'Registration opens';

  @override
  String get communityLeagueRounds => 'Rounds';

  @override
  String get communityLeagues => 'Leagues';

  @override
  String get communityLeagueStarts => 'League starts';

  @override
  String get communityLeave => 'Leave community';

  @override
  String get communityLeaveBody =>
      'You\'ll leave its chat and stop getting its notifications. You can ask to join again later.';

  @override
  String get communityLeaveLastOwner =>
      'You\'re the only member, so leaving closes the community for good.';

  @override
  String communityLeaveTitle(String name) {
    return 'Leave $name?';
  }

  @override
  String get communityLeft => 'You\'ve left the community.';

  @override
  String get communityLoadCompetitionsFailed => 'Couldn\'t load competitions.';

  @override
  String get communityLoadFailed => 'Couldn\'t load communities.';

  @override
  String get communityLoadMembersFailed => 'Couldn\'t load members.';

  @override
  String get communityLoadOneFailed => 'Couldn\'t load this community.';

  @override
  String get communityMakeAdmin => 'Make admin';

  @override
  String get communityMakeOwner => 'Make owner';

  @override
  String get communityManage => 'Manage community';

  @override
  String communityMemberCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count members',
      one: '1 member',
    );
    return '$_temp0';
  }

  @override
  String communityMembersCount(int count) {
    return 'Members ($count)';
  }

  @override
  String get communityMute => 'Mute chat notifications';

  @override
  String get communityMuteHint =>
      'Approvals and new competitions still reach you.';

  @override
  String get communityName => 'Name';

  @override
  String get communityNameHint => 'Tuesday Doubles';

  @override
  String get communityNearYou => 'Communities near you';

  @override
  String get communityNewLadder => 'New ladder';

  @override
  String get communityNewLeague => 'New league';

  @override
  String get communityNoAbout => 'No description yet.';

  @override
  String get communityNoCompetitions => 'No ladders or leagues yet.';

  @override
  String get communityNoCompetitionsManager =>
      'No ladders or leagues yet. Start one for your members.';

  @override
  String get communityNoneMatch =>
      'No communities match. Try another filter, or start one.';

  @override
  String get communityNoneNearby =>
      'No communities near you yet. Start one and invite the people you play with.';

  @override
  String get communityNotApprovedBody =>
      'Drift didn\'t approve this community. Contact support if you think that\'s a mistake.';

  @override
  String get communityOwnerZone => 'Owner';

  @override
  String get communityPhotoChosen => 'Photo added';

  @override
  String get communityRemove => 'Remove from community';

  @override
  String get communityRemoveAdmin => 'Remove as admin';

  @override
  String get communityRemoveBody =>
      'They\'ll leave the chat and be told they were removed. They can ask to join again.';

  @override
  String communityRemoveTitle(String name) {
    return 'Remove $name?';
  }

  @override
  String get communityReport => 'Report community';

  @override
  String get communityReportAlsoLeave => 'Also leave this community';

  @override
  String get communityReportBody =>
      'Drift\'s team will review it. The community won\'t be told who reported it.';

  @override
  String get communityReported => 'Thanks — Drift will review this community.';

  @override
  String get communityReportedAndLeft =>
      'Reported, and you\'ve left the community.';

  @override
  String communityReportTitle(String name) {
    return 'Report $name';
  }

  @override
  String get communityRequested => 'Requested';

  @override
  String get communityRequestedCancel => 'Requested · Cancel request';

  @override
  String get communityRequestSent =>
      'Request sent. You\'ll get a notification when it\'s answered.';

  @override
  String get communityRequestToJoin => 'Request to join';

  @override
  String get communityResults => 'Results';

  @override
  String get communityReviewNote =>
      'Drift reviews every new community before others can find it. We\'ll let you know when it\'s live.';

  @override
  String get communityRoleAdmin => 'Admin';

  @override
  String get communityRoleMember => 'Member';

  @override
  String get communityRoleOwner => 'Owner';

  @override
  String communityRunBy(String club) {
    return 'Run by $club';
  }

  @override
  String get communitySave => 'Save changes';

  @override
  String get communitySaved => 'Saved';

  @override
  String get communitySearchHint => 'Search communities';

  @override
  String get communityStart => 'Start a community';

  @override
  String get communityStatusNotApproved => 'Not approved';

  @override
  String get communityStatusSuspended => 'Suspended';

  @override
  String get communityStatusUnderReview => 'Under review';

  @override
  String get communitySubmitted => 'Submitted for review';

  @override
  String get communitySuspendedBody =>
      'Drift suspended this community. The chat is read-only and nobody can join while it\'s reviewed.';

  @override
  String get communityTabAbout => 'About';

  @override
  String get communityTabChat => 'Chat';

  @override
  String get communityTabCompetitions => 'Competitions';

  @override
  String get communityTabMembers => 'Members';

  @override
  String get communityTransfer => 'Make owner';

  @override
  String get communityTransferBody =>
      'They\'ll be able to manage everything, including deleting the community. You stay on as an admin.';

  @override
  String communityTransferred(String name) {
    return '$name now owns the community';
  }

  @override
  String communityTransferTitle(String name) {
    return 'Make $name the owner?';
  }

  @override
  String get communityTypeClub => 'Club';

  @override
  String get communityTypeClubHint => 'A club\'s own members';

  @override
  String get communityTypeLadder => 'Ladder';

  @override
  String get communityTypeLadderHint => 'A standing ranked competition';

  @override
  String get communityTypeSocial => 'Social';

  @override
  String get communityTypeSocialHint => 'Regular friendly sessions';

  @override
  String get communityTypeTraining => 'Training';

  @override
  String get communityTypeTrainingHint => 'Drills and coached practice';

  @override
  String get communityUnderReviewBody =>
      'Drift is reviewing your community. Nobody else can find or join it until it\'s approved — we\'ll send you a notification.';

  @override
  String get communityUnmute => 'Unmute chat notifications';

  @override
  String get communityWhatItIs => 'What it is';

  @override
  String get communityWhoCanJoin => 'Who can join';

  @override
  String get communityYourCommunities => 'Your communities';

  @override
  String get competeBye => 'Bye';

  @override
  String competeByeFixture(String name) {
    return '$name — bye';
  }

  @override
  String get competeByeThisRound => 'Bye this round';

  @override
  String get competeCurrentRound => 'Current Round';

  @override
  String competeDeadline(String date) {
    return 'Deadline: $date';
  }

  @override
  String get competeEnter => 'Enter';

  @override
  String get competeEvents => 'Events';

  @override
  String get competeFinal => 'Final';

  @override
  String get competeFull => 'Full';

  @override
  String get competeJoinTournament => 'Join tournament';

  @override
  String get competeJoinWaitlist => 'Join Waitlist';

  @override
  String get competeJoinWaitlistBody =>
      'You\'ll be added to the waitlist and enrolled automatically if a spot opens up.';

  @override
  String get competeJoinWaitlistQ => 'Join the waitlist?';

  @override
  String get competeLadder => 'Ladder';

  @override
  String get competeLadderUnavailable => 'Ladder not available.';

  @override
  String get competeLadders => 'Ladders';

  @override
  String get competeLeague => 'League';

  @override
  String get competeLeagueUnavailable => 'League not available.';

  @override
  String get competeLeagues => 'Leagues';

  @override
  String get competeLeaveWaitlist => 'Leave waitlist';

  @override
  String get competeLoadLaddersFailed => 'Couldn\'t load ladders.';

  @override
  String get competeLoadLeaguesFailed =>
      'Couldn\'t load leagues. Please try again.';

  @override
  String get competeLoadMyLeaguesFailed => 'Couldn\'t load your leagues.';

  @override
  String get competeLoadPlayersFailed => 'Couldn\'t load players.';

  @override
  String get competeLoadStandingsFailed => 'Couldn\'t load standings.';

  @override
  String get competeLoadTournamentsFailed => 'Couldn\'t load tournaments.';

  @override
  String get competeMyLeagues => 'My Leagues';

  @override
  String get competeNoLadders => 'No ladders yet. Ask your club to start one.';

  @override
  String get competeNoLeagues =>
      'No leagues near you yet — try widening your search';

  @override
  String get competeNoMyLeagues => 'You haven\'t joined a league yet';

  @override
  String get competeNoRegistrations => 'No one has registered yet.';

  @override
  String get competeNoRules =>
      'No rules have been published for this league yet.';

  @override
  String get competeNoTournaments =>
      'No tournaments yet. Ask your club to run one.';

  @override
  String get competeOnWaitlist => 'On the waitlist';

  @override
  String get competeRegister => 'Register';

  @override
  String get competeRegisterBody =>
      'You\'ll be paired with other registered players once the league starts.';

  @override
  String get competeRegisterQ => 'Register for this league?';

  @override
  String get competeRegisteredPlayers => 'Registered Players';

  @override
  String get competeRegistrationClosed =>
      'Registration is closed for this league.';

  @override
  String get competeRegistrationOpensSoon => 'Registration opens soon.';

  @override
  String get competeRound => 'Round';

  @override
  String competeRoundNumber(int number) {
    return 'Round $number';
  }

  @override
  String get competeRoundUnavailable => 'Round not available.';

  @override
  String get competeRules => 'Rules';

  @override
  String get competeRulesUnavailable => 'Rules not available.';

  @override
  String get competeScoringFormat => 'Scoring format';

  @override
  String get competeSemiFinals => 'Semi-finals';

  @override
  String competeSpotsLeft(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count spots left',
      one: '1 spot left',
    );
    return '$_temp0';
  }

  @override
  String get competeStandings => 'Standings';

  @override
  String get competeStandingsEmpty =>
      'Standings appear once the first round is played.';

  @override
  String get competeTournament => 'Tournament';

  @override
  String get competeTournamentUnavailable => 'Tournament not available.';

  @override
  String get competeTournaments => 'Tournaments';

  @override
  String get competeUnfinishedMatches => 'Unfinished matches';

  @override
  String competeVsFixture(String a, String b) {
    return '$a vs $b';
  }

  @override
  String get competeWaitlist => 'Waitlist';

  @override
  String get competeWaitlistBody =>
      'We\'ll move you in automatically if a spot opens up.';

  @override
  String get competeWalkovers => 'Walkovers';

  @override
  String get competeWithdraw => 'Withdraw';

  @override
  String get competeWithdrawBody =>
      'You can register again later, as long as registration is still open.';

  @override
  String get competeWithdrawQ => 'Withdraw from this league?';

  @override
  String get competeYoureRegistered => 'You\'re registered';

  @override
  String get connectionsCancelRequest => 'Cancel request';

  @override
  String get connectionsEmpty =>
      'Connect with players to build your Tennis network';

  @override
  String get connectionsIncoming => 'Incoming';

  @override
  String get connectionsLoadRequestsFailed => 'Couldn\'t load your requests.';

  @override
  String get connectionsNoPending => 'No pending requests';

  @override
  String get connectionsPending => 'Pending requests';

  @override
  String get connectionsRequests => 'Requests';

  @override
  String get connectionsSent => 'Sent';

  @override
  String get connectionsTitle => 'Connections';

  @override
  String get courtAccess => 'Access';

  @override
  String get courtAddress => 'Address';

  @override
  String get courtAmenities => 'Amenities';

  @override
  String get courtBookOnline => 'Book Online';

  @override
  String get courtBookingOptions => 'Booking Options';

  @override
  String get courtBookingOptionsLower => 'Booking options';

  @override
  String get courtDetails => 'Details';

  @override
  String get courtGetDirections => 'Get Directions';

  @override
  String get courtHours => 'Hours';

  @override
  String get courtIndoor => 'Indoor';

  @override
  String get courtIndoorSuffix => ' (indoor)';

  @override
  String get courtList => 'List';

  @override
  String get courtLitSuffix => ' · lit';

  @override
  String get courtLoadFailed => 'Couldn\'t load courts. Pull to retry.';

  @override
  String get courtLocationUnknown => 'Location unknown';

  @override
  String get courtMap => 'Map';

  @override
  String get courtMapUnavailable =>
      'Map tiles unavailable — switch to List to browse results.';

  @override
  String get courtNativeBookingUnavailable =>
      'Native booking isn\'t available for this court yet.';

  @override
  String get courtNoBookingInfo =>
      'No booking info available — try contacting directly';

  @override
  String get courtNoPhotos => 'No photos yet';

  @override
  String get courtNoneFound => 'No courts found';

  @override
  String get courtNoneInArea => 'No courts found in this area';

  @override
  String get courtOutdoor => 'Outdoor';

  @override
  String get courtPhone => 'Phone';

  @override
  String get courtPhotos => 'Photos';

  @override
  String get courtPrivate => 'Private';

  @override
  String get courtPublic => 'Public';

  @override
  String get courtAddFavorite => 'Add to favorites';

  @override
  String get courtBookACourt => 'Book a court';

  @override
  String get courtBookingEyebrow => 'Booking';

  @override
  String get courtClosedNow => 'Closed now';

  @override
  String courtCourtCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count courts',
      one: '1 court',
    );
    return '$_temp0';
  }

  @override
  String courtCourtsOfSurface(int count, String surface) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count $surface courts',
      one: '1 $surface court',
    );
    return '$_temp0';
  }

  @override
  String get courtFavoriteFailed => 'Couldn’t update favorites. Try again.';

  @override
  String get courtFindTheCourt => 'Find the court';

  @override
  String get courtGoodToKnow => 'Good to know';

  @override
  String get courtInfoVerifiedFooter => 'Venue information verified by Drift';

  @override
  String get courtLocationEyebrow => 'Location';

  @override
  String get courtOpenNow => 'Open now';

  @override
  String courtPhotoCount(int index, int total) {
    return '$index / $total';
  }

  @override
  String get courtRemoveFavorite => 'Remove from favorites';

  @override
  String get courtReportIssue => 'Report or update court info';

  @override
  String get courtShare => 'Share court';

  @override
  String courtShareText(String name, String address) {
    return '$name — $address';
  }

  @override
  String get courtSurface => 'Surface';

  @override
  String get courtVerifiedVenue => 'Verified venue';

  @override
  String get courtUnavailable => 'Court not available.';

  @override
  String get courtUnverified => 'Unverified';

  @override
  String get courtVerificationPending => 'Verification pending';

  @override
  String get courtViewPhotos => 'View Photos';

  @override
  String get courtVisitWebsite => 'Visit Website';

  @override
  String get courtWebsite => 'Website';

  @override
  String get courtWhatsApp => 'Message on WhatsApp';

  @override
  String get deleteBody =>
      'You\'ll be signed out on every device immediately and other players will no longer be able to find or contact you.\n\nYour personal information is then permanently erased after 30 days. Until then, contact support if you change your mind — after that it cannot be undone.\n\nMatches you played stay on record for the other players involved, but they will no longer be linked to you.';

  @override
  String get deleteButton => 'Delete my account';

  @override
  String get deleteConfirm => 'I understand, delete my account';

  @override
  String get deleteDeleting => 'Deleting…';

  @override
  String get deleteTitle => 'This will delete your account';

  @override
  String get discoverClubs => 'Clubs';

  @override
  String get discoverCoaches => 'Coaches';

  @override
  String get discoverCourts => 'Courts';

  @override
  String get discoverFindPlayers => 'Find players';

  @override
  String get drawerSigningOut => 'Signing out…';

  @override
  String get drawerViewProfile => 'View your profile';

  @override
  String get eventsComingSoon => 'Events coming soon';

  @override
  String get eventsComingSoonBody =>
      'Club socials, clinics and mixers will appear here once your club starts running them.';

  @override
  String get exp1to2y => '1–2 years';

  @override
  String get exp1to2ySub => 'Building a solid foundation';

  @override
  String get exp2to5y => '2–5 years';

  @override
  String get exp2to5ySub => 'Developing real game sense';

  @override
  String get exp5plus => '5+ years';

  @override
  String get exp5plusSub => 'Experienced and consistent';

  @override
  String get exp6to12m => '6–12 months';

  @override
  String get exp6to12mSub => 'Getting comfortable on court';

  @override
  String get expAdvanced => 'Competitive / Advanced';

  @override
  String get expAdvancedSub => 'Tournament-level play';

  @override
  String get expNew => 'I\'m completely new';

  @override
  String get expNewSub => 'Never held a racket';

  @override
  String get expUnder6m => 'Less than 6 months';

  @override
  String get expUnder6mSub => 'Still learning the basics';

  @override
  String get filterAny => 'Any';

  @override
  String get filterApply => 'Apply filters';

  @override
  String filterApplyCount(int count) {
    return 'Apply filters ($count)';
  }

  @override
  String get filterDistance => 'Distance';

  @override
  String get filterFeatures => 'Features';

  @override
  String get filterFloodlit => 'Floodlit';

  @override
  String get filterHasBooking => 'Has booking info';

  @override
  String get filterIndoorOutdoor => 'Indoor / Outdoor';

  @override
  String get filterLevel => 'Level';

  @override
  String get filterSurface => 'Surface';

  @override
  String get filterTitle => 'Filters';

  @override
  String get formLoss => 'L';

  @override
  String get formNoMatches => 'No matches played yet';

  @override
  String get formWin => 'W';

  @override
  String get goalAchieved => 'Achieved';

  @override
  String get goalBaseline => 'Baseline';

  @override
  String get goalBehind => 'Behind';

  @override
  String get goalCoaching => 'Find a coach';

  @override
  String get goalCompete => 'Compete in leagues/tournaments';

  @override
  String get goalDeadline => 'Deadline';

  @override
  String get goalDeleteQ => 'Delete this goal?';

  @override
  String get goalEmpty => 'Set your first development goal';

  @override
  String get goalGetFit => 'Get fitter';

  @override
  String get goalHaveFun => 'Just have fun';

  @override
  String get goalImproveSkills => 'Improve my skills';

  @override
  String get goalLoadFailed => 'Couldn\'t load goals.';

  @override
  String get goalMeetPeople => 'Meet new players';

  @override
  String get goalMilestones => 'Milestones';

  @override
  String get goalOnTrack => 'On track';

  @override
  String get goalPlayMore => 'Play more often';

  @override
  String get goalTarget => 'Target';

  @override
  String goalTargetOutOf6(String value) {
    return 'Target $value/6';
  }

  @override
  String get goalTitle => 'Goal';

  @override
  String get goalTrackProgress => 'Track my progress';

  @override
  String get goalCreateAddCustomMilestone => 'Add custom milestone';

  @override
  String get goalCreateAddDeadline => 'Add deadline';

  @override
  String get goalCreateChange => 'Change';

  @override
  String get goalCreateChooseDate => 'Choose a date';

  @override
  String get goalCreateCurrentRating => 'Current rating';

  @override
  String get goalCreateCustomDate => 'Custom Date';

  @override
  String get goalCreateEdit => 'Edit';

  @override
  String get goalCreateErrorCustomDate =>
      'Choose a custom deadline or select “No deadline”.';

  @override
  String get goalCreateErrorTargetHigher =>
      'Choose a target that is higher than your current rating.';

  @override
  String get goalCreateFocusHeading => 'What would you like to improve?';

  @override
  String get goalCreateFocusSub => 'Choose a focus or keep it general.';

  @override
  String goalCreateFocusValue(String focus) {
    return 'Focus: $focus';
  }

  @override
  String goalCreateImprovement(String value) {
    return '+$value improvement';
  }

  @override
  String get goalCreateMilestoneHint => 'e.g. Practice cross-court placement';

  @override
  String goalCreateMilestonesAdded(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count milestones added',
      one: '1 milestone added',
      zero: 'No milestones added',
    );
    return '$_temp0';
  }

  @override
  String get goalCreateMilestonesHeading => 'Break it into milestones';

  @override
  String get goalCreateMilestonesSub =>
      'Optional · Small achievements help you stay on track.';

  @override
  String get goalCreateNoDeadline => 'No deadline';

  @override
  String get goalCreateNone => 'None';

  @override
  String get goalCreateOptionalLater => 'Optional · You can change this later.';

  @override
  String get goalCreateRatingInfoBody =>
      'Drift ratings use a 0–6 scale. Your current rating starts from your latest assessment and practice. Adjust it if it doesn’t feel right.';

  @override
  String get goalCreateRatingInfoTitle => 'About Drift ratings';

  @override
  String get goalCreateRemoveMilestone => 'Remove milestone';

  @override
  String get goalCreateSelectedSkill => 'Selected skill';

  @override
  String get goalCreateSetTarget => 'Set your target';

  @override
  String get goalCreateSkillHeading => 'Choose a skill';

  @override
  String get goalCreateSkillSub => 'Select one skill to develop.';

  @override
  String get goalCreateStep1Subtitle =>
      'What part of your tennis game would you like to improve?';

  @override
  String get goalCreateStep1Title => 'Create a Goal';

  @override
  String get goalCreateStep2Subtitle =>
      'Choose the result you want to work toward.';

  @override
  String get goalCreateStep2Title => 'Choose Your Focus';

  @override
  String get goalCreateStep3Subtitle =>
      'Set a meaningful target and make a plan to reach it.';

  @override
  String get goalCreateStep3Title => 'Build Your Goal';

  @override
  String goalCreateStepOf(int step, int total) {
    return 'Step $step of $total';
  }

  @override
  String get goalCreateSubmit => 'Create Goal';

  @override
  String get goalCreateSummaryFocus => 'Focus';

  @override
  String get goalCreateSummaryHeading => 'Goal summary';

  @override
  String get goalCreateSummaryRating => 'Rating';

  @override
  String get goalCreateSummarySub => 'Review your plan before creating it.';

  @override
  String get goalCreateTargetDate => 'Target date';

  @override
  String get goalCreateTargetDisclaimer =>
      'Your target is the skill rating you’re working toward—not an automatic performance measurement.';

  @override
  String get goalCreateTargetHeading => 'Set your improvement target';

  @override
  String get goalCreateTargetMustBeHigher => 'Target must be higher';

  @override
  String get goalCreateTargetRating => 'Target rating';

  @override
  String get goalCreateTargetSub => 'Move the sliders in 0.5 increments.';

  @override
  String get goalCreateTimeline => 'Timeline';

  @override
  String get goalCreateTimelineHeading => 'When do you want to achieve this?';

  @override
  String goalCreateWeeks(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count Weeks',
      one: '1 Week',
    );
    return '$_temp0';
  }

  @override
  String get goalCreateYourGoal => 'Your goal';

  @override
  String get goalCreatedAnother => 'Create another goal';

  @override
  String goalCreatedBody(String skill) {
    return 'Your $skill goal is set. Every focused session moves you closer.';
  }

  @override
  String get goalCreatedEyebrow => 'Goal created';

  @override
  String get goalCreatedOpen => 'Open';

  @override
  String get goalCreatedStart => 'Start';

  @override
  String get goalCreatedTitle => 'You’re ready to improve.';

  @override
  String get goalCreatedView => 'View goal';

  @override
  String get goalFocusAccuracy => 'Accuracy';

  @override
  String get goalFocusAgility => 'Agility';

  @override
  String get goalFocusApproach => 'Approach';

  @override
  String get goalFocusBalance => 'Balance';

  @override
  String get goalFocusClosing => 'Closing';

  @override
  String get goalFocusComposure => 'Composure';

  @override
  String get goalFocusConsistency => 'Consistency';

  @override
  String get goalFocusDepth => 'Depth';

  @override
  String get goalFocusDescBackhandAccuracy => 'Direct the ball with control';

  @override
  String get goalFocusDescBackhandConsistency => 'Build a dependable backhand';

  @override
  String get goalFocusDescBackhandPower => 'Add pace and depth';

  @override
  String get goalFocusDescBackhandTechnique => 'Improve stroke mechanics';

  @override
  String get goalFocusDescFootworkAgility => 'Change direction efficiently';

  @override
  String get goalFocusDescFootworkBalance => 'Stay controlled on the move';

  @override
  String get goalFocusDescFootworkPreparation => 'Set up earlier for each shot';

  @override
  String get goalFocusDescFootworkRecovery => 'Reset after every stroke';

  @override
  String get goalFocusDescForehandAccuracy => 'Improve shot placement';

  @override
  String get goalFocusDescForehandConsistency => 'Keep more shots in play';

  @override
  String get goalFocusDescForehandPower => 'Develop stronger strokes';

  @override
  String get goalFocusDescForehandTechnique => 'Refine swing mechanics';

  @override
  String get goalFocusDescGeneral => 'Work on the skill overall';

  @override
  String get goalFocusDescMatchPlayClosing => 'Finish sets with confidence';

  @override
  String get goalFocusDescMatchPlayComposure => 'Stay present under pressure';

  @override
  String get goalFocusDescMatchPlayConsistency => 'Reduce unforced errors';

  @override
  String get goalFocusDescMatchPlayStrategy => 'Build smarter point patterns';

  @override
  String get goalFocusDescMovementBalance => 'Stay stable through every shot';

  @override
  String get goalFocusDescMovementEndurance => 'Move well for longer';

  @override
  String get goalFocusDescMovementRecovery => 'Return to position faster';

  @override
  String get goalFocusDescMovementSpeed => 'Reach the ball sooner';

  @override
  String get goalFocusDescNetPlayApproach => 'Transition forward effectively';

  @override
  String get goalFocusDescNetPlayPositioning => 'Own the right court space';

  @override
  String get goalFocusDescNetPlayTouch => 'Improve feel and control';

  @override
  String get goalFocusDescNetPlayVolleys => 'Build confident volleys';

  @override
  String get goalFocusDescReturnConsistency => 'Put more returns in play';

  @override
  String get goalFocusDescReturnDepth => 'Keep returns deep';

  @override
  String get goalFocusDescReturnPositioning =>
      'Find a stronger return position';

  @override
  String get goalFocusDescReturnReaction => 'Read and react earlier';

  @override
  String get goalFocusDescServeConsistency => 'Raise your first-serve rate';

  @override
  String get goalFocusDescServePlacement => 'Hit your service targets';

  @override
  String get goalFocusDescServePower => 'Generate more racquet speed';

  @override
  String get goalFocusDescServeTechnique => 'Improve motion and rhythm';

  @override
  String get goalFocusEndurance => 'Endurance';

  @override
  String get goalFocusGeneral => 'General improvement';

  @override
  String get goalFocusPlacement => 'Placement';

  @override
  String get goalFocusPositioning => 'Positioning';

  @override
  String get goalFocusPower => 'Power';

  @override
  String get goalFocusPreparation => 'Preparation';

  @override
  String get goalFocusReaction => 'Reaction';

  @override
  String get goalFocusRecovery => 'Recovery';

  @override
  String get goalFocusSpeed => 'Speed';

  @override
  String get goalFocusStrategy => 'Strategy';

  @override
  String get goalFocusTechnique => 'Technique';

  @override
  String get goalFocusTouch => 'Touch';

  @override
  String get goalFocusVolleys => 'Volleys';

  @override
  String get goalMilestoneDrillBackhand => 'Maintain a 10-shot backhand rally';

  @override
  String get goalMilestoneDrillFootwork =>
      'Finish a full shadow-swing footwork circuit';

  @override
  String get goalMilestoneDrillForehand => 'Maintain a 10-shot forehand rally';

  @override
  String get goalMilestoneDrillMatchPlay =>
      'Use the chosen focus in a full match';

  @override
  String get goalMilestoneDrillMovement =>
      'Finish a full-court movement drill with control';

  @override
  String get goalMilestoneDrillNetPlay =>
      'Finish a 10-volley exchange at the net';

  @override
  String get goalMilestoneDrillReturn => 'Return 8 of 10 practice serves';

  @override
  String get goalMilestoneDrillServe =>
      'Land 7 of 10 first serves in the target area';

  @override
  String goalMilestoneReachTarget(String skill) {
    return 'Reach your $skill rating target';
  }

  @override
  String get goalMilestoneSessionsBackhand =>
      'Complete three backhand-focused practice sessions';

  @override
  String get goalMilestoneSessionsFootwork =>
      'Complete three footwork-focused practice sessions';

  @override
  String get goalMilestoneSessionsForehand =>
      'Complete three forehand-focused practice sessions';

  @override
  String get goalMilestoneSessionsMatchPlay =>
      'Play three focused practice sets';

  @override
  String get goalMilestoneSessionsMovement =>
      'Complete three movement-focused practice sessions';

  @override
  String get goalMilestoneSessionsNetPlay =>
      'Complete three net-play practice sessions';

  @override
  String get goalMilestoneSessionsReturn =>
      'Complete three return-focused practice sessions';

  @override
  String get goalMilestoneSessionsServe =>
      'Complete three serve-focused practice sessions';

  @override
  String get goalUnavailable => 'Goal not available.';

  @override
  String get handLeftHanded => 'Left-handed';

  @override
  String get handRightHanded => 'Right-handed';

  @override
  String get helpBody =>
      'Read the current FAQs for Drift Tennis. This opens the same answers published on our website.';

  @override
  String get helpOpenFailed => 'Unable to open FAQs right now.';

  @override
  String get helpOpenFaqs => 'Open FAQs';

  @override
  String get helpTitle => 'Questions, answered.';

  @override
  String get homeBook => 'Book';

  @override
  String get homeBrowse => 'Browse';

  @override
  String get homeCourtsNearYou => 'Courts near you';

  @override
  String get homeFindAMatch => 'Find a match';

  @override
  String get homeFindMore => 'Find more';

  @override
  String homeGreeting(String name) {
    return 'Hi, $name';
  }

  @override
  String get homeLoadFailed =>
      'Couldn\'t load your Home feed. Please try again.';

  @override
  String get homeMapView => 'Map view';

  @override
  String get homeNeedsYou => 'Needs you';

  @override
  String get homeNextMatch => 'Next match';

  @override
  String get homeNextPrefix => 'Next: ';

  @override
  String get homeNoCourts => 'No courts nearby yet.';

  @override
  String get homeNoMatches => 'No matches scheduled yet.';

  @override
  String get homeNoPlayers => 'No players nearby yet.';

  @override
  String get homePlayersNearYou => 'Players near you';

  @override
  String get homeProgressEmpty =>
      'Play matches and log practice to start earning achievements.';

  @override
  String homeProgressTo(String level) {
    return 'Progress to $level';
  }

  @override
  String get homeQuickActions => 'Quick actions';

  @override
  String get homeRating => 'Rating';

  @override
  String get homeReview => 'Review';

  @override
  String get homeStatDoubles => 'DOUBLES';

  @override
  String get homeStatLevel => 'LEVEL';

  @override
  String get homeStatSingles => 'SINGLES';

  @override
  String get homeTennisNews => 'Tennis news';

  @override
  String get homeWelcomeBack => 'Welcome back';

  @override
  String get homeYourProgress => 'Your progress';

  @override
  String get introGetStarted => 'Get Started';

  @override
  String get introSlide1Body =>
      'Stay connected to every match, result, and tournament update as your tennis community keeps moving.';

  @override
  String get introSlide1Title => 'The Game\nNever Stops';

  @override
  String get introSlide2Body =>
      'Track your progress, sharpen your skills, and build better habits with insights made for your tennis journey.';

  @override
  String get introSlide2Title => 'Advance\nYour Game';

  @override
  String get introSlide3Body =>
      'Discover players, clubs, and competitions near you, then step onto the court with confidence.';

  @override
  String get introSlide3Title => 'Start Your\nTennis Journey';

  @override
  String get leagueJoined => 'Joined';

  @override
  String leagueMemberCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count members',
      one: '1 member',
    );
    return '$_temp0';
  }

  @override
  String leagueMembersOfCapacity(int count, int capacity) {
    return '$count/$capacity members';
  }

  @override
  String get leagueWaitlisted => 'Waitlisted';

  @override
  String get learnBrowseBySkill => 'Browse by skill';

  @override
  String get learnContentLoadFailed => 'Couldn\'t load content.';

  @override
  String get learnContentUnavailable => 'Content not available.';

  @override
  String get learnFeaturedLessons => 'Featured lessons';

  @override
  String get learnGoals => 'Goals';

  @override
  String get learnGoalsSub => 'Set and monitor targets';

  @override
  String get learnLessonsFailed =>
      'Couldn\'t load lessons. Pull down to try again.';

  @override
  String get learnLessonsComingSoon => 'Lessons coming soon';

  @override
  String get learnLessonsComingSoonBody =>
      'We\'re preparing coaching lessons and drills. Check back soon.';

  @override
  String get learnLogDrill => 'Log this drill in Practice';

  @override
  String get learnMarkComplete => 'Mark Complete';

  @override
  String get learnMarkedComplete => 'Marked complete.';

  @override
  String get learnMarking => 'Marking…';

  @override
  String get learnNoContentFilter => 'No content yet for this filter';

  @override
  String get learnNoData => 'No data yet';

  @override
  String get learnPlanUnavailable => 'Plan not available.';

  @override
  String get learnPracticeLog => 'Practice Log';

  @override
  String get learnPracticeLogSub => 'Review past sessions';

  @override
  String get learnProgressReport => 'Progress Report';

  @override
  String get learnProgressReportSub => 'See how far you\'ve come';

  @override
  String get learnSkillProfile => 'Skill Profile';

  @override
  String get learnSkillProfileSub => 'Track your strengths';

  @override
  String get learnSteps => 'Steps';

  @override
  String get learnTrainingPlan => 'Training Plan';

  @override
  String get learnWatchVideo => 'Watch video';

  @override
  String get legalBody =>
      'The current legal documents for the Drift Tennis app and website are published here. They always open the latest approved version.';

  @override
  String get legalDataPrivacy => 'Data Privacy Notice';

  @override
  String get legalHeading => 'Terms and privacy';

  @override
  String get legalOpenFailed => 'Unable to open the legal document right now.';

  @override
  String get legalPrivacy => 'Privacy Policy';

  @override
  String get legalTerms => 'Terms and Conditions';

  @override
  String get legalTitle => 'Legal';

  @override
  String get levelAdvanced => 'Advanced';

  @override
  String get levelAll => 'All levels';

  @override
  String get levelBeginner => 'Beginner';

  @override
  String get levelFoundational => 'Foundational';

  @override
  String get levelIntermediate => 'Intermediate';

  @override
  String get locationDenied => 'Location permission was denied.';

  @override
  String get locationServicesOff => 'Location services are turned off.';

  @override
  String get matchAcceptTheirVersion => 'Accept their version';

  @override
  String get matchAddNote => 'Add a note (optional)';

  @override
  String get matchAddSet => 'Add a set';

  @override
  String get matchCancelMatch => 'Cancel match';

  @override
  String get matchChallenge => 'Challenge';

  @override
  String get matchChoosePartner => 'Choose your doubles partner.';

  @override
  String get matchChooseYourPartner => 'Choose your partner';

  @override
  String get matchConfidence => 'Confidence';

  @override
  String get matchConnectFirst =>
      'Connect with a player first to partner with them.';

  @override
  String get matchCourt => 'Court';

  @override
  String get matchCourtName => 'Court name';

  @override
  String get matchDifferentResults =>
      'You and your opponent submitted different results.';

  @override
  String get matchDispute => 'Dispute';

  @override
  String get matchDisputeIntro =>
      'You and your opponent submitted different results. Accept their version if it\'s right, or revise yours.';

  @override
  String get matchEnterResult => 'Enter Result';

  @override
  String get matchHowDidItFeel => 'How did it feel?';

  @override
  String get matchLoadConnectionsFailed => 'Couldn\'t load your connections.';

  @override
  String get matchLoadFailed => 'Couldn\'t load this match.';

  @override
  String get matchLoadMatchesFailed => 'Couldn\'t load your matches.';

  @override
  String matchOpponentPicksPartner(String name) {
    return '$name picks their own partner when they accept.';
  }

  @override
  String get matchParticipantDeclined => 'Declined';

  @override
  String get matchParticipantIn => 'In';

  @override
  String get matchParticipantInvited => 'Invited';

  @override
  String get matchPickATime => 'Pick a time';

  @override
  String get matchPlayers => 'Players';

  @override
  String get matchProposeTimes => 'Propose Times';

  @override
  String get matchRematch => 'Rematch';

  @override
  String get matchReschedule => 'Reschedule';

  @override
  String get matchResult => 'Result';

  @override
  String get matchResultDisputed => 'Result disputed';

  @override
  String get matchRetirement => 'Retirement';

  @override
  String get matchReviseVersion => 'Revise your version';

  @override
  String matchRoundBanner(int round, String league) {
    return 'Round $round · $league';
  }

  @override
  String get matchRoundsUsed =>
      'You\'ve used all your proposal rounds — sort the rest out in chat.';

  @override
  String get matchScore => 'Score';

  @override
  String get matchSendChallenge => 'Send Challenge';

  @override
  String matchSetNumber(int number) {
    return 'Set $number';
  }

  @override
  String get matchSport => 'Sport';

  @override
  String get matchStateCancelled => 'Cancelled';

  @override
  String get matchStateCompleted => 'Played';

  @override
  String get matchStateDisputed => 'Disputed';

  @override
  String get matchStateExpired => 'Expired';

  @override
  String get matchStateProposed => 'Awaiting reply';

  @override
  String get matchStateRescheduled => 'Rescheduling';

  @override
  String get matchStateRetired => 'Retired';

  @override
  String get matchStateScheduled => 'Scheduled';

  @override
  String get matchStateScheduling => 'Agreeing a time';

  @override
  String get matchStateWalkover => 'Walkover';

  @override
  String get matchSuggest => 'Suggest';

  @override
  String get matchSuggestACourt => 'Suggest a court';

  @override
  String get matchSuggestCourt => 'Suggest court';

  @override
  String get matchSuggestDifferentTimes => 'Suggest different times';

  @override
  String get matchTapToConfirm => 'Tap a time to confirm the match.';

  @override
  String get matchTheirVersion => 'Their version';

  @override
  String get matchTiebreakShort => 'TB';

  @override
  String get matchTimeTbc => 'Time to be confirmed';

  @override
  String get matchTitle => 'Match';

  @override
  String get matchUndoChallenge => 'Undo challenge';

  @override
  String get matchUnplayedWalkover => 'Unplayed — walkover';

  @override
  String get matchUnplayedWalkoverBody =>
      'The round deadline passed before this fixture was played. It\'s recorded as a walkover in favour of neither player.';

  @override
  String get matchViewDispute => 'View dispute';

  @override
  String get matchWaitingChoose => 'Waiting for them to choose.';

  @override
  String get matchWaitingConfirm => 'Waiting for them to confirm.';

  @override
  String get matchWalkoverNeither =>
      'A walkover is recorded in favour of neither player.';

  @override
  String get matchWalkoverRetirement => 'Walkover / Retirement';

  @override
  String get matchWhatHappened => 'What happened?';

  @override
  String get matchWhoWon => 'Who won?';

  @override
  String get matchYouSuffix => ' (you)';

  @override
  String get matchYourOpponent => 'Your opponent';

  @override
  String get matchYourPartner => 'Your partner';

  @override
  String get matchYourProposedTimes => 'Your proposed times';

  @override
  String get matchYourVersion => 'Your version';

  @override
  String get messagingChat => 'Chat';

  @override
  String messagingConnectFirst(String name) {
    return 'Connect or challenge $name before messaging.';
  }

  @override
  String get messagingConversation => 'Conversation';

  @override
  String get messagingEmpty =>
      'No conversations yet — connect with a player to start one';

  @override
  String get messagingLoadConversationFailed =>
      'Couldn\'t load this conversation.';

  @override
  String get messagingLoadFailed => 'Couldn\'t load your messages.';

  @override
  String get messagingMinChars => 'Type at least two letters of a name.';

  @override
  String get messagingNewMessage => 'New message';

  @override
  String get messagingNoSearchResults => 'No conversations match your search';

  @override
  String get messagingSayHello => 'Say hello';

  @override
  String get messagingSearch => 'Search messages';

  @override
  String get messagingSearchPlayers => 'Search players by name';

  @override
  String get messagingSearchPlayersFailed =>
      'Couldn\'t search players right now.';

  @override
  String get messagingSystemMessage => 'System message';

  @override
  String get messagingUnread => 'Unread';

  @override
  String messagingViewNamed(String name) {
    return 'View $name';
  }

  @override
  String get messagingViewRelatedLeague => 'View related league';

  @override
  String get messagingViewRelatedMatch => 'View related match';

  @override
  String get navAchievements => 'Achievements';

  @override
  String get navCommunity => 'Community';

  @override
  String get navDiscover => 'Discover';

  @override
  String get navHome => 'Home';

  @override
  String get navLearn => 'Learn';

  @override
  String get navMessages => 'Messages';

  @override
  String get navMyProfile => 'My Profile';

  @override
  String get navMySportsHub => 'My Sports Hub';

  @override
  String get navNews => 'News';

  @override
  String get navNotifications => 'Notifications';

  @override
  String get navPlay => 'Play';

  @override
  String get navSettings => 'Settings';

  @override
  String get newsArtwork => 'Tennis news artwork';

  @override
  String get newsBrokenLink => 'That source link looks broken.';

  @override
  String get newsCurated => 'Curated for you';

  @override
  String newsDaysAgo(int days) {
    return '${days}d ago';
  }

  @override
  String get newsFreshOffCourt => 'FRESH OFF THE COURT';

  @override
  String get newsLatest => 'Latest';

  @override
  String get newsLatestStories => 'Latest stories';

  @override
  String get newsLoadFailed => 'Couldn\'t load news. Pull to retry.';

  @override
  String get newsLoadMore => 'Load more stories';

  @override
  String get newsLoadMoreFailed => 'Could not load more stories. Try again.';

  @override
  String get newsLoadSavedFailed => 'Couldn\'t load saved stories.';

  @override
  String get newsNoStories => 'No stories in this category yet';

  @override
  String newsOfflineSaved(String date) {
    return 'Offline news saved $date';
  }

  @override
  String get newsOpenInBrowser => 'Open in browser';

  @override
  String get newsOpenSource => 'Open Original Source';

  @override
  String get newsRead => 'Read';

  @override
  String get newsReadStory => 'Read story';

  @override
  String get newsRecently => 'Recently';

  @override
  String get newsRemoveFromSaved => 'Remove from saved';

  @override
  String get newsRemoveFromSavedTitle => 'Remove from Saved';

  @override
  String get newsSaveForLater => 'Save stories to read later';

  @override
  String get newsSaveStory => 'Save story';

  @override
  String get newsSavedStories => 'Saved stories';

  @override
  String get newsSavedStoriesTitle => 'Saved Stories';

  @override
  String get newsStories => 'Stories';

  @override
  String get newsStory => 'Story';

  @override
  String get newsStoryUnavailable => 'Story not available.';

  @override
  String get notifCaughtUp => 'You\'re all caught up.';

  @override
  String get notifClearAll => 'Clear all';

  @override
  String get notifClearAllBody =>
      'This removes every notification from this list. New notifications will still arrive.';

  @override
  String get notifClearAllQ => 'Clear all notifications?';

  @override
  String get notifDeleteBody =>
      'This notification will be removed from this list.';

  @override
  String get notifDeleteQ => 'Delete notification?';

  @override
  String get notifLoadFailed => 'Couldn\'t load notifications.';

  @override
  String get notifMarkAllRead => 'Mark all as read';

  @override
  String get notifNothingToOpen => 'Nothing further to open for this update.';

  @override
  String get notifPrefAnnouncements => 'News and updates from the Drift team';

  @override
  String get notifPrefClubs =>
      'Announcements and membership updates from your clubs';

  @override
  String get notifPrefCommunities =>
      'Approvals, join requests and new competitions in your communities';

  @override
  String get notifPrefCompetitions => 'New rounds and results in your leagues';

  @override
  String get notifPrefConnections =>
      'Requests to connect, and accepted connections';

  @override
  String get notifPrefLearning => 'Goals, plans, and practice reminders';

  @override
  String get notifPrefLearningTitle => 'Learning';

  @override
  String get notifPrefLoadFailed => 'Couldn\'t load your preferences.';

  @override
  String get notifPrefMatches => 'New challenges and match updates';

  @override
  String get notifPrefMatchesTitle => 'Matches';

  @override
  String get notifPrefMessages => 'New messages in your chats';

  @override
  String get notifPrefNews => 'Tennis news and stories';

  @override
  String get onbAdjustLevel => 'Adjust level';

  @override
  String get onbAdjustLevelTitle => 'Adjust Level';

  @override
  String get onbAllSet => 'You\'re all set!';

  @override
  String get onbAllSetBody =>
      'Your Tennis Profile is ready. Start exploring players, courts, and matches near you.';

  @override
  String get onbAvailabilityHighlight => 'play?';

  @override
  String get onbAvailabilitySubtitle =>
      'Tap the slots you are usually free. You can change these any time.';

  @override
  String get onbAvailabilityTitle => 'When can you play?';

  @override
  String get onbBasicHighlight => 'you';

  @override
  String get onbBasicSubtitle =>
      'Just the basics. You can change any of it later.';

  @override
  String get onbBasicTitle => 'Tell us about you';

  @override
  String get onbChooseEachSection =>
      'Choose an option in each section to continue.';

  @override
  String get onbChooseHand => 'Choose your playing hand to continue.';

  @override
  String get onbChooseOption => 'Please choose an option to continue.';

  @override
  String get onbClubHighlight => 'play?';

  @override
  String get onbClubName => 'Club name (optional)';

  @override
  String get onbClubSubtitle => 'No club yet? Skip this one.';

  @override
  String get onbClubTitle => 'Where do you play?';

  @override
  String get onbConfirmLevel => 'Confirm level';

  @override
  String get onbEnterLocation => 'Enter your general location to continue.';

  @override
  String get onbExperienceHighlight => 'experience?';

  @override
  String get onbExperienceSubtitle =>
      'We\'ll personalize your training to match your level.';

  @override
  String get onbExperienceTitle => 'What\'s your tennis experience?';

  @override
  String get onbFormat => 'Format';

  @override
  String get onbGeneralLocation => 'General location / city';

  @override
  String get onbGoHome => 'Go to Home';

  @override
  String get onbGoalsHighlight => 'Drift?';

  @override
  String get onbGoalsSubtitle =>
      'Pick as many as you like. This only shapes what we suggest.';

  @override
  String get onbGoalsTitle => 'What brings you to Drift?';

  @override
  String get onbHandAmbidextrous => 'Ambidextrous';

  @override
  String get onbHandLeft => 'Left';

  @override
  String get onbHandRight => 'Right';

  @override
  String get onbLoadDetailsFailed =>
      'Couldn\'t load your details. Please try again.';

  @override
  String get onbLocateFailed =>
      'Couldn\'t determine your location. Enter it manually below.';

  @override
  String get onbLocating => 'Locating…';

  @override
  String get onbLocationHighlight => 'based?';

  @override
  String get onbLocationSubtitle =>
      'We use this to find players and courts near you.';

  @override
  String get onbLocationTitle => 'Where are you based?';

  @override
  String get onbPadelHighlight => 'padel?';

  @override
  String get onbPadelLearn => 'I\'d like to learn';

  @override
  String get onbPadelLearnSub => 'Open to picking it up';

  @override
  String get onbPadelNo => 'No, just tennis';

  @override
  String get onbPadelNoSub => 'Sticking to the classics';

  @override
  String get onbPadelSubtitle =>
      'Padel is coming to Drift soon — let us know if you play or want to learn.';

  @override
  String get onbPadelTitle => 'Do you also play padel?';

  @override
  String get onbPadelYes => 'Yes, I play padel';

  @override
  String get onbPadelYesSub => 'Already on the court';

  @override
  String get onbPlayingHand => 'Playing hand';

  @override
  String get onbPreferredCourt => 'Preferred court (optional)';

  @override
  String get onbPreferredTimes => 'Preferred times';

  @override
  String get onbPrefsHighlight => 'play?';

  @override
  String get onbPrefsSubtitle => 'This shapes who we match you with.';

  @override
  String get onbPrefsTitle => 'How do you like to play?';

  @override
  String get onbSelectAll => 'select all that apply';

  @override
  String onbStepOf(int step, int total) {
    return 'STEP $step OF $total';
  }

  @override
  String get onbStyle => 'Style';

  @override
  String get onbSuggestedHighlight => 'level';

  @override
  String onbSuggestedLevel(String level) {
    return 'Suggested: $level';
  }

  @override
  String get onbSuggestedSubtitle =>
      'Based on your answers, this is where we think you fit. You can adjust it any time from your profile.';

  @override
  String get onbSuggestedTitle => 'Your suggested level';

  @override
  String get onbTimeBlockAm => 'AM';

  @override
  String get onbTimeBlockMid => 'Mid';

  @override
  String get onbTimeBlockPm => 'PM';

  @override
  String get onbUseCurrentLocation => 'Use current location';

  @override
  String get optCompetitive => 'Competitive';

  @override
  String get optDoubles => 'Doubles';

  @override
  String get optEither => 'Either';

  @override
  String get optSingles => 'Singles';

  @override
  String get optSocial => 'Social';

  @override
  String get padelAdd => 'Add Padel';

  @override
  String get padelAddBody =>
      'You\'ll complete a short adaptive assessment scoped to Padel — rally consistency, net play, wall shots, and more. It generates a Padel Profile that\'s fully separate from your Tennis Profile.';

  @override
  String get padelAddHeading => 'Add Padel to your profile';

  @override
  String get padelAdding => 'Adding…';

  @override
  String get padelAssessment => 'Padel Assessment';

  @override
  String get padelCompleteAssessment =>
      'Complete the assessment to get a rating';

  @override
  String get padelGoalsHint =>
      'Comma-separated, e.g. Improve my bandeja, Play weekly';

  @override
  String get padelHistoryEmpty =>
      'Play your first Padel match to start building history';

  @override
  String get padelHistoryFailed => 'Couldn\'t load your Padel match history.';

  @override
  String get padelMatchHistory => 'Padel Match History';

  @override
  String get padelNotAdded => 'Padel hasn\'t been added yet.';

  @override
  String get padelPartnerHint => 'e.g. Looking for a regular doubles partner';

  @override
  String get padelPartnerPreference => 'Partner preference';

  @override
  String padelPartnerPreferenceValue(String value) {
    return 'Partner preference: $value';
  }

  @override
  String get padelPillarBandeja => 'Bandeja';

  @override
  String get padelPillarNetControl => 'Net Control';

  @override
  String get padelPillarOverhead => 'Overhead';

  @override
  String get padelPillarPartnerCommunication => 'Partner Communication';

  @override
  String get padelPillarPositioning => 'Positioning';

  @override
  String get padelPillarRallyConsistency => 'Rally Consistency';

  @override
  String get padelPillarSmash => 'Smash';

  @override
  String get padelPillarTacticalAwareness => 'Tactical Awareness';

  @override
  String get padelPillarTransition => 'Transition';

  @override
  String get padelPillarVibora => 'Vibora';

  @override
  String get padelPillarWallUsage => 'Wall Usage';

  @override
  String get padelPreferences => 'Preferences';

  @override
  String get padelPreferredSide => 'Preferred side';

  @override
  String padelPreferredSideValue(String side) {
    return 'Preferred side: $side';
  }

  @override
  String get padelPrefsGoals => 'Preferences & Goals';

  @override
  String get padelProfile => 'Padel Profile';

  @override
  String get padelProfileFailed => 'Couldn\'t load your Padel profile.';

  @override
  String get padelSkillProfile => 'Skill profile';

  @override
  String get padelStartAssessment => 'Start Padel Assessment';

  @override
  String get padelYourStats => 'Your Padel stats';

  @override
  String get payActive => 'Active';

  @override
  String get payAddMethod => 'Add method';

  @override
  String get payAddPaymentMethod => 'Add payment method';

  @override
  String get payAmount => 'Amount';

  @override
  String get payBillingHistory => 'Billing history';

  @override
  String get payBillingHistoryFailed => 'Couldn\'t load your billing history.';

  @override
  String get payCard => 'Card';

  @override
  String get payCardBrand => 'Card brand';

  @override
  String get payCardBrandHint => 'e.g. Visa';

  @override
  String get payCardLast4 => 'Tokenized card — last four digits';

  @override
  String get payChangePlan => 'Change plan';

  @override
  String get payChargesReceipts => 'Charges and receipts';

  @override
  String get payChooseFree => 'Choose Free';

  @override
  String get payChoosePlan => 'Choose a plan';

  @override
  String get payCreated => 'Created';

  @override
  String get payCurrent => 'Current';

  @override
  String get payCurrentPlan => 'Current plan';

  @override
  String get payDate => 'Date';

  @override
  String get payDefault => 'Default';

  @override
  String get payDownloadReceipt => 'Download receipt';

  @override
  String get payFailed => 'Failed';

  @override
  String get payFailureReason => 'Failure reason';

  @override
  String get payFourDigits => 'Enter exactly four digits.';

  @override
  String get payFree => 'Free';

  @override
  String get payFreeBeta => 'Free during beta';

  @override
  String get payIncluded => 'Included';

  @override
  String get payInvoice => 'Invoice';

  @override
  String get payManageMethods => 'Manage payment methods';

  @override
  String get payMethodsFailed => 'Couldn\'t load your payment methods.';

  @override
  String get payMobileLast4 => 'Tokenized mobile number — last four digits';

  @override
  String get payMobileMoney => 'Mobile money';

  @override
  String get payNoBillingHistory => 'No billing history yet';

  @override
  String get payNoChargesBeta => 'No charges during beta.';

  @override
  String get payNoMethod => 'No payment method saved';

  @override
  String get payNoMethodBody =>
      'Add a tokenized card or mobile-money method to choose a paid plan.';

  @override
  String get payNotAvailable => 'Not available';

  @override
  String get payPaid => 'Paid';

  @override
  String get payPastDue => 'Past due';

  @override
  String get payPaymentMethod => 'Payment method';

  @override
  String get payPaymentMethods => 'Payment methods';

  @override
  String payPerMonth(String amount) {
    return '$amount / month';
  }

  @override
  String payPerYear(String amount) {
    return '$amount / year';
  }

  @override
  String get payPeriod => 'Period';

  @override
  String payPeriodEnds(String date) {
    return 'Current period ends $date';
  }

  @override
  String payPeriodRange(String start, String end) {
    return '$start to $end';
  }

  @override
  String get payPlan => 'Plan';

  @override
  String get payPlansFailed => 'Couldn\'t load available plans.';

  @override
  String get payProcessing => 'Processing…';

  @override
  String get payProviderReference => 'Provider reference';

  @override
  String get payReceipt => 'Receipt';

  @override
  String get payReceiptHeading => 'Drift Tennis receipt';

  @override
  String get payReceiptSaveFailed =>
      'Could not save the receipt. Please retry.';

  @override
  String payReceiptSaved(String path) {
    return 'Receipt saved to $path';
  }

  @override
  String get payReceiptsAppear =>
      'Receipts will appear here after your first paid plan change.';

  @override
  String get payRemove => 'Remove';

  @override
  String get payRemoveMethodQ => 'Remove payment method?';

  @override
  String payRemoveNamed(String name) {
    return 'Remove $name';
  }

  @override
  String get payRetryPayment => 'Retry payment';

  @override
  String get paySaveMethod => 'Save method';

  @override
  String get paySelectAndPay => 'Select and pay';

  @override
  String get payStatus => 'Status';

  @override
  String get paySubscriptionFailed => 'Couldn\'t load your subscription.';

  @override
  String get payTokenNote =>
      'Drift stores only the provider token and these display digits. Full payment credentials never reach Drift.';

  @override
  String get payUpgradePlan => 'Upgrade plan';

  @override
  String get payVoid => 'Void';

  @override
  String get pillarBackhand => 'Backhand';

  @override
  String get pillarCompetitionExperience => 'Competition Experience';

  @override
  String get pillarFitness => 'Fitness';

  @override
  String get pillarFootwork => 'Footwork';

  @override
  String get pillarForehand => 'Forehand';

  @override
  String get pillarMatchPlay => 'Match Play';

  @override
  String get pillarMental => 'Mental';

  @override
  String get pillarMovement => 'Movement';

  @override
  String get pillarNetPlay => 'Net Play';

  @override
  String get pillarReturn => 'Return';

  @override
  String get pillarServe => 'Serve';

  @override
  String get pillarTactics => 'Tactics';

  @override
  String get pillarVolley => 'Volley';

  @override
  String get playActiveEmpty =>
      'No upcoming matches — challenge someone to get started.';

  @override
  String get playChallengeWithdrawn => 'Challenge withdrawn.';

  @override
  String get playChallengesEmpty =>
      'No open challenges — find a player and send one.';

  @override
  String playCompetitionRound(String name, int round) {
    return '$name · Round $round';
  }

  @override
  String get playFindOpponent => 'Find opponent';

  @override
  String get playHistoryEmpty =>
      'Play your first match to start building history.';

  @override
  String get playLoadPlayersFailed => 'Couldn\'t load players. Pull to retry.';

  @override
  String get playNoPlayersFound => 'No players found.';

  @override
  String get playRespond => 'Respond';

  @override
  String get playSegmentMatches => 'Matches';

  @override
  String get playTabActive => 'Active';

  @override
  String get playTabChallenges => 'Challenges';

  @override
  String get playTabHistory => 'History';

  @override
  String get playYourStats => 'Your stats';

  @override
  String get playerAtAGlance => 'AT A GLANCE';

  @override
  String get playerCancelRequest => 'Cancel Request';

  @override
  String get playerChallengeToMatch => 'Challenge to a match';

  @override
  String get playerConnect => 'Connect';

  @override
  String get playerConnectToSeeAvailability =>
      'Connect to see when this player is usually free.';

  @override
  String get playerConnectToSeeSkills =>
      'Connect with this player to see their skill breakdown.';

  @override
  String get playerConnected => 'Connected';

  @override
  String get playerDevelopmentAreas => 'Development areas';

  @override
  String get playerLoadFailed => 'Could not load this player right now.';

  @override
  String get playerLocation => 'Location';

  @override
  String get playerMessage => 'Message';

  @override
  String get playerNoAssessment =>
      'This player hasn\'t completed an assessment yet.';

  @override
  String get playerNoMatchFilters =>
      'No players match these filters. Try widening distance or level range.';

  @override
  String get playerPlays => 'Plays';

  @override
  String get playerRequestSent => 'Request sent';

  @override
  String playerRequestSentBody(String name) {
    return '$name will see your connection request. You can cancel it while it is still pending.';
  }

  @override
  String get playerRequestSentCancel => 'Request sent · Cancel';

  @override
  String playerStatsOf(String name) {
    return '$name\'s Stats';
  }

  @override
  String get playerUnavailable => 'Player not available.';

  @override
  String get playerViewStats => 'View Stats';

  @override
  String get playerWantsToConnect => 'Wants to connect — respond in Requests';

  @override
  String get practiceDuration => 'Duration';

  @override
  String get practiceEmpty => 'Log your first practice session';

  @override
  String get practiceLoadFailed => 'Couldn\'t load your practice log.';

  @override
  String get practiceMinutesShort => 'min';

  @override
  String get practiceNotes => 'Notes';

  @override
  String get practiceNotesHint => 'What did you work on? Any breakthroughs?';

  @override
  String get practiceSave => 'Save Practice';

  @override
  String get practiceSkillFocus => 'Skill focus';

  @override
  String get privacyAvailabilityNote =>
      'Off means only your connections can see your detailed availability';

  @override
  String get privacyLoadFailed => 'Couldn\'t load your privacy settings.';

  @override
  String get privacyShowEveryone => 'Show to everyone';

  @override
  String get privacySkillsNote =>
      'Off means only your connections can see your skill breakdown';

  @override
  String get profileAddPadel => '+ Add Padel';

  @override
  String get profileAddPhoto => 'Add a photo';

  @override
  String get profileBio => 'Bio';

  @override
  String get profileBioHint => 'Tell other players a bit about yourself';

  @override
  String get profileEdit => 'Edit Profile';

  @override
  String get profileLevelNotAssessed => 'Level not yet assessed';

  @override
  String profileLevelWithLabel(String level, String label) {
    return 'Level $level · $label';
  }

  @override
  String get profileLoadFailed => 'Couldn\'t load your profile.';

  @override
  String get profileMySports => 'My Sports';

  @override
  String get profileRating => 'Rating';

  @override
  String get profileMatches => 'Matches';

  @override
  String get profileWins => 'Wins';

  @override
  String profilePlayingSince(String date) {
    return 'Playing on Drift since $date';
  }

  @override
  String get profileMyStats => 'My Stats';

  @override
  String get profilePadelLoadFailed => 'Couldn\'t load your Padel profile';

  @override
  String get profileRemovePhoto => 'Remove photo';

  @override
  String get profileYourActiveProfile => 'Your active profile';

  @override
  String get progressEmpty =>
      'Your progress report builds up as you play and practice';

  @override
  String get proposeAddTime => 'Add a time';

  @override
  String get proposeFutureTime => 'Pick a time in the future.';

  @override
  String get proposeNoTimes => 'No times added yet.';

  @override
  String proposeOfferUpTo(int max) {
    return 'Offer up to $max options — they pick one.';
  }

  @override
  String proposeSendTimes(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Send $count times',
      one: 'Send 1 time',
    );
    return '$_temp0';
  }

  @override
  String get proposeTitle => 'Propose times';

  @override
  String get pushFallbackBody => 'Open to see what changed.';

  @override
  String get pushFallbackTitle => 'New update from Drift Tennis';

  @override
  String get quickBookCourt => 'Book a court';

  @override
  String get quickBookCourtHint => 'Courts near you';

  @override
  String get quickEnterLadder => 'Enter a ladder';

  @override
  String get quickEnterLadderHint => 'Climb the rankings';

  @override
  String get quickFindMatch => 'Find a match';

  @override
  String get quickFindMatchHint => 'Players at your level';

  @override
  String get quickLogPractice => 'Log practice';

  @override
  String get quickLogPracticeHint => 'Keep your streak going';

  @override
  String get rateGood => 'Good';

  @override
  String get rateGreat => 'Great';

  @override
  String get rateOkay => 'Okay';

  @override
  String get ratePeak => 'Peak';

  @override
  String get rateRough => 'Rough';

  @override
  String get reasonCheating => 'Cheating';

  @override
  String get reasonFakeProfile => 'Fake profile';

  @override
  String get reasonHarassment => 'Harassment or abuse';

  @override
  String get reasonOther => 'Something else';

  @override
  String get reasonSpam => 'Spam';

  @override
  String get reportChooseReason => 'Choose a reason to continue.';

  @override
  String get reportCourtTitle => 'Report / update court info';

  @override
  String get reportDuplicate => 'Duplicate listing';

  @override
  String get reportInappropriate => 'Inappropriate content';

  @override
  String get reportIncorrectInfo => 'Incorrect info';

  @override
  String get reportOther => 'Other';

  @override
  String get reportPermanentlyClosed => 'Permanently closed';

  @override
  String get reportThanks => 'Thanks — we\'ll take a look.';

  @override
  String get safetyAnythingElse => 'Anything else? (optional)';

  @override
  String get safetyBlock => 'Block';

  @override
  String get safetyBlockBody =>
      'They won\'t be able to find you or contact you, and any existing connection between you will be removed.';

  @override
  String get safetyBlockPlayer => 'Block player';

  @override
  String get safetyBlockQ => 'Block this player?';

  @override
  String get safetyBlockSub => 'They can no longer find or contact you';

  @override
  String get safetyMessageReported => 'Thanks — this message was reported.';

  @override
  String get safetyPlayerBlocked => 'Player blocked.';

  @override
  String get safetyReportMessage => 'Report this message';

  @override
  String get safetyReportPlayer => 'Report player';

  @override
  String get safetyReportPrivacy =>
      'Reports go to our moderation team. They\'re never shared with the player you report.';

  @override
  String get safetyReportSubmitted => 'Report submitted. Thank you.';

  @override
  String get safetyReporting => 'Reporting…';

  @override
  String get safetySubmitReport => 'Submit report';

  @override
  String get safetyTellUs => 'Tell us what went wrong';

  @override
  String get safetyTitle => 'Safety';

  @override
  String get scoreErrBothGames => 'Enter both games for every set.';

  @override
  String scoreErrInvalid(int set, String score) {
    return 'Set $set ($score) isn\'t a valid tennis score.';
  }

  @override
  String scoreErrNeedTiebreak(int set) {
    return 'Set $set is a tiebreak (7-6) — enter the tiebreak points.';
  }

  @override
  String get scoreErrRetirementWinner => 'Choose who won after the retirement.';

  @override
  String scoreErrTie(int set, String score) {
    return 'Set $set can\'t end in a tie ($score).';
  }

  @override
  String scoreErrTiebreak(int set, String score) {
    return 'Set $set\'s tiebreak points ($score) aren\'t a valid finish.';
  }

  @override
  String get searchAll => 'All';

  @override
  String get searchCompetitions => 'Competitions';

  @override
  String get searchHint => 'Players, courts, clubs, competitions';

  @override
  String get searchLoadFailed => 'Search could not be loaded.';

  @override
  String get searchMinChars =>
      'Type at least two characters to search across Drift.';

  @override
  String searchNoResults(String query) {
    return 'No results for \'$query\'. Try a broader search or another filter.';
  }

  @override
  String get searchPlayersHint => 'Search players…';

  @override
  String get searchResult => 'Result';

  @override
  String get searchResultsFailed => 'Couldn\'t load search results.';

  @override
  String get seasonDraft => 'Not yet open';

  @override
  String get seasonNotStarted => 'Not yet started';

  @override
  String get seasonRegistrationOpen => 'Registration open';

  @override
  String seasonRoundOf(int current, int total) {
    return 'Round $current of $total';
  }

  @override
  String get seasonStartingSoon => 'Starting soon';

  @override
  String get securityChangePassword => 'Change password';

  @override
  String get securityCurrentPassword => 'Current password';

  @override
  String get securityPasswordUpdated => 'Password updated.';

  @override
  String get securityUpdatePassword => 'Update password';

  @override
  String get settingsAccount => 'Account';

  @override
  String get settingsAccountSecurity => 'Account & Security';

  @override
  String get settingsAnalyseClip => 'Analyse a clip';

  @override
  String get settingsAppearance => 'Appearance';

  @override
  String get settingsBlockedUsers => 'Blocked Users';

  @override
  String get settingsContactSupport => 'Contact Support';

  @override
  String get settingsDeleteAccount => 'Delete Account';

  @override
  String get settingsHelpFaq => 'Help & FAQ';

  @override
  String get settingsLabs => 'Labs';

  @override
  String get settingsLanguage => 'Language';

  @override
  String get settingsLegalDocuments => 'Legal documents';

  @override
  String get settingsLogOutRow => 'Log Out';

  @override
  String get settingsLogout => 'Log out';

  @override
  String get settingsLogoutConfirmBody => 'You can sign back in any time.';

  @override
  String get settingsLogoutConfirmTitle => 'Log out?';

  @override
  String get settingsManageConnectionRequests => 'Manage Connection Requests';

  @override
  String get settingsNotificationPreferences => 'Notification Preferences';

  @override
  String get settingsNotifications => 'Notifications';

  @override
  String get settingsPlanBilling => 'Plan & Billing';

  @override
  String get settingsPrivacySafety => 'Privacy & Safety';

  @override
  String get settingsPrivacySettings => 'Privacy Settings';

  @override
  String get settingsSubscriptionPlan => 'Subscription & Plan';

  @override
  String get settingsSupport => 'Support';

  @override
  String get settingsThemeDark => 'Dark';

  @override
  String get settingsThemeDevice => 'Device';

  @override
  String get settingsThemeLight => 'Light';

  @override
  String settingsThemeValue(String mode) {
    return 'Theme: $mode';
  }

  @override
  String get settingsTitle => 'Settings';

  @override
  String settingsVersion(String version) {
    return 'Drift Tennis v$version';
  }

  @override
  String get skillBuilding => 'Building';

  @override
  String get skillNotEnoughData =>
      'Not enough data yet — complete a few practice sessions or matches';

  @override
  String get skillOnboardingAssessment => 'Onboarding assessment';

  @override
  String get skillProfileUnavailable => 'Skill profile not available.';

  @override
  String get skillRecommended => 'Recommended';

  @override
  String get skillRecommendedForYou => 'Recommended for you';

  @override
  String get skillRetakeAssessment => 'Retake Assessment';

  @override
  String get skillSetGoal => 'Set a Goal';

  @override
  String get skillSignals => 'Contributing signals';

  @override
  String get splashConnectFailed =>
      'Could not connect. Your session is still saved.';

  @override
  String get sportPadel => 'Padel';

  @override
  String get sportTennis => 'Tennis';

  @override
  String get standingsLegend => 'W = win · L = loss · Pts = points (3 per win)';

  @override
  String get standingsPlayed => 'MP';

  @override
  String get standingsPoints => 'Pts';

  @override
  String get statLosses => 'Losses';

  @override
  String get statNoMatchesPlayed => 'No matches played';

  @override
  String get statNoRatedMatches => 'No rated matches yet';

  @override
  String get statPlayed => 'Played';

  @override
  String get statRecentForm => 'Recent form';

  @override
  String get statWinRate => 'Win rate';

  @override
  String get statWins => 'Wins';

  @override
  String statWinsLosses(int wins, int losses) {
    return '${wins}W · ${losses}L';
  }

  @override
  String get statWon => 'Won';

  @override
  String get supportBody =>
      'Send us an email and we\'ll get back to you as soon as we can. Use this address for account recovery, erasure requests, billing questions, reports, and technical issues.';

  @override
  String supportEmailButton(String email) {
    return 'Email $email';
  }

  @override
  String supportEmailUs(String email) {
    return 'Email us at $email';
  }

  @override
  String get supportNeedHelp => 'Need help?';

  @override
  String get surfaceArtificialGrass => 'Artificial Grass';

  @override
  String get surfaceCarpet => 'Carpet';

  @override
  String get surfaceClay => 'Clay';

  @override
  String get surfaceGrass => 'Grass';

  @override
  String get surfaceHard => 'Hard';

  @override
  String get sysChallengeAccepted => 'Challenge accepted';

  @override
  String get sysChallengeDeclined => 'Challenge declined';

  @override
  String get sysChallengeSent => 'Challenge sent';

  @override
  String get sysChallengeWithdrawn => 'Challenge withdrawn';

  @override
  String get sysCourtSuggested => 'Court suggested';

  @override
  String get sysDisputeResolved => 'Dispute resolved';

  @override
  String get sysFixtureScheduled => 'Fixture scheduled';

  @override
  String get sysFixtureWalkover => 'Fixture unplayed — walkover';

  @override
  String get sysMatchCancelled => 'Match cancelled';

  @override
  String get sysMatchConfirmed => 'Match confirmed';

  @override
  String get sysMatchRescheduled => 'Match rescheduled';

  @override
  String get sysResultConfirmed => 'Result confirmed';

  @override
  String get sysResultDisputed => 'Result disputed';

  @override
  String get sysResultSubmitted => 'Result submitted';

  @override
  String get sysTimeAccepted => 'Time accepted';

  @override
  String get sysTimeProposed => 'Time proposed';

  @override
  String get timeAfternoon => 'Afternoon';

  @override
  String get timeEvening => 'Evening';

  @override
  String get timeMorning => 'Morning';

  @override
  String get videoAnalyseThis => 'Analyse this clip';

  @override
  String get videoAnalysingYourClip => 'Analysing your clip…';

  @override
  String get videoAnalysisError =>
      'Something went wrong while analysing this clip.';

  @override
  String get videoAnalysisUnfinished => 'That analysis didn\'t finish';

  @override
  String get videoBuffering => 'Buffering video...';

  @override
  String get videoChecking => 'Checking your clip…';

  @override
  String get videoCheckingOffline => 'Clip checking is offline';

  @override
  String get videoCheckingOfflineBody =>
      'You can still upload, but we can\'t check the clip right now.';

  @override
  String get videoChooseLibrary => 'Choose from library';

  @override
  String get videoClipAnalysis => 'Clip analysis';

  @override
  String get videoClipPassed => 'This clip passed its checks';

  @override
  String get videoClipRejected => 'This clip can\'t be analysed';

  @override
  String get videoClipUsable => 'This clip looks usable';

  @override
  String get videoCoupleSeconds => 'This takes a couple of seconds.';

  @override
  String get videoCourtUnchecked =>
      'Note: we couldn’t check the court markings on this one, so we can’t promise the court itself will read correctly.';

  @override
  String get videoDidntWork => 'That didn\'t work';

  @override
  String get videoEarlyNote =>
      'Analysis is an early feature. Numbers here come from a single camera and are estimates, not radar readings.';

  @override
  String get videoLesson => 'Video lesson';

  @override
  String get videoLessonComplete => 'Lesson marked complete.';

  @override
  String get videoLessonNotFound => 'Video lesson not found.';

  @override
  String get videoLoadClipFailed => 'Couldn\'t load this clip';

  @override
  String videoMeasuredAll(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'We measured all $count rallies we found',
      one: 'We measured the 1 rally we found',
    );
    return '$_temp0';
  }

  @override
  String get videoMeasuredAllBody =>
      'The totals below cover the whole session.';

  @override
  String videoMeasuredSome(int analysed, int found) {
    return 'We measured $analysed of $found rallies';
  }

  @override
  String videoMeasuredSomeBody(int analysed) {
    return 'Analysing video is slow, so we work through as much of a session as we can. The totals below cover the $analysed rallies we measured — not the whole session. Every rally we found is listed further down.';
  }

  @override
  String get videoNoAsset => 'No video asset is attached to this lesson.';

  @override
  String get videoNoDistances =>
      'Distances and speeds aren’t available for this clip';

  @override
  String get videoNoDistancesBody =>
      'The court lines couldn’t be read clearly enough to measure distances, so speeds and court positions would not be real measurements. Shot counts below are still accurate.';

  @override
  String get videoNoSpeeds => 'No speeds could be measured from this clip.';

  @override
  String get videoOpponent => 'Opponent';

  @override
  String get videoOpponentAvgShot => 'Opponent average shot';

  @override
  String get videoPassedChecks =>
      'It passed every check we can run today. Analysis itself is still being built — we’ll let you know when it lands.';

  @override
  String get videoPause => 'Pause';

  @override
  String get videoPlay => 'Play';

  @override
  String get videoPlaybackCompleted =>
      'Playback completed. Mark the lesson complete when you are ready.';

  @override
  String get videoPlaybackError => 'Playback error. Please retry.';

  @override
  String get videoRalliesMeasured => 'Rallies measured';

  @override
  String get videoRallyByRally => 'Rally by rally';

  @override
  String get videoRallyFailed => 'This rally could not be analysed';

  @override
  String get videoReadyToAnalyse => 'It’s ready to analyse whenever you are.';

  @override
  String get videoRecord => 'Record a clip';

  @override
  String get videoServeAvg => 'Serve (average over flight)';

  @override
  String get videoSessionTotals => 'Session totals';

  @override
  String videoShotCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count shots',
      one: '1 shot',
    );
    return '$_temp0';
  }

  @override
  String videoShotCountNoCourt(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count shots',
      one: '1 shot',
    );
    return '$_temp0 · no court fit, so no speeds';
  }

  @override
  String get videoShotTypes => 'Shot types';

  @override
  String get videoShotTypesNote =>
      'Shot types are an early feature and are often wrong. Treat them as a rough guide.';

  @override
  String get videoShots => 'Shots';

  @override
  String get videoSkippedBudget =>
      'Not measured — we ran out of analysis time for this session';

  @override
  String get videoSomeUncalibrated =>
      'Some rallies could not be measured for speed';

  @override
  String videoSomeUncalibratedBody(int count) {
    return '$count of the rallies we measured did not have clear enough court lines, so they add to the shot counts but not to the speeds.';
  }

  @override
  String get videoSpeed => 'Speed';

  @override
  String get videoSpeedNote =>
      'Averaged over the ball’s flight, so lower than a radar reading at contact.';

  @override
  String get videoStarting => 'Starting…';

  @override
  String get videoStatusAccepted => 'Ready to analyse';

  @override
  String get videoStatusAnalysed => 'Analysed';

  @override
  String get videoStatusAnalysing => 'Analysing…';

  @override
  String get videoStatusFailed => 'Something went wrong';

  @override
  String get videoStatusRejected => 'Can\'t be analysed';

  @override
  String get videoTakesMinutes =>
      'Analysing takes a few minutes. We’ll notify you when it’s done — you don’t need to stay on this screen.';

  @override
  String get videoTakesMinutesLeave =>
      'This takes a few minutes. We’ll notify you when it’s ready, so you can leave this screen.';

  @override
  String get videoTip1 => 'Hold the phone sideways — landscape, not upright';

  @override
  String get videoTip2 =>
      'Prop it against the fence or use a tripod, and keep it still';

  @override
  String get videoTip3 => 'Get as much of the court in frame as you can';

  @override
  String get videoTip4 => 'Courts with clear, visible line markings work best';

  @override
  String get videoTip5 => 'One continuous take — no cuts or edits';

  @override
  String get videoTipsHeading => 'For the best chance of a usable clip';

  @override
  String get videoTooShort => 'Too short to measure';

  @override
  String get videoTryAnother => 'Try another clip';

  @override
  String get videoUnreachable =>
      'Couldn\'t reach Drift. Check your connection and try again.';

  @override
  String get videoUploadAnother => 'Upload another';

  @override
  String get videoUploadFailed =>
      'Something went wrong uploading that video. Please try again.';

  @override
  String get videoUploadTimeout =>
      'The upload timed out. Check your connection and try again — a shorter clip will upload faster.';

  @override
  String get videoUploading => 'Uploading…';

  @override
  String get videoWhatToChange => 'Here’s what to change before filming again.';

  @override
  String get videoWorthKnowing => 'Worth knowing';

  @override
  String get videoYourAvgShot => 'Your average shot';

  @override
  String get welcomeBody =>
      'Track matches, enter ladders & tournaments, and level up your game, all in one place.';

  @override
  String get welcomeContinueEmail => 'Continue with Email';

  @override
  String get welcomeTitle => 'Join the Court';

  @override
  String get withdrawBody =>
      'The invited player will be told that the challenge was withdrawn.';

  @override
  String get withdrawKeep => 'Keep challenge';

  @override
  String get withdrawTitle => 'Undo this challenge?';
}
