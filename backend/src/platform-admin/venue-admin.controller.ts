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
import { VenueAdminService } from './venue-admin.service';
import {
  BulkVenueActionDto,
  MergeVenuesDto,
  ReviewVenueVerificationDto,
  UpsertPlatformVenueDto,
  VenuePairDto,
} from './dto/venue-admin.dto';

@Controller('platform-admin/venues')
@UseGuards(PlatformGuard, PlatformPermissionGuard)
@RequirePlatformPermission(PlatformPermission.VENUES_MANAGE)
export class VenueAdminController {
  constructor(private readonly venues: VenueAdminService) {}

  @Get()
  list(
    @Query('search') search?: string,
    @Query('verification') verification?: string,
    @Query('placesSync') placesSync?: string,
    @Query('clubId') clubId?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.venues.list({
      search,
      verification,
      placesSync,
      clubId,
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
    });
  }

  @Post()
  create(
    @Req() req: { user: { adminId: string } },
    @Body() dto: UpsertPlatformVenueDto,
  ) {
    return this.venues.create(req.user.adminId, dto);
  }

  @Post('bulk')
  bulk(
    @Req() req: { user: { adminId: string } },
    @Body() dto: BulkVenueActionDto,
  ) {
    return this.venues.bulk(req.user.adminId, dto);
  }

  @Get('clubs')
  clubOptions() {
    return this.venues.clubOptions();
  }

  @Get('places-sync')
  placesSyncStatus() {
    return this.venues.placesSyncStatus();
  }

  @Post(':id/places-sync')
  forcePlacesSync(
    @Req() req: { user: { adminId: string } },
    @Param('id') id: string,
  ) {
    return this.venues.forcePlacesSync(req.user.adminId, id);
  }

  @Get('verifications')
  verificationRequests(@Query('status') status?: string) {
    return this.venues.verificationRequests(status);
  }

  @Patch('verifications/:requestId')
  reviewVerification(
    @Req() req: { user: { adminId: string } },
    @Param('requestId') requestId: string,
    @Body() dto: ReviewVenueVerificationDto,
  ) {
    return this.venues.reviewVerification(req.user.adminId, requestId, dto);
  }

  @Get('duplicates')
  duplicateCandidates() {
    return this.venues.duplicateCandidates();
  }

  @Post('duplicates/distinct')
  markDistinct(
    @Req() req: { user: { adminId: string } },
    @Body() dto: VenuePairDto,
  ) {
    return this.venues.markDistinct(req.user.adminId, dto);
  }

  @Post('duplicates/merge')
  merge(
    @Req() req: { user: { adminId: string } },
    @Body() dto: MergeVenuesDto,
  ) {
    return this.venues.merge(req.user.adminId, dto);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.venues.detail(id);
  }

  @Patch(':id')
  update(
    @Req() req: { user: { adminId: string } },
    @Param('id') id: string,
    @Body() dto: UpsertPlatformVenueDto,
  ) {
    return this.venues.update(req.user.adminId, id, dto);
  }
}
