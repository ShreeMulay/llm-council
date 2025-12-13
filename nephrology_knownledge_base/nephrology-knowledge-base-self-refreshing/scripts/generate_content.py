#!/usr/bin/env python3
"""
Generate Content - Pass 3 of the knowledge base generation pipeline.

This script generates citation-first content for each topic using
the sources discovered in Pass 2.

Usage:
    python scripts/generate_content.py [--domain DOMAIN] [--topic TOPIC] [--dry-run]
    
Examples:
    python scripts/generate_content.py                        # All topics
    python scripts/generate_content.py --domain 01-clinical   # Single domain
    python scripts/generate_content.py --dry-run              # Preview mode
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


def load_topic_sources(domain_id: str, topic_name: str) -> Optional[dict]:
    """
    Load discovered sources for a topic from Pass 2.
    
    Returns source data or None if not found.
    """
    # Create kebab-case filename
    topic_slug = topic_name.lower()
    topic_slug = re.sub(r'[^a-z0-9]+', '-', topic_slug)
    topic_slug = topic_slug.strip('-')
    
    source_path = Path("sources") / domain_id / f"{topic_slug}.json"
    
    if not source_path.exists():
        logger.warning(f"Source file not found: {source_path}")
        return None
    
    with open(source_path, 'r') as f:
        return json.load(f)


def format_sources_for_prompt(source_data: dict) -> str:
    """Format sources for inclusion in the prompt."""
    lines = []
    
    for tier in ["primary_sources", "secondary_sources", "tertiary_sources"]:
        sources = source_data.get(tier, [])
        if sources:
            tier_name = tier.replace("_", " ").title()
            lines.append(f"### {tier_name}")
            for src in sources:
                name = src.get("name", "Unknown")
                org = src.get("organization", "")
                relevance = src.get("relevance", "")
                url = src.get("url", "")
                
                lines.append(f"- **{name}** ({org})")
                if relevance:
                    lines.append(f"  - Relevance: {relevance}")
                if url:
                    lines.append(f"  - URL: {url}")
            lines.append("")
    
    return "\n".join(lines)


def extract_topics_from_index(index_path: str) -> list[dict]:
    """Extract topic information from a domain _index.md file."""
    doc = load_markdown_file(index_path)
    content = doc.content
    
    topics = []
    
    # Pattern to match topic entries
    topic_pattern = r'-\s+\*\*\[\[([^\]]+)\]\]\*\*:\s*(.+?)(?=\n\s+-\s+\*\*\[\[|\n\s*\n##|\Z)'
    
    matches = re.findall(topic_pattern, content, re.DOTALL)
    
    for match in matches:
        name = match[0].strip()
        block = match[1].strip()
        
        topic = {
            "name": name,
            "description": "",
            "subtopics": [],
        }
        
        lines = block.split('\n')
        desc_lines = []
        
        for line in lines:
            line_stripped = line.strip()
            if line_stripped.startswith('- Subtopics:'):
                subtopics_str = line_stripped.replace('- Subtopics:', '').strip()
                topic["subtopics"] = [s.strip() for s in subtopics_str.split(',')]
            elif not line_stripped.startswith('-'):
                if line_stripped:
                    desc_lines.append(line_stripped)
        
        topic["description"] = ' '.join(desc_lines)
        topics.append(topic)
    
    return topics


def generate_topic_content(
    client: LLMClient,
    topic: dict,
    domain_name: str,
    source_data: dict,
    prompt_template: str,
    model: str = "claude-sonnet-4-5",
    max_tokens: int = 8192,
) -> Optional[dict]:
    """
    Generate content for a single topic using discovered sources.
    """
    topic_name = topic["name"]
    description = topic.get("description", "")
    subtopics = topic.get("subtopics", [])
    
    logger.info(f"Generating content for: {topic_name}")
    
    # Format sources for prompt
    sources_text = format_sources_for_prompt(source_data)
    
    # Build prompt
    prompt = prompt_template.replace("{{TOPIC_NAME}}", topic_name)
    prompt = prompt.replace("{{DOMAIN_NAME}}", domain_name)
    prompt = prompt.replace("{{TOPIC_DESCRIPTION}}", description)
    prompt = prompt.replace("{{SUBTOPICS}}", ", ".join(subtopics) if subtopics else "None specified")
    prompt = prompt.replace("{{SOURCES}}", sources_text)
    
    try:
        response = client.generate(
            prompt=prompt,
            model=model,
            temperature=0.2,
            max_tokens=max_tokens,
            schema=None,
        )
        
        # Parse JSON from response
        content = response.content.strip()
        
        # Remove markdown code blocks if present
        if content.startswith("```"):
            first_newline = content.find("\n")
            if first_newline > 0:
                content = content[first_newline + 1:]
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
        data["generated_at"] = datetime.utcnow().isoformat()
        
        section_count = len(data.get("content", {}).get("sections", []))
        citation_count = len(data.get("citations_used", []))
        logger.info(f"Generated {section_count} sections with {citation_count} citations for {topic_name}")
        
        return data
        
    except Exception as e:
        logger.error(f"Failed to generate content for {topic_name}: {e}")
        return None


def render_topic_markdown(data: dict, domain_id: str) -> str:
    """
    Render topic content to markdown format.
    """
    topic = data.get("topic", "Unknown Topic")
    generated_at = data.get("generated_at", datetime.utcnow().isoformat())
    content_obj = data.get("content", {})
    citations = data.get("citations_used", [])
    gaps = data.get("gaps_noted", [])
    
    # Build frontmatter
    frontmatter = f"""---
