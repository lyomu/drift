import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountStatus,
  PlatformPermission,
  PrivacyRequestStatus,
  PrivacyRequestType,
  Prisma,
  SupportTicketPriority,
  SupportTicketStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';
import { MailerService } from '../mail/mailer.service';
import { ErasureService } from '../privacy/erasure.service';
import {
  AssignSupportTicketDto,
  CloseSupportTicketDto,
  CreatePrivacyRequestDto,
  CreateSupportTicketDto,
  ProcessPrivacyRequestDto,
  RespondSupportTicketDto,
} from './dto/support-admin.dto';

const USER_SUMMARY_SELECT = {
  id: true,
  email: true,
  phone: true,
  firstName: true,
  lastName: true,
  accountStatus: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

const ADMIN_SUMMARY_SELECT = {
  id: true,
  email: true,
  name: true,
} satisfies Prisma.PlatformAdminSelect;

const TICKET_INCLUDE = {
  user: { select: USER_SUMMARY_SELECT },
  assignedTo: { select: ADMIN_SUMMARY_SELECT },
  resolvedBy: { select: ADMIN_SUMMARY_SELECT },
  messages: {
    include: { actor: { select: ADMIN_SUMMARY_SELECT } },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.SupportTicketInclude;

const PRIVACY_INCLUDE = {
  user: { select: USER_SUMMARY_SELECT },
  processedBy: { select: ADMIN_SUMMARY_SELECT },
} satisfies Prisma.PrivacyRequestInclude;

@Injectable()
export class SupportAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mailer: MailerService,
    private readonly erasure: ErasureService,
  ) {}

  async listTickets(query: {
    status?: string;
    priority?: string;
    assignedToId?: string;
    search?: string;
  }) {
    const status = this.enumValue(SupportTicketStatus, query.status);
    const priority = this.enumValue(SupportTicketPriority, query.priority);
    const search = query.search?.trim();
    const tickets = await this.prisma.supportTicket.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(priority ? { priority } : {}),
        ...(query.assignedToId === 'UNASSIGNED'
          ? { assignedToId: null }
          : query.assignedToId
            ? { assignedToId: query.assignedToId }
            : {}),
        ...(search
          ? {
              OR: [
                { subject: { contains: search, mode: 'insensitive' } },
                { body: { contains: search, mode: 'insensitive' } },
                { user: { email: { contains: search, mode: 'insensitive' } } },
                {
                  user: {
                    firstName: { contains: search, mode: 'insensitive' },
                  },
                },
                {
                  user: { lastName: { contains: search, mode: 'insensitive' } },
                },
              ],
            }
          : {}),
      },
      include: TICKET_INCLUDE,
      orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
      take: 250,
    });
    const staff = await this.supportStaffOptions();
    return { tickets: tickets.map((ticket) => this.ticketDto(ticket)), staff };
  }

  async createTicket(actorId: string, dto: CreateSupportTicketDto) {
    await this.validateUser(dto.userId);
    const ticket = await this.prisma.supportTicket.create({
      data: {
        userId: dto.userId?.trim() || null,
        subject: dto.subject.trim(),
        body: dto.body.trim(),
        category: dto.category,
        priority: dto.priority,
      },
      include: TICKET_INCLUDE,
    });
    await this.audit.record(
      actorId,
      'support.ticket.create',
      'SupportTicket',
      ticket.id,
      {
        userId: ticket.userId,
        category: ticket.category,
        priority: ticket.priority,
      },
    );
    return { ticket: this.ticketDto(ticket) };
  }

  async ticketDetail(ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: TICKET_INCLUDE,
    });
    if (!ticket) throw new NotFoundException('Support ticket not found.');
    return { ticket: this.ticketDto(ticket) };
  }

  async assignTicket(
    actorId: string,
    ticketId: string,
    dto: AssignSupportTicketDto,
  ) {
    const existing = await this.requireTicket(ticketId);
    if (existing.status === SupportTicketStatus.RESOLVED) {
      throw new BadRequestException('Resolved tickets cannot be reassigned.');
    }
    const assignedToId = dto.assignedToId?.trim() || null;
    if (assignedToId) await this.requireSupportAdmin(assignedToId);
    const ticket = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        assignedToId,
        status: assignedToId
          ? SupportTicketStatus.ASSIGNED
          : SupportTicketStatus.OPEN,
      },
      include: TICKET_INCLUDE,
    });
    await this.audit.record(
      actorId,
      'support.ticket.assign',
      'SupportTicket',
      ticketId,
      {
        previousAssignedToId: existing.assignedToId,
        assignedToId,
      },
    );
    return { ticket: this.ticketDto(ticket) };
  }

  async respondToTicket(
    actorId: string,
    ticketId: string,
    dto: RespondSupportTicketDto,
  ) {
    const existing = await this.requireTicket(ticketId);
    if (existing.status === SupportTicketStatus.RESOLVED) {
      throw new BadRequestException(
        'Resolved tickets cannot receive new responses.',
      );
    }
    await this.prisma.supportTicketMessage.create({
      data: {
        ticketId,
        actorId,
        body: dto.body.trim(),
      },
    });
    const ticket = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        assignedToId: existing.assignedToId ?? actorId,
        status: SupportTicketStatus.ASSIGNED,
      },
      include: TICKET_INCLUDE,
    });
    await this.audit.record(
      actorId,
      'support.ticket.respond',
      'SupportTicket',
      ticketId,
      {
        responseLength: dto.body.trim().length,
      },
    );
    // Best-effort delivery of the reply to the ticket's user (no-op when SMTP
    // is not configured). The reply is already stored either way.
    if (existing.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: existing.userId },
        select: { email: true },
      });
      if (user?.email) {
        await this.mailer.sendSupportReply(
          user.email,
          existing.subject,
          dto.body.trim(),
        );
      }
    }
    return { ticket: this.ticketDto(ticket) };
  }

  async closeTicket(
    actorId: string,
    ticketId: string,
    dto: CloseSupportTicketDto,
  ) {
    const existing = await this.requireTicket(ticketId);
    if (existing.status === SupportTicketStatus.RESOLVED) {
      throw new BadRequestException('This ticket is already resolved.');
    }
    const ticket = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: SupportTicketStatus.RESOLVED,
        resolvedById: actorId,
        resolvedAt: new Date(),
        resolutionNote: dto.resolutionNote.trim(),
      },
      include: TICKET_INCLUDE,
    });
    await this.audit.record(
      actorId,
      'support.ticket.resolve',
      'SupportTicket',
      ticketId,
      {
        previousStatus: existing.status,
        resolutionNote: dto.resolutionNote.trim(),
      },
    );
    return { ticket: this.ticketDto(ticket) };
  }

  async listPrivacyRequests(query: {
    status?: string;
    type?: string;
    search?: string;
  }) {
    const status = this.enumValue(PrivacyRequestStatus, query.status);
    const type = this.enumValue(PrivacyRequestType, query.type);
    const search = query.search?.trim();
    const requests = await this.prisma.privacyRequest.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(type ? { type } : {}),
        ...(search
          ? {
              OR: [
                { requestNote: { contains: search, mode: 'insensitive' } },
                { fulfillmentNote: { contains: search, mode: 'insensitive' } },
                { user: { email: { contains: search, mode: 'insensitive' } } },
                {
                  user: {
                    firstName: { contains: search, mode: 'insensitive' },
                  },
                },
                {
                  user: { lastName: { contains: search, mode: 'insensitive' } },
                },
              ],
            }
          : {}),
      },
      include: PRIVACY_INCLUDE,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 250,
    });
    return { requests: requests.map((request) => this.privacyDto(request)) };
  }

  async createPrivacyRequest(actorId: string, dto: CreatePrivacyRequestDto) {
    const user = await this.resolvePrivacyUser(dto);
    const existingPending = await this.prisma.privacyRequest.findFirst({
      where: {
        userId: user.id,
        type: dto.type,
        status: PrivacyRequestStatus.PENDING,
      },
    });
    if (existingPending) {
      throw new BadRequestException(
        'This user already has a pending request of that type.',
      );
    }
    const request = await this.prisma.privacyRequest.create({
      data: {
        userId: user.id,
        type: dto.type,
        requestNote: dto.requestNote?.trim() || null,
      },
      include: PRIVACY_INCLUDE,
    });
    await this.audit.record(
      actorId,
      'support.privacy_request.create',
      'PrivacyRequest',
      request.id,
      {
        userId: user.id,
        type: request.type,
      },
    );
    return { request: this.privacyDto(request) };
  }

  async processPrivacyRequest(
    actorId: string,
    requestId: string,
    dto: ProcessPrivacyRequestDto,
  ) {
    const request = await this.prisma.privacyRequest.findUnique({
      where: { id: requestId },
      include: PRIVACY_INCLUDE,
    });
    if (!request) throw new NotFoundException('Privacy request not found.');
    if (request.status === PrivacyRequestStatus.FULFILLED) {
      throw new BadRequestException(
        'This privacy request is already fulfilled.',
      );
    }
    const snapshot = await this.exportSnapshot(request.userId);
    const fulfilledAt = new Date();

    if (request.type === PrivacyRequestType.DELETION) {
      await this.prisma.$transaction(async (tx) => {
        // One shared definition of erasure — see ErasureService. Defining the
        // redaction set here as well is how a field gets added to one path and
        // forgotten in the other.
        await this.erasure.eraseUser(tx, request.userId, requestId);
        await tx.privacyRequest.update({
          where: { id: requestId },
          data: {
            status: PrivacyRequestStatus.FULFILLED,
            processedById: actorId,
            fulfilledAt,
            fulfillmentNote: dto.fulfillmentNote.trim(),
            exportSnapshot: snapshot as Prisma.InputJsonValue,
          },
        });
      });
    } else {
      await this.prisma.privacyRequest.update({
        where: { id: requestId },
        data: {
          status: PrivacyRequestStatus.FULFILLED,
          processedById: actorId,
          fulfilledAt,
          fulfillmentNote: dto.fulfillmentNote.trim(),
          exportSnapshot: snapshot as Prisma.InputJsonValue,
        },
      });
    }

    await this.audit.record(
      actorId,
      'support.privacy_request.fulfill',
      'PrivacyRequest',
      requestId,
      {
        userId: request.userId,
        type: request.type,
        directPiiRedacted: request.type === PrivacyRequestType.DELETION,
        historicalRelationsPreserved: true,
      },
    );
    const updated = await this.prisma.privacyRequest.findUnique({
      where: { id: requestId },
      include: PRIVACY_INCLUDE,
    });
    return { request: this.privacyDto(updated!) };
  }

  private async exportSnapshot(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tennisProfile: {
          include: {
            availabilitySlots: true,
            goals: true,
            practiceSessions: true,
          },
        },
        padelProfile: true,
        notificationPreference: true,
        billingAccount: {
          include: {
            subscription: { include: { plan: true } },
            invoices: true,
            paymentMethods: {
              select: {
                id: true,
                type: true,
                provider: true,
                brand: true,
                last4: true,
                label: true,
                isDefault: true,
                removedAt: true,
                createdAt: true,
              },
            },
          },
        },
        clubMemberships: {
          include: { club: { select: { id: true, name: true } } },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found.');
    return JSON.parse(JSON.stringify(user)) as Record<string, unknown>;
  }

  private async resolvePrivacyUser(dto: CreatePrivacyRequestDto) {
    if (dto.userId?.trim()) {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.userId.trim() },
        select: USER_SUMMARY_SELECT,
      });
      if (!user) throw new NotFoundException('User not found.');
      return user;
    }
    if (dto.userEmail?.trim()) {
      const user = await this.prisma.user.findUnique({
        where: { email: dto.userEmail.trim().toLowerCase() },
        select: USER_SUMMARY_SELECT,
      });
      if (!user) throw new NotFoundException('User not found.');
      return user;
    }
    throw new BadRequestException(
      'Provide a user ID or email for the privacy request.',
    );
  }

  private async validateUser(userId?: string | null) {
    if (!userId?.trim()) return;
    const user = await this.prisma.user.findUnique({
      where: { id: userId.trim() },
      select: { id: true },
    });
    if (!user) throw new BadRequestException('Linked user does not exist.');
  }

  private requireTicket(ticketId: string) {
    return this.prisma.supportTicket
      .findUnique({ where: { id: ticketId } })
      .then((ticket) => {
        if (!ticket) throw new NotFoundException('Support ticket not found.');
        return ticket;
      });
  }

  private async requireSupportAdmin(adminId: string) {
    const admin = await this.prisma.platformAdmin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        deactivatedAt: true,
        role: { select: { permissions: { select: { permission: true } } } },
      },
    });
    if (!admin || admin.deactivatedAt)
      throw new BadRequestException(
        'Assignee is not an active platform admin.',
      );
    const canSupport = admin.role.permissions.some(
      (row) => row.permission === PlatformPermission.SUPPORT_MANAGE,
    );
    if (!canSupport)
      throw new BadRequestException('Assignee must have Support permission.');
  }

  private supportStaffOptions() {
    return this.prisma.platformAdmin.findMany({
      where: {
        deactivatedAt: null,
        role: {
          permissions: {
            some: { permission: PlatformPermission.SUPPORT_MANAGE },
          },
        },
      },
      select: ADMIN_SUMMARY_SELECT,
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
    });
  }

  private ticketDto(
    ticket: Prisma.SupportTicketGetPayload<{ include: typeof TICKET_INCLUDE }>,
  ) {
    return ticket;
  }

  private privacyDto(
    request: Prisma.PrivacyRequestGetPayload<{
      include: typeof PRIVACY_INCLUDE;
    }>,
  ) {
    return {
      ...request,
      hasExportSnapshot: Boolean(request.exportSnapshot),
    };
  }

  private enumValue<T extends Record<string, string>>(
    values: T,
    value?: string,
  ) {
    if (!value) return undefined;
    const normalized = value.toUpperCase();
    return Object.values(values).includes(normalized)
      ? (normalized as T[keyof T])
      : undefined;
  }
}
