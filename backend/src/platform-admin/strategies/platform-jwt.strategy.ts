import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

export interface PlatformJwtPayload {
  sub: string;
  // Player tokens carry no scope; this field is what keeps the two token
  // families mutually invalid. Both strategies check it explicitly.
  scope: 'platform';
}

@Injectable()
export class PlatformJwtStrategy extends PassportStrategy(
  Strategy,
  'platform-jwt',
) {
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

  async validate(payload: PlatformJwtPayload) {
    if (payload.scope !== 'platform') {
      throw new UnauthorizedException();
    }

    const admin = await this.prisma.platformAdmin.findUnique({
      where: { id: payload.sub },
      select: { id: true, deactivatedAt: true },
    });

    if (!admin || admin.deactivatedAt) {
      throw new UnauthorizedException();
    }

    return { adminId: admin.id };
  }
}
