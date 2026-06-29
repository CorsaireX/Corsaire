import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Define the shape of the params
interface RouteParams {
  params: {
    licenseCode: string;
  };
}

interface AppVersionRow {
  AppName: string;
  Version: string;
  ReleasedAt: string;
  Changelog: string;
  FileURL: string;
  FileSize: number | string;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { licenseCode } = params;
    
    // 1. Verify License Code
    const { data: license, error: licenseErr } = await supabaseAdmin
      .from('Licenses')
      .select('ID, Status, Platform, Apps')
      .eq('Code', licenseCode)
      .single();

    // If license not found or not active, return an empty source to block leechers
    if (licenseErr || !license || license.Status !== 'active' || license.Platform !== 'ios') {
      return NextResponse.json({
        name: "Corsaire (Revoked/Invalid)",
        identifier: "com.corsaire.source",
        sourceURL: request.url,
        apps: []
      });
    }

    // 2. Fetch Active iOS App Versions for the user's allowed apps
    // Map 'youtube' -> 'youtube_ios'
    const allowedAppNames = license.Apps.map((app: string) => `${app}_ios`);
    
    const { data: appVersions, error: appsErr } = await supabaseAdmin
      .from('AppVersions')
      .select('*')
      .in('AppName', allowedAppNames)
      .eq('IsActive', true);

    if (appsErr || !appVersions) {
      return NextResponse.json({ error: 'Failed to fetch app versions' }, { status: 500 });
    }

    // 3. Construct SideStore JSON
    const sideStoreApps = [];

    for (const app of license.Apps) {
      // Find the corresponding latest version for this app
      const targetAppName = `${app}_ios`;
      // In a real scenario, we might have multiple versions, so we sort by ReleasedAt
      const versions = appVersions
        .filter((v: AppVersionRow) => v.AppName === targetAppName)
        .sort((a: AppVersionRow, b: AppVersionRow) => new Date(b.ReleasedAt).getTime() - new Date(a.ReleasedAt).getTime());

      if (versions.length > 0) {
        const latest = versions[0];
        
        sideStoreApps.push({
          name: app === 'youtube' ? 'YouTube' : 'YouTube Music',
          bundleIdentifier: app === 'youtube' ? 'com.google.ios.youtube' : 'com.google.ios.youtubemusic',
          developerName: 'Corsaire',
          localizedDescription: 'Ad-free premium experience modified by Corsaire.',
          iconURL: app === 'youtube' 
            ? 'https://corsaire.vercel.app/icons/youtube.png' 
            : 'https://corsaire.vercel.app/icons/ytmusic.png',
          versions: [
            {
              version: latest.Version,
              date: latest.ReleasedAt,
              localizedDescription: latest.Changelog || 'Latest update',
              downloadURL: latest.FileURL,
              size: Number(latest.FileSize) || 100000000
            }
          ]
        });
      }
    }

    const sourceJson = {
      name: "Corsaire VIP Source",
      identifier: "com.corsaire.source",
      sourceURL: request.url,
      apps: sideStoreApps
    };

    return NextResponse.json(sourceJson);

  } catch (error) {
    console.error('SideStore Source Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const runtime = 'edge';
