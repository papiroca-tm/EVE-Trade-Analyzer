import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  cookies().delete('eve_session');
  
  const redirectUrl = process.env.EVE_BASE_URL || '/';
  
  return NextResponse.redirect(redirectUrl);
}
