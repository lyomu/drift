import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { MessagingGateway } from './messaging.gateway';
import { RealtimePublisher } from './realtime.publisher';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    // Registered here as well as in AuthModule so the gateway can verify
    // handshake tokens without importing AuthModule (which would pull in
    // Passport strategies the socket layer has no use for). Same secret.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
    }),
    NotificationsModule,
  ],
  controllers: [MessagingController],
  providers: [MessagingService, MessagingGateway, RealtimePublisher],
  exports: [MessagingService, RealtimePublisher],
})
export class MessagingModule {}
