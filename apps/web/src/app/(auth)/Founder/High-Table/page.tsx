import { redirect } from 'next/navigation';
import { getSession } from '@corsaire/auth/session';
import { supabaseAdmin } from '@/lib/supabase';
import { FounderClient } from './client';
import { UpstreamRadar } from './upstream-radar';

async function getPendingPayments() {
  // Fetch pending payments and join with Users and Plans
  const { data, error } = await supabaseAdmin
    .from('Payments')
    .select(`
      ID,
      AmountMYR,
      PaymentProof,
      CreatedAt,
      UserID,
      PlanID,
      Users ( Email ),
      Plans ( Name, Apps )
    `)
    .eq('Status', 'pending')
    .order('CreatedAt', { ascending: true });

  if (error) {
    console.error("Error fetching payments:", error);
    return [];
  }

  // Format the data for the client
  return data.map((row: unknown) => {
    const payment = row as {
      ID: string;
      AmountMYR: number;
      PaymentProof: string;
      CreatedAt: string;
      UserID: string;
      PlanID: string;
      Users: { Email: string } | { Email: string }[] | null;
      Plans: { Name: string; Apps: string[] } | { Name: string; Apps: string[] }[] | null;
    };

    const userEmail = Array.isArray(payment.Users) ? payment.Users[0]?.Email : payment.Users?.Email;
    const planName = Array.isArray(payment.Plans) ? payment.Plans[0]?.Name : payment.Plans?.Name;
    const planApps = Array.isArray(payment.Plans) ? payment.Plans[0]?.Apps : payment.Plans?.Apps;

    return {
      id: payment.ID,
      email: userEmail || 'Unknown User',
      planName: planName || 'Unknown Plan',
      apps: planApps || [],
      amount: payment.AmountMYR,
      proofUrl: payment.PaymentProof,
      date: new Date(payment.CreatedAt).toLocaleString(),
      userId: payment.UserID,
      planId: payment.PlanID,
    };
  });
}

export default async function HighTablePage() {
  const session = await getSession();
  
  // Verify Founder role
  if (!session || !session.userId || session.role !== 'Founder') {
    redirect('/dashboard');
  }

  const pendingPayments = await getPendingPayments();

  return (
    <div className="container py-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">The High Table</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back, Founder. Master control over Corsaire.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <FounderClient initialPayments={pendingPayments} />
        </div>
        <div className="lg:col-span-1">
          <UpstreamRadar />
        </div>
      </div>
    </div>
  );
}

export const runtime = 'edge';
