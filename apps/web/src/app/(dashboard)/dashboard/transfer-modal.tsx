"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Loader2, AlertTriangle, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getOrCreateDeviceId, detectDevicePlatform, getDeviceName } from "@/lib/device";
import { useRouter } from "next/navigation";

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  licenseId: string;
}

export function TransferModal({ isOpen, onClose, licenseId }: TransferModalProps) {
  const [step, setStep] = useState<"warning" | "otp">("warning");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const router = useRouter();

  if (!isOpen) return null;

  const handleRequestTransfer = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const newDeviceId = getOrCreateDeviceId();
      const newPlatform = detectDevicePlatform();
      const newDeviceName = getDeviceName();

      const res = await fetch("/api/devices/transfer/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseId, newDeviceId, newPlatform, newDeviceName }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to request transfer");

      setRequestId(data.requestId);
      setStep("otp");
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (otp.length < 6) {
      setError("Please enter a valid 6-digit OTP.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/devices/transfer/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, otp }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");

      // Success
      router.refresh();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-[90vw] max-w-md shadow-lg border-destructive/20">
        <CardHeader className="relative pb-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-4 top-4" 
            onClick={onClose}
            disabled={loading}
          >
            <X className="h-4 w-4" />
          </Button>
          <CardTitle className="text-destructive flex items-center gap-2">
            {step === "warning" ? <AlertTriangle className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
            {step === "warning" ? "Transfer Device" : "Verify Transfer"}
          </CardTitle>
          <CardDescription>
            {step === "warning" 
              ? "You are about to transfer your license to this new device." 
              : "Enter the 6-digit verification code sent to your email."}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20">
              {error}
            </div>
          )}

          {step === "warning" ? (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg text-sm space-y-2">
                <p><strong>Warning:</strong> Transferring your license will permanently remove access from your previous device.</p>
                <p>Cross-platform transfers (e.g., iOS to Android) are <strong>not allowed</strong>.</p>
                <p>Maximum 10 transfers allowed per month.</p>
              </div>
              <Button 
                className="w-full" 
                variant="destructive"
                onClick={handleRequestTransfer}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Request Transfer OTP
              </Button>
            </div>
          ) : (
            <div className="space-y-4 flex flex-col items-center">
               <div className="w-full">
                <label className="text-sm font-medium mb-1 block">One-Time Password (OTP)</label>
                <Input 
                  type="text" 
                  maxLength={6} 
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  className="text-center tracking-[0.5em] font-mono text-lg" 
                  disabled={loading}
                />
              </div>
              <Button 
                className="w-full mt-4" 
                onClick={handleVerify}
                disabled={loading || otp.length < 6}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify & Transfer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
