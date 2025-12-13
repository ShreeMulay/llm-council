#!/usr/bin/env python3
"""
Discover Sources - Pass 2 of the knowledge base generation pipeline.

This script discovers authoritative sources for each topic in the skeleton,
preparing for citation-first content generation in Pass 3.

Usage:
    python scripts/discover_sources.py [--domain DOMAIN] [--topic TOPIC] [--dry-run]
    
Examples:
    python scripts/discover_sources.py                        # All domains
    python scripts/discover_sources.py --domain 01-clinical   # Single domain
    python scripts/discover_sources.py --dry-run              # Preview mode
"""

import argparse
import json
import logging
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.utils.llm_client import LLMClient
from scripts.utils.markdown_utils import load_markdown_file, extract_wikilinks
from scripts.utils.schema_validator import SchemaValidator
from scripts.utils.checkpoint_manager import CheckpointManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def load_prompt_template(template_path: str) -> str:
    """Load prompt template from file."""
    with open(template_path, 'r') as f:
        return f.read()


def load_schema(schema_path: str) -> dict:
    """Load JSON schema from file."""
    with open(schema_path, 'r') as f:
        return json.load(f)


def extract_topics_from_index(index_path: str) -> list[dict]:
    """
    Extract topic information from a domain _index.md file.
    
    Returns list of topic dicts with name, description, subtopics, etc.
    """
    doc = load_markdown_file(index_path)
    content = doc.content
    
    topics = []
    
    # Pattern to match topic entries
    # Format: - **[[Topic Name]]**: Description
    topic_pattern = r'-\s+\*\*\[\[([^\]]+)\]\]\*\*:\s*(.+?)(?=\n\s+-\s+\*\*\[\[|\n\s*\n##|\Z)'
    
    # Find all topic blocks
    matches = re.findall(topic_pattern, content, re.DOTALL)
    
    for match in matches:
        name = match[0].strip()
        block = match[1].strip()
        
        topic = {
            "name": name,
            "description": "",
            "subtopics": [],
            "priority": "medium",
            "suggested_sources": [],
        }
        
        # Parse the block
        lines = block.split('\n')
        
        # First line is description
        if lines:
            # Get description up to first "Subtopics:" or other metadata
            desc_lines = []
            for line in lines:
                line_stripped = line.strip()
                if line_stripped.startswith('- Subtopics:'):
                    subtopics_str = line_stripped.replace('- Subtopics:', '').strip()
                    topic["subtopics"] = [s.strip() for s in subtopics_str.split(',')]
                elif line_stripped.startswith('- Priority:'):
                    topic["priority"] = line_stripped.replace('- Priority:', '').strip()
                elif line_stripped.startswith('- Sources:'):
                    sources_str = line_stripped.replace('- Sources:', '').strip()
                    topic["suggested_sources"] = [s.strip() for s in sources_str.split(',')]
                elif not line_stripped.startswith('-'):
                    if line_stripped:
                        desc_lines.append(line_stripped)
            
            topic["description"] = ' '.join(desc_lines)
        
        topics.append(topic)
    
    return topics


