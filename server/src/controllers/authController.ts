import { timingSafeEqual } from 'node:crypto';

import { type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';

import { AppError } from '@server/lib/errors.js';
import { type AuthRequest } from '@server/middleware/auth.js';
import {
  authService,
  OAUTH_STATE_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  type AuthResult,
} from '@server/services/authService.js';

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(6, 'Password must contain at least 6 characters').max(128),
  name: z.string().trim().min(1).max(100).optional(),
});

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/auth',
  maxAge,
});

const setRefreshCookie = (res: Response, refreshToken: string, maxAge: number) => {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, cookieOptions(maxAge));
};

const clearRefreshCookie = (res: Response) => {
  res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions(0));
};

const sendAuthResponse = (res: Response, result: AuthResult, status = 200) => {
  setRefreshCookie(res, result.refreshToken, result.expiresAt.getTime() - Date.now());
  res.status(status).json({ accessToken: result.accessToken, user: result.user });
};

const sameValue = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

const clientUrl = () => process.env.CLIENT_URL ?? 'http://localhost:5173';

const oauthErrorRedirect = (res: Response, message: string) => {
  const url = new URL('/auth', clientUrl());
  url.searchParams.set('oauth_error', message);
  res.redirect(url.toString());
};

type YandexIntent = 'login' | 'link';

const accountRedirect = (res: Response, params: Record<string, string>) => {
  const url = new URL('/account', clientUrl());
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  res.redirect(url.toString());
};

export class AuthController {
  register = async (req: Request, res: Response, next: NextFunction) => {
    const parsed = credentialsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' });
      return;
    }

    try {
      const result = await authService.register(parsed.data);
      sendAuthResponse(res, result, 201);
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    const parsed = credentialsSchema.pick({ email: true, password: true }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' });
      return;
    }

    try {
      const result = await authService.login(parsed.data.email, parsed.data.password);
      sendAuthResponse(res, result);
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.refresh(req.cookies[REFRESH_COOKIE_NAME]);
      sendAuthResponse(res, result);
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 401) {
        clearRefreshCookie(res);
        res.status(401).json({ error: error.message });
        return;
      }
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.logout(req.cookies[REFRESH_COOKIE_NAME]);
      clearRefreshCookie(res);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  };

  me = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json(await authService.getCurrentUser(req.userId!));
    } catch (error) {
      next(error);
    }
  };

  unlinkYandex = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json({ methods: await authService.unlinkYandex(req.userId!) });
    } catch (error) {
      next(error);
    }
  };

  yandex = (req: Request, res: Response, next: NextFunction) => {
    try {
      const intent: YandexIntent = req.query.intent === 'link' ? 'link' : 'login';
      const { state, url } = authService.startYandexAuth();
      // The intent travels with the state, so it can't be swapped on the way back.
      res.cookie(OAUTH_STATE_COOKIE_NAME, `${intent}:${state}`, {
        ...cookieOptions(10 * 60 * 1000),
        path: '/api/auth/yandex',
      });
      res.redirect(url);
    } catch (error) {
      if (!(error instanceof AppError)) return next(error);
      // A full-page navigation: send the user back to the app, not to a JSON error.
      if (req.query.intent === 'link') accountRedirect(res, { link_error: 'yandex_failed' });
      else oauthErrorRedirect(res, 'oauth_not_configured');
    }
  };

  yandexCallback = async (req: Request, res: Response, next: NextFunction) => {
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    // Cookie is `intent:state`; a bare state (set before intents existed) means login.
    const rawState = String(req.cookies[OAUTH_STATE_COOKIE_NAME] ?? '');
    const separator = rawState.indexOf(':');
    const intent = separator > 0 ? rawState.slice(0, separator) : 'login';
    const savedState = separator > 0 ? rawState.slice(separator + 1) : rawState;
    res.clearCookie(OAUTH_STATE_COOKIE_NAME, { path: '/api/auth/yandex' });

    if (!state || !savedState || !sameValue(state, savedState)) {
      oauthErrorRedirect(res, 'oauth_state_invalid');
      return;
    }

    const code = typeof req.query.code === 'string' ? req.query.code : '';
    if (!code) {
      oauthErrorRedirect(res, 'oauth_code_missing');
      return;
    }

    if (intent === 'link') {
      try {
        await authService.linkYandex(req.cookies[REFRESH_COOKIE_NAME], code);
        accountRedirect(res, { linked: 'yandex' });
      } catch (error) {
        if (!(error instanceof AppError)) return next(error);
        accountRedirect(res, {
          link_error:
            error.statusCode === 409
              ? 'yandex_taken'
              : error.statusCode === 401
                ? 'session_expired'
                : 'yandex_failed',
        });
      }
      return;
    }

    try {
      const result = await authService.loginWithYandex(code);
      setRefreshCookie(res, result.refreshToken, result.expiresAt.getTime() - Date.now());
      const redirectUrl = new URL('/auth/callback', clientUrl());
      redirectUrl.hash = new URLSearchParams({ access_token: result.accessToken }).toString();
      res.redirect(redirectUrl.toString());
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 409) {
        oauthErrorRedirect(res, 'oauth_account_conflict');
        return;
      }
      if (error instanceof AppError && error.statusCode === 503) {
        oauthErrorRedirect(res, 'oauth_not_configured');
        return;
      }
      if (error instanceof AppError) {
        oauthErrorRedirect(res, 'oauth_failed');
        return;
      }
      next(error);
    }
  };
}

export const authController = new AuthController();
