"""
CaliCognitionMixin - the single base class that gives CaliPersonalSKG her memory loop,
self-care (pruning, repair) and tool registry. Add it as a base and call _init_cognition().
"""

from __future__ import annotations

from .cali_memory_loop import MEMORY_AGENCY_PROMPT, AimsClient, CaliMemoryLoopMixin
from .cali_self_care import CaliSelfCareMixin
from .cali_tools import CaliToolsMixin

__all__ = ["CaliCognitionMixin", "MEMORY_AGENCY_PROMPT"]


class CaliCognitionMixin(CaliMemoryLoopMixin, CaliSelfCareMixin, CaliToolsMixin):
    def _init_cognition(self) -> None:
        self._init_memory_loop_tables()
        self.aims_client = AimsClient()
        self._init_tools()
