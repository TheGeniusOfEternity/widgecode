import type { AuthSession, User } from '@prisma/client';

import { prisma } from '../lib/prisma.js';

export type PublicUser = Pick<User, 'id' | 'email' | 'name'>;
export type AuthSessionWithUser = AuthSession & { user: User };

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
    return prisma.user.create({ data });
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

  async revokeSession(id: string, userId: string): Promise<void> {
    await prisma.authSession.updateMany({
      where: { id, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

export const authModel = new AuthModel();
