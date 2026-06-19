// Server-side store for RC tokens per user
// In production, swap this for a database
// For now, file-based persistence

import { promises as fs } from 'fs';
import path from 'path';
import { refreshToken as rcRefreshToken, type RCTokens } from './ringcentral';

const STORE_PATH = path.join(process.cwd(), 'data', 'rc-tokens.json');

interface StoredToken {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  phone_number: string;
  owner_id: string;
}

type TokenStore = Record<string, StoredToken>; // keyed by team member id

async function readStore(): Promise<TokenStore> {
  try {
    const data = await fs.readFile(STORE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function writeStore(store: TokenStore): Promise<void> {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2));
}

export async function saveRCTokens(
  memberId: string,
  tokens: RCTokens,
  phoneNumber: string
): Promise<void> {
  const store = await readStore();
  store[memberId] = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: Date.now() + tokens.expires_in * 1000,
    phone_number: phoneNumber,
    owner_id: tokens.owner_id,
  };
  await writeStore(store);
}

export async function getRCAccessToken(memberId: string): Promise<{
  accessToken: string;
  phoneNumber: string;
} | null> {
  const store = await readStore();
  const stored = store[memberId];
  if (!stored) return null;

  // Check if token needs refresh (5 min buffer)
  if (Date.now() > stored.expires_at - 300000) {
    try {
      const newTokens = await rcRefreshToken(stored.refresh_token);
      store[memberId] = {
        ...stored,
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token,
        expires_at: Date.now() + newTokens.expires_in * 1000,
      };
      await writeStore(store);
      return { accessToken: newTokens.access_token, phoneNumber: stored.phone_number };
    } catch (e) {
      console.error('RC token refresh failed for', memberId, e);
      // Remove invalid token
      delete store[memberId];
      await writeStore(store);
      return null;
    }
  }

  return { accessToken: stored.access_token, phoneNumber: stored.phone_number };
}

export async function isRCConnected(memberId: string): Promise<boolean> {
  const token = await getRCAccessToken(memberId);
  return token !== null;
}

export async function disconnectRC(memberId: string): Promise<void> {
  const store = await readStore();
  delete store[memberId];
  await writeStore(store);
}