def discover_sources_for_topic(
    client: LLMClient,
    topic: dict,
    domain_name: str,
    prompt_template: str,
    schema: dict,
    model: str = "gemini-2-5-flash",
    max_tokens: int = 4096,
) -> Optional[dict]:
    """
    Discover sources for a single topic.
    
    Args:
        client: LLM client instance
        topic: Topic dict with name, description, subtopics
        domain_name: Human-readable domain name
        prompt_template: Prompt template string
        schema: JSON schema for output
        model: Model to use
        max_tokens: Maximum tokens
        
    Returns:
        Source discovery data or None on failure
    """
    topic_name = topic["name"]
    description = topic.get("description", "")
    subtopics = topic.get("subtopics", [])
    
    logger.info(f"Discovering sources for: {topic_name}")
    
    # Build prompt
    prompt = prompt_template.replace("{{TOPIC_NAME}}", topic_name)
    prompt = prompt.replace("{{DOMAIN_NAME}}", domain_name)
    prompt = prompt.replace("{{TOPIC_DESCRIPTION}}", description)
    prompt = prompt.replace("{{SUBTOPICS}}", ", ".join(subtopics) if subtopics else "None specified")
    
    try:
        # Don't pass schema - let LLM return JSON naturally
        # Schema validation happens after parsing
        response = client.generate(
            prompt=prompt,
            model=model,
            temperature=0.2,  # Lower temperature for factual accuracy
            max_tokens=max_tokens,
            schema=None,  # Simplified - JSON mode without strict schema
        )
        
        # Parse JSON from response content
        content = response.content.strip()
        
        # Remove markdown code blocks if present
        if content.startswith("```"):
            # Remove opening ```json or ```
            first_newline = content.find("\n")
            if first_newline > 0:
                content = content[first_newline + 1:]
            else:
                content = content[3:]
            # Remove closing ```
            if content.endswith("```"):
                content = content[:-3].strip()
        
        try:
            data = json.loads(content)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {e}")
            logger.error(f"Content: {content[:500]}")
            return None
        
        # Ensure required fields
        data["topic"] = topic_name
        data["source_discovery_date"] = datetime.utcnow().isoformat()
        
        primary_count = len(data.get("primary_sources", []))
        secondary_count = len(data.get("secondary_sources", []))
        logger.info(f"Found {primary_count} primary, {secondary_count} secondary sources for {topic_name}")
        
        return data
        
    except Exception as e:
        logger.error(f"Failed to discover sources for {topic_name}: {e}")
        return None


def save_topic_sources(
    domain_id: str,
    topic_name: str,
    data: dict,
    base_dir: str = "sources",
) -> str:
    """
    Save discovered sources to a JSON file.
    
    Args:
        domain_id: Domain identifier
        topic_name: Topic name
        data: Source discovery data
        base_dir: Base directory for sources
        
    Returns:
        Path to saved file
    """
    # Create kebab-case filename
    topic_slug = topic_name.lower()
    topic_slug = re.sub(r'[^a-z0-9]+', '-', topic_slug)
    topic_slug = topic_slug.strip('-')
    
    # Ensure directory exists
    domain_dir = Path(base_dir) / domain_id
    domain_dir.mkdir(parents=True, exist_ok=True)
    
    # Save file
    filepath = domain_dir / f"{topic_slug}.json"
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    logger.info(f"Saved: {filepath}")
    return str(filepath)


