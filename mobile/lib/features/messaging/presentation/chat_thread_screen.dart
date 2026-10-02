import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_icon.dart';
import '../../auth/data/auth_repository.dart';
import '../../players/data/players_repository.dart';
import '../../users/application/current_user_provider.dart';
import '../application/messaging_providers.dart';
import '../../safety/presentation/message_report_sheet.dart';
import '../data/messaging_repository.dart';

const _ink = Color(0xFF0F172A);
const _slate = Color(0xFF64748B);
const _muted = Color(0xFF94A3B8);

/// Chat Thread — `foundation/04-screen-inventory.md` §A.9. Carries both
/// player messages and the SYSTEM events the match state machine writes, so
/// the negotiation and the conversation about it live in one place.
class ChatThreadScreen extends ConsumerStatefulWidget {
  const ChatThreadScreen({super.key, required this.conversationId});

  final String conversationId;

  @override
  ConsumerState<ChatThreadScreen> createState() => _ChatThreadScreenState();
}

class _ChatThreadScreenState extends ConsumerState<ChatThreadScreen> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  bool _isSending = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(threadProvider(widget.conversationId).notifier).markRead();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final body = _controller.text.trim();
    if (body.isEmpty) return;

    setState(() => _isSending = true);
    try {
      await ref.read(threadProvider(widget.conversationId).notifier).send(body);
      _controller.clear();
      _scrollToEnd();
    } on AuthException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final messages = ref.watch(threadProvider(widget.conversationId));
    final viewerId = ref.watch(currentUserProvider).valueOrNull?.id ?? '';

    // There's no single-conversation endpoint, so the header is built from
    // the already-fetched conversation list rather than a fresh request. It
    // falls back to a bare 'Chat' while that list is still loading (or for a
    // conversation that fell out of it).
    final conversations = ref.watch(conversationsProvider).valueOrNull;
    final match = conversations?.where((c) => c.id == widget.conversationId);
    final conversation = (match == null || match.isEmpty) ? null : match.first;

    final participants = conversation?.participants ?? const <PlayerSummary>[];
    final others = participants.where((p) => p.id != viewerId).toList();
    // A 1:1 thread names the other player; a group names everyone.
    final counterpart = others.length == 1 ? others.first : null;

    // Scroll down as live messages land.
    ref.listen(threadProvider(widget.conversationId), (_, _) => _scrollToEnd());

    return Scaffold(
      backgroundColor: colors.surface,
      body: SafeArea(
        child: Column(
          children: [
            _ChatHeader(
              title: conversation?.title ?? 'Chat',
              counterpart: counterpart,
            ),
            Expanded(
              child: switch (messages) {
                AsyncData(:final value) =>
                  value.isEmpty
                      ? const _SayHello()
                      : _MessageList(
                          scrollController: _scrollController,
                          messages: value,
                          viewerId: viewerId,
                          participants: participants,
                          onReport: (id) =>
                              showMessageReportSheet(context, ref, messageId: id),
                        ),
                AsyncError() => const Center(
                  child: Text("Couldn't load this conversation."),
                ),
                _ => const Center(child: CircularProgressIndicator()),
              },
            ),
            _Composer(
              controller: _controller,
              isSending: _isSending,
              onSend: _send,
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

/// Back button + avatar + name over the player's level, and a trailing button
/// to their profile. The mock's slot here is a call button; Drift has no
/// voice calling, and its "Active now" line has no backing presence data, so
/// both slots carry the nearest real thing.
class _ChatHeader extends ConsumerWidget {
  const _ChatHeader({required this.title, required this.counterpart});

  final String title;
  final PlayerSummary? counterpart;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final subtitle = _levelLine(counterpart);

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      decoration: BoxDecoration(
        color: colors.surface,
        border: Border(
          bottom: BorderSide(color: _hairline(colors), width: 1),
        ),
      ),
      child: Row(
        children: [
          _HeaderSquareButton(
            icon: Icons.arrow_back_rounded,
            iconColor: _ink,
            onTap: () {
              if (context.canPop()) context.pop();
            },
          ),
          const SizedBox(width: 12),
          _Avatar(player: counterpart, size: 40, fontSize: 15, borderWidth: 2),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    height: 1.2,
                    color: _ink,
                  ),
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                      height: 1.2,
                      color: _slate,
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (counterpart != null) ...[
            const SizedBox(width: 12),
            _HeaderSquareButton(
              icon: Icons.person_outline_rounded,
              iconColor: colors.primary,
              onTap: () => context.push('/players/${counterpart!.id}'),
            ),
          ],
        ],
      ),
    );
  }
}

/// `Level 4.5 · Intermediate`, degrading to whichever half exists. Null when
/// the player carries neither, so the header collapses to one line.
String? _levelLine(PlayerSummary? player) {
  if (player == null) return null;
  final level = player.level;
  final label = player.levelLabel;
  if (level != null && label != null) {
    return 'Level ${level.toStringAsFixed(1)} · $label';
  }
  if (level != null) return 'Level ${level.toStringAsFixed(1)}';
  return label;
}

/// 36×36 rounded square, brand-tinted fill and hairline (mock: #F7F9FF on a
/// 1.5px #E2EAFF border).
class _HeaderSquareButton extends StatelessWidget {
  const _HeaderSquareButton({
    required this.icon,
    required this.iconColor,
    required this.onTap,
  });

  final IconData icon;
  final Color iconColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Material(
      color: _tintedFill(colors),
      borderRadius: BorderRadius.circular(12),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: _tintedBorder(colors), width: 1.5),
          ),
          child: Icon(icon, size: 20, color: iconColor),
        ),
      ),
    );
  }
}

