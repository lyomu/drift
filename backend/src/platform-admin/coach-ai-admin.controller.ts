import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean, IsString, MaxLength, MinLength } from 'class-validator';
import { PlatformPermission } from '@prisma/client';
import { CoachAiService } from '../coach-ai/coach-ai.service';
import { AuditService } from './audit.service';
import { RequirePlatformPermission } from './decorators/require-platform-permission.decorator';
import { PlatformGuard } from './guards/platform.guard';
import { PlatformPermissionGuard } from './guards/platform-permission.guard';

class SaveCoachKeyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  apiKey!: string;
}

class SetCoachEnabledDto {
  @IsBoolean()
  enabled!: boolean;
}

@Controller('platform-admin/coach-ai')
@UseGuards(PlatformGuard, PlatformPermissionGuard)
@RequirePlatformPermission(PlatformPermission.PLATFORM_CONFIG_MANAGE)
export class CoachAiAdminController {
  constructor(
    private readonly coachAi: CoachAiService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  status() {
    return this.coachAi.status();
  }

  @Post('key')
  async saveKey(
    @Req() req: { user: { adminId: string } },
    @Body() dto: SaveCoachKeyDto,
  ) {
    const status = await this.coachAi.saveKey(dto.apiKey);
    await this.audit.record(
      req.user.adminId,
      'COACH_AI_KEY_SAVED',
      'CoachAiSetting',
      'default',
      { provider: 'deepseek' },
    );
    return status;
  }

  @Patch('enabled')
  async setEnabled(
    @Req() req: { user: { adminId: string } },
    @Body() dto: SetCoachEnabledDto,
  ) {
    const status = await this.coachAi.setEnabled(dto.enabled);
    await this.audit.record(
      req.user.adminId,
      dto.enabled ? 'COACH_AI_ENABLED' : 'COACH_AI_DISABLED',
      'CoachAiSetting',
      'default',
    );
    return status;
  }

  @Post('test')
  async test() {
    await this.coachAi.generateJson(
      'Return JSON with exactly one field: {"ok":true}.',
      'Check this connection.',
    );
    return { ok: true };
  }
}
