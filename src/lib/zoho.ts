// Zoho CRM API client
// Uses search/get endpoints (not COQL — requires different scope)

let cachedToken: { token: string; expiresAt: number } | null = null;
let refreshPromise: Promise<string> | null = null;

// Serialize token refreshes — only one refresh at a time
async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.token;
  }

  // If another refresh is in flight, wait for it
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    // Double-check after acquiring the "lock"
    if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
      return cachedToken.token;
    }

    const params = new URLSearchParams({
      refresh_token: process.env.ZOHO_REFRESH_TOKEN!,
      client_id: process.env.ZOHO_CLIENT_ID!,
      client_secret: process.env.ZOHO_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    });

    const res = await fetch('https://accounts.zoho.com/oauth/v2/token', {
      method: 'POST',
      body: params,
    });

    const data = await res.json();
    if (!data.access_token) throw new Error('Zoho token refresh failed: ' + JSON.stringify(data));

    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
    };

    return cachedToken.token;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

// Throttle Zoho API calls — max 3 concurrent requests
const ZOHO_MAX_CONCURRENT = 3;
let zohoActiveRequests = 0;
const zohoQueue: Array<{ resolve: (v: unknown) => void; reject: (e: unknown) => void; fn: () => Promise<unknown> }> = [];

function runZohoQueue() {
  while (zohoQueue.length > 0 && zohoActiveRequests < ZOHO_MAX_CONCURRENT) {
    const item = zohoQueue.shift()!;
    zohoActiveRequests++;
    item.fn()
      .then(item.resolve)
      .catch(item.reject)
      .finally(() => {
        zohoActiveRequests--;
        runZohoQueue();
      });
  }
}

function throttledZoho<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    zohoQueue.push({ resolve: resolve as (v: unknown) => void, reject, fn: fn as () => Promise<unknown> });
    runZohoQueue();
  });
}

async function zohoGetRaw(endpoint: string, params?: Record<string, string>) {
  const token = await getAccessToken();
  const url = new URL(`${process.env.ZOHO_API_DOMAIN}/crm/v5${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });

  if (res.status === 204) return { data: [] };

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zoho API error ${res.status}: ${text}`);
  }

  return res.json();
}

async function zohoGet(endpoint: string, params?: Record<string, string>) {
  return throttledZoho(() => zohoGetRaw(endpoint, params));
}

async function zohoPost(endpoint: string, body: unknown) {
  const token = await getAccessToken();
  const res = await fetch(`${process.env.ZOHO_API_DOMAIN}/crm/v5${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zoho API error ${res.status}: ${text}`);
  }

  return res.json();
}

