#!/usr/bin/env python3
"""
Generate Skeleton - Pass 1 of the knowledge base generation pipeline.

This script generates the initial skeleton structure for the Nephrology Knowledge Base,
including the master index and all domain index files.

Usage:
    python scripts/generate_skeleton.py [--domain DOMAIN] [--dry-run]
    
Examples:
    python scripts/generate_skeleton.py                    # Generate all domains
    python scripts/generate_skeleton.py --domain 01-clinical  # Generate single domain
    python scripts/generate_skeleton.py --dry-run          # Preview without saving
"""

import argparse
import json
import logging
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.utils.llm_client import LLMClient
from scripts.utils.markdown_utils import render_domain_index
from scripts.utils.schema_validator import SchemaValidator
from scripts.utils.checkpoint_manager import CheckpointManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Domain definitions
DOMAINS = [
    {
        "id": "00-glossary",
        "name": "Glossary",
        "context": """
The Glossary domain contains terminology definitions for nephrology practice.
Include terms related to:
- Clinical measurements (GFR, Kt/V, URR, etc.)
- Disease classifications (CKD stages, AKI criteria)
- Treatment modalities (hemodialysis, peritoneal dialysis)
- Regulatory terms (QIP, ESRD, bundled payments)
- Business terms (RCM, prior authorization)

Focus on terms that practitioners and staff need to understand for daily operations.
        """,
    },
    {
        "id": "01-clinical",
        "name": "Clinical Knowledge",
        "context": """
The Clinical domain contains medical knowledge for nephrology practice.
Include topics covering:
- Chronic Kidney Disease (CKD) - staging, progression, management
- End-Stage Renal Disease (ESRD) - modality selection, care
- Acute Kidney Injury (AKI) - recognition, management
- Dialysis - hemodialysis, peritoneal dialysis, home modalities
- Transplantation - evaluation, referral, post-transplant care
- Medications - dosing adjustments, drug interactions
- Lab interpretation - GFR, electrolytes, anemia markers
- Comorbidities - diabetes, hypertension, cardiovascular disease in CKD

Reference KDIGO guidelines as the primary authoritative source.
        """,
    },
    {
        "id": "02-care-delivery",
        "name": "Care Delivery",
        "context": """
The Care Delivery domain covers models and approaches for delivering nephrology care.
Include topics covering:
- Value-based care models (Kidney Care Choices, ACOs)
- Home dialysis programs (PD, home HD)
- Care coordination and transitions
- Patient education approaches
- Quality improvement initiatives
- Multidisciplinary team models
- Telehealth and remote monitoring

Focus on practical implementation for a nephrology practice.
        """,
    },
    {
        "id": "03-regulatory",
        "name": "Regulatory Compliance",
        "context": """
The Regulatory domain covers compliance requirements for nephrology practices and dialysis facilities.
Include topics covering:
- CMS ESRD regulations and requirements
- Conditions for Coverage (CfC) for dialysis facilities
- ESRD Quality Incentive Program (QIP)
- Star ratings and quality measures
- Federal Register updates affecting nephrology
- State-specific regulations
- Medicare and Medicaid requirements

Reference CMS official documents as primary sources.
        """,
    },
    {
        "id": "04-business",
        "name": "Business Operations",
        "context": """
The Business domain covers operational and financial aspects of nephrology practice.
Include topics covering:
- Revenue cycle management for nephrology/dialysis
- ESRD Prospective Payment System and bundled payments
- Staffing models and ratios
- Facility operations and management
- Quality and financial reporting
- Contracting with payers
- Coding and billing for nephrology services

Focus on practical business knowledge for practice administrators.
        """,
    },
    {
        "id": "05-emerging",
        "name": "Emerging Topics",
        "context": """
The Emerging domain covers new developments and future directions in nephrology.
Include topics covering:
- AI and machine learning applications in nephrology
- Precision medicine and genomics
- Digital health tools and apps
- New therapeutic approaches
- Clinical trials and pipeline drugs
- Wearable kidney devices
- Health equity initiatives

Focus on developments relevant to clinical practice in the next 3-5 years.
        """,
    },
]


def load_prompt_template(template_path: str) -> str:
    """Load prompt template from file."""
    with open(template_path, 'r') as f:
        return f.read()


def load_schema(schema_path: str) -> dict:
    """Load JSON schema from file."""
    with open(schema_path, 'r') as f:
        return json.load(f)


