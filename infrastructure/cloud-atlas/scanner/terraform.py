"""Load Terraform state from S3 and correlate with live AWS resources."""

from __future__ import annotations

import json
import os
import re
from typing import Any

import boto3
from botocore.exceptions import ClientError

from scanner.models import ScanSnapshot


class TerraformStateLoader:
    def __init__(self, bucket: str | None = None, key: str | None = None, region: str | None = None, profile: str | None = None):
        self.bucket = bucket or os.getenv("TF_STATE_BUCKET", "")
        self.key = key or os.getenv("TF_STATE_KEY", "")
        self.region = region or os.getenv("TF_STATE_REGION", os.getenv("AWS_REGION", "eu-central-1"))
        session_kwargs: dict[str, Any] = {"region_name": self.region}
        if profile or os.getenv("AWS_PROFILE"):
            session_kwargs["profile_name"] = profile or os.getenv("AWS_PROFILE")
        self.session = boto3.Session(**session_kwargs)

    def load(self) -> dict[str, Any] | None:
        if not self.bucket or not self.key:
            return None
        s3 = self.session.client("s3")
        try:
            obj = s3.get_object(Bucket=self.bucket, Key=self.key)
            return json.loads(obj["Body"].read())
        except ClientError:
            return None

    def extract_managed_resources(self, state: dict[str, Any]) -> list[dict[str, Any]]:
        managed = []
        for resource in state.get("resources", []):
            module = resource.get("module", "root")
            rtype = resource.get("type", "")
            name = resource.get("name", "")
            for instance in resource.get("instances", []):
                attrs = instance.get("attributes", {}) or {}
                managed.append({
                    "module": module,
                    "type": rtype,
                    "name": name,
                    "address": f"{module}.{rtype}.{name}" if module != "root" else f"{rtype}.{name}",
                    "id": attrs.get("id") or attrs.get("arn") or attrs.get("name"),
                    "arn": attrs.get("arn"),
                    "attributes": attrs,
                })
        return managed


class TerraformCorrelator:
    """Tag live nodes as managed, drifted, or unmanaged."""

    TF_TYPE_MAP = {
        "aws_vpc": "vpc",
        "aws_subnet": "subnet",
        "aws_internet_gateway": "internet_gateway",
        "aws_nat_gateway": "nat_gateway",
        "aws_security_group": "security_group",
        "aws_db_instance": "rds",
        "aws_elasticache_cluster": "elasticache",
        "aws_mq_broker": "mq",
        "aws_eks_cluster": "eks_cluster",
        "aws_eks_node_group": "eks_nodegroup",
        "aws_ecr_repository": "ecr",
        "aws_s3_bucket": "s3",
        "aws_lb": "alb",
        "aws_cloudfront_distribution": "cloudfront",
        "aws_route53_zone": "route53_zone",
        "aws_iam_role": "iam_role",
    }

    def correlate(self, snapshot: ScanSnapshot, state: dict[str, Any] | None) -> dict[str, Any]:
        if not state:
            for node in snapshot.nodes:
                node.metadata["terraform_status"] = "unknown"
            return self._build_report(snapshot, [])

        managed = TerraformStateLoader().extract_managed_resources(state)
        managed_ids = set()
        managed_by_id: dict[str, dict] = {}

        for m in managed:
            for candidate in self._id_candidates(m):
                managed_ids.add(candidate)
                managed_by_id[candidate] = m

        for node in snapshot.nodes:
            matched = self._match_node(node, managed_ids, managed_by_id)
            if matched:
                node.metadata["terraform_status"] = "managed"
                node.metadata["terraform_module"] = matched["module"]
                node.metadata["terraform_address"] = matched["address"]
                node.metadata["terraform_type"] = matched["type"]
            else:
                node.metadata["terraform_status"] = "unmanaged"

        return self._build_report(snapshot, managed)

    def _id_candidates(self, managed: dict[str, Any]) -> list[str]:
        attrs = managed.get("attributes", {})
        candidates = []
        for key in ("id", "arn", "name", "bucket", "cluster_id", "repository_name", "broker_id"):
            val = attrs.get(key) or managed.get(key)
            if val:
                candidates.append(str(val))
                if key == "bucket":
                    candidates.append(f"s3:{val}")
                if key == "repository_name":
                    candidates.append(str(val))
        return candidates

    def _match_node(self, node, managed_ids: set, managed_by_id: dict) -> dict | None:
        candidates = [node.id, node.arn, node.name]
        if node.type.value == "s3":
            candidates.append(node.id.replace("s3:", ""))
        for c in candidates:
            if c and c in managed_ids:
                return managed_by_id[c]
        for mid, m in managed_by_id.items():
            if node.arn and node.arn == mid:
                return m
            if node.name and node.name in mid:
                return m
        return None

    def _build_report(self, snapshot: ScanSnapshot, managed: list) -> dict[str, Any]:
        live_ids = {n.id for n in snapshot.nodes}
        ghosts = []
        for m in managed:
            found = any(m.get("id") in live_ids or (m.get("arn") and m.get("arn") in {n.arn for n in snapshot.nodes}) for _ in [0])
            if not found and m.get("id"):
                ghosts.append(m)

        modules: dict[str, int] = {}
        for n in snapshot.nodes:
            mod = n.metadata.get("terraform_module")
            if mod:
                modules[mod] = modules.get(mod, 0) + 1

        return {
            "managed_count": sum(1 for n in snapshot.nodes if n.metadata.get("terraform_status") == "managed"),
            "unmanaged_count": sum(1 for n in snapshot.nodes if n.metadata.get("terraform_status") == "unmanaged"),
            "ghost_count": len(ghosts),
            "modules": modules,
            "ghosts": [{"address": g["address"], "type": g["type"]} for g in ghosts[:20]],
        }
