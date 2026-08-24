import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlayersService } from './players.service';
import { SearchPlayersDto } from './dto/search-players.dto';

@Controller('players')
@UseGuards(JwtAuthGuard)
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  private userId(req: Request): string {
    return (req.user as { userId: string }).userId;
  }

  @Get()
  search(@Req() req: Request, @Query() dto: SearchPlayersDto) {
    return this.playersService.search(this.userId(req), dto);
  }

  // Registered before `:id` — otherwise Nest would route `/players/me` here
  // with `id: 'me'`.
  @Get('me')
  getOwnProfile(@Req() req: Request) {
    return this.playersService.getOwnProfile(this.userId(req));
  }

  @Get(':id')
  findOne(@Req() req: Request, @Param('id') id: string) {
    return this.playersService.findOne(this.userId(req), id);
  }
}
