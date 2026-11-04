import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_es.dart';
import 'app_localizations_fr.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('es'),
    Locale('fr'),
  ];

  /// No description provided for @achievementsCriteria.
  ///
  /// In en, this message translates to:
  /// **'Criteria'**
  String get achievementsCriteria;

  /// No description provided for @achievementsEarned.
  ///
  /// In en, this message translates to:
  /// **'Earned'**
  String get achievementsEarned;

  /// No description provided for @achievementsLoadFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load achievements.'**
  String get achievementsLoadFailed;

  /// No description provided for @achievementsLocked.
  ///
  /// In en, this message translates to:
  /// **'Locked'**
  String get achievementsLocked;

  /// No description provided for @achievementsYourBadges.
  ///
  /// In en, this message translates to:
  /// **'Your badges'**
  String get achievementsYourBadges;

  /// No description provided for @assessmentGoodProgress.
  ///
  /// In en, this message translates to:
  /// **'Good progress'**
  String get assessmentGoodProgress;

  /// No description provided for @assessmentHalfway.
  ///
  /// In en, this message translates to:
  /// **'You are halfway through. The next questions fine-tune your level so Drift can suggest better matches.'**
  String get assessmentHalfway;

  /// No description provided for @assessmentHistory.
  ///
  /// In en, this message translates to:
  /// **'Assessment History'**
  String get assessmentHistory;

  /// No description provided for @assessmentLoadFailed.
  ///
  /// In en, this message translates to:
  /// **'Unable to load the assessment.'**
  String get assessmentLoadFailed;

  /// No description provided for @assessmentOnlyOne.
  ///
  /// In en, this message translates to:
  /// **'Only one assessment so far'**
  String get assessmentOnlyOne;

  /// No description provided for @assessmentQuestionOf.
  ///
  /// In en, this message translates to:
  /// **'Question {current} of {total}'**
  String assessmentQuestionOf(int current, int total);

  /// No description provided for @assessmentTitle.
  ///
  /// In en, this message translates to:
  /// **'Tennis Assessment'**
  String get assessmentTitle;

  /// No description provided for @authAgePolicy.
  ///
  /// In en, this message translates to:
  /// **'I confirm I am 18 or older and agree to the Terms and Conditions and Privacy Policy.'**
  String get authAgePolicy;

  /// No description provided for @authAppleFailed.
  ///
  /// In en, this message translates to:
  /// **'Apple sign-in could not be completed. {details}'**
  String authAppleFailed(String details);

  /// No description provided for @authAppleNoToken.
  ///
  /// In en, this message translates to:
  /// **'Apple returned no identity token. Please try again.'**
  String get authAppleNoToken;

  /// No description provided for @authAppleUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Apple sign-in isn\'t available on this device yet.'**
  String get authAppleUnavailable;

  /// No description provided for @authBackToLogin.
  ///
  /// In en, this message translates to:
  /// **'Back to Log In'**
  String get authBackToLogin;

  /// No description provided for @authCode.
  ///
  /// In en, this message translates to:
  /// **'Code'**
  String get authCode;

  /// No description provided for @authConfirmNewPassword.
  ///
  /// In en, this message translates to:
  /// **'Confirm new password'**
  String get authConfirmNewPassword;

  /// No description provided for @authContinueApple.
  ///
  /// In en, this message translates to:
  /// **'Continue with Apple'**
  String get authContinueApple;

  /// No description provided for @authContinueGoogle.
  ///
  /// In en, this message translates to:
  /// **'Continue with Google'**
  String get authContinueGoogle;

  /// No description provided for @authCreateAccount.
  ///
  /// In en, this message translates to:
  /// **'Create account'**
  String get authCreateAccount;

  /// No description provided for @authEmail.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get authEmail;

  /// No description provided for @authFirstName.
  ///
  /// In en, this message translates to:
  /// **'First name'**
  String get authFirstName;

  /// No description provided for @authForgotPasswordIntro.
  ///
  /// In en, this message translates to:
  /// **'Enter the email address on your account and we’ll send a six-digit code you can use to set a new password.'**
  String get authForgotPasswordIntro;

  /// No description provided for @authForgotPasswordLink.
  ///
  /// In en, this message translates to:
  /// **'Forgot Password?'**
  String get authForgotPasswordLink;

  /// No description provided for @authForgotPasswordTitle.
  ///
  /// In en, this message translates to:
  /// **'Forgot Password'**
  String get authForgotPasswordTitle;

  /// No description provided for @authGoogleFailed.
  ///
  /// In en, this message translates to:
  /// **'Google sign-in could not be completed.'**
  String get authGoogleFailed;

  /// No description provided for @authGoogleNoToken.
  ///
  /// In en, this message translates to:
  /// **'Google returned no identity token. The app is missing its server client ID.'**
  String get authGoogleNoToken;

  /// No description provided for @authHaveAccount.
  ///
  /// In en, this message translates to:
  /// **'Already have an account? '**
  String get authHaveAccount;

  /// No description provided for @authLastName.
  ///
  /// In en, this message translates to:
  /// **'Last name'**
  String get authLastName;

  /// No description provided for @authLink.
  ///
  /// In en, this message translates to:
  /// **'Link'**
  String get authLink;

  /// No description provided for @authLinkBody.
  ///
  /// In en, this message translates to:
  /// **'{email} already has a Drift Tennis account. Enter its password once and the two will be linked — after that you can use either to sign in.'**
  String authLinkBody(String email);

  /// No description provided for @authLinkTitle.
  ///
  /// In en, this message translates to:
  /// **'Link your account'**
  String get authLinkTitle;

  /// No description provided for @authLogIn.
  ///
  /// In en, this message translates to:
  /// **'Log in'**
  String get authLogIn;

  /// No description provided for @authLogin.
  ///
  /// In en, this message translates to:
  /// **'Login'**
  String get authLogin;

  /// No description provided for @authNeedAccount.
  ///
  /// In en, this message translates to:
  /// **'Need an account? '**
  String get authNeedAccount;

  /// No description provided for @authNewPassword.
  ///
  /// In en, this message translates to:
  /// **'New password'**
  String get authNewPassword;

  /// No description provided for @authOnWhatsApp.
  ///
  /// In en, this message translates to:
  /// **'This number is on WhatsApp'**
  String get authOnWhatsApp;

  /// No description provided for @authPassword.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get authPassword;

  /// No description provided for @authPasswordRule.
  ///
  /// In en, this message translates to:
  /// **'Use 8 to 72 characters.'**
  String get authPasswordRule;

  /// No description provided for @authPasswordUpdated.
  ///
  /// In en, this message translates to:
  /// **'Password updated. Log in with your new password.'**
  String get authPasswordUpdated;

  /// No description provided for @authPasswordsDontMatch.
  ///
  /// In en, this message translates to:
  /// **'Those passwords don’t match.'**
  String get authPasswordsDontMatch;

  /// No description provided for @authPhone.
  ///
  /// In en, this message translates to:
  /// **'Phone number'**
  String get authPhone;

  /// No description provided for @authPhoneOptional.
  ///
  /// In en, this message translates to:
  /// **'Phone number (optional)'**
  String get authPhoneOptional;

  /// No description provided for @authResendCode.
  ///
  /// In en, this message translates to:
  /// **'Resend code'**
  String get authResendCode;

  /// No description provided for @authResendCodeIn.
  ///
  /// In en, this message translates to:
  /// **'Resend code in {seconds}s'**
  String authResendCodeIn(int seconds);

  /// No description provided for @authResendIn.
  ///
  /// In en, this message translates to:
  /// **'Resend in {seconds}s'**
  String authResendIn(int seconds);

  /// No description provided for @authResetPasswordIntro.
  ///
  /// In en, this message translates to:
  /// **'If an account exists for {email}, a six-digit code is on its way. Enter it below with your new password.'**
  String authResetPasswordIntro(String email);

  /// No description provided for @authResetPasswordTitle.
  ///
  /// In en, this message translates to:
  /// **'Reset Password'**
  String get authResetPasswordTitle;

  /// No description provided for @authSearchCountries.
  ///
  /// In en, this message translates to:
  /// **'Search countries'**
  String get authSearchCountries;

  /// No description provided for @authSelectCountry.
  ///
  /// In en, this message translates to:
  /// **'Select country, currently {country}, plus {code}'**
  String authSelectCountry(String country, String code);

  /// No description provided for @authSendCode.
  ///
  /// In en, this message translates to:
  /// **'Send Code'**
  String get authSendCode;

  /// No description provided for @authSetNewPassword.
  ///
  /// In en, this message translates to:
  /// **'Set New Password'**
  String get authSetNewPassword;

  /// No description provided for @authSignUp.
  ///
  /// In en, this message translates to:
  /// **'Sign up'**
  String get authSignUp;

  /// No description provided for @authSixDigitCode.
  ///
  /// In en, this message translates to:
  /// **'Six-digit code'**
  String get authSixDigitCode;

  /// No description provided for @authVerify.
  ///
  /// In en, this message translates to:
  /// **'Verify'**
  String get authVerify;

  /// No description provided for @authVerifyIntro.
  ///
  /// In en, this message translates to:
  /// **'Enter the 6-digit code we sent to {email}.'**
  String authVerifyIntro(String email);

  /// No description provided for @authVerifying.
  ///
  /// In en, this message translates to:
  /// **'Verifying…'**
  String get authVerifying;

  /// No description provided for @availBookOnline.
  ///
  /// In en, this message translates to:
  /// **'Book online'**
  String get availBookOnline;

  /// No description provided for @availComingSoon.
  ///
  /// In en, this message translates to:
  /// **'Booking coming soon'**
  String get availComingSoon;

  /// No description provided for @availContactToBook.
  ///
  /// In en, this message translates to:
  /// **'Contact to book'**
  String get availContactToBook;

  /// No description provided for @availUnknown.
  ///
  /// In en, this message translates to:
  /// **'Booking unknown'**
  String get availUnknown;

  /// No description provided for @blockedLoadFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load your blocked users.'**
  String get blockedLoadFailed;

  /// No description provided for @blockedNone.
  ///
  /// In en, this message translates to:
  /// **'You haven\'t blocked anyone.'**
  String get blockedNone;

  /// No description provided for @blockedUnblock.
  ///
  /// In en, this message translates to:
  /// **'Unblock'**
  String get blockedUnblock;

  /// No description provided for @blockedUnblocking.
  ///
  /// In en, this message translates to:
  /// **'Unblocking…'**
  String get blockedUnblocking;

  /// No description provided for @clubAnnouncements.
  ///
  /// In en, this message translates to:
  /// **'Announcements'**
  String get clubAnnouncements;

  /// No description provided for @clubFeed.
  ///
  /// In en, this message translates to:
  /// **'Club Feed'**
  String get clubFeed;

  /// No description provided for @clubFormerMember.
  ///
  /// In en, this message translates to:
  /// **'Former member'**
  String get clubFormerMember;

  /// No description provided for @clubInvited.
  ///
  /// In en, this message translates to:
  /// **'You have been invited to this club.'**
  String get clubInvited;

  /// No description provided for @clubJoin.
  ///
  /// In en, this message translates to:
  /// **'Join'**
  String get clubJoin;

  /// No description provided for @clubJoinRequestSent.
  ///
  /// In en, this message translates to:
  /// **'Join request sent.'**
  String get clubJoinRequestSent;

  /// No description provided for @clubJoinToSeeAnnouncements.
  ///
  /// In en, this message translates to:
  /// **'Join this club to see its announcements.'**
  String get clubJoinToSeeAnnouncements;

  /// No description provided for @clubJoinToSeeFeed.
  ///
  /// In en, this message translates to:
  /// **'Join this club to see and post to its feed.'**
  String get clubJoinToSeeFeed;

  /// No description provided for @clubLeave.
  ///
  /// In en, this message translates to:
  /// **'Leave club'**
  String get clubLeave;

  /// No description provided for @clubLoadFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load clubs. Pull to retry.'**
  String get clubLoadFailed;

  /// No description provided for @clubNoAnnouncements.
  ///
  /// In en, this message translates to:
  /// **'No announcements yet'**
  String get clubNoAnnouncements;

  /// No description provided for @clubNoCourtsListed.
  ///
  /// In en, this message translates to:
  /// **'No courts listed'**
  String get clubNoCourtsListed;

  /// No description provided for @clubNoPosts.
  ///
  /// In en, this message translates to:
  /// **'No posts yet'**
  String get clubNoPosts;

  /// No description provided for @clubNoneNearby.
  ///
  /// In en, this message translates to:
  /// **'No clubs nearby yet'**
  String get clubNoneNearby;

  /// No description provided for @clubRequestPending.
  ///
  /// In en, this message translates to:
  /// **'Your request is waiting for a club admin.'**
  String get clubRequestPending;

  /// No description provided for @clubRequestToJoin.
  ///
  /// In en, this message translates to:
  /// **'Request to join'**
  String get clubRequestToJoin;

  /// No description provided for @clubRequested.
  ///
  /// In en, this message translates to:
  /// **'Requested'**
  String get clubRequested;

  /// No description provided for @clubRequesting.
  ///
  /// In en, this message translates to:
  /// **'Requesting…'**
  String get clubRequesting;

  /// No description provided for @clubShareHint.
  ///
  /// In en, this message translates to:
  /// **'Share something with the club'**
  String get clubShareHint;

  /// No description provided for @clubSuspended.
  ///
  /// In en, this message translates to:
  /// **'Your membership of this club is suspended.'**
  String get clubSuspended;

  /// No description provided for @clubTitle.
  ///
  /// In en, this message translates to:
  /// **'Club'**
  String get clubTitle;

  /// No description provided for @clubUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Club not available.'**
  String get clubUnavailable;

  /// No description provided for @clubViewCoaches.
  ///
  /// In en, this message translates to:
  /// **'View coaches'**
  String get clubViewCoaches;

  /// No description provided for @clubWithdrawRequest.
  ///
  /// In en, this message translates to:
  /// **'Withdraw request'**
  String get clubWithdrawRequest;

  /// No description provided for @coachContactBook.
  ///
  /// In en, this message translates to:
  /// **'Contact / Book'**
  String get coachContactBook;

  /// No description provided for @coachContactFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not open that contact method.'**
  String get coachContactFailed;

  /// No description provided for @coachContactName.
  ///
  /// In en, this message translates to:
  /// **'Contact {name}'**
  String coachContactName(String name);

  /// No description provided for @coachEmail.
  ///
  /// In en, this message translates to:
  /// **'Email coach'**
  String get coachEmail;

  /// No description provided for @coachFallbackName.
  ///
  /// In en, this message translates to:
  /// **'Coach'**
  String get coachFallbackName;

  /// No description provided for @coachFilters.
  ///
  /// In en, this message translates to:
  /// **'Coach filters'**
  String get coachFilters;

  /// No description provided for @coachLoadFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load coaches. Pull to retry.'**
  String get coachLoadFailed;

  /// No description provided for @coachNoneNearby.
  ///
  /// In en, this message translates to:
  /// **'No coaches listed near you yet'**
  String get coachNoneNearby;

  /// No description provided for @coachOpenBooking.
  ///
  /// In en, this message translates to:
  /// **'Open booking page'**
  String get coachOpenBooking;

  /// No description provided for @coachPlayersCoached.
  ///
  /// In en, this message translates to:
  /// **'Players coached'**
  String get coachPlayersCoached;

  /// No description provided for @coachQualifications.
  ///
  /// In en, this message translates to:
  /// **'Qualifications'**
  String get coachQualifications;

  /// No description provided for @coachSearchClub.
  ///
  /// In en, this message translates to:
  /// **'Search by club name'**
  String get coachSearchClub;

  /// No description provided for @coachSelectedClub.
  ///
  /// In en, this message translates to:
  /// **'Selected club'**
  String get coachSelectedClub;

  /// No description provided for @coachSpecialisation.
  ///
  /// In en, this message translates to:
  /// **'Specialisation'**
  String get coachSpecialisation;

  /// No description provided for @coachSpecialisationHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Serve, juniors, match play'**
  String get coachSpecialisationHint;

  /// No description provided for @coachSpecialisations.
  ///
  /// In en, this message translates to:
  /// **'Specialisations'**
  String get coachSpecialisations;

  /// No description provided for @coachTitle.
  ///
  /// In en, this message translates to:
  /// **'Coach'**
  String get coachTitle;

  /// No description provided for @coachUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Coach profile is not available.'**
  String get coachUnavailable;

  /// No description provided for @comingSoon.
  ///
  /// In en, this message translates to:
  /// **'Coming soon'**
  String get comingSoon;

  /// No description provided for @comingSoonApple.
  ///
  /// In en, this message translates to:
  /// **'Apple sign-in isn\'t ready yet — we\'re still setting it up. Please continue with Google or email for now.'**
  String get comingSoonApple;

  /// No description provided for @commonAccept.
  ///
  /// In en, this message translates to:
  /// **'Accept'**
  String get commonAccept;

  /// No description provided for @commonAvailability.
  ///
  /// In en, this message translates to:
  /// **'Availability'**
  String get commonAvailability;

  /// No description provided for @commonBack.
  ///
  /// In en, this message translates to:
  /// **'Back'**
  String get commonBack;

  /// No description provided for @commonCallNumber.
  ///
  /// In en, this message translates to:
  /// **'Call {phone}'**
  String commonCallNumber(String phone);

  /// No description provided for @commonCancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get commonCancel;

  /// No description provided for @commonCancelling.
  ///
  /// In en, this message translates to:
  /// **'Cancelling…'**
  String get commonCancelling;

  /// No description provided for @commonClose.
  ///
  /// In en, this message translates to:
  /// **'Close'**
  String get commonClose;

  /// No description provided for @commonCompleted.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get commonCompleted;

  /// No description provided for @commonConfirm.
  ///
  /// In en, this message translates to:
  /// **'Confirm'**
  String get commonConfirm;

  /// No description provided for @commonContact.
  ///
  /// In en, this message translates to:
  /// **'Contact'**
  String get commonContact;

  /// No description provided for @commonContinue.
  ///
  /// In en, this message translates to:
  /// **'Continue'**
  String get commonContinue;

  /// No description provided for @commonCourtCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 court} other{{count} courts}}'**
  String commonCourtCount(int count);

  /// No description provided for @commonDecline.
  ///
  /// In en, this message translates to:
  /// **'Decline'**
  String get commonDecline;

  /// No description provided for @commonDelete.
  ///
  /// In en, this message translates to:
  /// **'Delete'**
  String get commonDelete;

  /// No description provided for @commonDistanceUnknown.
  ///
  /// In en, this message translates to:
  /// **'Distance unknown'**
  String get commonDistanceUnknown;

  /// No description provided for @commonDone.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get commonDone;

  /// No description provided for @commonErrorGeneric.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong. Please try again.'**
  String get commonErrorGeneric;

  /// No description provided for @commonGoBack.
  ///
  /// In en, this message translates to:
  /// **'Go back'**
  String get commonGoBack;

  /// No description provided for @commonGotIt.
  ///
  /// In en, this message translates to:
  /// **'Got it'**
  String get commonGotIt;

  /// No description provided for @commonInProgress.
  ///
  /// In en, this message translates to:
  /// **'In progress'**
  String get commonInProgress;

  /// No description provided for @commonKmAway.
  ///
  /// In en, this message translates to:
  /// **'{km} km away'**
  String commonKmAway(String km);

  /// No description provided for @commonLevel.
  ///
  /// In en, this message translates to:
  /// **'Level {level}'**
  String commonLevel(String level);

  /// No description provided for @commonLoading.
  ///
  /// In en, this message translates to:
  /// **'Loading…'**
  String get commonLoading;

  /// No description provided for @commonNotAvailable.
  ///
  /// In en, this message translates to:
  /// **'Not available.'**
  String get commonNotAvailable;

  /// No description provided for @commonNotSet.
  ///
  /// In en, this message translates to:
  /// **'Not set'**
  String get commonNotSet;

  /// No description provided for @commonNotesOptional.
  ///
  /// In en, this message translates to:
  /// **'Notes (optional)'**
  String get commonNotesOptional;

  /// No description provided for @commonOpen.
  ///
  /// In en, this message translates to:
  /// **'Open'**
  String get commonOpen;

  /// No description provided for @commonOpenAction.
  ///
  /// In en, this message translates to:
  /// **'Open'**
  String get commonOpenAction;

  /// No description provided for @commonOptionalSuffix.
  ///
  /// In en, this message translates to:
  /// **' (optional)'**
  String get commonOptionalSuffix;

  /// No description provided for @commonPlayer.
  ///
  /// In en, this message translates to:
  /// **'Player'**
  String get commonPlayer;

  /// No description provided for @commonPlayerCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 player} other{{count} players}}'**
  String commonPlayerCount(int count);

  /// No description provided for @commonRetry.
  ///
  /// In en, this message translates to:
  /// **'Retry'**
  String get commonRetry;

  /// No description provided for @commonSave.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get commonSave;

  /// No description provided for @commonSaving.
  ///
  /// In en, this message translates to:
  /// **'Saving…'**
  String get commonSaving;

  /// No description provided for @commonSearch.
  ///
  /// In en, this message translates to:
  /// **'Search'**
  String get commonSearch;

  /// No description provided for @commonSeeAll.
  ///
  /// In en, this message translates to:
  /// **'See all'**
  String get commonSeeAll;

  /// No description provided for @commonSending.
  ///
  /// In en, this message translates to:
  /// **'Sending…'**
  String get commonSending;

  /// No description provided for @commonSkip.
  ///
  /// In en, this message translates to:
  /// **'Skip'**
  String get commonSkip;

  /// No description provided for @commonSubmit.
  ///
  /// In en, this message translates to:
  /// **'Submit'**
  String get commonSubmit;

  /// No description provided for @commonSubmitting.
  ///
  /// In en, this message translates to:
  /// **'Submitting…'**
  String get commonSubmitting;

  /// No description provided for @commonThem.
  ///
  /// In en, this message translates to:
  /// **'Them'**
  String get commonThem;

  /// No description provided for @commonToday.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get commonToday;

  /// No description provided for @commonTryAgain.
  ///
  /// In en, this message translates to:
  /// **'Try again'**
  String get commonTryAgain;

  /// No description provided for @commonUnknown.
  ///
  /// In en, this message translates to:
  /// **'Unknown'**
  String get commonUnknown;

  /// No description provided for @commonUnknownDate.
  ///
  /// In en, this message translates to:
  /// **'Unknown date'**
  String get commonUnknownDate;

  /// No description provided for @commonUnrated.
  ///
  /// In en, this message translates to:
  /// **'Unrated'**
  String get commonUnrated;

  /// No description provided for @commonUpdating.
  ///
  /// In en, this message translates to:
  /// **'Updating…'**
  String get commonUpdating;

  /// No description provided for @commonVerified.
  ///
  /// In en, this message translates to:
  /// **'Verified'**
  String get commonVerified;

  /// No description provided for @commonView.
  ///
  /// In en, this message translates to:
  /// **'View'**
  String get commonView;

  /// No description provided for @commonViewAll.
  ///
  /// In en, this message translates to:
  /// **'View all'**
  String get commonViewAll;

  /// No description provided for @commonViewDetails.
  ///
  /// In en, this message translates to:
  /// **'View details'**
  String get commonViewDetails;

  /// No description provided for @commonViewProfile.
  ///
  /// In en, this message translates to:
  /// **'View profile'**
  String get commonViewProfile;

  /// No description provided for @commonVs.
  ///
  /// In en, this message translates to:
  /// **'vs'**
  String get commonVs;

  /// No description provided for @commonWorking.
  ///
  /// In en, this message translates to:
  /// **'Working…'**
  String get commonWorking;

  /// No description provided for @commonYesterday.
  ///
  /// In en, this message translates to:
  /// **'Yesterday'**
  String get commonYesterday;

  /// No description provided for @commonYou.
  ///
  /// In en, this message translates to:
  /// **'You'**
  String get commonYou;

  /// No description provided for @communityAboutHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. level, usual courts, what a session looks like'**
  String get communityAboutHint;

  /// No description provided for @communityAboutOptional.
  ///
  /// In en, this message translates to:
  /// **'About · Optional'**
  String get communityAboutOptional;

  /// No description provided for @communityAddPhoto.
  ///
  /// In en, this message translates to:
  /// **'Add a photo'**
  String get communityAddPhoto;

  /// No description provided for @communityAddPhotoOptional.
  ///
  /// In en, this message translates to:
  /// **'Add a photo (optional)'**
  String get communityAddPhotoOptional;

  /// No description provided for @communityApprove.
  ///
  /// In en, this message translates to:
  /// **'Approve'**
  String get communityApprove;

  /// No description provided for @communityChallengeRange.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{Players can challenge 1 rung up} other{Players can challenge up to {count} rungs up}}'**
  String communityChallengeRange(int count);

  /// No description provided for @communityChallengeRangeHint.
  ///
  /// In en, this message translates to:
  /// **'How far above their own position a player may challenge.'**
  String get communityChallengeRangeHint;

  /// No description provided for @communityChangePhoto.
  ///
  /// In en, this message translates to:
  /// **'Change photo'**
  String get communityChangePhoto;

  /// No description provided for @communityChatPreview.
  ///
  /// In en, this message translates to:
  /// **'{name}: {message}'**
  String communityChatPreview(String name, String message);

  /// No description provided for @communityChatReadOnly.
  ///
  /// In en, this message translates to:
  /// **'This community is suspended, so its chat is read-only.'**
  String get communityChatReadOnly;

  /// No description provided for @communityChatUnavailable.
  ///
  /// In en, this message translates to:
  /// **'The chat opens once the community is approved.'**
  String get communityChatUnavailable;

  /// No description provided for @communityCity.
  ///
  /// In en, this message translates to:
  /// **'City'**
  String get communityCity;

  /// No description provided for @communityCityHint.
  ///
  /// In en, this message translates to:
  /// **'Nairobi'**
  String get communityCityHint;

  /// No description provided for @communityCreate.
  ///
  /// In en, this message translates to:
  /// **'Create'**
  String get communityCreate;

  /// No description provided for @communityDecline.
  ///
  /// In en, this message translates to:
  /// **'Decline'**
  String get communityDecline;

  /// No description provided for @communityDelete.
  ///
  /// In en, this message translates to:
  /// **'Delete community'**
  String get communityDelete;

  /// No description provided for @communityDeleteBody.
  ///
  /// In en, this message translates to:
  /// **'The chat, ladders and leagues go with it, and every member is told it was closed. This can\'t be undone.'**
  String get communityDeleteBody;

  /// No description provided for @communityDeleted.
  ///
  /// In en, this message translates to:
  /// **'Community deleted'**
  String get communityDeleted;

  /// No description provided for @communityDeleteTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete {name}?'**
  String communityDeleteTitle(String name);

  /// No description provided for @communityDetails.
  ///
  /// In en, this message translates to:
  /// **'Details'**
  String get communityDetails;

  /// No description provided for @communityDisputeHint.
  ///
  /// In en, this message translates to:
  /// **'The players disagree on the score. Your ruling settles it.'**
  String get communityDisputeHint;

  /// No description provided for @communityDisputeKeep.
  ///
  /// In en, this message translates to:
  /// **'Keep submitted score'**
  String get communityDisputeKeep;

  /// No description provided for @communityDisputeResolved.
  ///
  /// In en, this message translates to:
  /// **'Dispute resolved'**
  String get communityDisputeResolved;

  /// No description provided for @communityDisputes.
  ///
  /// In en, this message translates to:
  /// **'Disputed results ({count})'**
  String communityDisputes(int count);

  /// No description provided for @communityDisputeUseDisputed.
  ///
  /// In en, this message translates to:
  /// **'Use disputed score'**
  String get communityDisputeUseDisputed;

  /// No description provided for @communityDisputeVs.
  ///
  /// In en, this message translates to:
  /// **'{a} vs {b}'**
  String communityDisputeVs(String a, String b);

  /// No description provided for @communityEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'A community is a standing session with its own members and chat. Start one and invite the people you play with.'**
  String get communityEmptyBody;

  /// No description provided for @communityEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'No communities yet'**
  String get communityEmptyTitle;

  /// No description provided for @communityFilterAnyCity.
  ///
  /// In en, this message translates to:
  /// **'Any city'**
  String get communityFilterAnyCity;

  /// No description provided for @communityFilterCity.
  ///
  /// In en, this message translates to:
  /// **'City'**
  String get communityFilterCity;

  /// No description provided for @communityFilterCityTitle.
  ///
  /// In en, this message translates to:
  /// **'Communities in…'**
  String get communityFilterCityTitle;

  /// No description provided for @communityFilterNearMe.
  ///
  /// In en, this message translates to:
  /// **'Near me'**
  String get communityFilterNearMe;

  /// No description provided for @communityFormAboutLabel.
  ///
  /// In en, this message translates to:
  /// **'Tell players what to expect'**
  String get communityFormAboutLabel;

  /// No description provided for @communityFormCityHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Nairobi'**
  String get communityFormCityHint;

  /// No description provided for @communityFormCityLabel.
  ///
  /// In en, this message translates to:
  /// **'Which city do you play in?'**
  String get communityFormCityLabel;

  /// No description provided for @communityFormFrequencyLabel.
  ///
  /// In en, this message translates to:
  /// **'How often do you get together?'**
  String get communityFormFrequencyLabel;

  /// No description provided for @communityFormJoinLabel.
  ///
  /// In en, this message translates to:
  /// **'How do new players get in?'**
  String get communityFormJoinLabel;

  /// No description provided for @communityFormJoinOpen.
  ///
  /// In en, this message translates to:
  /// **'Open to everyone'**
  String get communityFormJoinOpen;

  /// No description provided for @communityFormJoinOpenHint.
  ///
  /// In en, this message translates to:
  /// **'Players join instantly, no approval needed'**
  String get communityFormJoinOpenHint;

  /// No description provided for @communityFormJoinRequest.
  ///
  /// In en, this message translates to:
  /// **'Approval needed'**
  String get communityFormJoinRequest;

  /// No description provided for @communityFormJoinRequestHint.
  ///
  /// In en, this message translates to:
  /// **'You review and accept each player'**
  String get communityFormJoinRequestHint;

  /// No description provided for @communityFormNameLabel.
  ///
  /// In en, this message translates to:
  /// **'What\'s your community called?'**
  String get communityFormNameLabel;

  /// No description provided for @communityFormOptional.
  ///
  /// In en, this message translates to:
  /// **'Optional'**
  String get communityFormOptional;

  /// No description provided for @communityFrequencyBiweekly.
  ///
  /// In en, this message translates to:
  /// **'Every two weeks'**
  String get communityFrequencyBiweekly;

  /// No description provided for @communityFrequencyMonthly.
  ///
  /// In en, this message translates to:
  /// **'Monthly'**
  String get communityFrequencyMonthly;

  /// No description provided for @communityFrequencyOther.
  ///
  /// In en, this message translates to:
  /// **'Other'**
  String get communityFrequencyOther;

  /// No description provided for @communityFrequencyWeekly.
  ///
  /// In en, this message translates to:
  /// **'Weekly'**
  String get communityFrequencyWeekly;

  /// No description provided for @communityHowOften.
  ///
  /// In en, this message translates to:
  /// **'How often'**
  String get communityHowOften;

  /// No description provided for @communityJoin.
  ///
  /// In en, this message translates to:
  /// **'Join'**
  String get communityJoin;

  /// No description provided for @communityJoinAnyone.
  ///
  /// In en, this message translates to:
  /// **'Anyone'**
  String get communityJoinAnyone;

  /// No description provided for @communityJoinAnyoneHint.
  ///
  /// In en, this message translates to:
  /// **'Anyone on Drift Tennis can join straight away'**
  String get communityJoinAnyoneHint;

  /// No description provided for @communityJoinByRequest.
  ///
  /// In en, this message translates to:
  /// **'By request'**
  String get communityJoinByRequest;

  /// No description provided for @communityJoinByRequestHint.
  ///
  /// In en, this message translates to:
  /// **'You approve each request'**
  String get communityJoinByRequestHint;

  /// No description provided for @communityJoined.
  ///
  /// In en, this message translates to:
  /// **'Joined'**
  String get communityJoined;

  /// No description provided for @communityJoinedToast.
  ///
  /// In en, this message translates to:
  /// **'You\'ve joined {name}'**
  String communityJoinedToast(String name);

  /// No description provided for @communityJoinRequests.
  ///
  /// In en, this message translates to:
  /// **'Join requests ({count})'**
  String communityJoinRequests(int count);

  /// No description provided for @communityLadderCreated.
  ///
  /// In en, this message translates to:
  /// **'Ladder created. Members have been notified.'**
  String get communityLadderCreated;

  /// No description provided for @communityLadderName.
  ///
  /// In en, this message translates to:
  /// **'Ladder name'**
  String get communityLadderName;

  /// No description provided for @communityLadderPlayers.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{No players yet} =1{1 player} other{{count} players}}'**
  String communityLadderPlayers(int count);

  /// No description provided for @communityLadders.
  ///
  /// In en, this message translates to:
  /// **'Ladders'**
  String get communityLadders;

  /// No description provided for @communityLadderYourRung.
  ///
  /// In en, this message translates to:
  /// **'You\'re #{position} of {total}'**
  String communityLadderYourRung(int position, int total);

  /// No description provided for @communityLeagueCapacity.
  ///
  /// In en, this message translates to:
  /// **'Player limit (optional)'**
  String get communityLeagueCapacity;

  /// No description provided for @communityLeagueCapacityHint.
  ///
  /// In en, this message translates to:
  /// **'Extra sign-ups join a waitlist.'**
  String get communityLeagueCapacityHint;

  /// No description provided for @communityLeagueCloseBeforeStart.
  ///
  /// In en, this message translates to:
  /// **'Registration has to close on or before the start date.'**
  String get communityLeagueCloseBeforeStart;

  /// No description provided for @communityLeagueCreate.
  ///
  /// In en, this message translates to:
  /// **'Create league'**
  String get communityLeagueCreate;

  /// No description provided for @communityLeagueCreated.
  ///
  /// In en, this message translates to:
  /// **'League created. Members have been notified.'**
  String get communityLeagueCreated;

  /// No description provided for @communityLeagueDaysBetweenRounds.
  ///
  /// In en, this message translates to:
  /// **'Days per round'**
  String get communityLeagueDaysBetweenRounds;

  /// No description provided for @communityLeagueDescription.
  ///
  /// In en, this message translates to:
  /// **'Description (optional)'**
  String get communityLeagueDescription;

  /// No description provided for @communityLeagueName.
  ///
  /// In en, this message translates to:
  /// **'League name'**
  String get communityLeagueName;

  /// No description provided for @communityLeagueOpenBeforeClose.
  ///
  /// In en, this message translates to:
  /// **'Registration has to open before it closes.'**
  String get communityLeagueOpenBeforeClose;

  /// No description provided for @communityLeagueRegistrationCloses.
  ///
  /// In en, this message translates to:
  /// **'Registration closes'**
  String get communityLeagueRegistrationCloses;

  /// No description provided for @communityLeagueRegistrationOpens.
  ///
  /// In en, this message translates to:
  /// **'Registration opens'**
  String get communityLeagueRegistrationOpens;

  /// No description provided for @communityLeagueRounds.
  ///
  /// In en, this message translates to:
  /// **'Rounds'**
  String get communityLeagueRounds;

  /// No description provided for @communityLeagues.
  ///
  /// In en, this message translates to:
  /// **'Leagues'**
  String get communityLeagues;

  /// No description provided for @communityLeagueStarts.
  ///
  /// In en, this message translates to:
  /// **'League starts'**
  String get communityLeagueStarts;

  /// No description provided for @communityLeave.
  ///
  /// In en, this message translates to:
  /// **'Leave community'**
  String get communityLeave;

  /// No description provided for @communityLeaveBody.
  ///
  /// In en, this message translates to:
  /// **'You\'ll leave its chat and stop getting its notifications. You can ask to join again later.'**
  String get communityLeaveBody;

  /// No description provided for @communityLeaveLastOwner.
  ///
  /// In en, this message translates to:
  /// **'You\'re the only member, so leaving closes the community for good.'**
  String get communityLeaveLastOwner;

  /// No description provided for @communityLeaveTitle.
  ///
  /// In en, this message translates to:
  /// **'Leave {name}?'**
  String communityLeaveTitle(String name);

  /// No description provided for @communityLeft.
  ///
  /// In en, this message translates to:
  /// **'You\'ve left the community.'**
  String get communityLeft;

  /// No description provided for @communityLoadCompetitionsFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load competitions.'**
  String get communityLoadCompetitionsFailed;

  /// No description provided for @communityLoadFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load communities.'**
  String get communityLoadFailed;

  /// No description provided for @communityLoadMembersFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load members.'**
  String get communityLoadMembersFailed;

  /// No description provided for @communityLoadOneFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load this community.'**
  String get communityLoadOneFailed;

  /// No description provided for @communityMakeAdmin.
  ///
  /// In en, this message translates to:
  /// **'Make admin'**
  String get communityMakeAdmin;

  /// No description provided for @communityMakeOwner.
  ///
  /// In en, this message translates to:
  /// **'Make owner'**
  String get communityMakeOwner;

  /// No description provided for @communityManage.
  ///
  /// In en, this message translates to:
  /// **'Manage community'**
  String get communityManage;

  /// No description provided for @communityMemberCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 member} other{{count} members}}'**
  String communityMemberCount(int count);

  /// No description provided for @communityMembersCount.
  ///
  /// In en, this message translates to:
  /// **'Members ({count})'**
  String communityMembersCount(int count);

  /// No description provided for @communityMute.
  ///
  /// In en, this message translates to:
  /// **'Mute chat notifications'**
  String get communityMute;

  /// No description provided for @communityMuteHint.
  ///
  /// In en, this message translates to:
  /// **'Approvals and new competitions still reach you.'**
  String get communityMuteHint;

  /// No description provided for @communityName.
  ///
  /// In en, this message translates to:
  /// **'Name'**
  String get communityName;

  /// No description provided for @communityNameHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Tuesday Night Doubles'**
  String get communityNameHint;

  /// No description provided for @communityNearYou.
  ///
  /// In en, this message translates to:
  /// **'Communities near you'**
  String get communityNearYou;

  /// No description provided for @communityNewLadder.
  ///
  /// In en, this message translates to:
  /// **'New ladder'**
  String get communityNewLadder;

  /// No description provided for @communityNewLeague.
  ///
  /// In en, this message translates to:
  /// **'New league'**
  String get communityNewLeague;

  /// No description provided for @communityNoAbout.
  ///
  /// In en, this message translates to:
  /// **'No description yet.'**
  String get communityNoAbout;

  /// No description provided for @communityNoCompetitions.
  ///
  /// In en, this message translates to:
  /// **'No ladders or leagues yet.'**
  String get communityNoCompetitions;

  /// No description provided for @communityNoCompetitionsManager.
  ///
  /// In en, this message translates to:
  /// **'No ladders or leagues yet. Start one for your members.'**
  String get communityNoCompetitionsManager;

  /// No description provided for @communityNoneMatch.
  ///
  /// In en, this message translates to:
  /// **'No communities match. Try another filter, or start one.'**
  String get communityNoneMatch;

  /// No description provided for @communityNoneNearby.
  ///
  /// In en, this message translates to:
  /// **'No communities near you yet. Start one and invite the people you play with.'**
  String get communityNoneNearby;

  /// No description provided for @communityNotApprovedBody.
  ///
  /// In en, this message translates to:
  /// **'Drift didn\'t approve this community. Contact support if you think that\'s a mistake.'**
  String get communityNotApprovedBody;

  /// No description provided for @communityOwnerZone.
  ///
  /// In en, this message translates to:
  /// **'Owner'**
  String get communityOwnerZone;

  /// No description provided for @communityPhotoChosen.
  ///
  /// In en, this message translates to:
  /// **'Photo added'**
  String get communityPhotoChosen;

  /// No description provided for @communityRemove.
  ///
  /// In en, this message translates to:
  /// **'Remove from community'**
  String get communityRemove;

  /// No description provided for @communityRemoveAdmin.
  ///
  /// In en, this message translates to:
  /// **'Remove as admin'**
  String get communityRemoveAdmin;

  /// No description provided for @communityRemoveBody.
  ///
  /// In en, this message translates to:
  /// **'They\'ll leave the chat and be told they were removed. They can ask to join again.'**
  String get communityRemoveBody;

  /// No description provided for @communityRemoveTitle.
  ///
  /// In en, this message translates to:
  /// **'Remove {name}?'**
  String communityRemoveTitle(String name);

  /// No description provided for @communityReport.
  ///
  /// In en, this message translates to:
  /// **'Report community'**
  String get communityReport;

  /// No description provided for @communityReportAlsoLeave.
  ///
  /// In en, this message translates to:
  /// **'Also leave this community'**
  String get communityReportAlsoLeave;

  /// No description provided for @communityReportBody.
  ///
  /// In en, this message translates to:
  /// **'Drift\'s team will review it. The community won\'t be told who reported it.'**
  String get communityReportBody;

  /// No description provided for @communityReported.
  ///
  /// In en, this message translates to:
  /// **'Thanks — Drift will review this community.'**
  String get communityReported;

  /// No description provided for @communityReportedAndLeft.
  ///
  /// In en, this message translates to:
  /// **'Reported, and you\'ve left the community.'**
  String get communityReportedAndLeft;

  /// No description provided for @communityReportTitle.
  ///
  /// In en, this message translates to:
  /// **'Report {name}'**
  String communityReportTitle(String name);

  /// No description provided for @communityRequested.
  ///
  /// In en, this message translates to:
  /// **'Requested'**
  String get communityRequested;

  /// No description provided for @communityRequestedCancel.
  ///
  /// In en, this message translates to:
  /// **'Requested · Cancel request'**
  String get communityRequestedCancel;

  /// No description provided for @communityRequestSent.
  ///
  /// In en, this message translates to:
  /// **'Request sent. You\'ll get a notification when it\'s answered.'**
  String get communityRequestSent;

  /// No description provided for @communityRequestToJoin.
  ///
  /// In en, this message translates to:
  /// **'Request to join'**
  String get communityRequestToJoin;

  /// No description provided for @communityResults.
  ///
  /// In en, this message translates to:
  /// **'Results'**
  String get communityResults;

  /// No description provided for @communityReviewNote.
  ///
  /// In en, this message translates to:
  /// **'Drift reviews every new community before others can find it. We\'ll let you know when it\'s live.'**
  String get communityReviewNote;

  /// No description provided for @communityRoleAdmin.
  ///
  /// In en, this message translates to:
  /// **'Admin'**
  String get communityRoleAdmin;

  /// No description provided for @communityRoleMember.
  ///
  /// In en, this message translates to:
  /// **'Member'**
  String get communityRoleMember;

  /// No description provided for @communityRoleOwner.
  ///
  /// In en, this message translates to:
  /// **'Owner'**
  String get communityRoleOwner;

  /// No description provided for @communityRunBy.
  ///
  /// In en, this message translates to:
  /// **'Run by {club}'**
  String communityRunBy(String club);

  /// No description provided for @communitySave.
  ///
  /// In en, this message translates to:
  /// **'Save changes'**
  String get communitySave;

  /// No description provided for @communitySaved.
  ///
  /// In en, this message translates to:
  /// **'Saved'**
  String get communitySaved;

  /// No description provided for @communitySearchHint.
  ///
  /// In en, this message translates to:
  /// **'Search communities'**
  String get communitySearchHint;

  /// No description provided for @communityStart.
  ///
  /// In en, this message translates to:
  /// **'Start a community'**
  String get communityStart;

  /// No description provided for @communityStatusNotApproved.
  ///
  /// In en, this message translates to:
  /// **'Not approved'**
  String get communityStatusNotApproved;

  /// No description provided for @communityStatusSuspended.
  ///
  /// In en, this message translates to:
  /// **'Suspended'**
  String get communityStatusSuspended;

  /// No description provided for @communityStatusUnderReview.
  ///
  /// In en, this message translates to:
  /// **'Under review'**
  String get communityStatusUnderReview;

  /// No description provided for @communitySubmitted.
  ///
  /// In en, this message translates to:
  /// **'Submitted for review'**
  String get communitySubmitted;

  /// No description provided for @communitySuspendedBody.
  ///
  /// In en, this message translates to:
  /// **'Drift suspended this community. The chat is read-only and nobody can join while it\'s reviewed.'**
  String get communitySuspendedBody;

  /// No description provided for @communityTabAbout.
  ///
  /// In en, this message translates to:
  /// **'About'**
  String get communityTabAbout;

  /// No description provided for @communityTabChat.
  ///
  /// In en, this message translates to:
  /// **'Chat'**
  String get communityTabChat;

  /// No description provided for @communityTabCompetitions.
  ///
  /// In en, this message translates to:
  /// **'Competitions'**
  String get communityTabCompetitions;

  /// No description provided for @communityTabMembers.
  ///
  /// In en, this message translates to:
  /// **'Members'**
  String get communityTabMembers;

  /// No description provided for @communityTransfer.
  ///
  /// In en, this message translates to:
  /// **'Make owner'**
  String get communityTransfer;

  /// No description provided for @communityTransferBody.
  ///
  /// In en, this message translates to:
  /// **'They\'ll be able to manage everything, including deleting the community. You stay on as an admin.'**
  String get communityTransferBody;

  /// No description provided for @communityTransferred.
  ///
  /// In en, this message translates to:
  /// **'{name} now owns the community'**
  String communityTransferred(String name);

  /// No description provided for @communityTransferTitle.
  ///
  /// In en, this message translates to:
  /// **'Make {name} the owner?'**
  String communityTransferTitle(String name);

  /// No description provided for @communityTypeClub.
  ///
  /// In en, this message translates to:
  /// **'Club'**
  String get communityTypeClub;

  /// No description provided for @communityTypeClubHint.
  ///
  /// In en, this message translates to:
  /// **'A club\'s own members'**
  String get communityTypeClubHint;

  /// No description provided for @communityTypeLadder.
  ///
  /// In en, this message translates to:
  /// **'Ladder'**
  String get communityTypeLadder;

  /// No description provided for @communityTypeLadderHint.
  ///
  /// In en, this message translates to:
  /// **'Ongoing ranked challenges between members'**
  String get communityTypeLadderHint;

  /// No description provided for @communityTypeSocial.
  ///
  /// In en, this message translates to:
  /// **'Social'**
  String get communityTypeSocial;

  /// No description provided for @communityTypeSocialHint.
  ///
  /// In en, this message translates to:
  /// **'Casual hits and regular meetups'**
  String get communityTypeSocialHint;

  /// No description provided for @communityTypeTraining.
  ///
  /// In en, this message translates to:
  /// **'Training'**
  String get communityTypeTraining;

  /// No description provided for @communityTypeTrainingHint.
  ///
  /// In en, this message translates to:
  /// **'Clinics, drills and coached sessions'**
  String get communityTypeTrainingHint;

  /// No description provided for @communityUnderReviewBody.
  ///
  /// In en, this message translates to:
  /// **'Drift is reviewing your community. Nobody else can find or join it until it\'s approved — we\'ll send you a notification.'**
  String get communityUnderReviewBody;

  /// No description provided for @communityUnmute.
  ///
  /// In en, this message translates to:
  /// **'Unmute chat notifications'**
  String get communityUnmute;

  /// No description provided for @communityWhatItIs.
  ///
  /// In en, this message translates to:
  /// **'What kind of community is it?'**
  String get communityWhatItIs;

  /// No description provided for @communityWhoCanJoin.
  ///
  /// In en, this message translates to:
  /// **'Who can join'**
  String get communityWhoCanJoin;

  /// No description provided for @communityYourCommunities.
  ///
  /// In en, this message translates to:
  /// **'Your communities'**
  String get communityYourCommunities;

  /// No description provided for @competeBye.
  ///
  /// In en, this message translates to:
  /// **'Bye'**
  String get competeBye;

  /// No description provided for @competeByeFixture.
  ///
  /// In en, this message translates to:
  /// **'{name} — bye'**
  String competeByeFixture(String name);

  /// No description provided for @competeByeThisRound.
  ///
  /// In en, this message translates to:
  /// **'Bye this round'**
  String get competeByeThisRound;

  /// No description provided for @competeCurrentRound.
  ///
  /// In en, this message translates to:
  /// **'Current Round'**
  String get competeCurrentRound;

  /// No description provided for @competeDeadline.
  ///
  /// In en, this message translates to:
  /// **'Deadline: {date}'**
  String competeDeadline(String date);

  /// No description provided for @competeEnter.
  ///
  /// In en, this message translates to:
  /// **'Enter'**
  String get competeEnter;

  /// No description provided for @competeEvents.
  ///
  /// In en, this message translates to:
  /// **'Events'**
  String get competeEvents;

  /// No description provided for @competeFinal.
  ///
  /// In en, this message translates to:
  /// **'Final'**
  String get competeFinal;

  /// No description provided for @competeFull.
  ///
  /// In en, this message translates to:
  /// **'Full'**
  String get competeFull;

  /// No description provided for @competeJoinTournament.
  ///
  /// In en, this message translates to:
  /// **'Join tournament'**
  String get competeJoinTournament;

  /// No description provided for @competeJoinWaitlist.
  ///
  /// In en, this message translates to:
  /// **'Join Waitlist'**
  String get competeJoinWaitlist;

  /// No description provided for @competeJoinWaitlistBody.
  ///
  /// In en, this message translates to:
  /// **'You\'ll be added to the waitlist and enrolled automatically if a spot opens up.'**
  String get competeJoinWaitlistBody;

  /// No description provided for @competeJoinWaitlistQ.
  ///
  /// In en, this message translates to:
  /// **'Join the waitlist?'**
  String get competeJoinWaitlistQ;

  /// No description provided for @competeLadder.
  ///
  /// In en, this message translates to:
  /// **'Ladder'**
  String get competeLadder;

  /// No description provided for @competeLadderUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Ladder not available.'**
  String get competeLadderUnavailable;

  /// No description provided for @competeLadders.
  ///
  /// In en, this message translates to:
  /// **'Ladders'**
  String get competeLadders;

  /// No description provided for @competeLeague.
  ///
  /// In en, this message translates to:
  /// **'League'**
  String get competeLeague;

  /// No description provided for @competeLeagueUnavailable.
  ///
  /// In en, this message translates to:
  /// **'League not available.'**
  String get competeLeagueUnavailable;

  /// No description provided for @competeLeagues.
  ///
  /// In en, this message translates to:
  /// **'Leagues'**
  String get competeLeagues;

  /// No description provided for @competeLeaveWaitlist.
  ///
  /// In en, this message translates to:
  /// **'Leave waitlist'**
  String get competeLeaveWaitlist;

  /// No description provided for @competeLoadLaddersFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load ladders.'**
  String get competeLoadLaddersFailed;

  /// No description provided for @competeLoadLeaguesFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load leagues. Please try again.'**
  String get competeLoadLeaguesFailed;

  /// No description provided for @competeLoadMyLeaguesFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load your leagues.'**
  String get competeLoadMyLeaguesFailed;

  /// No description provided for @competeLoadPlayersFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load players.'**
  String get competeLoadPlayersFailed;

  /// No description provided for @competeLoadStandingsFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load standings.'**
  String get competeLoadStandingsFailed;

  /// No description provided for @competeLoadTournamentsFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load tournaments.'**
  String get competeLoadTournamentsFailed;

  /// No description provided for @competeMyLeagues.
  ///
  /// In en, this message translates to:
  /// **'My Leagues'**
  String get competeMyLeagues;

  /// No description provided for @competeNoLadders.
  ///
  /// In en, this message translates to:
  /// **'No ladders yet. Ask your club to start one.'**
  String get competeNoLadders;

  /// No description provided for @competeNoLeagues.
  ///
  /// In en, this message translates to:
  /// **'No leagues near you yet — try widening your search'**
  String get competeNoLeagues;

  /// No description provided for @competeNoMyLeagues.
  ///
  /// In en, this message translates to:
  /// **'You haven\'t joined a league yet'**
  String get competeNoMyLeagues;

  /// No description provided for @competeNoRegistrations.
  ///
  /// In en, this message translates to:
  /// **'No one has registered yet.'**
  String get competeNoRegistrations;

  /// No description provided for @competeNoRules.
  ///
  /// In en, this message translates to:
  /// **'No rules have been published for this league yet.'**
  String get competeNoRules;

  /// No description provided for @competeNoTournaments.
  ///
  /// In en, this message translates to:
  /// **'No tournaments yet. Ask your club to run one.'**
  String get competeNoTournaments;

  /// No description provided for @competeOnWaitlist.
  ///
  /// In en, this message translates to:
  /// **'On the waitlist'**
  String get competeOnWaitlist;

  /// No description provided for @competeRegister.
  ///
  /// In en, this message translates to:
  /// **'Register'**
  String get competeRegister;

  /// No description provided for @competeRegisterBody.
  ///
  /// In en, this message translates to:
  /// **'You\'ll be paired with other registered players once the league starts.'**
  String get competeRegisterBody;

  /// No description provided for @competeRegisterQ.
  ///
  /// In en, this message translates to:
  /// **'Register for this league?'**
  String get competeRegisterQ;

  /// No description provided for @competeRegisteredPlayers.
  ///
  /// In en, this message translates to:
  /// **'Registered Players'**
  String get competeRegisteredPlayers;

  /// No description provided for @competeRegistrationClosed.
  ///
  /// In en, this message translates to:
  /// **'Registration is closed for this league.'**
  String get competeRegistrationClosed;

  /// No description provided for @competeRegistrationOpensSoon.
  ///
  /// In en, this message translates to:
  /// **'Registration opens soon.'**
  String get competeRegistrationOpensSoon;

  /// No description provided for @competeRound.
  ///
  /// In en, this message translates to:
  /// **'Round'**
  String get competeRound;

  /// No description provided for @competeRoundNumber.
  ///
  /// In en, this message translates to:
  /// **'Round {number}'**
  String competeRoundNumber(int number);

  /// No description provided for @competeRoundUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Round not available.'**
  String get competeRoundUnavailable;

  /// No description provided for @competeRules.
  ///
  /// In en, this message translates to:
  /// **'Rules'**
  String get competeRules;

  /// No description provided for @competeRulesUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Rules not available.'**
  String get competeRulesUnavailable;

  /// No description provided for @competeScoringFormat.
  ///
  /// In en, this message translates to:
  /// **'Scoring format'**
  String get competeScoringFormat;

  /// No description provided for @competeSemiFinals.
  ///
  /// In en, this message translates to:
  /// **'Semi-finals'**
  String get competeSemiFinals;

  /// No description provided for @competeSpotsLeft.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 spot left} other{{count} spots left}}'**
  String competeSpotsLeft(int count);

  /// No description provided for @competeStandings.
  ///
  /// In en, this message translates to:
  /// **'Standings'**
  String get competeStandings;

  /// No description provided for @competeStandingsEmpty.
  ///
  /// In en, this message translates to:
  /// **'Standings appear once the first round is played.'**
  String get competeStandingsEmpty;

  /// No description provided for @competeTournament.
  ///
  /// In en, this message translates to:
  /// **'Tournament'**
  String get competeTournament;

  /// No description provided for @competeTournamentUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Tournament not available.'**
  String get competeTournamentUnavailable;

  /// No description provided for @competeTournaments.
  ///
  /// In en, this message translates to:
  /// **'Tournaments'**
  String get competeTournaments;

  /// No description provided for @competeUnfinishedMatches.
  ///
  /// In en, this message translates to:
  /// **'Unfinished matches'**
  String get competeUnfinishedMatches;

  /// No description provided for @competeVsFixture.
  ///
  /// In en, this message translates to:
  /// **'{a} vs {b}'**
  String competeVsFixture(String a, String b);

  /// No description provided for @competeWaitlist.
  ///
  /// In en, this message translates to:
  /// **'Waitlist'**
  String get competeWaitlist;

  /// No description provided for @competeWaitlistBody.
  ///
  /// In en, this message translates to:
  /// **'We\'ll move you in automatically if a spot opens up.'**
  String get competeWaitlistBody;

  /// No description provided for @competeWalkovers.
  ///
  /// In en, this message translates to:
  /// **'Walkovers'**
  String get competeWalkovers;

  /// No description provided for @competeWithdraw.
  ///
  /// In en, this message translates to:
  /// **'Withdraw'**
  String get competeWithdraw;

  /// No description provided for @competeWithdrawBody.
  ///
  /// In en, this message translates to:
  /// **'You can register again later, as long as registration is still open.'**
  String get competeWithdrawBody;

  /// No description provided for @competeWithdrawQ.
  ///
  /// In en, this message translates to:
  /// **'Withdraw from this league?'**
  String get competeWithdrawQ;

  /// No description provided for @competeYoureRegistered.
  ///
  /// In en, this message translates to:
  /// **'You\'re registered'**
  String get competeYoureRegistered;

  /// No description provided for @connectionsCancelRequest.
  ///
  /// In en, this message translates to:
  /// **'Cancel request'**
  String get connectionsCancelRequest;

  /// No description provided for @connectionsEmpty.
  ///
  /// In en, this message translates to:
  /// **'Connect with players to build your Tennis network'**
  String get connectionsEmpty;

  /// No description provided for @connectionsIncoming.
  ///
  /// In en, this message translates to:
  /// **'Incoming'**
  String get connectionsIncoming;

  /// No description provided for @connectionsLoadRequestsFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load your requests.'**
  String get connectionsLoadRequestsFailed;

  /// No description provided for @connectionsNoPending.
  ///
  /// In en, this message translates to:
  /// **'No pending requests'**
  String get connectionsNoPending;

  /// No description provided for @connectionsPending.
  ///
  /// In en, this message translates to:
  /// **'Pending requests'**
  String get connectionsPending;

  /// No description provided for @connectionsRequests.
  ///
  /// In en, this message translates to:
  /// **'Requests'**
  String get connectionsRequests;

  /// No description provided for @connectionsSent.
  ///
  /// In en, this message translates to:
  /// **'Sent'**
  String get connectionsSent;

  /// No description provided for @connectionsTitle.
  ///
  /// In en, this message translates to:
  /// **'Connections'**
  String get connectionsTitle;

  /// No description provided for @courtAccess.
  ///
  /// In en, this message translates to:
  /// **'Access'**
  String get courtAccess;

  /// No description provided for @courtAddress.
  ///
  /// In en, this message translates to:
  /// **'Address'**
  String get courtAddress;

  /// No description provided for @courtAmenities.
  ///
  /// In en, this message translates to:
  /// **'Amenities'**
  String get courtAmenities;

  /// No description provided for @courtBookOnline.
  ///
  /// In en, this message translates to:
  /// **'Book Online'**
  String get courtBookOnline;

  /// No description provided for @courtBookingOptions.
  ///
  /// In en, this message translates to:
  /// **'Booking Options'**
  String get courtBookingOptions;

  /// No description provided for @courtBookingOptionsLower.
  ///
  /// In en, this message translates to:
  /// **'Booking options'**
  String get courtBookingOptionsLower;

  /// No description provided for @courtDetails.
  ///
  /// In en, this message translates to:
  /// **'Details'**
  String get courtDetails;

  /// No description provided for @courtGetDirections.
  ///
  /// In en, this message translates to:
  /// **'Get Directions'**
  String get courtGetDirections;

  /// No description provided for @courtHours.
  ///
  /// In en, this message translates to:
  /// **'Hours'**
  String get courtHours;

  /// No description provided for @courtIndoor.
  ///
  /// In en, this message translates to:
  /// **'Indoor'**
  String get courtIndoor;

  /// No description provided for @courtIndoorSuffix.
  ///
  /// In en, this message translates to:
  /// **' (indoor)'**
  String get courtIndoorSuffix;

  /// No description provided for @courtList.
  ///
  /// In en, this message translates to:
  /// **'List'**
  String get courtList;

  /// No description provided for @courtLitSuffix.
  ///
  /// In en, this message translates to:
  /// **' · lit'**
  String get courtLitSuffix;

  /// No description provided for @courtLoadFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load courts. Pull to retry.'**
  String get courtLoadFailed;

  /// No description provided for @courtLocationUnknown.
  ///
  /// In en, this message translates to:
  /// **'Location unknown'**
  String get courtLocationUnknown;

  /// No description provided for @courtMap.
  ///
  /// In en, this message translates to:
  /// **'Map'**
  String get courtMap;

  /// No description provided for @courtMapUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Map tiles unavailable — switch to List to browse results.'**
  String get courtMapUnavailable;

  /// No description provided for @courtNativeBookingUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Native booking isn\'t available for this court yet.'**
  String get courtNativeBookingUnavailable;

  /// No description provided for @courtNoBookingInfo.
  ///
  /// In en, this message translates to:
  /// **'No booking info available — try contacting directly'**
  String get courtNoBookingInfo;

  /// No description provided for @courtNoPhotos.
  ///
  /// In en, this message translates to:
  /// **'No photos yet'**
  String get courtNoPhotos;

  /// No description provided for @courtNoneFound.
  ///
  /// In en, this message translates to:
  /// **'No courts found'**
  String get courtNoneFound;

  /// No description provided for @courtNoneInArea.
  ///
  /// In en, this message translates to:
  /// **'No courts found in this area'**
  String get courtNoneInArea;

  /// No description provided for @courtOutdoor.
  ///
  /// In en, this message translates to:
  /// **'Outdoor'**
  String get courtOutdoor;

  /// No description provided for @courtPhone.
  ///
  /// In en, this message translates to:
  /// **'Phone'**
  String get courtPhone;

  /// No description provided for @courtPhotos.
  ///
  /// In en, this message translates to:
  /// **'Photos'**
  String get courtPhotos;

  /// No description provided for @courtPrivate.
  ///
  /// In en, this message translates to:
  /// **'Private'**
  String get courtPrivate;

  /// No description provided for @courtPublic.
  ///
  /// In en, this message translates to:
  /// **'Public'**
  String get courtPublic;

  /// No description provided for @courtAddFavorite.
  ///
  /// In en, this message translates to:
  /// **'Add to favorites'**
  String get courtAddFavorite;

  /// No description provided for @courtBookACourt.
  ///
  /// In en, this message translates to:
  /// **'Book a court'**
  String get courtBookACourt;

  /// No description provided for @courtBookingEyebrow.
  ///
  /// In en, this message translates to:
  /// **'Booking'**
  String get courtBookingEyebrow;

  /// No description provided for @courtClosedNow.
  ///
  /// In en, this message translates to:
  /// **'Closed now'**
  String get courtClosedNow;

  /// No description provided for @courtCourtCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 court} other{{count} courts}}'**
  String courtCourtCount(int count);

  /// No description provided for @courtCourtsOfSurface.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 {surface} court} other{{count} {surface} courts}}'**
  String courtCourtsOfSurface(int count, String surface);

  /// No description provided for @courtFavoriteFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn’t update favorites. Try again.'**
  String get courtFavoriteFailed;

  /// No description provided for @courtFindTheCourt.
  ///
  /// In en, this message translates to:
  /// **'Find the court'**
  String get courtFindTheCourt;

  /// No description provided for @courtGoodToKnow.
  ///
  /// In en, this message translates to:
  /// **'Good to know'**
  String get courtGoodToKnow;

  /// No description provided for @courtInfoVerifiedFooter.
  ///
  /// In en, this message translates to:
  /// **'Venue information verified by Drift'**
  String get courtInfoVerifiedFooter;

  /// No description provided for @courtLocationEyebrow.
  ///
  /// In en, this message translates to:
  /// **'Location'**
  String get courtLocationEyebrow;

  /// No description provided for @courtOpenNow.
  ///
  /// In en, this message translates to:
  /// **'Open now'**
  String get courtOpenNow;

  /// No description provided for @courtPhotoCount.
  ///
  /// In en, this message translates to:
  /// **'{index} / {total}'**
  String courtPhotoCount(int index, int total);

  /// No description provided for @courtRemoveFavorite.
  ///
  /// In en, this message translates to:
  /// **'Remove from favorites'**
  String get courtRemoveFavorite;

  /// No description provided for @courtReportIssue.
  ///
  /// In en, this message translates to:
  /// **'Report or update court info'**
  String get courtReportIssue;

  /// No description provided for @courtShare.
  ///
  /// In en, this message translates to:
  /// **'Share court'**
  String get courtShare;

  /// No description provided for @courtShareText.
  ///
  /// In en, this message translates to:
  /// **'{name} — {address}'**
  String courtShareText(String name, String address);

  /// No description provided for @courtSurface.
  ///
  /// In en, this message translates to:
  /// **'Surface'**
  String get courtSurface;

  /// No description provided for @courtVerifiedVenue.
  ///
  /// In en, this message translates to:
  /// **'Verified venue'**
  String get courtVerifiedVenue;

  /// No description provided for @courtUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Court not available.'**
  String get courtUnavailable;

  /// No description provided for @courtUnverified.
  ///
  /// In en, this message translates to:
  /// **'Unverified'**
  String get courtUnverified;

  /// No description provided for @courtVerificationPending.
  ///
  /// In en, this message translates to:
  /// **'Verification pending'**
  String get courtVerificationPending;

  /// No description provided for @courtViewPhotos.
  ///
  /// In en, this message translates to:
  /// **'View Photos'**
  String get courtViewPhotos;

  /// No description provided for @courtVisitWebsite.
  ///
  /// In en, this message translates to:
  /// **'Visit Website'**
  String get courtVisitWebsite;

  /// No description provided for @courtWebsite.
  ///
  /// In en, this message translates to:
  /// **'Website'**
  String get courtWebsite;

  /// No description provided for @courtWhatsApp.
  ///
  /// In en, this message translates to:
  /// **'Message on WhatsApp'**
  String get courtWhatsApp;

  /// No description provided for @deleteBody.
  ///
  /// In en, this message translates to:
  /// **'You\'ll be signed out on every device immediately and other players will no longer be able to find or contact you.\n\nYour personal information is then permanently erased after 30 days. Until then, contact support if you change your mind — after that it cannot be undone.\n\nMatches you played stay on record for the other players involved, but they will no longer be linked to you.'**
  String get deleteBody;

  /// No description provided for @deleteButton.
  ///
  /// In en, this message translates to:
  /// **'Delete my account'**
  String get deleteButton;

  /// No description provided for @deleteConfirm.
  ///
  /// In en, this message translates to:
  /// **'I understand, delete my account'**
  String get deleteConfirm;

  /// No description provided for @deleteDeleting.
  ///
  /// In en, this message translates to:
  /// **'Deleting…'**
  String get deleteDeleting;

  /// No description provided for @deleteTitle.
  ///
  /// In en, this message translates to:
  /// **'This will delete your account'**
  String get deleteTitle;

  /// No description provided for @discoverClubs.
  ///
  /// In en, this message translates to:
  /// **'Clubs'**
  String get discoverClubs;

  /// No description provided for @discoverCoaches.
  ///
  /// In en, this message translates to:
  /// **'Coaches'**
  String get discoverCoaches;

  /// No description provided for @discoverCourts.
  ///
  /// In en, this message translates to:
  /// **'Courts'**
  String get discoverCourts;

  /// No description provided for @discoverFindPlayers.
  ///
  /// In en, this message translates to:
  /// **'Find players'**
  String get discoverFindPlayers;

  /// No description provided for @drawerSigningOut.
  ///
  /// In en, this message translates to:
  /// **'Signing out…'**
  String get drawerSigningOut;

  /// No description provided for @drawerViewProfile.
  ///
  /// In en, this message translates to:
  /// **'View your profile'**
  String get drawerViewProfile;

  /// No description provided for @eventsComingSoon.
  ///
  /// In en, this message translates to:
  /// **'Events coming soon'**
  String get eventsComingSoon;

  /// No description provided for @eventsComingSoonBody.
  ///
  /// In en, this message translates to:
  /// **'Club socials, clinics and mixers will appear here once your club starts running them.'**
  String get eventsComingSoonBody;

  /// No description provided for @exp1to2y.
  ///
  /// In en, this message translates to:
  /// **'1–2 years'**
  String get exp1to2y;

  /// No description provided for @exp1to2ySub.
  ///
  /// In en, this message translates to:
  /// **'Building a solid foundation'**
  String get exp1to2ySub;

  /// No description provided for @exp2to5y.
  ///
  /// In en, this message translates to:
  /// **'2–5 years'**
  String get exp2to5y;

  /// No description provided for @exp2to5ySub.
  ///
  /// In en, this message translates to:
  /// **'Developing real game sense'**
  String get exp2to5ySub;

  /// No description provided for @exp5plus.
  ///
  /// In en, this message translates to:
  /// **'5+ years'**
  String get exp5plus;

  /// No description provided for @exp5plusSub.
  ///
  /// In en, this message translates to:
  /// **'Experienced and consistent'**
  String get exp5plusSub;

  /// No description provided for @exp6to12m.
  ///
  /// In en, this message translates to:
  /// **'6–12 months'**
  String get exp6to12m;

  /// No description provided for @exp6to12mSub.
  ///
  /// In en, this message translates to:
  /// **'Getting comfortable on court'**
  String get exp6to12mSub;

  /// No description provided for @expAdvanced.
  ///
  /// In en, this message translates to:
  /// **'Competitive / Advanced'**
  String get expAdvanced;

  /// No description provided for @expAdvancedSub.
  ///
  /// In en, this message translates to:
  /// **'Tournament-level play'**
  String get expAdvancedSub;

  /// No description provided for @expNew.
  ///
  /// In en, this message translates to:
  /// **'I\'m completely new'**
  String get expNew;

  /// No description provided for @expNewSub.
  ///
  /// In en, this message translates to:
  /// **'Never held a racket'**
  String get expNewSub;

  /// No description provided for @expUnder6m.
  ///
  /// In en, this message translates to:
  /// **'Less than 6 months'**
  String get expUnder6m;

  /// No description provided for @expUnder6mSub.
  ///
  /// In en, this message translates to:
  /// **'Still learning the basics'**
  String get expUnder6mSub;

  /// No description provided for @filterAny.
  ///
  /// In en, this message translates to:
  /// **'Any'**
  String get filterAny;

  /// No description provided for @filterApply.
  ///
  /// In en, this message translates to:
  /// **'Apply filters'**
  String get filterApply;

  /// No description provided for @filterApplyCount.
  ///
  /// In en, this message translates to:
  /// **'Apply filters ({count})'**
  String filterApplyCount(int count);

  /// No description provided for @filterDistance.
  ///
  /// In en, this message translates to:
  /// **'Distance'**
  String get filterDistance;

  /// No description provided for @filterFeatures.
  ///
  /// In en, this message translates to:
  /// **'Features'**
  String get filterFeatures;

  /// No description provided for @filterFloodlit.
  ///
  /// In en, this message translates to:
  /// **'Floodlit'**
  String get filterFloodlit;

  /// No description provided for @filterHasBooking.
  ///
  /// In en, this message translates to:
  /// **'Has booking info'**
  String get filterHasBooking;

  /// No description provided for @filterIndoorOutdoor.
  ///
  /// In en, this message translates to:
  /// **'Indoor / Outdoor'**
  String get filterIndoorOutdoor;

  /// No description provided for @filterLevel.
  ///
  /// In en, this message translates to:
  /// **'Level'**
  String get filterLevel;

  /// No description provided for @filterSurface.
  ///
  /// In en, this message translates to:
  /// **'Surface'**
  String get filterSurface;

  /// No description provided for @filterTitle.
  ///
  /// In en, this message translates to:
  /// **'Filters'**
  String get filterTitle;

  /// No description provided for @formLoss.
  ///
  /// In en, this message translates to:
  /// **'L'**
  String get formLoss;

  /// No description provided for @formNoMatches.
  ///
  /// In en, this message translates to:
  /// **'No matches played yet'**
  String get formNoMatches;

  /// No description provided for @formWin.
  ///
  /// In en, this message translates to:
  /// **'W'**
  String get formWin;

  /// No description provided for @goalAchieved.
  ///
  /// In en, this message translates to:
  /// **'Achieved'**
  String get goalAchieved;

  /// No description provided for @goalBaseline.
  ///
  /// In en, this message translates to:
  /// **'Baseline'**
  String get goalBaseline;

  /// No description provided for @goalBehind.
  ///
  /// In en, this message translates to:
  /// **'Behind'**
  String get goalBehind;

  /// No description provided for @goalCoaching.
  ///
  /// In en, this message translates to:
  /// **'Find a coach'**
  String get goalCoaching;

  /// No description provided for @goalCompete.
  ///
  /// In en, this message translates to:
  /// **'Compete in leagues/tournaments'**
  String get goalCompete;

  /// No description provided for @goalDeadline.
  ///
  /// In en, this message translates to:
  /// **'Deadline'**
  String get goalDeadline;

  /// No description provided for @goalDeleteQ.
  ///
  /// In en, this message translates to:
  /// **'Delete this goal?'**
  String get goalDeleteQ;

  /// No description provided for @goalEmpty.
  ///
  /// In en, this message translates to:
  /// **'Set your first development goal'**
  String get goalEmpty;

  /// No description provided for @goalGetFit.
  ///
  /// In en, this message translates to:
  /// **'Get fitter'**
  String get goalGetFit;

  /// No description provided for @goalHaveFun.
  ///
  /// In en, this message translates to:
  /// **'Just have fun'**
  String get goalHaveFun;

  /// No description provided for @goalImproveSkills.
  ///
  /// In en, this message translates to:
  /// **'Improve my skills'**
  String get goalImproveSkills;

  /// No description provided for @goalLoadFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load goals.'**
  String get goalLoadFailed;

  /// No description provided for @goalMeetPeople.
  ///
  /// In en, this message translates to:
  /// **'Meet new players'**
  String get goalMeetPeople;

  /// No description provided for @goalMilestones.
  ///
  /// In en, this message translates to:
  /// **'Milestones'**
  String get goalMilestones;

  /// No description provided for @goalOnTrack.
  ///
  /// In en, this message translates to:
  /// **'On track'**
  String get goalOnTrack;

  /// No description provided for @goalPlayMore.
  ///
  /// In en, this message translates to:
  /// **'Play more often'**
  String get goalPlayMore;

  /// No description provided for @goalTarget.
  ///
  /// In en, this message translates to:
  /// **'Target'**
  String get goalTarget;

  /// No description provided for @goalTargetOutOf6.
  ///
  /// In en, this message translates to:
  /// **'Target {value}/6'**
  String goalTargetOutOf6(String value);

  /// No description provided for @goalTitle.
  ///
  /// In en, this message translates to:
  /// **'Goal'**
  String get goalTitle;

  /// No description provided for @goalTrackProgress.
  ///
  /// In en, this message translates to:
  /// **'Track my progress'**
  String get goalTrackProgress;

  /// No description provided for @goalCreateAddCustomMilestone.
  ///
  /// In en, this message translates to:
  /// **'Add custom milestone'**
  String get goalCreateAddCustomMilestone;

  /// No description provided for @goalCreateAddDeadline.
  ///
  /// In en, this message translates to:
  /// **'Add deadline'**
  String get goalCreateAddDeadline;

  /// No description provided for @goalCreateChange.
  ///
  /// In en, this message translates to:
  /// **'Change'**
  String get goalCreateChange;

  /// No description provided for @goalCreateChooseDate.
  ///
  /// In en, this message translates to:
  /// **'Choose a date'**
  String get goalCreateChooseDate;

  /// No description provided for @goalCreateCurrentRating.
  ///
  /// In en, this message translates to:
  /// **'Current rating'**
  String get goalCreateCurrentRating;

  /// No description provided for @goalCreateCustomDate.
  ///
  /// In en, this message translates to:
  /// **'Custom Date'**
  String get goalCreateCustomDate;

  /// No description provided for @goalCreateEdit.
  ///
  /// In en, this message translates to:
  /// **'Edit'**
  String get goalCreateEdit;

  /// No description provided for @goalCreateErrorCustomDate.
  ///
  /// In en, this message translates to:
  /// **'Choose a custom deadline or select “No deadline”.'**
  String get goalCreateErrorCustomDate;

  /// No description provided for @goalCreateErrorTargetHigher.
  ///
  /// In en, this message translates to:
  /// **'Choose a target that is higher than your current rating.'**
  String get goalCreateErrorTargetHigher;

  /// No description provided for @goalCreateFocusHeading.
  ///
  /// In en, this message translates to:
  /// **'What would you like to improve?'**
  String get goalCreateFocusHeading;

  /// No description provided for @goalCreateFocusSub.
  ///
  /// In en, this message translates to:
  /// **'Choose a focus or keep it general.'**
  String get goalCreateFocusSub;

  /// No description provided for @goalCreateFocusValue.
  ///
  /// In en, this message translates to:
  /// **'Focus: {focus}'**
  String goalCreateFocusValue(String focus);

  /// No description provided for @goalCreateImprovement.
  ///
  /// In en, this message translates to:
  /// **'+{value} improvement'**
  String goalCreateImprovement(String value);

  /// No description provided for @goalCreateMilestoneHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Practice cross-court placement'**
  String get goalCreateMilestoneHint;

  /// No description provided for @goalCreateMilestonesAdded.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{No milestones added} =1{1 milestone added} other{{count} milestones added}}'**
  String goalCreateMilestonesAdded(int count);

  /// No description provided for @goalCreateMilestonesHeading.
  ///
  /// In en, this message translates to:
  /// **'Break it into milestones'**
  String get goalCreateMilestonesHeading;

  /// No description provided for @goalCreateMilestonesSub.
  ///
  /// In en, this message translates to:
  /// **'Optional · Small achievements help you stay on track.'**
  String get goalCreateMilestonesSub;

  /// No description provided for @goalCreateNoDeadline.
  ///
  /// In en, this message translates to:
  /// **'No deadline'**
  String get goalCreateNoDeadline;

  /// No description provided for @goalCreateNone.
  ///
  /// In en, this message translates to:
  /// **'None'**
  String get goalCreateNone;

  /// No description provided for @goalCreateOptionalLater.
  ///
  /// In en, this message translates to:
  /// **'Optional · You can change this later.'**
  String get goalCreateOptionalLater;

  /// No description provided for @goalCreateRatingInfoBody.
  ///
  /// In en, this message translates to:
  /// **'Drift ratings use a 0–6 scale. Your current rating starts from your latest assessment and practice. Adjust it if it doesn’t feel right.'**
  String get goalCreateRatingInfoBody;

  /// No description provided for @goalCreateRatingInfoTitle.
  ///
  /// In en, this message translates to:
  /// **'About Drift ratings'**
  String get goalCreateRatingInfoTitle;

  /// No description provided for @goalCreateRemoveMilestone.
  ///
  /// In en, this message translates to:
  /// **'Remove milestone'**
  String get goalCreateRemoveMilestone;

  /// No description provided for @goalCreateSelectedSkill.
  ///
  /// In en, this message translates to:
  /// **'Selected skill'**
  String get goalCreateSelectedSkill;

  /// No description provided for @goalCreateSetTarget.
  ///
  /// In en, this message translates to:
  /// **'Set your target'**
  String get goalCreateSetTarget;

  /// No description provided for @goalCreateSkillHeading.
  ///
  /// In en, this message translates to:
  /// **'Choose a skill'**
  String get goalCreateSkillHeading;

  /// No description provided for @goalCreateSkillSub.
  ///
  /// In en, this message translates to:
  /// **'Select one skill to develop.'**
  String get goalCreateSkillSub;

  /// No description provided for @goalCreateStep1Subtitle.
  ///
  /// In en, this message translates to:
  /// **'What part of your tennis game would you like to improve?'**
  String get goalCreateStep1Subtitle;

  /// No description provided for @goalCreateStep1Title.
  ///
  /// In en, this message translates to:
  /// **'Create a Goal'**
  String get goalCreateStep1Title;

  /// No description provided for @goalCreateStep2Subtitle.
  ///
  /// In en, this message translates to:
  /// **'Choose the result you want to work toward.'**
  String get goalCreateStep2Subtitle;

  /// No description provided for @goalCreateStep2Title.
  ///
  /// In en, this message translates to:
  /// **'Choose Your Focus'**
  String get goalCreateStep2Title;

  /// No description provided for @goalCreateStep3Subtitle.
  ///
  /// In en, this message translates to:
  /// **'Set a meaningful target and make a plan to reach it.'**
  String get goalCreateStep3Subtitle;

  /// No description provided for @goalCreateStep3Title.
  ///
  /// In en, this message translates to:
  /// **'Build Your Goal'**
  String get goalCreateStep3Title;

  /// No description provided for @goalCreateStepOf.
  ///
  /// In en, this message translates to:
  /// **'Step {step} of {total}'**
  String goalCreateStepOf(int step, int total);

  /// No description provided for @goalCreateSubmit.
  ///
  /// In en, this message translates to:
  /// **'Create Goal'**
  String get goalCreateSubmit;

  /// No description provided for @goalCreateSummaryFocus.
  ///
  /// In en, this message translates to:
  /// **'Focus'**
  String get goalCreateSummaryFocus;

  /// No description provided for @goalCreateSummaryHeading.
  ///
  /// In en, this message translates to:
  /// **'Goal summary'**
  String get goalCreateSummaryHeading;

  /// No description provided for @goalCreateSummaryRating.
  ///
  /// In en, this message translates to:
  /// **'Rating'**
  String get goalCreateSummaryRating;

  /// No description provided for @goalCreateSummarySub.
  ///
  /// In en, this message translates to:
  /// **'Review your plan before creating it.'**
  String get goalCreateSummarySub;

  /// No description provided for @goalCreateTargetDate.
  ///
  /// In en, this message translates to:
  /// **'Target date'**
  String get goalCreateTargetDate;

  /// No description provided for @goalCreateTargetDisclaimer.
  ///
  /// In en, this message translates to:
  /// **'Your target is the skill rating you’re working toward—not an automatic performance measurement.'**
  String get goalCreateTargetDisclaimer;

  /// No description provided for @goalCreateTargetHeading.
  ///
  /// In en, this message translates to:
  /// **'Set your improvement target'**
  String get goalCreateTargetHeading;

  /// No description provided for @goalCreateTargetMustBeHigher.
  ///
  /// In en, this message translates to:
  /// **'Target must be higher'**
  String get goalCreateTargetMustBeHigher;

  /// No description provided for @goalCreateTargetRating.
  ///
  /// In en, this message translates to:
  /// **'Target rating'**
  String get goalCreateTargetRating;

  /// No description provided for @goalCreateTargetSub.
  ///
  /// In en, this message translates to:
  /// **'Move the sliders in 0.5 increments.'**
  String get goalCreateTargetSub;

  /// No description provided for @goalCreateTimeline.
  ///
  /// In en, this message translates to:
  /// **'Timeline'**
  String get goalCreateTimeline;

  /// No description provided for @goalCreateTimelineHeading.
  ///
  /// In en, this message translates to:
  /// **'When do you want to achieve this?'**
  String get goalCreateTimelineHeading;

  /// No description provided for @goalCreateWeeks.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 Week} other{{count} Weeks}}'**
  String goalCreateWeeks(int count);

  /// No description provided for @goalCreateYourGoal.
  ///
  /// In en, this message translates to:
  /// **'Your goal'**
  String get goalCreateYourGoal;

  /// No description provided for @goalCreatedAnother.
  ///
  /// In en, this message translates to:
  /// **'Create another goal'**
  String get goalCreatedAnother;

  /// No description provided for @goalCreatedBody.
  ///
  /// In en, this message translates to:
  /// **'Your {skill} goal is set. Every focused session moves you closer.'**
  String goalCreatedBody(String skill);

  /// No description provided for @goalCreatedEyebrow.
  ///
  /// In en, this message translates to:
  /// **'Goal created'**
  String get goalCreatedEyebrow;

  /// No description provided for @goalCreatedOpen.
  ///
  /// In en, this message translates to:
  /// **'Open'**
  String get goalCreatedOpen;

  /// No description provided for @goalCreatedStart.
  ///
  /// In en, this message translates to:
  /// **'Start'**
  String get goalCreatedStart;

  /// No description provided for @goalCreatedTitle.
  ///
  /// In en, this message translates to:
  /// **'You’re ready to improve.'**
  String get goalCreatedTitle;

  /// No description provided for @goalCreatedView.
  ///
  /// In en, this message translates to:
  /// **'View goal'**
  String get goalCreatedView;

  /// No description provided for @goalFocusAccuracy.
  ///
  /// In en, this message translates to:
  /// **'Accuracy'**
  String get goalFocusAccuracy;

  /// No description provided for @goalFocusAgility.
  ///
  /// In en, this message translates to:
  /// **'Agility'**
  String get goalFocusAgility;

  /// No description provided for @goalFocusApproach.
  ///
  /// In en, this message translates to:
  /// **'Approach'**
  String get goalFocusApproach;

  /// No description provided for @goalFocusBalance.
  ///
  /// In en, this message translates to:
  /// **'Balance'**
  String get goalFocusBalance;

  /// No description provided for @goalFocusClosing.
  ///
  /// In en, this message translates to:
  /// **'Closing'**
  String get goalFocusClosing;

  /// No description provided for @goalFocusComposure.
  ///
  /// In en, this message translates to:
  /// **'Composure'**
  String get goalFocusComposure;

  /// No description provided for @goalFocusConsistency.
  ///
  /// In en, this message translates to:
  /// **'Consistency'**
  String get goalFocusConsistency;

  /// No description provided for @goalFocusDepth.
  ///
  /// In en, this message translates to:
  /// **'Depth'**
  String get goalFocusDepth;

  /// No description provided for @goalFocusDescBackhandAccuracy.
  ///
  /// In en, this message translates to:
  /// **'Direct the ball with control'**
  String get goalFocusDescBackhandAccuracy;

  /// No description provided for @goalFocusDescBackhandConsistency.
  ///
  /// In en, this message translates to:
  /// **'Build a dependable backhand'**
  String get goalFocusDescBackhandConsistency;

  /// No description provided for @goalFocusDescBackhandPower.
  ///
  /// In en, this message translates to:
  /// **'Add pace and depth'**
  String get goalFocusDescBackhandPower;

  /// No description provided for @goalFocusDescBackhandTechnique.
  ///
  /// In en, this message translates to:
  /// **'Improve stroke mechanics'**
  String get goalFocusDescBackhandTechnique;

  /// No description provided for @goalFocusDescFootworkAgility.
  ///
  /// In en, this message translates to:
  /// **'Change direction efficiently'**
  String get goalFocusDescFootworkAgility;

  /// No description provided for @goalFocusDescFootworkBalance.
  ///
  /// In en, this message translates to:
  /// **'Stay controlled on the move'**
  String get goalFocusDescFootworkBalance;

  /// No description provided for @goalFocusDescFootworkPreparation.
  ///
  /// In en, this message translates to:
  /// **'Set up earlier for each shot'**
  String get goalFocusDescFootworkPreparation;

  /// No description provided for @goalFocusDescFootworkRecovery.
  ///
  /// In en, this message translates to:
  /// **'Reset after every stroke'**
  String get goalFocusDescFootworkRecovery;

  /// No description provided for @goalFocusDescForehandAccuracy.
  ///
  /// In en, this message translates to:
  /// **'Improve shot placement'**
  String get goalFocusDescForehandAccuracy;

  /// No description provided for @goalFocusDescForehandConsistency.
  ///
  /// In en, this message translates to:
  /// **'Keep more shots in play'**
  String get goalFocusDescForehandConsistency;

  /// No description provided for @goalFocusDescForehandPower.
  ///
  /// In en, this message translates to:
  /// **'Develop stronger strokes'**
  String get goalFocusDescForehandPower;

  /// No description provided for @goalFocusDescForehandTechnique.
  ///
  /// In en, this message translates to:
  /// **'Refine swing mechanics'**
  String get goalFocusDescForehandTechnique;

  /// No description provided for @goalFocusDescGeneral.
  ///
  /// In en, this message translates to:
  /// **'Work on the skill overall'**
  String get goalFocusDescGeneral;

  /// No description provided for @goalFocusDescMatchPlayClosing.
  ///
  /// In en, this message translates to:
  /// **'Finish sets with confidence'**
  String get goalFocusDescMatchPlayClosing;

  /// No description provided for @goalFocusDescMatchPlayComposure.
  ///
  /// In en, this message translates to:
  /// **'Stay present under pressure'**
  String get goalFocusDescMatchPlayComposure;

  /// No description provided for @goalFocusDescMatchPlayConsistency.
  ///
  /// In en, this message translates to:
  /// **'Reduce unforced errors'**
  String get goalFocusDescMatchPlayConsistency;

  /// No description provided for @goalFocusDescMatchPlayStrategy.
  ///
  /// In en, this message translates to:
  /// **'Build smarter point patterns'**
  String get goalFocusDescMatchPlayStrategy;

  /// No description provided for @goalFocusDescMovementBalance.
  ///
  /// In en, this message translates to:
  /// **'Stay stable through every shot'**
  String get goalFocusDescMovementBalance;

  /// No description provided for @goalFocusDescMovementEndurance.
  ///
  /// In en, this message translates to:
  /// **'Move well for longer'**
  String get goalFocusDescMovementEndurance;

  /// No description provided for @goalFocusDescMovementRecovery.
  ///
  /// In en, this message translates to:
  /// **'Return to position faster'**
  String get goalFocusDescMovementRecovery;

  /// No description provided for @goalFocusDescMovementSpeed.
  ///
  /// In en, this message translates to:
  /// **'Reach the ball sooner'**
  String get goalFocusDescMovementSpeed;

  /// No description provided for @goalFocusDescNetPlayApproach.
  ///
  /// In en, this message translates to:
  /// **'Transition forward effectively'**
  String get goalFocusDescNetPlayApproach;

  /// No description provided for @goalFocusDescNetPlayPositioning.
  ///
  /// In en, this message translates to:
  /// **'Own the right court space'**
  String get goalFocusDescNetPlayPositioning;

  /// No description provided for @goalFocusDescNetPlayTouch.
  ///
  /// In en, this message translates to:
  /// **'Improve feel and control'**
  String get goalFocusDescNetPlayTouch;

  /// No description provided for @goalFocusDescNetPlayVolleys.
  ///
  /// In en, this message translates to:
  /// **'Build confident volleys'**
  String get goalFocusDescNetPlayVolleys;

  /// No description provided for @goalFocusDescReturnConsistency.
  ///
  /// In en, this message translates to:
  /// **'Put more returns in play'**
  String get goalFocusDescReturnConsistency;

  /// No description provided for @goalFocusDescReturnDepth.
  ///
  /// In en, this message translates to:
  /// **'Keep returns deep'**
  String get goalFocusDescReturnDepth;

  /// No description provided for @goalFocusDescReturnPositioning.
  ///
  /// In en, this message translates to:
  /// **'Find a stronger return position'**
  String get goalFocusDescReturnPositioning;

  /// No description provided for @goalFocusDescReturnReaction.
  ///
  /// In en, this message translates to:
  /// **'Read and react earlier'**
  String get goalFocusDescReturnReaction;

  /// No description provided for @goalFocusDescServeConsistency.
  ///
  /// In en, this message translates to:
  /// **'Raise your first-serve rate'**
  String get goalFocusDescServeConsistency;

  /// No description provided for @goalFocusDescServePlacement.
  ///
  /// In en, this message translates to:
  /// **'Hit your service targets'**
  String get goalFocusDescServePlacement;

  /// No description provided for @goalFocusDescServePower.
  ///
  /// In en, this message translates to:
  /// **'Generate more racquet speed'**
  String get goalFocusDescServePower;

  /// No description provided for @goalFocusDescServeTechnique.
  ///
  /// In en, this message translates to:
  /// **'Improve motion and rhythm'**
  String get goalFocusDescServeTechnique;

  /// No description provided for @goalFocusEndurance.
  ///
  /// In en, this message translates to:
  /// **'Endurance'**
  String get goalFocusEndurance;

  /// No description provided for @goalFocusGeneral.
  ///
  /// In en, this message translates to:
  /// **'General improvement'**
  String get goalFocusGeneral;

  /// No description provided for @goalFocusPlacement.
  ///
  /// In en, this message translates to:
  /// **'Placement'**
  String get goalFocusPlacement;

  /// No description provided for @goalFocusPositioning.
  ///
  /// In en, this message translates to:
  /// **'Positioning'**
  String get goalFocusPositioning;

  /// No description provided for @goalFocusPower.
  ///
  /// In en, this message translates to:
  /// **'Power'**
  String get goalFocusPower;

  /// No description provided for @goalFocusPreparation.
  ///
  /// In en, this message translates to:
  /// **'Preparation'**
  String get goalFocusPreparation;

  /// No description provided for @goalFocusReaction.
  ///
  /// In en, this message translates to:
  /// **'Reaction'**
  String get goalFocusReaction;

  /// No description provided for @goalFocusRecovery.
  ///
  /// In en, this message translates to:
  /// **'Recovery'**
  String get goalFocusRecovery;

  /// No description provided for @goalFocusSpeed.
  ///
  /// In en, this message translates to:
  /// **'Speed'**
  String get goalFocusSpeed;

  /// No description provided for @goalFocusStrategy.
  ///
  /// In en, this message translates to:
  /// **'Strategy'**
  String get goalFocusStrategy;

  /// No description provided for @goalFocusTechnique.
  ///
  /// In en, this message translates to:
  /// **'Technique'**
  String get goalFocusTechnique;

  /// No description provided for @goalFocusTouch.
  ///
  /// In en, this message translates to:
  /// **'Touch'**
  String get goalFocusTouch;

  /// No description provided for @goalFocusVolleys.
  ///
  /// In en, this message translates to:
  /// **'Volleys'**
  String get goalFocusVolleys;

  /// No description provided for @goalMilestoneDrillBackhand.
  ///
  /// In en, this message translates to:
  /// **'Maintain a 10-shot backhand rally'**
  String get goalMilestoneDrillBackhand;

  /// No description provided for @goalMilestoneDrillFootwork.
  ///
  /// In en, this message translates to:
  /// **'Finish a full shadow-swing footwork circuit'**
  String get goalMilestoneDrillFootwork;

  /// No description provided for @goalMilestoneDrillForehand.
  ///
  /// In en, this message translates to:
  /// **'Maintain a 10-shot forehand rally'**
  String get goalMilestoneDrillForehand;

  /// No description provided for @goalMilestoneDrillMatchPlay.
  ///
  /// In en, this message translates to:
  /// **'Use the chosen focus in a full match'**
  String get goalMilestoneDrillMatchPlay;

  /// No description provided for @goalMilestoneDrillMovement.
  ///
  /// In en, this message translates to:
  /// **'Finish a full-court movement drill with control'**
  String get goalMilestoneDrillMovement;

  /// No description provided for @goalMilestoneDrillNetPlay.
  ///
  /// In en, this message translates to:
  /// **'Finish a 10-volley exchange at the net'**
  String get goalMilestoneDrillNetPlay;

  /// No description provided for @goalMilestoneDrillReturn.
  ///
  /// In en, this message translates to:
  /// **'Return 8 of 10 practice serves'**
  String get goalMilestoneDrillReturn;

  /// No description provided for @goalMilestoneDrillServe.
  ///
  /// In en, this message translates to:
  /// **'Land 7 of 10 first serves in the target area'**
  String get goalMilestoneDrillServe;

  /// No description provided for @goalMilestoneReachTarget.
  ///
  /// In en, this message translates to:
  /// **'Reach your {skill} rating target'**
  String goalMilestoneReachTarget(String skill);

  /// No description provided for @goalMilestoneSessionsBackhand.
  ///
  /// In en, this message translates to:
  /// **'Complete three backhand-focused practice sessions'**
  String get goalMilestoneSessionsBackhand;

  /// No description provided for @goalMilestoneSessionsFootwork.
  ///
  /// In en, this message translates to:
  /// **'Complete three footwork-focused practice sessions'**
  String get goalMilestoneSessionsFootwork;

  /// No description provided for @goalMilestoneSessionsForehand.
  ///
  /// In en, this message translates to:
  /// **'Complete three forehand-focused practice sessions'**
  String get goalMilestoneSessionsForehand;

  /// No description provided for @goalMilestoneSessionsMatchPlay.
  ///
  /// In en, this message translates to:
  /// **'Play three focused practice sets'**
  String get goalMilestoneSessionsMatchPlay;

  /// No description provided for @goalMilestoneSessionsMovement.
  ///
  /// In en, this message translates to:
  /// **'Complete three movement-focused practice sessions'**
  String get goalMilestoneSessionsMovement;

  /// No description provided for @goalMilestoneSessionsNetPlay.
  ///
  /// In en, this message translates to:
  /// **'Complete three net-play practice sessions'**
  String get goalMilestoneSessionsNetPlay;

  /// No description provided for @goalMilestoneSessionsReturn.
  ///
  /// In en, this message translates to:
  /// **'Complete three return-focused practice sessions'**
  String get goalMilestoneSessionsReturn;

  /// No description provided for @goalMilestoneSessionsServe.
  ///
  /// In en, this message translates to:
  /// **'Complete three serve-focused practice sessions'**
  String get goalMilestoneSessionsServe;

  /// No description provided for @goalUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Goal not available.'**
  String get goalUnavailable;

  /// No description provided for @handLeftHanded.
  ///
  /// In en, this message translates to:
  /// **'Left-handed'**
  String get handLeftHanded;

  /// No description provided for @handRightHanded.
  ///
  /// In en, this message translates to:
  /// **'Right-handed'**
  String get handRightHanded;

  /// No description provided for @helpBody.
  ///
  /// In en, this message translates to:
  /// **'Read the current FAQs for Drift Tennis. This opens the same answers published on our website.'**
  String get helpBody;

  /// No description provided for @helpOpenFailed.
  ///
  /// In en, this message translates to:
  /// **'Unable to open FAQs right now.'**
  String get helpOpenFailed;

  /// No description provided for @helpOpenFaqs.
  ///
  /// In en, this message translates to:
  /// **'Open FAQs'**
  String get helpOpenFaqs;

  /// No description provided for @helpTitle.
  ///
  /// In en, this message translates to:
  /// **'Questions, answered.'**
  String get helpTitle;

  /// No description provided for @homeBook.
  ///
  /// In en, this message translates to:
  /// **'Book'**
  String get homeBook;

  /// No description provided for @homeBrowse.
  ///
  /// In en, this message translates to:
  /// **'Browse'**
  String get homeBrowse;

  /// No description provided for @homeCourtsNearYou.
  ///
  /// In en, this message translates to:
  /// **'Courts near you'**
  String get homeCourtsNearYou;

  /// No description provided for @homeFindAMatch.
  ///
  /// In en, this message translates to:
  /// **'Find a match'**
  String get homeFindAMatch;

  /// No description provided for @homeFindMore.
  ///
  /// In en, this message translates to:
  /// **'Find more'**
  String get homeFindMore;

  /// No description provided for @homeGreeting.
  ///
  /// In en, this message translates to:
  /// **'Hi, {name}'**
  String homeGreeting(String name);

  /// No description provided for @homeLoadFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load your Home feed. Please try again.'**
  String get homeLoadFailed;

  /// No description provided for @homeMapView.
  ///
  /// In en, this message translates to:
  /// **'Map view'**
  String get homeMapView;

  /// No description provided for @homeNeedsYou.
  ///
  /// In en, this message translates to:
  /// **'Needs you'**
  String get homeNeedsYou;

  /// No description provided for @homeNextMatch.
  ///
  /// In en, this message translates to:
  /// **'Next match'**
  String get homeNextMatch;

  /// No description provided for @homeNextPrefix.
  ///
  /// In en, this message translates to:
  /// **'Next: '**
  String get homeNextPrefix;

  /// No description provided for @homeNoCourts.
  ///
  /// In en, this message translates to:
  /// **'No courts nearby yet.'**
  String get homeNoCourts;

  /// No description provided for @homeNoMatches.
  ///
  /// In en, this message translates to:
  /// **'No matches scheduled yet.'**
  String get homeNoMatches;

  /// No description provided for @homeNoPlayers.
  ///
  /// In en, this message translates to:
  /// **'No players nearby yet.'**
  String get homeNoPlayers;

  /// No description provided for @homePlayersNearYou.
  ///
  /// In en, this message translates to:
  /// **'Players near you'**
  String get homePlayersNearYou;

  /// No description provided for @homeProgressEmpty.
  ///
  /// In en, this message translates to:
  /// **'Play matches and log practice to start earning achievements.'**
  String get homeProgressEmpty;

  /// No description provided for @homeProgressTo.
  ///
  /// In en, this message translates to:
  /// **'Progress to {level}'**
  String homeProgressTo(String level);

  /// No description provided for @homeQuickActions.
  ///
  /// In en, this message translates to:
  /// **'Quick actions'**
  String get homeQuickActions;

  /// No description provided for @homeRating.
  ///
  /// In en, this message translates to:
  /// **'Rating'**
  String get homeRating;

  /// No description provided for @homeReview.
  ///
  /// In en, this message translates to:
  /// **'Review'**
  String get homeReview;

  /// No description provided for @homeStatDoubles.
  ///
  /// In en, this message translates to:
  /// **'DOUBLES'**
  String get homeStatDoubles;

  /// No description provided for @homeStatLevel.
  ///
  /// In en, this message translates to:
  /// **'LEVEL'**
  String get homeStatLevel;

  /// No description provided for @homeStatSingles.
  ///
  /// In en, this message translates to:
  /// **'SINGLES'**
  String get homeStatSingles;

  /// No description provided for @homeTennisNews.
  ///
  /// In en, this message translates to:
  /// **'Tennis news'**
  String get homeTennisNews;

  /// No description provided for @homeWelcomeBack.
  ///
  /// In en, this message translates to:
  /// **'Welcome back'**
  String get homeWelcomeBack;

  /// No description provided for @homeYourProgress.
  ///
  /// In en, this message translates to:
  /// **'Your progress'**
  String get homeYourProgress;

  /// No description provided for @introGetStarted.
  ///
  /// In en, this message translates to:
  /// **'Get Started'**
  String get introGetStarted;

  /// No description provided for @introSlide1Body.
  ///
  /// In en, this message translates to:
  /// **'Stay connected to every match, result, and tournament update as your tennis community keeps moving.'**
  String get introSlide1Body;

  /// No description provided for @introSlide1Title.
  ///
  /// In en, this message translates to:
  /// **'The Game\nNever Stops'**
  String get introSlide1Title;

  /// No description provided for @introSlide2Body.
  ///
  /// In en, this message translates to:
  /// **'Track your progress, sharpen your skills, and build better habits with insights made for your tennis journey.'**
  String get introSlide2Body;

  /// No description provided for @introSlide2Title.
  ///
  /// In en, this message translates to:
  /// **'Advance\nYour Game'**
  String get introSlide2Title;

  /// No description provided for @introSlide3Body.
  ///
  /// In en, this message translates to:
  /// **'Discover players, clubs, and competitions near you, then step onto the court with confidence.'**
  String get introSlide3Body;

  /// No description provided for @introSlide3Title.
  ///
  /// In en, this message translates to:
  /// **'Start Your\nTennis Journey'**
  String get introSlide3Title;

  /// No description provided for @leagueJoined.
  ///
  /// In en, this message translates to:
  /// **'Joined'**
  String get leagueJoined;

  /// No description provided for @leagueMemberCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 member} other{{count} members}}'**
  String leagueMemberCount(int count);

  /// No description provided for @leagueMembersOfCapacity.
  ///
  /// In en, this message translates to:
  /// **'{count}/{capacity} members'**
  String leagueMembersOfCapacity(int count, int capacity);

  /// No description provided for @leagueWaitlisted.
  ///
  /// In en, this message translates to:
  /// **'Waitlisted'**
  String get leagueWaitlisted;

  /// No description provided for @learnBrowseBySkill.
  ///
  /// In en, this message translates to:
  /// **'Browse by skill'**
  String get learnBrowseBySkill;

  /// No description provided for @learnContentLoadFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load content.'**
  String get learnContentLoadFailed;

  /// No description provided for @learnContentUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Content not available.'**
  String get learnContentUnavailable;

  /// No description provided for @learnFeaturedLessons.
  ///
  /// In en, this message translates to:
  /// **'Featured lessons'**
  String get learnFeaturedLessons;

  /// No description provided for @learnGoals.
  ///
  /// In en, this message translates to:
  /// **'Goals'**
  String get learnGoals;

  /// No description provided for @learnGoalsSub.
  ///
  /// In en, this message translates to:
  /// **'Set and monitor targets'**
  String get learnGoalsSub;

  /// No description provided for @learnLessonsFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load lessons. Pull down to try again.'**
  String get learnLessonsFailed;

  /// No description provided for @learnLessonsComingSoon.
  ///
  /// In en, this message translates to:
  /// **'Lessons coming soon'**
  String get learnLessonsComingSoon;

  /// No description provided for @learnLessonsComingSoonBody.
  ///
  /// In en, this message translates to:
  /// **'We\'re preparing coaching lessons and drills. Check back soon.'**
  String get learnLessonsComingSoonBody;

  /// No description provided for @learnLogDrill.
  ///
  /// In en, this message translates to:
  /// **'Log this drill in Practice'**
  String get learnLogDrill;

  /// No description provided for @learnMarkComplete.
  ///
  /// In en, this message translates to:
  /// **'Mark Complete'**
  String get learnMarkComplete;

  /// No description provided for @learnMarkedComplete.
  ///
  /// In en, this message translates to:
  /// **'Marked complete.'**
  String get learnMarkedComplete;

  /// No description provided for @learnMarking.
  ///
  /// In en, this message translates to:
  /// **'Marking…'**
  String get learnMarking;

  /// No description provided for @learnNoContentFilter.
  ///
  /// In en, this message translates to:
  /// **'No content yet for this filter'**
  String get learnNoContentFilter;

  /// No description provided for @learnNoData.
  ///
  /// In en, this message translates to:
  /// **'No data yet'**
  String get learnNoData;

  /// No description provided for @learnPlanUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Plan not available.'**
  String get learnPlanUnavailable;

  /// No description provided for @learnPracticeLog.
  ///
  /// In en, this message translates to:
  /// **'Practice Log'**
  String get learnPracticeLog;

  /// No description provided for @learnPracticeLogSub.
  ///
  /// In en, this message translates to:
  /// **'Review past sessions'**
  String get learnPracticeLogSub;

  /// No description provided for @learnProgressReport.
  ///
  /// In en, this message translates to:
  /// **'Progress Report'**
  String get learnProgressReport;

  /// No description provided for @learnProgressReportSub.
  ///
  /// In en, this message translates to:
  /// **'See how far you\'ve come'**
  String get learnProgressReportSub;

  /// No description provided for @learnSkillProfile.
  ///
  /// In en, this message translates to:
  /// **'Skill Profile'**
  String get learnSkillProfile;

  /// No description provided for @learnSkillProfileSub.
  ///
  /// In en, this message translates to:
  /// **'Track your strengths'**
  String get learnSkillProfileSub;

  /// No description provided for @learnSteps.
  ///
  /// In en, this message translates to:
  /// **'Steps'**
  String get learnSteps;

  /// No description provided for @learnTrainingPlan.
  ///
  /// In en, this message translates to:
  /// **'Training Plan'**
  String get learnTrainingPlan;

  /// No description provided for @learnWatchVideo.
  ///
  /// In en, this message translates to:
  /// **'Watch video'**
  String get learnWatchVideo;

  /// No description provided for @legalBody.
  ///
  /// In en, this message translates to:
  /// **'The current legal documents for the Drift Tennis app and website are published here. They always open the latest approved version.'**
  String get legalBody;

  /// No description provided for @legalDataPrivacy.
  ///
  /// In en, this message translates to:
  /// **'Data Privacy Notice'**
  String get legalDataPrivacy;

  /// No description provided for @legalHeading.
  ///
  /// In en, this message translates to:
  /// **'Terms and privacy'**
  String get legalHeading;

  /// No description provided for @legalOpenFailed.
  ///
  /// In en, this message translates to:
  /// **'Unable to open the legal document right now.'**
  String get legalOpenFailed;

  /// No description provided for @legalPrivacy.
  ///
  /// In en, this message translates to:
  /// **'Privacy Policy'**
  String get legalPrivacy;

  /// No description provided for @legalTerms.
  ///
  /// In en, this message translates to:
  /// **'Terms and Conditions'**
  String get legalTerms;

  /// No description provided for @legalTitle.
  ///
  /// In en, this message translates to:
  /// **'Legal'**
  String get legalTitle;

  /// No description provided for @levelAdvanced.
  ///
  /// In en, this message translates to:
  /// **'Advanced'**
  String get levelAdvanced;

  /// No description provided for @levelAll.
  ///
  /// In en, this message translates to:
  /// **'All levels'**
  String get levelAll;

  /// No description provided for @levelBeginner.
  ///
  /// In en, this message translates to:
  /// **'Beginner'**
  String get levelBeginner;

  /// No description provided for @levelFoundational.
  ///
  /// In en, this message translates to:
  /// **'Foundational'**
  String get levelFoundational;

  /// No description provided for @levelIntermediate.
  ///
  /// In en, this message translates to:
  /// **'Intermediate'**
  String get levelIntermediate;

  /// No description provided for @locationDenied.
  ///
  /// In en, this message translates to:
  /// **'Location permission was denied.'**
  String get locationDenied;

  /// No description provided for @locationServicesOff.
  ///
  /// In en, this message translates to:
  /// **'Location services are turned off.'**
  String get locationServicesOff;

  /// No description provided for @matchAcceptTheirVersion.
  ///
  /// In en, this message translates to:
  /// **'Accept their version'**
  String get matchAcceptTheirVersion;

  /// No description provided for @matchAddNote.
  ///
  /// In en, this message translates to:
  /// **'Add a note (optional)'**
  String get matchAddNote;

  /// No description provided for @matchAddSet.
  ///
  /// In en, this message translates to:
  /// **'Add a set'**
  String get matchAddSet;

  /// No description provided for @matchCancelMatch.
  ///
  /// In en, this message translates to:
  /// **'Cancel match'**
  String get matchCancelMatch;

  /// No description provided for @matchChallenge.
  ///
  /// In en, this message translates to:
  /// **'Challenge'**
  String get matchChallenge;

  /// No description provided for @matchChoosePartner.
  ///
  /// In en, this message translates to:
  /// **'Choose your doubles partner.'**
  String get matchChoosePartner;

  /// No description provided for @matchChooseYourPartner.
  ///
  /// In en, this message translates to:
  /// **'Choose your partner'**
  String get matchChooseYourPartner;

  /// No description provided for @matchConfidence.
  ///
  /// In en, this message translates to:
  /// **'Confidence'**
  String get matchConfidence;

  /// No description provided for @matchConnectFirst.
  ///
  /// In en, this message translates to:
  /// **'Connect with a player first to partner with them.'**
  String get matchConnectFirst;

  /// No description provided for @matchCourt.
  ///
  /// In en, this message translates to:
  /// **'Court'**
  String get matchCourt;

  /// No description provided for @matchCourtName.
  ///
  /// In en, this message translates to:
  /// **'Court name'**
  String get matchCourtName;

  /// No description provided for @matchDifferentResults.
  ///
  /// In en, this message translates to:
  /// **'You and your opponent submitted different results.'**
  String get matchDifferentResults;

  /// No description provided for @matchDispute.
  ///
  /// In en, this message translates to:
  /// **'Dispute'**
  String get matchDispute;

  /// No description provided for @matchDisputeIntro.
  ///
  /// In en, this message translates to:
  /// **'You and your opponent submitted different results. Accept their version if it\'s right, or revise yours.'**
  String get matchDisputeIntro;

  /// No description provided for @matchEnterResult.
  ///
  /// In en, this message translates to:
  /// **'Enter Result'**
  String get matchEnterResult;

  /// No description provided for @matchHowDidItFeel.
  ///
  /// In en, this message translates to:
  /// **'How did it feel?'**
  String get matchHowDidItFeel;

  /// No description provided for @matchLoadConnectionsFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load your connections.'**
  String get matchLoadConnectionsFailed;

  /// No description provided for @matchLoadFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load this match.'**
  String get matchLoadFailed;

  /// No description provided for @matchLoadMatchesFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load your matches.'**
  String get matchLoadMatchesFailed;

  /// No description provided for @matchOpponentPicksPartner.
  ///
  /// In en, this message translates to:
  /// **'{name} picks their own partner when they accept.'**
  String matchOpponentPicksPartner(String name);

  /// No description provided for @matchParticipantDeclined.
  ///
  /// In en, this message translates to:
  /// **'Declined'**
  String get matchParticipantDeclined;

  /// No description provided for @matchParticipantIn.
  ///
  /// In en, this message translates to:
  /// **'In'**
  String get matchParticipantIn;

  /// No description provided for @matchParticipantInvited.
  ///
  /// In en, this message translates to:
  /// **'Invited'**
  String get matchParticipantInvited;

  /// No description provided for @matchPickATime.
  ///
  /// In en, this message translates to:
  /// **'Pick a time'**
  String get matchPickATime;

  /// No description provided for @matchPlayers.
  ///
  /// In en, this message translates to:
  /// **'Players'**
  String get matchPlayers;

  /// No description provided for @matchProposeTimes.
  ///
  /// In en, this message translates to:
  /// **'Propose Times'**
  String get matchProposeTimes;

  /// No description provided for @matchRematch.
  ///
  /// In en, this message translates to:
  /// **'Rematch'**
  String get matchRematch;

  /// No description provided for @matchReschedule.
  ///
  /// In en, this message translates to:
  /// **'Reschedule'**
  String get matchReschedule;

  /// No description provided for @matchResult.
  ///
  /// In en, this message translates to:
  /// **'Result'**
  String get matchResult;

  /// No description provided for @matchResultDisputed.
  ///
  /// In en, this message translates to:
  /// **'Result disputed'**
  String get matchResultDisputed;

  /// No description provided for @matchRetirement.
  ///
  /// In en, this message translates to:
  /// **'Retirement'**
  String get matchRetirement;

  /// No description provided for @matchReviseVersion.
  ///
  /// In en, this message translates to:
  /// **'Revise your version'**
  String get matchReviseVersion;

  /// No description provided for @matchRoundBanner.
  ///
  /// In en, this message translates to:
  /// **'Round {round} · {league}'**
  String matchRoundBanner(int round, String league);

  /// No description provided for @matchRoundsUsed.
  ///
  /// In en, this message translates to:
  /// **'You\'ve used all your proposal rounds — sort the rest out in chat.'**
  String get matchRoundsUsed;

  /// No description provided for @matchScore.
  ///
  /// In en, this message translates to:
  /// **'Score'**
  String get matchScore;

  /// No description provided for @matchSendChallenge.
  ///
  /// In en, this message translates to:
  /// **'Send Challenge'**
  String get matchSendChallenge;

  /// No description provided for @matchSetNumber.
  ///
  /// In en, this message translates to:
  /// **'Set {number}'**
  String matchSetNumber(int number);

  /// No description provided for @matchSport.
  ///
  /// In en, this message translates to:
  /// **'Sport'**
  String get matchSport;

  /// No description provided for @matchStateCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get matchStateCancelled;

  /// No description provided for @matchStateCompleted.
  ///
  /// In en, this message translates to:
  /// **'Played'**
  String get matchStateCompleted;

  /// No description provided for @matchStateDisputed.
  ///
  /// In en, this message translates to:
  /// **'Disputed'**
  String get matchStateDisputed;

  /// No description provided for @matchStateExpired.
  ///
  /// In en, this message translates to:
  /// **'Expired'**
  String get matchStateExpired;

  /// No description provided for @matchStateProposed.
  ///
  /// In en, this message translates to:
  /// **'Awaiting reply'**
  String get matchStateProposed;

  /// No description provided for @matchStateRescheduled.
  ///
  /// In en, this message translates to:
  /// **'Rescheduling'**
  String get matchStateRescheduled;

  /// No description provided for @matchStateRetired.
  ///
  /// In en, this message translates to:
  /// **'Retired'**
  String get matchStateRetired;

  /// No description provided for @matchStateScheduled.
  ///
  /// In en, this message translates to:
  /// **'Scheduled'**
  String get matchStateScheduled;

  /// No description provided for @matchStateScheduling.
  ///
  /// In en, this message translates to:
  /// **'Agreeing a time'**
  String get matchStateScheduling;

  /// No description provided for @matchStateWalkover.
  ///
  /// In en, this message translates to:
  /// **'Walkover'**
  String get matchStateWalkover;

  /// No description provided for @matchSuggest.
  ///
  /// In en, this message translates to:
  /// **'Suggest'**
  String get matchSuggest;

  /// No description provided for @matchSuggestACourt.
  ///
  /// In en, this message translates to:
  /// **'Suggest a court'**
  String get matchSuggestACourt;

  /// No description provided for @matchSuggestCourt.
  ///
  /// In en, this message translates to:
  /// **'Suggest court'**
  String get matchSuggestCourt;

  /// No description provided for @matchSuggestDifferentTimes.
  ///
  /// In en, this message translates to:
  /// **'Suggest different times'**
  String get matchSuggestDifferentTimes;

  /// No description provided for @matchTapToConfirm.
  ///
  /// In en, this message translates to:
  /// **'Tap a time to confirm the match.'**
  String get matchTapToConfirm;

  /// No description provided for @matchTheirVersion.
  ///
  /// In en, this message translates to:
  /// **'Their version'**
  String get matchTheirVersion;

  /// No description provided for @matchTiebreakShort.
  ///
  /// In en, this message translates to:
  /// **'TB'**
  String get matchTiebreakShort;

  /// No description provided for @matchTimeTbc.
  ///
  /// In en, this message translates to:
  /// **'Time to be confirmed'**
  String get matchTimeTbc;

  /// No description provided for @matchTitle.
  ///
  /// In en, this message translates to:
  /// **'Match'**
  String get matchTitle;

  /// No description provided for @matchUndoChallenge.
  ///
  /// In en, this message translates to:
  /// **'Undo challenge'**
  String get matchUndoChallenge;

  /// No description provided for @matchUnplayedWalkover.
  ///
  /// In en, this message translates to:
  /// **'Unplayed — walkover'**
  String get matchUnplayedWalkover;

  /// No description provided for @matchUnplayedWalkoverBody.
  ///
  /// In en, this message translates to:
  /// **'The round deadline passed before this fixture was played. It\'s recorded as a walkover in favour of neither player.'**
  String get matchUnplayedWalkoverBody;

  /// No description provided for @matchViewDispute.
  ///
  /// In en, this message translates to:
  /// **'View dispute'**
  String get matchViewDispute;

  /// No description provided for @matchWaitingChoose.
  ///
  /// In en, this message translates to:
  /// **'Waiting for them to choose.'**
  String get matchWaitingChoose;

  /// No description provided for @matchWaitingConfirm.
  ///
  /// In en, this message translates to:
  /// **'Waiting for them to confirm.'**
  String get matchWaitingConfirm;

  /// No description provided for @matchWalkoverNeither.
  ///
  /// In en, this message translates to:
  /// **'A walkover is recorded in favour of neither player.'**
  String get matchWalkoverNeither;

  /// No description provided for @matchWalkoverRetirement.
  ///
  /// In en, this message translates to:
  /// **'Walkover / Retirement'**
  String get matchWalkoverRetirement;

  /// No description provided for @matchWhatHappened.
  ///
  /// In en, this message translates to:
  /// **'What happened?'**
  String get matchWhatHappened;

  /// No description provided for @matchWhoWon.
  ///
  /// In en, this message translates to:
  /// **'Who won?'**
  String get matchWhoWon;

  /// No description provided for @matchYouSuffix.
  ///
  /// In en, this message translates to:
  /// **' (you)'**
  String get matchYouSuffix;

  /// No description provided for @matchYourOpponent.
  ///
  /// In en, this message translates to:
  /// **'Your opponent'**
  String get matchYourOpponent;

  /// No description provided for @matchYourPartner.
  ///
  /// In en, this message translates to:
  /// **'Your partner'**
  String get matchYourPartner;

  /// No description provided for @matchYourProposedTimes.
  ///
  /// In en, this message translates to:
  /// **'Your proposed times'**
  String get matchYourProposedTimes;

  /// No description provided for @matchYourVersion.
  ///
  /// In en, this message translates to:
  /// **'Your version'**
  String get matchYourVersion;

  /// No description provided for @messagingChat.
  ///
  /// In en, this message translates to:
  /// **'Chat'**
  String get messagingChat;

  /// No description provided for @messagingConnectFirst.
  ///
  /// In en, this message translates to:
  /// **'Connect or challenge {name} before messaging.'**
  String messagingConnectFirst(String name);

  /// No description provided for @messagingConversation.
  ///
  /// In en, this message translates to:
  /// **'Conversation'**
  String get messagingConversation;

  /// No description provided for @messagingEmpty.
  ///
  /// In en, this message translates to:
  /// **'No conversations yet — connect with a player to start one'**
  String get messagingEmpty;

  /// No description provided for @messagingLoadConversationFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load this conversation.'**
  String get messagingLoadConversationFailed;

  /// No description provided for @messagingLoadFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load your messages.'**
  String get messagingLoadFailed;

  /// No description provided for @messagingMinChars.
  ///
  /// In en, this message translates to:
  /// **'Type at least two letters of a name.'**
  String get messagingMinChars;

  /// No description provided for @messagingNewMessage.
  ///
  /// In en, this message translates to:
  /// **'New message'**
  String get messagingNewMessage;

  /// No description provided for @messagingNoSearchResults.
  ///
  /// In en, this message translates to:
  /// **'No conversations match your search'**
  String get messagingNoSearchResults;

  /// No description provided for @messagingSayHello.
  ///
  /// In en, this message translates to:
  /// **'Say hello'**
  String get messagingSayHello;

  /// No description provided for @messagingSearch.
  ///
  /// In en, this message translates to:
  /// **'Search messages'**
  String get messagingSearch;

  /// No description provided for @messagingSearchPlayers.
  ///
  /// In en, this message translates to:
  /// **'Search players by name'**
  String get messagingSearchPlayers;

  /// No description provided for @messagingSearchPlayersFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t search players right now.'**
  String get messagingSearchPlayersFailed;

  /// No description provided for @messagingSystemMessage.
  ///
  /// In en, this message translates to:
  /// **'System message'**
  String get messagingSystemMessage;

  /// No description provided for @messagingUnread.
  ///
  /// In en, this message translates to:
  /// **'Unread'**
  String get messagingUnread;

  /// No description provided for @messagingViewNamed.
  ///
  /// In en, this message translates to:
  /// **'View {name}'**
  String messagingViewNamed(String name);

  /// No description provided for @messagingViewRelatedLeague.
  ///
  /// In en, this message translates to:
  /// **'View related league'**
  String get messagingViewRelatedLeague;

  /// No description provided for @messagingViewRelatedMatch.
  ///
  /// In en, this message translates to:
  /// **'View related match'**
  String get messagingViewRelatedMatch;

  /// No description provided for @navAchievements.
  ///
  /// In en, this message translates to:
  /// **'Achievements'**
  String get navAchievements;

  /// No description provided for @navCommunity.
  ///
  /// In en, this message translates to:
  /// **'Community'**
  String get navCommunity;

  /// No description provided for @navDiscover.
  ///
  /// In en, this message translates to:
  /// **'Discover'**
  String get navDiscover;

  /// No description provided for @navHome.
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get navHome;

  /// No description provided for @navLearn.
  ///
  /// In en, this message translates to:
  /// **'Learn'**
  String get navLearn;

  /// No description provided for @navMessages.
  ///
  /// In en, this message translates to:
  /// **'Messages'**
  String get navMessages;

  /// No description provided for @navMyProfile.
  ///
  /// In en, this message translates to:
  /// **'My Profile'**
  String get navMyProfile;

  /// No description provided for @navMySportsHub.
  ///
  /// In en, this message translates to:
  /// **'My Sports Hub'**
  String get navMySportsHub;

  /// No description provided for @navNews.
  ///
  /// In en, this message translates to:
  /// **'News'**
  String get navNews;

  /// No description provided for @navNotifications.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get navNotifications;

  /// No description provided for @navPlay.
  ///
  /// In en, this message translates to:
  /// **'Play'**
  String get navPlay;

  /// No description provided for @navSettings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get navSettings;

  /// No description provided for @newsArtwork.
  ///
  /// In en, this message translates to:
  /// **'Tennis news artwork'**
  String get newsArtwork;

  /// No description provided for @newsBrokenLink.
  ///
  /// In en, this message translates to:
  /// **'That source link looks broken.'**
  String get newsBrokenLink;

  /// No description provided for @newsCurated.
  ///
  /// In en, this message translates to:
  /// **'Curated for you'**
  String get newsCurated;

  /// No description provided for @newsDaysAgo.
  ///
  /// In en, this message translates to:
  /// **'{days}d ago'**
  String newsDaysAgo(int days);

  /// No description provided for @newsFreshOffCourt.
  ///
  /// In en, this message translates to:
  /// **'FRESH OFF THE COURT'**
  String get newsFreshOffCourt;

  /// No description provided for @newsLatest.
  ///
  /// In en, this message translates to:
  /// **'Latest'**
  String get newsLatest;

  /// No description provided for @newsLatestStories.
  ///
  /// In en, this message translates to:
  /// **'Latest stories'**
  String get newsLatestStories;

  /// No description provided for @newsLoadFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load news. Pull to retry.'**
  String get newsLoadFailed;

  /// No description provided for @newsLoadMore.
  ///
  /// In en, this message translates to:
  /// **'Load more stories'**
  String get newsLoadMore;

  /// No description provided for @newsLoadMoreFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not load more stories. Try again.'**
  String get newsLoadMoreFailed;

  /// No description provided for @newsLoadSavedFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load saved stories.'**
  String get newsLoadSavedFailed;

  /// No description provided for @newsNoStories.
  ///
  /// In en, this message translates to:
  /// **'No stories in this category yet'**
  String get newsNoStories;

  /// No description provided for @newsOfflineSaved.
  ///
  /// In en, this message translates to:
  /// **'Offline news saved {date}'**
  String newsOfflineSaved(String date);

  /// No description provided for @newsOpenInBrowser.
  ///
  /// In en, this message translates to:
  /// **'Open in browser'**
  String get newsOpenInBrowser;

  /// No description provided for @newsOpenSource.
  ///
  /// In en, this message translates to:
  /// **'Open Original Source'**
  String get newsOpenSource;

  /// No description provided for @newsRead.
  ///
  /// In en, this message translates to:
  /// **'Read'**
  String get newsRead;

  /// No description provided for @newsReadStory.
  ///
  /// In en, this message translates to:
  /// **'Read story'**
  String get newsReadStory;

  /// No description provided for @newsRecently.
  ///
  /// In en, this message translates to:
  /// **'Recently'**
  String get newsRecently;

  /// No description provided for @newsRemoveFromSaved.
  ///
  /// In en, this message translates to:
  /// **'Remove from saved'**
  String get newsRemoveFromSaved;

  /// No description provided for @newsRemoveFromSavedTitle.
  ///
  /// In en, this message translates to:
  /// **'Remove from Saved'**
  String get newsRemoveFromSavedTitle;

  /// No description provided for @newsSaveForLater.
  ///
  /// In en, this message translates to:
  /// **'Save stories to read later'**
  String get newsSaveForLater;

  /// No description provided for @newsSaveStory.
  ///
  /// In en, this message translates to:
  /// **'Save story'**
  String get newsSaveStory;

  /// No description provided for @newsSavedStories.
  ///
  /// In en, this message translates to:
  /// **'Saved stories'**
  String get newsSavedStories;

  /// No description provided for @newsSavedStoriesTitle.
  ///
  /// In en, this message translates to:
  /// **'Saved Stories'**
  String get newsSavedStoriesTitle;

  /// No description provided for @newsStories.
  ///
  /// In en, this message translates to:
  /// **'Stories'**
  String get newsStories;

  /// No description provided for @newsStory.
  ///
  /// In en, this message translates to:
  /// **'Story'**
  String get newsStory;

  /// No description provided for @newsStoryUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Story not available.'**
  String get newsStoryUnavailable;

  /// No description provided for @notifCaughtUp.
  ///
  /// In en, this message translates to:
  /// **'You\'re all caught up.'**
  String get notifCaughtUp;

  /// No description provided for @notifClearAll.
  ///
  /// In en, this message translates to:
  /// **'Clear all'**
  String get notifClearAll;

  /// No description provided for @notifClearAllBody.
  ///
  /// In en, this message translates to:
  /// **'This removes every notification from this list. New notifications will still arrive.'**
  String get notifClearAllBody;

  /// No description provided for @notifClearAllQ.
  ///
  /// In en, this message translates to:
  /// **'Clear all notifications?'**
  String get notifClearAllQ;

  /// No description provided for @notifDeleteBody.
  ///
  /// In en, this message translates to:
  /// **'This notification will be removed from this list.'**
  String get notifDeleteBody;

  /// No description provided for @notifDeleteQ.
  ///
  /// In en, this message translates to:
  /// **'Delete notification?'**
  String get notifDeleteQ;

  /// No description provided for @notifLoadFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load notifications.'**
  String get notifLoadFailed;

  /// No description provided for @notifMarkAllRead.
  ///
  /// In en, this message translates to:
  /// **'Mark all as read'**
  String get notifMarkAllRead;

  /// No description provided for @notifNothingToOpen.
  ///
  /// In en, this message translates to:
  /// **'Nothing further to open for this update.'**
  String get notifNothingToOpen;

  /// No description provided for @notifPrefAnnouncements.
  ///
  /// In en, this message translates to:
  /// **'News and updates from the Drift team'**
  String get notifPrefAnnouncements;

  /// No description provided for @notifPrefClubs.
  ///
  /// In en, this message translates to:
  /// **'Announcements and membership updates from your clubs'**
  String get notifPrefClubs;

  /// No description provided for @notifPrefCommunities.
  ///
  /// In en, this message translates to:
  /// **'Approvals, join requests and new competitions in your communities'**
  String get notifPrefCommunities;

  /// No description provided for @notifPrefCompetitions.
  ///
  /// In en, this message translates to:
  /// **'New rounds and results in your leagues'**
  String get notifPrefCompetitions;

  /// No description provided for @notifPrefConnections.
  ///
  /// In en, this message translates to:
  /// **'Requests to connect, and accepted connections'**
  String get notifPrefConnections;

  /// No description provided for @notifPrefLearning.
  ///
  /// In en, this message translates to:
  /// **'Goals, plans, and practice reminders'**
  String get notifPrefLearning;

  /// No description provided for @notifPrefLearningTitle.
  ///
  /// In en, this message translates to:
  /// **'Learning'**
  String get notifPrefLearningTitle;

  /// No description provided for @notifPrefLoadFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load your preferences.'**
  String get notifPrefLoadFailed;

  /// No description provided for @notifPrefMatches.
  ///
  /// In en, this message translates to:
  /// **'New challenges and match updates'**
  String get notifPrefMatches;

  /// No description provided for @notifPrefMatchesTitle.
  ///
  /// In en, this message translates to:
  /// **'Matches'**
  String get notifPrefMatchesTitle;

  /// No description provided for @notifPrefMessages.
  ///
  /// In en, this message translates to:
  /// **'New messages in your chats'**
  String get notifPrefMessages;

  /// No description provided for @notifPrefNews.
  ///
  /// In en, this message translates to:
  /// **'Tennis news and stories'**
  String get notifPrefNews;

  /// No description provided for @onbAdjustLevel.
  ///
  /// In en, this message translates to:
  /// **'Adjust level'**
  String get onbAdjustLevel;

  /// No description provided for @onbAdjustLevelTitle.
  ///
  /// In en, this message translates to:
  /// **'Adjust Level'**
  String get onbAdjustLevelTitle;

  /// No description provided for @onbAllSet.
  ///
  /// In en, this message translates to:
  /// **'You\'re all set!'**
  String get onbAllSet;

  /// No description provided for @onbAllSetBody.
  ///
  /// In en, this message translates to:
  /// **'Your Tennis Profile is ready. Start exploring players, courts, and matches near you.'**
  String get onbAllSetBody;

  /// No description provided for @onbAvailabilityHighlight.
  ///
  /// In en, this message translates to:
  /// **'play?'**
  String get onbAvailabilityHighlight;

  /// No description provided for @onbAvailabilitySubtitle.
  ///
  /// In en, this message translates to:
  /// **'Tap the slots you are usually free. You can change these any time.'**
  String get onbAvailabilitySubtitle;

  /// No description provided for @onbAvailabilityTitle.
  ///
  /// In en, this message translates to:
  /// **'When can you play?'**
  String get onbAvailabilityTitle;

  /// No description provided for @onbBasicHighlight.
  ///
  /// In en, this message translates to:
  /// **'you'**
  String get onbBasicHighlight;

  /// No description provided for @onbBasicSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Just the basics. You can change any of it later.'**
  String get onbBasicSubtitle;

  /// No description provided for @onbBasicTitle.
  ///
  /// In en, this message translates to:
  /// **'Tell us about you'**
  String get onbBasicTitle;

  /// No description provided for @onbChooseEachSection.
  ///
  /// In en, this message translates to:
  /// **'Choose an option in each section to continue.'**
  String get onbChooseEachSection;

  /// No description provided for @onbChooseHand.
  ///
  /// In en, this message translates to:
  /// **'Choose your playing hand to continue.'**
  String get onbChooseHand;

  /// No description provided for @onbChooseOption.
  ///
  /// In en, this message translates to:
  /// **'Please choose an option to continue.'**
  String get onbChooseOption;

  /// No description provided for @onbClubHighlight.
  ///
  /// In en, this message translates to:
  /// **'play?'**
  String get onbClubHighlight;

  /// No description provided for @onbClubName.
  ///
  /// In en, this message translates to:
  /// **'Club name (optional)'**
  String get onbClubName;

  /// No description provided for @onbClubSubtitle.
  ///
  /// In en, this message translates to:
  /// **'No club yet? Skip this one.'**
  String get onbClubSubtitle;

  /// No description provided for @onbClubTitle.
  ///
  /// In en, this message translates to:
  /// **'Where do you play?'**
  String get onbClubTitle;

  /// No description provided for @onbConfirmLevel.
  ///
  /// In en, this message translates to:
  /// **'Confirm level'**
  String get onbConfirmLevel;

  /// No description provided for @onbEnterLocation.
  ///
  /// In en, this message translates to:
  /// **'Enter your general location to continue.'**
  String get onbEnterLocation;

  /// No description provided for @onbExperienceHighlight.
  ///
  /// In en, this message translates to:
  /// **'experience?'**
  String get onbExperienceHighlight;

  /// No description provided for @onbExperienceSubtitle.
  ///
  /// In en, this message translates to:
  /// **'We\'ll personalize your training to match your level.'**
  String get onbExperienceSubtitle;

  /// No description provided for @onbExperienceTitle.
  ///
  /// In en, this message translates to:
  /// **'What\'s your tennis experience?'**
  String get onbExperienceTitle;

  /// No description provided for @onbFormat.
  ///
  /// In en, this message translates to:
  /// **'Format'**
  String get onbFormat;

  /// No description provided for @onbGeneralLocation.
  ///
  /// In en, this message translates to:
  /// **'General location / city'**
  String get onbGeneralLocation;

  /// No description provided for @onbGoHome.
  ///
  /// In en, this message translates to:
  /// **'Go to Home'**
  String get onbGoHome;

  /// No description provided for @onbGoalsHighlight.
  ///
  /// In en, this message translates to:
  /// **'Drift?'**
  String get onbGoalsHighlight;

  /// No description provided for @onbGoalsSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Pick as many as you like. This only shapes what we suggest.'**
  String get onbGoalsSubtitle;

  /// No description provided for @onbGoalsTitle.
  ///
  /// In en, this message translates to:
  /// **'What brings you to Drift?'**
  String get onbGoalsTitle;

  /// No description provided for @onbHandAmbidextrous.
  ///
  /// In en, this message translates to:
  /// **'Ambidextrous'**
  String get onbHandAmbidextrous;

  /// No description provided for @onbHandLeft.
  ///
  /// In en, this message translates to:
  /// **'Left'**
  String get onbHandLeft;

  /// No description provided for @onbHandRight.
  ///
  /// In en, this message translates to:
  /// **'Right'**
  String get onbHandRight;

  /// No description provided for @onbLoadDetailsFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load your details. Please try again.'**
  String get onbLoadDetailsFailed;

  /// No description provided for @onbLocateFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t determine your location. Enter it manually below.'**
  String get onbLocateFailed;

  /// No description provided for @onbLocating.
  ///
  /// In en, this message translates to:
  /// **'Locating…'**
  String get onbLocating;

  /// No description provided for @onbLocationHighlight.
  ///
  /// In en, this message translates to:
  /// **'based?'**
  String get onbLocationHighlight;

  /// No description provided for @onbLocationSubtitle.
  ///
  /// In en, this message translates to:
  /// **'We use this to find players and courts near you.'**
  String get onbLocationSubtitle;

  /// No description provided for @onbLocationTitle.
  ///
  /// In en, this message translates to:
  /// **'Where are you based?'**
  String get onbLocationTitle;

  /// No description provided for @onbPadelHighlight.
  ///
  /// In en, this message translates to:
  /// **'padel?'**
  String get onbPadelHighlight;

  /// No description provided for @onbPadelLearn.
  ///
  /// In en, this message translates to:
  /// **'I\'d like to learn'**
  String get onbPadelLearn;

  /// No description provided for @onbPadelLearnSub.
  ///
  /// In en, this message translates to:
  /// **'Open to picking it up'**
  String get onbPadelLearnSub;

  /// No description provided for @onbPadelNo.
  ///
  /// In en, this message translates to:
  /// **'No, just tennis'**
  String get onbPadelNo;

  /// No description provided for @onbPadelNoSub.
  ///
  /// In en, this message translates to:
  /// **'Sticking to the classics'**
  String get onbPadelNoSub;

  /// No description provided for @onbPadelSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Padel is coming to Drift soon — let us know if you play or want to learn.'**
  String get onbPadelSubtitle;

  /// No description provided for @onbPadelTitle.
  ///
  /// In en, this message translates to:
  /// **'Do you also play padel?'**
  String get onbPadelTitle;

  /// No description provided for @onbPadelYes.
  ///
  /// In en, this message translates to:
  /// **'Yes, I play padel'**
  String get onbPadelYes;

  /// No description provided for @onbPadelYesSub.
  ///
  /// In en, this message translates to:
  /// **'Already on the court'**
  String get onbPadelYesSub;

  /// No description provided for @onbPlayingHand.
  ///
  /// In en, this message translates to:
  /// **'Playing hand'**
  String get onbPlayingHand;

  /// No description provided for @onbPreferredCourt.
  ///
  /// In en, this message translates to:
  /// **'Preferred court (optional)'**
  String get onbPreferredCourt;

  /// No description provided for @onbPreferredTimes.
  ///
  /// In en, this message translates to:
  /// **'Preferred times'**
  String get onbPreferredTimes;

  /// No description provided for @onbPrefsHighlight.
  ///
  /// In en, this message translates to:
  /// **'play?'**
  String get onbPrefsHighlight;

  /// No description provided for @onbPrefsSubtitle.
  ///
  /// In en, this message translates to:
  /// **'This shapes who we match you with.'**
  String get onbPrefsSubtitle;

  /// No description provided for @onbPrefsTitle.
  ///
  /// In en, this message translates to:
  /// **'How do you like to play?'**
  String get onbPrefsTitle;

  /// No description provided for @onbSelectAll.
  ///
  /// In en, this message translates to:
  /// **'select all that apply'**
  String get onbSelectAll;

  /// No description provided for @onbStepOf.
  ///
  /// In en, this message translates to:
  /// **'STEP {step} OF {total}'**
  String onbStepOf(int step, int total);

  /// No description provided for @onbStyle.
  ///
  /// In en, this message translates to:
  /// **'Style'**
  String get onbStyle;

  /// No description provided for @onbSuggestedHighlight.
  ///
  /// In en, this message translates to:
  /// **'level'**
  String get onbSuggestedHighlight;

  /// No description provided for @onbSuggestedLevel.
  ///
  /// In en, this message translates to:
  /// **'Suggested: {level}'**
  String onbSuggestedLevel(String level);

  /// No description provided for @onbSuggestedSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Based on your answers, this is where we think you fit. You can adjust it any time from your profile.'**
  String get onbSuggestedSubtitle;

  /// No description provided for @onbSuggestedTitle.
  ///
  /// In en, this message translates to:
  /// **'Your suggested level'**
  String get onbSuggestedTitle;

  /// No description provided for @onbTimeBlockAm.
  ///
  /// In en, this message translates to:
  /// **'AM'**
  String get onbTimeBlockAm;

  /// No description provided for @onbTimeBlockMid.
  ///
  /// In en, this message translates to:
  /// **'Mid'**
  String get onbTimeBlockMid;

  /// No description provided for @onbTimeBlockPm.
  ///
  /// In en, this message translates to:
  /// **'PM'**
  String get onbTimeBlockPm;

  /// No description provided for @onbUseCurrentLocation.
  ///
  /// In en, this message translates to:
  /// **'Use current location'**
  String get onbUseCurrentLocation;

  /// No description provided for @optCompetitive.
  ///
  /// In en, this message translates to:
  /// **'Competitive'**
  String get optCompetitive;

  /// No description provided for @optDoubles.
  ///
  /// In en, this message translates to:
  /// **'Doubles'**
  String get optDoubles;

  /// No description provided for @optEither.
  ///
  /// In en, this message translates to:
  /// **'Either'**
  String get optEither;

  /// No description provided for @optSingles.
  ///
  /// In en, this message translates to:
  /// **'Singles'**
  String get optSingles;

  /// No description provided for @optSocial.
  ///
  /// In en, this message translates to:
  /// **'Social'**
  String get optSocial;

  /// No description provided for @padelAdd.
  ///
  /// In en, this message translates to:
  /// **'Add Padel'**
  String get padelAdd;

  /// No description provided for @padelAddBody.
  ///
  /// In en, this message translates to:
  /// **'You\'ll complete a short adaptive assessment scoped to Padel — rally consistency, net play, wall shots, and more. It generates a Padel Profile that\'s fully separate from your Tennis Profile.'**
  String get padelAddBody;

  /// No description provided for @padelAddHeading.
  ///
  /// In en, this message translates to:
  /// **'Add Padel to your profile'**
  String get padelAddHeading;

  /// No description provided for @padelAdding.
  ///
  /// In en, this message translates to:
  /// **'Adding…'**
  String get padelAdding;

  /// No description provided for @padelAssessment.
  ///
  /// In en, this message translates to:
  /// **'Padel Assessment'**
  String get padelAssessment;

  /// No description provided for @padelCompleteAssessment.
  ///
  /// In en, this message translates to:
  /// **'Complete the assessment to get a rating'**
  String get padelCompleteAssessment;

  /// No description provided for @padelGoalsHint.
  ///
  /// In en, this message translates to:
  /// **'Comma-separated, e.g. Improve my bandeja, Play weekly'**
  String get padelGoalsHint;

  /// No description provided for @padelHistoryEmpty.
  ///
  /// In en, this message translates to:
  /// **'Play your first Padel match to start building history'**
  String get padelHistoryEmpty;

  /// No description provided for @padelHistoryFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load your Padel match history.'**
  String get padelHistoryFailed;

  /// No description provided for @padelMatchHistory.
  ///
  /// In en, this message translates to:
  /// **'Padel Match History'**
  String get padelMatchHistory;

  /// No description provided for @padelNotAdded.
  ///
  /// In en, this message translates to:
  /// **'Padel hasn\'t been added yet.'**
  String get padelNotAdded;

  /// No description provided for @padelPartnerHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Looking for a regular doubles partner'**
  String get padelPartnerHint;

  /// No description provided for @padelPartnerPreference.
  ///
  /// In en, this message translates to:
  /// **'Partner preference'**
  String get padelPartnerPreference;

  /// No description provided for @padelPartnerPreferenceValue.
  ///
  /// In en, this message translates to:
  /// **'Partner preference: {value}'**
  String padelPartnerPreferenceValue(String value);

  /// No description provided for @padelPillarBandeja.
  ///
  /// In en, this message translates to:
  /// **'Bandeja'**
  String get padelPillarBandeja;

  /// No description provided for @padelPillarNetControl.
  ///
  /// In en, this message translates to:
  /// **'Net Control'**
  String get padelPillarNetControl;

  /// No description provided for @padelPillarOverhead.
  ///
  /// In en, this message translates to:
  /// **'Overhead'**
  String get padelPillarOverhead;

  /// No description provided for @padelPillarPartnerCommunication.
  ///
  /// In en, this message translates to:
  /// **'Partner Communication'**
  String get padelPillarPartnerCommunication;

  /// No description provided for @padelPillarPositioning.
  ///
  /// In en, this message translates to:
  /// **'Positioning'**
  String get padelPillarPositioning;

  /// No description provided for @padelPillarRallyConsistency.
  ///
  /// In en, this message translates to:
  /// **'Rally Consistency'**
  String get padelPillarRallyConsistency;

  /// No description provided for @padelPillarSmash.
  ///
  /// In en, this message translates to:
  /// **'Smash'**
  String get padelPillarSmash;

  /// No description provided for @padelPillarTacticalAwareness.
  ///
  /// In en, this message translates to:
  /// **'Tactical Awareness'**
  String get padelPillarTacticalAwareness;

  /// No description provided for @padelPillarTransition.
  ///
  /// In en, this message translates to:
  /// **'Transition'**
  String get padelPillarTransition;

  /// No description provided for @padelPillarVibora.
  ///
  /// In en, this message translates to:
  /// **'Vibora'**
  String get padelPillarVibora;

  /// No description provided for @padelPillarWallUsage.
  ///
  /// In en, this message translates to:
  /// **'Wall Usage'**
  String get padelPillarWallUsage;

  /// No description provided for @padelPreferences.
  ///
  /// In en, this message translates to:
  /// **'Preferences'**
  String get padelPreferences;

  /// No description provided for @padelPreferredSide.
  ///
  /// In en, this message translates to:
  /// **'Preferred side'**
  String get padelPreferredSide;

  /// No description provided for @padelPreferredSideValue.
  ///
  /// In en, this message translates to:
  /// **'Preferred side: {side}'**
  String padelPreferredSideValue(String side);

  /// No description provided for @padelPrefsGoals.
  ///
  /// In en, this message translates to:
  /// **'Preferences & Goals'**
  String get padelPrefsGoals;

  /// No description provided for @padelProfile.
  ///
  /// In en, this message translates to:
  /// **'Padel Profile'**
  String get padelProfile;

  /// No description provided for @padelProfileFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load your Padel profile.'**
  String get padelProfileFailed;

  /// No description provided for @padelSkillProfile.
  ///
  /// In en, this message translates to:
  /// **'Skill profile'**
  String get padelSkillProfile;

  /// No description provided for @padelStartAssessment.
  ///
  /// In en, this message translates to:
  /// **'Start Padel Assessment'**
  String get padelStartAssessment;

  /// No description provided for @padelYourStats.
  ///
  /// In en, this message translates to:
  /// **'Your Padel stats'**
  String get padelYourStats;

  /// No description provided for @payActive.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get payActive;

  /// No description provided for @payAddMethod.
  ///
  /// In en, this message translates to:
  /// **'Add method'**
  String get payAddMethod;

  /// No description provided for @payAddPaymentMethod.
  ///
  /// In en, this message translates to:
  /// **'Add payment method'**
  String get payAddPaymentMethod;

  /// No description provided for @payAmount.
  ///
  /// In en, this message translates to:
  /// **'Amount'**
  String get payAmount;

  /// No description provided for @payBillingHistory.
  ///
  /// In en, this message translates to:
  /// **'Billing history'**
  String get payBillingHistory;

  /// No description provided for @payBillingHistoryFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load your billing history.'**
  String get payBillingHistoryFailed;

  /// No description provided for @payCard.
  ///
  /// In en, this message translates to:
  /// **'Card'**
  String get payCard;

  /// No description provided for @payCardBrand.
  ///
  /// In en, this message translates to:
  /// **'Card brand'**
  String get payCardBrand;

  /// No description provided for @payCardBrandHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Visa'**
  String get payCardBrandHint;

  /// No description provided for @payCardLast4.
  ///
  /// In en, this message translates to:
  /// **'Tokenized card — last four digits'**
  String get payCardLast4;

  /// No description provided for @payChangePlan.
  ///
  /// In en, this message translates to:
  /// **'Change plan'**
  String get payChangePlan;

  /// No description provided for @payChargesReceipts.
  ///
  /// In en, this message translates to:
  /// **'Charges and receipts'**
  String get payChargesReceipts;

  /// No description provided for @payChooseFree.
  ///
  /// In en, this message translates to:
  /// **'Choose Free'**
  String get payChooseFree;

  /// No description provided for @payChoosePlan.
  ///
  /// In en, this message translates to:
  /// **'Choose a plan'**
  String get payChoosePlan;

  /// No description provided for @payCreated.
  ///
  /// In en, this message translates to:
  /// **'Created'**
  String get payCreated;

  /// No description provided for @payCurrent.
  ///
  /// In en, this message translates to:
  /// **'Current'**
  String get payCurrent;

  /// No description provided for @payCurrentPlan.
  ///
  /// In en, this message translates to:
  /// **'Current plan'**
  String get payCurrentPlan;

  /// No description provided for @payDate.
  ///
  /// In en, this message translates to:
  /// **'Date'**
  String get payDate;

  /// No description provided for @payDefault.
  ///
  /// In en, this message translates to:
  /// **'Default'**
  String get payDefault;

  /// No description provided for @payDownloadReceipt.
  ///
  /// In en, this message translates to:
  /// **'Download receipt'**
  String get payDownloadReceipt;

  /// No description provided for @payFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed'**
  String get payFailed;

  /// No description provided for @payFailureReason.
  ///
  /// In en, this message translates to:
  /// **'Failure reason'**
  String get payFailureReason;

  /// No description provided for @payFourDigits.
  ///
  /// In en, this message translates to:
  /// **'Enter exactly four digits.'**
  String get payFourDigits;

  /// No description provided for @payFree.
  ///
  /// In en, this message translates to:
  /// **'Free'**
  String get payFree;

  /// No description provided for @payFreeBeta.
  ///
  /// In en, this message translates to:
  /// **'Free during beta'**
  String get payFreeBeta;

  /// No description provided for @payIncluded.
  ///
  /// In en, this message translates to:
  /// **'Included'**
  String get payIncluded;

  /// No description provided for @payInvoice.
  ///
  /// In en, this message translates to:
  /// **'Invoice'**
  String get payInvoice;

  /// No description provided for @payManageMethods.
  ///
  /// In en, this message translates to:
  /// **'Manage payment methods'**
  String get payManageMethods;

  /// No description provided for @payMethodsFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load your payment methods.'**
  String get payMethodsFailed;

  /// No description provided for @payMobileLast4.
  ///
  /// In en, this message translates to:
  /// **'Tokenized mobile number — last four digits'**
  String get payMobileLast4;

  /// No description provided for @payMobileMoney.
  ///
  /// In en, this message translates to:
  /// **'Mobile money'**
  String get payMobileMoney;

  /// No description provided for @payNoBillingHistory.
  ///
  /// In en, this message translates to:
  /// **'No billing history yet'**
  String get payNoBillingHistory;

  /// No description provided for @payNoChargesBeta.
  ///
  /// In en, this message translates to:
  /// **'No charges during beta.'**
  String get payNoChargesBeta;

  /// No description provided for @payNoMethod.
  ///
  /// In en, this message translates to:
  /// **'No payment method saved'**
  String get payNoMethod;

  /// No description provided for @payNoMethodBody.
  ///
  /// In en, this message translates to:
  /// **'Add a tokenized card or mobile-money method to choose a paid plan.'**
  String get payNoMethodBody;

  /// No description provided for @payNotAvailable.
  ///
  /// In en, this message translates to:
  /// **'Not available'**
  String get payNotAvailable;

  /// No description provided for @payPaid.
  ///
  /// In en, this message translates to:
  /// **'Paid'**
  String get payPaid;

  /// No description provided for @payPastDue.
  ///
  /// In en, this message translates to:
  /// **'Past due'**
  String get payPastDue;

  /// No description provided for @payPaymentMethod.
  ///
  /// In en, this message translates to:
  /// **'Payment method'**
  String get payPaymentMethod;

  /// No description provided for @payPaymentMethods.
  ///
  /// In en, this message translates to:
  /// **'Payment methods'**
  String get payPaymentMethods;

  /// No description provided for @payPerMonth.
  ///
  /// In en, this message translates to:
  /// **'{amount} / month'**
  String payPerMonth(String amount);

  /// No description provided for @payPerYear.
  ///
  /// In en, this message translates to:
  /// **'{amount} / year'**
  String payPerYear(String amount);

  /// No description provided for @payPeriod.
  ///
  /// In en, this message translates to:
  /// **'Period'**
  String get payPeriod;

  /// No description provided for @payPeriodEnds.
  ///
  /// In en, this message translates to:
  /// **'Current period ends {date}'**
  String payPeriodEnds(String date);

  /// No description provided for @payPeriodRange.
  ///
  /// In en, this message translates to:
  /// **'{start} to {end}'**
  String payPeriodRange(String start, String end);

  /// No description provided for @payPlan.
  ///
  /// In en, this message translates to:
  /// **'Plan'**
  String get payPlan;

  /// No description provided for @payPlansFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load available plans.'**
  String get payPlansFailed;

  /// No description provided for @payProcessing.
  ///
  /// In en, this message translates to:
  /// **'Processing…'**
  String get payProcessing;

  /// No description provided for @payProviderReference.
  ///
  /// In en, this message translates to:
  /// **'Provider reference'**
  String get payProviderReference;

  /// No description provided for @payReceipt.
  ///
  /// In en, this message translates to:
  /// **'Receipt'**
  String get payReceipt;

  /// No description provided for @payReceiptHeading.
  ///
  /// In en, this message translates to:
  /// **'Drift Tennis receipt'**
  String get payReceiptHeading;

  /// No description provided for @payReceiptSaveFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not save the receipt. Please retry.'**
  String get payReceiptSaveFailed;

  /// No description provided for @payReceiptSaved.
  ///
  /// In en, this message translates to:
  /// **'Receipt saved to {path}'**
  String payReceiptSaved(String path);

  /// No description provided for @payReceiptsAppear.
  ///
  /// In en, this message translates to:
  /// **'Receipts will appear here after your first paid plan change.'**
  String get payReceiptsAppear;

  /// No description provided for @payRemove.
  ///
  /// In en, this message translates to:
  /// **'Remove'**
  String get payRemove;

  /// No description provided for @payRemoveMethodQ.
  ///
  /// In en, this message translates to:
  /// **'Remove payment method?'**
  String get payRemoveMethodQ;

  /// No description provided for @payRemoveNamed.
  ///
  /// In en, this message translates to:
  /// **'Remove {name}'**
  String payRemoveNamed(String name);

  /// No description provided for @payRetryPayment.
  ///
  /// In en, this message translates to:
  /// **'Retry payment'**
  String get payRetryPayment;

  /// No description provided for @paySaveMethod.
  ///
  /// In en, this message translates to:
  /// **'Save method'**
  String get paySaveMethod;

  /// No description provided for @paySelectAndPay.
  ///
  /// In en, this message translates to:
  /// **'Select and pay'**
  String get paySelectAndPay;

  /// No description provided for @payStatus.
  ///
  /// In en, this message translates to:
  /// **'Status'**
  String get payStatus;

  /// No description provided for @paySubscriptionFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load your subscription.'**
  String get paySubscriptionFailed;

  /// No description provided for @payTokenNote.
  ///
  /// In en, this message translates to:
  /// **'Drift stores only the provider token and these display digits. Full payment credentials never reach Drift.'**
  String get payTokenNote;

  /// No description provided for @payUpgradePlan.
  ///
  /// In en, this message translates to:
  /// **'Upgrade plan'**
  String get payUpgradePlan;

  /// No description provided for @payVoid.
  ///
  /// In en, this message translates to:
  /// **'Void'**
  String get payVoid;

  /// No description provided for @pillarBackhand.
  ///
  /// In en, this message translates to:
  /// **'Backhand'**
  String get pillarBackhand;

  /// No description provided for @pillarCompetitionExperience.
  ///
  /// In en, this message translates to:
  /// **'Competition Experience'**
  String get pillarCompetitionExperience;

  /// No description provided for @pillarFitness.
  ///
  /// In en, this message translates to:
  /// **'Fitness'**
  String get pillarFitness;

  /// No description provided for @pillarFootwork.
  ///
  /// In en, this message translates to:
  /// **'Footwork'**
  String get pillarFootwork;

  /// No description provided for @pillarForehand.
  ///
  /// In en, this message translates to:
  /// **'Forehand'**
  String get pillarForehand;

  /// No description provided for @pillarMatchPlay.
  ///
  /// In en, this message translates to:
  /// **'Match Play'**
  String get pillarMatchPlay;

  /// No description provided for @pillarMental.
  ///
  /// In en, this message translates to:
  /// **'Mental'**
  String get pillarMental;

  /// No description provided for @pillarMovement.
  ///
  /// In en, this message translates to:
  /// **'Movement'**
  String get pillarMovement;

  /// No description provided for @pillarNetPlay.
  ///
  /// In en, this message translates to:
  /// **'Net Play'**
  String get pillarNetPlay;

  /// No description provided for @pillarReturn.
  ///
  /// In en, this message translates to:
  /// **'Return'**
  String get pillarReturn;

  /// No description provided for @pillarServe.
  ///
  /// In en, this message translates to:
  /// **'Serve'**
  String get pillarServe;

  /// No description provided for @pillarTactics.
  ///
  /// In en, this message translates to:
  /// **'Tactics'**
  String get pillarTactics;

  /// No description provided for @pillarVolley.
  ///
  /// In en, this message translates to:
  /// **'Volley'**
  String get pillarVolley;

  /// No description provided for @playActiveEmpty.
  ///
  /// In en, this message translates to:
  /// **'No upcoming matches — challenge someone to get started.'**
  String get playActiveEmpty;

  /// No description provided for @playChallengeWithdrawn.
  ///
  /// In en, this message translates to:
  /// **'Challenge withdrawn.'**
  String get playChallengeWithdrawn;

  /// No description provided for @playChallengesEmpty.
  ///
  /// In en, this message translates to:
  /// **'No open challenges — find a player and send one.'**
  String get playChallengesEmpty;

  /// No description provided for @playCompetitionRound.
  ///
  /// In en, this message translates to:
  /// **'{name} · Round {round}'**
  String playCompetitionRound(String name, int round);

  /// No description provided for @playFindOpponent.
  ///
  /// In en, this message translates to:
  /// **'Find opponent'**
  String get playFindOpponent;

  /// No description provided for @playHistoryEmpty.
  ///
  /// In en, this message translates to:
  /// **'Play your first match to start building history.'**
  String get playHistoryEmpty;

  /// No description provided for @playLoadPlayersFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load players. Pull to retry.'**
  String get playLoadPlayersFailed;

  /// No description provided for @playNoPlayersFound.
  ///
  /// In en, this message translates to:
  /// **'No players found.'**
  String get playNoPlayersFound;

  /// No description provided for @playRespond.
  ///
  /// In en, this message translates to:
  /// **'Respond'**
  String get playRespond;

  /// No description provided for @playSegmentMatches.
  ///
  /// In en, this message translates to:
  /// **'Matches'**
  String get playSegmentMatches;

  /// No description provided for @playTabActive.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get playTabActive;

  /// No description provided for @playTabChallenges.
  ///
  /// In en, this message translates to:
  /// **'Challenges'**
  String get playTabChallenges;

  /// No description provided for @playTabHistory.
  ///
  /// In en, this message translates to:
  /// **'History'**
  String get playTabHistory;

  /// No description provided for @playYourStats.
  ///
  /// In en, this message translates to:
  /// **'Your stats'**
  String get playYourStats;

  /// No description provided for @playerAtAGlance.
  ///
  /// In en, this message translates to:
  /// **'AT A GLANCE'**
  String get playerAtAGlance;

  /// No description provided for @playerCancelRequest.
  ///
  /// In en, this message translates to:
  /// **'Cancel Request'**
  String get playerCancelRequest;

  /// No description provided for @playerChallengeToMatch.
  ///
  /// In en, this message translates to:
  /// **'Challenge to a match'**
  String get playerChallengeToMatch;

  /// No description provided for @playerConnect.
  ///
  /// In en, this message translates to:
  /// **'Connect'**
  String get playerConnect;

  /// No description provided for @playerConnectToSeeAvailability.
  ///
  /// In en, this message translates to:
  /// **'Connect to see when this player is usually free.'**
  String get playerConnectToSeeAvailability;

  /// No description provided for @playerConnectToSeeSkills.
  ///
  /// In en, this message translates to:
  /// **'Connect with this player to see their skill breakdown.'**
  String get playerConnectToSeeSkills;

  /// No description provided for @playerConnected.
  ///
  /// In en, this message translates to:
  /// **'Connected'**
  String get playerConnected;

  /// No description provided for @playerDevelopmentAreas.
  ///
  /// In en, this message translates to:
  /// **'Development areas'**
  String get playerDevelopmentAreas;

  /// No description provided for @playerLoadFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not load this player right now.'**
  String get playerLoadFailed;

  /// No description provided for @playerLocation.
  ///
  /// In en, this message translates to:
  /// **'Location'**
  String get playerLocation;

  /// No description provided for @playerMessage.
  ///
  /// In en, this message translates to:
  /// **'Message'**
  String get playerMessage;

  /// No description provided for @playerNoAssessment.
  ///
  /// In en, this message translates to:
  /// **'This player hasn\'t completed an assessment yet.'**
  String get playerNoAssessment;

  /// No description provided for @playerNoMatchFilters.
  ///
  /// In en, this message translates to:
  /// **'No players match these filters. Try widening distance or level range.'**
  String get playerNoMatchFilters;

  /// No description provided for @playerPlays.
  ///
  /// In en, this message translates to:
  /// **'Plays'**
  String get playerPlays;

  /// No description provided for @playerRequestSent.
  ///
  /// In en, this message translates to:
  /// **'Request sent'**
  String get playerRequestSent;

  /// No description provided for @playerRequestSentBody.
  ///
  /// In en, this message translates to:
  /// **'{name} will see your connection request. You can cancel it while it is still pending.'**
  String playerRequestSentBody(String name);

  /// No description provided for @playerRequestSentCancel.
  ///
  /// In en, this message translates to:
  /// **'Request sent · Cancel'**
  String get playerRequestSentCancel;

  /// No description provided for @playerStatsOf.
  ///
  /// In en, this message translates to:
  /// **'{name}\'s Stats'**
  String playerStatsOf(String name);

  /// No description provided for @playerUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Player not available.'**
  String get playerUnavailable;

  /// No description provided for @playerViewStats.
  ///
  /// In en, this message translates to:
  /// **'View Stats'**
  String get playerViewStats;

  /// No description provided for @playerWantsToConnect.
  ///
  /// In en, this message translates to:
  /// **'Wants to connect — respond in Requests'**
  String get playerWantsToConnect;

  /// No description provided for @practiceDuration.
  ///
  /// In en, this message translates to:
  /// **'Duration'**
  String get practiceDuration;

  /// No description provided for @practiceEmpty.
  ///
  /// In en, this message translates to:
  /// **'Log your first practice session'**
  String get practiceEmpty;

  /// No description provided for @practiceLoadFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load your practice log.'**
  String get practiceLoadFailed;

  /// No description provided for @practiceMinutesShort.
  ///
  /// In en, this message translates to:
  /// **'min'**
  String get practiceMinutesShort;

  /// No description provided for @practiceNotes.
  ///
  /// In en, this message translates to:
  /// **'Notes'**
  String get practiceNotes;

  /// No description provided for @practiceNotesHint.
  ///
  /// In en, this message translates to:
  /// **'What did you work on? Any breakthroughs?'**
  String get practiceNotesHint;

  /// No description provided for @practiceSave.
  ///
  /// In en, this message translates to:
  /// **'Save Practice'**
  String get practiceSave;

  /// No description provided for @practiceSkillFocus.
  ///
  /// In en, this message translates to:
  /// **'Skill focus'**
  String get practiceSkillFocus;

  /// No description provided for @privacyAvailabilityNote.
  ///
  /// In en, this message translates to:
  /// **'Off means only your connections can see your detailed availability'**
  String get privacyAvailabilityNote;

  /// No description provided for @privacyLoadFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load your privacy settings.'**
  String get privacyLoadFailed;

  /// No description provided for @privacyShowEveryone.
  ///
  /// In en, this message translates to:
  /// **'Show to everyone'**
  String get privacyShowEveryone;

  /// No description provided for @privacySkillsNote.
  ///
  /// In en, this message translates to:
  /// **'Off means only your connections can see your skill breakdown'**
  String get privacySkillsNote;

  /// No description provided for @profileAddPadel.
  ///
  /// In en, this message translates to:
  /// **'+ Add Padel'**
  String get profileAddPadel;

  /// No description provided for @profileAddPhoto.
  ///
  /// In en, this message translates to:
  /// **'Add a photo'**
  String get profileAddPhoto;

  /// No description provided for @profileBio.
  ///
  /// In en, this message translates to:
  /// **'Bio'**
  String get profileBio;

  /// No description provided for @profileBioHint.
  ///
  /// In en, this message translates to:
  /// **'Tell other players a bit about yourself'**
  String get profileBioHint;

  /// No description provided for @profileEdit.
  ///
  /// In en, this message translates to:
  /// **'Edit Profile'**
  String get profileEdit;

  /// No description provided for @profileLevelNotAssessed.
  ///
  /// In en, this message translates to:
  /// **'Level not yet assessed'**
  String get profileLevelNotAssessed;

  /// No description provided for @profileLevelWithLabel.
  ///
  /// In en, this message translates to:
  /// **'Level {level} · {label}'**
  String profileLevelWithLabel(String level, String label);

  /// No description provided for @profileLoadFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load your profile.'**
  String get profileLoadFailed;

  /// No description provided for @profileMySports.
  ///
  /// In en, this message translates to:
  /// **'My Sports'**
  String get profileMySports;

  /// No description provided for @profileRating.
  ///
  /// In en, this message translates to:
  /// **'Rating'**
  String get profileRating;

  /// No description provided for @profileMatches.
  ///
  /// In en, this message translates to:
  /// **'Matches'**
  String get profileMatches;

  /// No description provided for @profileWins.
  ///
  /// In en, this message translates to:
  /// **'Wins'**
  String get profileWins;

  /// No description provided for @profilePlayingSince.
  ///
  /// In en, this message translates to:
  /// **'Playing on Drift since {date}'**
  String profilePlayingSince(String date);

  /// No description provided for @profileMyStats.
  ///
  /// In en, this message translates to:
  /// **'My Stats'**
  String get profileMyStats;

  /// No description provided for @profilePadelLoadFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load your Padel profile'**
  String get profilePadelLoadFailed;

  /// No description provided for @profileRemovePhoto.
  ///
  /// In en, this message translates to:
  /// **'Remove photo'**
  String get profileRemovePhoto;

  /// No description provided for @profileYourActiveProfile.
  ///
  /// In en, this message translates to:
  /// **'Your active profile'**
  String get profileYourActiveProfile;

  /// No description provided for @progressEmpty.
  ///
  /// In en, this message translates to:
  /// **'Your progress report builds up as you play and practice'**
  String get progressEmpty;

  /// No description provided for @proposeAddTime.
  ///
  /// In en, this message translates to:
  /// **'Add a time'**
  String get proposeAddTime;

  /// No description provided for @proposeFutureTime.
  ///
  /// In en, this message translates to:
  /// **'Pick a time in the future.'**
  String get proposeFutureTime;

  /// No description provided for @proposeNoTimes.
  ///
  /// In en, this message translates to:
  /// **'No times added yet.'**
  String get proposeNoTimes;

  /// No description provided for @proposeOfferUpTo.
  ///
  /// In en, this message translates to:
  /// **'Offer up to {max} options — they pick one.'**
  String proposeOfferUpTo(int max);

  /// No description provided for @proposeSendTimes.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{Send 1 time} other{Send {count} times}}'**
  String proposeSendTimes(int count);

  /// No description provided for @proposeTitle.
  ///
  /// In en, this message translates to:
  /// **'Propose times'**
  String get proposeTitle;

  /// No description provided for @pushFallbackBody.
  ///
  /// In en, this message translates to:
  /// **'Open to see what changed.'**
  String get pushFallbackBody;

  /// No description provided for @pushFallbackTitle.
  ///
  /// In en, this message translates to:
  /// **'New update from Drift Tennis'**
  String get pushFallbackTitle;

  /// No description provided for @quickBookCourt.
  ///
  /// In en, this message translates to:
  /// **'Book a court'**
  String get quickBookCourt;

  /// No description provided for @quickBookCourtHint.
  ///
  /// In en, this message translates to:
  /// **'Courts near you'**
  String get quickBookCourtHint;

  /// No description provided for @quickEnterLadder.
  ///
  /// In en, this message translates to:
  /// **'Enter a ladder'**
  String get quickEnterLadder;

  /// No description provided for @quickEnterLadderHint.
  ///
  /// In en, this message translates to:
  /// **'Climb the rankings'**
  String get quickEnterLadderHint;

  /// No description provided for @quickFindMatch.
  ///
  /// In en, this message translates to:
  /// **'Find a match'**
  String get quickFindMatch;

  /// No description provided for @quickFindMatchHint.
  ///
  /// In en, this message translates to:
  /// **'Players at your level'**
  String get quickFindMatchHint;

  /// No description provided for @quickLogPractice.
  ///
  /// In en, this message translates to:
  /// **'Log practice'**
  String get quickLogPractice;

  /// No description provided for @quickLogPracticeHint.
  ///
  /// In en, this message translates to:
  /// **'Keep your streak going'**
  String get quickLogPracticeHint;

  /// No description provided for @rateGood.
  ///
  /// In en, this message translates to:
  /// **'Good'**
  String get rateGood;

  /// No description provided for @rateGreat.
  ///
  /// In en, this message translates to:
  /// **'Great'**
  String get rateGreat;

  /// No description provided for @rateOkay.
  ///
  /// In en, this message translates to:
  /// **'Okay'**
  String get rateOkay;

  /// No description provided for @ratePeak.
  ///
  /// In en, this message translates to:
  /// **'Peak'**
  String get ratePeak;

  /// No description provided for @rateRough.
  ///
  /// In en, this message translates to:
  /// **'Rough'**
  String get rateRough;

  /// No description provided for @reasonCheating.
  ///
  /// In en, this message translates to:
  /// **'Cheating'**
  String get reasonCheating;

  /// No description provided for @reasonFakeProfile.
  ///
  /// In en, this message translates to:
  /// **'Fake profile'**
  String get reasonFakeProfile;

  /// No description provided for @reasonHarassment.
  ///
  /// In en, this message translates to:
  /// **'Harassment or abuse'**
  String get reasonHarassment;

  /// No description provided for @reasonOther.
  ///
  /// In en, this message translates to:
  /// **'Something else'**
  String get reasonOther;

  /// No description provided for @reasonSpam.
  ///
  /// In en, this message translates to:
  /// **'Spam'**
  String get reasonSpam;

  /// No description provided for @reportChooseReason.
  ///
  /// In en, this message translates to:
  /// **'Choose a reason to continue.'**
  String get reportChooseReason;

  /// No description provided for @reportCourtTitle.
  ///
  /// In en, this message translates to:
  /// **'Report / update court info'**
  String get reportCourtTitle;

  /// No description provided for @reportDuplicate.
  ///
  /// In en, this message translates to:
  /// **'Duplicate listing'**
  String get reportDuplicate;

  /// No description provided for @reportInappropriate.
  ///
  /// In en, this message translates to:
  /// **'Inappropriate content'**
  String get reportInappropriate;

  /// No description provided for @reportIncorrectInfo.
  ///
  /// In en, this message translates to:
  /// **'Incorrect info'**
  String get reportIncorrectInfo;

  /// No description provided for @reportOther.
  ///
  /// In en, this message translates to:
  /// **'Other'**
  String get reportOther;

  /// No description provided for @reportPermanentlyClosed.
  ///
  /// In en, this message translates to:
  /// **'Permanently closed'**
  String get reportPermanentlyClosed;

  /// No description provided for @reportThanks.
  ///
  /// In en, this message translates to:
  /// **'Thanks — we\'ll take a look.'**
  String get reportThanks;

  /// No description provided for @safetyAnythingElse.
  ///
  /// In en, this message translates to:
  /// **'Anything else? (optional)'**
  String get safetyAnythingElse;

  /// No description provided for @safetyBlock.
  ///
  /// In en, this message translates to:
  /// **'Block'**
  String get safetyBlock;

  /// No description provided for @safetyBlockBody.
  ///
  /// In en, this message translates to:
  /// **'They won\'t be able to find you or contact you, and any existing connection between you will be removed.'**
  String get safetyBlockBody;

  /// No description provided for @safetyBlockPlayer.
  ///
  /// In en, this message translates to:
  /// **'Block player'**
  String get safetyBlockPlayer;

  /// No description provided for @safetyBlockQ.
  ///
  /// In en, this message translates to:
  /// **'Block this player?'**
  String get safetyBlockQ;

  /// No description provided for @safetyBlockSub.
  ///
  /// In en, this message translates to:
  /// **'They can no longer find or contact you'**
  String get safetyBlockSub;

  /// No description provided for @safetyMessageReported.
  ///
  /// In en, this message translates to:
  /// **'Thanks — this message was reported.'**
  String get safetyMessageReported;

  /// No description provided for @safetyPlayerBlocked.
  ///
  /// In en, this message translates to:
  /// **'Player blocked.'**
  String get safetyPlayerBlocked;

  /// No description provided for @safetyReportMessage.
  ///
  /// In en, this message translates to:
  /// **'Report this message'**
  String get safetyReportMessage;

  /// No description provided for @safetyReportPlayer.
  ///
  /// In en, this message translates to:
  /// **'Report player'**
  String get safetyReportPlayer;

  /// No description provided for @safetyReportPrivacy.
  ///
  /// In en, this message translates to:
  /// **'Reports go to our moderation team. They\'re never shared with the player you report.'**
  String get safetyReportPrivacy;

  /// No description provided for @safetyReportSubmitted.
  ///
  /// In en, this message translates to:
  /// **'Report submitted. Thank you.'**
  String get safetyReportSubmitted;

  /// No description provided for @safetyReporting.
  ///
  /// In en, this message translates to:
  /// **'Reporting…'**
  String get safetyReporting;

  /// No description provided for @safetySubmitReport.
  ///
  /// In en, this message translates to:
  /// **'Submit report'**
  String get safetySubmitReport;

  /// No description provided for @safetyTellUs.
  ///
  /// In en, this message translates to:
  /// **'Tell us what went wrong'**
  String get safetyTellUs;

  /// No description provided for @safetyTitle.
  ///
  /// In en, this message translates to:
  /// **'Safety'**
  String get safetyTitle;

  /// No description provided for @scoreErrBothGames.
  ///
  /// In en, this message translates to:
  /// **'Enter both games for every set.'**
  String get scoreErrBothGames;

  /// No description provided for @scoreErrInvalid.
  ///
  /// In en, this message translates to:
  /// **'Set {set} ({score}) isn\'t a valid tennis score.'**
  String scoreErrInvalid(int set, String score);

  /// No description provided for @scoreErrNeedTiebreak.
  ///
  /// In en, this message translates to:
  /// **'Set {set} is a tiebreak (7-6) — enter the tiebreak points.'**
  String scoreErrNeedTiebreak(int set);

  /// No description provided for @scoreErrRetirementWinner.
  ///
  /// In en, this message translates to:
  /// **'Choose who won after the retirement.'**
  String get scoreErrRetirementWinner;

  /// No description provided for @scoreErrTie.
  ///
  /// In en, this message translates to:
  /// **'Set {set} can\'t end in a tie ({score}).'**
  String scoreErrTie(int set, String score);

  /// No description provided for @scoreErrTiebreak.
  ///
  /// In en, this message translates to:
  /// **'Set {set}\'s tiebreak points ({score}) aren\'t a valid finish.'**
  String scoreErrTiebreak(int set, String score);

  /// No description provided for @searchAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get searchAll;

  /// No description provided for @searchCompetitions.
  ///
  /// In en, this message translates to:
  /// **'Competitions'**
  String get searchCompetitions;

  /// No description provided for @searchHint.
  ///
  /// In en, this message translates to:
  /// **'Players, courts, clubs, competitions'**
  String get searchHint;

  /// No description provided for @searchLoadFailed.
  ///
  /// In en, this message translates to:
  /// **'Search could not be loaded.'**
  String get searchLoadFailed;

  /// No description provided for @searchMinChars.
  ///
  /// In en, this message translates to:
  /// **'Type at least two characters to search across Drift.'**
  String get searchMinChars;

  /// No description provided for @searchNoResults.
  ///
  /// In en, this message translates to:
  /// **'No results for \'{query}\'. Try a broader search or another filter.'**
  String searchNoResults(String query);

  /// No description provided for @searchPlayersHint.
  ///
  /// In en, this message translates to:
  /// **'Search players…'**
  String get searchPlayersHint;

  /// No description provided for @searchResult.
  ///
  /// In en, this message translates to:
  /// **'Result'**
  String get searchResult;

  /// No description provided for @searchResultsFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load search results.'**
  String get searchResultsFailed;

  /// No description provided for @seasonDraft.
  ///
  /// In en, this message translates to:
  /// **'Not yet open'**
  String get seasonDraft;

  /// No description provided for @seasonNotStarted.
  ///
  /// In en, this message translates to:
  /// **'Not yet started'**
  String get seasonNotStarted;

  /// No description provided for @seasonRegistrationOpen.
  ///
  /// In en, this message translates to:
  /// **'Registration open'**
  String get seasonRegistrationOpen;

  /// No description provided for @seasonRoundOf.
  ///
  /// In en, this message translates to:
  /// **'Round {current} of {total}'**
  String seasonRoundOf(int current, int total);

  /// No description provided for @seasonStartingSoon.
  ///
  /// In en, this message translates to:
  /// **'Starting soon'**
  String get seasonStartingSoon;

  /// No description provided for @securityChangePassword.
  ///
  /// In en, this message translates to:
  /// **'Change password'**
  String get securityChangePassword;

  /// No description provided for @securityCurrentPassword.
  ///
  /// In en, this message translates to:
  /// **'Current password'**
  String get securityCurrentPassword;

  /// No description provided for @securityPasswordUpdated.
  ///
  /// In en, this message translates to:
  /// **'Password updated.'**
  String get securityPasswordUpdated;

  /// No description provided for @securityUpdatePassword.
  ///
  /// In en, this message translates to:
  /// **'Update password'**
  String get securityUpdatePassword;

  /// No description provided for @settingsAccount.
  ///
  /// In en, this message translates to:
  /// **'Account'**
  String get settingsAccount;

  /// No description provided for @settingsAccountSecurity.
  ///
  /// In en, this message translates to:
  /// **'Account & Security'**
  String get settingsAccountSecurity;

  /// No description provided for @settingsAnalyseClip.
  ///
  /// In en, this message translates to:
  /// **'Analyse a clip'**
  String get settingsAnalyseClip;

  /// No description provided for @settingsAppearance.
  ///
  /// In en, this message translates to:
  /// **'Appearance'**
  String get settingsAppearance;

  /// No description provided for @settingsBlockedUsers.
  ///
  /// In en, this message translates to:
  /// **'Blocked Users'**
  String get settingsBlockedUsers;

  /// No description provided for @settingsContactSupport.
  ///
  /// In en, this message translates to:
  /// **'Contact Support'**
  String get settingsContactSupport;

  /// No description provided for @settingsDeleteAccount.
  ///
  /// In en, this message translates to:
  /// **'Delete Account'**
  String get settingsDeleteAccount;

  /// No description provided for @settingsHelpFaq.
  ///
  /// In en, this message translates to:
  /// **'Help & FAQ'**
  String get settingsHelpFaq;

  /// No description provided for @settingsLabs.
  ///
  /// In en, this message translates to:
  /// **'Labs'**
  String get settingsLabs;

  /// No description provided for @settingsLanguage.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get settingsLanguage;

  /// No description provided for @settingsLegalDocuments.
  ///
  /// In en, this message translates to:
  /// **'Legal documents'**
  String get settingsLegalDocuments;

  /// No description provided for @settingsLogOutRow.
  ///
  /// In en, this message translates to:
  /// **'Log Out'**
  String get settingsLogOutRow;

  /// No description provided for @settingsLogout.
  ///
  /// In en, this message translates to:
  /// **'Log out'**
  String get settingsLogout;

  /// No description provided for @settingsLogoutConfirmBody.
  ///
  /// In en, this message translates to:
  /// **'You can sign back in any time.'**
  String get settingsLogoutConfirmBody;

  /// No description provided for @settingsLogoutConfirmTitle.
  ///
  /// In en, this message translates to:
  /// **'Log out?'**
  String get settingsLogoutConfirmTitle;

  /// No description provided for @settingsManageConnectionRequests.
  ///
  /// In en, this message translates to:
  /// **'Manage Connection Requests'**
  String get settingsManageConnectionRequests;

  /// No description provided for @settingsNotificationPreferences.
  ///
  /// In en, this message translates to:
  /// **'Notification Preferences'**
  String get settingsNotificationPreferences;

  /// No description provided for @settingsNotifications.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get settingsNotifications;

  /// No description provided for @settingsPlanBilling.
  ///
  /// In en, this message translates to:
  /// **'Plan & Billing'**
  String get settingsPlanBilling;

  /// No description provided for @settingsPrivacySafety.
  ///
  /// In en, this message translates to:
  /// **'Privacy & Safety'**
  String get settingsPrivacySafety;

  /// No description provided for @settingsPrivacySettings.
  ///
  /// In en, this message translates to:
  /// **'Privacy Settings'**
  String get settingsPrivacySettings;

  /// No description provided for @settingsSubscriptionPlan.
  ///
  /// In en, this message translates to:
  /// **'Subscription & Plan'**
  String get settingsSubscriptionPlan;

  /// No description provided for @settingsSupport.
  ///
  /// In en, this message translates to:
  /// **'Support'**
  String get settingsSupport;

  /// No description provided for @settingsThemeDark.
  ///
  /// In en, this message translates to:
  /// **'Dark'**
  String get settingsThemeDark;

  /// No description provided for @settingsThemeDevice.
  ///
  /// In en, this message translates to:
  /// **'Device'**
  String get settingsThemeDevice;

  /// No description provided for @settingsThemeLight.
  ///
  /// In en, this message translates to:
  /// **'Light'**
  String get settingsThemeLight;

  /// No description provided for @settingsThemeValue.
  ///
  /// In en, this message translates to:
  /// **'Theme: {mode}'**
  String settingsThemeValue(String mode);

  /// No description provided for @settingsTitle.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get settingsTitle;

  /// No description provided for @settingsVersion.
  ///
  /// In en, this message translates to:
  /// **'Drift Tennis v{version}'**
  String settingsVersion(String version);

  /// No description provided for @skillBuilding.
  ///
  /// In en, this message translates to:
  /// **'Building'**
  String get skillBuilding;

  /// No description provided for @skillNotEnoughData.
  ///
  /// In en, this message translates to:
  /// **'Not enough data yet — complete a few practice sessions or matches'**
  String get skillNotEnoughData;

  /// No description provided for @skillOnboardingAssessment.
  ///
  /// In en, this message translates to:
  /// **'Onboarding assessment'**
  String get skillOnboardingAssessment;

  /// No description provided for @skillProfileUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Skill profile not available.'**
  String get skillProfileUnavailable;

  /// No description provided for @skillRecommended.
  ///
  /// In en, this message translates to:
  /// **'Recommended'**
  String get skillRecommended;

  /// No description provided for @skillRecommendedForYou.
  ///
  /// In en, this message translates to:
  /// **'Recommended for you'**
  String get skillRecommendedForYou;

  /// No description provided for @skillRetakeAssessment.
  ///
  /// In en, this message translates to:
  /// **'Retake Assessment'**
  String get skillRetakeAssessment;

  /// No description provided for @skillSetGoal.
  ///
  /// In en, this message translates to:
  /// **'Set a Goal'**
  String get skillSetGoal;

  /// No description provided for @skillSignals.
  ///
  /// In en, this message translates to:
  /// **'Contributing signals'**
  String get skillSignals;

  /// No description provided for @splashConnectFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not connect. Your session is still saved.'**
  String get splashConnectFailed;

  /// No description provided for @sportPadel.
  ///
  /// In en, this message translates to:
  /// **'Padel'**
  String get sportPadel;

  /// No description provided for @sportTennis.
  ///
  /// In en, this message translates to:
  /// **'Tennis'**
  String get sportTennis;

  /// No description provided for @standingsLegend.
  ///
  /// In en, this message translates to:
  /// **'W = win · L = loss · Pts = points (3 per win)'**
  String get standingsLegend;

  /// No description provided for @standingsPlayed.
  ///
  /// In en, this message translates to:
  /// **'MP'**
  String get standingsPlayed;

  /// No description provided for @standingsPoints.
  ///
  /// In en, this message translates to:
  /// **'Pts'**
  String get standingsPoints;

  /// No description provided for @statLosses.
  ///
  /// In en, this message translates to:
  /// **'Losses'**
  String get statLosses;

  /// No description provided for @statNoMatchesPlayed.
  ///
  /// In en, this message translates to:
  /// **'No matches played'**
  String get statNoMatchesPlayed;

  /// No description provided for @statNoRatedMatches.
  ///
  /// In en, this message translates to:
  /// **'No rated matches yet'**
  String get statNoRatedMatches;

  /// No description provided for @statPlayed.
  ///
  /// In en, this message translates to:
  /// **'Played'**
  String get statPlayed;

  /// No description provided for @statRecentForm.
  ///
  /// In en, this message translates to:
  /// **'Recent form'**
  String get statRecentForm;

  /// No description provided for @statWinRate.
  ///
  /// In en, this message translates to:
  /// **'Win rate'**
  String get statWinRate;

  /// No description provided for @statWins.
  ///
  /// In en, this message translates to:
  /// **'Wins'**
  String get statWins;

  /// No description provided for @statWinsLosses.
  ///
  /// In en, this message translates to:
  /// **'{wins}W · {losses}L'**
  String statWinsLosses(int wins, int losses);

  /// No description provided for @statWon.
  ///
  /// In en, this message translates to:
  /// **'Won'**
  String get statWon;

  /// No description provided for @supportBody.
  ///
  /// In en, this message translates to:
  /// **'Send us an email and we\'ll get back to you as soon as we can. Use this address for account recovery, erasure requests, billing questions, reports, and technical issues.'**
  String get supportBody;

  /// No description provided for @supportEmailButton.
  ///
  /// In en, this message translates to:
  /// **'Email {email}'**
  String supportEmailButton(String email);

  /// No description provided for @supportEmailUs.
  ///
  /// In en, this message translates to:
  /// **'Email us at {email}'**
  String supportEmailUs(String email);

  /// No description provided for @supportNeedHelp.
  ///
  /// In en, this message translates to:
  /// **'Need help?'**
  String get supportNeedHelp;

  /// No description provided for @surfaceArtificialGrass.
  ///
  /// In en, this message translates to:
  /// **'Artificial Grass'**
  String get surfaceArtificialGrass;

  /// No description provided for @surfaceCarpet.
  ///
  /// In en, this message translates to:
  /// **'Carpet'**
  String get surfaceCarpet;

  /// No description provided for @surfaceClay.
  ///
  /// In en, this message translates to:
  /// **'Clay'**
  String get surfaceClay;

  /// No description provided for @surfaceGrass.
  ///
  /// In en, this message translates to:
  /// **'Grass'**
  String get surfaceGrass;

  /// No description provided for @surfaceHard.
  ///
  /// In en, this message translates to:
  /// **'Hard'**
  String get surfaceHard;

  /// No description provided for @sysChallengeAccepted.
  ///
  /// In en, this message translates to:
  /// **'Challenge accepted'**
  String get sysChallengeAccepted;

  /// No description provided for @sysChallengeDeclined.
  ///
  /// In en, this message translates to:
  /// **'Challenge declined'**
  String get sysChallengeDeclined;

  /// No description provided for @sysChallengeSent.
  ///
  /// In en, this message translates to:
  /// **'Challenge sent'**
  String get sysChallengeSent;

  /// No description provided for @sysChallengeWithdrawn.
  ///
  /// In en, this message translates to:
  /// **'Challenge withdrawn'**
  String get sysChallengeWithdrawn;

  /// No description provided for @sysCourtSuggested.
  ///
  /// In en, this message translates to:
  /// **'Court suggested'**
  String get sysCourtSuggested;

  /// No description provided for @sysDisputeResolved.
  ///
  /// In en, this message translates to:
  /// **'Dispute resolved'**
  String get sysDisputeResolved;

  /// No description provided for @sysFixtureScheduled.
  ///
  /// In en, this message translates to:
  /// **'Fixture scheduled'**
  String get sysFixtureScheduled;

  /// No description provided for @sysFixtureWalkover.
  ///
  /// In en, this message translates to:
  /// **'Fixture unplayed — walkover'**
  String get sysFixtureWalkover;

  /// No description provided for @sysMatchCancelled.
  ///
  /// In en, this message translates to:
  /// **'Match cancelled'**
  String get sysMatchCancelled;

  /// No description provided for @sysMatchConfirmed.
  ///
  /// In en, this message translates to:
  /// **'Match confirmed'**
  String get sysMatchConfirmed;

  /// No description provided for @sysMatchRescheduled.
  ///
  /// In en, this message translates to:
  /// **'Match rescheduled'**
  String get sysMatchRescheduled;

  /// No description provided for @sysResultConfirmed.
  ///
  /// In en, this message translates to:
  /// **'Result confirmed'**
  String get sysResultConfirmed;

  /// No description provided for @sysResultDisputed.
  ///
  /// In en, this message translates to:
  /// **'Result disputed'**
  String get sysResultDisputed;

  /// No description provided for @sysResultSubmitted.
  ///
  /// In en, this message translates to:
  /// **'Result submitted'**
  String get sysResultSubmitted;

  /// No description provided for @sysTimeAccepted.
  ///
  /// In en, this message translates to:
  /// **'Time accepted'**
  String get sysTimeAccepted;

  /// No description provided for @sysTimeProposed.
  ///
  /// In en, this message translates to:
  /// **'Time proposed'**
  String get sysTimeProposed;

  /// No description provided for @timeAfternoon.
  ///
  /// In en, this message translates to:
  /// **'Afternoon'**
  String get timeAfternoon;

  /// No description provided for @timeEvening.
  ///
  /// In en, this message translates to:
  /// **'Evening'**
  String get timeEvening;

  /// No description provided for @timeMorning.
  ///
  /// In en, this message translates to:
  /// **'Morning'**
  String get timeMorning;

  /// No description provided for @videoAnalyseThis.
  ///
  /// In en, this message translates to:
  /// **'Analyse this clip'**
  String get videoAnalyseThis;

  /// No description provided for @videoAnalysingYourClip.
  ///
  /// In en, this message translates to:
  /// **'Analysing your clip…'**
  String get videoAnalysingYourClip;

  /// No description provided for @videoAnalysisError.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong while analysing this clip.'**
  String get videoAnalysisError;

  /// No description provided for @videoAnalysisUnfinished.
  ///
  /// In en, this message translates to:
  /// **'That analysis didn\'t finish'**
  String get videoAnalysisUnfinished;

  /// No description provided for @videoBuffering.
  ///
  /// In en, this message translates to:
  /// **'Buffering video...'**
  String get videoBuffering;

  /// No description provided for @videoChecking.
  ///
  /// In en, this message translates to:
  /// **'Checking your clip…'**
  String get videoChecking;

  /// No description provided for @videoCheckingOffline.
  ///
  /// In en, this message translates to:
  /// **'Clip checking is offline'**
  String get videoCheckingOffline;

  /// No description provided for @videoCheckingOfflineBody.
  ///
  /// In en, this message translates to:
  /// **'You can still upload, but we can\'t check the clip right now.'**
  String get videoCheckingOfflineBody;

  /// No description provided for @videoChooseLibrary.
  ///
  /// In en, this message translates to:
  /// **'Choose from library'**
  String get videoChooseLibrary;

  /// No description provided for @videoClipAnalysis.
  ///
  /// In en, this message translates to:
  /// **'Clip analysis'**
  String get videoClipAnalysis;

  /// No description provided for @videoClipPassed.
  ///
  /// In en, this message translates to:
  /// **'This clip passed its checks'**
  String get videoClipPassed;

  /// No description provided for @videoClipRejected.
  ///
  /// In en, this message translates to:
  /// **'This clip can\'t be analysed'**
  String get videoClipRejected;

  /// No description provided for @videoClipUsable.
  ///
  /// In en, this message translates to:
  /// **'This clip looks usable'**
  String get videoClipUsable;

  /// No description provided for @videoCoupleSeconds.
  ///
  /// In en, this message translates to:
  /// **'This takes a couple of seconds.'**
  String get videoCoupleSeconds;

  /// No description provided for @videoCourtUnchecked.
  ///
  /// In en, this message translates to:
  /// **'Note: we couldn’t check the court markings on this one, so we can’t promise the court itself will read correctly.'**
  String get videoCourtUnchecked;

  /// No description provided for @videoDidntWork.
  ///
  /// In en, this message translates to:
  /// **'That didn\'t work'**
  String get videoDidntWork;

  /// No description provided for @videoEarlyNote.
  ///
  /// In en, this message translates to:
  /// **'Analysis is an early feature. Numbers here come from a single camera and are estimates, not radar readings.'**
  String get videoEarlyNote;

  /// No description provided for @videoLesson.
  ///
  /// In en, this message translates to:
  /// **'Video lesson'**
  String get videoLesson;

  /// No description provided for @videoLessonComplete.
  ///
  /// In en, this message translates to:
  /// **'Lesson marked complete.'**
  String get videoLessonComplete;

  /// No description provided for @videoLessonNotFound.
  ///
  /// In en, this message translates to:
  /// **'Video lesson not found.'**
  String get videoLessonNotFound;

  /// No description provided for @videoLoadClipFailed.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t load this clip'**
  String get videoLoadClipFailed;

  /// No description provided for @videoMeasuredAll.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{We measured the 1 rally we found} other{We measured all {count} rallies we found}}'**
  String videoMeasuredAll(int count);

  /// No description provided for @videoMeasuredAllBody.
  ///
  /// In en, this message translates to:
  /// **'The totals below cover the whole session.'**
  String get videoMeasuredAllBody;

  /// No description provided for @videoMeasuredSome.
  ///
  /// In en, this message translates to:
  /// **'We measured {analysed} of {found} rallies'**
  String videoMeasuredSome(int analysed, int found);

  /// No description provided for @videoMeasuredSomeBody.
  ///
  /// In en, this message translates to:
  /// **'Analysing video is slow, so we work through as much of a session as we can. The totals below cover the {analysed} rallies we measured — not the whole session. Every rally we found is listed further down.'**
  String videoMeasuredSomeBody(int analysed);

  /// No description provided for @videoNoAsset.
  ///
  /// In en, this message translates to:
  /// **'No video asset is attached to this lesson.'**
  String get videoNoAsset;

  /// No description provided for @videoNoDistances.
  ///
  /// In en, this message translates to:
  /// **'Distances and speeds aren’t available for this clip'**
  String get videoNoDistances;

  /// No description provided for @videoNoDistancesBody.
  ///
  /// In en, this message translates to:
  /// **'The court lines couldn’t be read clearly enough to measure distances, so speeds and court positions would not be real measurements. Shot counts below are still accurate.'**
  String get videoNoDistancesBody;

  /// No description provided for @videoNoSpeeds.
  ///
  /// In en, this message translates to:
  /// **'No speeds could be measured from this clip.'**
  String get videoNoSpeeds;

  /// No description provided for @videoOpponent.
  ///
  /// In en, this message translates to:
  /// **'Opponent'**
  String get videoOpponent;

  /// No description provided for @videoOpponentAvgShot.
  ///
  /// In en, this message translates to:
  /// **'Opponent average shot'**
  String get videoOpponentAvgShot;

  /// No description provided for @videoPassedChecks.
  ///
  /// In en, this message translates to:
  /// **'It passed every check we can run today. Analysis itself is still being built — we’ll let you know when it lands.'**
  String get videoPassedChecks;

  /// No description provided for @videoPause.
  ///
  /// In en, this message translates to:
  /// **'Pause'**
  String get videoPause;

  /// No description provided for @videoPlay.
  ///
  /// In en, this message translates to:
  /// **'Play'**
  String get videoPlay;

  /// No description provided for @videoPlaybackCompleted.
  ///
  /// In en, this message translates to:
  /// **'Playback completed. Mark the lesson complete when you are ready.'**
  String get videoPlaybackCompleted;

  /// No description provided for @videoPlaybackError.
  ///
  /// In en, this message translates to:
  /// **'Playback error. Please retry.'**
  String get videoPlaybackError;

  /// No description provided for @videoRalliesMeasured.
  ///
  /// In en, this message translates to:
  /// **'Rallies measured'**
  String get videoRalliesMeasured;

  /// No description provided for @videoRallyByRally.
  ///
  /// In en, this message translates to:
  /// **'Rally by rally'**
  String get videoRallyByRally;

  /// No description provided for @videoRallyFailed.
  ///
  /// In en, this message translates to:
  /// **'This rally could not be analysed'**
  String get videoRallyFailed;

  /// No description provided for @videoReadyToAnalyse.
  ///
  /// In en, this message translates to:
  /// **'It’s ready to analyse whenever you are.'**
  String get videoReadyToAnalyse;

  /// No description provided for @videoRecord.
  ///
  /// In en, this message translates to:
  /// **'Record a clip'**
  String get videoRecord;

  /// No description provided for @videoServeAvg.
  ///
  /// In en, this message translates to:
  /// **'Serve (average over flight)'**
  String get videoServeAvg;

  /// No description provided for @videoSessionTotals.
  ///
  /// In en, this message translates to:
  /// **'Session totals'**
  String get videoSessionTotals;

  /// No description provided for @videoShotCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 shot} other{{count} shots}}'**
  String videoShotCount(int count);

  /// No description provided for @videoShotCountNoCourt.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 shot} other{{count} shots}} · no court fit, so no speeds'**
  String videoShotCountNoCourt(int count);

  /// No description provided for @videoShotTypes.
  ///
  /// In en, this message translates to:
  /// **'Shot types'**
  String get videoShotTypes;

  /// No description provided for @videoShotTypesNote.
  ///
  /// In en, this message translates to:
  /// **'Shot types are an early feature and are often wrong. Treat them as a rough guide.'**
  String get videoShotTypesNote;

  /// No description provided for @videoShots.
  ///
  /// In en, this message translates to:
  /// **'Shots'**
  String get videoShots;

  /// No description provided for @videoSkippedBudget.
  ///
  /// In en, this message translates to:
  /// **'Not measured — we ran out of analysis time for this session'**
  String get videoSkippedBudget;

  /// No description provided for @videoSomeUncalibrated.
  ///
  /// In en, this message translates to:
  /// **'Some rallies could not be measured for speed'**
  String get videoSomeUncalibrated;

  /// No description provided for @videoSomeUncalibratedBody.
  ///
  /// In en, this message translates to:
  /// **'{count} of the rallies we measured did not have clear enough court lines, so they add to the shot counts but not to the speeds.'**
  String videoSomeUncalibratedBody(int count);

  /// No description provided for @videoSpeed.
  ///
  /// In en, this message translates to:
  /// **'Speed'**
  String get videoSpeed;

  /// No description provided for @videoSpeedNote.
  ///
  /// In en, this message translates to:
  /// **'Averaged over the ball’s flight, so lower than a radar reading at contact.'**
  String get videoSpeedNote;

  /// No description provided for @videoStarting.
  ///
  /// In en, this message translates to:
  /// **'Starting…'**
  String get videoStarting;

  /// No description provided for @videoStatusAccepted.
  ///
  /// In en, this message translates to:
  /// **'Ready to analyse'**
  String get videoStatusAccepted;

  /// No description provided for @videoStatusAnalysed.
  ///
  /// In en, this message translates to:
  /// **'Analysed'**
  String get videoStatusAnalysed;

  /// No description provided for @videoStatusAnalysing.
  ///
  /// In en, this message translates to:
  /// **'Analysing…'**
  String get videoStatusAnalysing;

  /// No description provided for @videoStatusFailed.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong'**
  String get videoStatusFailed;

  /// No description provided for @videoStatusRejected.
  ///
  /// In en, this message translates to:
  /// **'Can\'t be analysed'**
  String get videoStatusRejected;

  /// No description provided for @videoTakesMinutes.
  ///
  /// In en, this message translates to:
  /// **'Analysing takes a few minutes. We’ll notify you when it’s done — you don’t need to stay on this screen.'**
  String get videoTakesMinutes;

  /// No description provided for @videoTakesMinutesLeave.
  ///
  /// In en, this message translates to:
  /// **'This takes a few minutes. We’ll notify you when it’s ready, so you can leave this screen.'**
  String get videoTakesMinutesLeave;

  /// No description provided for @videoTip1.
  ///
  /// In en, this message translates to:
  /// **'Hold the phone sideways — landscape, not upright'**
  String get videoTip1;

  /// No description provided for @videoTip2.
  ///
  /// In en, this message translates to:
  /// **'Prop it against the fence or use a tripod, and keep it still'**
  String get videoTip2;

  /// No description provided for @videoTip3.
  ///
  /// In en, this message translates to:
  /// **'Get as much of the court in frame as you can'**
  String get videoTip3;

  /// No description provided for @videoTip4.
  ///
  /// In en, this message translates to:
  /// **'Courts with clear, visible line markings work best'**
  String get videoTip4;

  /// No description provided for @videoTip5.
  ///
  /// In en, this message translates to:
  /// **'One continuous take — no cuts or edits'**
  String get videoTip5;

  /// No description provided for @videoTipsHeading.
  ///
  /// In en, this message translates to:
  /// **'For the best chance of a usable clip'**
  String get videoTipsHeading;

  /// No description provided for @videoTooShort.
  ///
  /// In en, this message translates to:
  /// **'Too short to measure'**
  String get videoTooShort;

  /// No description provided for @videoTryAnother.
  ///
  /// In en, this message translates to:
  /// **'Try another clip'**
  String get videoTryAnother;

  /// No description provided for @videoUnreachable.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t reach Drift. Check your connection and try again.'**
  String get videoUnreachable;

  /// No description provided for @videoUploadAnother.
  ///
  /// In en, this message translates to:
  /// **'Upload another'**
  String get videoUploadAnother;

  /// No description provided for @videoUploadFailed.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong uploading that video. Please try again.'**
  String get videoUploadFailed;

  /// No description provided for @videoUploadTimeout.
  ///
  /// In en, this message translates to:
  /// **'The upload timed out. Check your connection and try again — a shorter clip will upload faster.'**
  String get videoUploadTimeout;

  /// No description provided for @videoUploading.
  ///
  /// In en, this message translates to:
  /// **'Uploading…'**
  String get videoUploading;

  /// No description provided for @videoWhatToChange.
  ///
  /// In en, this message translates to:
  /// **'Here’s what to change before filming again.'**
  String get videoWhatToChange;

  /// No description provided for @videoWorthKnowing.
  ///
  /// In en, this message translates to:
  /// **'Worth knowing'**
  String get videoWorthKnowing;

  /// No description provided for @videoYourAvgShot.
  ///
  /// In en, this message translates to:
  /// **'Your average shot'**
  String get videoYourAvgShot;

  /// No description provided for @welcomeBody.
  ///
  /// In en, this message translates to:
  /// **'Track matches, enter ladders & tournaments, and level up your game, all in one place.'**
  String get welcomeBody;

  /// No description provided for @welcomeContinueEmail.
  ///
  /// In en, this message translates to:
  /// **'Continue with Email'**
  String get welcomeContinueEmail;

  /// No description provided for @welcomeTitle.
  ///
  /// In en, this message translates to:
  /// **'Join the Court'**
  String get welcomeTitle;

  /// No description provided for @withdrawBody.
  ///
  /// In en, this message translates to:
  /// **'The invited player will be told that the challenge was withdrawn.'**
  String get withdrawBody;

  /// No description provided for @withdrawKeep.
  ///
  /// In en, this message translates to:
  /// **'Keep challenge'**
  String get withdrawKeep;

  /// No description provided for @withdrawTitle.
  ///
  /// In en, this message translates to:
  /// **'Undo this challenge?'**
  String get withdrawTitle;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'es', 'fr'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'es':
      return AppLocalizationsEs();
    case 'fr':
      return AppLocalizationsFr();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
