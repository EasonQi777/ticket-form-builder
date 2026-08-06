"""Organization access token generation.

Copied from mediaJira's `stripe_meta.permissions.generate_organization_access_token`
(the `stripe_meta` billing app itself is out of scope for this extracted
project - see README "Known simplifications" - but this one function has no
billing dependency, so it was brought over as-is rather than reimplemented).
"""

import base64
import json
import logging
from datetime import datetime, timedelta, timezone

import jwt
from cryptography.fernet import Fernet
from django.conf import settings

logger = logging.getLogger(__name__)


def generate_organization_access_token(user):
    """
    Generate an encrypted access token containing user_id and organization slug.
    Only generates token if user belongs to an organization.

    Never raises: misconfigured keys or crypto errors would otherwise break login entirely.
    """
    if not getattr(user, "organization", None):
        return None

    try:
        sensitive_data = {
            "user_id": user.id,
            "organization_slug": user.organization.slug,
        }

        encryption_key = settings.ORGANIZATION_ACCESS_TOKEN_ENCRYPTION_KEY.encode()
        fernet = Fernet(encryption_key)
        encrypted_data = fernet.encrypt(json.dumps(sensitive_data).encode())

        payload = {
            "encrypted_data": base64.b64encode(encrypted_data).decode(),
            "exp": datetime.now(timezone.utc) + timedelta(hours=24),
            "iat": datetime.now(timezone.utc),
            "type": "access",
        }

        secret_key = settings.ORGANIZATION_ACCESS_TOKEN_SECRET_KEY
        token = jwt.encode(payload, secret_key, algorithm="HS256")
        return token
    except Exception:
        logger.exception(
            "generate_organization_access_token failed (user_id=%s); login continues without org token",
            getattr(user, "id", None),
        )
        return None
