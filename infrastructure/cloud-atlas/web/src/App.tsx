import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  NodeMouseHandler,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  fetchGraph,
  fetchOverview,
  triggerScan,
  getSessionId,
  disconnectAws,
  GraphData,
  Overview,
  ResourceNode,
  QuestionCard,
  Alert,
} from './api';
import ConnectPage from './ConnectPage';
import DetailPanel from './DetailPanel';
import { DetailView, formatCost } from './inventory';

type Layer = 'network' | 'security' | 'terraform';

const TYPE_COLORS: Record<string, string> = {
  vpc: '#6366f1',
  subnet: '#64748b',
  internet_gateway: '#22d3ee',
  nat_gateway: '#f59e0b',
  security_group: '#f472b6',
  rds: '#a78bfa',
  elasticache: '#ec4899',
  eks_cluster: '#818cf8',
  s3: '#06b6d4',
  alb: '#14b8a6',
  cloudfront: '#f97316',
};

const SKIP_TYPES = new Set(['account', 'region']);

function buildFlow(data: GraphData, layer: Layer): { nodes: Node[]; edges: Edge[] } {
  const vpcs = data.nodes.filter((n) => n.type === 'vpc');
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const placed = new Set<string>();

  const addNode = (resource: ResourceNode, position: { x: number; y: number }, className: string, color?: string) => {
    if (placed.has(resource.id)) return;
    placed.add(resource.id);
    nodes.push({
      id: resource.id,
      position,
      data: { label: `${resource.type.replace(/_/g, ' ')}: ${resource.name}` },
      className,
      style: { minWidth: 130, padding: 8, borderColor: color },
    });
  };

  vpcs.forEach((vpc, vi) => {
    const vpcX = vi * 520;
    addNode(vpc, { x: vpcX, y: 40 }, 'node-vpc', TYPE_COLORS.vpc);

    const subnets = data.nodes.filter(
      (n) => n.type === 'subnet' && data.edges.some((e) => e.source === vpc.id && e.target === n.id),
    );
    subnets.forEach((subnet, si) => {
      const isPublic = subnet.metadata?.public;
      addNode(
        subnet,
        { x: vpcX + (si % 2) * 210, y: 160 + Math.floor(si / 2) * 100 },
        isPublic ? 'node-subnet-public' : 'node-subnet-private',
      );
      edges.push({ id: `${vpc.id}-${subnet.id}`, source: vpc.id, target: subnet.id });
    });

    const services = data.nodes.filter(
      (n) =>
        ['rds', 'elasticache', 'mq', 'eks_cluster', 'alb', 'nat_gateway', 'internet_gateway'].includes(n.type) &&
        data.edges.some((e) => e.source === vpc.id && e.target === n.id),
    );
    services.forEach((svc, si) => {
      const color = layer === 'security' && svc.public ? '#f472b6' : TYPE_COLORS[svc.type] || '#64748b';
      addNode(svc, { x: vpcX + 40 + si * 125, y: 380 }, svc.public && layer === 'security' ? 'node-risk' : 'node-service', color);
      edges.push({ id: `${vpc.id}-${svc.id}`, source: vpc.id, target: svc.id });
    });

    data.nodes
      .filter((n) => n.type === 'security_group' && n.metadata?.vpc_id === vpc.id)
      .forEach((sg, si) => {
        addNode(sg, { x: vpcX + 20 + si * 110, y: 520 }, sg.public && layer === 'security' ? 'node-risk' : 'node-service', TYPE_COLORS.security_group);
        edges.push({ id: `${vpc.id}-${sg.id}`, source: vpc.id, target: sg.id });
      });
  });

  data.nodes.filter((n) => ['cloudfront', 'route53_zone', 's3', 'ecr'].includes(n.type)).forEach((g, gi) => {
    addNode(
      g,
      { x: 50 + gi * 170, y: 640 },
      g.public && layer === 'security' ? 'node-risk' : 'node-service',
      TYPE_COLORS[g.type],
    );
  });

  const orphans = data.nodes.filter((n) => !placed.has(n.id) && !SKIP_TYPES.has(n.type));
  orphans.forEach((n, i) => {
    addNode(
      n,
      { x: 60 + (i % 4) * 180, y: 780 + Math.floor(i / 4) * 90 },
      n.public && layer === 'security' ? 'node-risk' : 'node-service',
      TYPE_COLORS[n.type],
    );
  });

  data.edges.forEach((e) => {
    if (!edges.find((x) => x.id === e.id)) {
      edges.push({ id: e.id, source: e.source, target: e.target });
    }
  });

  return { nodes, edges };
}