async function zohoPut(endpoint: string, body: unknown) {
  const token = await getAccessToken();
  const res = await fetch(`${process.env.ZOHO_API_DOMAIN}/crm/v5${endpoint}`, {
    method: 'PUT',
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zoho API error ${res.status}: ${text}`);
  }

  return res.json();
}

// ─── Public API ───

export interface LeadRecord {
  id: string;
  type: 'lead' | 'contact';
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  mobile: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  status: string;
  owner: string;
  ownerId: string;
  notes: string;
  zillow: string;
  createdTime: string;
  modifiedTime: string;
  raw: Record<string, unknown>;
}

function buildAddress(record: Record<string, unknown>): string {
  const street = (record.Street || record.Mailing_Street || record.Property_Street || '') as string;
  const city = (record.City || record.Mailing_City || record.Property_City || '') as string;
  const state = (record.State || record.Mailing_State || record.Property_State || '') as string;
  const zip = (record.Zip_Code || record.Mailing_Zip || record.Property_Zip || '') as string;
  return [street, city, state, zip].filter(Boolean).join(', ');
}

// Normalize phone numbers to E.164 format (+1XXXXXXXXXX)
function normalizePhone(phone: string): string {
  if (!phone) return '';
  // Strip everything except digits
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (phone.startsWith('+')) return phone;
  return phone;
}

function normalizeRecord(record: Record<string, unknown>, type: 'lead' | 'contact'): LeadRecord {
  const firstName = (record.First_Name || '') as string;
  const lastName = (record.Last_Name || '') as string;
  const address = buildAddress(record);
  const city = (record.City || record.Mailing_City || record.Property_City || '') as string;
  const state = (record.State || record.Mailing_State || record.Property_State || '') as string;
  const zip = (record.Zip_Code || record.Mailing_Zip || record.Property_Zip || '') as string;

  const zillowAddress = [
    record.Street || record.Mailing_Street || record.Property_Street || '',
    city, state, zip,
  ].filter(Boolean).join(' ').replace(/\s+/g, '-');
  const zillow = zillowAddress ? `https://www.zillow.com/homes/${encodeURIComponent(zillowAddress)}_rb/` : '';

  return {
    id: record.id as string,
    type,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim() || 'Unknown',
    phone: normalizePhone((record.Phone || '') as string),
    mobile: normalizePhone((record.Mobile || '') as string),
    email: (record.Email || '') as string,
    address,
    city,
    state,
    zip,
    status: (record.Lead_Status || record.Contact_Status || record.Status || '') as string,
    owner: (record.Owner as Record<string, unknown>)?.name as string || '',
    ownerId: (record.Owner as Record<string, unknown>)?.id as string || '',
    notes: (record.Description || '') as string,
    zillow,
    createdTime: (record.Created_Time || '') as string,
    modifiedTime: (record.Modified_Time || '') as string,
    raw: record,
  };
}

// Statuses to exclude from all views
const EXCLUDED_STATUSES = ['lost', 'lost lead', 'not qualified', 'unqualified', 'junk lead', 'disqualified'];

function isExcludedStatus(status: string): boolean {
  if (!status) return false;
  const s = status.toLowerCase().trim();
  return EXCLUDED_STATUSES.some(ex => s === ex || s.includes(ex));
}

// Fetch records for multiple owners by making parallel search requests
async function fetchByOwners(
  module: 'Leads' | 'Contacts',
  ownerNames: string[],
  page: number,
  perPage: number
): Promise<{ records: LeadRecord[]; hasMore: boolean }> {
  const type = module === 'Leads' ? 'lead' : 'contact';
  const allRecords: LeadRecord[] = [];
  let anyHasMore = false;

  // Fetch for each owner in parallel
  const results = await Promise.all(
    ownerNames.map(async (ownerName) => {
      try {
        const criteria = `(Owner.name:equals:${ownerName})`;
        const data = await zohoGet(`/${module}/search`, {
          criteria,
          page: String(page),
          per_page: String(perPage),
          sort_by: 'Modified_Time',
          sort_order: 'desc',
        });
        return {
          records: (data.data || []).map((r: Record<string, unknown>) => normalizeRecord(r, type)),
          hasMore: data.info?.more_records || false,
        };
      } catch (e) {
        console.error(`Fetch ${module} for ${ownerName} error:`, e);
        return { records: [], hasMore: false };
      }
    })
  );

  for (const result of results) {
    allRecords.push(...result.records);
    if (result.hasMore) anyHasMore = true;
  }

  // Filter out lost/unqualified and sort by modified time descending
  const filtered = allRecords.filter(r => !isExcludedStatus(r.status));
  filtered.sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime());

  return { records: filtered, hasMore: anyHasMore };
}

export async function getLeads(ownerNames: string[], page = 1, perPage = 20, statusFilter?: string): Promise<{ records: LeadRecord[]; hasMore: boolean }> {
  if (statusFilter) {
    return fetchByOwnersWithStatus('Leads', ownerNames, statusFilter, page, perPage);
  }
  return fetchByOwners('Leads', ownerNames, page, perPage);
}

// Fetch with a specific status filter
async function fetchByOwnersWithStatus(
  module: 'Leads' | 'Contacts',
  ownerNames: string[],
  status: string,
  page: number,
  perPage: number
): Promise<{ records: LeadRecord[]; hasMore: boolean }> {
  const type = module === 'Leads' ? 'lead' : 'contact';
  const allRecords: LeadRecord[] = [];
  let anyHasMore = false;

  const statusField = module === 'Leads' ? 'Lead_Status' : 'Contact_Status';
  const results = await Promise.all(
    ownerNames.map(async (ownerName) => {
      try {
        const criteria = `((Owner.name:equals:${ownerName})and(${statusField}:equals:${status}))`;
        const data = await zohoGet(`/${module}/search`, {
          criteria,
          page: String(page),
          per_page: String(perPage),
          sort_by: 'Modified_Time',
          sort_order: 'desc',
        });
        return {
          records: (data.data || []).map((r: Record<string, unknown>) => normalizeRecord(r, type)),
          hasMore: data.info?.more_records || false,
        };
      } catch {
        return { records: [], hasMore: false };
      }
    })
  );

  for (const result of results) {
    allRecords.push(...result.records);
    if (result.hasMore) anyHasMore = true;
  }

  allRecords.sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime());
  return { records: allRecords, hasMore: anyHasMore };
}

