"""Discover AWS resources and build a relationship graph."""

from __future__ import annotations

import os
from typing import Any

import boto3
from botocore.exceptions import ClientError

from scanner.credentials import AwsCredentials, build_session
from scanner.models import EdgeType, NodeType, ResourceNode, ScanSnapshot


def _tags_list_to_dict(tags: list[dict[str, str]] | None) -> dict[str, str]:
    if not tags:
        return {}
    return {t["Key"]: t["Value"] for t in tags if "Key" in t and "Value" in t}


def _is_public_sg(permissions: list[dict]) -> bool:
    for perm in permissions:
        for cidr in perm.get("IpRanges", []):
            if cidr.get("CidrIp") in ("0.0.0.0/0", "::/0"):
                return True
        for cidr in perm.get("Ipv6Ranges", []):
            if cidr.get("CidrIpv6") == "::/0":
                return True
    return False


class AwsScanner:
    def __init__(
        self,
        region: str | None = None,
        profile: str | None = None,
        credentials: AwsCredentials | None = None,
        session: boto3.Session | None = None,
    ):
        self.region = region or (credentials.region if credentials else None) or os.getenv("AWS_REGION", "eu-central-1")
        if session:
            self.session = session
        elif credentials:
            self.session = build_session(credentials)
        else:
            session_kwargs: dict[str, Any] = {"region_name": self.region}
            if profile or os.getenv("AWS_PROFILE"):
                session_kwargs["profile_name"] = profile or os.getenv("AWS_PROFILE")
            self.session = boto3.Session(**session_kwargs)

    def scan(self) -> ScanSnapshot:
        sts = self.session.client("sts")
        account_id = sts.get_caller_identity()["Account"]
        snap = ScanSnapshot(account_id=account_id, region=self.region)

        snap.add_node(ResourceNode(
            id=f"account:{account_id}",
            type=NodeType.ACCOUNT,
            name=account_id,
            region=self.region,
        ))
        snap.add_node(ResourceNode(
            id=f"region:{self.region}",
            type=NodeType.REGION,
            name=self.region,
            region=self.region,
        ))
        snap.link(f"account:{account_id}", f"region:{self.region}", EdgeType.CONTAINS)

        self._scan_vpc(snap)
        self._scan_security_groups(snap)
        self._scan_rds(snap)
        self._scan_elasticache(snap)
        self._scan_mq(snap)
        self._scan_eks(snap)
        self._scan_ecr(snap)
        self._scan_s3(snap)
        self._scan_alb(snap)
        self._scan_cloudfront(snap)
        self._scan_route53(snap)
        self._scan_iam_roles(snap)

        return snap

    def _scan_vpc(self, snap: ScanSnapshot) -> None:
        ec2 = self.session.client("ec2")
        for vpc in ec2.describe_vpcs()["Vpcs"]:
            vpc_id = vpc["VpcId"]
            tags = _tags_list_to_dict(vpc.get("Tags"))
            snap.add_node(ResourceNode(
                id=vpc_id,
                type=NodeType.VPC,
                name=tags.get("Name", vpc_id),
                region=self.region,
                tags=tags,
                metadata={"cidr": vpc.get("CidrBlock")},
            ))
            snap.link(f"region:{self.region}", vpc_id, EdgeType.CONTAINS)

        for subnet in ec2.describe_subnets()["Subnets"]:
            subnet_id = subnet["SubnetId"]
            vpc_id = subnet["VpcId"]
            tags = _tags_list_to_dict(subnet.get("Tags"))
            snap.add_node(ResourceNode(
                id=subnet_id,
                type=NodeType.SUBNET,
                name=tags.get("Name", subnet_id),
                region=self.region,
                tags=tags,
                metadata={
                    "cidr": subnet.get("CidrBlock"),
                    "az": subnet.get("AvailabilityZone"),
                    "public": subnet.get("MapPublicIpOnLaunch", False),
                },
                public=subnet.get("MapPublicIpOnLaunch", False),
            ))
            snap.link(vpc_id, subnet_id, EdgeType.CONTAINS)

        for igw in ec2.describe_internet_gateways()["InternetGateways"]:
            igw_id = igw["InternetGatewayId"]
            tags = _tags_list_to_dict(igw.get("Tags"))
            snap.add_node(ResourceNode(
                id=igw_id,
                type=NodeType.INTERNET_GATEWAY,
                name=tags.get("Name", igw_id),
                region=self.region,
                tags=tags,
                public=True,
            ))
            for attachment in igw.get("Attachments", []):
                snap.link(attachment["VpcId"], igw_id, EdgeType.ROUTES_TO, "internet")

        for nat in ec2.describe_nat_gateways(Filter=[{"Name": "state", "Values": ["available"]}])["NatGateways"]:
            nat_id = nat["NatGatewayId"]
            tags = _tags_list_to_dict(nat.get("Tags"))
            snap.add_node(ResourceNode(
                id=nat_id,
                type=NodeType.NAT_GATEWAY,
                name=tags.get("Name", nat_id),
                region=self.region,
                tags=tags,
                metadata={"subnet": nat.get("SubnetId"), "status": nat.get("State")},
            ))
            if nat.get("VpcId"):
                snap.link(nat["VpcId"], nat_id, EdgeType.CONTAINS)
            if nat.get("SubnetId"):
                snap.link(nat_id, nat["SubnetId"], EdgeType.ATTACHED_TO)

    def _scan_security_groups(self, snap: ScanSnapshot) -> None:
        ec2 = self.session.client("ec2")
        for sg in ec2.describe_security_groups()["SecurityGroups"]:
            sg_id = sg["GroupId"]
            tags = _tags_list_to_dict(sg.get("Tags"))
            ingress_public = _is_public_sg(sg.get("IpPermissions", []))
            snap.add_node(ResourceNode(
                id=sg_id,
                type=NodeType.SECURITY_GROUP,
                name=sg.get("GroupName", sg_id),
                region=self.region,
                tags=tags,
                metadata={
                    "vpc_id": sg.get("VpcId"),
                    "ingress_rules": len(sg.get("IpPermissions", [])),
                    "egress_rules": len(sg.get("IpPermissionsEgress", [])),
                },
                public=ingress_public,
            ))
            if sg.get("VpcId"):
                snap.link(sg["VpcId"], sg_id, EdgeType.CONTAINS)

    def _scan_rds(self, snap: ScanSnapshot) -> None:
        rds = self.session.client("rds")
        try:
            instances = rds.describe_db_instances()["DBInstances"]
        except ClientError:
            return
        for db in instances:
            db_id = db["DBInstanceIdentifier"]
            arn = db.get("DBInstanceArn")
            tags = _tags_list_to_dict(rds.list_tags_for_resource(ResourceName=arn).get("TagList"))
            snap.add_node(ResourceNode(
                id=db_id,
                type=NodeType.RDS,
                name=tags.get("Name", db_id),
                region=self.region,
                arn=arn,
                tags=tags,
                metadata={
                    "engine": db.get("Engine"),
                    "class": db.get("DBInstanceClass"),
                    "multi_az": db.get("MultiAZ"),
                    "public": db.get("PubliclyAccessible"),
                    "status": db.get("DBInstanceStatus"),
                },
                public=db.get("PubliclyAccessible", False),
            ))
            for sg in db.get("VpcSecurityGroups", []):
                snap.link(db_id, sg["VpcSecurityGroupId"], EdgeType.USES, "db-sg")

    def _scan_elasticache(self, snap: ScanSnapshot) -> None:
        client = self.session.client("elasticache")
        try:
            clusters = client.describe_cache_clusters()["CacheClusters"]
        except ClientError:
            return
        for cluster in clusters:
            cid = cluster["CacheClusterId"]
            snap.add_node(ResourceNode(
                id=cid,
                type=NodeType.ELASTICACHE,
                name=cid,
                region=self.region,
                metadata={"engine": cluster.get("Engine"), "node_type": cluster.get("CacheNodeType"), "status": cluster.get("CacheClusterStatus")},
            ))

    def _scan_mq(self, snap: ScanSnapshot) -> None:
        client = self.session.client("mq")
        try:
            brokers = client.list_brokers().get("BrokerSummaries", [])
        except ClientError:
            return
        for broker in brokers:
            bid = broker["BrokerId"]
            snap.add_node(ResourceNode(
                id=bid,
                type=NodeType.MQ,
                name=broker.get("BrokerName", bid),
                region=self.region,
                metadata={"engine": broker.get("EngineType"), "state": broker.get("BrokerState")},
            ))

    def _scan_eks(self, snap: ScanSnapshot) -> None:
        eks = self.session.client("eks")
        try:
            clusters = eks.list_clusters().get("clusters", [])
        except ClientError:
            return
        for name in clusters:
            detail = eks.describe_cluster(name=name)["cluster"]
            arn = detail["arn"]
            tags = detail.get("tags") or {}
            snap.add_node(ResourceNode(
                id=name,
                type=NodeType.EKS_CLUSTER,
                name=name,
                region=self.region,
                arn=arn,
                tags=tags,
                metadata={"version": detail.get("version"), "status": detail.get("status")},
            ))
            for ng in eks.list_nodegroups(clusterName=name).get("nodegroups", []):
                ng_detail = eks.describe_nodegroup(clusterName=name, nodegroupName=ng)["nodegroup"]
                snap.add_node(ResourceNode(
                    id=ng,
                    type=NodeType.EKS_NODEGROUP,
                    name=ng,
                    region=self.region,
                    metadata={"desired": ng_detail.get("scalingConfig", {}).get("desiredSize"), "status": ng_detail.get("status")},
                ))
                snap.link(name, ng, EdgeType.CONTAINS)

    def _scan_ecr(self, snap: ScanSnapshot) -> None:
        ecr = self.session.client("ecr")
        try:
            repos = ecr.describe_repositories().get("repositories", [])
        except ClientError:
            return
        for repo in repos:
            name = repo["repositoryName"]
            snap.add_node(ResourceNode(
                id=name,
                type=NodeType.ECR,
                name=name,
                region=self.region,
                arn=repo.get("repositoryArn"),
            ))

    def _scan_s3(self, snap: ScanSnapshot) -> None:
        s3 = self.session.client("s3")
        try:
            buckets = s3.list_buckets().get("Buckets", [])
        except ClientError:
            return
        for bucket in buckets:
            name = bucket["Name"]
            public = False
            try:
                policy_status = s3.get_bucket_policy_status(Bucket=name)
                public = policy_status.get("PolicyStatus", {}).get("IsPublic", False)
            except ClientError:
                pass
            snap.add_node(ResourceNode(
                id=f"s3:{name}",
                type=NodeType.S3,
                name=name,
                region=self.region,
                public=public,
            ))

    def _scan_alb(self, snap: ScanSnapshot) -> None:
        elbv2 = self.session.client("elbv2")
        try:
            lbs = elbv2.describe_load_balancers().get("LoadBalancers", [])
        except ClientError:
            return
        for lb in lbs:
            lb_arn = lb["LoadBalancerArn"]
            lb_id = lb_arn.split("/")[-1]
            snap.add_node(ResourceNode(
                id=lb_id,
                type=NodeType.ALB,
                name=lb.get("LoadBalancerName", lb_id),
                region=self.region,
                arn=lb_arn,
                metadata={"scheme": lb.get("Scheme"), "dns": lb.get("DNSName"), "status": lb.get("State", {}).get("Code")},
                public=lb.get("Scheme") == "internet-facing",
            ))
            for az in lb.get("AvailabilityZones", []):
                if az.get("SubnetId"):
                    snap.link(lb_id, az["SubnetId"], EdgeType.ATTACHED_TO)

    def _scan_cloudfront(self, snap: ScanSnapshot) -> None:
        cf = self.session.client("cloudfront")
        try:
            dists = cf.list_distributions().get("DistributionList", {}).get("Items", []) or []
        except ClientError:
            return
        for dist in dists:
            did = dist["Id"]
            snap.add_node(ResourceNode(
                id=did,
                type=NodeType.CLOUDFRONT,
                name=dist.get("DomainName", did),
                region="global",
                metadata={"domain": dist.get("DomainName"), "enabled": dist.get("Enabled")},
                public=True,
            ))

    def _scan_route53(self, snap: ScanSnapshot) -> None:
        r53 = self.session.client("route53")
        try:
            zones = r53.list_hosted_zones().get("HostedZones", [])
        except ClientError:
            return
        for zone in zones:
            zid = zone["Id"].replace("/hostedzone/", "")
            snap.add_node(ResourceNode(
                id=zid,
                type=NodeType.ROUTE53_ZONE,
                name=zone.get("Name", zid),
                region="global",
                metadata={"private": zone.get("Config", {}).get("PrivateZone", False)},
            ))

    def _scan_iam_roles(self, snap: ScanSnapshot) -> None:
        iam = self.session.client("iam")
        try:
            paginator = iam.get_paginator("list_roles")
            for page in paginator.paginate():
                for role in page.get("Roles", []):
                    name = role["RoleName"]
                    if not any(k in name for k in ("ecommerce", "eks", "alb")):
                        continue
                    snap.add_node(ResourceNode(
                        id=f"role:{name}",
                        type=NodeType.IAM_ROLE,
                        name=name,
                        region="global",
                        arn=role.get("Arn"),
                    ))
        except ClientError:
            return
