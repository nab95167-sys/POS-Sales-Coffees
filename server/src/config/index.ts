import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET || 'super_secret_coffee_jwt_key_2026',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'super_secret_coffee_refresh_key_2026',
  nodeEnv: process.env.NODE_ENV || 'development',
};
