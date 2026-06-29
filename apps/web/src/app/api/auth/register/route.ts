import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { hashPassword } from '@corsaire/auth/password';
import { sendOTP } from '@corsaire/auth/email';
import { redis } from '@/lib/redis';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    let email = payload.email;
    const password = payload.password;

    if (!email || !password || password.length < 6) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 400 });
    }
    
    email = email.toLowerCase().trim();

    // 1. Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('Users')
      .select('ID')
      .eq('Email', email)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    // 2. Hash password
    const hashedPassword = await hashPassword(password);

    // 3. Insert into Users table (unverified)
    const { data: newUser, error: insertError } = await supabaseAdmin
      .from('Users')
      .insert([{ Email: email, PasswordHash: hashedPassword, IsVerified: false }])
      .select('ID')
      .single();

    if (insertError || !newUser) {
      console.error(insertError);
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // 4. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 5. Store OTP in Redis (expires in 15 mins)
    const redisKey = `otp:${newUser.ID}`;
    await redis.setex(redisKey, 900, otp);

    // 6. Send OTP via email
    await sendOTP(email, otp);

    return NextResponse.json({ success: true, userId: newUser.ID }, { status: 200 });
  } catch (error) {
    console.error('Registration Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const runtime = 'edge';
