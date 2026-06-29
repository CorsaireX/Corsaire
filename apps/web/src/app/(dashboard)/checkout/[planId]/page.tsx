import { redirect } from 'next/navigation';
import { getSession } from '@corsaire/auth/session';
import { supabaseAdmin } from '@/lib/supabase';
import { CheckoutClient } from './checkout-client';

export default async function CheckoutPage({ params }: { params: { planId: string } }) {
  const session = await getSession();
  if (!session || !session.userId) {
    redirect('/login');
  }

  // Fetch the chosen plan
  const { data: plan } = await supabaseAdmin
    .from('Plans')
    .select('*')
    .eq('ID', params.planId)
    .single();

  if (!plan) {
    redirect('/purchase');
  }

  return (
    <div className="container py-12 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Checkout</h1>
        <p className="text-muted-foreground mt-2">
          You are purchasing: <span className="font-semibold text-foreground">{plan.Name}</span>
        </p>
      </div>

      <CheckoutClient planId={plan.ID} planName={plan.Name} price={plan.Price} />
    </div>
  );
}

export const runtime = 'edge';
