import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { DevicePlatform } from '@prisma/client';

export class RegisterDeviceDto {
  /** An FCM registration token. Long, but bounded — the column is unindexed
   * text and an unbounded field is a free write amplifier. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  token!: string;

  @IsIn([DevicePlatform.ANDROID, DevicePlatform.IOS])
  platform!: DevicePlatform;
}
