from __future__ import annotations

from abc import ABC, abstractmethod


class EmailProvider(ABC):
    @abstractmethod
    async def send(self, *, recipient: str, subject: str, text_body: str) -> bool:
        """Return true when a message was accepted by the configured provider."""
        raise NotImplementedError
