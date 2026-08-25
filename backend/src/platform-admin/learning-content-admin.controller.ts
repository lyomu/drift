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
import { LearningContentType, PlatformPermission } from '@prisma/client';
import { RequirePlatformPermission } from './decorators/require-platform-permission.decorator';
import { PlatformGuard } from './guards/platform.guard';
import { PlatformPermissionGuard } from './guards/platform-permission.guard';
import { LearningContentAdminService } from './learning-content-admin.service';
import {
  UpsertLearningContentDto,
  UpsertLearningPathDto,
} from './dto/learning-content-admin.dto';

@Controller('platform-admin/learning-content')
@UseGuards(PlatformGuard, PlatformPermissionGuard)
@RequirePlatformPermission(PlatformPermission.CONTENT_MANAGE)
export class LearningContentAdminController {
  constructor(private readonly content: LearningContentAdminService) {}

  @Get()
  list(
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('targetSkill') targetSkill?: string,
    @Query('branch') branch?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.content.list({
      search,
      type,
      status,
      targetSkill,
      branch,
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
    });
  }

  @Get('step-options')
  stepOptions() {
    return this.content.stepOptions();
  }

  @Post('lessons')
  createLesson(
    @Req() req: { user: { adminId: string } },
    @Body() dto: UpsertLearningContentDto,
  ) {
    return this.content.createContent(req.user.adminId, LearningContentType.LESSON, dto);
  }

  @Post('drills')
  createDrill(
    @Req() req: { user: { adminId: string } },
    @Body() dto: UpsertLearningContentDto,
  ) {
    return this.content.createContent(req.user.adminId, LearningContentType.DRILL, dto);
  }

  @Post('paths')
  createPath(
    @Req() req: { user: { adminId: string } },
    @Body() dto: UpsertLearningPathDto,
  ) {
    return this.content.createPath(req.user.adminId, dto);
  }

  @Patch('paths/:id')
  updatePath(
    @Req() req: { user: { adminId: string } },
    @Param('id') id: string,
    @Body() dto: UpsertLearningPathDto,
  ) {
    return this.content.updatePath(req.user.adminId, id, dto);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.content.detail(id);
  }

  @Patch(':id')
  updateContent(
    @Req() req: { user: { adminId: string } },
    @Param('id') id: string,
    @Body() dto: UpsertLearningContentDto,
  ) {
    return this.content.updateContent(req.user.adminId, id, dto);
  }
}
