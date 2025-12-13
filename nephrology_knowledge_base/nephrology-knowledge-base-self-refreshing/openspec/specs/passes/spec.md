# Passes Specification

## Purpose

Defines the multi-pass generation system for creating and validating knowledge base content. Each pass uses specific LLMs and has defined inputs/outputs.

## Requirements

### Requirement: Pass System Overview
The system SHALL use a multi-pass approach for content generation and validation.

#### Scenario: Pass Sequence
- GIVEN the generation pipeline
- WHEN executed fully
- THEN it MUST run passes in this order:
  1. Pass 1: Skeleton Generation
  2. Pass 2: Source Discovery
  3. Pass 3: Citation-First Content Generation
  4. Pass 4: Cross-LLM Validation
  5. Pass 5: Cross-Linking

### Requirement: Pass 1 - Skeleton Generation
The system SHALL generate skeleton structure using Claude Sonnet 4.5.

#### Scenario: Pass 1 Execution
- GIVEN Pass 1 is triggered
- WHEN executed
- THEN it MUST:
  - Generate `domains/_index.md` (master outline)
  - Generate `domains/NN-domain/_index.md` for each domain
  - Use outline style (bullet lists)
  - Include topic descriptions and subtopics
  - Suggest authoritative sources
  - NOT include detailed content (skeleton only)

#### Scenario: Pass 1 Chunking
- GIVEN Pass 1 needs to generate multiple domains
- WHEN executed
- THEN it MUST generate one domain at a time
- AND checkpoint after each domain
- AND validate links after all domains complete

#### Scenario: Pass 1 Output Format
- GIVEN Pass 1 output
- WHEN structured
- THEN each `_index.md` MUST use JSON structured output
- AND schema MUST comply with `config/schemas/domain.schema.json`

### Requirement: Pass 2 - Source Discovery
The system SHALL discover and retrieve authoritative sources.

#### Scenario: Pass 2 Execution
- GIVEN Pass 2 is triggered
- WHEN executed
- THEN it MUST:
  - Read topic list from Pass 1 skeleton
  - Search for authoritative sources per topic
  - Extract relevant excerpts
  - Store source metadata in `sources/` directory
  - Update `sources/_registry.json`

#### Scenario: Source Priority
- GIVEN sources are being evaluated
- WHEN prioritized
- THEN they MUST follow this hierarchy:
  1. Primary: KDIGO guidelines, CMS regulations, NKF KDOQI
  2. Secondary: UpToDate, peer-reviewed journals
  3. Tertiary: Textbooks, review articles

### Requirement: Pass 3 - Citation-First Content Generation
The system SHALL generate content only from discovered sources.

#### Scenario: Pass 3 Execution
- GIVEN Pass 3 is triggered
- WHEN executed
- THEN it MUST:
  - Load relevant sources for each topic
  - Generate content ONLY from source material
  - Include inline citations for every factual claim
  - Mark gaps as `{{NEEDS_SOURCE: topic}}`
  - NEVER invent facts or statistics

#### Scenario: Citation Format
- GIVEN a factual claim in content
- WHEN cited
- THEN it MUST use format `[Source Name, Section/Page]`
- AND source MUST exist in `sources/_registry.json`

#### Scenario: Unfounded Claims
- GIVEN content that cannot be sourced
- WHEN detected
- THEN it MUST be marked `{{NEEDS_SOURCE: topic}}`
- AND added to `review-queue/unverified-claims/`

### Requirement: Pass 4 - Cross-LLM Validation
The system SHALL validate content using multiple LLMs.

#### Scenario: Pass 4 Execution
- GIVEN Pass 4 is triggered
- WHEN executed
- THEN it MUST:
  - Verify citations actually support claims
  - Check for contradictions with sources
  - Use multiple LLMs (Claude Opus 4.5, Gemini Pro)
  - Flag disagreements for human review
  - Calculate concurrence rate

#### Scenario: Multi-LLM Concurrence
- GIVEN content is validated by multiple LLMs
- WHEN agreement is calculated
- THEN concurrence rate MUST be >= 80% for medical content
- AND disagreements MUST be logged to `review-queue/contradictions/`

#### Scenario: Ground Truth Anchoring
- GIVEN a claim is validated
- WHEN checked against sources
- THEN claim MUST be marked as:
  - `verified` - found in primary source
  - `supported` - found in secondary source
  - `unverified` - no source found (flag for review)
  - `contradicted` - source says opposite (remove)

### Requirement: Pass 5 - Cross-Linking
The system SHALL build knowledge graph and add cross-references.

#### Scenario: Pass 5 Execution
- GIVEN Pass 5 is triggered
- WHEN executed
- THEN it MUST:
  - Extract entities from all content
  - Identify relationships between entities
  - Add wikilinks to content where relevant
  - Update `graph/entities.json`
  - Update `graph/relationships.json`
  - Validate all wikilinks resolve

#### Scenario: Link Integrity Check
- GIVEN wikilinks are added
- WHEN validated
- THEN every `[[wikilink]]` MUST resolve to an existing file
- AND orphan pages (no incoming links) MUST be logged
- AND broken links MUST cause pass failure

### Requirement: Pass Configuration
Each pass SHALL be configurable via YAML.

#### Scenario: LLM Configuration
- GIVEN a pass configuration
- WHEN defined in `config/llm-configs.yaml`
- THEN it MUST specify:
  - `primary_llm` - main model to use
  - `fallback_llm` - backup if primary fails (optional)
  - `temperature` - creativity setting
  - `max_tokens` - output limit
  - `purpose` - description of pass goal

### Requirement: Pass Logging
Each pass SHALL log its activity.

#### Scenario: Pass Log File
- GIVEN a pass executes
- WHEN logging
- THEN it MUST create `passes/YYYY-QN/pass-N/log.md`
- AND log MUST include:
  - Start/end timestamps
  - Files created/modified
  - Errors encountered
  - Summary statistics

### Requirement: Recursive Expansion
The system SHALL support recursive expansion of topics.

#### Scenario: Depth Expansion
- GIVEN a topic needs more detail
- WHEN expansion is triggered
- THEN the system MUST:
  - Create subtopic files under the topic directory
  - Update parent `_index.md` with links
  - Run through passes 2-5 for new content
  - Maintain link integrity
