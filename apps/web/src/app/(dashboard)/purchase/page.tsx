import { redirect } from 'next/navigation';
import { getSession } from '@corsaire/auth/session';
import { supabaseAdmin } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

async function getPlans() {
  const { data } = await supabaseAdmin
    .from('Plans')
    .select('*')
    .eq('IsActive', true)
    .order('Price', { ascending: true });
  return data || [];
}

export default async function PurchasePage() {
  const session = await getSession();
  if (!session || !session.userId) {
    redirect('/login');
  }

  const plans = await getPlans();

  return (
    <div className="container py-12 max-w-5xl mx-auto space-y-8">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tight">Choose Your App</h1>
        <p className="text-muted-foreground mt-4 text-lg">
          One-time payment for lifetime access. No monthly subscriptions, no hidden fees.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-3 mt-12">
        {plans.map((plan) => (
          <Card key={plan.ID} className="flex flex-col relative overflow-hidden">
            {plan.Name.toLowerCase().includes('bundle') && (
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                BEST VALUE
              </div>
            )}
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl">{plan.Name}</CardTitle>
              <CardDescription>Lifetime Access</CardDescription>
            </CardHeader>
            <CardContent className="text-center flex-1">
              <div className="my-4">
                <span className="text-4xl font-extrabold">RM{plan.Price}</span>
              </div>
              <ul className="mt-8 space-y-3 text-sm text-left">
                {plan.Apps.map((app: string) => (
                  <li key={app} className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-primary" />
                    <span className="capitalize">{app.replace('_', ' ')} MOD</span>
                  </li>
                ))}
                <li className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Ad-blocking & Premium Features</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Free Lifetime Updates</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <form action={`/checkout/${plan.ID}`} method="GET" className="w-full">
                <Button className="w-full" size="lg" type="submit">Select App</Button>
              </form>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
