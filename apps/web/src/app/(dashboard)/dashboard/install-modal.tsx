"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Download, ExternalLink, X } from "lucide-react";

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  licenseCode: string;
  platform: string;
  app: string;
}

export function InstallModal({ isOpen, onClose, licenseCode, platform, app }: InstallModalProps) {
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const appTitle = app === 'youtube' ? 'YouTube' : 'YouTube Music';

  const handleDownloadAndroid = async () => {
    try {
      setDownloading(true);
      const res = await fetch("/api/apps/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseCode, appName: app }),
      });

      const data = await res.json();
      if (res.ok && data.downloadUrl) {
        window.location.href = data.downloadUrl;
      } else {
        alert(data.error || "Failed to download app.");
      }
    } catch (err) {
      console.error(err);
      alert("Error downloading app.");
    } finally {
      setDownloading(false);
    }
  };

  const sideStoreUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/apps/source/${licenseCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sideStoreUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-[90vw] max-w-md shadow-lg">
        <CardHeader className="relative pb-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-4 top-4" 
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
          <CardTitle>Install {appTitle}</CardTitle>
          <CardDescription>
            {platform === 'ios' ? 'Follow the steps to install via SideStore.' : 'Download and install the APK.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {platform === 'ios' ? (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg text-sm space-y-2">
                <p><strong>Step 1:</strong> Install SideStore on your iPhone.</p>
                <p><strong>Step 2:</strong> Copy your unique secure source link below.</p>
                <p><strong>Step 3:</strong> Add it to SideStore (Sources &gt; Add).</p>
              </div>
              
              <div className="flex gap-2">
                <input 
                  type="text" 
                  readOnly 
                  value={sideStoreUrl} 
                  className="flex-1 rounded-md border bg-muted/50 px-3 py-2 text-sm"
                />
                <Button onClick={handleCopy} variant="secondary">
                  <Copy className="mr-2 h-4 w-4" />
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>

              <Button 
                className="w-full mt-2" 
                onClick={() => window.location.href = `sidestore://source-add?url=${encodeURIComponent(sideStoreUrl)}`}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open in SideStore
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
               <div className="p-3 bg-muted rounded-lg text-sm space-y-2">
                <p><strong>Step 1:</strong> Download the APK file below.</p>
                <p><strong>Step 2:</strong> Open the file and tap &quot;Install&quot;.</p>
                <p><strong>Step 3:</strong> You may need to allow installation from unknown sources.</p>
              </div>
              <Button 
                className="w-full" 
                size="lg" 
                onClick={handleDownloadAndroid}
                disabled={downloading}
              >
                {downloading ? "Preparing Download..." : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Download APK
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
