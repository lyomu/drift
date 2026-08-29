import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/location/location_service.dart';
import '../../../core/onboarding/onboarding_step_route.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../../../shared/widgets/drift_text_field.dart';
import '../../auth/data/auth_repository.dart';
import '../../users/data/users_repository.dart';

/// Location — `foundation/04-screen-inventory.md` A.2. "Use current
/// location" resolves GPS coordinates to a city/area string; a denied
/// permission or failed lookup falls back to manual entry, matching the
/// screen inventory's documented error case exactly.
class LocationScreen extends ConsumerStatefulWidget {
  const LocationScreen({super.key});

  @override
  ConsumerState<LocationScreen> createState() => _LocationScreenState();
}

class _LocationScreenState extends ConsumerState<LocationScreen> {
  final _locationController = TextEditingController();
  double? _latitude;
  double? _longitude;
  String _locationSource = 'MANUAL';
  bool _isLocating = false;
  bool _isSubmitting = false;
  String? _errorText;

  @override
  void dispose() {
    _locationController.dispose();
    super.dispose();
  }

  Future<void> _useCurrentLocation() async {
    setState(() {
      _isLocating = true;
      _errorText = null;
    });

    try {
      final resolved = await ref
          .read(locationServiceProvider)
          .getCurrentLocation();

      setState(() {
        _latitude = resolved.latitude;
        _longitude = resolved.longitude;
        _locationSource = 'GPS';
        _locationController.text =
            resolved.label ??
            '${resolved.latitude.toStringAsFixed(2)}, ${resolved.longitude.toStringAsFixed(2)}';
      });
    } on LocationUnavailableException catch (e) {
      setState(
        () => _errorText = '${e.message} Enter your location manually below.',
      );
    } catch (_) {
      setState(
        () => _errorText =
            "Couldn't determine your location. Enter it manually below.",
      );
    } finally {
      if (mounted) setState(() => _isLocating = false);
    }
  }

  Future<void> _submit() async {
    if (_locationController.text.trim().isEmpty) {
      setState(() => _errorText = 'Enter your general location to continue.');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorText = null;
    });
    try {
      final nextStep = await ref
          .read(usersRepositoryProvider)
          .updateLocation(
            generalLocation: _locationController.text.trim(),
            latitude: _latitude,
            longitude: _longitude,
            locationSource: _locationSource,
          );
      if (!mounted) return;
      goToOnboardingStep(context, nextStep);
    } on AuthException catch (e) {
      setState(() => _errorText = e.message);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftScaffold(
      title: 'Location',
      body: Padding(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            DriftTextField(
              label: 'General location / city',
              controller: _locationController,
              onChanged: (_) => setState(() => _locationSource = 'MANUAL'),
            ),
            const SizedBox(height: DriftSpacing.s3),
            DriftButton(
              label: _isLocating ? 'Locating…' : 'Use current location',
              variant: DriftButtonVariant.text,
              onPressed: _isLocating ? null : _useCurrentLocation,
            ),
            if (_errorText != null) ...[
              const SizedBox(height: DriftSpacing.s3),
              Text(_errorText!, style: TextStyle(color: colors.error)),
            ],
            const SizedBox(height: DriftSpacing.s6),
            DriftButton(
              label: _isSubmitting ? 'Saving…' : 'Continue',
              onPressed: _isSubmitting ? null : _submit,
            ),
          ],
        ),
      ),
    );
  }
}
