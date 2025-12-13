# Design: Initial Skeleton Generation

## Technical Decisions

### 1. Chunked Generation Strategy

**Decision**: Generate one domain at a time rather than all domains in a single prompt.

**Rationale**:
- Avoids token limit issues
- Enables checkpoint/recovery if generation fails
- Allows validation between domains
- Each domain can have specialized prompt context

**Implementation**:
```python
domains = [
    ("00-glossary", "Glossary of nephrology terminology"),
    ("01-clinical", "Clinical nephrology knowledge"),
    ("02-care-delivery", "Care delivery models"),
    ("03-regulatory", "Regulatory compliance"),
    ("04-business", "Business operations"),
    ("05-emerging", "Emerging topics"),
]

for domain_id, domain_desc in domains:
    result = generate_domain_skeleton(domain_id, domain_desc)
    save_to_file(f"domains/{domain_id}/_index.md", result)
    create_checkpoint(domain_id)
```

### 2. JSON Structured Output

**Decision**: Use Anthropic's structured outputs feature for consistent formatting.

**Rationale**:
- Guarantees schema compliance
- No parsing errors
- Consistent field types
- Easier to process programmatically

**Schema Design**:
```json
{
  "type": "object",
  "properties": {
    "frontmatter": {
      "type": "object",
      "properties": {
        "title": {"type": "string"},
        "domain": {"type": "string"},
        "status": {"type": "string", "enum": ["skeleton"]},
        "generated_by": {"type": "string"},
        "generated_at": {"type": "string"},
        "pass": {"type": "integer"}
      },
      "required": ["title", "domain", "status", "generated_by", "generated_at", "pass"]
    },
    "description": {"type": "string"},
    "topics": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {"type": "string"},
          "description": {"type": "string"},
          "subtopics": {"type": "array", "items": {"type": "string"}},
          "priority": {"type": "string", "enum": ["high", "medium", "low"]},
          "suggested_sources": {"type": "array", "items": {"type": "string"}}
        },
        "required": ["name", "description", "priority"]
      }
    }
  },
  "required": ["frontmatter", "description", "topics"],
  "additionalProperties": false
}
```

### 3. Wikilink Registry Design

**Decision**: Maintain a JSON registry of all wikilinks with status tracking.

**Rationale**:
- Enables broken link detection
- Tracks pending (not-yet-created) links
- Supports orphan page detection
- Enables cross-reference analysis

**Registry Structure**:
```json
{
  "version": "1.0",
  "last_updated": "2025-01-15T10:00:00Z",
  "links": {
    "[[CKD Staging]]": {
      "target_path": "domains/01-clinical/ckd/staging.md",
      "status": "pending",
      "created_in_pass": 1,
      "referenced_from": [
        "domains/01-clinical/_index.md"
      ]
    }
  },
  "statistics": {
    "total_links": 0,
    "exists": 0,
    "pending": 0,
    "broken": 0
  }
}
```

### 4. Checkpoint Format

**Decision**: Use JSON checkpoints with full state recovery capability.

**Rationale**:
- Easy to parse and validate
- Human-readable for debugging
- Supports incremental progress
- Enables resume from any point

**Checkpoint Structure**:
```json
{
  "checkpoint_id": "pass-1-domain-01-clinical",
  "timestamp": "2025-01-15T10:30:00Z",
  "pass": 1,
  "completed_domains": ["00-glossary", "01-clinical"],
  "pending_domains": ["02-care-delivery", "03-regulatory", "04-business", "05-emerging"],
  "files_created": [
    "domains/00-glossary/_index.md",
    "domains/01-clinical/_index.md"
  ],
  "wikilinks_registered": 45,
  "errors": [],
  "can_resume": true
}
```

### 5. Prompt Engineering Approach

**Decision**: Use domain-specific prompts with nephrology context.

**Rationale**:
- Generic prompts may miss nephrology-specific topics
- Domain context improves relevance
- Explicit instructions reduce hallucination
- Examples guide consistent formatting

**Prompt Structure**:
```markdown
# System Prompt
You are a nephrology expert creating a knowledge base structure 
for The Kidney Experts, PLLC. Generate a comprehensive outline 
of topics for the {domain_name} domain.

# Instructions
1. List 5-10 major topics for this domain
2. For each topic, provide:
   - Clear name
   - One-sentence description
   - 3-5 subtopics for future expansion
   - Priority (high/medium/low)
   - Suggested authoritative sources
3. Use [[wikilinks]] for cross-references
4. Focus on practical, actionable knowledge
5. Ensure comprehensive coverage of nephrology practice

# Domain Context
{domain_specific_context}

# Output Format
Return JSON matching the provided schema.
```

### 6. Error Handling Strategy

**Decision**: Fail fast with detailed logging, support retry.

**Rationale**:
- Early failure detection prevents wasted API calls
- Detailed logs enable debugging
- Retry capability for transient errors
- Checkpoints enable recovery

**Error Categories**:
| Category | Action | Retry |
|----------|--------|-------|
| API rate limit | Wait + retry | Yes |
| Schema validation | Log + retry with fix | Yes |
| Token limit | Reduce scope | Yes |
| Invalid response | Log + skip | No |
| Network error | Wait + retry | Yes |

## Component Interactions

```
┌─────────────────────────────────────────────────────────────┐
│                     generate_skeleton.py                     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │  Load Config    │→ │  Load Prompts   │                   │
│  │  (YAML)         │  │  (Markdown)     │                   │
│  └─────────────────┘  └─────────────────┘                   │
│           │                    │                             │
│           ▼                    ▼                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    For Each Domain                   │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │    │
│  │  │ Build Prompt│→ │ Call Claude │→ │ Parse JSON  │  │    │
│  │  │             │  │ (Sonnet 4.5)│  │ Response    │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │    │
│  │         │                                │           │    │
│  │         ▼                                ▼           │    │
│  │  ┌─────────────┐                 ┌─────────────┐    │    │
│  │  │ Validate    │                 │ Write MD    │    │    │
│  │  │ Schema      │                 │ File        │    │    │
│  │  └─────────────┘                 └─────────────┘    │    │
│  │         │                                │           │    │
│  │         ▼                                ▼           │    │
│  │  ┌─────────────┐                 ┌─────────────┐    │    │
│  │  │ Extract     │                 │ Create      │    │    │
│  │  │ Wikilinks   │                 │ Checkpoint  │    │    │
│  │  └─────────────┘                 └─────────────┘    │    │
│  └─────────────────────────────────────────────────────┘    │
│                              │                               │
│                              ▼                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Update Wikilink Registry                │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## File Dependencies

```
config/
├── llm-configs.yaml        # Required before generation
├── schemas/
│   └── domain.schema.json  # Required for validation
└── prompts/
    ├── pass-1-skeleton.md  # Master prompt
    └── pass-1-domain.md    # Per-domain prompt

scripts/
├── utils/
│   ├── llm_client.py       # Required for API calls
│   ├── schema_validator.py # Required for validation
│   └── checkpoint_manager.py # Required for recovery
└── generate_skeleton.py    # Main script
```
