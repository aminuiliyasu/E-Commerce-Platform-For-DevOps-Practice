"""AWS credential handling — memory only, never persisted."""

from __future__ import annotations

from typing import Any

import boto3
from pydantic import BaseModel, Field


class AwsCredentials(BaseModel):
    access_key_id: str = Field(min_length=16, max_length=128)
    secret_access_key: str = Field(min_length=8)
    session_token: str | None = None
    region: str = "eu-central-1"
    tf_state_bucket: str | None = None
    tf_state_key: str | None = None
    tf_state_region: str | None = None


def build_session(creds: AwsCredentials) -> boto3.Session:
    kwargs: dict[str, Any] = {
        "aws_access_key_id": creds.access_key_id,
        "aws_secret_access_key": creds.secret_access_key,
        "region_name": creds.region,
    }
    if creds.session_token:
        kwargs["aws_session_token"] = creds.session_token
    return boto3.Session(**kwargs)


def verify_credentials(creds: AwsCredentials) -> dict[str, str]:
    session = build_session(creds)
    identity = session.client("sts").get_caller_identity()
    return {
        "account_id": identity["Account"],
        "arn": identity["Arn"],
        "user_id": identity["UserId"],
    }
