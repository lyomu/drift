import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MatchesModule } from '../matches/matches.module';
import { PaymentsModule } from '../payments/payments.module';
import { PasswordPolicyService } from '../auth/password-policy';
import { PlatformAdminController } from './platform-admin.controller';
import { PlatformAdminService } from './platform-admin.service';
import { AuditService } from './audit.service';
import { PlatformJwtStrategy } from './strategies/platform-jwt.strategy';
import { AccessControlController } from './access-control.controller';
import { AccessControlService } from './access-control.service';
import { PlatformPermissionGuard } from './guards/platform-permission.guard';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PlatformAnalyticsController } from './platform-analytics.controller';
import { PlatformAnalyticsService } from './platform-analytics.service';
import { PlatformTelemetryService } from './platform-telemetry.service';
import { VenueAdminController } from './venue-admin.controller';
import { VenueAdminService } from './venue-admin.service';
import { OrganizationAdminController } from './organization-admin.controller';
import { OrganizationAdminService } from './organization-admin.service';
import { CompetitionAdminController } from './competition-admin.controller';
import { CompetitionAdminService } from './competition-admin.service';
import { LearningContentAdminController } from './learning-content-admin.controller';
import { LearningContentAdminService } from './learning-content-admin.service';
import { CommercialAdminController } from './commercial-admin.controller';
import { CommercialAdminService } from './commercial-admin.service';
import { TrustSafetyAdminController } from './trust-safety-admin.controller';
import { TrustSafetyAdminService } from './trust-safety-admin.service';
import { PlatformConfigAdminController } from './platform-config-admin.controller';
import { PlatformConfigAdminService } from './platform-config-admin.service';
import { SupportAdminController } from './support-admin.controller';
import { SupportAdminService } from './support-admin.service';

@Module({
  imports: [
    PassportModule,
    // Same secret as the player API — isolation comes from the `scope`
    // claim plus both strategies' explicit checks, not from key rotation.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (
        config: ConfigService,
      ): { signOptions: object; secret: string } => ({
        secret: config.get<string>('JWT_SECRET')!,
        signOptions: {
          expiresIn: (config.get<string>('PLATFORM_ADMIN_JWT_TTL') ??
            '2h') as never,
        },
      }),
    }),
    MatchesModule,
    // Repricing a plan, refunding a charge and cancelling a mandate are all
    // provider calls. Reusing the payments module's seam is what keeps the two
    // consoles from drifting into two different ideas of what is live.
    PaymentsModule,
  ],
  controllers: [
    PlatformAdminController,
    AccessControlController,
    PlatformAnalyticsController,
    VenueAdminController,
    OrganizationAdminController,
    CompetitionAdminController,
    LearningContentAdminController,
    CommercialAdminController,
    TrustSafetyAdminController,
    PlatformConfigAdminController,
    SupportAdminController,
  ],
  providers: [
    PlatformAdminService,
    AccessControlService,
    PlatformAnalyticsService,
    PlatformTelemetryService,
    VenueAdminService,
    OrganizationAdminService,
    CompetitionAdminService,
    LearningContentAdminService,
    CommercialAdminService,
    TrustSafetyAdminService,
    PlatformConfigAdminService,
    SupportAdminService,
    AuditService,
    PlatformJwtStrategy,
    PlatformPermissionGuard,
    PasswordPolicyService,
    { provide: APP_INTERCEPTOR, useExisting: PlatformTelemetryService },
  ],
})
export class PlatformAdminModule {}
