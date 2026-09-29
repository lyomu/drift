import { ErasureService, redactionMarker, ERASURE_RETENTION_DAYS } from './erasure.service';
import { Prisma } from '@prisma/client';

type Tx = Record<string, Record<string, jest.Mock>>;

function createTx(): Tx {
  const model = () => ({
    update: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  });
  return {
    user: model(),
    userPhotoAsset: model(),
    socialIdentity: model(),
    deviceToken: model(),
    verificationCode: model(),
    refreshToken: model(),
    tennisProfile: model(),
    padelProfile: model(),
    coachProfile: model(),
    availabilitySlot: model(),
    message: model(),
    matchReflection: model(),
    supportTicket: model(),
    playerReport: model(),
    notification: model(),
    savedStory: model(),
    dismissedHomeCard: model(),
    clubPostReaction: model(),
    videoAnalysisJob: {
      ...model(),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
}

function createVideoStorage() {
  return {
    save: jest.fn(),
    read: jest.fn(),
    delete: jest.fn().mockResolvedValue(undefined),
    localPath: jest.fn(),
  };
}

describe('ErasureService', () => {
  let service: ErasureService;
  let tx: Tx;
  let videoStorage: ReturnType<typeof createVideoStorage>;

  const USER = 'user-1';
  const REQUEST = 'req-1';
  const marker = redactionMarker(REQUEST);

  beforeEach(async () => {
    videoStorage = createVideoStorage();
    service = new ErasureService(videoStorage as never);
    tx = createTx();
    await service.eraseUser(tx as unknown as Prisma.TransactionClient, USER, REQUEST);
  });

  it('strips every direct identifier from the user row', () => {
    const data = tx.user.update.mock.calls[0][0].data;
    expect(data.email).toBeNull();
    expect(data.phone).toBeNull();
    expect(data.firstName).toBeNull();
    expect(data.lastName).toBeNull();
    expect(data.photoUrl).toBeNull();
    expect(data.bio).toBeNull();
    expect(data.emailVerifiedAt).toBeNull();
    expect(data.phoneVerifiedAt).toBeNull();
    expect(data.accountStatus).toBe('DELETED');
  });

  it('replaces the password hash so no credential can ever match', () => {
    // A marker rather than null: it cannot be a valid bcrypt hash, so
    // bcrypt.compare fails for every input.
    expect(tx.user.update.mock.calls[0][0].data.passwordHash).toBe(marker);
  });

  it('deletes the stored profile photo, not just the reference to it', () => {
    // Nulling `photoUrl` leaves the bytes in `user_photo_assets`, and that
    // table's cascade never fires because erasure is an UPDATE, not a DELETE.
    expect(tx.userPhotoAsset.deleteMany).toHaveBeenCalledWith({
      where: { userId: USER },
    });
  });

  it('deletes social identities outright rather than anonymising them', () => {
    // providerAccountId is a stable Google/Apple subject — leaving it would
    // both re-identify the person and let the social login keep working.
    expect(tx.socialIdentity.deleteMany).toHaveBeenCalledWith({
      where: { userId: USER },
    });
  });

  it('deletes device tokens, so an erased account stops being reachable', () => {
    // Not only privacy: without this the account keeps receiving pushes.
    expect(tx.deviceToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: USER },
    });
  });

  it('clears the padel profile as well as the tennis one', () => {
    // Tennis was cleared and padel was not — an inconsistency, not a decision.
    expect(tx.padelProfile.updateMany).toHaveBeenCalledWith({
      where: { userId: USER },
      data: { partnerPreference: null, goals: [] },
    });
  });

  it('removes the public contact details on a coach profile', () => {
    const data = tx.coachProfile.updateMany.mock.calls[0][0].data;
    expect(data.publicEmail).toBeNull();
    expect(data.publicPhone).toBeNull();
    expect(data.bio).toBeNull();
  });

  it('redacts message bodies but keeps the rows', () => {
    // The other participant's conversation would otherwise lose its shape.
    expect(tx.message.updateMany).toHaveBeenCalledWith({
      where: { senderId: USER },
      data: { body: marker },
    });
    expect(tx.message.deleteMany).not.toHaveBeenCalled();
  });

  it('clears free text the person authored', () => {
    expect(tx.matchReflection.updateMany).toHaveBeenCalledWith({
      where: { userId: USER },
      data: { notes: null },
    });
    expect(tx.supportTicket.updateMany).toHaveBeenCalledWith({
      where: { userId: USER },
      data: { subject: marker, body: marker },
    });
  });

  it('clears reports they wrote, never reports written about them', () => {
    // A report about someone belongs to its author and to the safety record;
    // it is not the subject's to erase.
    expect(tx.playerReport.updateMany).toHaveBeenCalledWith({
      where: { reporterId: USER },
      data: { notes: null },
    });
    const filters = tx.playerReport.updateMany.mock.calls.map(
      (c) => Object.keys(c[0].where)[0],
    );
    expect(filters).not.toContain('reportedUserId');
  });

  it('revokes live sessions without touching already-revoked ones', () => {
    expect(tx.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: USER, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('is idempotent — a second run changes nothing about the outcome', async () => {
    const second = createTx();
    await service.eraseUser(
      second as unknown as Prisma.TransactionClient,
      USER,
      REQUEST,
    );
    expect(second.user.update.mock.calls[0][0].data).toEqual(
      tx.user.update.mock.calls[0][0].data,
    );
  });
});

describe('ErasureService.dueAt', () => {
  it('adds exactly the retention window', () => {
    const from = new Date('2026-09-03T00:00:00.000Z');
    const due = ErasureService.dueAt(from);
    const days = (due.getTime() - from.getTime()) / 86_400_000;
    expect(days).toBe(ERASURE_RETENTION_DAYS);
  });

  it('does not mutate the date it is given', () => {
    const from = new Date('2026-09-03T00:00:00.000Z');
    ErasureService.dueAt(from);
    expect(from.toISOString()).toBe('2026-09-03T00:00:00.000Z');
  });
});

describe('ErasureService and uploaded video', () => {
  const USER = 'user-1';
  const REQUEST = 'req-1';

  function createTxWithJobs(jobs: { storageKey: string | null }[]) {
    const model = () => ({
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    });
    const tx: Record<string, Record<string, jest.Mock>> = {
      user: model(),
      userPhotoAsset: model(),
      socialIdentity: model(),
      deviceToken: model(),
      verificationCode: model(),
      refreshToken: model(),
      tennisProfile: model(),
      padelProfile: model(),
      coachProfile: model(),
      availabilitySlot: model(),
      message: model(),
      matchReflection: model(),
      supportTicket: model(),
      playerReport: model(),
      notification: model(),
      savedStory: model(),
      dismissedHomeCard: model(),
      clubPostReaction: model(),
      videoAnalysisJob: {
        ...model(),
        findMany: jest.fn().mockResolvedValue(jobs),
      },
    };
    return tx;
  }

  function storageMock() {
    return {
      save: jest.fn(),
      read: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
      localPath: jest.fn(),
    };
  }

  it('deletes the video files, not only the rows', async () => {
    // The row delete alone leaves footage of the erased person on disk. This is the
    // first erased model whose payload lives outside Postgres, so it is the first
    // time the two can come apart.
    const storage = storageMock();
    const tx = createTxWithJobs([
      { storageKey: 'ab/one.mp4' },
      { storageKey: 'cd/two.mp4' },
    ]);

    await new ErasureService(storage as never).eraseUser(
      tx as unknown as Prisma.TransactionClient,
      USER,
      REQUEST,
    );

    expect(tx.videoAnalysisJob.deleteMany).toHaveBeenCalledWith({
      where: { userId: USER },
    });
    expect(storage.delete).toHaveBeenCalledWith('ab/one.mp4');
    expect(storage.delete).toHaveBeenCalledWith('cd/two.mp4');
  });

  it('skips jobs whose video was already discarded', async () => {
    // A refused clip has its bytes deleted at upload time and its storageKey nulled.
    const storage = storageMock();
    const tx = createTxWithJobs([{ storageKey: null }]);

    await new ErasureService(storage as never).eraseUser(
      tx as unknown as Prisma.TransactionClient,
      USER,
      REQUEST,
    );

    expect(storage.delete).not.toHaveBeenCalled();
  });

  it('completes the erasure even when a file cannot be deleted', async () => {
    // Failing the whole erasure because one file is stuck would leave far more
    // personal data in place than it removes. The failure is logged for hand
    // cleanup instead.
    const storage = storageMock();
    storage.delete.mockRejectedValue(new Error('disk gone'));
    const tx = createTxWithJobs([{ storageKey: 'ab/one.mp4' }]);

    await expect(
      new ErasureService(storage as never).eraseUser(
        tx as unknown as Prisma.TransactionClient,
        USER,
        REQUEST,
      ),
    ).resolves.toBeUndefined();

    expect(tx.user.update).toHaveBeenCalled();
  });
});
