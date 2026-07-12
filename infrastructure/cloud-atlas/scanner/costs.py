"""Attach month-to-date AWS costs to scanned resources via Cost Explorer."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from scanner.models import NodeType, ResourceNode, ScanSnapshot

SKIP_TYPES = {NodeType.ACCOUNT, NodeType.REGION}

# Cost Explorer API is global; endpoint lives in us-east-1.
CE_REGION = "us-east-1"


def _month_to_date_period() -> tuple[str, str, str]:
    today = datetime.now(timezone.utc).date()
    start = today.replace(day=1)
    end = today + timedelta(days=1)
    label = start.strftime("%b %Y") + " MTD"
    return start.isoformat(), end.isoformat(), label


def _parse_amount(raw: str | None) -> float:
    if not raw:
        return 0.0
    try:
        return max(float(raw), 0.0)
    except ValueError:
        return 0.0


def _lookup_keys(node: ResourceNode) -> set[str]:
    keys: set[str] = set()
    for value in (node.id, node.name, node.arn):
        if not value:
            continue
        keys.add(value)
        keys.add(value.lower())
        if value.startswith("s3:"):
            keys.add(value[3:])
            keys.add(value[3:].lower())
        if value.startswith("arn:"):
            keys.add(value.split("/")[-1])
            keys.add(value.split(":")[-1])
    return {k for k in keys if k}


class CostAttributor:
    def attribute(self, snapshot: ScanSnapshot, session: boto3.Session) -> dict:
        start, end, label = _month_to_date_period()
        report: dict = {
            "cost_available": False,
            "cost_period_label": label,
            "cost_period_start": start,
            "cost_period_end": end,
            "account_monthly_cost_usd": None,
            "resource_cost_entries": 0,
        }

        try:
            ce = session.client("ce", region_name=CE_REGION)
        except (BotoCoreError, ClientError) as exc:
            report["cost_error"] = str(exc)
            return report

        account_total = self._fetch_account_total(ce, start, end)
        if account_total is not None:
            report["account_monthly_cost_usd"] = round(account_total, 2)

        resource_costs = self._fetch_resource_costs(ce, start, end)
        report["resource_cost_entries"] = len(resource_costs)
        report["cost_available"] = account_total is not None or bool(resource_costs)

        matched = 0
        for node in snapshot.nodes:
            if node.type in SKIP_TYPES:
                continue
            cost = self._match_cost(node, resource_costs)
            if cost is not None:
                node.monthly_cost_usd = round(cost, 4)
                matched += 1

        report["resources_with_cost"] = matched
        return report

    def _fetch_account_total(self, ce, start: str, end: str) -> float | None:
        try:
            resp = ce.get_cost_and_usage(
                TimePeriod={"Start": start, "End": end},
                Granularity="MONTHLY",
                Metrics=["UnblendedCost"],
            )
        except ClientError:
            return None

        total = 0.0
        for block in resp.get("ResultsByTime", []):
            amount = block.get("Total", {}).get("UnblendedCost", {}).get("Amount")
            total += _parse_amount(amount)
        return total

    def _fetch_resource_costs(self, ce, start: str, end: str) -> dict[str, float]:
        costs: dict[str, float] = {}
        token: str | None = None

        while True:
            params: dict = {
                "TimePeriod": {"Start": start, "End": end},
                "Granularity": "MONTHLY",
                "Metrics": ["UnblendedCost"],
            }
            if token:
                params["NextPageToken"] = token
            try:
                resp = ce.get_cost_and_usage_with_resources(**params)
            except ClientError:
                break

            for block in resp.get("ResultsByTime", []):
                for group in block.get("Groups", []):
                    keys = group.get("Keys") or []
                    if not keys:
                        continue
                    resource_id = keys[0]
                    amount = _parse_amount(group.get("Metrics", {}).get("UnblendedCost", {}).get("Amount"))
                    if amount <= 0:
                        continue
                    costs[resource_id] = costs.get(resource_id, 0.0) + amount
                    costs[resource_id.lower()] = costs[resource_id]

            token = resp.get("NextPageToken")
            if not token:
                break

        return costs

    def _match_cost(self, node: ResourceNode, costs: dict[str, float]) -> float | None:
        for key in _lookup_keys(node):
            if key in costs:
                return costs[key]
        return None
