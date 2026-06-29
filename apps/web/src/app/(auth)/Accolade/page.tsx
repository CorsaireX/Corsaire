"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AccoladePage() {
  const router = useRouter();
  const [isAscension, setIsAscension] = useState(false);
  const [email, setEmail] = useState("");
  const [secretPhrase, setSecretPhrase] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [key, setKey] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleTrialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (secretPhrase !== "AKUPUNYASISTEM") {
      router.push("/login");
      return;
    }
    // Pass to Ascension
    setIsAscension(true);
    setError("");
  };

  const handleAscensionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!key) {
      setError("Key is required.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/accolade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, key, secretPhrase }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Ascension failed");
      }

      // Success, route to Founder Portal
      router.push("/The-Gate/Continental");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isAscension) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
        <div className="w-full max-w-md space-y-8 rounded-xl bg-zinc-900 p-8 shadow-2xl border border-zinc-800">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Register</h2>
          </div>

          <form onSubmit={handleTrialSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Password</label>
              <Input
                type="password"
                value={secretPhrase}
                onChange={(e) => setSecretPhrase(e.target.value)}
                required
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>

            <Button type="submit" className="w-full bg-zinc-100 text-zinc-900 hover:bg-zinc-200">
              Register
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-zinc-900 p-8 shadow-2xl border border-zinc-800">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-amber-500">Setup Account</h2>
        </div>

        <form onSubmit={handleAscensionSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Email</label>
            <Input
              type="email"
              value={email}
              disabled
              className="bg-zinc-800/50 border-zinc-700/50 text-zinc-500 opacity-70 cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Password</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-zinc-800 border-zinc-700 text-zinc-100 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Confirm Password</label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="bg-zinc-800 border-zinc-700 text-zinc-100 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
              >
                {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Key</label>
            <Input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              required
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
            />
          </div>

          {error && (
            <div className="text-sm font-medium text-red-500 text-center">{error}</div>
          )}

          <Button 
            type="submit" 
            className="w-full bg-amber-500 text-amber-950 hover:bg-amber-400 font-bold"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validating...
              </>
            ) : (
              "Register"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
