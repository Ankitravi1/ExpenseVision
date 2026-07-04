import nodemailer from 'nodemailer';

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// Email is optional: when SMTP is not configured, callers should skip
// sending and treat users as auto-verified.
export const isEmailEnabled = (): boolean =>
    Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
};

export const sendVerificationEmail = async (email: string, token: string) => {
    if (!isEmailEnabled()) {
        console.log(`[email] SMTP not configured — skipping verification email to ${email}`);
        return null;
    }

    const transporter = createTransporter();
    const verificationUrl = `${APP_URL}/verify-email?token=${token}`;

    const info = await transporter.sendMail({
        from: '"ExpenseVision" <noreply@expensevision.com>',
        to: email,
        subject: 'Verify your email address',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to ExpenseVision!</h2>
        <p>Please verify your email address by clicking the button below:</p>
        <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
        <p>Or copy and paste this link:</p>
        <p>${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
      </div>
    `,
    });

    console.log('Verification email sent: %s', info.messageId);
    return info;
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
    if (!isEmailEnabled()) {
        console.log(`[email] SMTP not configured — skipping password reset email to ${email}`);
        return null;
    }

    const transporter = createTransporter();
    const resetUrl = `${APP_URL}/reset-password?token=${token}`;

    const info = await transporter.sendMail({
        from: '"ExpenseVision" <noreply@expensevision.com>',
        to: email,
        subject: 'Reset your password',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reset Password Request</h2>
        <p>You requested to reset your password. Click the button below to proceed:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>Or copy and paste this link:</p>
        <p>${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `,
    });

    console.log('Password reset email sent: %s', info.messageId);
    return info;
};
