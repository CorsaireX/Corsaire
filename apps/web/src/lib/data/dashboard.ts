import { supabaseAdmin } from '@/lib/supabase';

export async function getUserDashboardData(userId: string) {
  // 1. Fetch User
  const { data: user } = await supabaseAdmin
    .from('Users')
    .select('ID, Email')
    .eq('ID', userId)
    .single();

  if (!user) {
    return null;
  }

  // 2. Fetch all licenses for this user (including inactive ones ready to bind)
  const { data: licenses } = await supabaseAdmin
    .from('Licenses')
    .select(`
      ID, Code, Status, Platform, DeviceLimit, Apps,
      Plans ( Name, Price ),
      LicenseDevices ( DeviceID )
    `)
    .eq('UserID', userId);

  // 3. Fetch devices for this user
  const { data: devices } = await supabaseAdmin
    .from('Devices')
    .select('ID, DeviceID, Platform, DeviceName, LastSeenAt')
    .eq('UserID', userId)
    .eq('IsActive', true);

  // 4. Fetch latest App Versions
  const { data: latestVersions } = await supabaseAdmin
    .from('AppVersions')
    .select('AppName, Version, ReleasedAt')
    .eq('IsActive', true)
    .order('ReleasedAt', { ascending: false });

  return {
    user,
    licenses: licenses || [],
    devices: devices || [],
    latestVersions: latestVersions || [],
  };
}
