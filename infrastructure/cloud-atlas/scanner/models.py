"""Shared models for nodes, edges, and scan snapshots."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class NodeType(str, Enum):
    ACCOUNT = "account"
    REGION = "region"
    VPC = "vpc"
    SUBNET = "subnet"
    INTERNET_GATEWAY = "internet_gateway"
    NAT_GATEWAY = "nat_gateway"
    SECURITY_GROUP = "security_group"
    EC2_INSTANCE = "ec2_instance"
    RDS = "rds"
    ELASTICACHE = "elasticache"
    MQ = "mq"
    EKS_CLUSTER = "eks_cluster"
    EKS_NODEGROUP = "eks_nodegroup"
    ECR = "ecr"
    S3 = "s3"
    ALB = "alb"
    CLOUDFRONT = "cloudfront"
    ROUTE53_ZONE = "route53_zone"
    IAM_ROLE = "iam_role"
    UNKNOWN = "unknown"


class EdgeType(str, Enum):
    CONTAINS = "contains"
    ATTACHED_TO = "attached_to"
    ROUTES_TO = "routes_to"
    ALLOWS = "allows"
    USES = "uses"
    DEPENDS_ON = "depends_on"


class ResourceNode(BaseModel):
    id: str
    type: NodeType
    name: str
    region: str | None = None
    arn: str | None = None
    tags: dict[str, str] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)
    public: bool = False
    monthly_cost_usd: float | None = None


class ResourceEdge(BaseModel):
    id: str
    source: str
    target: str
    type: EdgeType
    label: str | None = None


class ScanSnapshot(BaseModel):
    scanned_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    account_id: str
    region: str
    nodes: list[ResourceNode] = Field(default_factory=list)
    edges: list[ResourceEdge] = Field(default_factory=list)

    def add_node(self, node: ResourceNode) -> None:
        if not any(n.id == node.id for n in self.nodes):
            self.nodes.append(node)

    def add_edge(self, edge: ResourceEdge) -> None:
        if not any(e.id == edge.id for e in self.edges):
            self.edges.append(edge)

    def link(self, source: str, target: str, edge_type: EdgeType, label: str | None = None) -> None:
        self.add_edge(ResourceEdge(
            id=f"{source}->{target}:{edge_type.value}",
            source=source,
            target=target,
            type=edge_type,
            label=label,
        ))
