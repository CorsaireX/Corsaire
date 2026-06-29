import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { redis } from '@/lib/redis';
import { setSession } from '@corsaire/auth/session';

export async function POST(request: Request) {
  try {
    const { userId, code } = await request.json();

    if (!userId || !code) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const redisKey = `otp:${userId}`;
    const storedCode = await redis.get(redisKey);

    if (!storedCode) {
      return NextResponse.json({ error: 'OTP expired or invalid' }, { status: 400 });
    }

    if (storedCode.toString() !== code.toString()) {
      return NextResponse.json({ error: 'Incorrect OTP' }, { status: 400 });
    }

    // OTP is correct! Update user status
    const { error: updateError } = await supabaseAdmin
      .from('Users')
      .update({ IsVerified: true })
      .eq('ID', userId);

    if (updateError) {
      console.error(updateError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Delete OTP from Redis
    await redis.del(redisKey);

    // Create session
    await setSession(userId, 'user');

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Verify Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
