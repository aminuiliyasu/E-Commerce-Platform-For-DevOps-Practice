import { Alert, GraphData, QuestionCard, ResourceNode } from './api';

export type DetailView =
  | { kind: 'summary'; title: string; filter: 'all' | 'public' | 'managed' | 'unmanaged' }
  | { kind: 'question'; card: QuestionCard }
  | { kind: 'alert'; alert: Alert; index: number }
  | { kind: 'resource'; resource: ResourceNode };

export function getChildren(graph: GraphData, nodeId: string): ResourceNode[] {
  const childIds = graph.edges.filter((e) => e.source === nodeId).map((e) => e.target);
  return graph.nodes.filter((n) => childIds.includes(n.id));
}

export function getParents(graph: GraphData, nodeId: string): ResourceNode[] {
  const parentIds = graph.edges.filter((e) => e.target === nodeId).map((e) => e.source);
  return graph.nodes.filter((n) => parentIds.includes(n.id));
}

export function groupByType(nodes: ResourceNode[]): Record<string, ResourceNode[]> {
  const groups: Record<string, ResourceNode[]> = {};
  for (const n of nodes) {
    if (n.type === 'account' || n.type === 'region') continue;
    groups[n.type] = groups[n.type] ?? [];
    groups[n.type].push(n);
  }
  return Object.fromEntries(Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)));
}

export function filterNodes(
  graph: GraphData,
  filter: 'all' | 'public' | 'managed' | 'unmanaged',
): ResourceNode[] {
  const nodes = graph.nodes.filter((n) => n.type !== 'account' && n.type !== 'region');
  if (filter === 'all') return nodes;
  if (filter === 'public') return nodes.filter((n) => n.public);
  if (filter === 'managed') return nodes.filter((n) => n.metadata?.terraform_status === 'managed');
  if (filter === 'unmanaged') return nodes.filter((n) => n.metadata?.terraform_status === 'unmanaged');
  return nodes;
}

export function formatType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getResourceStatus(resource: ResourceNode): string | null {
  const meta = resource.metadata ?? {};
  for (const key of ['status', 'state']) {
    const value = meta[key];
    if (value != null && String(value).trim()) return String(value);
  }
  return null;
}

export function statusTone(status: string): 'ok' | 'bad' | 'neutral' {
  const s = status.toLowerCase();
  if (['active', 'available', 'running', 'in-service', 'ok'].some((x) => s.includes(x))) return 'ok';
  if (['stopped', 'failed', 'deleting', 'deleted', 'inactive', 'impaired'].some((x) => s.includes(x))) return 'bad';
  return 'neutral';
}

export const TYPE_ICON: Record<string, string> = {
  vpc: '🌐',
  subnet: '📦',
  internet_gateway: '🌍',
  nat_gateway: '🔀',
  security_group: '🛡️',
  rds: '🗄️',
  elasticache: '⚡',
  mq: '📨',
  eks_cluster: '☸️',
  eks_nodegroup: '🖥️',
  ecr: '📦',
  s3: '🪣',
  alb: '⚖️',
  cloudfront: '📡',
  route53_zone: '📍',
  iam_role: '🔑',
};
