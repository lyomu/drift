import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePrivacySettingsDto } from './dto/update-privacy-settings.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private userId(req: Request): string {
    return (req.user as { userId: string }).userId;
  }

  @Get('me')
  me(@Req() req: Request) {
    return this.usersService.findById(this.userId(req));
  }

  @Patch('me/profile')
  updateProfile(@Req() req: Request, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(this.userId(req), dto);
  }

  @Get('me/privacy-settings')
  getPrivacySettings(@Req() req: Request) {
    return this.usersService.getPrivacySettings(this.userId(req));
  }

  @Patch('me/privacy-settings')
  updatePrivacySettings(
    @Req() req: Request,
    @Body() dto: UpdatePrivacySettingsDto,
  ) {
    return this.usersService.updatePrivacySettings(this.userId(req), dto);
  }

  @Post('me/delete')
  deleteAccount(@Req() req: Request) {
    return this.usersService.deleteAccount(this.userId(req));
  }
}
