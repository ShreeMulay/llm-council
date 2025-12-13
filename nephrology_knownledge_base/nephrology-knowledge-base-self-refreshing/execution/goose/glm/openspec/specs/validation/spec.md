# Validation Specification

## Purpose

Defines the validation requirements for ensuring content accuracy, link integrity, and citation compliance in the Nephrology Knowledge Base.

## Requirements

### Requirement: Zero Hallucination Policy
The system SHALL enforce zero tolerance for hallucinated content.

#### Scenario: Factual Claim Verification
- GIVEN any factual claim in content
- WHEN validated
- THEN it MUST have a traceable citation
- AND citation MUST point to a source in `sources/_registry.json`
- AND source excerpt MUST support the claim

#### Scenario: Uncitable Content Handling
- GIVEN content that cannot be cited
- WHEN detected
- THEN it MUST be:
  - Marked with `{{NEEDS_SOURCE: topic}}`
  - Added to `review-queue/unverified-claims/`
  - NOT published until human review

### Requirement: Citation Verification
The system SHALL verify all citations are accurate.

#### Scenario: Citation Format Validation
- GIVEN a citation in content
- WHEN validated
- THEN it MUST match format `[Source Name, Section/Page]`
- AND Source Name MUST exist in `sources/_registry.json`

#### Scenario: Citation-Claim Alignment
- GIVEN a citation and its claim
- WHEN verified
- THEN the source excerpt MUST actually support the claim
- AND contradictions MUST be flagged

### Requirement: Wikilink Integrity
The system SHALL maintain wikilink integrity across all content.

#### Scenario: Wikilink Resolution
- GIVEN a wikilink `[[Topic Name]]`
- WHEN resolved
- THEN it MUST match an existing file in `domains/`
- AND the mapping MUST be recorded in `graph/wikilink_registry.json`

#### Scenario: Broken Link Detection
- GIVEN wikilinks are validated
- WHEN a broken link is found
- THEN it MUST be logged with:
  - Source file path
  - Wikilink text
  - Expected target
- AND validation MUST fail

#### Scenario: Orphan Page Detection
- GIVEN all content files
- WHEN link analysis completes
- THEN pages with zero incoming links MUST be flagged as orphans
- AND orphans MUST be logged to `review-queue/pending/`

### Requirement: Wikilink Registry
The system SHALL maintain a registry of all wikilinks.

#### Scenario: Registry Structure
- GIVEN the wikilink registry
- WHEN stored at `graph/wikilink_registry.json`
- THEN each entry MUST contain:
  - `target_path` - resolved file path (or null if pending)
  - `status` - exists | pending | broken
  - `created_in_pass` - pass number when first created
  - `referenced_from` - list of files containing this link

#### Scenario: Registry Updates
- GIVEN content is modified
- WHEN wikilinks change
- THEN the registry MUST be updated
- AND orphan/broken status MUST be recalculated

### Requirement: Multi-LLM Concurrence
The system SHALL use multiple LLMs for validation concurrence.

#### Scenario: Concurrence Check
- GIVEN medical content for validation
- WHEN checked by multiple LLMs
- THEN at least 2 different LLMs MUST agree
- AND agreement rate MUST be >= 80%
- AND disagreements MUST trigger human review

#### Scenario: Concurrence Logging
- GIVEN concurrence check completes
- WHEN logged
- THEN log MUST include:
  - Models used
  - Agreement rate percentage
  - Specific disagreement points
  - Recommended actions

### Requirement: Schema Validation
The system SHALL validate all structured outputs against JSON schemas.

#### Scenario: Structured Output Validation
- GIVEN LLM output is structured
- WHEN validated
- THEN it MUST comply with the relevant schema in `config/schemas/`
- AND validation errors MUST cause retry or failure

#### Scenario: Schema Compatibility
- GIVEN JSON schemas are defined
- WHEN created
- THEN they MUST:
  - Use JSON Schema draft 2020-12
  - NOT use `oneOf`, `allOf`, `anyOf` at top level
  - Specify all required fields
  - Include `additionalProperties: false`

### Requirement: Content Quality Checks
The system SHALL check content quality beyond citation.

#### Scenario: Medical Terminology Consistency
- GIVEN medical content
- WHEN validated
- THEN terminology MUST be consistent with `00-glossary/`
- AND undefined terms SHOULD be added to glossary

#### Scenario: Readability Check
- GIVEN content for internal use
- WHEN validated
- THEN it MUST be written for clinical professionals
- AND avoid excessive jargon without definition

### Requirement: Checkpoint Validation
The system SHALL validate checkpoints are recoverable.

#### Scenario: Checkpoint Integrity
- GIVEN a checkpoint file
- WHEN validated
- THEN it MUST contain:
  - Valid JSON structure
  - Timestamp
  - Files modified list
  - Recoverable state data

#### Scenario: Checkpoint Recovery Test
- GIVEN a checkpoint exists
- WHEN recovery is tested
- THEN the system MUST be able to restore state
- AND continue from that point

### Requirement: Review Queue Management
The system SHALL manage items requiring human review.

#### Scenario: Review Queue Structure
- GIVEN the review queue
- WHEN organized
- THEN it MUST contain directories:
  - `unverified-claims/` - claims needing sources
  - `contradictions/` - conflicting information
  - `pending/` - general review items

#### Scenario: Review Item Format
- GIVEN an item in review queue
- WHEN created
- THEN it MUST include:
  - Source file path
  - Specific content flagged
  - Reason for flagging
  - Suggested resolution (if any)
  - LLM models that flagged it