/// Circular initials chip, or the player's photo when there is one.
class _Avatar extends StatelessWidget {
  const _Avatar({
    required this.player,
    required this.size,
    required this.fontSize,
    required this.borderWidth,
  });

  final PlayerSummary? player;
  final double size;
  final double fontSize;
  final double borderWidth;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final photoUrl = player?.photoUrl;

    return Container(
      width: size,
      height: size,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: colors.primary.withValues(alpha: 0.09),
        border: Border.all(
          color: colors.primary.withValues(alpha: 0.19),
          width: borderWidth,
        ),
      ),
      child: photoUrl != null && photoUrl.isNotEmpty
          ? Image.network(
              photoUrl,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) => _initials(colors),
            )
          : _initials(colors),
    );
  }

  Widget _initials(DriftColors colors) => Center(
    child: Text(
      _initialsOf(player),
      style: TextStyle(
        fontSize: fontSize,
        fontWeight: FontWeight.w700,
        height: 1,
        color: colors.primary,
      ),
    ),
  );
}

String _initialsOf(PlayerSummary? player) {
  if (player == null) return '?';
  final first = player.firstName?.trim();
  final last = player.lastName?.trim();
  final letters = [
    if (first != null && first.isNotEmpty) first[0],
    if (last != null && last.isNotEmpty) last[0],
  ].join();
  return letters.isEmpty ? '?' : letters.toUpperCase();
}

// ---------------------------------------------------------------------------
// Message list
// ---------------------------------------------------------------------------

class _MessageList extends StatelessWidget {
  const _MessageList({
    required this.scrollController,
    required this.messages,
    required this.viewerId,
    required this.participants,
    required this.onReport,
  });

  final ScrollController scrollController;
  final List<ChatMessage> messages;
  final String viewerId;
  final List<PlayerSummary> participants;
  final void Function(String messageId) onReport;

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      controller: scrollController,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      itemCount: messages.length,
      itemBuilder: (context, i) {
        final message = messages[i];
        final previous = i == 0 ? null : messages[i - 1];
        final next = i == messages.length - 1 ? null : messages[i + 1];

        // A day stamp opens the thread and heads each new calendar day.
        final needsDayStamp =
            previous == null ||
            !_isSameDay(previous.createdAt, message.createdAt);

        final isMine = !message.isSystem && message.senderId == viewerId;
        // A run is consecutive messages from one speaker: only its first
        // carries an avatar, only its last a timestamp. System messages are
        // events, not speech, so they always break a run.
        final continuesRun =
            !message.isSystem &&
            previous != null &&
            !previous.isSystem &&
            previous.senderId == message.senderId &&
            !needsDayStamp;
        final endsRun =
            next == null ||
            next.isSystem ||
            next.senderId != message.senderId ||
            !_isSameDay(message.createdAt, next.createdAt);

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (needsDayStamp) _DayStamp(date: message.createdAt),
            if (message.isSystem)
              _SystemPill(message: message)
            else
              _MessageRow(
                message: message,
                isMine: isMine,
                continuesRun: continuesRun,
                endsRun: endsRun,
                sender: _participantById(message.senderId),
                onReport: () => onReport(message.id),
              ),
          ],
        );
      },
    );
  }

  PlayerSummary? _participantById(String? id) {
    if (id == null) return null;
    for (final p in participants) {
      if (p.id == id) return p;
    }
    return null;
  }
}

bool _isSameDay(DateTime a, DateTime b) =>
    a.year == b.year && a.month == b.month && a.day == b.day;

class _DayStamp extends StatelessWidget {
  const _DayStamp({required this.date});

  final DateTime date;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 8, bottom: 8),
      child: Center(
        child: Text(
          _label(date),
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w500,
            height: 1.2,
            color: _muted,
          ),
        ),
      ),
    );
  }

  static String _label(DateTime date) {
    final now = DateTime.now();
    if (_isSameDay(date, now)) return 'Today';
    if (_isSameDay(date, now.subtract(const Duration(days: 1)))) {
      return 'Yesterday';
    }
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    final month = months[date.month - 1];
    return date.year == now.year
        ? '${date.day} $month'
        : '${date.day} $month ${date.year}';
  }
}

