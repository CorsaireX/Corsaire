import { Resend } from 'resend';

// Only instantiate if RESEND_API_KEY is available (to avoid crashes if missing)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendOTP(email: string, otp: string) {
  if (!resend) {
    console.warn(`[OTP] Resend API Key not found. OTP for ${email} is: ${otp}`);
    return true; // Fake success for local dev without key
  }

  try {
    const { error } = await resend.emails.send({
      from: 'Corsaire <noreply@corsaire.my>',
      to: email,
      subject: 'Your Corsaire Verification Code',
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Corsaire Verification</h2>
          <p>Your verification code is:</p>
          <h1 style="letter-spacing: 5px; color: #333;">${otp}</h1>
          <p>This code will expire in 15 minutes.</p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend Error:', error);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Failed to send email:', err);
    return false;
  }
}
