// Simple PIN-based auth with RC OAuth for texting
// Users are pre-configured; PIN gets them into the app
// RC OAuth connects their texting separately

import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'dev-secret');

export interface TeamMember {
  id: string;
  name: string;
  pin: string;
  zohoName: string; // Exact name in Zoho CRM Owner field
}

// Team roster — Stephen sets PINs
// Zoho names must match EXACTLY what's in CRM
export const TEAM: TeamMember[] = [
  {
    id: 'stephen',
    name: 'Stephen',
    pin: '1234', // change this
    zohoName: 'Stephen Kiser',
  },
  {
    id: 'jo',
    name: 'Jo',
    pin: '2345', // change this
    zohoName: 'Jo Clontz',
  },
  {
    id: 'trevor',
    name: 'Trevor',
    pin: '3456', // change this
    zohoName: 'Trevor Hicks',
  },
  {
    id: 'cliff',
    name: 'Cliff',
    pin: '4567', // change this
    zohoName: 'Cliff  Anderson', // note: double space in Zoho
  },
  {
    id: 'adam',
    name: 'Adam',
    pin: '5678', // change this
    zohoName: 'Adam Roberts',
  },
];

// Olivia Hayes records are always visible to everyone
export const SHARED_OWNER = 'Olivia Hayes';

export function getOwnerNames(member: TeamMember): string[] {
  return [member.zohoName, SHARED_OWNER];
}

export async function createSession(memberId: string): Promise<string> {
  const token = await new SignJWT({ memberId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .setIssuedAt()
    .sign(JWT_SECRET);
  return token;
}

export async function getSession(): Promise<TeamMember | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const member = TEAM.find(m => m.id === payload.memberId);
    return member || null;
  } catch {
    return null;
  }
}

export function getMemberById(id: string): TeamMember | null {
  return TEAM.find(m => m.id === id) || null;
}

export function authenticatePin(pin: string): TeamMember | null {
  return TEAM.find(m => m.pin === pin && m.pin !== '') || null;
}