def update_source_registry(
    sources_data: list[dict],
    registry_path_str: str = "sources/_registry.json",
) -> None:
    """
    Update the central source registry with newly discovered sources.
    """
    registry_path = Path(registry_path_str)
    
    # Load existing registry or create new
    if registry_path.exists():
        with open(registry_path, 'r') as f:
            registry = json.load(f)
    else:
        registry = {
            "version": "1.0",
            "updated_at": datetime.utcnow().isoformat(),
            "sources": {},
        }
    
    # Collect all unique sources
    for topic_data in sources_data:
        for source_list in ["primary_sources", "secondary_sources", "tertiary_sources"]:
            for source in topic_data.get(source_list, []):
                source_id = source.get("id") or source.get("name", "").lower().replace(" ", "-")[:50]
                
                if source_id not in registry["sources"]:
                    registry["sources"][source_id] = {
                        "name": source.get("name", ""),
                        "type": source.get("type", ""),
                        "organization": source.get("organization", ""),
                        "url": source.get("url", ""),
                        "reliability": source.get("reliability", ""),
                        "cited_by": [],
                    }
                
                # Track which topics cite this source
                topic_name = topic_data.get("topic", "")
                if topic_name and topic_name not in registry["sources"][source_id]["cited_by"]:
                    registry["sources"][source_id]["cited_by"].append(topic_name)
    
    registry["updated_at"] = datetime.utcnow().isoformat()
    
    # Save registry
    registry_path.parent.mkdir(parents=True, exist_ok=True)
    with open(registry_path, 'w', encoding='utf-8') as f:
        json.dump(registry, f, indent=2, ensure_ascii=False)
    
    logger.info(f"Updated registry with {len(registry['sources'])} unique sources")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Discover sources for Nephrology Knowledge Base topics"
    )
    parser.add_argument(
        "--domain",
        type=str,
        help="Process only specified domain (e.g., 01-clinical)",
    )
    parser.add_argument(
        "--topic",
        type=str,
        help="Process only specified topic",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview without saving files",
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Resume from last checkpoint",
    )
    
    args = parser.parse_args()
    
    # Initialize components
    try:
        client = LLMClient()
        validator = SchemaValidator()
        checkpoint_mgr = CheckpointManager()
    except Exception as e:
        logger.error(f"Failed to initialize: {e}")
        sys.exit(1)
    
    # Load prompt template and schema
    try:
        prompt_template = load_prompt_template("config/prompts/pass-2-sources.md")
        schema = load_schema("config/schemas/source.schema.json")
    except FileNotFoundError as e:
        logger.error(f"Required file not found: {e}")
        sys.exit(1)
    
    # Get model and config from pass settings
    pass_config = client.get_pass_config("pass-2-source-discovery")
    model = pass_config.get("primary_llm", "gemini-2-5-flash")
    max_tokens = pass_config.get("max_tokens", 4096)
    logger.info(f"Using model: {model}, max_tokens: {max_tokens}")
    
    # Domain name mapping
    domain_names = {
        "00-glossary": "Glossary",
        "01-clinical": "Clinical Knowledge",
        "02-care-delivery": "Care Delivery",
        "03-regulatory": "Regulatory Compliance",
        "04-business": "Business Operations",
        "05-emerging": "Emerging Topics",
    }
    
    # Find domains to process
    domains_dir = Path("domains")
    if args.domain:
        domain_dirs = [domains_dir / args.domain]
    else:
        domain_dirs = sorted(domains_dir.iterdir())
    
    # Check for resume
    completed_topics = []
    if args.resume:
        checkpoint = checkpoint_mgr.get_latest_checkpoint(2)
        if checkpoint:
            completed_topics = checkpoint.completed_items
            logger.info(f"Resuming from checkpoint, completed: {len(completed_topics)} topics")
    
    # Process each domain
    all_sources_data = []
    files_created = []
    
    for domain_path in domain_dirs:
        if not domain_path.is_dir():
            continue
        
        domain_id = domain_path.name
        domain_name = domain_names.get(domain_id, domain_id)
        index_path = domain_path / "_index.md"
        
        if not index_path.exists():
            logger.warning(f"No _index.md found for {domain_id}")
            continue
        
        logger.info(f"Processing domain: {domain_id}")
        
        # Extract topics
        topics = extract_topics_from_index(str(index_path))
        logger.info(f"Found {len(topics)} topics in {domain_id}")
        
        for topic in topics:
            topic_key = f"{domain_id}/{topic['name']}"
            
            # Skip if specified topic doesn't match
            if args.topic and topic["name"] != args.topic:
                continue
            
            # Skip if already completed (resume mode)
            if topic_key in completed_topics:
                logger.info(f"Skipping completed: {topic_key}")
                continue
            
            # Discover sources
            data = discover_sources_for_topic(
                client=client,
                topic=topic,
                domain_name=domain_name,
                prompt_template=prompt_template,
                schema=schema,
                model=model,
                max_tokens=max_tokens,
            )
            
            if data is None:
                logger.error(f"Failed to discover sources for {topic_key}")
                continue
            
            data["domain"] = domain_id
            all_sources_data.append(data)
            
            # Validate output
            result = validator.validate(data, "source")
            if not result.valid:
                logger.warning(f"Validation warnings for {topic_key}: {result.errors[:3]}")
            
            # Save file
            if not args.dry_run:
                filepath = save_topic_sources(domain_id, topic["name"], data)
                files_created.append(filepath)
                completed_topics.append(topic_key)
                
                # Create checkpoint after each topic
                checkpoint_mgr.create_checkpoint(
                    pass_number=2,
                    checkpoint_name=topic_key.replace("/", "-"),
                    completed_items=completed_topics.copy(),
                    pending_items=[],  # Calculate if needed
                    files_created=files_created.copy(),
                )
            else:
                logger.info(f"[DRY RUN] Would save sources for: {topic_key}")
                print(f"\n{'='*60}")
                print(f"Topic: {topic['name']}")
                print(f"Primary sources: {len(data.get('primary_sources', []))}")
                for src in data.get("primary_sources", [])[:3]:
                    print(f"  - {src.get('name', 'Unknown')}")
    
    # Update central registry
    if not args.dry_run and all_sources_data:
        update_source_registry(all_sources_data)
    
    logger.info(f"Pass 2 source discovery complete. Files created: {len(files_created)}")


if __name__ == "__main__":
    main()