title: "{topic}"
domain: {domain_id}
status: draft
generated_by: claude-sonnet-4-5
generated_at: {generated_at}
pass: 3
citations_count: {len(citations)}
---
"""
    
    # Build content
    lines = [frontmatter]
    lines.append(f"# {topic}\n")
    
    # Overview
    overview = content_obj.get("overview", "")
    if overview:
        lines.append(overview)
        lines.append("")
    
    # Sections
    for section in content_obj.get("sections", []):
        heading = section.get("heading", "Section")
        content = section.get("content", "")
        lines.append(f"## {heading}\n")
        lines.append(content)
        lines.append("")
    
    # Clinical Practice Points
    clinical_points = content_obj.get("clinical_points", [])
    if clinical_points:
        lines.append("## Key Clinical Practice Points\n")
        for point in clinical_points:
            lines.append(f"- {point}")
        lines.append("")
    
    # Gaps noted
    if gaps:
        lines.append("## Information Gaps\n")
        lines.append("*The following areas had insufficient source coverage:*\n")
        for gap in gaps:
            lines.append(f"- {gap}")
        lines.append("")
    
    # References
    if citations:
        lines.append("## References\n")
        for i, citation in enumerate(citations, 1):
            lines.append(f"{i}. {citation}")
        lines.append("")
    
    return "\n".join(lines)


def save_topic_content(
    domain_id: str,
    topic_name: str,
    data: dict,
    base_dir: str = "domains",
) -> str:
    """
    Save generated content to markdown file.
    """
    # Create kebab-case filename
    topic_slug = topic_name.lower()
    topic_slug = re.sub(r'[^a-z0-9]+', '-', topic_slug)
    topic_slug = topic_slug.strip('-')
    
    # Ensure directory exists
    domain_dir = Path(base_dir) / domain_id
    domain_dir.mkdir(parents=True, exist_ok=True)
    
    # Render markdown
    markdown_content = render_topic_markdown(data, domain_id)
    
    # Save file
    filepath = domain_dir / f"{topic_slug}.md"
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(markdown_content)
    
    logger.info(f"Saved: {filepath}")
    return str(filepath)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Generate content for Nephrology Knowledge Base topics"
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
    
    # Load prompt template
    try:
        prompt_template = load_prompt_template("config/prompts/pass-3-content.md")
    except FileNotFoundError as e:
        logger.error(f"Required file not found: {e}")
        sys.exit(1)
    
    # Get model and config from pass settings
    pass_config = client.get_pass_config("pass-3-content-generation")
    model = pass_config.get("primary_llm", "claude-sonnet-4-5")
    max_tokens = pass_config.get("max_tokens", 8192)
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
        checkpoint = checkpoint_mgr.get_latest_checkpoint(3)
        if checkpoint:
            completed_topics = checkpoint.completed_items
            logger.info(f"Resuming from checkpoint, completed: {len(completed_topics)} topics")
    
    # Process each domain
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
            
            # Load sources from Pass 2
            source_data = load_topic_sources(domain_id, topic["name"])
            if source_data is None:
                logger.error(f"No sources found for {topic_key}, skipping")
                continue
            
            # Generate content
            data = generate_topic_content(
                client=client,
                topic=topic,
                domain_name=domain_name,
                source_data=source_data,
                prompt_template=prompt_template,
                model=model,
                max_tokens=max_tokens,
            )
            
            if data is None:
                logger.error(f"Failed to generate content for {topic_key}")
                continue
            
            data["domain"] = domain_id
            
            # Validate output
            result = validator.validate(data, "topic")
            if not result.valid:
                logger.warning(f"Validation warnings for {topic_key}: {result.errors[:3]}")
            
            # Save file
            if not args.dry_run:
                filepath = save_topic_content(domain_id, topic["name"], data)
                files_created.append(filepath)
                completed_topics.append(topic_key)
                
                # Create checkpoint after each topic
                checkpoint_mgr.create_checkpoint(
                    pass_number=3,
                    checkpoint_name=topic_key.replace("/", "-"),
                    completed_items=completed_topics.copy(),
                    pending_items=[],
                    files_created=files_created.copy(),
                )
            else:
                logger.info(f"[DRY RUN] Would save content for: {topic_key}")
                print(f"\n{'='*60}")
                print(f"Topic: {topic['name']}")
                print(f"Sections: {len(data.get('content', {}).get('sections', []))}")
                print(f"Citations: {len(data.get('citations_used', []))}")
                if data.get("gaps_noted"):
                    print(f"Gaps: {data['gaps_noted']}")
    
    logger.info(f"Pass 3 content generation complete. Files created: {len(files_created)}")


if __name__ == "__main__":
    main()
