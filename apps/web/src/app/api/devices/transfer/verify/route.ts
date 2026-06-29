import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@corsaire/auth/session';
import { redis } from '@/lib/redis';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();
    const { requestId, otp } = payload;

    if (!requestId || !otp) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Verify Transfer Request Belongs to User
    const { data: transferReq, error: reqErr } = await supabaseAdmin
      .from('DeviceTransferRequests')
      .select('*')
      .eq('ID', requestId)
      .eq('UserID', session.userId)
      .single();

    if (reqErr || !transferReq) {
      return NextResponse.json({ error: 'Transfer request not found' }, { status: 404 });
    }

    if (transferReq.Status !== 'pending') {
      return NextResponse.json({ error: 'Transfer request is no longer valid' }, { status: 400 });
    }

    // 2. Validate OTP
    const redisKey = `transfer_otp:${transferReq.ID}`;
    const storedOtp = await redis.get(redisKey);

    if (!storedOtp) {
      return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 });
    }

    if (storedOtp !== otp.trim()) {
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
    }

    // 3. Clear OTP
    await redis.del(redisKey);

    // 4. Retrieve UUIDs for Old and New Devices from Devices Table
    // The previous request created the device or it existed.
    const { data: newDeviceRow } = await supabaseAdmin
      .from('Devices')
      .select('ID')
      .eq('DeviceID', transferReq.NewDeviceID)
      .single();
    
    if (!newDeviceRow) {
      return NextResponse.json({ error: 'New device record not found in system.' }, { status: 500 });
    }

    const { data: oldDeviceRow } = await supabaseAdmin
      .from('Devices')
      .select('ID')
      .eq('DeviceID', transferReq.OldDeviceID)
      .single();

    // 5. Transaction equivalent via Supabase (since we don't have RPC for this specific yet)
    // Actually, we can just delete from LicenseDevices and insert the new one.
    if (oldDeviceRow) {
       await supabaseAdmin
        .from('LicenseDevices')
        .delete()
        .eq('LicenseID', transferReq.LicenseID)
        .eq('DeviceID', oldDeviceRow.ID);
    }

    const { error: insertErr } = await supabaseAdmin
      .from('LicenseDevices')
      .insert([{
        LicenseID: transferReq.LicenseID,
        DeviceID: newDeviceRow.ID
      }]);

    if (insertErr) {
      console.error(insertErr);
      return NextResponse.json({ error: 'Failed to bind new device' }, { status: 500 });
    }

    // 6. Mark Transfer as Completed
    await supabaseAdmin
      .from('DeviceTransferRequests')
      .update({ 
        Status: 'completed', 
        VerificationVerified: true,
        ResolvedAt: new Date().toISOString()
      })
      .eq('ID', transferReq.ID);

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('Transfer Verify Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const runtime = 'edge';
