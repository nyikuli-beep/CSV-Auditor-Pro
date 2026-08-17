import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

/**
 * Optional authentication middleware:
 * Attaches decoded token if present and valid, but does not block unauthenticated users.
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = undefined;
    return next();
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.warn('Optional auth: token verification failed, continuing as guest session');
    req.user = undefined;
    next();
  }
};

/**
 * Validates Enterprise authorization on backend routes.
 * Recognizes verified enterprise email or active enterprise claims.
 */
export const requireEnterprise = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const email = (req.user?.email || '').toLowerCase().trim();
  const AUTHORIZED_OWNERS = ['nyikulibramwel@gmail.com'];
  
  if (AUTHORIZED_OWNERS.includes(email)) {
    return next();
  }

  // Token custom claims or enterprise metadata
  const plan = req.user?.plan || (req.user as any)?.subscriptionPlan;
  if (plan === 'enterprise') {
    return next();
  }

  return res.status(403).json({
    error: 'Forbidden: Enterprise subscription required to access Team Tenancy endpoints.'
  });
};

