"""CLI entrypoint for internal model benchmarks."""

from __future__ import annotations

import argparse
from pathlib import Path

from .models import FLAGSHIP_PROMOTION_VARIANT_SET, VARIANT_SETS
from .runner import BenchmarkRunConfig, CouncilPromotionExecutor, run_benchmark


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the internal LLM model benchmark harness")
    parser.add_argument("--mode", choices=["mock", "live"], default="mock")
    parser.add_argument("--promotion", action="store_true", help="Run the flagship promotion benchmark")
    parser.add_argument("--output-dir", type=Path, default=Path("benchmarks/runs"))
    parser.add_argument("--run-id", default="local-run")
    parser.add_argument("--clock", default="1970-01-01T00:00:00Z")
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--budget-usd", type=float, default=25.0)
    parser.add_argument("--prompt-suite", type=Path, default=Path("benchmarks/prompts/internal_suite_v1.json"))
    parser.add_argument(
        "--variant-set",
        choices=sorted(VARIANT_SETS),
        default="default",
        help="Named benchmark variant set to run; default preserves existing June reasoning-ladder behavior.",
    )
    parser.add_argument(
        "--probe-gated-variants",
        action="store_true",
        help=(
            "In live mode, run tiny paid support probes before resolving xhigh/max variants. "
            "Exact-route probes are always required for flagship promotion runs."
        ),
    )
    parser.add_argument("--probe-timeout-seconds", type=float, default=30.0)
    parser.add_argument("--trials", type=int, default=1)
    parser.add_argument("--max-tokens", type=int, default=2048)
    parser.add_argument("--temperature", type=float, default=0.2)
    args = parser.parse_args()
    variant_set = FLAGSHIP_PROMOTION_VARIANT_SET if args.promotion else args.variant_set
    executor = CouncilPromotionExecutor() if args.mode == "live" and args.promotion else None

    summary = run_benchmark(
        BenchmarkRunConfig(
            mode=args.mode,
            output_dir=args.output_dir,
            run_id=args.run_id,
            clock_iso=args.clock,
            seed=args.seed,
            budget_usd=args.budget_usd,
            prompt_suite_path=args.prompt_suite,
            variant_set=variant_set,
            council_executor=executor,
            probe_gated_variants=args.probe_gated_variants,
            probe_timeout_seconds=args.probe_timeout_seconds,
            trials=args.trials,
            max_tokens=args.max_tokens,
            temperature=args.temperature,
        )
    )
    print(f"wrote benchmark artifacts: {summary.run_dir}")


if __name__ == "__main__":
    main()