/// System events — the match state machine's own messages — as the mock's
/// centred brand-tinted pill. Unattributed and never styled as speech.
class _SystemPill extends StatelessWidget {
  const _SystemPill({required this.message});

  final ChatMessage message;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Padding(
      padding: const EdgeInsets.only(top: 4, bottom: 12),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 320),
          child: Material(
            color: _pillFill(colors),
            borderRadius: BorderRadius.circular(999),
            clipBehavior: Clip.antiAlias,
            child: InkWell(
              onTap: () => _showSystemMessageDetail(context, message),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(
                    color: colors.primary.withValues(alpha: 0.35),
                  ),
                ),
                child: Text(
                  message.body,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    height: 1.35,
                    color: colors.primary,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _MessageRow extends StatelessWidget {
  const _MessageRow({
    required this.message,
    required this.isMine,
    required this.continuesRun,
    required this.endsRun,
    required this.sender,
    required this.onReport,
  });

  final ChatMessage message;
  final bool isMine;
  final bool continuesRun;
  final bool endsRun;
  final PlayerSummary? sender;

  /// Long-press on someone else's message. Your own aren't reportable.
  final VoidCallback onReport;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    // The flat corner marks the speaker's side; a continuation flattens the
    // trailing corner too so a run reads as one block.
    final radius = isMine
        ? BorderRadius.only(
            topLeft: const Radius.circular(18),
            topRight: const Radius.circular(6),
            bottomRight: Radius.circular(continuesRun ? 6 : 18),
            bottomLeft: const Radius.circular(18),
          )
        : BorderRadius.only(
            topLeft: const Radius.circular(6),
            topRight: const Radius.circular(18),
            bottomRight: const Radius.circular(18),
            bottomLeft: Radius.circular(continuesRun ? 6 : 18),
          );

    return Padding(
      padding: EdgeInsets.only(top: continuesRun ? 2 : 8),
      child: Row(
        mainAxisAlignment: isMine
            ? MainAxisAlignment.end
            : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isMine) ...[
            // The avatar only opens a run; later rows keep its gutter so the
            // bubbles stay aligned.
            SizedBox(
              width: 28,
              child: continuesRun
                  ? null
                  : _Avatar(
                      player: sender,
                      size: 28,
                      fontSize: 10,
                      borderWidth: 1.5,
                    ),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Column(
              crossAxisAlignment: isMine
                  ? CrossAxisAlignment.end
                  : CrossAxisAlignment.start,
              children: [
                GestureDetector(
                  onLongPress: isMine ? null : onReport,
                  child: ConstrainedBox(
                    constraints: BoxConstraints(
                      maxWidth: MediaQuery.of(context).size.width * 0.75,
                    ),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: isMine ? colors.primary : _hairline(colors),
                        borderRadius: radius,
                      ),
                      child: Text(
                        message.body,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          height: 1.4,
                          color: isMine ? Colors.white : _ink,
                        ),
                      ),
                    ),
                  ),
                ),
                if (endsRun) ...[
                  const SizedBox(height: 3),
                  Text(
                    _clockTime(message.createdAt),
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w500,
                      height: 1.2,
                      color: _muted,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

String _clockTime(DateTime t) {
  final hour = t.hour % 12 == 0 ? 12 : t.hour % 12;
  final minute = t.minute.toString().padLeft(2, '0');
  return '$hour:$minute ${t.hour < 12 ? 'AM' : 'PM'}';
}

// ---------------------------------------------------------------------------
// System message detail
// ---------------------------------------------------------------------------

void _showSystemMessageDetail(BuildContext context, ChatMessage message) {
  final type = Theme.of(context).extension<DriftTypography>()!;
  final colors = Theme.of(context).extension<DriftColors>()!;

  showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    builder: (sheetContext) => SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          DriftSpacing.s5,
          0,
          DriftSpacing.s5,
          DriftSpacing.s5,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.info_outline, color: colors.primary),
                const SizedBox(width: DriftSpacing.s3),
                Expanded(
                  child: Text(
                    _systemEventLabel(message.systemEvent),
                    style: type.h3,
                  ),
                ),
              ],
            ),
            const SizedBox(height: DriftSpacing.s3),
            Text(message.body, style: type.body),
            const SizedBox(height: DriftSpacing.s4),
            if (message.relatedMatchId != null) ...[
              _SystemLink(
                icon: Icons.sports_tennis_outlined,
                label: 'View related match',
                onTap: () {
                  Navigator.of(sheetContext).pop();
                  context.push('/matches/${message.relatedMatchId}');
                },
              ),
              const SizedBox(height: DriftSpacing.s2),
            ],
            if (message.relatedLeagueId != null)
              _SystemLink(
                icon: Icons.emoji_events_outlined,
                label: message.relatedLeagueName == null
                    ? 'View related league'
                    : 'View ${message.relatedLeagueName}',
                onTap: () {
                  Navigator.of(sheetContext).pop();
                  context.push('/compete/leagues/${message.relatedLeagueId}');
                },
              ),
          ],
        ),
      ),
    ),
  );
}

