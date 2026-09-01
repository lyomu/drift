import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:drift_tennis/features/messaging/application/messaging_providers.dart';
import 'package:drift_tennis/features/messaging/data/messaging_repository.dart';
import 'package:drift_tennis/features/messaging/presentation/chat_thread_screen.dart';
import 'package:drift_tennis/features/users/application/current_user_provider.dart';

import '../../../support/fixtures.dart';
import '../../../support/mocks.dart';
import '../../../support/pump.dart';

/// The real notifier joins the socket room before fetching; these stubs
/// keep the same notifier type but skip the socket entirely. The screen's
/// initState also calls markRead() through the real repository, so every
/// test pins a mocked one.
class _DataThreadNotifier extends ThreadNotifier {
  @override
  Future<List<ChatMessage>> build(String conversationId) async => [
    chatMessage(),
  ];
}

class _EmptyThreadNotifier extends ThreadNotifier {
  @override
  Future<List<ChatMessage>> build(String conversationId) async =>
      const <ChatMessage>[];
}

class _PendingThreadNotifier extends ThreadNotifier {
  @override
  Future<List<ChatMessage>> build(String conversationId) =>
      pending<List<ChatMessage>>();
}

class _FailingThreadNotifier extends ThreadNotifier {
  @override
  Future<List<ChatMessage>> build(String conversationId) =>
      failing<List<ChatMessage>>();
}

void main() {
  late MockMessagingRepository messagingRepo;

  setUp(() {
    messagingRepo = MockMessagingRepository();
    when(() => messagingRepo.markRead(any())).thenAnswer((_) async {});
  });

  List<Override> overrides(ThreadNotifier Function() notifier) => [
    threadProvider.overrideWith(notifier),
    currentUserProvider.overrideWith((ref) async => userProfile()),
    messagingRepositoryProvider.overrideWithValue(messagingRepo),
  ];

  group('ChatThreadScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('renders the thread in $label', (tester) async {
        await pumpScreen(
          tester,
          const ChatThreadScreen(conversationId: 'conv-1'),
          brightness: brightness,
          overrides: overrides(_DataThreadNotifier.new),
        );

        expect(find.text('Chat'), findsOneWidget);
        expect(find.text('See you Saturday'), findsOneWidget);
      });

      testWidgets('invites a first message in $label', (tester) async {
        await pumpScreen(
          tester,
          const ChatThreadScreen(conversationId: 'conv-1'),
          brightness: brightness,
          overrides: overrides(_EmptyThreadNotifier.new),
        );

        expect(find.text('Say hello'), findsOneWidget);
      });
    }

    testWidgets('shows a spinner while loading', (tester) async {
      await pumpScreen(
        tester,
        const ChatThreadScreen(conversationId: 'conv-1'),
        settle: false,
        overrides: overrides(_PendingThreadNotifier.new),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('survives an error without throwing', (tester) async {
      await pumpScreen(
        tester,
        const ChatThreadScreen(conversationId: 'conv-1'),
        overrides: overrides(_FailingThreadNotifier.new),
      );

      expect(find.text("Couldn't load this conversation."), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