export async function getContacts(ownerNames: string[], page = 1, perPage = 20): Promise<{ records: LeadRecord[]; hasMore: boolean }> {
  return fetchByOwners('Contacts', ownerNames, page, perPage);
}

export async function getRecord(module: 'Leads' | 'Contacts', id: string): Promise<LeadRecord | null> {
  try {
    const data = await zohoGet(`/${module}/${id}`);
    const type = module === 'Leads' ? 'lead' : 'contact';
    return normalizeRecord(data.data[0], type);
  } catch {
    return null;
  }
}

export async function updateNotes(module: 'Leads' | 'Contacts', id: string, notes: string) {
  return zohoPut(`/${module}/${id}`, {
    data: [{ Description: notes }],
  });
}

export async function addNote(module: 'Leads' | 'Contacts', id: string, noteTitle: string, noteContent: string) {
  return zohoPost(`/${module}/${id}/Notes`, {
    data: [{ Note_Title: noteTitle, Note_Content: noteContent }],
  });
}

export async function updateLeadStatus(id: string, status: string) {
  return zohoPut('/Leads/' + id, {
    data: [{ Lead_Status: status }],
  });
}

export async function convertLead(leadId: string) {
  return zohoPost(`/Leads/${leadId}/actions/convert`, {
    data: [
      {
        overwrite: true,
        notify_lead_owner: true,
        notify_new_entity_owner: true,
      },
    ],
  });
}

export async function searchRecords(query: string, ownerNames: string[]): Promise<LeadRecord[]> {
  const results: LeadRecord[] = [];

  for (const ownerName of ownerNames) {
    // Search leads
    try {
      const data = await zohoGet('/Leads/search', {
        criteria: `((Owner.name:equals:${ownerName})and((First_Name:contains:${query})or(Last_Name:contains:${query})or(Phone:contains:${query})))`,
        per_page: '20',
      });
      results.push(...(data.data || []).map((r: Record<string, unknown>) => normalizeRecord(r, 'lead')));
    } catch { /* ignore */ }

    // Search contacts
    try {
      const data = await zohoGet('/Contacts/search', {
        criteria: `((Owner.name:equals:${ownerName})and((First_Name:contains:${query})or(Last_Name:contains:${query})or(Phone:contains:${query})))`,
        per_page: '20',
      });
      results.push(...(data.data || []).map((r: Record<string, unknown>) => normalizeRecord(r, 'contact')));
    } catch { /* ignore */ }
  }

  return results.filter(r => !isExcludedStatus(r.status));
}

// ─── Dashboard API ───

export interface DashboardCounts {
  newLead: number;
  newNoContact: number;
  needsReply: number;
  followUp: number;
  contacted: number;
  qualified: number;
}

export interface NewNoContactBreakdown {
  total: number;
  within7d: number;
  within14d: number;
  within30d: number;
  over30d: number;
  records: LeadRecord[];
}

