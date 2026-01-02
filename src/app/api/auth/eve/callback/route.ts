import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { sealData } from 'iron-session';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const storedState = cookies().get('eve_oauth_state')?.value;

  if (!state || state !== storedState) {
    return new NextResponse('Invalid state parameter', { status: 400 });
  }

  // Удаляем state после использования
  cookies().delete('eve_oauth_state');

  if (!code) {
    return new NextResponse('Missing code parameter', { status: 400 });
  }

  const clientId = process.env.EVE_CLIENT_ID!;
  const clientSecret = process.env.EVE_CLIENT_SECRET!;
  const redirectUri = `${process.env.EVE_BASE_URL}/api/auth/eve/callback`;

  try {
    // 1. Обмен кода на токен
    const tokenResponse = await fetch('https://login.eveonline.com/v2/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.json();
      console.error('EVE Token Exchange Error:', errorBody);
      return new NextResponse(`Failed to exchange token: ${errorBody.error_description}`, { status: 500 });
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokens;

    // 2. Получение информации о персонаже
    const verifyResponse = await fetch('https://login.eveonline.com/oauth/verify', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    if (!verifyResponse.ok) {
        throw new Error('Failed to verify token and get character info');
    }

    const characterInfo = await verifyResponse.json();
    const { CharacterID, CharacterName } = characterInfo;

    // 3. Создание сессии и сохранение в cookie
    const sessionData = {
        characterId: CharacterID,
        characterName: CharacterName,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: Date.now() + (expires_in * 1000),
    };

    const sealedSession = await sealData(sessionData, {
        password: process.env.COOKIE_SECRET!,
        ttl: 60 * 60 * 24 * 7, // 7 дней
    });

    cookies().set('eve_session', sealedSession, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
    });
    
    // 4. Редирект на главную страницу
    return NextResponse.redirect(process.env.EVE_BASE_URL || '/');

  } catch (error) {
    console.error('Callback handler error:', error);
    return new NextResponse('An internal server error occurred', { status: 500 });
  }
}
