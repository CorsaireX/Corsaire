import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyPassword } from '@corsaire/auth/password';
import { setSession } from '@corsaire/auth/session';
import { sendOTP } from '@corsaire/auth/email';
import { redis } from '@/lib/redis';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    let email = payload.email;
    const password = payload.password;

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }
    
    email = email.toLowerCase().trim();

    const portal = payload.portal || 'User';

    // 1. Fetch user by email
    const { data: user, error } = await supabaseAdmin
      .from('Users')
      .select('ID, Email, PasswordHash, IsVerified, Role')
      .eq('Email', email)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 400 });
    }

    // 2. Verify password
    const isPasswordValid = await verifyPassword(password, user.PasswordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 });
    }

    // 2.5 Obfuscated Check for Founder Portal
    if (portal === 'Founder' && user.Role !== 'Founder') {
      // Act like it's a password error so they don't know it's a portal rejection
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 });
    }

    // 3. Check if verified
    if (!user.IsVerified) {
      // Re-send OTP if not verified
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await redis.setex(`otp:${user.ID}`, 900, otp);
      
      await sendOTP(user.Email, otp);
      
      return NextResponse.json({ 
        error: 'Account not verified. A new code has been sent.', 
        needsVerification: true,
        userId: user.ID
      }, { status: 403 });
    }

    // 4. Create session
    const finalRole = user.Role || 'User';
    await setSession(user.ID, finalRole);

    return NextResponse.json({ success: true, role: finalRole }, { status: 200 });
  } catch (error) {
    console.error('Login Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
