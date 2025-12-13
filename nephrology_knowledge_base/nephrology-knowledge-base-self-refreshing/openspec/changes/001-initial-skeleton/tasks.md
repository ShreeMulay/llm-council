# Tasks: Initial Skeleton Generation

## 1. Setup Configuration Files

- [ ] 1.1 Create `config/llm-configs.yaml` with pass configurations
- [ ] 1.2 Create `config/schemas/domain.schema.json` for structured output
- [ ] 1.3 Create `config/prompts/pass-1-skeleton.md` prompt template
- [ ] 1.4 Create `config/prompts/pass-1-domain.md` per-domain prompt template

## 2. Create Directory Structure

- [ ] 2.1 Create `domains/` directory
- [ ] 2.2 Create `domains/00-glossary/` directory
- [ ] 2.3 Create `domains/01-clinical/` directory
- [ ] 2.4 Create `domains/02-care-delivery/` directory
- [ ] 2.5 Create `domains/03-regulatory/` directory
- [ ] 2.6 Create `domains/04-business/` directory
- [ ] 2.7 Create `domains/05-emerging/` directory
- [ ] 2.8 Create `graph/` directory
- [ ] 2.9 Create `sources/` directory
- [ ] 2.10 Create `passes/` directory
- [ ] 2.11 Create `review-queue/` directory structure

## 3. Create Python Infrastructure

- [ ] 3.1 Create `scripts/requirements.txt` with dependencies
- [ ] 3.2 Create `scripts/utils/__init__.py`
- [ ] 3.3 Create `scripts/utils/llm_client.py` for API calls
- [ ] 3.4 Create `scripts/utils/markdown_utils.py` for MD parsing
- [ ] 3.5 Create `scripts/utils/schema_validator.py` for JSON validation
- [ ] 3.6 Create `scripts/utils/checkpoint_manager.py` for state management

## 4. Create Generation Script

- [ ] 4.1 Create `scripts/generate_skeleton.py` main script
- [ ] 4.2 Implement master index generation
- [ ] 4.3 Implement per-domain generation loop
- [ ] 4.4 Implement checkpoint after each domain
- [ ] 4.5 Implement wikilink registry initialization

## 5. Generate Master Index

- [ ] 5.1 Run generation for `domains/_index.md`
- [ ] 5.2 Validate output against schema
- [ ] 5.3 Review and adjust if needed

## 6. Generate Domain Indexes

- [ ] 6.1 Generate `domains/00-glossary/_index.md`
- [ ] 6.2 Checkpoint after glossary
- [ ] 6.3 Generate `domains/01-clinical/_index.md`
- [ ] 6.4 Checkpoint after clinical
- [ ] 6.5 Generate `domains/02-care-delivery/_index.md`
- [ ] 6.6 Checkpoint after care-delivery
- [ ] 6.7 Generate `domains/03-regulatory/_index.md`
- [ ] 6.8 Checkpoint after regulatory
- [ ] 6.9 Generate `domains/04-business/_index.md`
- [ ] 6.10 Checkpoint after business
- [ ] 6.11 Generate `domains/05-emerging/_index.md`
- [ ] 6.12 Checkpoint after emerging

## 7. Initialize Graph Registry

- [ ] 7.1 Create `graph/wikilink_registry.json`
- [ ] 7.2 Scan all generated files for wikilinks
- [ ] 7.3 Populate registry with link status
- [ ] 7.4 Log any orphan or broken links

## 8. Documentation

- [ ] 8.1 Create `README.md` with project overview
- [ ] 8.2 Create `ARCHITECTURE.md` with system design
- [ ] 8.3 Create `USAGE.md` with how to run passes
- [ ] 8.4 Create pass log in `passes/2025-Q1/pass-1/log.md`

## 9. Validation

- [ ] 9.1 Verify all `_index.md` files have valid frontmatter
- [ ] 9.2 Verify all domains have topics defined
- [ ] 9.3 Verify wikilinks use correct format
- [ ] 9.4 Verify checkpoint files are valid JSON
- [ ] 9.5 Run schema validation on all outputs
