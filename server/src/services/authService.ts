import { createHash, randomBytes, randomUUID } from 'node:crypto';

import type { User } from '@prisma/client';
import bcrypt from 'bcryptjs';

import { AppError } from '@server/lib/errors.js';
import {
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenTtlMs,
  verifyRefreshToken,
} from '@server/lib/jwt.js';
import {
  emailVerificationEmail,
  passwordResetEmail,
  type EmailLocale,
} from '@server/lib/emailTemplates.js';
import { isEmailEnabled, sendEmail } from '@server/lib/mailer.js';
import { authModel, type AuthTokenType, type PublicUser } from '@server/models/authModel.js';

export const REFRESH_COOKIE_NAME = 'widgecode_refresh';
export const OAUTH_STATE_COOKIE_NAME = 'widgecode_oauth_state';

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

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

const clientUrl = () => process.env.CLIENT_URL ?? 'http://localhost:5173';

// Tokens go in the URL hash so they never reach server logs, analytics or Referer headers.
const clientLink = (path: string, token: string) => {
  const url = new URL(path, clientUrl());
  url.hash = new URLSearchParams({ token }).toString();
  return url.toString();
};

const toPublicUser = (user: Pick<User, 'id' | 'email' | 'name'>): PublicUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
});

export type SignInMethods = { password: boolean; yandex: boolean };

const signInMethods = (user: Pick<User, 'passwordHash' | 'yandexId'>): SignInMethods => ({
  password: Boolean(user.passwordHash),
  yandex: Boolean(user.yandexId),
});

const isPrismaUniqueError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: string }).code === 'P2002';

export class AuthService {
  async register(input: {
    email: string;
    password: string;
    name?: string;
    locale?: EmailLocale;
  }): Promise<AuthResult> {
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

    if (isEmailEnabled()) {
      // Awaited so serverless doesn't cut it off, but a mail failure must not fail sign-up;
      // the user can resend from the account page.
      await this.sendEmailVerification(user.id, input.locale ?? 'en').catch((error) =>
        console.error('Could not send verification email', error),
      );
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

  async getCurrentUser(
    userId: string,
  ): Promise<{ user: PublicUser; methods: SignInMethods; emailVerified: boolean }> {
    const user = await authModel.findUserById(userId);
    if (!user) throw new AppError(401, 'User no longer exists');
    return {
      user: toPublicUser(user),
      methods: signInMethods(user),
      emailVerified: Boolean(user.emailVerifiedAt),
    };
  }

  private async issueToken(userId: string, type: AuthTokenType, ttlMs: number) {
    const token = randomBytes(32).toString('hex');
    await authModel.issueAuthToken({
      userId,
      type,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + ttlMs),
    });
    return token;
  }

  /** Always resolves the same way, so the response doesn't reveal which emails exist. */
  async requestPasswordReset(email: string, locale: EmailLocale): Promise<void> {
    if (!isEmailEnabled()) throw new AppError(503, 'Email is not configured');
    const user = await authModel.findUserByEmail(email);
    if (!user?.email) return;
    const token = await this.issueToken(user.id, 'password_reset', PASSWORD_RESET_TTL_MS);
    await sendEmail(passwordResetEmail(user.email, clientLink('/reset-password', token), locale));
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const userId = await authModel.consumeAuthToken(hashToken(token), 'password_reset');
    if (!userId) throw new AppError(400, 'This reset link is invalid or has expired');
    await authModel.replacePassword(userId, await bcrypt.hash(password, 12));
    // Following the emailed link proves ownership of the address.
    await authModel.markEmailVerified(userId);
  }

  async sendEmailVerification(userId: string, locale: EmailLocale): Promise<void> {
    if (!isEmailEnabled()) throw new AppError(503, 'Email is not configured');
    const user = await authModel.findUserById(userId);
    if (!user) throw new AppError(401, 'User no longer exists');
    if (!user.email || user.emailVerifiedAt) return;
    const token = await this.issueToken(user.id, 'email_verification', EMAIL_VERIFICATION_TTL_MS);
    await sendEmail(emailVerificationEmail(user.email, clientLink('/verify-email', token), locale));
  }

  async verifyEmail(token: string): Promise<void> {
    const userId = await authModel.consumeAuthToken(hashToken(token), 'email_verification');
    if (!userId) throw new AppError(400, 'This confirmation link is invalid or has expired');
    await authModel.markEmailVerified(userId);
  }

  /** The live session behind a refresh token, or a 401. Does not rotate the token. */
  private async sessionFromRefreshToken(refreshToken: string | undefined) {
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
    return session;
  }

  async refresh(refreshToken: string | undefined): Promise<AuthResult> {
    const session = await this.sessionFromRefreshToken(refreshToken);

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

    // Accounts are keyed by the provider identity, never linked by email: email sign-up doesn't
    // verify the address, so linking on a match would hand a pre-registered account to whoever
    // created it. Users with a password account must sign in with the password instead.
    if (!user && email && (await authModel.findUserByEmail(email))) {
      throw new AppError(409, 'An account with this email already exists');
    }

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

  /**
   * Attaches a Yandex identity to the account signed in with `refreshToken`. Used from the
   * account page, where the user has already proven ownership of the account.
   */
  async linkYandex(refreshToken: string | undefined, code: string): Promise<void> {
    const session = await this.sessionFromRefreshToken(refreshToken);
    const yandexUser = await this.exchangeYandexCode(code);
    if (!yandexUser.id) throw new AppError(502, 'Yandex user response is incomplete');

    const owner = await authModel.findUserByYandexId(yandexUser.id);
    if (owner && owner.id !== session.userId) {
      throw new AppError(409, 'This Yandex ID is already linked to another account');
    }
    if (!owner) await authModel.setYandexId(session.userId, yandexUser.id);
  }

  async unlinkYandex(userId: string): Promise<SignInMethods> {
    const user = await authModel.findUserById(userId);
    if (!user) throw new AppError(401, 'User no longer exists');
    if (!user.passwordHash) {
      throw new AppError(409, 'Yandex ID is the only way to sign in to this account');
    }
    await authModel.setYandexId(userId, null);
    return signInMethods({ ...user, yandexId: null });
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
