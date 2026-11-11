import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { getDb } from './db/database';
import { seedDatabaseIfEmpty } from './db/seed';
import { sanitizeInput, verifyOriginForMutations } from './middleware/securityMiddleware';
import authRoutes from './routes/authRoutes';
import securityRoutes from './routes/securityRoutes';
import productRoutes from './routes/productRoutes';
import orderRoutes from './routes/orderRoutes';
import {
  tablesRouter,
  inventoryRouter,
  customersRouter,
  promotionsRouter,
  broadcastsRouter,
} from './routes/operationsRoutes';
import staffRoutes from './routes/staffRoutes';
import financeRoutes from './routes/financeRoutes';
import settingsRoutes from './routes/settingsRoutes';

export function createApp() {
  getDb();
  seedDatabaseIfEmpty();

  const app = express();

  app.disable('x-powered-by');
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || config.allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Origin not allowed by CORS policy'));
        }
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: '512kb' }));
  app.use(verifyOriginForMutations);
  app.use(sanitizeInput);

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Rate limit exceeded. Please wait before sending more requests.' },
  });
  app.use('/api', apiLimiter);

  app.get('/health', (_req, res) => {
    const db = getDb();
    const row = db.prepare('SELECT COUNT(*) as products FROM products').get<{ products: number }>();
    res.json({
      status: 'UP',
      database: 'SQLite',
      productsLoaded: row?.products || 0,
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/security', securityRoutes);
  app.use('/api/v1/products', productRoutes);
  app.use('/api/v1/orders', orderRoutes);
  app.use('/api/v1/tables', tablesRouter);
  app.use('/api/v1/inventory', inventoryRouter);
  app.use('/api/v1/customers', customersRouter);
  app.use('/api/v1/promotions', promotionsRouter);
  app.use('/api/v1/broadcasts', broadcastsRouter);
  app.use('/api/v1/staff', staffRoutes);
  app.use('/api/v1/finance', financeRoutes);
  app.use('/api/v1/settings', settingsRoutes);

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err.message === 'Origin not allowed by CORS policy') {
      res.status(403).json({ error: err.message });
      return;
    }
    console.error('Unhandled API Error:', err);
    res.status(500).json({
      error: config.isProd ? 'Internal server error' : err.message || 'Internal server error',
    });
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`☕ Aura Coffee POS Security API running cleanly on port ${config.port}`);
  });
}
