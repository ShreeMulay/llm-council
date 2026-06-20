"""Budget guardrails for benchmark execution."""

from __future__ import annotations

from dataclasses import asdict, dataclass


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
        if self.observed_spend_usd + projected_cost_usd > self.cap_usd:
            self.stopped = True
            self.stop_reason = (
                f"projected spend {self.observed_spend_usd + projected_cost_usd:.8f} USD "
                f"would exceed cap {self.cap_usd:.8f} USD"
            )
            return False
        return True

    def record_observed(self, cost_usd: float | None) -> None:
        """Record observed spend and stop if it crosses the cap."""
        if cost_usd is None:
            return
        self.observed_spend_usd += cost_usd
        if self.cap_usd is not None and self.observed_spend_usd > self.cap_usd:
            self.stopped = True
            self.stop_reason = (
                f"observed spend {self.observed_spend_usd:.8f} USD exceeded cap "
                f"{self.cap_usd:.8f} USD"
            )

    def to_dict(self) -> dict[str, float | bool | str | None]:
        return asdict(self)
