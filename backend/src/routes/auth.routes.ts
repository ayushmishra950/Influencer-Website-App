import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  changePassword, forgotPassword, login, logout, me, register, resetPassword,
} from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import {
  changePasswordSchema, forgotPasswordSchema, loginSchema, registerSchema,
  resetPasswordSchema,
} from '../utils/schemas.js';
import { env } from '../config/env.js';

// Credential endpoints are the ones worth brute-forcing, so they get their own limit.
const credentialsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.authRateLimit,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again in a few minutes.' },
});

export const authRouter = Router();

authRouter.post('/register', credentialsLimiter, validate(registerSchema), register);
authRouter.post('/login', credentialsLimiter, validate(loginSchema), login);
authRouter.get('/me', authenticate, me);
authRouter.post('/logout', authenticate, logout);
authRouter.post('/change-password', authenticate, validate(changePasswordSchema), changePassword);

// Both reset steps sit behind the credentials limiter: they take an email and set a
// password, which is exactly the pair worth hammering.
authRouter.post('/forgot-password', credentialsLimiter, validate(forgotPasswordSchema), forgotPassword);
authRouter.post('/reset-password', credentialsLimiter, validate(resetPasswordSchema), resetPassword);
