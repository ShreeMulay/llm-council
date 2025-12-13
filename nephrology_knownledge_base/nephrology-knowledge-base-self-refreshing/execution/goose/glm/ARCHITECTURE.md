# Architecture: Nephrology Knowledge Base

## System Overview

The Nephrology Knowledge Base is a self-refreshing, AI-generated knowledge system that uses recursive multi-pass generation with multi-LLM concurrence to create accurate, citation-backed medical content.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           QUARTERLY REFRESH TRIGGER                         │
│                    (Cloud Scheduler / Manual / n8n)                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MULTI-PASS GENERATION PIPELINE                           │
│                                                                             │
│  Pass 1        Pass 2         Pass 3         Pass 4         Pass 5         │
│  Skeleton  →   Sources    →   Content    →   Validate   →   Link          │
│  (Sonnet)      (Gemini)       (Sonnet)       (Opus+)        (Sonnet)       │
│                                                                             │
│  Creates       Finds          Generates      Cross-LLM      Builds         │
│  structure     authoritative  content from   fact           knowledge      │
│                sources        sources        checking       graph          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VALIDATION & REVIEW                                 │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │
│  │ Citation    │  │ Multi-LLM   │  │ Link        │  │ Human Review    │   │
│  │ Verification│  │ Concurrence │  │ Integrity   │  │ Queue           │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            OUTPUT LAYERS                                    │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │ Static Markdown │  │ Knowledge Graph │  │ Zep (Graphiti)              │ │
│  │ (domains/)      │  │ (graph/)        │  │ Temporal Memory             │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Core Design Principles

### 1. Citation-First Architecture

**Principle**: Sources are discovered before content is generated.

```
Traditional Approach:
  Generate Content → Add Citations (hallucination risk)

Our Approach:
  Discover Sources → Extract from Sources → Generate with Citations
```

This eliminates hallucination by ensuring every fact has a verified source before it's written.

### 2. Multi-Pass Validation

**Principle**: Different LLMs validate each pass for concurrence.

| Pass | Generator | Validator | Min Agreement |
|------|-----------|-----------|---------------|
| 1 | Sonnet 4.5 | Schema validation | 100% |
| 2 | Gemini | Sonnet 4.5 | 80% |
| 3 | Sonnet 4.5 | Opus 4.5 + Gemini | 80% |
| 4 | Opus 4.5 | Human review | 100% |
| 5 | Sonnet 4.5 | Automated | 100% |

### 3. Checkpoint Recovery

**Principle**: State is saved after each operation for recovery.

```
passes/2025-Q1/pass-1/
├── checkpoint-00-glossary.json
├── checkpoint-01-clinical.json
├── checkpoint-02-care-delivery.json
├── checkpoint-03-regulatory.json
├── checkpoint-04-business.json
├── checkpoint-05-emerging.json
├── checkpoint-complete.json
└── log.md
```

If generation fails, resume from the last checkpoint.

### 4. Link Integrity

**Principle**: All wikilinks are tracked and validated.

```json
// graph/wikilink_registry.json
{
  "[[CKD Staging]]": {
    "target_path": "domains/01-clinical/ckd/staging.md",
    "status": "pending",  // exists | pending | broken
    "created_in_pass": 1,
    "referenced_from": ["domains/01-clinical/_index.md"]
  }
}
```

- No broken links allowed
- Orphan pages flagged for review
- Cross-references validated after each pass

## Component Architecture

### LLM Client (`scripts/utils/llm_client.py`)

Unified interface for multiple LLM providers:

```python
class LLMClient:
    def generate(
        self,
        prompt: str,
        model: str = "claude-sonnet-4-5",
        schema: Optional[dict] = None,  # For structured output
    ) -> LLMResponse:
        """Generate content using specified model."""
        
    def generate_with_concurrence(
        self,
        prompt: str,
        models: list[str],
    ) -> dict:
        """Generate with multiple models for validation."""
```

### Schema Validator (`scripts/utils/schema_validator.py`)

Ensures LLM outputs conform to expected structure:

```python
class SchemaValidator:
    def validate(self, data: Any, schema_name: str) -> ValidationResult:
        """Validate against named schema."""
        
    def is_schema_compatible(self, schema: dict) -> tuple[bool, list[str]]:
        """Check LLM structured output compatibility."""
```

### Checkpoint Manager (`scripts/utils/checkpoint_manager.py`)

Manages state for recovery:

