import dotenv from 'dotenv';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';
const dataDir = path.resolve(__dirname, '../../data');
const databasePath = process.env.DATABASE_PATH || path.join(dataDir, 'pos.db');

const INSECURE_PLACEHOLDERS = new Set([
  'super_secret_coffee_jwt_key_2026',
  'super_secret_coffee_refresh_key_2026',
  'changeme',
  'secret',
]);

interface RuntimeSecrets {
  jwtSecret: string;
  jwtRefreshSecret: string;
  encryptionKey: string;
}

function loadOrCreateDevSecrets(): RuntimeSecrets {
  if (databasePath === ':memory:') {
    return {
      jwtSecret: process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex'),
      jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || crypto.randomBytes(32).toString('hex'),
      encryptionKey: process.env.CONFIG_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'),
    };
  }

  fs.mkdirSync(dataDir, { recursive: true });
  const secretsFile = path.join(dataDir, '.dev-secrets.json');
  if (fs.existsSync(secretsFile)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(secretsFile, 'utf8'));
      if (parsed.jwtSecret && parsed.jwtRefreshSecret && parsed.encryptionKey) {
        return parsed as RuntimeSecrets;
      }
    } catch {
      // Regenerate corrupted dev secrets file
    }
  }

  const generated: RuntimeSecrets = {
    jwtSecret: crypto.randomBytes(32).toString('hex'),
    jwtRefreshSecret: crypto.randomBytes(32).toString('hex'),
    encryptionKey: crypto.randomBytes(32).toString('hex'),
  };
  fs.writeFileSync(secretsFile, JSON.stringify(generated, null, 2), { mode: 0o600 });
  return generated;
}

function resolveSecrets(): RuntimeSecrets {
  const envJwt = process.env.JWT_SECRET;
  const envRefresh = process.env.JWT_REFRESH_SECRET;
  const envEnc = process.env.CONFIG_ENCRYPTION_KEY;

  if (isProd) {
    for (const [name, val] of [
      ['JWT_SECRET', envJwt],
      ['JWT_REFRESH_SECRET', envRefresh],
      ['CONFIG_ENCRYPTION_KEY', envEnc],
    ] as const) {
      if (!val || val.length < 32 || INSECURE_PLACEHOLDERS.has(val)) {
        throw new Error(
          `FATAL SECURITY ERROR: ${name} must be set to a strong >=32 character secret in production.`
        );
      }
    }
    return {
      jwtSecret: envJwt!,
      jwtRefreshSecret: envRefresh!,
      encryptionKey: envEnc!,
    };
  }

  const fallback = loadOrCreateDevSecrets();
  return {
    jwtSecret: envJwt && !INSECURE_PLACEHOLDERS.has(envJwt) ? envJwt : fallback.jwtSecret,
    jwtRefreshSecret: envRefresh && !INSECURE_PLACEHOLDERS.has(envRefresh) ? envRefresh : fallback.jwtRefreshSecret,
    encryptionKey: envEnc && envEnc.length >= 32 ? envEnc : fallback.encryptionKey,
  };
}

const secrets = resolveSecrets();

export const config = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv,
  isProd,
  databasePath,
  dataDir,
  jwtSecret: secrets.jwtSecret,
  jwtRefreshSecret: secrets.jwtRefreshSecret,
  encryptionKey: secrets.encryptionKey,
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost'],
  accessTokenTtlSec: 15 * 60,
  refreshTokenTtlDays: 7,
  maxFailedLogins: 5,
  loginLockoutMs: 15 * 60 * 1000,
  maxFailedPins: 5,
  pinLockoutMs: 5 * 60 * 1000,
  pinOverrideTtlMs: 2 * 60 * 1000,
};
