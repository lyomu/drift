import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/assessment/data/assessment_repository.dart';
import '../../features/assessment/presentation/assessment_question_screen.dart';
import '../../features/achievements/presentation/achievements_screen.dart';
import '../../features/auth/presentation/forgot_password_screen.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/reset_password_screen.dart';
import '../../features/auth/presentation/sign_up_screen.dart';
import '../../features/auth/presentation/verify_screen.dart';
import '../../features/onboarding/presentation/adjust_level_screen.dart';
import '../../features/onboarding/presentation/availability_screen.dart';
import '../../features/onboarding/presentation/basic_profile_screen.dart';
import '../../features/onboarding/presentation/club_courts_screen.dart';
import '../../features/onboarding/presentation/goals_screen.dart';
import '../../features/onboarding/presentation/intro_carousel_screen.dart';
import '../../features/onboarding/presentation/location_screen.dart';
import '../../features/onboarding/presentation/onboarding_complete_screen.dart';
import '../../features/onboarding/presentation/padel_interest_screen.dart';
import '../../features/onboarding/presentation/playing_preferences_screen.dart';
import '../../features/onboarding/presentation/splash_screen.dart';
import '../../features/onboarding/presentation/suggested_level_review_screen.dart';
import '../../features/onboarding/presentation/tennis_experience_screen.dart';
import '../../features/onboarding/presentation/welcome_screen.dart';
import '../../features/competitions/presentation/ladder_detail_screen.dart';
import '../../features/competitions/presentation/tournament_detail_screen.dart';
import '../../features/competitions/presentation/league_rules_screen.dart';
import '../../features/competitions/presentation/my_seasons_screen.dart';
import '../../features/competitions/presentation/registered_players_screen.dart';
import '../../features/competitions/presentation/round_detail_screen.dart';
import '../../features/competitions/presentation/season_detail_screen.dart';
import '../../features/competitions/presentation/standings_screen.dart';
import '../../features/clubs/presentation/club_announcements_screen.dart';
import '../../features/clubs/presentation/club_feed_screen.dart';
import '../../features/clubs/presentation/club_profile_screen.dart';
import '../../features/coaches/presentation/coach_list_screen.dart';
import '../../features/coaches/presentation/coach_profile_screen.dart';
import '../../features/connections/presentation/connections_list_screen.dart';
import '../../features/connections/presentation/pending_requests_screen.dart';
import '../../features/courts/presentation/court_photos_gallery_screen.dart';
import '../../features/courts/presentation/court_profile_screen.dart';
import '../../features/learning/presentation/add_practice_session_screen.dart';
import '../../features/learning/presentation/assessment_history_screen.dart';
import '../../features/learning/presentation/content_detail_screen.dart';
import '../../features/learning/presentation/create_goal_screen.dart';
import '../../features/learning/presentation/goal_detail_screen.dart';
import '../../features/learning/presentation/goal_list_screen.dart';
import '../../features/learning/presentation/learning_home_screen.dart';
import '../../features/learning/presentation/practice_log_list_screen.dart';
import '../../features/learning/presentation/progress_report_screen.dart';
import '../../features/learning/presentation/skill_category_browse_screen.dart';
import '../../features/learning/presentation/skill_detail_screen.dart';
import '../../features/learning/presentation/skill_profile_screen.dart';
import '../../features/learning/presentation/training_plan_detail_screen.dart';
import '../../features/learning/presentation/video_lesson_player_screen.dart';
import '../../features/players/presentation/player_profile_screen.dart';
import '../../features/players/data/players_repository.dart';
import '../../features/matches/data/matches_repository.dart';
import '../../features/matches/presentation/challenge_composer_screen.dart';
import '../../features/matches/presentation/dispute_detail_screen.dart';
import '../../features/matches/presentation/enter_score_screen.dart';
import '../../features/matches/presentation/match_detail_screen.dart';
import '../../features/matches/presentation/match_reflection_screen.dart';
import '../../features/matches/presentation/ratings_stats_screen.dart';
import '../../features/matches/data/player_stats.dart';
import '../../features/messaging/presentation/chat_thread_screen.dart';
import '../../features/messaging/presentation/inbox_screen.dart';
import '../../features/news/presentation/news_feed_screen.dart';
import '../../features/news/presentation/news_story_detail_screen.dart';
import '../../features/news/presentation/saved_stories_screen.dart';
import '../../features/notifications/presentation/notification_center_screen.dart';
import '../../features/notifications/presentation/notification_preferences_screen.dart';
import '../../features/padel/presentation/add_padel_screen.dart';
import '../../features/padel/presentation/padel_assessment_question_screen.dart';
import '../../features/padel/presentation/padel_match_history_screen.dart';
import '../../features/padel/presentation/padel_preferences_goals_screen.dart';
import '../../features/padel/presentation/padel_profile_screen.dart';
import '../../features/payments/presentation/billing_history_screen.dart';
import '../../features/payments/presentation/payment_methods_screen.dart';
import '../../features/payments/presentation/plan_selection_screen.dart';
import '../../features/payments/presentation/subscription_plan_screen.dart';
import '../../features/profile/presentation/edit_profile_screen.dart';
import '../../features/profile/presentation/my_sports_hub_screen.dart';
import '../../features/profile/presentation/own_profile_screen.dart';
import '../../features/search/data/global_search_repository.dart';
import '../../features/search/presentation/global_search_screen.dart';
import '../../features/settings/presentation/account_security_screen.dart';
import '../../features/settings/presentation/blocked_users_screen.dart';
import '../../features/settings/presentation/contact_support_screen.dart';
import '../../features/settings/presentation/delete_account_screen.dart';
import '../../features/settings/presentation/help_screen.dart';
import '../../features/settings/presentation/legal_screen.dart';
import '../../features/settings/presentation/privacy_settings_screen.dart';
import '../../features/settings/presentation/settings_home_screen.dart';
import '../shell/app_shell.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/splash',
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/intro',
        builder: (context, state) => const IntroCarouselScreen(),
      ),
      GoRoute(
        path: '/welcome',
        builder: (context, state) => const WelcomeScreen(),
      ),
      GoRoute(
        path: '/sign-up',
        builder: (context, state) => const SignUpScreen(),
      ),
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(
        path: '/verify',
        builder: (context, state) => VerifyScreen(email: state.extra as String),
      ),
      GoRoute(
        path: '/forgot-password',
        builder: (context, state) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: '/reset-password',
        builder: (context, state) =>
            ResetPasswordScreen(email: state.extra as String),
      ),
      GoRoute(
        path: '/onboarding/basic-profile',
        builder: (context, state) => const BasicProfileScreen(),
      ),
      GoRoute(
        path: '/onboarding/tennis-experience',
        builder: (context, state) => const TennisExperienceScreen(),
      ),
      GoRoute(
        path: '/onboarding/assessment',
        builder: (context, state) => const AssessmentQuestionScreen(),
      ),
      GoRoute(
        path: '/onboarding/level-review',
        builder: (context, state) =>
            SuggestedLevelReviewScreen(result: state.extra as AssessmentResult),
      ),
      GoRoute(
        path: '/onboarding/adjust-level',
        builder: (context, state) =>
            AdjustLevelScreen(suggestedLevel: state.extra as double),
      ),
      GoRoute(
        path: '/onboarding/goals',
        builder: (context, state) => const GoalsScreen(),
      ),
      GoRoute(
        path: '/onboarding/preferences',
        builder: (context, state) => const PlayingPreferencesScreen(),
      ),
      GoRoute(
        path: '/onboarding/location',
        builder: (context, state) => const LocationScreen(),
      ),
      GoRoute(
        path: '/onboarding/club-courts',
        builder: (context, state) => const ClubCourtsScreen(),
      ),
      GoRoute(
        path: '/onboarding/availability',
        builder: (context, state) => const AvailabilityScreen(),
      ),
      GoRoute(
        path: '/onboarding/padel-interest',
        builder: (context, state) => const PadelInterestScreen(),
      ),
      GoRoute(
        path: '/onboarding/complete',
        builder: (context, state) => const OnboardingCompleteScreen(),
      ),
      GoRoute(
        path: '/home',
        builder: (context, state) => AppShell(
          initialIndex: _tabIndex(state.uri.queryParameters['tab']),
          initialPlaySegment: _segmentIndex(
            state.uri.queryParameters['play'],
            const ['find', 'challenges', 'active', 'history'],
          ),
          initialDiscoverSegment: _segmentIndex(
            state.uri.queryParameters['discover'],
            const ['players', 'courts', 'clubs', 'coaches'],
          ),
        ),
      ),
      GoRoute(
        path: '/search',
        builder: (context, state) => GlobalSearchScreen(
          initialFilter: _searchFilter(state.uri.queryParameters['type']),
        ),
      ),
      GoRoute(
        path: '/players/:id',
        builder: (context, state) =>
            PlayerProfileScreen(playerId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/connections',
        builder: (context, state) => const ConnectionsListScreen(),
      ),
      GoRoute(
        path: '/connections/pending',
        builder: (context, state) => const PendingRequestsScreen(),
      ),
      GoRoute(
        path: '/challenge',
        builder: (context, state) =>
            ChallengeComposerScreen(opponent: state.extra as PlayerSummary),
      ),
      GoRoute(
        path: '/matches/:id',
        builder: (context, state) =>
            MatchDetailScreen(matchId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/matches/:id/enter-score',
        builder: (context, state) {
          final extra =
              state.extra
                  as ({DriftMatch match, String viewerId, EnterScoreMode mode});
          return EnterScoreScreen(
            match: extra.match,
            viewerId: extra.viewerId,
            mode: extra.mode,
          );
        },
      ),
      GoRoute(
        path: '/matches/:id/dispute',
        builder: (context, state) {
          final extra = state.extra as ({DriftMatch match, String viewerId});
          return DisputeDetailScreen(
            match: extra.match,
            viewerId: extra.viewerId,
          );
        },
      ),
      GoRoute(
        path: '/matches/:id/reflection',
        builder: (context, state) =>
            MatchReflectionScreen(matchId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/stats',
        builder: (context, state) {
          final extra = state.extra as ({String title, PlayerStats stats});
          return RatingsStatsScreen(title: extra.title, stats: extra.stats);
        },
      ),
      GoRoute(
        path: '/compete/leagues/:id',
        builder: (context, state) =>
            SeasonDetailScreen(seasonId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/compete/leagues/:id/rules',
        builder: (context, state) =>
            LeagueRulesScreen(leagueId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/compete/leagues/:id/players',
        builder: (context, state) =>
            RegisteredPlayersScreen(seasonId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/compete/leagues/:id/rounds/:roundId',
        builder: (context, state) => RoundDetailScreen(
          seasonId: state.pathParameters['id']!,
          roundId: state.pathParameters['roundId']!,
        ),
      ),
      GoRoute(
        path: '/compete/leagues/:id/standings',
        builder: (context, state) =>
            StandingsScreen(seasonId: state.pathParameters['id']!),
      ),
      // Legacy alias — old notifications / deep links used /compete/seasons/:id.
      GoRoute(
        path: '/compete/seasons/:id',
        builder: (context, state) =>
            SeasonDetailScreen(seasonId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/compete/my-leagues',
        builder: (context, state) => const MySeasonsScreen(),
      ),
      GoRoute(
        path: '/compete/tournaments/:id',
        builder: (context, state) =>
            TournamentDetailScreen(tournamentId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/compete/ladders/:id',
        builder: (context, state) =>
            LadderDetailScreen(ladderId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/discover/coaches',
        builder: (context, state) => CoachListScreen(
          initialClubId: state.uri.queryParameters['clubId'],
          initialClubName: state.uri.queryParameters['clubName'],
        ),
      ),
      GoRoute(
        path: '/discover/coaches/:id',
        builder: (context, state) =>
            CoachProfileScreen(coachId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/discover/courts/:id',
        builder: (context, state) =>
            CourtProfileScreen(courtId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/discover/courts/:id/photos',
        builder: (context, state) => CourtPhotosGalleryScreen(
          photoUrls: (state.extra as List<String>?) ?? const [],
        ),
      ),
      GoRoute(
        path: '/discover/clubs/:id',
        builder: (context, state) =>
            ClubProfileScreen(clubId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/discover/clubs/:id/announcements',
        builder: (context, state) =>
            ClubAnnouncementsScreen(clubId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/discover/clubs/:id/feed',
        builder: (context, state) =>
            ClubFeedScreen(clubId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/learn',
        builder: (context, state) => const LearningHomeScreen(),
      ),
      GoRoute(
        path: '/learn/skill-profile',
        builder: (context, state) => const SkillProfileScreen(),
      ),
      GoRoute(
        path: '/learn/skill-profile/:skill',
        builder: (context, state) =>
            SkillDetailScreen(skill: state.pathParameters['skill']!),
      ),
      GoRoute(
        path: '/learn/browse/:skill',
        builder: (context, state) =>
            SkillCategoryBrowseScreen(skill: state.pathParameters['skill']!),
      ),
      GoRoute(
        path: '/learn/content/:id',
        builder: (context, state) =>
            ContentDetailScreen(contentId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/learn/content/:id/video',
        builder: (context, state) =>
            VideoLessonPlayerScreen(contentId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/learn/plans/:id',
        builder: (context, state) =>
            TrainingPlanDetailScreen(planId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/learn/practice',
        builder: (context, state) => const PracticeLogListScreen(),
      ),
      GoRoute(
        path: '/learn/practice/add',
        builder: (context, state) {
          final extra = state.extra as ({String? drillId, String? skillFocus})?;
          return AddPracticeSessionScreen(
            drillId: extra?.drillId,
            skillFocus: extra?.skillFocus,
          );
        },
      ),
      GoRoute(
        path: '/learn/goals',
        builder: (context, state) => const GoalListScreen(),
      ),
      GoRoute(
        path: '/learn/goals/create',
        builder: (context, state) =>
            CreateGoalScreen(initialSkill: state.extra as String?),
      ),
      GoRoute(
        path: '/learn/goals/:id',
        builder: (context, state) =>
            GoalDetailScreen(goalId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/learn/progress',
        builder: (context, state) => const ProgressReportScreen(),
      ),
      GoRoute(
        path: '/learn/assessments',
        builder: (context, state) => const AssessmentHistoryScreen(),
      ),
      GoRoute(
        path: '/news',
        builder: (context, state) => const NewsFeedScreen(),
      ),
      GoRoute(
        path: '/news/saved',
        builder: (context, state) => const SavedStoriesScreen(),
      ),
      GoRoute(
        path: '/news/:id',
        builder: (context, state) =>
            NewsStoryDetailScreen(storyId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/messages',
        builder: (context, state) => const InboxScreen(),
      ),
      GoRoute(
        path: '/messages/:id',
        builder: (context, state) =>
            ChatThreadScreen(conversationId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/notifications',
        builder: (context, state) => const NotificationCenterScreen(),
      ),
      GoRoute(
        path: '/notifications/preferences',
        builder: (context, state) => const NotificationPreferencesScreen(),
      ),
      GoRoute(
        path: '/profile/own',
        builder: (context, state) => const OwnProfileScreen(),
      ),
      GoRoute(
        path: '/profile/achievements',
        builder: (context, state) => const AchievementsScreen(),
      ),
      GoRoute(
        path: '/profile/edit',
        builder: (context, state) => const EditProfileScreen(),
      ),
      GoRoute(
        path: '/profile/sports-hub',
        builder: (context, state) => const MySportsHubScreen(),
      ),
      GoRoute(
        path: '/profile/padel/add',
        builder: (context, state) => const AddPadelScreen(),
      ),
      GoRoute(
        path: '/profile/padel/assessment',
        builder: (context, state) => const PadelAssessmentQuestionScreen(),
      ),
      GoRoute(
        path: '/profile/padel',
        builder: (context, state) => const PadelProfileScreen(),
      ),
      GoRoute(
        path: '/profile/padel/preferences',
        builder: (context, state) => const PadelPreferencesGoalsScreen(),
      ),
      GoRoute(
        path: '/profile/padel/history',
        builder: (context, state) => const PadelMatchHistoryScreen(),
      ),
      GoRoute(
        path: '/settings',
        builder: (context, state) => const SettingsHomeScreen(),
      ),
      GoRoute(
        path: '/settings/privacy',
        builder: (context, state) => const PrivacySettingsScreen(),
      ),
      GoRoute(
        path: '/settings/blocked-users',
        builder: (context, state) => const BlockedUsersScreen(),
      ),
      GoRoute(
        path: '/settings/subscription',
        builder: (context, state) => const SubscriptionPlanScreen(),
      ),
      GoRoute(
        path: '/settings/subscription/plans',
        builder: (context, state) => const PlanSelectionScreen(),
      ),
      GoRoute(
        path: '/settings/payment-methods',
        builder: (context, state) => PaymentMethodsScreen(
          pendingPlanId: state.uri.queryParameters['planId'],
        ),
      ),
      GoRoute(
        path: '/settings/billing-history',
        builder: (context, state) => const BillingHistoryScreen(),
      ),
      GoRoute(
        path: '/settings/account-security',
        builder: (context, state) => const AccountSecurityScreen(),
      ),
      GoRoute(
        path: '/settings/help',
        builder: (context, state) => const HelpScreen(),
      ),
      GoRoute(
        path: '/settings/contact-support',
        builder: (context, state) => const ContactSupportScreen(),
      ),
      GoRoute(
        path: '/settings/legal',
        builder: (context, state) => const LegalScreen(),
      ),
      GoRoute(
        path: '/settings/delete-account',
        builder: (context, state) => const DeleteAccountScreen(),
      ),
    ],
  );
});

int _tabIndex(String? tab) => switch (tab) {
  'play' => 1,
  'compete' => 2,
  'discover' => 3,
  'profile' => 4,
  _ => 0,
};

int? _segmentIndex(String? value, List<String> labels) {
  if (value == null) return null;
  final index = labels.indexOf(value);
  return index < 0 ? null : index;
}

GlobalSearchFilter? _searchFilter(String? type) => switch (type) {
  'PLAYER' => GlobalSearchFilter.player,
  'COURT' => GlobalSearchFilter.court,
  'CLUB' => GlobalSearchFilter.club,
  'COMPETITION' => GlobalSearchFilter.competition,
  _ => null,
};
