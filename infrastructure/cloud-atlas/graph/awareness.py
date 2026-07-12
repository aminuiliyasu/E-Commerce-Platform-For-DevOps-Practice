"""Answer-first awareness rules — the questions engineers actually ask."""

from __future__ import annotations

from scanner.models import NodeType, ResourceNode, ScanSnapshot


class AwarenessEngine:
    SEVERITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}

    def analyze(self, snapshot: ScanSnapshot, tf_report: dict | None = None, cost_report: dict | None = None) -> dict:
        alerts = []
        alerts.extend(self._public_exposure(snapshot))
        alerts.extend(self._terraform_gaps(snapshot, tf_report or {}))
        alerts.extend(self._delete_impact(snapshot))
        alerts.extend(self._traffic_flow(snapshot))
        alerts.sort(key=lambda a: self.SEVERITY_ORDER.get(a["severity"], 9))

        node_by_id = {n.id: n for n in snapshot.nodes}
        for alert in alerts:
            rid = alert.get("resource_id")
            if rid and rid in node_by_id:
                alert["monthly_cost_usd"] = node_by_id[rid].monthly_cost_usd

        return {
            "summary": self._summary(snapshot, tf_report or {}, alerts, cost_report or {}),
            "alerts": alerts,
            "questions": self._question_cards(snapshot, tf_report or {}, alerts, cost_report or {}),
        }

    def _billable_nodes(self, snapshot: ScanSnapshot) -> list[ResourceNode]:
        return [n for n in snapshot.nodes if n.type not in (NodeType.ACCOUNT, NodeType.REGION)]

    def _sum_cost(self, nodes: list[ResourceNode]) -> float:
        return round(sum(n.monthly_cost_usd or 0 for n in nodes), 2)

    def _summary(self, snapshot: ScanSnapshot, tf_report: dict, alerts: list, cost_report: dict) -> dict:
        billable = self._billable_nodes(snapshot)
        public = [n for n in billable if n.public]
        managed = [n for n in billable if n.metadata.get("terraform_status") == "managed"]
        unmanaged = [n for n in billable if n.metadata.get("terraform_status") == "unmanaged"]
        attributed = self._sum_cost(billable)

        return {
            "total_resources": len(snapshot.nodes),
            "public_resources": sum(1 for n in snapshot.nodes if n.public),
            "managed_by_terraform": tf_report.get("managed_count", 0),
            "unmanaged": tf_report.get("unmanaged_count", 0),
            "ghost_in_state": tf_report.get("ghost_count", 0),
            "alert_count": len(alerts),
            "critical_count": sum(1 for a in alerts if a["severity"] == "critical"),
            "total_monthly_cost_usd": attributed,
            "public_monthly_cost_usd": self._sum_cost(public),
            "managed_monthly_cost_usd": self._sum_cost(managed),
            "unmanaged_monthly_cost_usd": self._sum_cost(unmanaged),
            "account_monthly_cost_usd": cost_report.get("account_monthly_cost_usd"),
            "cost_available": cost_report.get("cost_available", False),
            "cost_period_label": cost_report.get("cost_period_label", "This month"),
        }

    def _public_exposure(self, snapshot: ScanSnapshot) -> list[dict]:
        alerts = []
        for node in snapshot.nodes:
            if node.type == NodeType.SECURITY_GROUP and node.public:
                alerts.append({
                    "severity": "critical",
                    "category": "security",
                    "title": f"Security group {node.name} allows public ingress",
                    "detail": "Ingress rules include 0.0.0.0/0 or ::/0",
                    "resource_id": node.id,
                    "question": "What is public?",
                })
            if node.type == NodeType.S3 and node.public:
                alerts.append({
                    "severity": "critical",
                    "category": "security",
                    "title": f"S3 bucket {node.name} is public",
                    "detail": "Bucket policy grants public access",
                    "resource_id": node.id,
                    "question": "What is public?",
                })
            if node.type == NodeType.RDS and node.public:
                alerts.append({
                    "severity": "critical",
                    "category": "security",
                    "title": f"RDS {node.name} is publicly accessible",
                    "detail": "Database has PubliclyAccessible=true",
                    "resource_id": node.id,
                    "question": "What is public?",
                })
            if node.type == NodeType.ALB and node.public:
                alerts.append({
                    "severity": "info",
                    "category": "network",
                    "title": f"ALB {node.name} is internet-facing",
                    "detail": node.metadata.get("dns", ""),
                    "resource_id": node.id,
                    "question": "How does traffic flow?",
                })
        return alerts

    def _terraform_gaps(self, snapshot: ScanSnapshot, tf_report: dict) -> list[dict]:
        alerts = []
        unmanaged = [n for n in snapshot.nodes if n.metadata.get("terraform_status") == "unmanaged"
                     and n.type not in (NodeType.ACCOUNT, NodeType.REGION)]
        if unmanaged:
            alerts.append({
                "severity": "medium",
                "category": "terraform",
                "title": f"{len(unmanaged)} live resources not in Terraform state",
                "detail": ", ".join(n.name for n in unmanaged[:5]) + ("..." if len(unmanaged) > 5 else ""),
                "resource_id": None,
                "question": "Which resources aren't managed by Terraform?",
            })
        if tf_report.get("ghost_count", 0) > 0:
            alerts.append({
                "severity": "high",
                "category": "terraform",
                "title": f"{tf_report['ghost_count']} resources in state but missing from AWS",
                "detail": "Possible manual deletion or drift",
                "resource_id": None,
                "question": "Which resources aren't managed by Terraform?",
            })
        return alerts

    def _delete_impact(self, snapshot: ScanSnapshot) -> list[dict]:
        alerts = []
        edge_map: dict[str, list[str]] = {}
        for edge in snapshot.edges:
            edge_map.setdefault(edge.target, []).append(edge.source)

        critical_types = {NodeType.NAT_GATEWAY, NodeType.RDS, NodeType.EKS_CLUSTER, NodeType.VPC}
        for node in snapshot.nodes:
            if node.type not in critical_types:
                continue
            dependents = edge_map.get(node.id, [])
            if dependents or node.type in (NodeType.NAT_GATEWAY, NodeType.VPC):
                impact = self._describe_delete_impact(node)
                alerts.append({
                    "severity": "high" if node.type in (NodeType.VPC, NodeType.NAT_GATEWAY) else "medium",
                    "category": "dependency",
                    "title": f"Deleting {node.name} would cause significant impact",
                    "detail": impact,
                    "resource_id": node.id,
                    "question": "What could break if I delete this?",
                })
        return alerts

    def _describe_delete_impact(self, node: ResourceNode) -> str:
        if node.type == NodeType.NAT_GATEWAY:
            return "Private subnet workloads lose outbound internet access"
        if node.type == NodeType.VPC:
            return "All subnets, security groups, and attached resources would be destroyed"
        if node.type == NodeType.RDS:
            return "Applications using this database would fail; data may be lost without snapshots"
        if node.type == NodeType.EKS_CLUSTER:
            return "All running workloads, ingress, and services would stop"
        return "Downstream resources may fail"

    def _traffic_flow(self, snapshot: ScanSnapshot) -> list[dict]:
        cf = [n for n in snapshot.nodes if n.type == NodeType.CLOUDFRONT]
        alb = [n for n in snapshot.nodes if n.type == NodeType.ALB]
        eks = [n for n in snapshot.nodes if n.type == NodeType.EKS_CLUSTER]
        if cf or alb or eks:
            path = " → ".join(
                [n.name for n in (*cf, *alb, *eks)]
            )
            return [{
                "severity": "info",
                "category": "traffic",
                "title": "Traffic flow path detected",
                "detail": path or "Internet → ALB → EKS",
                "resource_id": None,
                "question": "How does traffic flow?",
            }]
        return []

    def _question_cards(self, snapshot: ScanSnapshot, tf_report: dict, alerts: list, cost_report: dict) -> list[dict]:
        by_question: dict[str, list] = {}
        for alert in alerts:
            q = alert.get("question", "General")
            by_question.setdefault(q, []).append(alert)

        by_type: dict[str, list] = {}
        for node in snapshot.nodes:
            by_type.setdefault(node.type.value, []).append(self._resource_row(node))

        public_nodes = [self._resource_row(n) for n in snapshot.nodes if n.public]
        unmanaged_nodes = [
            self._resource_row(n) for n in snapshot.nodes
            if n.metadata.get("terraform_status") == "unmanaged"
            and n.type not in (NodeType.ACCOUNT, NodeType.REGION)
        ]
        managed_nodes = [
            self._resource_row(n) for n in snapshot.nodes
            if n.metadata.get("terraform_status") == "managed"
        ]
        delete_alerts = by_question.get("What could break if I delete this?", [])

        own_resources = [self._resource_row(n) for n in snapshot.nodes if n.type not in (NodeType.ACCOUNT, NodeType.REGION)]
        delete_resources = [
            self._resource_row(n) for n in snapshot.nodes
            if n.id in {a.get("resource_id") for a in delete_alerts if a.get("resource_id")}
        ]
        traffic_resources = [
            self._resource_row(n) for n in snapshot.nodes
            if n.type in (NodeType.CLOUDFRONT, NodeType.ALB, NodeType.EKS_CLUSTER, NodeType.INTERNET_GATEWAY)
        ]

        cards = [
            {
                "id": "own",
                "question": "What do I own?",
                "answer": f"{len(snapshot.nodes)} resources across {len(by_type)} types",
                "count": len(snapshot.nodes),
                "monthly_cost_usd": self._sum_cost(self._billable_nodes(snapshot)),
                "resources": own_resources,
                "by_type": by_type,
            },
            {
                "id": "public",
                "question": "What is public?",
                "answer": f"{len(public_nodes)} publicly exposed resources",
                "count": len(public_nodes),
                "monthly_cost_usd": self._sum_cost([n for n in snapshot.nodes if n.public and n.type not in (NodeType.ACCOUNT, NodeType.REGION)]),
                "resources": public_nodes,
                "alerts": by_question.get("What is public?", []),
            },
            {
                "id": "terraform",
                "question": "Which resources aren't managed by Terraform?",
                "answer": f"{tf_report.get('unmanaged_count', 0)} unmanaged, {tf_report.get('ghost_count', 0)} ghosts in state",
                "count": tf_report.get("unmanaged_count", 0),
                "monthly_cost_usd": self._sum_cost([
                    n for n in snapshot.nodes
                    if n.metadata.get("terraform_status") == "unmanaged"
                    and n.type not in (NodeType.ACCOUNT, NodeType.REGION)
                ]),
                "resources": unmanaged_nodes,
                "managed_resources": managed_nodes,
                "ghosts": tf_report.get("ghosts", []),
                "alerts": by_question.get("Which resources aren't managed by Terraform?", []),
            },
            {
                "id": "delete",
                "question": "What could break if I delete this?",
                "answer": f"{len(delete_alerts)} high-impact resources",
                "count": len(delete_alerts),
                "monthly_cost_usd": self._sum_cost([
                    n for n in snapshot.nodes
                    if n.id in {a.get("resource_id") for a in delete_alerts if a.get("resource_id")}
                ]),
                "resources": delete_resources,
                "alerts": delete_alerts,
            },
            {
                "id": "traffic",
                "question": "How does traffic flow?",
                "answer": "Internet-facing path through your load balancers and clusters",
                "monthly_cost_usd": self._sum_cost([
                    n for n in snapshot.nodes
                    if n.type in (NodeType.CLOUDFRONT, NodeType.ALB, NodeType.EKS_CLUSTER, NodeType.INTERNET_GATEWAY)
                ]),
                "resources": traffic_resources,
                "alerts": by_question.get("How does traffic flow?", []),
            },
            {
                "id": "modules",
                "question": "Which Terraform module created this?",
                "answer": f"{len(tf_report.get('modules', {}))} modules detected in state",
                "monthly_cost_usd": self._sum_cost([
                    n for n in snapshot.nodes if n.metadata.get("terraform_status") == "managed"
                ]),
                "modules": tf_report.get("modules", {}),
                "resources": managed_nodes,
            },
        ]
        return cards

    def _resource_row(self, node: ResourceNode) -> dict:
        return {
            "id": node.id,
            "type": node.type.value,
            "name": node.name,
            "region": node.region,
            "public": node.public,
            "arn": node.arn,
            "monthly_cost_usd": node.monthly_cost_usd,
            "metadata": node.metadata,
            "tags": node.tags,
        }
