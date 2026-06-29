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
    const { licenseCode, appName } = payload; // appName: 'youtube' or 'youtube_music'

    if (!licenseCode || !appName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Verify License and its Bound Devices
    const { data: license, error: licenseErr } = await supabaseAdmin
      .from('Licenses')
      .select('ID, UserID, Status, Platform, Apps, LicenseDevices(DeviceID)')
      .eq('Code', licenseCode)
      .eq('UserID', session.userId)
      .single();

    if (licenseErr || !license) {
      return NextResponse.json({ error: 'License not found or unauthorized' }, { status: 404 });
    }

    if (license.Status !== 'active') {
      return NextResponse.json({ error: 'License is not active. Please bind a device first.' }, { status: 403 });
    }

    if (license.Platform !== 'android') {
      return NextResponse.json({ error: 'This download API is only for Android devices.' }, { status: 403 });
    }

    if (!license.Apps.includes(appName)) {
      return NextResponse.json({ error: 'This app is not included in your plan.' }, { status: 403 });
    }

    // (Optional) We could verify if the current deviceID is in license.LicenseDevices.
    // For now, if they have an active license, they can get the URL. The URL could be signed.

    // 2. Find the active AppVersion for this appName + platform
    const targetAppName = `${appName}_android`;
    const { data: appVersion, error: appErr } = await supabaseAdmin
      .from('AppVersions')
      .select('FileURL, Version')
      .eq('AppName', targetAppName)
      .eq('IsActive', true)
      .order('ReleasedAt', { ascending: false })
      .limit(1)
      .single();

    if (appErr || !appVersion) {
      return NextResponse.json({ error: 'No active version available for download yet.' }, { status: 404 });
    }

    // 3. Return the Download URL
    // In a full implementation, this should generate a presigned R2 URL that expires in 15 mins.
    // Assuming FileURL is a direct R2 link for now.
    return NextResponse.json({ 
      success: true, 
      downloadUrl: appVersion.FileURL,
      version: appVersion.Version 
    });

  } catch (error) {
    console.error('App Download Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const runtime = 'edge';
