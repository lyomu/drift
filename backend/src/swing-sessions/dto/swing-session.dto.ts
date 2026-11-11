import { SwingSessionSource, SwingStroke } from '@prisma/client';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * What the app sends after a Swing Check session: numbers it derived on the
 * phone, never video or pose landmarks. `metrics` and `summary` are checked for
 * shape and size in SwingSessionsService, since their keys grow with the pose
 * model.
 */
export class CreateSwingSessionDto {
  @IsEnum(SwingStroke)
  stroke!: SwingStroke;

  @IsIn(['LEFT', 'RIGHT'])
  dominantHand!: 'LEFT' | 'RIGHT';

  @IsInt()
  @Min(0)
  @Max(200)
  swingsDetected!: number;

  @IsInt()
  @Min(0)
  @Max(200)
  swingsMeasured!: number;

  @IsObject()
  metrics!: Record<string, unknown>;

  @IsObject()
  summary!: Record<string, unknown>;

  @IsString()
  @MaxLength(80)
  poseModel!: string;

  @IsString()
  @MaxLength(40)
  appVersion!: string;

  /** LIVE (default, older app builds omit it) or CLIP. */
  @IsOptional()
  @IsEnum(SwingSessionSource)
  source?: SwingSessionSource;
}
