import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode, getPhoneNumbers, getExtensionInfo } from '@/lib/ringcentral';
import { saveRCTokens } from '@/lib/rc-store';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state'); // member id

  if (!code) {
    return NextResponse.redirect(new URL('/settings?error=no_code', req.url));
  }

  const member = await getSession();
  if (!member) {
    return NextResponse.redirect(new URL('/login?error=not_authenticated', req.url));
  }

  try {
    const tokens = await exchangeCode(code);

    // Get the user's SMS-capable phone number
    const phoneNumbers = await getPhoneNumbers(tokens.access_token);
    const extInfo = await getExtensionInfo(tokens.access_token);

    console.log(`RC OAuth success for ${member.name}: ext ${extInfo.extensionNumber}, phones: ${phoneNumbers.join(', ')}`);

    const primaryPhone = phoneNumbers[0] || '';

    await saveRCTokens(member.id, tokens, primaryPhone);

    return NextResponse.redirect(new URL('/settings?rc=connected', req.url));
  } catch (e) {
    console.error('RC OAuth callback error:', e);
    return NextResponse.redirect(new URL('/settings?error=rc_failed', req.url));
  }
}
