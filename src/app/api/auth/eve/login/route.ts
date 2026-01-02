import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function GET() {
  const clientId = process.env.EVE_CLIENT_ID;
  const redirectUri = `${process.env.EVE_BASE_URL}/api/auth/eve/callback`;
  const scopes = [
    'esi-markets.read_character_orders.v1',
    'esi-wallet.read_character_wallet.v1'
  ].join(' ');

  // Создаем и сохраняем state для защиты от CSRF
  const state = crypto.randomBytes(16).toString('hex');
  cookies().set('eve_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    maxAge: 60 * 10, // 10 минут
    path: '/',
  });

  const authUrl = new URL('https://login.eveonline.com/v2/oauth/authorize');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('client_id', clientId!);
  authUrl.searchParams.append('scope', scopes);
  authUrl.searchParams.append('state', state);

  return NextResponse.redirect(authUrl.toString());
}
