import jwt from 'jsonwebtoken';

export const generateToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET || 'dev-secret';
  return jwt.sign(
    { user_id: userId, iat: Date.now() },
    secret,
    { expiresIn: '30d' }
  );
};

export const verifyToken = (token: string): any => {
  const secret = process.env.JWT_SECRET || 'dev-secret';
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
};