def generate_domain_skeleton(
    client: LLMClient,
    domain: dict,
    prompt_template: str,
    schema: dict,
    model: str = "gemini-2-5-pro",
    max_tokens: int = 8192,
    dry_run: bool = False,
) -> Optional[dict]:
    """
    Generate skeleton for a single domain.
    
    Args:
        client: LLM client instance
        domain: Domain definition dict
        prompt_template: Prompt template string
        schema: JSON schema for output
        model: Model identifier from config
        max_tokens: Maximum tokens for generation
        dry_run: If True, don't save files
        
    Returns:
        Generated domain data or None on failure
    """
    domain_id = domain["id"]
    domain_name = domain["name"]
    domain_context = domain["context"]
    
    logger.info(f"Generating skeleton for domain: {domain_id}")
    
    # Build prompt
    prompt = prompt_template.replace("{{DOMAIN_NAME}}", domain_name)
    prompt = prompt.replace("{{DOMAIN_CONTEXT}}", domain_context)
    
    # Add output instructions
    prompt += f"""

## Required Output

Generate a complete skeleton for the **{domain_name}** domain.

Return valid JSON matching this schema structure:
- frontmatter: title, domain ({domain_id}), status (skeleton), generated_by, generated_at, pass (1)
- description: 1-3 sentence description of domain scope
- topics: array of 5-10 topics with name, wikilink, description, subtopics, priority, suggested_sources
- cross_domain_links: array of related topics in other domains
- authoritative_sources: array of key sources for this domain
"""
    
    try:
        # Generate using configured model
        response = client.generate(
            prompt=prompt,
            model=model,
            temperature=0.3,
            max_tokens=max_tokens,
            schema=schema,
        )
        
        if response.structured_output:
            data = response.structured_output
        else:
            # Try to parse content as JSON
            data = json.loads(response.content)
        
        # Ensure frontmatter has required fields
        if "frontmatter" not in data:
            data["frontmatter"] = {}
        
        data["frontmatter"]["domain"] = domain_id
        data["frontmatter"]["title"] = domain_name
        data["frontmatter"]["status"] = "skeleton"
        data["frontmatter"]["generated_by"] = response.model
        data["frontmatter"]["generated_at"] = datetime.utcnow().isoformat()
        data["frontmatter"]["pass"] = 1
        
        logger.info(f"Generated {len(data.get('topics', []))} topics for {domain_id}")
        return data
        
    except Exception as e:
        logger.error(f"Failed to generate skeleton for {domain_id}: {e}")
        return None


def save_domain_index(domain_id: str, data: dict, base_dir: str = "domains") -> str:
    """
    Save domain index file.
    
    Args:
        domain_id: Domain identifier
        data: Generated domain data
        base_dir: Base directory for domains
        
    Returns:
        Path to saved file
    """
    # Ensure directory exists
    domain_dir = Path(base_dir) / domain_id
    domain_dir.mkdir(parents=True, exist_ok=True)
    
    # Render markdown
    markdown_content = render_domain_index(data, domain_id)
    
    # Save file
    filepath = domain_dir / "_index.md"
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(markdown_content)
    
    logger.info(f"Saved: {filepath}")
    return str(filepath)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Generate skeleton structure for Nephrology Knowledge Base"
    )
    parser.add_argument(
        "--domain",
        type=str,
        help="Generate only specified domain (e.g., 01-clinical)",
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
        prompt_template = load_prompt_template("config/prompts/pass-1-skeleton.md")
        schema = load_schema("config/schemas/domain.schema.json")
    except FileNotFoundError as e:
        logger.error(f"Required file not found: {e}")
        sys.exit(1)
    
    # Validate schema compatibility
    is_compatible, issues = validator.is_schema_compatible(schema)
    if not is_compatible:
        logger.warning(f"Schema compatibility issues: {issues}")
    
    # Determine which domains to process
    if args.domain:
        domains_to_process = [d for d in DOMAINS if d["id"] == args.domain]
        if not domains_to_process:
            logger.error(f"Domain not found: {args.domain}")
            sys.exit(1)
    else:
        domains_to_process = DOMAINS
    
    # Check for resume
    completed_domains = []
    if args.resume:
        checkpoint = checkpoint_mgr.get_latest_checkpoint(1)
        if checkpoint:
            completed_domains = checkpoint.completed_items
            logger.info(f"Resuming from checkpoint, completed: {completed_domains}")
    
    # Get model and max_tokens from pass config
    pass_config = client.get_pass_config("pass-1-skeleton")
    model = pass_config.get("primary_llm", "gemini-2-5-pro")
    max_tokens = pass_config.get("max_tokens", 8192)
    logger.info(f"Using model: {model}, max_tokens: {max_tokens}")
    
    # Process each domain
    files_created = []
    
    for domain in domains_to_process:
        domain_id = domain["id"]
        
        # Skip if already completed (resume mode)
        if domain_id in completed_domains:
            logger.info(f"Skipping already completed: {domain_id}")
            continue
        
        # Generate skeleton
        data = generate_domain_skeleton(
            client=client,
            domain=domain,
            prompt_template=prompt_template,
            schema=schema,
            model=model,
            max_tokens=max_tokens,
            dry_run=args.dry_run,
        )
        
        if data is None:
            logger.error(f"Failed to generate {domain_id}, stopping")
            break
        
        # Validate output
        result = validator.validate(data, "domain")
        if not result.valid:
            logger.warning(f"Validation warnings for {domain_id}: {result.errors}")
        
        # Save file
        if not args.dry_run:
            filepath = save_domain_index(domain_id, data)
            files_created.append(filepath)
            completed_domains.append(domain_id)
            
            # Create checkpoint
            pending = [d["id"] for d in DOMAINS if d["id"] not in completed_domains]
            checkpoint_mgr.create_checkpoint(
                pass_number=1,
                checkpoint_name=domain_id,
                completed_items=completed_domains.copy(),
                pending_items=pending,
                files_created=files_created.copy(),
            )
        else:
            logger.info(f"[DRY RUN] Would save: domains/{domain_id}/_index.md")
            print(f"\n{'='*60}")
            print(f"Domain: {domain_id}")
            print(f"Topics: {len(data.get('topics', []))}")
            for topic in data.get("topics", []):
                print(f"  - {topic.get('name')}: {topic.get('description', '')[:50]}...")
    
    # Mark complete if all domains processed
    if not args.dry_run and len(completed_domains) == len(DOMAINS):
        checkpoint_mgr.mark_complete(1)
        checkpoint_mgr.write_log(1, f"Pass 1 complete. Generated {len(files_created)} files.")
    
    logger.info(f"Pass 1 skeleton generation complete. Files created: {len(files_created)}")


if __name__ == "__main__":
    main()
