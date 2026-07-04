import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET env var is required (min 32 chars). Set it in backend/.env');
}
const SECRET: string = JWT_SECRET;
const JWT_EXPIRES_IN = '15m'; // Short-lived access token

export const hashPassword = async (password: string): Promise<string> => {
    return bcrypt.hash(password, 10);
};

export const comparePassword = async (
    password: string,
    hash: string
): Promise<boolean> => {
    return bcrypt.compare(password, hash);
};

export const generateToken = (userId: string): string => {
    return jwt.sign({ userId }, SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const generateRefreshToken = (): { token: string; expiresAt: Date } => {
    const token = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days
    return { token, expiresAt };
};

export const verifyToken = (token: string): { userId: string } | null => {
    try {
        return jwt.verify(token, SECRET) as { userId: string };
    } catch {
        return null;
    }
};
