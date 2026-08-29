import { Module } from '@nestjs/common';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';

@Module({
  controllers: [PlayersController],
  providers: [PlayersService],
  // Second consumer: HomeModule's suggested-opponents card reuses M5's
  // ranked proximity/level-compatibility search rather than defining a
  // second, subtly different notion of "a good match".
  exports: [PlayersService],
})
export class PlayersModule {}
