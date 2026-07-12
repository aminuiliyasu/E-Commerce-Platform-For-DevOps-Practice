import { Alert, GraphData, QuestionCard, ResourceNode } from './api';
import { DetailView, formatCost, formatType, getChildren, getParents, getResourceStatus, groupByType, statusTone, sumCosts, TYPE_ICON } from './inventory';

interface Props {
  view: DetailView;
  graph: GraphData;
  onClose: () => void;
  onSelectResource: (r: ResourceNode) => void;
  embedded?: boolean;
  costPeriodLabel?: string;
}

function ResourceRow({
  resource,
  onClick,
  compact,
}: {
  resource: ResourceNode;
  onClick: () => void;
  compact?: boolean;
}) {
  const tf = resource.metadata?.terraform_status as string | undefined;
  const status = getResourceStatus(resource);
  const statusKind = status ? statusTone(status) : null;
  return (
    <button type="button" className="resource-row" onClick={onClick}>
      <span className="resource-icon">{TYPE_ICON[resource.type] ?? '◆'}</span>
      <div className="resource-info">
        <div className="resource-name">{resource.name}</div>
        {!compact && <div className="resource-id">{resource.id}</div>}
        <div className="resource-badges">
          <span className="badge badge-type">{formatType(resource.type)}</span>
          {status && statusKind && (
            <span className={`badge badge-status badge-status-${statusKind}`}>{status}</span>
          )}
          {resource.public && <span className="badge badge-public">public</span>}
          {tf && tf !== 'unknown' && (
            <span className={`badge badge-${tf}`}>{tf}</span>
          )}
          {resource.metadata?.terraform_module != null && (
            <span className="badge badge-module">{String(resource.metadata.terraform_module)}</span>
          )}
        </div>
      </div>
      {resource.monthly_cost_usd != null && (
        <span className="resource-cost">{formatCost(resource.monthly_cost_usd)}</span>
      )}
      <span className="resource-chevron">›</span>
    </button>
  );
}

