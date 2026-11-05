import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:drift_tennis/features/communities/application/communities_providers.dart';
import 'package:drift_tennis/features/communities/data/communities_repository.dart';
import 'package:drift_tennis/features/communities/presentation/community_hub_screen.dart';
import 'package:drift_tennis/features/communities/presentation/create_community_sheet.dart';
import 'package:drift_tennis/shared/widgets/buttons/drift_primary_button.dart';
import '../../../support/pump.dart';

Community item(String id, String name) => Community(
  id: id, type: CommunityType.social, name: name, city: 'Nairobi',
  frequency: CommunityFrequency.weekly, about: null, photoUrl: null,
  joinPolicy: CommunityJoinPolicy.open, status: CommunityStatus.approved,
  decisionNote: null, clubName: null, memberCount: 4, conversationId: null,
  distanceKm: null, myMembership: null,
);

class CreateLauncher extends ConsumerWidget {
  const CreateLauncher({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) => Scaffold(
    body: Center(child: TextButton(onPressed: () => showCreateCommunitySheet(context, ref), child: const Text('Open create'))),
  );
}

void main() {
  testWidgets('shows the empty community state', (tester) async {
    await pumpScreen(
      tester,
      const Scaffold(body: CommunityHubScreen()),
      overrides: [
        communityViewerLocationProvider.overrideWith((ref) async => null),
        myCommunitiesProvider.overrideWith((ref) async => <Community>[]),
        communitySearchProvider.overrideWith((ref) async => <Community>[]),
      ],
    );
    expect(find.text('No communities yet'), findsOneWidget);
    expect(find.text('Start a community'), findsOneWidget);
  });

  testWidgets('lists the viewer community and nearby community', (tester) async {
    await pumpScreen(
      tester,
      const Scaffold(body: CommunityHubScreen()),
      overrides: [
        communityViewerLocationProvider.overrideWith((ref) async => null),
        myCommunitiesProvider.overrideWith((ref) async => [item('mine', 'My group')]),
        communitySearchProvider.overrideWith((ref) async => [item('near', 'Nearby group')]),
      ],
    );
    expect(find.text('My group'), findsOneWidget);
    expect(find.text('Nearby group'), findsOneWidget);
  });

  testWidgets('create button stays disabled until name and city are valid', (tester) async {
    await pumpScreen(
      tester,
      const CreateLauncher(),
      overrides: [communityViewerLocationProvider.overrideWith((ref) async => null)],
    );
    await tester.tap(find.text('Open create'));
    await tester.pumpAndSettle();
    expect(tester.widget<DriftPrimaryButton>(find.byType(DriftPrimaryButton)).onPressed, isNull);
    final fields = find.byType(TextField);
    await tester.enterText(fields.at(0), 'Sunday players');
    await tester.enterText(fields.at(1), 'Nairobi');
    await tester.pump();
    expect(tester.widget<DriftPrimaryButton>(find.byType(DriftPrimaryButton)).onPressed, isNotNull);
  });
}
