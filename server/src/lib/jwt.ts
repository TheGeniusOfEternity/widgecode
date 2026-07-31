import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';

type AccessTokenPayload = JwtPayload & {
  userId: string;
  type: 'access';
};

type RefreshTokenPayload = JwtPayload & {
  userId: string;
  sessionId: string;
  type: 'refresh';
};

const requiredEnv = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
};

const getExpiresIn = (name: string, fallback: string): SignOptions['expiresIn'] =>
  (process.env[name] ?? fallback) as SignOptions['expiresIn'];

export const getRefreshTokenTtlMs = () => {
  const days = Number(process.env.AUTH_REFRESH_DAYS ?? 30);
  if (!Number.isFinite(days) || days <= 0) {
    throw new Error('AUTH_REFRESH_DAYS must be a positive number');
  }
  return days * 24 * 60 * 60 * 1000;
};

export const generateAccessToken = (userId: string) =>
  jwt.sign({ userId, type: 'access' }, requiredEnv('JWT_SECRET'), {
    expiresIn: getExpiresIn('JWT_ACCESS_EXPIRES_IN', '15m'),
  });

export const generateRefreshToken = (userId: string, sessionId: string) =>
  jwt.sign({ userId, sessionId, type: 'refresh' }, requiredEnv('JWT_REFRESH_SECRET'), {
    expiresIn: getExpiresIn('JWT_REFRESH_EXPIRES_IN', '30d'),
  });

const isAccessTokenPayload = (payload: string | JwtPayload): payload is AccessTokenPayload =>
  typeof payload !== 'string' && typeof payload.userId === 'string' && payload.type === 'access';

const isRefreshTokenPayload = (payload: string | JwtPayload): payload is RefreshTokenPayload =>
  typeof payload !== 'string' &&
  typeof payload.userId === 'string' &&
  typeof payload.sessionId === 'string' &&
  payload.type === 'refresh';

export const verifyAccessToken = (token: string) => {
  const payload = jwt.verify(token, requiredEnv('JWT_SECRET'));
  if (!isAccessTokenPayload(payload)) throw new Error('Invalid access token payload');
  return payload;
};

export const verifyRefreshToken = (token: string) => {
  const payload = jwt.verify(token, requiredEnv('JWT_REFRESH_SECRET'));
  if (!isRefreshTokenPayload(payload)) throw new Error('Invalid refresh token payload');
  return payload;
};
