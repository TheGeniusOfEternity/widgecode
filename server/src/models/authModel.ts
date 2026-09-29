import type { AuthSession, User } from '@prisma/client';

import { prisma } from '@server/lib/prisma.js';

export type PublicUser = Pick<User, 'id' | 'email' | 'name'>;
export type AuthSessionWithUser = AuthSession & { user: User };
export type AuthTokenType = 'password_reset' | 'email_verification';

export class AuthModel {
  async createEmailUser(data: {
    email: string;
    passwordHash: string;
    name?: string;
  }): Promise<PublicUser> {
    return prisma.user.create({
      data,
      select: { id: true, email: true, name: true },
    });
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  async findPublicUserById(id: string): Promise<PublicUser | null> {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true },
    });
  }

  async findUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async setYandexId(userId: string, yandexId: string | null): Promise<void> {
    await prisma.user.update({ where: { id: userId }, data: { yandexId } });
  }

  async findUserByYandexId(yandexId: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { yandexId } });
  }

  async updateUserWithYandex(
    userId: string,
    data: { yandexId: string; email?: string | null; name?: string | null },
  ): Promise<User> {
    return prisma.user.update({ where: { id: userId }, data });
  }

  async createYandexUser(data: {
    yandexId: string;
    email: string | null;
    name: string | null;
  }): Promise<User> {
    // Yandex only returns addresses it has verified.
    return prisma.user.create({
      data: { ...data, emailVerifiedAt: data.email ? new Date() : null },
    });
  }

  async createSession(data: {
    id: string;
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await prisma.authSession.create({ data });
  }

  async findSessionWithUser(id: string): Promise<AuthSessionWithUser | null> {
    return prisma.authSession.findUnique({ where: { id }, include: { user: true } });
  }

  async rotateSession(
    id: string,
    currentRefreshTokenHash: string,
    nextRefreshTokenHash: string,
    expiresAt: Date,
  ): Promise<boolean> {
    const result = await prisma.authSession.updateMany({
      where: { id, refreshTokenHash: currentRefreshTokenHash, revokedAt: null },
      data: { refreshTokenHash: nextRefreshTokenHash, expiresAt },
    });
    return result.count === 1;
  }

  /** Stores a new one-time token and invalidates earlier unused ones of the same type. */
  async issueAuthToken(data: {
    userId: string;
    type: AuthTokenType;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await prisma.$transaction([
      prisma.authToken.updateMany({
        where: { userId: data.userId, type: data.type, usedAt: null },
        data: { usedAt: new Date() },
      }),
      prisma.authToken.create({ data }),
    ]);
  }

  /** Marks a valid token as used and returns its user id; null if unknown, used or expired. */
  async consumeAuthToken(tokenHash: string, type: AuthTokenType): Promise<string | null> {
    const token = await prisma.authToken.findUnique({ where: { tokenHash } });
    if (!token || token.type !== type) return null;
    const result = await prisma.authToken.updateMany({
      where: { id: token.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    return result.count === 1 ? token.userId : null;
  }

  async markEmailVerified(userId: string): Promise<void> {
    await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  }

  /** Sets a new password and signs the user out everywhere. */
  async replacePassword(userId: string, passwordHash: string): Promise<void> {
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      prisma.authSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async revokeSession(id: string, userId: string): Promise<void> {
    await prisma.authSession.updateMany({
      where: { id, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

export const authModel = new AuthModel();
