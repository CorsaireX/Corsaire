import { NextResponse } from 'next/server';
import { getSession } from '@corsaire/auth/session';
import { supabaseAdmin } from '@/lib/supabase';
import { r2Client } from '@/lib/r2';
import { PutObjectCommand } from '@aws-sdk/client-s3';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('receipt') as File | null;
    const planId = formData.get('planId') as string;

    if (!file || !planId) {
      return NextResponse.json({ error: 'Missing receipt or plan details' }, { status: 400 });
    }

    // Validate Plan and Amount
    const { data: plan } = await supabaseAdmin
      .from('Plans')
      .select('Price')
      .eq('ID', planId)
      .single();

    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
    }

    // Upload to Cloudflare R2
    const fileBuffer = await file.arrayBuffer();
    const extension = file.name.split('.').pop() || 'png';
    const uniqueFilename = `receipts/${session.userId}-${Date.now()}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME as string,
      Key: uniqueFilename,
      Body: Buffer.from(fileBuffer),
      ContentType: file.type,
    });

    await r2Client.send(command);

    // Construct public URL
    const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
    const paymentProofUrl = `${r2PublicUrl}/${uniqueFilename}`;

    // Save to Payments table
    const { error: insertError } = await supabaseAdmin
      .from('Payments')
      .insert([
        {
          UserID: session.userId,
          PlanID: planId,
          AmountMYR: plan.Price,
          Method: 'TNG_personal',
          Status: 'pending',
          PaymentProof: paymentProofUrl,
        }
      ]);

    if (insertError) {
      console.error('Failed to insert payment:', insertError);
      return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Payment Submission Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const runtime = 'edge';