// Count all records matching a criteria by paginating through results
async function countRecords(module: string, criteria: string): Promise<number> {
  try {
    const data = await zohoGet(`/${module}/search`, {
      criteria,
      per_page: '200',
      page: '1',
    });
    let count = data.data?.length || 0;
    let hasMore = data.info?.more_records || false;
    let page = 2;
    
    // If there are more pages, keep counting (rare for status-filtered queries)
    while (hasMore && page <= 10) {
      const nextData = await zohoGet(`/${module}/search`, {
        criteria,
        per_page: '200',
        page: String(page),
      });
      count += nextData.data?.length || 0;
      hasMore = nextData.info?.more_records || false;
      page++;
    }
    
    return count;
  } catch {
    return 0;
  }
}

export async function getDashboardCounts(ownerNames: string[]): Promise<DashboardCounts> {
  const statusBuckets: Record<string, number> = {};
  const statusesToCount = ['New Lead', 'New No Contact', 'Incoming - Needs Reply', 'Follow-up', 'Contacted', 'Qualified', 'Ressurected'];

  const jobs: Promise<void>[] = [];
  for (const ownerName of ownerNames) {
    for (const status of statusesToCount) {
      jobs.push(
        (async () => {
          const criteria = `((Owner.name:equals:${ownerName})and(Lead_Status:equals:${status}))`;
          const count = await countRecords('Leads', criteria);
          statusBuckets[status] = (statusBuckets[status] || 0) + count;
        })()
      );
    }
  }
  await Promise.all(jobs);

  return {
    newLead: statusBuckets['New Lead'] || 0,
    newNoContact: statusBuckets['New No Contact'] || 0,
    needsReply: (statusBuckets['Incoming - Needs Reply'] || 0) + (statusBuckets['Ressurected'] || 0),
    followUp: statusBuckets['Follow-up'] || 0,
    contacted: statusBuckets['Contacted'] || 0,
    qualified: statusBuckets['Qualified'] || 0,
  };
}

export async function getNewNoContactBreakdown(ownerNames: string[]): Promise<NewNoContactBreakdown> {
  const allRecords: LeadRecord[] = [];

  await Promise.all(
    ownerNames.map(async (ownerName) => {
      try {
        const criteria = `((Owner.name:equals:${ownerName})and(Lead_Status:equals:New No Contact))`;
        let page = 1;
        let hasMore = true;
        while (hasMore && page <= 10) {
          const data = await zohoGet('/Leads/search', {
            criteria,
            per_page: '200',
            page: String(page),
            sort_by: 'Created_Time',
            sort_order: 'desc',
          });
          allRecords.push(...(data.data || []).map((r: Record<string, unknown>) => normalizeRecord(r, 'lead')));
          hasMore = data.info?.more_records || false;
          page++;
        }
      } catch { /* no records */ }
    })
  );

  const now = Date.now();
  const day = 86400000;
  let within7d = 0, within14d = 0, within30d = 0, over30d = 0;
  for (const r of allRecords) {
    const age = now - new Date(r.createdTime).getTime();
    if (age <= 7 * day) within7d++;
    else if (age <= 14 * day) within14d++;
    else if (age <= 30 * day) within30d++;
    else over30d++;
  }

  allRecords.sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());

  return { total: allRecords.length, within7d, within14d, within30d, over30d, records: allRecords };
}

