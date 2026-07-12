"""Graph traversal helpers for dependency and impact analysis."""

from __future__ import annotations

from collections import defaultdict, deque

from scanner.models import ScanSnapshot


class GraphEngine:
    def __init__(self, snapshot: ScanSnapshot):
        self.snapshot = snapshot
        self._children: dict[str, list[str]] = defaultdict(list)
        self._parents: dict[str, list[str]] = defaultdict(list)
        for edge in snapshot.edges:
            self._children[edge.source].append(edge.target)
            self._parents[edge.target].append(edge.source)

    def descendants(self, node_id: str) -> set[str]:
        seen: set[str] = set()
        queue: deque[str] = deque(self._children.get(node_id, []))
        while queue:
            current = queue.popleft()
            if current in seen:
                continue
            seen.add(current)
            queue.extend(self._children.get(current, []))
        return seen

    def ancestors(self, node_id: str) -> set[str]:
        seen: set[str] = set()
        queue: deque[str] = deque(self._parents.get(node_id, []))
        while queue:
            current = queue.popleft()
            if current in seen:
                continue
            seen.add(current)
            queue.extend(self._parents.get(current, []))
        return seen

    def delete_impact(self, node_id: str) -> dict:
        desc = self.descendants(node_id)
        node = next((n for n in self.snapshot.nodes if n.id == node_id), None)
        return {
            "resource": node.model_dump() if node else None,
            "affected_count": len(desc),
            "affected_ids": list(desc)[:50],
        }

    def nodes_by_type(self) -> dict[str, list]:
        grouped: dict[str, list] = defaultdict(list)
        for node in self.snapshot.nodes:
            grouped[node.type.value].append(node.model_dump())
        return dict(grouped)

    def vpc_layout(self, vpc_id: str) -> dict:
        vpc_node = next((n for n in self.snapshot.nodes if n.id == vpc_id), None)
        if not vpc_node:
            return {}
        subnets = [n for n in self.snapshot.nodes if n.type.value == "subnet"
                   and n.metadata.get("vpc_id") == vpc_id or n.id in self.descendants(vpc_id)]
        # subnets linked via contains edge from vpc
        subnets = [n for n in self.snapshot.nodes if n.type.value == "subnet"
                   and vpc_id in self._parents.get(n.id, [])]
        sgs = [n for n in self.snapshot.nodes if n.type.value == "security_group"
               and vpc_id in self._parents.get(n.id, [])]
        return {
            "vpc": vpc_node.model_dump(),
            "subnets": [s.model_dump() for s in subnets],
            "security_groups": [s.model_dump() for s in sgs],
            "public_subnets": [s.id for s in subnets if s.metadata.get("public")],
            "private_subnets": [s.id for s in subnets if not s.metadata.get("public")],
        }
