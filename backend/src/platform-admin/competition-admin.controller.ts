import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PlatformPermission } from '@prisma/client';
import { RequirePlatformPermission } from './decorators/require-platform-permission.decorator';
import { PlatformGuard } from './guards/platform.guard';
import { PlatformPermissionGuard } from './guards/platform-permission.guard';
import { CompetitionAdminService } from './competition-admin.service';
import { UpsertCompetitionRulesetDto } from './dto/competition-admin.dto';

@Controller('platform-admin/competitions')
@UseGuards(PlatformGuard, PlatformPermissionGuard)
@RequirePlatformPermission(PlatformPermission.COMPETITIONS_MANAGE)
export class CompetitionAdminController {
  constructor(private readonly competitions: CompetitionAdminService) {}

  @Get()
  listCompetitions(
    @Query('type') type?: string,
    @Query('sport') sport?: string,
    @Query('state') state?: string,
    @Query('clubId') clubId?: string,
    @Query('search') search?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.competitions.listCompetitions({
      type,
      sport,
      state,
      clubId,
      search,
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
    });
  }

  @Get('rulesets')
  listRulesets(
    @Query('sport') sport?: string,
    @Query('format') format?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.competitions.listRulesets({
      sport,
      format,
      type,
      status,
      search,
    });
  }

  @Post('rulesets')
  createRuleset(
    @Req() req: { user: { adminId: string } },
    @Body() dto: UpsertCompetitionRulesetDto,
  ) {
    return this.competitions.createRuleset(req.user.adminId, dto);
  }

  @Get('rulesets/:id')
  rulesetDetail(@Param('id') id: string) {
    return this.competitions.rulesetDetail(id);
  }

  @Patch('rulesets/:id')
  updateRuleset(
    @Req() req: { user: { adminId: string } },
    @Param('id') id: string,
    @Body() dto: UpsertCompetitionRulesetDto,
  ) {
    return this.competitions.updateRuleset(req.user.adminId, id, dto);
  }

  @Get(':type/:id')
  detail(@Param('type') type: string, @Param('id') id: string) {
    return this.competitions.detail(type, id);
  }
}
