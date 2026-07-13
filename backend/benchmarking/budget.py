"""Budget guardrails for benchmark execution."""

from __future__ import annotations

import math
from dataclasses import asdict, dataclass
from numbers import Real


@dataclass
class BudgetGuard:
    """Fail-closed benchmark budget guard."""

    cap_usd: float | None
    observed_spend_usd: float = 0.0
    stopped: bool = False
    stop_reason: str | None = None

    def can_start(self, projected_cost_usd: float | None) -> bool:
        """Return False if the next call would exceed the configured cap."""
        if self.cap_usd is None:
            return True
        if projected_cost_usd is None:
            self.stopped = True
            self.stop_reason = "budget cap configured but projected cost is unknown"
            return False
        self._validate_cost(projected_cost_usd, "projected cost")
        if self.observed_spend_usd + projected_cost_usd > self.cap_usd:
            self.stopped = True
            self.stop_reason = (
                f"projected spend {self.observed_spend_usd + projected_cost_usd:.8f} USD "
                f"would exceed cap {self.cap_usd:.8f} USD"
            )
            return False
        return True

    def record_observed(
        self, cost_usd: float | None, *, reserved_cost_usd: float | None = None
    ) -> float:
        """Record spend, charging the full reservation when billing is missing."""
        charged = cost_usd if cost_usd is not None else reserved_cost_usd
        if charged is None:
            self.stopped = True
            self.stop_reason = "observed cost and reserved cost are both unknown"
            return 0.0
        self._validate_cost(charged, "observed or reserved cost")
        self.observed_spend_usd += charged
        if self.cap_usd is not None and self.observed_spend_usd > self.cap_usd:
            self.stopped = True
            self.stop_reason = (
                f"observed spend {self.observed_spend_usd:.8f} USD exceeded cap "
                f"{self.cap_usd:.8f} USD"
            )
        return charged

    @staticmethod
    def _validate_cost(value: float, label: str) -> None:
        if (
            isinstance(value, bool)
            or not isinstance(value, Real)
            or not math.isfinite(float(value))
            or value < 0
        ):
            raise ValueError(f"{label} must be a finite non-negative number")

    def to_dict(self) -> dict[str, float | bool | str | None]:
        return asdict(self)
