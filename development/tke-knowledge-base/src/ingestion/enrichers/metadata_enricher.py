"""Metadata enricher: domain detection, drug name extraction, source attribution.

Enriches raw chunks with structured metadata for better retrieval.
"""

import json
from pathlib import Path

from ...config import DATA_DIR
from ...models import Domain


# Load drug mappings and domain taxonomy at module level
_drug_mappings: dict | None = None
_domain_taxonomy: dict | None = None


def _load_drug_mappings() -> dict:
    """Load and index drug mappings for fast lookup."""
    global _drug_mappings
    if _drug_mappings is not None:
        return _drug_mappings

    mappings_path = DATA_DIR / "drug_mappings.json"
    with open(mappings_path) as f:
        data = json.load(f)

    # Build lookup index: all names -> drug entry
    index: dict[str, dict] = {}
    for drug in data["drugs"]:
        generic = drug["generic"].lower()
        index[generic] = drug

        for brand in drug.get("brands", []):
            index[brand.lower()] = drug

        for alias in drug.get("aliases", []):
            index[alias.lower()] = drug

    _drug_mappings = index
    return index


def _load_domain_taxonomy() -> dict:
    """Load domain taxonomy with keywords."""
    global _domain_taxonomy
    if _domain_taxonomy is not None:
        return _domain_taxonomy

    taxonomy_path = DATA_DIR / "domain_taxonomy.json"
    with open(taxonomy_path) as f:
        data = json.load(f)

    _domain_taxonomy = data["domains"]
    return _domain_taxonomy


def extract_drug_names(text: str) -> list[str]:
    """Extract all drug names (brand and generic) mentioned in text.

    Returns deduplicated list of canonical drug names in format:
    "Brand (generic)" or just "generic" if no brand.

    Uses word-boundary matching to avoid false positives from substrings
    (e.g., "reports" should not match "epo").
    """
    import re

    drug_index = _load_drug_mappings()
    text_lower = text.lower()

    found_drugs: set[str] = set()
    seen_generics: set[str] = set()

    for name, drug in drug_index.items():
        # Use word-boundary matching for short names to avoid false positives
        # (e.g., "epo" matching inside "reports")
        if len(name) <= 4:
            pattern = rf"\b{re.escape(name)}\b"
            if not re.search(pattern, text_lower):
                continue
        elif name not in text_lower:
            continue

        generic = drug["generic"]
        if generic not in seen_generics:
            seen_generics.add(generic)
            brands = drug.get("brands", [])
            if brands:
                found_drugs.add(f"{brands[0]} ({generic})")
            else:
                found_drugs.add(generic)

    return sorted(found_drugs)


def detect_domain(text: str, title: str = "") -> Domain:
    """Detect the primary clinical domain of a text chunk.

    Uses keyword matching against domain taxonomy.
    Returns the domain with the highest keyword match count.
    """
    taxonomy = _load_domain_taxonomy()
    combined_text = f"{title} {text}".lower()

    scores: dict[str, int] = {}
    for domain_key, domain_info in taxonomy.items():
        score = 0
        for keyword in domain_info.get("keywords", []):
            if keyword.lower() in combined_text:
                score += 1
        scores[domain_key] = score

    if not scores or max(scores.values()) == 0:
        return Domain.GENERAL

    best_domain = max(scores, key=lambda k: scores[k])

    try:
        return Domain(best_domain)
    except ValueError:
        return Domain.GENERAL


def detect_all_domains(text: str, title: str = "") -> list[Domain]:
    """Detect all relevant domains for a text chunk.

    Returns domains that have at least 2 keyword matches,
    sorted by relevance (most matches first).
    """
    taxonomy = _load_domain_taxonomy()
    combined_text = f"{title} {text}".lower()

    scored: list[tuple[str, int]] = []
    for domain_key, domain_info in taxonomy.items():
        score = 0
        for keyword in domain_info.get("keywords", []):
            if keyword.lower() in combined_text:
                score += 1
        if score >= 1:
            scored.append((domain_key, score))

    # Sort by score descending
    scored.sort(key=lambda x: x[1], reverse=True)

    domains = []
    for domain_key, _ in scored:
        try:
            domains.append(Domain(domain_key))
        except ValueError:
            continue

    if not domains:
        domains = [Domain.GENERAL]

    return domains


def expand_drug_query(query: str) -> str:
    """Expand a query to include both brand and generic drug names.

    If a user searches for "Farxiga", this adds "dapagliflozin" to the query
    and vice versa. Improves recall for drug-related queries.
    """
    drug_index = _load_drug_mappings()
    query_lower = query.lower()
    expansions: list[str] = []

    for name, drug in drug_index.items():
        if name in query_lower:
            # Add the generic name
            if drug["generic"].lower() not in query_lower:
                expansions.append(drug["generic"])
            # Add brand names
            for brand in drug.get("brands", []):
                if brand.lower() not in query_lower:
                    expansions.append(brand)

    if expansions:
        return f"{query} ({', '.join(expansions)})"
    return query
