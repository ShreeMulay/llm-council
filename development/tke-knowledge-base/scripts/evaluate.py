"""Evaluate TKE Knowledge Base against golden queries.

Runs all golden queries, checks:
1. Retrieval accuracy — does the correct domain appear in results?
2. Term coverage — how many expected terms appear in the answer?
3. Response quality — does the answer cite sources properly?
4. Performance — query latency

Usage:
    python scripts/evaluate.py
    python scripts/evaluate.py --verbose
    python scripts/evaluate.py --query q001
"""

import argparse
import json
import sys
import time
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from rich.console import Console
from rich.table import Table

from src.models import ChatQuery
from src.retrieval.search import query

console = Console()

GOLDEN_QUERIES_PATH = Path(__file__).parent.parent / "tests" / "eval" / "golden_queries.json"


def load_golden_queries() -> list[dict]:
    """Load golden query-answer pairs."""
    with open(GOLDEN_QUERIES_PATH) as f:
        data = json.load(f)
    return data["queries"]


def evaluate_single(golden: dict, verbose: bool = False) -> dict:
    """Evaluate a single golden query.

    Returns a result dict with scores and details.
    """
    qid = golden["id"]
    question = golden["question"]
    expected_domain = golden["expected_domain"]
    expected_terms = golden["expected_terms"]
    difficulty = golden["difficulty"]

    # Run the query
    start = time.time()
    chat_query = ChatQuery(question=question)
    response = query(chat_query)
    elapsed_ms = int((time.time() - start) * 1000)

    # 1. Domain accuracy: did the correct domain appear in retrieved chunks?
    retrieved_domains = {d.value for d in response.domains_searched}
    domain_hit = expected_domain in retrieved_domains

    # Also check if any citation is from the expected domain
    citation_domains = {c.domain.value for c in response.citations}
    domain_in_citations = expected_domain in citation_domains

    # 2. Term coverage: how many expected terms appear in the answer?
    answer_lower = response.answer.lower()
    terms_found = []
    terms_missing = []
    for term in expected_terms:
        if term.lower() in answer_lower:
            terms_found.append(term)
        else:
            terms_missing.append(term)
    term_coverage = len(terms_found) / len(expected_terms) if expected_terms else 1.0

    # 3. Citation quality: does the answer contain [Source N] references?
    has_citations = "[Source" in response.answer
    citation_count = response.answer.count("[Source")

    # 4. Non-answer detection: is the ENTIRE response essentially a non-answer?
    # Only flag if the response starts with a refusal, not if it mentions missing
    # details within an otherwise substantive answer.
    non_answer_phrases = [
        "I don't have sufficient information",
        "I don't have specific information on this topic",
        "don't have enough information",
        "not available in my knowledge base",
        "no relevant information found",
    ]
    first_300 = response.answer[:300].lower()
    is_non_answer = any(phrase.lower() in first_300 for phrase in non_answer_phrases)
    # Very short answers with "I don't have" are also non-answers
    if not is_non_answer and len(response.answer.strip()) < 200:
        is_non_answer = "i don't have" in response.answer.lower()

    # 5. Chunk count and scores
    chunk_count = len(response.citations)
    avg_score = sum(c.score for c in response.citations) / chunk_count if chunk_count > 0 else 0
    top_score = max((c.score for c in response.citations), default=0)

    # Overall score (weighted)
    # Domain hit: 25%, Term coverage: 40%, Has citations: 15%, Not a non-answer: 20%
    overall = (
        (0.25 * (1.0 if domain_hit else 0.0))
        + (0.40 * term_coverage)
        + (0.15 * (1.0 if has_citations and not is_non_answer else 0.0))
        + (0.20 * (1.0 if not is_non_answer else 0.0))
    )

    result = {
        "id": qid,
        "question": question,
        "difficulty": difficulty,
        "expected_domain": expected_domain,
        "domain_hit": domain_hit,
        "domain_in_citations": domain_in_citations,
        "retrieved_domains": sorted(retrieved_domains),
        "term_coverage": term_coverage,
        "terms_found": terms_found,
        "terms_missing": terms_missing,
        "has_citations": has_citations,
        "citation_count": citation_count,
        "is_non_answer": is_non_answer,
        "chunk_count": chunk_count,
        "avg_score": avg_score,
        "top_score": top_score,
        "confidence": response.confidence,
        "query_time_ms": elapsed_ms,
        "overall_score": overall,
        "answer": response.answer,
    }

    if verbose:
        console.print(f"\n{'=' * 80}")
        console.print(f"[bold]{qid}[/bold] ({difficulty}) — {question}")
        console.print(
            f"  Domain: {'[green]HIT[/green]' if domain_hit else '[red]MISS[/red]'} (expected={expected_domain}, got={sorted(retrieved_domains)})"
        )
        console.print(f"  Terms:  {len(terms_found)}/{len(expected_terms)} ({term_coverage:.0%})")
        if terms_missing:
            console.print(f"          Missing: {terms_missing}")
        console.print(f"  Citations: {citation_count} refs, Non-answer: {is_non_answer}")
        console.print(f"  Chunks: {chunk_count}, Top score: {top_score:.3f}, Avg: {avg_score:.3f}")
        console.print(f"  Time: {elapsed_ms}ms | Confidence: {response.confidence:.3f}")
        console.print(f"  [bold]Overall: {overall:.0%}[/bold]")
        # Print first 300 chars of answer
        preview = response.answer[:300] + ("..." if len(response.answer) > 300 else "")
        console.print(f"  Answer: {preview}")

    return result


