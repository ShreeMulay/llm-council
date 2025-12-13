"""
Markdown Utilities - Parsing and rendering markdown files.

Handles:
- YAML frontmatter parsing
- Wikilink extraction
- Domain index rendering
"""

import re
from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime

import yaml


@dataclass
class MarkdownDocument:
    """Represents a parsed markdown document with frontmatter."""
    
    frontmatter: dict = field(default_factory=dict)
    content: str = ""
    filepath: Optional[str] = None
    
    def to_string(self) -> str:
        """Render document as string with YAML frontmatter."""
        fm_yaml = yaml.dump(self.frontmatter, default_flow_style=False, allow_unicode=True)
        return f"---\n{fm_yaml}---\n\n{self.content}"
    
    def save(self, filepath: Optional[str] = None) -> None:
        """Save document to file."""
        path = filepath or self.filepath
        if not path:
            raise ValueError("No filepath specified")
        
        with open(path, 'w', encoding='utf-8') as f:
            f.write(self.to_string())
    
    def get_wikilinks(self) -> list[str]:
        """Extract all wikilinks from content."""
        pattern = r'\[\[([^\]|]+)(?:\|[^\]]+)?\]\]'
        return re.findall(pattern, self.content)


def parse_frontmatter(content: str) -> tuple[dict, str]:
    """
    Parse YAML frontmatter from markdown content.
    
    Args:
        content: Full markdown content with optional frontmatter
        
    Returns:
        Tuple of (frontmatter dict, remaining content)
    """
    if not content.startswith('---'):
        return {}, content
    
    parts = content.split('---', 2)
    if len(parts) < 3:
        return {}, content
    
    try:
        frontmatter = yaml.safe_load(parts[1])
        body = parts[2].lstrip('\n')
        return frontmatter or {}, body
    except yaml.YAMLError:
        return {}, content


def load_markdown_file(filepath: str) -> MarkdownDocument:
    """Load and parse a markdown file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    frontmatter, body = parse_frontmatter(content)
    return MarkdownDocument(
        frontmatter=frontmatter,
        content=body,
        filepath=filepath,
    )


def extract_wikilinks(content: str) -> list[dict]:
    """
    Extract all wikilinks with their details.
    
    Args:
        content: Markdown content
        
    Returns:
        List of dicts with 'target' and 'display' keys
    """
    pattern = r'\[\[([^\]|]+)(?:\|([^\]]+))?\]\]'
    matches = re.findall(pattern, content)
    
    links = []
    for match in matches:
        target = match[0].strip()
        display = match[1].strip() if match[1] else target
        links.append({
            "target": target,
            "display": display,
        })
    
    return links


def render_domain_index(data: dict, domain_id: str) -> str:
    """
    Render a domain index markdown file from structured data.
    
    Args:
        data: Structured data from LLM (matching domain.schema.json)
        domain_id: Domain identifier (e.g., '01-clinical')
        
    Returns:
        Complete markdown document as string
    """
    # Build frontmatter
    fm = data.get("frontmatter", {})
    fm.setdefault("title", f"Domain {domain_id}")
    fm.setdefault("domain", domain_id)
    fm.setdefault("status", "skeleton")
    fm.setdefault("generated_at", datetime.utcnow().isoformat())
    fm.setdefault("pass", 1)
    
    frontmatter_yaml = yaml.dump(fm, default_flow_style=False, allow_unicode=True)
    
    # Build content
    lines = []
    
    # Title and description
    lines.append(f"# {fm['title']}")
    lines.append("")
    lines.append(data.get("description", ""))
    lines.append("")
    
    # Topics section
    lines.append("## Topics")
    lines.append("")
    
    for topic in data.get("topics", []):
        name = topic.get("name", "Unnamed Topic")
        wikilink = topic.get("wikilink", f"[[{name}]]")
        description = topic.get("description", "")
        priority = topic.get("priority", "medium")
        subtopics = topic.get("subtopics", [])
        sources = topic.get("suggested_sources", [])
        
        lines.append(f"- **{wikilink}**: {description}")
        
        if subtopics:
            subtopics_str = ", ".join(subtopics)
            lines.append(f"  - Subtopics: {subtopics_str}")
        
        lines.append(f"  - Priority: {priority}")
        
        if sources:
            sources_str = ", ".join(sources)
            lines.append(f"  - Sources: {sources_str}")
        
        lines.append("")
    
    # Cross-domain links
    cross_links = data.get("cross_domain_links", [])
    if cross_links:
        lines.append("## Related Topics in Other Domains")
        lines.append("")
        for link in cross_links:
            lines.append(f"- {link}")
        lines.append("")
    
    # Authoritative sources
    sources = data.get("authoritative_sources", [])
    if sources:
        lines.append("## Authoritative Sources")
        lines.append("")
        for source in sources:
            name = source.get("name", "Unknown")
            source_type = source.get("type", "")
            org = source.get("organization", "")
            url = source.get("url", "")
            
            source_line = f"- **{name}**"
            if org:
                source_line += f" ({org})"
            if source_type:
                source_line += f" - {source_type}"
            lines.append(source_line)
            
            if url:
                lines.append(f"  - URL: {url}")
        lines.append("")
    
    content = "\n".join(lines)
    
    return f"---\n{frontmatter_yaml}---\n\n{content}"


def render_master_index(domains: list[dict]) -> str:
    """
    Render the master domains/_index.md file.
    
    Args:
        domains: List of domain summaries
        
    Returns:
        Complete markdown document as string
    """
    frontmatter = {
        "title": "Nephrology Knowledge Base",
        "status": "skeleton",
        "generated_at": datetime.utcnow().isoformat(),
        "pass": 1,
    }
    
    frontmatter_yaml = yaml.dump(frontmatter, default_flow_style=False, allow_unicode=True)
    
    lines = []
    lines.append("# Nephrology Knowledge Base")
    lines.append("")
    lines.append("A comprehensive knowledge base for The Kidney Experts, PLLC covering all aspects of nephrology practice.")
    lines.append("")
    lines.append("## Domains")
    lines.append("")
    
    for domain in domains:
        domain_id = domain.get("id", "")
        title = domain.get("title", "")
        description = domain.get("description", "")
        topic_count = domain.get("topic_count", 0)
        
        lines.append(f"### [[{title}|{domain_id}/_index]]")
        lines.append("")
        lines.append(description)
        lines.append(f"- Topics: {topic_count}")
        lines.append("")
    
    content = "\n".join(lines)
    
    return f"---\n{frontmatter_yaml}---\n\n{content}"
