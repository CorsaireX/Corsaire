// Use direct Resend REST API instead of the SDK to avoid @react-email/render dependency
// which is incompatible with Cloudflare Edge Runtime

const RESEND_API_URL = 'https://api.resend.com/emails';

export async function sendOTP(email: string, otp: string) {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    console.warn(`[OTP] Resend API Key not found. OTP for ${email} is: ${otp}`);
    return true; // Fake success for local dev without key
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Resend Error:', errorData);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Failed to send email:', err);
    return false;
  }
}
