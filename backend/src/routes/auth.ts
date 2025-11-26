import express from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { hashPassword, comparePassword, generateToken, generateRefreshToken } from '../utils/auth';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { authLimiter } from '../middleware/rateLimit';

const router = express.Router();
const prisma = new PrismaClient();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Validation schemas
const signupSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(1),
    country: z.string().optional(),
    currency: z.string().default('INR'),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

const googleAuthSchema = z.object({
    googleToken: z.string(),
});

const updateUserSchema = z.object({
    name: z.string().min(1).optional(),
    country: z.string().optional(),
    currency: z.string().optional(),
});

// Apply rate limiting to all auth routes
router.use(authLimiter);

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
    try {
        const data = signupSchema.parse(req.body);

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { email: data.email },
        });

        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await hashPassword(data.password);

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');

        // Create user
        const user = await prisma.user.create({
            data: {
                email: data.email,
                password: hashedPassword,
                name: data.name,
                country: data.country,
                currency: data.currency,
                verificationToken,
            },
            select: {
                id: true,
                email: true,
                name: true,
                country: true,
                currency: true,
                profilePicture: true,
                createdAt: true,
            },
        });

        // Generate token
        const token = generateToken(user.id);
        const refreshToken = generateRefreshToken();

        // Save refresh token
        await prisma.refreshToken.create({
            data: {
                token: refreshToken.token,
                userId: user.id,
                expiresAt: refreshToken.expiresAt,
            },
        });

        res.status(201).json({ user, token, refreshToken: refreshToken.token });

        // Send verification email (async, don't wait)
        sendVerificationEmail(user.email, verificationToken).catch(console.error);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const data = loginSchema.parse(req.body);

        // Find user
        const user = await prisma.user.findUnique({
            where: { email: data.email },
        });

        if (!user || !user.password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const isValid = await comparePassword(data.password, user.password);

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check 2FA
        if (user.twoFactorEnabled) {
            return res.json({
                require2FA: true,
                userId: user.id,
            });
        }

        // Generate token
        const token = generateToken(user.id);
        const refreshToken = generateRefreshToken();

        // Save refresh token
        await prisma.refreshToken.create({
            data: {
                token: refreshToken.token,
                userId: user.id,
                expiresAt: refreshToken.expiresAt,
            },
        });

        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                country: user.country,
                currency: user.currency,
                profilePicture: user.profilePicture,
            },
            token,
            refreshToken: refreshToken.token,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/google
