import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET')!,
    });
  }

  // Loads the user on every authenticated request so a suspension (or
  // deletion) takes effect within the access token's TTL, not after it.
  async validate(payload: JwtPayload & { scope?: string }) {
    // A platform-admin token must never satisfy a player route. Isolation
    // is enforced in both directions (PlatformJwtStrategy requires scope).
    if (payload.scope) {
      throw new UnauthorizedException();
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, accountStatus: true },
    });

    if (!user || user.accountStatus !== 'ACTIVE') {
      throw new UnauthorizedException();
    }

    return { userId: user.id };
  }
}
