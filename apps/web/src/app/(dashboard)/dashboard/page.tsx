import { redirect } from 'next/navigation';
import { getSession } from '@corsaire/auth/session';
import { getUserDashboardData } from '@/lib/data/dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { BindButton } from './bind-button';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session || !session.userId) {
    redirect('/login');
  }

  const data = await getUserDashboardData(session.userId as string);
  
  if (!data) {
    redirect('/login');
  }

  const hasLicenses = data.licenses && data.licenses.length > 0;

  return (
    <div className="container py-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back. Manage your apps and devices here.
        </p>
      </div>

      {!hasLicenses ? (
        <Card className="border-dashed border-2 bg-muted/20">
          <CardHeader className="text-center">
            <CardTitle>No Active Plan</CardTitle>
            <CardDescription>
              You haven&apos;t purchased any plans yet. Get a lifetime license to access modified apps.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Link href="/purchase" className={buttonVariants({ size: "lg" })}>
              Buy a Plan
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Licenses & Apps */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Your Apps</h2>
            {data.licenses.map((license) => (
              <Card key={license.ID}>
                <CardHeader>
                  <CardTitle>{(license.Plans as unknown as { Name: string })?.Name || 'Custom Plan'}</CardTitle>
                  <CardDescription>Platform: <span className="uppercase font-medium">{license.Platform}</span></CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {license.Apps.map((app: string) => {
                      // Note: DeviceID in LicenseDevices is actually the ID in Devices table.
                      // But for UI evaluation without full client-side matching, we can pass isBound true 
                      // if the license has any bound device matching a device owned by the user? 
                      // Wait, BindButton itself fetches deviceId and we pass the known bound devices?
                      // The API will reject if they try to bind an already bound device.
                      // For now, let's just consider it bound if it has >= DeviceLimit, or we pass the array.
                      // Actually, let's just pass `isBound` = false initially and let the client figure it out, 
                      // OR we can't easily know because we don't have local DeviceID on the server.
                      // Wait! The user's browser has a unique DeviceID. The server knows all Devices owned by the user.
                      // So the best is to just let the BindButton component check if the local DeviceID is in the list.
                      // Let's pass the bound UUIDs to BindButton, and it can cross-check.
                      // Actually, `LicenseDevices` contains the Device's Supabase ID, not the string DeviceID.
                      
                      // Map the UUIDs from LicenseDevices to the actual raw string DeviceIDs from the user's devices
                      const boundDeviceIds = license.LicenseDevices.map((ld: { DeviceID: string }) => {
                        const dev = data.devices.find((d: { ID: string; DeviceID: string }) => d.ID === ld.DeviceID);
                        return dev ? dev.DeviceID : null;
                      }).filter(Boolean);
                      
                      const limitReached = license.LicenseDevices.length >= license.DeviceLimit;

                      const targetAppName = `${app}_${license.Platform}`;
                      const latestVer = data.latestVersions.find((v: { AppName: string; Version: string; ReleasedAt: string }) => v.AppName === targetAppName);
                      const isNew = latestVer ? (new Date().getTime() - new Date(latestVer.ReleasedAt).getTime()) < 7 * 24 * 60 * 60 * 1000 : false;
                      
                      return (
                        <div key={app} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                          <div className="flex flex-col gap-1">
                            <div className="font-medium capitalize">{app.replace('_', ' ')}</div>
                            {latestVer && (
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-[10px] h-4">v{latestVer.Version}</Badge>
                                {isNew && <Badge variant="default" className="text-[10px] h-4 bg-green-600 hover:bg-green-700">New</Badge>}
                              </div>
                            )}
                          </div>
                          <BindButton 
                            licenseId={license.ID} 
                            licenseCode={license.Code}
                            licensePlatform={license.Platform}
                            boundDeviceIds={boundDeviceIds}
                            limitReached={limitReached}
                            app={app}
                          />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Devices */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Your Devices</h2>
            <Card>
              <CardHeader>
                <CardTitle>Registered Devices</CardTitle>
                <CardDescription>You have {data.devices.length} active device(s).</CardDescription>
              </CardHeader>
              <CardContent>
                {data.devices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No devices registered yet. Install an app to register a device.</p>
                ) : (
                  <div className="space-y-4">
                    {data.devices.map((device) => (
                      <div key={device.ID} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{device.DeviceName || 'Unknown Device'}</div>
                          <div className="text-xs text-muted-foreground">Last seen: {device.LastSeenAt ? new Date(device.LastSeenAt).toLocaleDateString() : 'Never'}</div>
                        </div>
                        <Button variant="outline" size="sm" className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground">Revoke</Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
