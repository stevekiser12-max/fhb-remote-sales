// RingCentral API client
// Handles OAuth flow and SMS operations per-user

const RC_SERVER = 'https://platform.ringcentral.com';

export interface RCTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  owner_id: string;
  endpoint_id: string;
}

export interface RCMessage {
  id: string;
  direction: 'Inbound' | 'Outbound';
  from: string;
  to: string;
  subject: string; // SMS body
  creationTime: string;
  readStatus: string;
  type: string;
}

// ─── OAuth Flow ───

export function getAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.RC_CLIENT_ID!,
    redirect_uri: process.env.RC_REDIRECT_URI!,
    state,
  });
  return `${RC_SERVER}/restapi/oauth/authorize?${params.toString()}`;
}

export async function exchangeCode(code: string): Promise<RCTokens> {
  const authHeader = Buffer.from(
    `${process.env.RC_CLIENT_ID}:${process.env.RC_CLIENT_SECRET}`
  ).toString('base64');

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.RC_REDIRECT_URI!,
  });

  const res = await fetch(`${RC_SERVER}/restapi/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RC token exchange failed: ${text}`);
  }

  return res.json();
}

export async function refreshToken(refreshToken: string): Promise<RCTokens> {
  const authHeader = Buffer.from(
    `${process.env.RC_CLIENT_ID}:${process.env.RC_CLIENT_SECRET}`
  ).toString('base64');

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const res = await fetch(`${RC_SERVER}/restapi/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RC token refresh failed: ${text}`);
  }

  return res.json();
}

// ─── API Helpers (per-user token) ───

async function rcGet(accessToken: string, endpoint: string, params?: Record<string, string>) {
  const url = new URL(`${RC_SERVER}/restapi/v1.0${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RC API error ${res.status}: ${text}`);
  }

  return res.json();
}

async function rcPost(accessToken: string, endpoint: string, body: unknown) {
  const res = await fetch(`${RC_SERVER}/restapi/v1.0${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RC API error ${res.status}: ${text}`);
  }

  return res.json();
}

// ─── Public SMS API ───

export async function getExtensionInfo(accessToken: string) {
  return rcGet(accessToken, '/account/~/extension/~');
}

export async function getPhoneNumbers(accessToken: string): Promise<string[]> {
  const data = await rcGet(accessToken, '/account/~/extension/~/phone-number');
  return data.records
    ?.filter((r: Record<string, unknown>) => {
      const features = r.features as string[] | undefined;
      return features?.includes('SmsSender');
    })
    .map((r: Record<string, unknown>) => r.phoneNumber as string) || [];
}

export async function sendSMS(
  accessToken: string,
  from: string,
  to: string,
  text: string
): Promise<RCMessage> {
  const data = await rcPost(accessToken, '/account/~/extension/~/sms', {
    from: { phoneNumber: from },
    to: [{ phoneNumber: to }],
    text,
  });

  return {
    id: data.id,
    direction: data.direction,
    from: data.from?.phoneNumber || from,
    to: data.to?.[0]?.phoneNumber || to,
    subject: data.subject || text,
    creationTime: data.creationTime,
    readStatus: data.readStatus,
    type: data.type,
  };
}

export async function getConversation(
  accessToken: string,
  phoneNumber: string,
  page = 1,
  perPage = 50
): Promise<{ messages: RCMessage[]; hasMore: boolean }> {
  // Get messages involving this phone number
  console.log('[RC] getConversation for:', phoneNumber);
  const data = await rcGet(accessToken, '/account/~/extension/~/message-store', {
    messageType: 'SMS',
    phoneNumber,
    perPage: String(perPage),
    page: String(page),
  });
  console.log('[RC] messages returned:', data.records?.length || 0);

  const messages: RCMessage[] = (data.records || []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    direction: r.direction as 'Inbound' | 'Outbound',
    from: (r.from as Record<string, unknown>)?.phoneNumber as string || '',
    to: ((r.to as Record<string, unknown>[])?.[0])?.phoneNumber as string || '',
    subject: (r.subject || '') as string,
    creationTime: r.creationTime as string,
    readStatus: r.readStatus as string,
    type: r.type as string,
  }));

  return {
    messages: messages.reverse(), // oldest first
    hasMore: data.navigation?.nextPage !== undefined,
  };
}

export async function getRecentConversations(
  accessToken: string,
  perPage = 100
): Promise<Map<string, RCMessage[]>> {
  const data = await rcGet(accessToken, '/account/~/extension/~/message-store', {
    messageType: 'SMS',
    perPage: String(perPage),
  });

  // Group by other party's phone number
  const convos = new Map<string, RCMessage[]>();
  for (const r of data.records || []) {
    const otherNumber = r.direction === 'Inbound'
      ? (r.from as Record<string, unknown>)?.phoneNumber as string
      : ((r.to as Record<string, unknown>[])?.[0])?.phoneNumber as string;

    if (!otherNumber) continue;

    const msg: RCMessage = {
      id: r.id,
      direction: r.direction,
      from: (r.from as Record<string, unknown>)?.phoneNumber as string || '',
      to: ((r.to as Record<string, unknown>[])?.[0])?.phoneNumber as string || '',
      subject: r.subject || '',
      creationTime: r.creationTime,
      readStatus: r.readStatus,
      type: r.type,
    };

    if (!convos.has(otherNumber)) {
      convos.set(otherNumber, []);
    }
    convos.get(otherNumber)!.push(msg);
  }

  return convos;
}
