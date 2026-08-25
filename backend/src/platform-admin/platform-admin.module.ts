import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MatchesModule } from '../matches/matches.module';
import { PlatformAdminController } from './platform-admin.controller';
import { PlatformAdminService } from './platform-admin.service';
import { AuditService } from './audit.service';
import { PlatformJwtStrategy } from './strategies/platform-jwt.strategy';

@Module({
  imports: [
    PassportModule,
    // Same secret as the player API — isolation comes from the `scope`
    // claim plus both strategies' explicit checks, not from key rotation.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): { signOptions: object; secret: string } => ({
        secret: config.get<string>('JWT_SECRET')!,
        signOptions: {
          expiresIn: (config.get<string>('PLATFORM_ADMIN_JWT_TTL') ??
            '2h') as never,
        },
      }),
    }),
    MatchesModule,
  ],
  controllers: [PlatformAdminController],
  providers: [PlatformAdminService, AuditService, PlatformJwtStrategy],
})
export class PlatformAdminModule {}
