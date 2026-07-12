export interface AwsConnectPayload {
  access_key_id: string;
  secret_access_key: string;
  session_token?: string;
  region: string;
  tf_state_bucket?: string;
  tf_state_key?: string;
}

export interface ConnectResponse {
  session_id: string;
  account_id: string;
  arn: string;
  region: string;
  summary: Overview['summary'];
}

export interface ResourceNode {
  id: string;
  type: string;
  name: string;
  region?: string;
  public?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ResourceEdge {
  id: string;
  source: string;
  target: string;
  type: string;
}

export interface Alert {
  severity: string;
  category: string;
  title: string;
  detail: string;
  resource_id?: string;
  question?: string;
}

export interface QuestionCard {
  question: string;
  answer: string;
  count?: number;
  alerts?: Alert[];
  modules?: Record<string, number>;
}

export interface Overview {
  summary: {
    total_resources: number;
    public_resources: number;
    managed_by_terraform: number;
    unmanaged: number;
    ghost_in_state: number;
    alert_count: number;
    critical_count: number;
  };
  questions: QuestionCard[];
  alerts: Alert[];
  scanned_at: string;
  account_id: string;
  region: string;
}

export interface GraphData {
  nodes: ResourceNode[];
  edges: ResourceEdge[];
}

const API = '/api';
const SESSION_KEY = 'cloudAtlasSession';

export function getSessionId(): string | null {
  return sessionStorage.getItem(SESSION_KEY);
}

export function setSessionId(id: string): void {
  sessionStorage.setItem(SESSION_KEY, id);
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

function headers(): HeadersInit {
  const sessionId = getSessionId();
  return sessionId ? { 'X-Session-Id': sessionId } : {};
}

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...headers(), ...init?.headers },
  });
  if (res.status === 401) {
    clearSession();
    throw new Error('SESSION_EXPIRED');
  }
  return res;
}

export async function connectAws(payload: AwsConnectPayload): Promise<ConnectResponse> {
  const res = await fetch(`${API}/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err.detail === 'string' ? err.detail : 'Failed to connect to AWS');
  }
  const data: ConnectResponse = await res.json();
  setSessionId(data.session_id);
  return data;
}

export async function disconnectAws(): Promise<void> {
  if (getSessionId()) {
    await fetch(`${API}/disconnect`, { method: 'POST', headers: headers() }).catch(() => {});
  }
  clearSession();
}

export async function fetchOverview(): Promise<Overview> {
  const res = await apiFetch('/overview');
  if (!res.ok) throw new Error('Failed to load overview');
  return res.json();
}

export async function fetchGraph(): Promise<GraphData> {
  const res = await apiFetch('/graph');
  if (!res.ok) throw new Error('Failed to load graph');
  return res.json();
}

export async function triggerScan(): Promise<void> {
  const res = await apiFetch('/scan', { method: 'POST' });
  if (!res.ok) throw new Error('Scan failed');
}
