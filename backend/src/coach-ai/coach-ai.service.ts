import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

const SETTING_ID = 'default';
const MODEL = 'deepseek-flash';

@Injectable()
export class CoachAiService {
  constructor(private readonly prisma: PrismaService) {}

  async status() {
    const row = await this.prisma.coachAiSetting.findUnique({
      where: { id: SETTING_ID },
    });
    return {
      provider: 'deepseek',
      model: row?.model ?? MODEL,
      configured: Boolean(row?.encryptedKey),
      enabled: row?.enabled ?? false,
      updatedAt: row?.updatedAt ?? null,
    };
  }

  async saveKey(key: string) {
    const trimmed = key.trim();
    if (!trimmed || trimmed.length > 512 || /[\r\n]/.test(trimmed)) {
      throw new BadRequestException('Enter a valid DeepSeek API key.');
    }
    await this.prisma.coachAiSetting.upsert({
      where: { id: SETTING_ID },
      create: {
        id: SETTING_ID,
        encryptedKey: this.encrypt(trimmed),
        model: MODEL,
        enabled: true,
      },
      update: {
        encryptedKey: this.encrypt(trimmed),
        model: MODEL,
        enabled: true,
      },
    });
    return this.status();
  }

  async setEnabled(enabled: boolean) {
    const row = await this.prisma.coachAiSetting.findUnique({
      where: { id: SETTING_ID },
    });
    if (!row) throw new BadRequestException('Add a DeepSeek API key first.');
    await this.prisma.coachAiSetting.update({
      where: { id: SETTING_ID },
      data: { enabled },
    });
    return this.status();
  }

  async active(): Promise<{ key: string; model: string } | null> {
    const row = await this.prisma.coachAiSetting.findUnique({
      where: { id: SETTING_ID },
    });
    if (!row?.enabled) return null;
    return { key: this.decrypt(row.encryptedKey), model: row.model };
  }

  async generateJson(
    system: string,
    input: string,
  ): Promise<{ result: unknown; model: string }> {
    const active = await this.active();
    if (!active)
      throw new ServiceUnavailableException({
        code: 'COACH_UNAVAILABLE',
        message: 'AI Coach is not configured.',
      });
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      signal: AbortSignal.timeout(45_000),
      headers: {
        Authorization: `Bearer ${active.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: active.model,
        messages: [
          {
            role: 'system',
            content: `${system} Respond with a JSON object only.`,
          },
          { role: 'user', content: input },
        ],
        thinking: { type: 'disabled' },
        response_format: { type: 'json_object' },
        max_tokens: 900,
        stream: false,
      }),
    });
    if (response.status === 401 || response.status === 403) {
      throw new BadRequestException('DeepSeek rejected the saved API key. Replace it and test again.');
    }
    if (!response.ok) throw new Error('COACH_FAILED');
    const payload = (await response.json()) as {
      choices?: {
        finish_reason?: string;
        message?: { content?: string | null };
      }[];
    };
    const choice = payload.choices?.[0];
    if (choice?.finish_reason !== 'stop' || !choice.message?.content?.trim()) {
      throw new Error('COACH_FAILED');
    }
    return { result: JSON.parse(choice.message.content), model: active.model };
  }

  private cipherKey(): Buffer {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32)
      throw new Error(
        'JWT_SECRET is required to protect AI Coach credentials.',
      );
    return createHash('sha256')
      .update('drift-coach-ai-v1:')
      .update(secret)
      .digest();
  }

  private encrypt(value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.cipherKey(), iv);
    const body = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return [
      'v1',
      iv.toString('base64url'),
      cipher.getAuthTag().toString('base64url'),
      body.toString('base64url'),
    ].join('.');
  }

  private decrypt(value: string): string {
    const [version, iv, tag, body] = value.split('.');
    if (version !== 'v1' || !iv || !tag || !body)
      throw new Error('Invalid AI Coach credential.');
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.cipherKey(),
      Buffer.from(iv, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(body, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }
}
