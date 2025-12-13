# Architecture Specification

## Purpose

Defines the overall system architecture for the Nephrology Knowledge Base, including directory structure, file formats, and component relationships.

## Requirements

### Requirement: Directory Structure
The system SHALL maintain a consistent directory structure for all knowledge content.

#### Scenario: Root Level Organization
- GIVEN the project root directory
- WHEN listing contents
- THEN the following directories MUST exist:
  - `domains/` - Knowledge base content
  - `config/` - Configuration files
  - `scripts/` - Automation scripts
  - `graph/` - Knowledge graph data
  - `sources/` - Source reference files
  - `passes/` - Generation pass logs
  - `review-queue/` - Items for human review
  - `openspec/` - Specifications

### Requirement: Domain Directory Structure
The system SHALL organize knowledge content into numbered domain directories.

#### Scenario: Domain Numbering
- GIVEN a domain directory
- WHEN named
- THEN it MUST follow pattern `NN-domain-name/` where NN is zero-padded number
- AND each domain MUST contain an `_index.md` file

#### Scenario: Standard Domains
- GIVEN the domains directory
- WHEN fully populated
- THEN it MUST contain these domains:
  - `00-glossary/` - Terminology definitions
  - `01-clinical/` - Clinical medical knowledge
  - `02-care-delivery/` - Care delivery models
  - `03-regulatory/` - Regulatory and compliance
  - `04-business/` - Business operations
  - `05-emerging/` - Emerging topics

### Requirement: Markdown File Format
The system SHALL use Markdown files with YAML frontmatter for all knowledge content.

#### Scenario: Frontmatter Requirements
- GIVEN a knowledge article file
- WHEN parsed
- THEN it MUST contain YAML frontmatter with:
  - `title` (required)
  - `domain` (required)
  - `status` (required): skeleton | draft | reviewed | published
  - `generated_by` (required): LLM model identifier
  - `generated_at` (required): ISO 8601 timestamp
  - `pass` (required): pass number that created/modified this
  - `citations` (optional): list of source references

### Requirement: Cross-Linking Format
The system SHALL use Obsidian-style wikilinks for cross-references.

#### Scenario: Simple Wikilink
- GIVEN a reference to another topic
- WHEN written
- THEN it MUST use format `[[Topic Name]]`

#### Scenario: Aliased Wikilink
- GIVEN a reference with custom display text
- WHEN written
- THEN it MUST use format `[[Display Text|target-file]]`

### Requirement: Configuration Files
The system SHALL use YAML for configuration files.

#### Scenario: LLM Configuration
- GIVEN LLM settings are needed
- WHEN configured
- THEN they MUST be in `config/llm-configs.yaml`

#### Scenario: Prompt Templates
- GIVEN prompt templates are needed
- WHEN stored
- THEN they MUST be in `config/prompts/*.md`

#### Scenario: JSON Schemas
- GIVEN structured output schemas are needed
- WHEN defined
- THEN they MUST be in `config/schemas/*.schema.json`
- AND MUST comply with JSON Schema draft 2020-12
- AND MUST NOT use `oneOf`, `allOf`, or `anyOf` at top level

### Requirement: Graph Data Format
The system SHALL store knowledge graph data in JSON format.

#### Scenario: Entity Storage
- GIVEN entity data
- WHEN stored
- THEN it MUST be in `graph/entities.json`

#### Scenario: Relationship Storage
- GIVEN relationship data
- WHEN stored
- THEN it MUST be in `graph/relationships.json`

#### Scenario: Wikilink Registry
- GIVEN wikilink tracking data
- WHEN stored
- THEN it MUST be in `graph/wikilink_registry.json`
- AND MUST track: target_path, status, created_in_pass, referenced_from

### Requirement: Checkpoint System
The system SHALL create checkpoints after each significant operation.

#### Scenario: Pass Checkpoint
- GIVEN a generation pass completes a step
- WHEN checkpointing
- THEN it MUST write to `passes/YYYY-QN/pass-N/checkpoint-*.json`
- AND MUST include: timestamp, files_modified, state

#### Scenario: Recovery from Checkpoint
- GIVEN a previous checkpoint exists
- WHEN recovery is requested
- THEN the system MUST be able to resume from that checkpoint