function ResourceList({
  resources,
  onSelectResource,
  costPeriodLabel,
}: {
  resources: ResourceNode[];
  onSelectResource: (r: ResourceNode) => void;
  costPeriodLabel?: string;
}) {
  const grouped = groupByType(resources);
  const types = Object.keys(grouped);
  if (types.length === 0) return <p className="detail-empty">No resources in this category.</p>;

  const listTotal = sumCosts(resources);

  return (
    <div className="resource-groups">
      <div className="detail-cost-banner">
        <span>{costPeriodLabel ?? 'This month'}</span>
        <strong>{formatCost(listTotal)}</strong>
      </div>
      {types.map((type) => {
        const groupResources = grouped[type];
        const groupCost = sumCosts(groupResources);
        return (
          <div key={type} className="resource-group">
            <h4 className="group-title">
              {TYPE_ICON[type] ?? '◆'} {formatType(type)}
              <span className="group-count">{groupResources.length}</span>
              <span className="group-cost">{formatCost(groupCost)}</span>
            </h4>
            {groupResources.map((r) => (
              <ResourceRow key={r.id} resource={r} onClick={() => onSelectResource(r)} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function ResourceDetail({
  resource,
  graph,
  onSelectResource,
  costPeriodLabel,
}: {
  resource: ResourceNode;
  graph: GraphData;
  onSelectResource: (r: ResourceNode) => void;
  costPeriodLabel?: string;
}) {
  const parents = getParents(graph, resource.id);
  const children = getChildren(graph, resource.id);
  const meta = resource.metadata ?? {};
  const status = getResourceStatus(resource);
  const statusKind = status ? statusTone(status) : null;

  return (
    <div className="resource-detail">
      <div className="detail-hero">
        <span className="hero-icon">{TYPE_ICON[resource.type] ?? '◆'}</span>
        <div>
          <h2>{resource.name}</h2>
          <p className="hero-sub">{formatType(resource.type)} · {resource.region ?? 'global'}</p>
          {resource.monthly_cost_usd != null && (
            <p className="hero-cost">{formatCost(resource.monthly_cost_usd)} · {costPeriodLabel ?? 'This month'}</p>
          )}
        </div>
      </div>

      <div className="detail-meta-grid">
        <div className="meta-item"><span>ID</span><code>{resource.id}</code></div>
        {resource.arn && <div className="meta-item"><span>ARN</span><code>{resource.arn}</code></div>}
        <div className="meta-item"><span>Public</span><strong className={resource.public ? 'text-danger' : 'text-ok'}>{resource.public ? 'Yes' : 'No'}</strong></div>
        <div className="meta-item"><span>Cost ({costPeriodLabel ?? 'MTD'})</span><strong className="text-cost">{formatCost(resource.monthly_cost_usd ?? 0)}</strong></div>
        {status && statusKind && (
          <div className="meta-item"><span>Status</span><strong className={statusKind === 'ok' ? 'text-ok' : statusKind === 'bad' ? 'text-danger' : ''}>{status}</strong></div>
        )}
        {meta.terraform_status != null && (
          <div className="meta-item"><span>Terraform</span><strong>{String(meta.terraform_status)}</strong></div>
        )}
        {meta.terraform_module != null && (
          <div className="meta-item"><span>Module</span><strong>{String(meta.terraform_module)}</strong></div>
        )}
        {meta.terraform_address != null && (
          <div className="meta-item"><span>Address</span><code>{String(meta.terraform_address)}</code></div>
        )}
      </div>

      {Object.keys(meta).length > 0 && (
        <div className="detail-section">
          <h3>Properties</h3>
          <div className="props-list">
            {Object.entries(meta)
              .filter(([k]) => !k.startsWith('terraform_'))
              .map(([k, v]) => (
                <div key={k} className="prop-row">
                  <span>{k.replace(/_/g, ' ')}</span>
                  <code>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</code>
                </div>
              ))}
          </div>
        </div>
      )}

      {parents.length > 0 && (
        <div className="detail-section">
          <h3>Contained in / attached to</h3>
          {parents.map((p) => (
            <ResourceRow key={p.id} resource={p} onClick={() => onSelectResource(p)} compact />
          ))}
        </div>
      )}

      {children.length > 0 && (
        <div className="detail-section">
          <h3>Contains / connected to</h3>
          {children.map((c) => (
            <ResourceRow key={c.id} resource={c} onClick={() => onSelectResource(c)} compact />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DetailPanel({ view, graph, onClose, onSelectResource, embedded, costPeriodLabel }: Props) {
  let title = '';
  let subtitle = '';
  let body: React.ReactNode = null;
  const panelClass = embedded ? 'detail-panel detail-panel-embedded' : 'detail-panel';
  const backLabel = view.kind === 'resource' ? '← Back' : embedded ? '← Back to list' : '← Back to map';

  if (view.kind === 'summary') {
    title = view.title;
    const nodes = graph.nodes.filter((n) => {
      if (n.type === 'account' || n.type === 'region') return false;
      if (view.filter === 'public') return n.public;
      if (view.filter === 'managed') return n.metadata?.terraform_status === 'managed';
      if (view.filter === 'unmanaged') return n.metadata?.terraform_status === 'unmanaged';
      return true;
    });
    subtitle = `${nodes.length} items · ${formatCost(sumCosts(nodes))} ${costPeriodLabel ?? 'MTD'}`;
    body = <ResourceList resources={nodes} onSelectResource={onSelectResource} costPeriodLabel={costPeriodLabel} />;
  }

  if (view.kind === 'question') {
    const card = view.card;
    title = card.question;
    subtitle = `${card.answer}${card.monthly_cost_usd != null ? ` · ${formatCost(card.monthly_cost_usd)} ${costPeriodLabel ?? 'MTD'}` : ''}`;
    const rawResources = card.resources ?? [];
    const resources: ResourceNode[] = rawResources.map((r) => {
      const fromGraph = graph.nodes.find((n) => n.id === r.id);
      return fromGraph ?? ({ ...r, metadata: r.metadata ?? {}, tags: r.tags ?? {} } as ResourceNode);
    });

    body = (
      <>
        {card.modules && Object.keys(card.modules).length > 0 && (
          <div className="detail-section">
            <h3>Terraform modules</h3>
            {Object.entries(card.modules).map(([mod, count]) => (
              <div key={mod} className="module-row">
                <span>{mod}</span>
                <span className="group-count">{count} resources</span>
              </div>
            ))}
          </div>
        )}
        {(card.ghosts?.length ?? 0) > 0 && (
          <div className="detail-section">
            <h3>Ghosts in state (missing from AWS)</h3>
            {card.ghosts!.map((g) => (
              <div key={g.address} className="ghost-row">
                <code>{g.address}</code>
                <span className="badge badge-type">{g.type}</span>
              </div>
            ))}
          </div>
        )}
        {resources.length > 0 ? (
          <ResourceList resources={resources} onSelectResource={onSelectResource} costPeriodLabel={costPeriodLabel} />
        ) : (
          <p className="detail-empty">No resources listed for this question.</p>
        )}
        {card.alerts && card.alerts.length > 0 && (
          <div className="detail-section">
            <h3>Related alerts</h3>
            {card.alerts.map((a, i) => (
              <div key={i} className={`alert alert-${a.severity}`}>
                <strong>{a.title}</strong>
                <div className="alert-detail">{a.detail}</div>
              </div>
            ))}
          </div>
        )}
      </>
    );
  }

  if (view.kind === 'alert') {
    const a = view.alert;
    title = a.title;
    subtitle = a.category + (a.monthly_cost_usd != null && a.monthly_cost_usd > 0 ? ` · ${formatCost(a.monthly_cost_usd)}` : '');
    const resource = a.resource_id ? graph.nodes.find((n) => n.id === a.resource_id) : null;
    body = (
      <>
        <div className={`alert alert-${a.severity} alert-large`}>
          <span className={`severity-pill severity-${a.severity}`}>{a.severity}</span>
          <p>{a.detail}</p>
          {a.question && <p className="alert-q">Related: {a.question}</p>}
        </div>
        {resource && (
          <div className="detail-section">
            <h3>Affected resource</h3>
            <ResourceRow resource={resource} onClick={() => onSelectResource(resource)} />
          </div>
        )}
      </>
    );
  }

  if (view.kind === 'resource') {
    return (
      <div className={panelClass}>
        <div className="detail-header">
          <button type="button" className="back-btn" onClick={onClose}>{backLabel}</button>
        </div>
        <div className="detail-body">
          <ResourceDetail resource={view.resource} graph={graph} onSelectResource={onSelectResource} costPeriodLabel={costPeriodLabel} />
        </div>
      </div>
    );
  }

  return (
    <div className={panelClass}>
      <div className="detail-header">
        <button type="button" className="back-btn" onClick={onClose}>{backLabel}</button>
        <div>
          <h2>{title}</h2>
          {subtitle && <p className="detail-subtitle">{subtitle}</p>}
        </div>
      </div>
      <div className="detail-body">{body}</div>
    </div>
  );
}
