"""Simple in-memory cache with TTL support."""

import time
from typing import Any, Optional, Dict
from threading import Lock


class Cache:
    """Thread-safe in-memory cache with TTL."""

    def __init__(self):
        self._cache: Dict[str, tuple[Any, float]] = {}
        self._lock = Lock()

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache if not expired."""
        with self._lock:
            if key in self._cache:
                value, expires_at = self._cache[key]
                if time.time() < expires_at:
                    return value
                else:
                    del self._cache[key]
            return None

    def set(self, key: str, value: Any, ttl: int = 3600) -> None:
        """Set value in cache with TTL in seconds."""
        with self._lock:
            self._cache[key] = (value, time.time() + ttl)

    def delete(self, key: str) -> None:
        """Delete key from cache."""
        with self._lock:
            self._cache.pop(key, None)

    def clear(self) -> None:
        """Clear all cache."""
        with self._lock:
            self._cache.clear()

    def cleanup_expired(self) -> int:
        """Remove expired entries. Returns count of removed entries."""
        with self._lock:
            now = time.time()
            expired_keys = [k for k, (_, exp) in self._cache.items() if exp <= now]
            for k in expired_keys:
                del self._cache[k]
            return len(expired_keys)


# Global cache instance
cache = Cache()


def cache_key(*args, **kwargs) -> str:
    """Generate cache key from arguments."""
    import hashlib
    key_str = str(args) + str(sorted(kwargs.items()))
    return hashlib.md5(key_str.encode()).hexdigest()