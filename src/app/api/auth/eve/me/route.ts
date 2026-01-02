import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { unsealData } from 'iron-session';

export async function GET() {
  const cookie = cookies().get('eve_session')?.value;
  
  if (!cookie) {
    return NextResponse.json({ isLoggedIn: false }, { status: 200 });
  }

  try {
    const session = await unsealData(cookie, {
      password: process.env.COOKIE_SECRET!,
    });

    // TODO: Здесь можно добавить логику обновления токена, если он истек.
    // Для простоты пока опустим.

    if (Date.now() > session.expiresAt) {
         // Здесь в будущем будет логика обновления токена. Пока просто разлогиниваем.
        cookies().delete('eve_session');
        return NextResponse.json({ isLoggedIn: false, error: "Token expired" }, { status: 401 });
    }

    return NextResponse.json({
      isLoggedIn: true,
      characterName: session.characterName,
      characterId: session.characterId,
    }, { status: 200 });

  } catch (error) {
    // Если cookie невалидный
    return NextResponse.json({ isLoggedIn: false }, { status: 200 });
  }
}
