import { cookies } from 'next/headers';
import { signJWT, verifyJWT } from './jwt';

export async function setSession(userId: string, role: string = 'User') {
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const sessionToken = await signJWT({ userId, role }, '7d');

  cookies().set('session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expires,
    sameSite: 'lax',
    path: '/',
  });
}

export async function getSession() {
  const sessionToken = cookies().get('session')?.value;
  if (!sessionToken) return null;

  return await verifyJWT(sessionToken);
}

export function clearSession() {
  cookies().set('session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(0),
    sameSite: 'lax',
    path: '/',
  });
}
