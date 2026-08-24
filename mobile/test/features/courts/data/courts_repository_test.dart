import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/courts/data/courts_repository.dart';

void main() {
  group('ListingVerificationStatus', () {
    test('maps each status', () {
      expect(
        ListingVerificationStatus.fromJson('PENDING'),
        ListingVerificationStatus.pending,
      );
      expect(
        ListingVerificationStatus.fromJson('VERIFIED'),
        ListingVerificationStatus.verified,
      );
      expect(
        ListingVerificationStatus.fromJson('UNVERIFIED'),
        ListingVerificationStatus.unverified,
      );
    });

    // Unverified is the safe default: never imply a venue is vetted when
    // the backend said something this build doesn't understand.
    test('defaults to unverified on anything unrecognised', () {
      expect(
        ListingVerificationStatus.fromJson('???'),
        ListingVerificationStatus.unverified,
      );
    });
  });

  group('CourtBookingType', () {
    test('maps each booking route', () {
      expect(
        CourtBookingType.fromJson('CONTACT_ONLY'),
        CourtBookingType.contactOnly,
      );
      expect(
        CourtBookingType.fromJson('EXTERNAL_LINK'),
        CourtBookingType.externalLink,
      );
      expect(
        CourtBookingType.fromJson('NATIVE_PARTNER'),
        CourtBookingType.nativePartner,
      );
    });

    // "Never fabricate availability" (Doc 3 §6) — an unknown booking route
    // must not be presented as bookable.
    test('defaults to unknown rather than assuming a route', () {
      expect(CourtBookingType.fromJson('SOMETHING'), CourtBookingType.unknown);
    });
  });

  group('CourtGroupSummary.fromJson', () {
    test('maps surface, lighting and count', () {
      final g = CourtGroupSummary.fromJson({
        'id': 'g1',
        'sport': 'TENNIS',
        'surface': 'HARD',
        'indoor': true,
        'lighting': true,
        'count': 4,
      });

      expect(g.surface, 'HARD');
      expect(g.indoor, isTrue);
      expect(g.count, 4);
    });
  });

  group('CourtSummary.fromJson', () {
    Map<String, dynamic> json({
      Object? latitude = 51.5,
      Object? distanceKm = 1.2,
      Object? clubId = 'club-1',
    }) => {
      'id': 'court-1',
      'name': 'Riverside Courts',
      'address': '1 River Rd',
      'latitude': latitude,
      'longitude': -0.12,
      'distanceKm': distanceKm,
      'surfaces': <dynamic>['HARD', 'CLAY'],
      'indoorAvailable': true,
      'outdoorAvailable': true,
      'verificationStatus': 'VERIFIED',
      'bookingType': 'EXTERNAL_LINK',
      'clubId': clubId,
      'clubName': clubId == null ? null : 'Riverside Tennis',
    };

    test('maps every field', () {
      final c = CourtSummary.fromJson(json());

      expect(c.id, 'court-1');
      expect(c.surfaces, ['HARD', 'CLAY']);
      expect(c.bookingType, CourtBookingType.externalLink);
      expect(c.clubName, 'Riverside Tennis');
    });

    // No viewer location means no distance — the common case on first load
    // before the location permission is granted.
    test('tolerates a missing distance', () {
      expect(CourtSummary.fromJson(json(distanceKm: null)).distanceKm, isNull);
    });

    test('tolerates a court with no coordinates', () {
      expect(CourtSummary.fromJson(json(latitude: null)).latitude, isNull);
    });

    test('accepts whole numbers for the numeric fields', () {
      final c = CourtSummary.fromJson(json(latitude: 51, distanceKm: 1));

      expect(c.latitude, 51.0);
      expect(c.distanceKm, 1.0);
    });

    // Courts and clubs are independently discoverable — a court need not
    // belong to a club at all.
    test('maps a standalone court with no owning club', () {
      final c = CourtSummary.fromJson(json(clubId: null));

      expect(c.clubId, isNull);
      expect(c.clubName, isNull);
    });
  });

  group('CourtProfile.fromJson', () {
    Map<String, dynamic> json({Object? club, Object? isPublic = true}) => {
      'id': 'court-1',
      'name': 'Riverside Courts',
      'address': null,
      'latitude': null,
      'longitude': null,
      'distanceKm': null,
      'surfaces': <dynamic>['HARD'],
      'indoorAvailable': false,
      'outdoorAvailable': true,
      'verificationStatus': 'UNVERIFIED',
      'bookingType': 'CONTACT_ONLY',
      'clubId': null,
      'clubName': null,
      'phone': '+44 20 1234 5678',
      'website': null,
      'bookingUrl': null,
      'amenities': <dynamic>['Parking'],
      'openingHoursNote': null,
      'isPublic': isPublic,
      'photoUrls': <dynamic>[],
      'courtGroups': <dynamic>[
        {
          'id': 'g1',
          'sport': 'TENNIS',
          'surface': 'HARD',
          'indoor': false,
          'lighting': true,
          'count': 2,
        },
      ],
      'club': club,
    };

    test('flattens the summary and maps its own fields', () {
      final p = CourtProfile.fromJson(json());

      expect(p.summary.id, 'court-1');
      expect(p.phone, '+44 20 1234 5678');
      expect(p.amenities, ['Parking']);
      expect(p.courtGroups, hasLength(1));
    });

    test('maps an owning club when present', () {
      final p = CourtProfile.fromJson(
        json(
          club: {
            'id': 'club-1',
            'name': 'Riverside Tennis',
            'verificationStatus': 'VERIFIED',
          },
        ),
      );

      expect(p.club?.name, 'Riverside Tennis');
      expect(p.club?.verificationStatus, ListingVerificationStatus.verified);
    });

    test('leaves club null for an unaffiliated court', () {
      expect(CourtProfile.fromJson(json()).club, isNull);
    });

    // Unknown public/private access is a real state — the seed data has no
    // source for it, and the UI must not guess.
    test('tolerates unknown public access', () {
      expect(CourtProfile.fromJson(json(isPublic: null)).isPublic, isNull);
    });
  });
}
