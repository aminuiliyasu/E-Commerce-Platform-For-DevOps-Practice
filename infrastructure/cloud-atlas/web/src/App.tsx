import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
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
} from './api';
import ConnectPage from './ConnectPage';

type Layer = 'network' | 'security' | 'terraform';

const TYPE_COLORS: Record<string, string> = {
  vpc: '#3b82f6',
  subnet: '#64748b',
  internet_gateway: '#22c55e',
  nat_gateway: '#f59e0b',
  security_group: '#ef4444',
  rds: '#a855f7',
  elasticache: '#ec4899',
  eks_cluster: '#818cf8',
  s3: '#06b6d4',
  alb: '#14b8a6',
  cloudfront: '#f97316',
};

function buildFlow(data: GraphData, layer: Layer): { nodes: Node[]; edges: Edge[] } {
  const vpcs = data.nodes.filter((n) => n.type === 'vpc');
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  vpcs.forEach((vpc, vi) => {
    const vpcX = vi * 500;
    nodes.push({
      id: vpc.id,
      position: { x: vpcX, y: 40 },
      data: { label: `VPC: ${vpc.name}` },
      className: 'node-vpc',
      style: { minWidth: 180, padding: 10 },
    });

    const subnets = data.nodes.filter(
      (n) => n.type === 'subnet' && data.edges.some((e) => e.source === vpc.id && e.target === n.id)
    );
    subnets.forEach((subnet, si) => {
      const isPublic = subnet.metadata?.public;
      nodes.push({
        id: subnet.id,
        position: { x: vpcX + (si % 2) * 200, y: 160 + Math.floor(si / 2) * 100 },
        data: { label: `${isPublic ? 'Public' : 'Private'}: ${subnet.name}` },
        className: isPublic ? 'node-subnet-public' : 'node-subnet-private',
        style: { minWidth: 150, padding: 8 },
      });
      edges.push({ id: `${vpc.id}-${subnet.id}`, source: vpc.id, target: subnet.id });
    });

    const services = data.nodes.filter((n) =>
      ['rds', 'elasticache', 'mq', 'eks_cluster', 'alb', 'nat_gateway', 'internet_gateway'].includes(n.type)
      && data.edges.some((e) => e.source === vpc.id && e.target === n.id)
    );
    services.forEach((svc, si) => {
      const color = layer === 'security' && svc.public ? '#ef4444' : TYPE_COLORS[svc.type] || '#64748b';
      nodes.push({
        id: svc.id,
        position: { x: vpcX + 50 + si * 120, y: 380 },
        data: { label: `${svc.type}: ${svc.name}` },
        className: svc.public && layer === 'security' ? 'node-risk' : 'node-service',
        style: { minWidth: 120, padding: 8, borderColor: color },
      });
      edges.push({ id: `${vpc.id}-${svc.id}`, source: vpc.id, target: svc.id });
    });
  });

  data.nodes.filter((n) => ['cloudfront', 'route53_zone', 's3', 'ecr'].includes(n.type)).forEach((g, gi) => {
    nodes.push({
      id: g.id,
      position: { x: 50 + gi * 160, y: 520 },
      data: { label: `${g.type}: ${g.name}` },
      className: g.public && layer === 'security' ? 'node-risk' : 'node-service',
      style: { minWidth: 130, padding: 8 },
    });
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
  };

  if (!connected) {
    return <ConnectPage onConnected={() => { setConnected(true); load(); }} />;
  }

  if (loading && !overview) return <div className="loading">Loading your AWS map...</div>;

  const s = overview?.summary;

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Cloud Atlas</h1>
          <span>Account {overview?.account_id} · {overview?.region} · {overview?.scanned_at?.slice(0, 19)}</span>
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
            <div className="stat"><div className="label">Resources</div><div className="value">{s?.total_resources}</div></div>
            <div className="stat critical"><div className="label">Public</div><div className="value">{s?.public_resources}</div></div>
            <div className="stat"><div className="label">Terraform</div><div className="value">{s?.managed_by_terraform}</div></div>
            <div className="stat warn"><div className="label">Unmanaged</div><div className="value">{s?.unmanaged}</div></div>
          </div>

          <h2 className="sidebar-title">Questions</h2>
          {overview?.questions.map((q) => (
            <div key={q.question} className="card">
              <h3>{q.question}</h3>
              <p>{q.answer}</p>
            </div>
          ))}

          <h2 className="sidebar-title">Alerts</h2>
          {overview?.alerts.slice(0, 8).map((a, i) => (
            <div key={i} className={`alert ${a.severity === 'medium' ? 'medium' : a.severity === 'info' ? 'info' : ''}`}>
              <strong>{a.title}</strong>
              <div className="alert-detail">{a.detail}</div>
            </div>
          ))}
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
            fitView
            minZoom={0.3}
            maxZoom={2}
          >
            <Background color="#334155" gap={20} />
            <Controls />
            <MiniMap nodeColor={(n) => (n.className?.includes('risk') ? '#ef4444' : '#3b82f6')} />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
