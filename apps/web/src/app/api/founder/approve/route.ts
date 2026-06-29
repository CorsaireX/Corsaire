import { NextResponse } from 'next/server';
import { getSession } from '@corsaire/auth/session';
import { supabaseAdmin } from '@/lib/supabase';

// Generate 20-character license code: NNNNN-AAAAA-AAAAA-AAAAA
// Segment 1: 5 Digits
// Segment 2-4: 5 Alphanumeric (excluding O, 0, I, 1)
function generateLicenseCode(): string {
  const digits = '23456789';
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No O, 0, I, 1
  
  const getRandom = (charset: string, length: number) => {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
  };

  const s1 = getRandom(digits, 5); // Digits only
  const s2 = getRandom(chars, 5);
  const s3 = getRandom(chars, 5);
  const s4 = getRandom(chars, 5);

  return `${s1}-${s2}-${s3}-${s4}`;
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId || session.role !== 'Founder') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paymentId, action } = await request.json();

    if (!paymentId || !action) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    if (action === 'reject') {
      await supabaseAdmin
        .from('Payments')
        .update({ Status: 'rejected' })
        .eq('ID', paymentId);
        
      return NextResponse.json({ success: true });
    }

    if (action === 'approve') {
      // 1. Fetch Payment Details
      const { data: payment, error: paymentError } = await supabaseAdmin
        .from('Payments')
        .select('*')
        .eq('ID', paymentId)
        .single();

      if (paymentError || !payment) {
        return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
      }

      if (payment.Status !== 'pending') {
        return NextResponse.json({ error: 'Payment already processed' }, { status: 400 });
      }

      // 2. Generate License Code
      let licenseCode = '';
      let isUnique = false;
      let attempts = 0;

      // Ensure uniqueness
      while (!isUnique && attempts < 5) {
        licenseCode = generateLicenseCode();
        const { data: existing } = await supabaseAdmin
          .from('Licenses')
          .select('ID')
          .eq('LicenseCode', licenseCode)
          .single();
        
        if (!existing) {
          isUnique = true;
        }
        attempts++;
      }

      if (!isUnique) {
        return NextResponse.json({ error: 'Failed to generate unique license code' }, { status: 500 });
      }

      // 3. Create License Record
      const { error: licenseError } = await supabaseAdmin
        .from('Licenses')
        .insert([{
          LicenseCode: licenseCode,
          PlanID: payment.PlanID,
          UserID: payment.UserID, // Automatically bound to the purchaser
          IsActive: true
        }]);

      if (licenseError) {
        console.error("License Error:", licenseError);
        return NextResponse.json({ error: 'Failed to create license' }, { status: 500 });
      }

      // 4. Update Payment Status
      await supabaseAdmin
        .from('Payments')
        .update({ Status: 'approved' })
        .eq('ID', paymentId);

      // 5. Trigger email to user (Mocked for now)
      console.log(`[Founder] License ${licenseCode} generated and bound to user ${payment.UserID}`);

      return NextResponse.json({ success: true, licenseCode });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Founder API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
