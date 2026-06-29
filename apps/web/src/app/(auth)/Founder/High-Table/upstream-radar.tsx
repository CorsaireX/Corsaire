"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

type UpstreamData = {
  id: string;
  owner: string;
  repo: string;
  platform: string;
  displayName: string;
  upstreamVersion: string;
  upstreamUrl: string;
  publishedAt: string;
  localVersion: string;
  needsPatching: boolean;
  error: string | null;
};

export function UpstreamRadar() {
  const [data, setData] = useState<UpstreamData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUpstream = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/founder/upstream");
      const result = await res.json();
      if (res.ok) {
        setData(result.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpstream();
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle>Upstream Radar</CardTitle>
          <CardDescription>Monitor official GitHub releases for new patches.</CardDescription>
        </div>
        <Button variant="outline" size="icon" onClick={fetchUpstream} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {loading && data.length === 0 ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((item) => (
              <div key={item.id} className="flex items-center justify-between border p-3 rounded-lg bg-card">
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {item.displayName}
                    {item.needsPatching && (
                      <Badge variant="destructive" className="h-5">Needs Patching</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Local: <span className="font-mono text-foreground">{item.localVersion}</span> 
                    {' '}→{' '}
                    Latest: <span className="font-mono text-foreground">{item.upstreamVersion}</span>
                  </div>
                  {item.error && (
                    <div className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> {item.error}
                    </div>
                  )}
                </div>
                {item.upstreamUrl && (
                  <a 
                    href={item.upstreamUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-primary hover:bg-muted p-2 rounded-md transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
