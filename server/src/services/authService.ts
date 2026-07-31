import { createHash, randomBytes, randomUUID } from 'node:crypto';

import type { User } from '@prisma/client';
import bcrypt from 'bcryptjs';

import { AppError } from '../lib/errors.js';
import {
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenTtlMs,
  verifyRefreshToken,
} from '../lib/jwt.js';
import { authModel, type PublicUser } from '../models/authModel.js';

export const REFRESH_COOKIE_NAME = 'github_stats_refresh';
export const OAUTH_STATE_COOKIE_NAME = 'github_stats_oauth_state';

export type AuthResult = {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  user: PublicUser;
};

type YandexTokenResponse = { access_token?: string };
type YandexUserResponse = {
  id?: string;
  default_email?: string;
  emails?: string[];
  display_name?: string;
  real_name?: string;
};

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

const toPublicUser = (user: Pick<User, 'id' | 'email' | 'name'>): PublicUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
});

const isPrismaUniqueError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: string }).code === 'P2002';

export class AuthService {
  async register(input: { email: string; password: string; name?: string }): Promise<AuthResult> {
    const passwordHash = await bcrypt.hash(input.password, 12);
    let user: PublicUser;

    try {
      user = await authModel.createEmailUser({
        email: input.email,
        passwordHash,
        name: input.name,
      });
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        throw new AppError(409, 'An account with this email already exists');
      }
      throw error;
    }

    return this.createSession(user);
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await authModel.findUserByEmail(email);
    const passwordMatches = user?.passwordHash
      ? await bcrypt.compare(password, user.passwordHash)
      : false;

    if (!user || !passwordMatches) {
      throw new AppError(401, 'Invalid email or password');
    }

    return this.createSession(toPublicUser(user));
  }

  async getCurrentUser(userId: string): Promise<PublicUser> {
    const user = await authModel.findPublicUserById(userId);
    if (!user) throw new AppError(401, 'User no longer exists');
    return user;
  }

  async refresh(refreshToken: string | undefined): Promise<AuthResult> {
    if (!refreshToken) throw new AppError(401, 'Invalid or expired refresh token');

    const payload = (() => {
      try {
        return verifyRefreshToken(refreshToken);
      } catch {
        throw new AppError(401, 'Invalid or expired refresh token');
      }
    })();

    const session = await authModel.findSessionWithUser(payload.sessionId);
    if (
      !session ||
      session.userId !== payload.userId ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.refreshTokenHash !== hashToken(refreshToken)
    ) {
      throw new AppError(401, 'Invalid or expired refresh token');
    }

    const nextRefreshToken = generateRefreshToken(session.userId, session.id);
    const nextExpiresAt = new Date(Date.now() + getRefreshTokenTtlMs());
    const rotated = await authModel.rotateSession(
      session.id,
      session.refreshTokenHash,
      hashToken(nextRefreshToken),
      nextExpiresAt,
    );

    if (!rotated) throw new AppError(401, 'Invalid or expired refresh token');

    return {
      user: toPublicUser(session.user),
      accessToken: generateAccessToken(session.userId),
      refreshToken: nextRefreshToken,
      expiresAt: nextExpiresAt,
    };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      return;
    }

    await authModel.revokeSession(payload.sessionId, payload.userId);
  }

  startYandexAuth(): { state: string; url: string } {
    const config = this.getYandexConfig();
    const state = randomBytes(32).toString('hex');
    const url = new URL('https://oauth.yandex.ru/authorize');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', config.clientId);
    url.searchParams.set('redirect_uri', config.redirectUri);
    url.searchParams.set('scope', 'login:email login:info');
    url.searchParams.set('state', state);
    return { state, url: url.toString() };
  }

  async loginWithYandex(code: string): Promise<AuthResult> {
    const yandexUser = await this.exchangeYandexCode(code);
    if (!yandexUser.id) throw new AppError(502, 'Yandex user response is incomplete');

    const email =
      (yandexUser.default_email ?? yandexUser.emails?.[0])?.trim().toLowerCase() || null;
    let user = await authModel.findUserByYandexId(yandexUser.id);

    if (!user && email) user = await authModel.findUserByEmail(email);

    try {
      if (user) {
        user = await authModel.updateUserWithYandex(user.id, {
          yandexId: yandexUser.id,
          email: user.email ?? email,
          name: user.name ?? yandexUser.display_name ?? yandexUser.real_name,
        });
      } else {
        user = await authModel.createYandexUser({
          yandexId: yandexUser.id,
          email,
          name: yandexUser.display_name ?? yandexUser.real_name ?? null,
        });
      }
    } catch (error) {
      if (isPrismaUniqueError(error)) throw new AppError(409, 'Yandex account conflict');
      throw error;
    }

    return this.createSession(toPublicUser(user));
  }

  private createSession(user: PublicUser): Promise<AuthResult> {
    const sessionId = randomUUID();
    const refreshToken = generateRefreshToken(user.id, sessionId);
    const expiresAt = new Date(Date.now() + getRefreshTokenTtlMs());

    return authModel
      .createSession({
        id: sessionId,
        userId: user.id,
        refreshTokenHash: hashToken(refreshToken),
        expiresAt,
      })
      .then(() => ({
        user,
        accessToken: generateAccessToken(user.id),
        refreshToken,
        expiresAt,
      }));
  }

  private getYandexConfig() {
    const clientId = process.env.YANDEX_CLIENT_ID;
    const clientSecret = process.env.YANDEX_CLIENT_SECRET;
    const redirectUri = process.env.YANDEX_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) {
      throw new AppError(503, 'Yandex OAuth is not configured');
    }
    return { clientId, clientSecret, redirectUri };
  }

  private async exchangeYandexCode(code: string): Promise<YandexUserResponse> {
    const config = this.getYandexConfig();
    const tokenResponse = await fetch('https://oauth.yandex.ru/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }),
    });
    if (!tokenResponse.ok) throw new AppError(502, 'Yandex token exchange failed');

    const token = (await tokenResponse.json()) as YandexTokenResponse;
    if (!token.access_token) throw new AppError(502, 'Yandex token response is incomplete');

    const userResponse = await fetch('https://login.yandex.ru/info?format=json', {
      headers: { Authorization: `OAuth ${token.access_token}` },
    });
    if (!userResponse.ok) throw new AppError(502, 'Yandex user request failed');
    return (await userResponse.json()) as YandexUserResponse;
  }
}

export const authService = new AuthService();
