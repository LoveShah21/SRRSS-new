from __future__ import annotations

import json
import logging
from typing import Any

try:
    import redis
except Exception:  # pragma: no cover - import availability depends on env
    redis = None

logger = logging.getLogger("resume_ranker.session_store")


class SessionStore:
    """
    Durable session store for multi-step ranking flows.

    - Uses Redis when REDIS_URL is configured and reachable.
    - Falls back to in-memory storage when Redis is unavailable.
    """

    def __init__(
        self,
        redis_url: str | None = None,
        ttl_seconds: int = 60 * 60 * 24,
        key_prefix: str = "srrss:session:",
    ) -> None:
        self._memory: dict[str, dict[str, Any]] = {}
        self._redis = None
        self._ttl_seconds = max(1, int(ttl_seconds))
        self._key_prefix = key_prefix

        if not redis_url:
            logger.debug("REDIS_URL not configured; using in-memory session store.")
            return

        if redis is None:
            logger.warning("redis package not available; using in-memory session store.")
            return

        try:
            client = redis.Redis.from_url(redis_url, decode_responses=True)
            client.ping()
            self._redis = client
            logger.info("Redis session store enabled.")
        except Exception as err:
            logger.warning("Redis unavailable; falling back to in-memory store: %s", err)

    def _key(self, job_id: str) -> str:
        return f"{self._key_prefix}{job_id}"

    @property
    def uses_redis(self) -> bool:
        return self._redis is not None

    def get(self, job_id: str) -> dict[str, Any] | None:
        if self._redis:
            payload = self._redis.get(self._key(job_id))
            if not payload:
                return None
            return json.loads(payload)
        return self._memory.get(job_id)

    def set(self, job_id: str, value: dict[str, Any]) -> None:
        if self._redis:
            payload = json.dumps(value)
            self._redis.setex(self._key(job_id), self._ttl_seconds, payload)
            return
        self._memory[job_id] = value

    def exists(self, job_id: str) -> bool:
        if self._redis:
            return bool(self._redis.exists(self._key(job_id)))
        return job_id in self._memory

    def delete(self, job_id: str) -> bool:
        if self._redis:
            return bool(self._redis.delete(self._key(job_id)))
        return self._memory.pop(job_id, None) is not None
