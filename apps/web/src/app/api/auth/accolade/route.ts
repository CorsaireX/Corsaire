import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { hashPassword } from '@corsaire/auth/password';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    let { email } = payload;
    const { password, secretPhrase, key } = payload;

    if (!email || !password || !secretPhrase || !key) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (secretPhrase !== process.env.FOUNDER_SECRET) {
      return NextResponse.json({ error: 'Invalid operation' }, { status: 403 });
    }

    if (key !== process.env.FOUNDER_KEY) {
      return NextResponse.json({ error: 'Invalid ascension key' }, { status: 403 });
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

    // 3. Insert into Users table as Founder and Verified
    const { data: newUser, error: insertError } = await supabaseAdmin
      .from('Users')
      .insert([{ 
        Email: email, 
        PasswordHash: hashedPassword, 
        IsVerified: true,
        Role: 'Founder'
      }])
      .select('ID')
      .single();

    if (insertError || !newUser) {
      console.error(insertError);
      return NextResponse.json({ error: 'Failed to ascend account' }, { status: 500 });
    }

    return NextResponse.json({ success: true, userId: newUser.ID }, { status: 200 });
  } catch (error) {
    console.error('Accolade Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const runtime = 'edge';
