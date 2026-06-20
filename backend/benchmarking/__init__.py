"""Internal model benchmark harness.

This package is intentionally CLI/module-only. It must not be wired into FastAPI
routes because benchmark execution can trigger paid provider calls in live mode.
"""

from .runner import BenchmarkRunConfig, BenchmarkRunSummary, run_benchmark

__all__ = ["BenchmarkRunConfig", "BenchmarkRunSummary", "run_benchmark"]
