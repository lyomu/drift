import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/clubs/data/clubs_repository.dart';
import 'package:drift_tennis/features/courts/data/courts_repository.dart';

void main() {
  group('ClubSummary.fromJson', () {
    Map<String, dynamic> json({
      Object? latitude = 51.5,
      Object? distanceKm = 2.5,
      String verification = 'VERIFIED',
    }) => {
      'id': 'club-1',
      'name': 'Riverside Tennis',
      'address': '1 River Rd',
      'latitude': latitude,
      'longitude': -0.12,
      'distanceKm': distanceKm,
      'verificationStatus': verification,
      'courtCount': 4,
    };

    test('maps every field', () {
      final c = ClubSummary.fromJson(json());

      expect(c.id, 'club-1');
      expect(c.name, 'Riverside Tennis');
      expect(c.address, '1 River Rd');
      expect(c.latitude, 51.5);
      expect(c.distanceKm, 2.5);
      expect(c.verificationStatus, ListingVerificationStatus.verified);
      expect(c.courtCount, 4);
    });

    // The `as num?` casts are the silent-crash class this layer exists for:
    // a club with no coordinates, or one listed with no viewer location, is
    // ordinary rather than exceptional.
    test('tolerates null coordinates and distance', () {
      final c = ClubSummary.fromJson(json(latitude: null, distanceKm: null));

      expect(c.latitude, isNull);
      expect(c.distanceKm, isNull);
    });

    test('accepts an int where the API could send a whole number', () {
      final c = ClubSummary.fromJson(json(latitude: 51, distanceKm: 3));

      expect(c.latitude, 51.0);
      expect(c.distanceKm, 3.0);
    });

    test('falls back to unverified on an unrecognised status', () {
      final c = ClubSummary.fromJson(json(verification: 'SOMETHING_ELSE'));
      expect(c.verificationStatus, ListingVerificationStatus.unverified);
    });
  });

  group('ClubMembership.fromJson', () {
    test('maps each backend status', () {
      expect(ClubMembership.fromJson('INVITED'), ClubMembership.invited);
      expect(ClubMembership.fromJson('PENDING'), ClubMembership.pending);
      expect(ClubMembership.fromJson('ACTIVE'), ClubMembership.active);
      expect(ClubMembership.fromJson('SUSPENDED'), ClubMembership.suspended);
    });

    test('treats null as not a member', () {
      expect(ClubMembership.fromJson(null), ClubMembership.none);
    });

    test('treats an unrecognised status as not a member', () {
      expect(ClubMembership.fromJson('WHATEVER'), ClubMembership.none);
    });

    // The community endpoints are ACTIVE-only server-side; the UI gate has
    // to agree or it offers links that 403.
    test('only ACTIVE unlocks the community', () {
      expect(ClubMembership.active.canSeeCommunity, isTrue);
      for (final other in [
        ClubMembership.none,
        ClubMembership.invited,
        ClubMembership.pending,
        ClubMembership.suspended,
      ]) {
        expect(other.canSeeCommunity, isFalse, reason: '$other');
      }
    });
  });

  group('ClubProfile.fromJson', () {
    Map<String, dynamic> json({Object? membershipStatus}) => {
      'id': 'club-1',
      'name': 'Riverside Tennis',
      'address': null,
      'latitude': null,
      'longitude': null,
      'distanceKm': null,
      'verificationStatus': 'UNVERIFIED',
      'courtCount': 0,
      'membershipStatus': membershipStatus,
      'description': 'A friendly club',
      'phone': null,
      'website': null,
      'amenities': <dynamic>['Parking'],
      'openingHoursNote': null,
      'photoUrls': <dynamic>[],
      'courts': <dynamic>[],
    };

    test('maps the nested summary and its own fields', () {
      final p = ClubProfile.fromJson(json(membershipStatus: 'ACTIVE'));

      expect(p.summary.id, 'club-1');
      expect(p.membership, ClubMembership.active);
      expect(p.description, 'A friendly club');
      expect(p.amenities, ['Parking']);
    });

    test('a club owning no courts is valid, not an error', () {
      expect(ClubProfile.fromJson(json()).courts, isEmpty);
    });

    test('defaults to non-member when the API omits a status', () {
      expect(ClubProfile.fromJson(json()).membership, ClubMembership.none);
    });
  });

  group('ClubPost.fromJson', () {
    Map<String, dynamic> json({
      Object? author = const {'id': 'u1', 'name': 'Ana Diaz', 'photoUrl': null},
      List<dynamic> reactions = const [],
      bool isMine = false,
    }) => {
      'id': 'p1',
      'body': 'Anyone up for doubles?',
      'createdAt': '2026-08-23T10:00:00.000Z',
      'author': author,
      'isMine': isMine,
      'reactions': reactions,
    };

    test('maps the post and its author', () {
      final p = ClubPost.fromJson(json(isMine: true));

      expect(p.id, 'p1');
      expect(p.body, 'Anyone up for doubles?');
      expect(p.author?.name, 'Ana Diaz');
      expect(p.isMine, isTrue);
    });

    // The backend nulls authorId with SetNull so a deleted account leaves
    // the thread readable — the client must not choke on that.
    test('survives a post whose author deleted their account', () {
      final p = ClubPost.fromJson(json(author: null));

      expect(p.author, isNull);
      expect(p.body, isNotEmpty);
    });

    test('maps reaction counts and whether the viewer reacted', () {
      final p = ClubPost.fromJson(
        json(
          reactions: [
            {'emoji': 'A', 'count': 2, 'mine': true},
            {'emoji': 'B', 'count': 1, 'mine': false},
          ],
        ),
      );

      expect(p.reactions, hasLength(2));
      expect(p.reactions.first.emoji, 'A');
      expect(p.reactions.first.count, 2);
      expect(p.reactions.first.mine, isTrue);
      expect(p.reactions.last.mine, isFalse);
    });

    test('handles a post with no reactions', () {
      expect(ClubPost.fromJson(json()).reactions, isEmpty);
    });
  });

  group('Announcement.fromJson', () {
    test('maps every field', () {
      final a = Announcement.fromJson({
        'id': 'a1',
        'title': 'Court closed',
        'body': 'Court 3 is shut.',
        'pinned': true,
        'publishedAt': '2026-08-23T09:00:00.000Z',
      });

      expect(a.id, 'a1');
      expect(a.title, 'Court closed');
      expect(a.pinned, isTrue);
      expect(a.publishedAt, isNotNull);
    });

    test('defaults pinned to false and tolerates an unpublished draft', () {
      final a = Announcement.fromJson({
        'id': 'a1',
        'title': 'Draft',
        'body': 'Not ready',
        'pinned': null,
        'publishedAt': null,
      });

      expect(a.pinned, isFalse);
      expect(a.publishedAt, isNull);
    });
  });
}
