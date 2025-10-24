

import { PasswordResetEmail } from '../../../components/emails/PasswordResetEmail';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Example POST endpoint for sending emails
 * This would work in a non-static Next.js deployment
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, userName, resetUrl, type = 'password-reset' } = body;

    if (!to || !userName) {
      return Response.json(
        { error: 'Missing required fields: to, userName' },
        { status: 400 }
      );
    }

    let emailData;
    if (type === 'password-reset') {
      if (!resetUrl) {
        return Response.json(
          { error: 'Missing required field: resetUrl for password reset' },
          { status: 400 }
        );
      }
      emailData = {
        from: process.env.RESEND_FROM_EMAIL || 'Celestial Drakon Aquatics <noreply@cda.broadheader.com>',
        to: [to],
        subject: 'Reset Your Password - Celestial Drakon Aquatics',
        react: PasswordResetEmail({ userName, resetUrl }),
      };
    } else {
      return Response.json(
        { error: 'Invalid email type' },
        { status: 400 }
      );
    }

    const { data, error } = await resend.emails.send(emailData);

    if (error) {
      console.error('Resend error:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, data });
  } catch (error) {
    console.error('Email sending error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}