```python
class CheckpointManager:
    def create_checkpoint(
        self,
        pass_number: int,
        checkpoint_name: str,
        completed_items: list[str],
        pending_items: list[str],
    ) -> Checkpoint:
        """Create and save checkpoint."""
        
    def resume_from_checkpoint(self, pass_number: int) -> Checkpoint:
        """Resume from latest checkpoint."""
```

### Markdown Utils (`scripts/utils/markdown_utils.py`)

Handles markdown parsing and rendering:

```python
def render_domain_index(data: dict, domain_id: str) -> str:
    """Render domain _index.md from structured data."""
    
def extract_wikilinks(content: str) -> list[dict]:
    """Extract all wikilinks with targets and display text."""
```

## Data Flow

### Pass 1: Skeleton Generation

```
Input:
  - Domain definitions (hardcoded)
  - Prompt template (config/prompts/pass-1-skeleton.md)
  - Schema (config/schemas/domain.schema.json)

Process:
  1. For each domain:
     a. Build prompt with domain context
     b. Call Claude Sonnet 4.5 with structured output
     c. Validate response against schema
     d. Render to markdown
     e. Save to domains/{domain}/_index.md
     f. Create checkpoint
  2. Initialize wikilink registry
  3. Mark pass complete

Output:
  - domains/_index.md (master index)
  - domains/{00-05}-*/_index.md (domain indexes)
  - graph/wikilink_registry.json
  - passes/2025-Q1/pass-1/checkpoint-complete.json
```

### Pass 2: Source Discovery

```
Input:
  - Topic list from Pass 1
  - Source hierarchy (primary > secondary > tertiary)

Process:
  1. For each topic:
     a. Search for authoritative sources
     b. Extract relevant excerpts
     c. Store in sources/{source-id}.md
     d. Update sources/_registry.json
  2. Checkpoint after each topic

Output:
  - sources/*.md (source summaries)
  - sources/_registry.json (source metadata)
```

### Pass 3: Content Generation

```
Input:
  - Topic skeleton from Pass 1
  - Sources from Pass 2

Process:
  1. For each topic:
     a. Load relevant sources
     b. Generate content ONLY from sources
     c. Require inline citations
     d. Mark gaps as {{NEEDS_SOURCE}}
     e. Save to domains/{domain}/{topic}.md
  2. Checkpoint after each topic

Output:
  - domains/{domain}/{topic}.md (detailed content)
  - review-queue/unverified-claims/*.md (flagged items)
```

### Pass 4: Validation

```
Input:
  - Content from Pass 3
  - Sources from Pass 2

Process:
  1. For each content file:
     a. Extract all claims
     b. Verify citations support claims
     c. Run multi-LLM concurrence check
     d. Flag disagreements
  2. Generate validation report

Output:
  - Annotated content with validation status
  - review-queue/contradictions/*.md
  - Concurrence report
```

### Pass 5: Cross-Linking

```
Input:
  - All content files
  - Wikilink registry

Process:
  1. Extract entities from content
  2. Identify relationships
  3. Add wikilinks where relevant
  4. Update graph files
  5. Validate all links resolve

Output:
  - graph/entities.json
  - graph/relationships.json
  - Updated content with wikilinks
  - Link integrity report
```

## Schema Design

### LLM Compatibility Constraints

Anthropic's structured outputs have limitations:

```
✓ Allowed:
  - Simple types: string, number, boolean, array, object
  - Nested objects
  - Arrays of objects
  - Enums

✗ Not Allowed at Top Level:
  - oneOf
  - allOf
  - anyOf
```

All schemas in `config/schemas/` follow these constraints.

## Error Handling

### Retry Strategy

```yaml
retry:
  max_attempts: 3
  backoff_base: 2
  backoff_max: 60
  retryable_errors:
    - rate_limit
    - timeout
    - server_error
```

### Error Categories

| Category | Action | Retry |
|----------|--------|-------|
| Rate limit | Wait with backoff | Yes |
| Schema validation | Log, retry with hints | Yes |
| Token limit | Reduce scope, retry | Yes |
| Invalid response | Log, skip | No |
| Network error | Wait, retry | Yes |

## Future Enhancements

### n8n Integration

Workflow automation for:
- Scheduled quarterly regeneration
- Human review notifications
- Multi-step orchestration
- Monitoring and alerting

### Zep/Graphiti Integration

Temporal knowledge graph for:
- Tracking changes over time
- "What was the guidance in 2024 vs 2025?"
- Entity evolution
- RAG-ready queries

### Additional LLMs

- MedGamma for specialized medical validation
- Local models for cost optimization
- Ensemble approaches for higher accuracy
