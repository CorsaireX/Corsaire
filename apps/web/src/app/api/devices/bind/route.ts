import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@corsaire/auth/session';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();
    const { licenseId, deviceId, platform, deviceName } = payload;

    if (!licenseId || !deviceId || !platform) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Verify License
    const { data: license, error: licenseErr } = await supabaseAdmin
      .from('Licenses')
      .select('ID, UserID, Status, Platform, DeviceLimit')
      .eq('ID', licenseId)
      .eq('UserID', session.userId)
      .single();

    if (licenseErr || !license) {
      return NextResponse.json({ error: 'License not found or unauthorized' }, { status: 404 });
    }

    // 2. Platform Lock Check
    if (license.Platform !== platform) {
      return NextResponse.json({ 
        error: `Platform mismatch. This license is strictly for ${license.Platform.toUpperCase()} devices.` 
      }, { status: 403 });
    }

    // 3. Check Bound Devices Count
    const { data: boundDevices, error: boundErr } = await supabaseAdmin
      .from('LicenseDevices')
      .select('DeviceID')
      .eq('LicenseID', licenseId);

    if (boundErr) {
      return NextResponse.json({ error: 'Failed to verify device limits' }, { status: 500 });
    }

    // Check if THIS device is already bound
    // But wait, LicenseDevices stores the UUID of Devices.ID, not the string DeviceID.
    // Let's get the device first.

    let { data: device } = await supabaseAdmin
      .from('Devices')
      .select('ID')
      .eq('DeviceID', deviceId)
      .eq('UserID', session.userId)
      .single();

    if (!device) {
      // Create the device record
      const { data: newDevice, error: createDevErr } = await supabaseAdmin
        .from('Devices')
        .insert({
          UserID: session.userId,
          DeviceID: deviceId,
          Platform: platform,
          DeviceName: deviceName || 'Unknown Device'
        })
        .select('ID')
        .single();
        
      if (createDevErr || !newDevice) {
        return NextResponse.json({ error: 'Failed to register device' }, { status: 500 });
      }
      device = newDevice;
    }

    // Check if this device is already in the bound list
    const isAlreadyBound = boundDevices.some(d => d.DeviceID === device.ID);
    if (isAlreadyBound) {
      return NextResponse.json({ success: true, message: 'Device already bound' });
    }

    // Enforce Device Limit
    if (boundDevices.length >= license.DeviceLimit) {
      return NextResponse.json({ 
        error: 'Device limit reached. Revoke an old device or use Device Transfer.' 
      }, { status: 403 });
    }

    // 4. Bind the device
    const { error: bindErr } = await supabaseAdmin
      .from('LicenseDevices')
      .insert({
        LicenseID: licenseId,
        DeviceID: device.ID
      });

    if (bindErr) {
      // Ignore unique constraint violation just in case
      if (bindErr.code !== '23505') {
        return NextResponse.json({ error: 'Failed to bind device' }, { status: 500 });
      }
    }

    // 5. Activate License if inactive
    if (license.Status === 'inactive') {
      await supabaseAdmin
        .from('Licenses')
        .update({ Status: 'active', ActivatedAt: new Date().toISOString() })
        .eq('ID', licenseId);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Device Bind Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
