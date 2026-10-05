import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_player_card.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../../players/application/players_providers.dart';
import '../../players/data/players_repository.dart';
import '../data/messaging_repository.dart';

/// Pick who to message. Searching by name lists matching players; choosing one
/// opens the thread with them. Messaging needs a connection or an open
/// challenge, so anyone else is refused with a short explanation.
class NewMessageScreen extends ConsumerStatefulWidget {
  const NewMessageScreen({super.key});

  @override
  ConsumerState<NewMessageScreen> createState() => _NewMessageScreenState();
}

class _NewMessageScreenState extends ConsumerState<NewMessageScreen> {
  final _controller = TextEditingController();
  String _query = '';
  bool _opening = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _open(PlayerSummary player) async {
    if (_opening) return;
    setState(() => _opening = true);
    try {
      final conversationId = await ref
          .read(messagingRepositoryProvider)
          .openWith(player.id);
      if (!mounted) return;
      context.pushReplacement('/messages/$conversationId');
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Connect or challenge ${player.displayName} before messaging.',
          ),
        ),
      );
    } finally {
      if (mounted) setState(() => _opening = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final matches = _query.length >= 2
        ? ref.watch(playerNameSearchProvider(_query))
        : null;

    return DriftScaffold(
      title: 'New message',
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(DriftSpacing.s4),
            child: TextField(
              controller: _controller,
              autofocus: true,
              textInputAction: TextInputAction.search,
              decoration: InputDecoration(
                hintText: 'Search players by name',
                prefixIcon: const Icon(Icons.search_rounded),
                filled: true,
                fillColor: colors.surface,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
              onChanged: (value) => setState(() => _query = value.trim()),
            ),
          ),
          Expanded(
            child: switch (matches) {
              null => Center(
                child: Text(
                  'Type at least two letters of a name.',
                  style: type.bodySmall.copyWith(color: colors.textSecondary),
                ),
              ),
              AsyncData(:final value) when value.isEmpty => Center(
                child: Text(
                  'No players found.',
                  style: type.bodySmall.copyWith(color: colors.textSecondary),
                ),
              ),
              AsyncData(:final value) => ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: DriftSpacing.s4),
                itemCount: value.length,
                separatorBuilder: (_, _) => const SizedBox(height: DriftSpacing.s2),
                itemBuilder: (context, i) => ListTile(
                  enabled: !_opening,
                  leading: DriftPlayerAvatar(player: value[i], radius: 20),
                  title: Text(value[i].displayName, style: type.title),
                  subtitle: value[i].distanceBand == null
                      ? null
                      : Text(value[i].distanceBand!),
                  onTap: () => _open(value[i]),
                ),
              ),
              AsyncError() => const Center(
                child: Text("Couldn't search players right now."),
              ),
              _ => const Center(child: CircularProgressIndicator()),
            },
          ),
        ],
      ),
    );
  }
}
