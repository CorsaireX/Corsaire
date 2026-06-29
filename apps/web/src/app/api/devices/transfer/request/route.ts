import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@corsaire/auth/session';
import { sendOTP } from '@corsaire/auth/email';
import { redis } from '@/lib/redis';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();
    const { licenseId, newDeviceId, newPlatform, newDeviceName } = payload;

    if (!licenseId || !newDeviceId || !newPlatform) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Verify License Ownership & Get Current Platform
    const { data: license, error: licenseErr } = await supabaseAdmin
      .from('Licenses')
      .select('ID, Platform, UserID, LicenseDevices(DeviceID)')
      .eq('ID', licenseId)
      .eq('UserID', session.userId)
      .single();

    if (licenseErr || !license) {
      return NextResponse.json({ error: 'License not found' }, { status: 404 });
    }

    // 2. Platform Lock Check
    if (license.Platform !== newPlatform) {
      return NextResponse.json({ 
        error: `Cross-platform transfer is not allowed. Your license is locked to ${license.Platform}.` 
      }, { status: 403 });
    }

    // 3. Find old device ID (assuming limit is 1)
    if (!license.LicenseDevices || license.LicenseDevices.length === 0) {
      return NextResponse.json({ error: 'No device bound to this license. Please use standard Bind instead.' }, { status: 400 });
    }
    const oldDeviceId = license.LicenseDevices[0].DeviceID;

    if (oldDeviceId === newDeviceId) {
       return NextResponse.json({ error: 'This device is already bound to the license.' }, { status: 400 });
    }

    // 4. Rate Limiting: Max 10 requests per month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count, error: countErr } = await supabaseAdmin
      .from('DeviceTransferRequests')
      .select('ID', { count: 'exact', head: true })
      .eq('LicenseID', licenseId)
      .gte('CreatedAt', startOfMonth.toISOString());

    if (countErr) {
      return NextResponse.json({ error: 'Failed to verify transfer quota' }, { status: 500 });
    }

    if (count !== null && count >= 10) {
      return NextResponse.json({ error: 'Transfer quota exceeded (Max 10 per month).' }, { status: 429 });
    }

    // 5. Get User Email
    const { data: user } = await supabaseAdmin
      .from('Users')
      .select('Email')
      .eq('ID', session.userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 6. Create Transfer Request Record
    const { data: transferReq, error: insertErr } = await supabaseAdmin
      .from('DeviceTransferRequests')
      .insert([{
        UserID: session.userId,
        LicenseID: licenseId,
        OldDeviceID: oldDeviceId,
        NewDeviceID: newDeviceId,
        OldPlatform: license.Platform,
        NewPlatform: newPlatform,
        Status: 'pending'
      }])
      .select('ID')
      .single();

    if (insertErr || !transferReq) {
      console.error(insertErr);
      return NextResponse.json({ error: 'Failed to initiate transfer' }, { status: 500 });
    }

    // 7. Generate & Store OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const redisKey = `transfer_otp:${transferReq.ID}`;
    await redis.setex(redisKey, 900, otp); // 15 mins expiry

    // 8. Send OTP Email
    await sendOTP(user.Email, otp);

    // Save the new device metadata to Devices table if it doesn't exist yet
    // The previous implementation of /api/devices/bind also does this, but for transfer we might just wait until verify.
    // For now, let's insert it into Devices table so the constraint on LicenseDevices works later.
    await supabaseAdmin
      .from('Devices')
      .insert([{
        UserID: session.userId,
        DeviceID: newDeviceId,
        Platform: newPlatform,
        DeviceName: newDeviceName || 'Unknown Device'
      }])
      .select('ID')
      .single();
    
    // Ignore conflict error if device already exists in Devices table

    return NextResponse.json({ success: true, requestId: transferReq.ID }, { status: 200 });

  } catch (error) {
    console.error('Transfer Request Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
