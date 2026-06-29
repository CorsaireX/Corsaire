"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { getOrCreateDeviceId, detectDevicePlatform, getDeviceName } from "@/lib/device";
import { useRouter } from "next/navigation";
import { InstallModal } from "./install-modal";
import { TransferModal } from "./transfer-modal";

interface BindButtonProps {
  licenseId: string;
  licenseCode: string;
  licensePlatform: string;
  boundDeviceIds: string[];
  limitReached: boolean;
  app: string;
}

export function BindButton({ licenseId, licenseCode, licensePlatform, boundDeviceIds, limitReached, app }: BindButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setCurrentDeviceId(getOrCreateDeviceId());
  }, []);

  const handleBind = async () => {
    try {
      setLoading(true);
      setError(null);

      const deviceId = getOrCreateDeviceId();
      const platform = detectDevicePlatform();
      const deviceName = getDeviceName();

      const res = await fetch("/api/devices/bind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          licenseId,
          deviceId,
          platform,
          deviceName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to bind device");
      }

      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const isBound = currentDeviceId ? boundDeviceIds.includes(currentDeviceId) : false;

  if (isBound) {
    return (
      <>
        <Button variant="default" size="sm" onClick={() => setIsModalOpen(true)}>
          Install / Setup
        </Button>
        <InstallModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          licenseCode={licenseCode}
          platform={licensePlatform}
          app={app}
        />
      </>
    );
  }

  if (limitReached) {
    return (
      <>
        <Button variant="destructive" size="sm" onClick={() => setIsTransferModalOpen(true)}>
          Transfer to this device
        </Button>
        <TransferModal 
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          licenseId={licenseId}
        />
      </>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button 
        variant="secondary" 
        size="sm" 
        onClick={handleBind} 
        disabled={loading || !currentDeviceId}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Bind this Device
      </Button>
      {error && <p className="text-xs text-destructive max-w-[200px] text-right">{error}</p>}
    </div>
  );
}