class _SystemLink extends StatelessWidget {
  const _SystemLink({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: DriftSpacing.s2),
        child: Row(
          children: [
            DriftIcon(icon, color: colors.primary),
            const SizedBox(width: DriftSpacing.s3),
            Expanded(child: Text(label, style: type.title)),
            Icon(Icons.chevron_right, color: colors.textSecondary),
          ],
        ),
      ),
    );
  }
}

String _systemEventLabel(String? event) {
  if (event == null) return 'System message';
  return event
      .split('_')
      .map(
        (word) =>
            word.isEmpty ? word : word[0].toUpperCase() + word.substring(1),
      )
      .join(' ');
}

// ---------------------------------------------------------------------------
// Composer
// ---------------------------------------------------------------------------

class _Composer extends StatefulWidget {
  const _Composer({
    required this.controller,
    required this.isSending,
    required this.onSend,
  });

  final TextEditingController controller;
  final bool isSending;
  final VoidCallback onSend;

  @override
  State<_Composer> createState() => _ComposerState();
}

class _ComposerState extends State<_Composer> {
  bool _hasText = false;

  @override
  void initState() {
    super.initState();
    _hasText = widget.controller.text.trim().isNotEmpty;
    widget.controller.addListener(_onChanged);
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onChanged);
    super.dispose();
  }

  void _onChanged() {
    final hasText = widget.controller.text.trim().isNotEmpty;
    if (hasText != _hasText) setState(() => _hasText = hasText);
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final active = _hasText && !widget.isSending;

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      decoration: BoxDecoration(
        color: colors.surface,
        border: Border(top: BorderSide(color: _hairline(colors), width: 1)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: _tintedFill(colors),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: _tintedBorder(colors), width: 1.5),
              ),
              padding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 10,
              ),
              child: TextField(
                controller: widget.controller,
                minLines: 1,
                maxLines: 4,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => widget.onSend(),
                cursorColor: colors.primary,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  height: 1.4,
                  color: _ink,
                ),
                decoration: const InputDecoration(
                  hintText: 'Message',
                  hintStyle: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    height: 1.4,
                    color: _muted,
                  ),
                  isDense: true,
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  contentPadding: EdgeInsets.zero,
                  filled: false,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          _SendButton(
            active: active,
            loading: widget.isSending,
            onTap: widget.isSending ? null : widget.onSend,
          ),
        ],
      ),
    );
  }
}

/// 44px circle — brand fill with a glow once there's something to send,
/// otherwise a flat tinted disc.
class _SendButton extends StatelessWidget {
  const _SendButton({
    required this.active,
    required this.loading,
    required this.onTap,
  });

  final bool active;
  final bool loading;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      curve: Curves.easeOut,
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        boxShadow: active
            ? [
                BoxShadow(
                  color: colors.primary.withValues(alpha: 0.25),
                  blurRadius: 16,
                  offset: const Offset(0, 4),
                ),
              ]
            : null,
      ),
      child: Material(
        color: active ? colors.primary : _tintedBorder(colors),
        shape: const CircleBorder(),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Center(
            child: loading
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : Icon(
                    Icons.send_rounded,
                    size: 20,
                    color: active ? Colors.white : _muted,
                  ),
          ),
        ),
      ),
    );
  }
}

class _SayHello extends StatelessWidget {
  const _SayHello();

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Center(
      child: Text(
        'Say hello',
        style: type.body.copyWith(color: colors.textSecondary),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Brand-tinted neutrals
//
// The mock's #F0F4FF / #F7F9FF / #E2EAFF / #F0F5FF are all its blue at low
// opacity. Deriving them from `colors.primary` keeps them in step with
// whatever the theme's brand colour is rather than pinning them to one hue.
// ---------------------------------------------------------------------------

Color _hairline(DriftColors colors) =>
    Color.alphaBlend(colors.primary.withValues(alpha: 0.07), colors.surface);

Color _tintedFill(DriftColors colors) =>
    Color.alphaBlend(colors.primary.withValues(alpha: 0.04), colors.surface);

Color _tintedBorder(DriftColors colors) =>
    Color.alphaBlend(colors.primary.withValues(alpha: 0.18), colors.surface);

Color _pillFill(DriftColors colors) =>
    Color.alphaBlend(colors.primary.withValues(alpha: 0.08), colors.surface);
