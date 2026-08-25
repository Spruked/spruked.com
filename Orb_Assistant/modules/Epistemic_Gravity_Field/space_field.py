"""Bounded tensor field used for epistemic-density calculations.

This module restores the interface expected by the legacy ORB cognition
controller. It contains no cursor, movement, rendering, or behavior policy.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict

import torch


@dataclass(frozen=True)
class SpaceFieldConfig:
    DIM: int = 32
    CHANNELS: int = 4
    DECAY: float = 0.965
    DIFFUSION: float = 0.08
    MAX_DENSITY: float = 1.0


class SpaceFieldCognition:
    """A deterministic 32-cubed, four-channel epistemic field."""

    def __init__(self, device: str = "cpu", config: SpaceFieldConfig | None = None):
        self.config = config or SpaceFieldConfig()
        requested = str(device or "cpu")
        self.device = torch.device(requested if requested != "cuda" or torch.cuda.is_available() else "cpu")
        self.field = torch.zeros(
            self.config.DIM,
            self.config.DIM,
            self.config.DIM,
            self.config.CHANNELS,
            dtype=torch.float32,
            device=self.device,
        )
        self.tick = 0

    def broadcast_to_field(self, signal: Any) -> None:
        incoming = torch.as_tensor(signal, dtype=self.field.dtype, device=self.device)
        if incoming.shape != self.field.shape:
            raise ValueError(f"Expected signal shape {tuple(self.field.shape)}, got {tuple(incoming.shape)}")
        self.field.add_(incoming).clamp_(0.0, self.config.MAX_DENSITY)

    def step(self) -> None:
        """Apply bounded decay and local spatial diffusion for one field tick."""
        with torch.no_grad():
            neighbor_mean = (
                torch.roll(self.field, 1, 0)
                + torch.roll(self.field, -1, 0)
                + torch.roll(self.field, 1, 1)
                + torch.roll(self.field, -1, 1)
                + torch.roll(self.field, 1, 2)
                + torch.roll(self.field, -1, 2)
            ) / 6.0
            self.field.mul_(1.0 - self.config.DIFFUSION).add_(neighbor_mean, alpha=self.config.DIFFUSION)
            self.field.mul_(self.config.DECAY).clamp_(0.0, self.config.MAX_DENSITY)
            self.tick += 1

    def get_field_stats(self) -> Dict[str, Any]:
        active = self.field > 1e-6
        return {
            "tick": self.tick,
            "dimension": self.config.DIM,
            "channels": self.config.CHANNELS,
            "device": str(self.device),
            "field_density": int(active.any(dim=-1).sum().item()),
            "active_values": int(active.sum().item()),
            "mean_intensity": float(self.field.mean().item()),
            "max_intensity": float(self.field.max().item()),
            "total_energy": float(self.field.sum().item()),
        }
