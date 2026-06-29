"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Building, CreditCard, QrCode, Loader2 } from "lucide-react";

export function CheckoutClient({ planId, price }: { planId: string, planName: string, price: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please upload a receipt screenshot.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("receipt", file);
      formData.append("planId", planId);

      const res = await fetch("/api/payments/submit", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit payment");
      }

      // Redirect to dashboard on success
      router.push("/dashboard?payment=success");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred");
      }
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-8 md:grid-cols-2">
      {/* Payment Methods */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Select Payment Method</h2>
          <div className="space-y-3">
            <Card className="opacity-50 cursor-not-allowed">
              <CardContent className="p-4 flex items-center gap-4">
                <Building className="h-6 w-6 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium">Online Banking (FPX)</div>
                  <div className="text-xs text-muted-foreground">Coming soon</div>
                </div>
              </CardContent>
            </Card>

            <Card className="opacity-50 cursor-not-allowed">
              <CardContent className="p-4 flex items-center gap-4">
                <CreditCard className="h-6 w-6 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium">Debit / Credit Card</div>
                  <div className="text-xs text-muted-foreground">Coming soon</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary border-2 bg-primary/5">
              <CardContent className="p-4 flex items-center gap-4">
                <QrCode className="h-6 w-6 text-primary" />
                <div className="flex-1">
                  <div className="font-medium">DuitNow QR / TNG eWallet</div>
                  <div className="text-xs text-primary">Zero transaction fee</div>
                </div>
                <div className="h-4 w-4 rounded-full bg-primary" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* QR Code and Upload Form */}
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <h3 className="font-semibold text-lg">Scan to Pay</h3>
              <div className="mx-auto w-48 h-48 bg-muted rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden">
                {/* Placeholder for QR Code */}
                <div className="text-center text-muted-foreground p-4">
                  <QrCode className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Master, upload tng-qr.png ke folder /public dan letak &lt;img src=&quot;/tng-qr.png&quot; /&gt; di sini</p>
                </div>
              </div>
              <p className="text-2xl font-bold">RM{price.toFixed(2)}</p>
            </div>

            <div className="mt-8 border-t pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="receipt">Upload Receipt Screenshot</Label>
                  <Input 
                    id="receipt" 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Formats: JPG, PNG. Max 5MB.</p>
                </div>
                
                {error && <div className="text-sm font-medium text-destructive">{error}</div>}

                <Button type="submit" className="w-full" disabled={loading || !file}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Submit Payment"
                  )}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
