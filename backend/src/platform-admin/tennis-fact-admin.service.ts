import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';
import {
  factIndexForDay,
  tennisFactImagePath,
} from '../tennis-facts/tennis-facts.service';
import {
  TennisFactInputDto,
  UpdateTennisFactDto,
} from './dto/tennis-fact-admin.dto';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const include = {
  image: { select: { id: true, createdAt: true } },
} satisfies Prisma.TennisFactInclude;

type Row = Prisma.TennisFactGetPayload<{ include: typeof include }>;

@Injectable()
export class TennisFactAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private dto(row: Row, todayId: string | null) {
    const { image, ...rest } = row;
    return {
      ...rest,
      imageUrl: image ? tennisFactImagePath(image.id, image.createdAt) : null,
      isToday: row.id === todayId,
    };
  }

  private async todayId(now = new Date()): Promise<string | null> {
    const active = await this.prisma.tennisFact.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });
    const index = factIndexForDay(now, active.length);
    return index < 0 ? null : active[index].id;
  }

  private validateImage(image?: Express.Multer.File) {
    if (!image) return;
    if (!IMAGE_TYPES.includes(image.mimetype) || image.size > MAX_IMAGE_BYTES) {
      throw new BadRequestException(
        'Image must be a JPEG, PNG or WebP file of 5 MB or less.',
      );
    }
  }

  private imageData(image: Express.Multer.File) {
    return {
      filename: image.originalname,
      mimeType: image.mimetype,
      bytes: new Uint8Array(image.buffer),
    };
  }

  private textData(dto: TennisFactInputDto) {
    return {
      titleEn: dto.titleEn,
      titleFr: dto.titleFr,
      titleEs: dto.titleEs,
      bodyEn: dto.bodyEn,
      bodyFr: dto.bodyFr,
      bodyEs: dto.bodyEs,
      sourceEn: dto.sourceEn ?? null,
      sourceFr: dto.sourceFr ?? null,
      sourceEs: dto.sourceEs ?? null,
      ...(dto.active !== undefined ? { active: dto.active } : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
    };
  }

  async list() {
    const [rows, todayId] = await Promise.all([
      this.prisma.tennisFact.findMany({
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        include,
      }),
      this.todayId(),
    ]);
    return rows.map((row) => this.dto(row, todayId));
  }

  async get(id: string) {
    const row = await this.prisma.tennisFact.findUnique({
      where: { id },
      include,
    });
    if (!row) throw new NotFoundException('Fact not found.');
    return this.dto(row, await this.todayId());
  }

  async create(
    actorId: string,
    dto: TennisFactInputDto,
    image?: Express.Multer.File,
  ) {
    this.validateImage(image);
    // New facts go to the end of the rotation unless an order was given.
    const last = await this.prisma.tennisFact.aggregate({
      _max: { sortOrder: true },
    });
    const row = await this.prisma.tennisFact.create({
      data: {
        ...this.textData(dto),
        sortOrder: dto.sortOrder ?? (last._max.sortOrder ?? -1) + 1,
        ...(image ? { image: { create: this.imageData(image) } } : {}),
      },
      include,
    });
    await this.audit.record(actorId, 'tennis_fact.create', 'TennisFact', row.id, {
      title: row.titleEn,
      hasImage: Boolean(image),
    });
    return this.dto(row, await this.todayId());
  }

  async update(
    actorId: string,
    id: string,
    dto: UpdateTennisFactDto,
    image?: Express.Multer.File,
  ) {
    this.validateImage(image);
    const existing = await this.prisma.tennisFact.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Fact not found.');

    const row = await this.prisma.$transaction(async (tx) => {
      if (image || dto.removeImage) {
        // A replaced image gets a new asset id, so its URL changes and no
        // client keeps showing a cached copy of the old one.
        await tx.tennisFactImageAsset.deleteMany({ where: { factId: id } });
      }
      return tx.tennisFact.update({
        where: { id },
        data: {
          ...this.textData(dto),
          ...(image ? { image: { create: this.imageData(image) } } : {}),
        },
        include,
      });
    });
    await this.audit.record(actorId, 'tennis_fact.update', 'TennisFact', id, {
      imageReplaced: Boolean(image),
      imageRemoved: Boolean(dto.removeImage && !image),
    });
    return this.dto(row, await this.todayId());
  }

  async setActive(actorId: string, id: string, active: boolean) {
    const result = await this.prisma.tennisFact.updateMany({
      where: { id },
      data: { active },
    });
    if (result.count === 0) throw new NotFoundException('Fact not found.');
    await this.audit.record(
      actorId,
      active ? 'tennis_fact.activate' : 'tennis_fact.deactivate',
      'TennisFact',
      id,
    );
    return this.get(id);
  }

  async remove(actorId: string, id: string) {
    const result = await this.prisma.tennisFact.deleteMany({ where: { id } });
    if (result.count === 0) throw new NotFoundException('Fact not found.');
    await this.audit.record(actorId, 'tennis_fact.delete', 'TennisFact', id);
    return { removed: true };
  }
}