export default function App() {
  const [connected, setConnected] = useState(false);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [layer, setLayer] = useState<Layer>('network');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [detailStack, setDetailStack] = useState<DetailView[]>([]);
  const detailView = detailStack.length > 0 ? detailStack[detailStack.length - 1] : null;

  const pushDetail = (view: DetailView) => setDetailStack((s) => [...s, view]);
  const popDetail = () => setDetailStack((s) => s.slice(0, -1));
  const clearDetail = () => setDetailStack([]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const load = useCallback(async () => {
    if (!getSessionId()) {
      setConnected(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [ov, gr] = await Promise.all([fetchOverview(), fetchGraph()]);
      setOverview(ov);
      setGraph(gr);
      setConnected(true);
    } catch (e) {
      if (e instanceof Error && e.message === 'SESSION_EXPIRED') {
        setConnected(false);
        setOverview(null);
        setGraph(null);
      } else {
        setError(e instanceof Error ? e.message : 'Failed to load');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (getSessionId()) {
      setConnected(true);
      load();
    }
  }, [load]);

  const flow = useMemo(() => (graph ? buildFlow(graph, layer) : { nodes: [], edges: [] }), [graph, layer]);

  useEffect(() => {
    setNodes(flow.nodes);
    setEdges(flow.edges);
  }, [flow, setNodes, setEdges]);

  const handleScan = async () => {
    setScanning(true);
    try {
      await triggerScan();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectAws();
    setConnected(false);
    setOverview(null);
    setGraph(null);
    setDetailStack([]);
  };

  const openSummary = (title: string, filter: 'all' | 'public' | 'managed' | 'unmanaged') => {
    clearDetail();
    pushDetail({ kind: 'summary', title, filter });
  };

  const openQuestion = (card: QuestionCard) => {
    clearDetail();
    pushDetail({ kind: 'question', card });
  };

  const openAlert = (alert: Alert, index: number) => {
    clearDetail();
    pushDetail({ kind: 'alert', alert, index });
  };

  const openResource = (resource: ResourceNode) => {
    pushDetail({ kind: 'resource', resource });
  };

  const handleDetailBack = () => {
    if (detailStack.length > 1) popDetail();
    else clearDetail();
  };

  const handleNodeClick: NodeMouseHandler = (_, node) => {
    const resource = graph?.nodes.find((n) => n.id === node.id);
    if (resource) openResource(resource);
  };

  const isStatActive = (filter: string) =>
    detailView?.kind === 'summary' && detailView.filter === filter;

  const isQuestionActive = (q: string) =>
    detailView?.kind === 'question' && detailView.card.question === q;

  const isAlertActive = (index: number) =>
    detailView?.kind === 'alert' && detailView.index === index;

  if (!connected) {
    return <ConnectPage onConnected={() => { setConnected(true); load(); }} />;
  }

  if (loading && !overview) return <div className="loading">Loading your AWS map...</div>;

  const s = overview?.summary;
  const costLabel = s?.cost_period_label ?? 'This month';

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Cloud Atlas</h1>
          <span>
            Account {overview?.account_id} · {overview?.region} · {overview?.scanned_at?.slice(0, 19)}
            {s?.cost_available && s.account_monthly_cost_usd != null && (
              <> · Account {formatCost(s.account_monthly_cost_usd)} ({costLabel})</>
            )}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn" onClick={handleScan} disabled={scanning}>
            {scanning ? 'Scanning...' : 'Refresh'}
          </button>
          <button className="btn btn-secondary" onClick={handleDisconnect}>Disconnect</button>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <div className="main">
        <aside className="sidebar">
          <div className="summary-grid">
            <button
              type="button"
              className={`stat stat-clickable stat-resources ${isStatActive('all') ? 'active' : ''}`}
              onClick={() => openSummary('All Resources', 'all')}
            >
              <div className="label">Resources</div>
              <div className="value">{s?.total_resources}</div>
              <div className="stat-cost">{formatCost(s?.total_monthly_cost_usd)}</div>
              <span className="stat-hint">{costLabel} · tap to list →</span>
            </button>
            <button
              type="button"
              className={`stat stat-clickable stat-public ${isStatActive('public') ? 'active' : ''}`}
              onClick={() => openSummary('Public Resources', 'public')}
            >
              <div className="label">Public</div>
              <div className="value">{s?.public_resources}</div>
              <div className="stat-cost">{formatCost(s?.public_monthly_cost_usd)}</div>
              <span className="stat-hint">{costLabel} · tap to list →</span>
            </button>
            <button
              type="button"
              className={`stat stat-clickable stat-terraform ${isStatActive('managed') ? 'active' : ''}`}
              onClick={() => openSummary('Terraform Managed', 'managed')}
            >
              <div className="label">Terraform</div>
              <div className="value">{s?.managed_by_terraform}</div>
              <div className="stat-cost">{formatCost(s?.managed_monthly_cost_usd)}</div>
              <span className="stat-hint">{costLabel} · tap to list →</span>
            </button>
            <button
              type="button"
              className={`stat stat-clickable stat-unmanaged ${isStatActive('unmanaged') ? 'active' : ''}`}
              onClick={() => openSummary('Unmanaged Resources', 'unmanaged')}
            >
              <div className="label">Unmanaged</div>
              <div className="value">{s?.unmanaged}</div>
              <div className="stat-cost">{formatCost(s?.unmanaged_monthly_cost_usd)}</div>
              <span className="stat-hint">{costLabel} · tap to list →</span>
            </button>
          </div>

          {detailView && graph ? (
            <DetailPanel
              view={detailView}
              graph={graph}
              onClose={handleDetailBack}
              onSelectResource={openResource}
              embedded
              costPeriodLabel={costLabel}
            />
          ) : (
            <>
              <h2 className="sidebar-title">Questions</h2>
              {overview?.questions.map((q) => (
                <button
                  key={q.id ?? q.question}
                  type="button"
                  className={`card card-clickable ${isQuestionActive(q.question) ? 'active' : ''}`}
                  onClick={() => openQuestion(q)}
                >
                  <h3>{q.question}</h3>
                  <p>{q.answer}</p>
                  {q.monthly_cost_usd != null && (
                    <p className="card-cost">{formatCost(q.monthly_cost_usd)} · {costLabel}</p>
                  )}
                  <span className="card-chevron">Open details ›</span>
                </button>
              ))}

              <h2 className="sidebar-title">Alerts</h2>
              {overview?.alerts.length === 0 && (
                <p className="sidebar-empty">No alerts — looking good.</p>
              )}
              {overview?.alerts.slice(0, 8).map((a, i) => (
                <button
                  key={i}
                  type="button"
                  className={`alert alert-clickable ${a.severity === 'medium' ? 'medium' : a.severity === 'info' ? 'info' : ''} ${isAlertActive(i) ? 'active' : ''}`}
                  onClick={() => openAlert(a, i)}
                >
                  <strong>{a.title}</strong>
                  <div className="alert-detail">{a.detail}</div>
                  {a.monthly_cost_usd != null && a.monthly_cost_usd > 0 && (
                    <div className="alert-cost">{formatCost(a.monthly_cost_usd)} · {costLabel}</div>
                  )}
                </button>
              ))}
            </>
          )}
        </aside>

        <div className="map-area">
          <div className="map-toolbar">
            {(['network', 'security', 'terraform'] as Layer[]).map((l) => (
              <button key={l} className={`layer-btn ${layer === l ? 'active' : ''}`} onClick={() => setLayer(l)}>
                {l.charAt(0).toUpperCase() + l.slice(1)} View
              </button>
            ))}
          </div>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            fitView
            minZoom={0.3}
            maxZoom={2}
          >
            <Background color="#334155" gap={20} />
            <Controls />
            <MiniMap nodeColor={(n) => (n.className?.includes('risk') ? '#f472b6' : '#6366f1')} />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
