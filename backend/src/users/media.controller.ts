import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { UsersService } from './users.service';

/**
 * Public read side of uploaded profile photos — deliberately a separate
 * controller from `UsersController` so it carries no `JwtAuthGuard`.
 *
 * `NetworkImage` on the mobile client cannot attach a bearer token that stays
 * valid across a refresh, so the bytes have to be reachable unauthenticated.
 * The trade is bounded by addressing photos through the asset's UUID rather
 * than the owner's user id: knowing a member's id tells you nothing about
 * where their photo lives, so the route can't be walked across the member
 * list. A photo is in any case visible to anyone who can see the player.
 */
@Controller('media')
export class MediaController {
  constructor(private readonly usersService: UsersService) {}

  @Get('user-photos/:id')
  async userPhoto(@Param('id') id: string, @Res() res: Response) {
    const asset = await this.usersService.photoContent(id);
    res.setHeader('Content-Type', asset.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${asset.filename.replaceAll('"', '')}"`,
    );
    // Bytes are replaced in place on re-upload but the asset id is stable, so
    // let clients cache briefly without pinning a stale photo for long.
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(Buffer.from(asset.bytes));
  }
}
