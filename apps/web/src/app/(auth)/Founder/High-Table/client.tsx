"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X, ExternalLink } from "lucide-react";

type Payment = {
  id: string;
  email: string;
  planName: string;
  apps: string[];
  amount: number;
  proofUrl: string;
  date: string;
  userId: string;
  planId: string;
};

export function FounderClient({ initialPayments }: { initialPayments: Payment[] }) {
  const [payments, setPayments] = useState(initialPayments);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleAction = async (paymentId: string, action: 'approve' | 'reject') => {
    setLoadingId(paymentId);
    
    try {
      const res = await fetch("/api/founder/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, action }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Action failed");
      }

      // Remove from list
      setPayments(payments.filter(p => p.id !== paymentId));
      
      if (action === 'approve') {
        alert(`Success! Generated License: ${data.licenseCode}`);
      } else {
        alert("Payment rejected.");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert("An unexpected error occurred");
      }
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Approvals</CardTitle>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No pending payments. Everything is settled!
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User Email</TableHead>
                  <TableHead>App / Plan</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="text-sm whitespace-nowrap">{payment.date}</TableCell>
                    <TableCell className="font-medium">{payment.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{payment.planName}</Badge>
                    </TableCell>
                    <TableCell className="font-bold">RM{payment.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <a 
                        href={payment.proofUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center text-primary hover:underline text-sm"
                      >
                        View Receipt
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button 
                        size="sm" 
                        variant="destructive"
                        disabled={loadingId === payment.id}
                        onClick={() => handleAction(payment.id, 'reject')}
                      >
                        {loadingId === payment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                      </Button>
                      <Button 
                        size="sm" 
                        disabled={loadingId === payment.id}
                        onClick={() => handleAction(payment.id, 'approve')}
                      >
                        {loadingId === payment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