export async function getLeadsByStatus(
  ownerNames: string[],
  statuses: string[],
  limit = 10
): Promise<LeadRecord[]> {
  const allRecords: LeadRecord[] = [];

  await Promise.all(
    ownerNames.map(async (ownerName) => {
      for (const status of statuses) {
        try {
          const criteria = `((Owner.name:equals:${ownerName})and(Lead_Status:equals:${status}))`;
          const data = await zohoGet('/Leads/search', {
            criteria,
            per_page: String(limit),
            sort_by: 'Modified_Time',
            sort_order: 'desc',
          });
          allRecords.push(...(data.data || []).map((r: Record<string, unknown>) => normalizeRecord(r, 'lead')));
        } catch {
          // No records
        }
      }
    })
  );

  // Sort by priority: New No Contact first, then Needs Reply, then Follow-up
  const priorityOrder: Record<string, number> = {
    'New No Contact': 0,
    'Incoming - Needs Reply': 1,
    'Ressurected': 1,
    'Follow-up': 2,
  };

  allRecords.sort((a, b) => {
    const pa = priorityOrder[a.status] ?? 99;
    const pb = priorityOrder[b.status] ?? 99;
    if (pa !== pb) return pa - pb;
    return new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime();
  });

  return allRecords.slice(0, limit);
}

// ─── Blueprint API ───

export interface BlueprintTransition {
  id: string;
  name: string;
  nextFieldValue: string;
  type: string; // manual | automatic
  colorCode: string;
  fields: BlueprintField[];
}

export interface BlueprintField {
  apiName: string;
  displayLabel: string;
  dataType: string;
  required: boolean;
  pickListValues?: { displayValue: string; actualValue: string }[];
}

export async function getBlueprint(
  module: string,
  recordId: string
): Promise<{ transitions: BlueprintTransition[] }> {
  try {
    const data = await zohoGet(`/${module}/${recordId}/actions/blueprint`);
    const transitions = (data.blueprint?.transitions || [])
      .filter((t: Record<string, unknown>) => t.type === 'manual')
      .map((t: Record<string, unknown>) => {
        const fields = ((t.fields as Record<string, unknown>[]) || [])
          .filter((f: Record<string, unknown>) => f._type !== 'messages' && f.data_type !== 'ownerlookup')
          .filter((f: Record<string, unknown>) => {
            // Only include fields that are actually required or are picklists the user needs to fill
            const apiName = f.api_name as string;
            return f.blueprint_supported !== false || 
              ['Lost_Reason', 'Lead_Status', 'Contact_Status'].includes(apiName);
          })
          .map((f: Record<string, unknown>) => ({
            apiName: f.api_name as string,
            displayLabel: f.display_label as string,
            dataType: f.data_type as string,
            required: (f.system_mandatory || false) as boolean,
            pickListValues: (f.pick_list_values as Record<string, unknown>[] || [])
              .filter((v: Record<string, unknown>) => v.actual_value !== '-None-')
              .map((v: Record<string, unknown>) => ({
                displayValue: v.display_value as string,
                actualValue: v.actual_value as string,
              })),
          }));

        return {
          id: t.id as string,
          name: t.name as string,
          nextFieldValue: t.next_field_value as string,
          type: t.type as string,
          colorCode: t.color_code as string,
          fields,
        };
      });

    return { transitions };
  } catch {
    return { transitions: [] };
  }
}

export async function executeTransition(
  module: string,
  recordId: string,
  transitionId: string,
  fieldData: Record<string, unknown>
): Promise<unknown> {
  const token = await getAccessToken();
  const body = {
    blueprint: [
      {
        transition_id: transitionId,
        data: fieldData,
      },
    ],
  };

  const res = await fetch(
    `${process.env.ZOHO_API_DOMAIN}/crm/v5/${module}/${recordId}/actions/blueprint`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Blueprint transition failed: ${text}`);
  }

  // 200 with empty body = success for blueprint
  const text = await res.text();
  return text ? JSON.parse(text) : { success: true };
}

export async function getLeadStatuses(): Promise<string[]> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${process.env.ZOHO_API_DOMAIN}/crm/v5/settings/fields?module=Leads`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
    const data = await res.json();
    const statusField = data.fields?.find((f: Record<string, unknown>) => f.api_name === 'Lead_Status');
    return statusField?.pick_list_values?.map((v: Record<string, unknown>) => v.display_value as string) || [];
  } catch {
    return ['Not Contacted', 'Attempted to Contact', 'Contact Made', 'Qualified', 'Unqualified'];
  }
}