router.post('/google', async (req, res) => {
    try {
        const { googleToken } = googleAuthSchema.parse(req.body);

        // Verify Google token
        const ticket = await googleClient.verifyIdToken({
            idToken: googleToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload) {
            return res.status(401).json({ error: 'Invalid Google token' });
        }

        const { sub: googleId, email, name, picture } = payload;

        if (!email) {
            return res.status(400).json({ error: 'Email not provided by Google' });
        }

        // Check if user exists
        let user = await prisma.user.findFirst({
            where: {
                OR: [{ email }, { googleId }],
            },
        });

        let isNewUser = false;

        if (!user) {
            // Create new user
            user = await prisma.user.create({
                data: {
                    email,
                    name: name || 'User',
                    googleId,
                    profilePicture: picture,
                    password: null, // No password for Google users
                },
            });
            isNewUser = true;
        } else if (!user.googleId) {
            // Link Google account to existing user
            user = await prisma.user.update({
                where: { id: user.id },
                data: {
                    googleId,
                    profilePicture: picture || user.profilePicture,
                },
            });
        }

        // Generate token
        const token = generateToken(user.id);

        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                country: user.country,
                currency: user.currency,
                profilePicture: user.profilePicture,
            },
            token,
            isNewUser,
        });
    } catch (error) {
        console.error('Google auth error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/auth/update-profile
router.put('/update-profile', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);
        const { verifyToken } = await import('../utils/auth');
        const decoded = verifyToken(token);

        if (!decoded) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        const data = updateUserSchema.parse(req.body);

        const user = await prisma.user.update({
            where: { id: decoded.userId },
            data,
            select: {
                id: true,
                email: true,
                name: true,
                country: true,
                currency: true,
                profilePicture: true,
            },
        });

        res.json({ user });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/verify-email
router.post('/verify-email', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Token required' });
        }

        const user = await prisma.user.findFirst({
            where: { verificationToken: token },
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid token' });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                verificationToken: null,
            },
        });

        res.json({ message: 'Email verified successfully' });
    } catch (error) {
        console.error('Verify email error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            // Don't reveal if user exists
            return res.json({ message: 'If an account exists, a password reset email has been sent.' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpires = new Date(Date.now() + 3600000); // 1 hour

        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetPasswordToken: resetToken,
                resetPasswordExpires: resetExpires,
            },
        });

        // Send email
        await sendPasswordResetEmail(user.email, resetToken);

        res.json({ message: 'If an account exists, a password reset email has been sent.' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;

        const user = await prisma.user.findFirst({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: { gt: new Date() },
            },
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        const hashedPassword = await hashPassword(password);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpires: null,
            },
        });

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/2fa/setup
router.post('/2fa/setup', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);
        const { verifyToken } = await import('../utils/auth');
        const decoded = verifyToken(token);

        if (!decoded) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        const secret = speakeasy.generateSecret({
            name: `ExpenseVision (${decoded.userId.substring(0, 8)})`,
        });

        await prisma.user.update({
            where: { id: decoded.userId },
            data: { twoFactorSecret: secret.base32 },
        });

        const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

        res.json({ secret: secret.base32, qrCode: qrCodeUrl });
    } catch (error) {
        console.error('2FA setup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/2fa/verify
router.post('/2fa/verify', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);
        const { verifyToken } = await import('../utils/auth');
        const decoded = verifyToken(token);

        if (!decoded) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        const { code } = req.body;

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
        });

        if (!user || !user.twoFactorSecret) {
            return res.status(400).json({ error: '2FA not set up' });
        }

        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: code,
        });

        if (verified) {
            await prisma.user.update({
                where: { id: user.id },
                data: { twoFactorEnabled: true },
            });
            res.json({ message: '2FA enabled successfully' });
        } else {
            res.status(400).json({ error: 'Invalid code' });
        }
    } catch (error) {
        console.error('2FA verify error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/2fa/login
router.post('/2fa/login', async (req, res) => {
    try {
        const { userId, code } = req.body;

        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user || !user.twoFactorSecret) {
            return res.status(400).json({ error: 'Invalid user or 2FA not enabled' });
        }

        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: code,
        });

        if (!verified) {
            return res.status(401).json({ error: 'Invalid 2FA code' });
        }

        // Generate tokens
        const token = generateToken(user.id);
        const refreshToken = generateRefreshToken();

        // Save refresh token
        await prisma.refreshToken.create({
            data: {
                token: refreshToken.token,
                userId: user.id,
                expiresAt: refreshToken.expiresAt,
            },
        });

        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                country: user.country,
                currency: user.currency,
                profilePicture: user.profilePicture,
            },
            token,
            refreshToken: refreshToken.token,
        });
    } catch (error) {
        console.error('2FA login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/refresh-token
router.post('/refresh-token', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token required' });
        }

        // Find refresh token
        const storedToken = await prisma.refreshToken.findUnique({
            where: { token: refreshToken },
            include: { user: true },
        });

        if (!storedToken || storedToken.revoked || new Date() > storedToken.expiresAt) {
            return res.status(401).json({ error: 'Invalid or expired refresh token' });
        }

        // Generate new tokens
        const newToken = generateToken(storedToken.userId);
        const newRefreshToken = generateRefreshToken();

        // Revoke old token and save new one
        // Use transaction to ensure atomicity
        await prisma.$transaction([
            prisma.refreshToken.update({
                where: { id: storedToken.id },
                data: { revoked: true, replacedByToken: newRefreshToken.token },
            }),
            prisma.refreshToken.create({
                data: {
                    token: newRefreshToken.token,
                    userId: storedToken.userId,
                    expiresAt: newRefreshToken.expiresAt,
                },
            }),
        ]);

        res.json({
            token: newToken,
            refreshToken: newRefreshToken.token,
        });
    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
