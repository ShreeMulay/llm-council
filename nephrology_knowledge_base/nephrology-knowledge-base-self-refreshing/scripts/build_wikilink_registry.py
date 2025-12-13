#!/usr/bin/env python3
"""
Build Wikilink Registry - Scan all markdown files and extract wikilinks.

This script scans all generated markdown files and builds a registry of:
- All wikilinks found in the knowledge base
- Their source files
- Target status (exists/broken/orphan)

Usage:
    python scripts/build_wikilink_registry.py [--output PATH]
"""

import argparse
import json
import logging
import os
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Optional

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.utils.markdown_utils import load_markdown_file, extract_wikilinks

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def find_markdown_files(base_dir: str = "domains") -> list[str]:
    """Find all markdown files in the domains directory."""
    files = []
    base_path = Path(base_dir)
    
    if not base_path.exists():
        logger.warning(f"Directory not found: {base_dir}")
        return files
    
    for md_file in base_path.rglob("*.md"):
        files.append(str(md_file))
    
    return sorted(files)


def normalize_wikilink_target(target: str) -> str:
    """
    Normalize a wikilink target to a consistent format.
    
    Examples:
        "[[Topic Name]]" -> "topic-name"
        "[[01-clinical/CKD Management]]" -> "01-clinical/ckd-management"
    """
    # Remove any display text after |
    if "|" in target:
        target = target.split("|")[0]
    
    # Normalize to lowercase kebab-case
    normalized = target.lower().strip()
    normalized = normalized.replace(" ", "-")
    normalized = normalized.replace("(", "").replace(")", "")
    
    return normalized


def resolve_wikilink_path(target: str, source_file: str, base_dir: str = "domains") -> Optional[str]:
    """
    Resolve a wikilink target to a file path.
    
    Args:
        target: The wikilink target
        source_file: The file containing the wikilink
        base_dir: Base directory for domains
        
    Returns:
        Resolved file path if found, None otherwise
    """
    normalized = normalize_wikilink_target(target)
    
    # Possible paths to check
    candidates = []
    
    # If target has a path component (domain/topic)
    if "/" in normalized:
        domain, topic = normalized.split("/", 1)
        candidates.append(Path(base_dir) / domain / f"{topic}.md")
        candidates.append(Path(base_dir) / domain / topic / "_index.md")
    else:
        # Check in same domain as source file
        source_path = Path(source_file)
        if source_path.parent.name != base_dir:
            source_domain = source_path.parent.name
            candidates.append(Path(base_dir) / source_domain / f"{normalized}.md")
            candidates.append(Path(base_dir) / source_domain / normalized / "_index.md")
        
        # Check all domains
        for domain_dir in Path(base_dir).iterdir():
            if domain_dir.is_dir():
                candidates.append(domain_dir / f"{normalized}.md")
                candidates.append(domain_dir / normalized / "_index.md")
    
    # Check if any candidate exists
    for candidate in candidates:
        if candidate.exists():
            return str(candidate)
    
    return None


def build_registry(base_dir: str = "domains") -> dict:
    """
    Build the wikilink registry by scanning all markdown files.
    
    Returns:
        Registry dictionary with links, sources, targets, and metadata
    """
    registry = {
        "version": "1.0",
        "generated_at": datetime.utcnow().isoformat(),
        "base_dir": base_dir,
        "links": [],
        "by_target": defaultdict(list),
        "by_source": defaultdict(list),
        "broken_links": [],
        "orphan_targets": [],
        "statistics": {
            "total_files": 0,
            "total_links": 0,
            "unique_targets": 0,
            "broken_count": 0,
        }
    }
    
    files = find_markdown_files(base_dir)
    registry["statistics"]["total_files"] = len(files)
    
    logger.info(f"Scanning {len(files)} markdown files...")
    
    all_targets = set()
    existing_files = set(str(f) for f in Path(base_dir).rglob("*.md"))
    
    for filepath in files:
        try:
            doc = load_markdown_file(filepath)
            links = extract_wikilinks(doc.content)
            
            for link in links:
                target = link["target"]
                display = link["display"]
                
                # Resolve target path
                resolved_path = resolve_wikilink_path(target, filepath, base_dir)
                is_broken = resolved_path is None
                
                link_entry = {
                    "target": target,
                    "display": display,
                    "source_file": filepath,
                    "resolved_path": resolved_path,
                    "is_broken": is_broken,
                    "normalized_target": normalize_wikilink_target(target),
                }
                
                registry["links"].append(link_entry)
                registry["by_target"][target].append(filepath)
                registry["by_source"][filepath].append(target)
                all_targets.add(target)
                
                if is_broken:
                    registry["broken_links"].append(link_entry)
                    
        except Exception as e:
            logger.warning(f"Error processing {filepath}: {e}")
    
    # Convert defaultdicts to regular dicts for JSON serialization
    registry["by_target"] = dict(registry["by_target"])
    registry["by_source"] = dict(registry["by_source"])
    
    # Calculate statistics
    registry["statistics"]["total_links"] = len(registry["links"])
    registry["statistics"]["unique_targets"] = len(all_targets)
    registry["statistics"]["broken_count"] = len(registry["broken_links"])
    
    logger.info(f"Found {len(registry['links'])} total links")
    logger.info(f"Found {len(all_targets)} unique targets")
    logger.info(f"Found {len(registry['broken_links'])} broken links")
    
    return registry


def save_registry(registry: dict, output_path: str = "graph/wikilink_registry.json") -> None:
    """Save registry to JSON file."""
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output, 'w', encoding='utf-8') as f:
        json.dump(registry, f, indent=2, ensure_ascii=False)
    
    logger.info(f"Registry saved to: {output}")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Build wikilink registry from markdown files"
    )
    parser.add_argument(
        "--base-dir",
        type=str,
        default="domains",
        help="Base directory to scan (default: domains)",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="graph/wikilink_registry.json",
        help="Output file path",
    )
    
    args = parser.parse_args()
    
    registry = build_registry(args.base_dir)
    save_registry(registry, args.output)
    
    # Print summary
    print("\n" + "=" * 60)
    print("Wikilink Registry Summary")
    print("=" * 60)
    print(f"Files scanned: {registry['statistics']['total_files']}")
    print(f"Total links: {registry['statistics']['total_links']}")
    print(f"Unique targets: {registry['statistics']['unique_targets']}")
    print(f"Broken links: {registry['statistics']['broken_count']}")
    
    if registry["broken_links"]:
        print("\nBroken links (first 10):")
        for link in registry["broken_links"][:10]:
            print(f"  - {link['target']} (from {link['source_file']})")


if __name__ == "__main__":
    main()
