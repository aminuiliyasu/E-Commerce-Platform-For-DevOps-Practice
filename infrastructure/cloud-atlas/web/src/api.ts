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

export async function fetchOverview(): Promise<Overview> {
  const res = await fetch(`${API}/overview`);
  if (!res.ok) throw new Error('Failed to load overview');
  return res.json();
}

export async function fetchGraph(): Promise<GraphData> {
  const res = await fetch(`${API}/graph`);
  if (!res.ok) throw new Error('Failed to load graph');
  return res.json();
}

export async function triggerScan(): Promise<void> {
  const res = await fetch(`${API}/scan`, { method: 'POST' });
  if (!res.ok) throw new Error('Scan failed');
}