def print_summary(results: list[dict]) -> None:
    """Print a summary table of all results."""
    table = Table(title="TKE Knowledge Base Evaluation Results", show_lines=True)
    table.add_column("ID", style="bold")
    table.add_column("Difficulty")
    table.add_column("Domain", justify="center")
    table.add_column("Terms", justify="center")
    table.add_column("Citations", justify="center")
    table.add_column("Chunks")
    table.add_column("Top Score")
    table.add_column("Time (ms)")
    table.add_column("Overall", justify="center")

    for r in results:
        domain_str = "[green]HIT[/green]" if r["domain_hit"] else "[red]MISS[/red]"
        term_str = f"{len(r['terms_found'])}/{len(r['terms_found']) + len(r['terms_missing'])}"
        cite_str = f"{r['citation_count']}" if r["has_citations"] else "[red]0[/red]"
        if r["is_non_answer"]:
            cite_str = "[red]N/A[/red]"
        overall_color = (
            "green"
            if r["overall_score"] >= 0.7
            else "yellow"
            if r["overall_score"] >= 0.5
            else "red"
        )

        table.add_row(
            r["id"],
            r["difficulty"],
            domain_str,
            term_str,
            cite_str,
            str(r["chunk_count"]),
            f"{r['top_score']:.3f}",
            str(r["query_time_ms"]),
            f"[{overall_color}]{r['overall_score']:.0%}[/{overall_color}]",
        )

    console.print(table)

    # Aggregate stats
    total = len(results)
    domain_hits = sum(1 for r in results if r["domain_hit"])
    avg_term_coverage = sum(r["term_coverage"] for r in results) / total
    avg_overall = sum(r["overall_score"] for r in results) / total
    non_answers = sum(1 for r in results if r["is_non_answer"])
    avg_time = sum(r["query_time_ms"] for r in results) / total
    total_time = sum(r["query_time_ms"] for r in results)

    console.print(f"\n[bold]Summary:[/bold]")
    console.print(f"  Queries:          {total}")
    console.print(f"  Domain accuracy:  {domain_hits}/{total} ({domain_hits / total:.0%})")
    console.print(f"  Avg term coverage: {avg_term_coverage:.0%}")
    console.print(f"  Non-answers:      {non_answers}/{total}")
    console.print(f"  Avg overall:      {avg_overall:.0%}")
    console.print(f"  Avg latency:      {avg_time:.0f}ms")
    console.print(f"  Total time:       {total_time / 1000:.1f}s")

    # By difficulty
    for diff in ["easy", "medium", "hard"]:
        subset = [r for r in results if r["difficulty"] == diff]
        if subset:
            avg = sum(r["overall_score"] for r in subset) / len(subset)
            console.print(f"  {diff.capitalize():10s}: {avg:.0%} ({len(subset)} queries)")


def save_results(results: list[dict], output_path: Path) -> None:
    """Save evaluation results to JSON."""
    output = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "total_queries": len(results),
        "avg_overall_score": sum(r["overall_score"] for r in results) / len(results),
        "results": results,
    }
    # Don't save full answer text in the summary (too large)
    for r in output["results"]:
        r["answer_preview"] = r["answer"][:200]
        del r["answer"]

    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)
    console.print(f"\n[green]Results saved to {output_path}[/green]")


def main():
    parser = argparse.ArgumentParser(description="Evaluate TKE KB against golden queries")
    parser.add_argument("--verbose", "-v", action="store_true", help="Show detailed output")
    parser.add_argument("--query", "-q", type=str, help="Run single query by ID (e.g., q001)")
    parser.add_argument("--output", "-o", type=str, default=None, help="Save results to JSON file")
    args = parser.parse_args()

    golden_queries = load_golden_queries()

    if args.query:
        golden_queries = [q for q in golden_queries if q["id"] == args.query]
        if not golden_queries:
            console.print(f"[red]Query '{args.query}' not found[/red]")
            sys.exit(1)

    console.print(f"[bold]Running {len(golden_queries)} evaluation queries...[/bold]\n")

    results = []
    for golden in golden_queries:
        result = evaluate_single(golden, verbose=args.verbose)
        results.append(result)
        if not args.verbose:
            # Print progress dot
            color = (
                "green"
                if result["overall_score"] >= 0.7
                else "yellow"
                if result["overall_score"] >= 0.5
                else "red"
            )
            console.print(
                f"  [{color}]●[/{color}] {result['id']} ({result['difficulty']}) — {result['overall_score']:.0%}",
                highlight=False,
            )

    print_summary(results)

    if args.output:
        save_results(results, Path(args.output))
    else:
        # Default output path
        output_path = Path(__file__).parent.parent / "tests" / "eval" / "eval_results.json"
        save_results(results, output_path)


if __name__ == "__main__":
    main()
