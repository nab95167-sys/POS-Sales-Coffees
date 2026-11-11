# 🛡️ Aura Coffee POS System — Security Architecture & Hardening Guide

This document describes the security controls implemented across the full-stack **Aura Coffee POS System** (`server/` Express API + `client/` React UI + `nginx` production proxy).

---

## 🔒 Implemented Security Controls

### 1. Authentication, Cookies & Session Rotation
Configured in [`server/src/routes/authRoutes.ts`](file:///C:/Users/Phanith/.gemini/antigravity/scratch/coffee-shop-pos/server/src/routes/authRoutes.ts) and [`server/src/middlewares/auth.ts`](file:///C:/Users/Phanith/.gemini/antigravity/scratch/coffee-shop-pos/server/src/middlewares/auth.ts):
- **HttpOnly Dual-Token Cookies**:
  - Short-lived signed JWT access token (`15m` TTL) stored in an `HttpOnly`, `SameSite=Strict` cookie (`Secure` in `production`).
  - Opaque rotating refresh token (`7d` TTL), hashed with **SHA-256** (`hashSha256`) before persistence in SQLite `refresh_tokens` and scoped via cookie path `/api/v1/auth`.
- **Refresh Token Reuse Detection**: Re-presenting a revoked refresh token automatically invalidates all active sessions for that user and logs a `CRITICAL` `REFRESH_TOKEN_REUSE` audit event.
- **No Sensitive Browser Storage**: User identity, tokens, and permissions are loaded from `/api/v1/auth/me` rather than trusted `localStorage` state.

### 2. Brute-Force Protection, Lockouts & Manager PIN Overrides
Configured in [`server/src/config/index.ts`](file:///C:/Users/Phanith/.gemini/antigravity/scratch/coffee-shop-pos/server/src/config/index.ts), [`server/src/routes/authRoutes.ts`](file:///C:/Users/Phanith/.gemini/antigravity/scratch/coffee-shop-pos/server/src/routes/authRoutes.ts), and [`server/src/index.ts`](file:///C:/Users/Phanith/.gemini/antigravity/scratch/coffee-shop-pos/server/src/index.ts):
- **Rate Limiting**:
  - `authLimiter`: Maximum **15 attempts per 15 minutes** on protected auth endpoints (`/login`, PIN verification).
  - `apiLimiter`: Maximum **600 requests per 15 minutes** across `/api/*`.
- **Bcrypt Hashing & Account Lockouts**:
  - Staff passwords and POS override PINs are hashed with `bcryptjs` (salt rounds: 10).
  - **Login lockout**: **5 failed password attempts** trigger a **15-minute lockout**.
  - **PIN lockout**: **5 failed PIN attempts** trigger a **5-minute lockout**.
- **Single-Use Manager PIN Override Tokens**: Privileged overrides (e.g., high discounts, order voiding) issue single-use `pin_override_tokens` with a **2-minute TTL**.

### 3. Role-Based Access Control (RBAC)
Configured on both backend middleware and frontend context:
- Server enforces granular permissions (`pos:access`, `pos:discount`, `pos:void`, `pos:shift_manage`, `kds:view`, `inventory:view`, `inventory:edit`, `reports:view`, `reports:export`, `staff:manage`, `settings:manage`) stored in SQLite `role_configs` plus per-user overrides (`custom_permissions_json`).
- Only `ADMIN` users can update the Role Permission Matrix or set `ADMIN`-level accounts.

### 4. Server-Authoritative Pricing & ACID Transactions
Configured in [`server/src/routes/orderRoutes.ts`](file:///C:/Users/Phanith/.gemini/antigravity/scratch/coffee-shop-pos/server/src/routes/orderRoutes.ts) and [`server/src/db/database.ts`](file:///C:/Users/Phanith/.gemini/antigravity/scratch/coffee-shop-pos/server/src/db/database.ts):
- Order unit prices, size/addon adjustments, promo discounts, tax rates, totals, and ingredient deductions are calculated and validated on the server inside SQLite transactions (`runInTransaction`).
- Embedded **SQLite (`node:sqlite`)** uses parameterized prepared statements across all routes, eliminating SQL injection vectors.

### 5. Encrypted Integration Secrets & Server-Side Telegram Proxy
Configured in [`server/src/utils/crypto.ts`](file:///C:/Users/Phanith/.gemini/antigravity/scratch/coffee-shop-pos/server/src/utils/crypto.ts) and [`server/src/services/telegramService.ts`](file:///C:/Users/Phanith/.gemini/antigravity/scratch/coffee-shop-pos/server/src/services/telegramService.ts):
- Telegram bot tokens are encrypted at rest with **AES-256-GCM** using `CONFIG_ENCRYPTION_KEY`.
- Browser clients only receive masked previews (`maskSecret`) and dispatch alerts via backend routes — bot tokens are never exposed to frontend JavaScript.

### 6. HTTP Hardening, XSS Sanitization & CSRF Origin Checks
Configured in [`server/src/middleware/securityMiddleware.ts`](file:///C:/Users/Phanith/.gemini/antigravity/scratch/coffee-shop-pos/server/src/middleware/securityMiddleware.ts) and [`client/nginx.conf`](file:///C:/Users/Phanith/.gemini/antigravity/scratch/coffee-shop-pos/client/nginx.conf):
- Backend applies `helmet`, explicit `ALLOWED_ORIGINS` CORS allow-listing, `512kb` JSON body limits, recursive `<script>` / `javascript:` stripping (`sanitizeInput`), and `Origin` verification (`verifyOriginForMutations`) on state-changing requests alongside `SameSite=Strict` cookies.
- Production Nginx enforces `Content-Security-Policy` (`script-src 'self'`, `connect-src 'self'`), `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and `Permissions-Policy`.

### 7. Immutable Security Audit Trail
- Sensitive actions (`LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGIN_LOCKED`, `REFRESH_TOKEN_REUSE`, PIN overrides, role/permission updates, deletions, shift openings/closings) are written to SQLite `security_audit_logs` and surfaced to authorized admins in the Security Audit Center.

---

## 🚀 Production Deployment Checklist

1. **Secrets Management (Mandatory in Production)**:
   - Set `NODE_ENV=production`.
   - Provide distinct cryptographic secrets (>= 32 characters each) for `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `CONFIG_ENCRYPTION_KEY` (the server refuses to boot in production with missing, short, or placeholder keys).
   - Restrict `ALLOWED_ORIGINS` to your exact HTTPS origins.
2. **HTTPS / TLS Termination**:
   - Serve the application behind HTTPS (Nginx/TLS or reverse proxy) so `Secure` cookies are transmitted exclusively over encrypted channels.
3. **Seeded Credential Rotation**:
   - Rotate or override default seed passwords (`SEED_ADMIN_PASSWORD`, `SEED_MANAGER_PASSWORD`, `SEED_CASHIER_PASSWORD`, `SEED_BARISTA_PASSWORD`, `SEED_MANAGER_PIN`) before deploying to production, and protect/backup the SQLite volume (`DATABASE_PATH`).
