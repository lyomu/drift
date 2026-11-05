import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PlatformPermission } from '@prisma/client';
import { RequirePlatformPermission } from './decorators/require-platform-permission.decorator';
import { PlatformGuard } from './guards/platform.guard';
import { PlatformPermissionGuard } from './guards/platform-permission.guard';
import { TennisFactAdminService } from './tennis-fact-admin.service';
import {
  TennisFactInputDto,
  ToggleTennisFactDto,
  UpdateTennisFactDto,
} from './dto/tennis-fact-admin.dto';

const imageUpload = FileInterceptor('image', {
  limits: { fileSize: 5 * 1024 * 1024 },
});

/**
 * Curation of the daily tennis fact shown on mobile Home. Content work, so
 * gated on CONTENT_MANAGE like the learning library. Every write is
 * audit-logged by the service.
 */
@Controller('platform-admin/tennis-facts')
@UseGuards(PlatformGuard, PlatformPermissionGuard)
@RequirePlatformPermission(PlatformPermission.CONTENT_MANAGE)
export class TennisFactAdminController {
  constructor(private readonly facts: TennisFactAdminService) {}

  @Get()
  list() {
    return this.facts.list();
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.facts.get(id);
  }

  @Post()
  @UseInterceptors(imageUpload)
  create(
    @Req() req: { user: { adminId: string } },
    @Body() dto: TennisFactInputDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.facts.create(req.user.adminId, dto, image);
  }

  @Put(':id')
  @UseInterceptors(imageUpload)
  update(
    @Req() req: { user: { adminId: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTennisFactDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.facts.update(req.user.adminId, id, dto, image);
  }

  @Patch(':id/active')
  setActive(
    @Req() req: { user: { adminId: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ToggleTennisFactDto,
  ) {
    return this.facts.setActive(req.user.adminId, id, dto.active);
  }

  @Delete(':id')
  remove(
    @Req() req: { user: { adminId: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.facts.remove(req.user.adminId, id);
  }
}
