# Sources Specification

## Purpose

Defines the authoritative source management system for ensuring all knowledge base content is properly sourced and cited.

## Requirements

### Requirement: Source Registry
The system SHALL maintain a registry of all authoritative sources.

#### Scenario: Registry Location
- GIVEN source metadata
- WHEN stored
- THEN it MUST be in `sources/_registry.json`

#### Scenario: Registry Entry Format
- GIVEN a source entry
- WHEN structured
- THEN it MUST contain:
  - `id` - unique identifier (kebab-case)
  - `name` - human-readable name
  - `type` - guideline | regulation | journal | textbook | website
  - `organization` - publishing organization
  - `url` - canonical URL (if available)
  - `version` - version or edition
  - `date` - publication date (ISO 8601)
  - `accessed_date` - when last accessed
  - `reliability` - primary | secondary | tertiary

### Requirement: Source Hierarchy
The system SHALL prioritize sources by reliability.

#### Scenario: Primary Sources (Highest Priority)
- GIVEN nephrology clinical content
- WHEN sourcing
- THEN primary sources MUST include:
  - KDIGO Clinical Practice Guidelines
  - CMS ESRD regulations and manuals
  - NKF KDOQI Guidelines
  - FDA drug labeling
  - Peer-reviewed clinical trials

#### Scenario: Secondary Sources
- GIVEN supporting content needed
- WHEN sourcing
- THEN secondary sources MAY include:
  - UpToDate clinical summaries
  - Peer-reviewed review articles
  - Major nephrology journals (JASN, KI, CJASN)
  - ASN educational materials

#### Scenario: Tertiary Sources
- GIVEN background context needed
- WHEN sourcing
- THEN tertiary sources MAY include:
  - Nephrology textbooks
  - General review articles
  - Professional society position statements

### Requirement: Source Files
The system SHALL maintain individual files for frequently-cited sources.

#### Scenario: Source File Location
- GIVEN a source file
- WHEN stored
- THEN it MUST be in `sources/[source-id].md`

#### Scenario: Source File Content
- GIVEN a source file
- WHEN written
- THEN it MUST contain:
  - YAML frontmatter with registry metadata
  - Summary of source scope
  - Key sections/chapters relevant to KB
  - Extracted excerpts with page references
  - Last verification date

### Requirement: Core Nephrology Sources
The system SHALL include these core sources.

#### Scenario: KDIGO Guidelines
- GIVEN KDIGO guidelines
- WHEN registered
- THEN MUST include:
  - `kdigo-2024-ckd` - CKD Evaluation and Management
  - `kdigo-aki` - Acute Kidney Injury
  - `kdigo-transplant` - Kidney Transplant Recipient Care
  - `kdigo-dialysis` - Dialysis guidelines

#### Scenario: CMS Sources
- GIVEN CMS regulations
- WHEN registered
- THEN MUST include:
  - `cms-esrd-measures-manual` - Current ESRD Measures Manual
  - `cms-conditions-for-coverage` - ESRD Facility CfC
  - `cms-esrd-pps` - ESRD Prospective Payment System
  - `cms-kcc-model` - Kidney Care Choices Model

#### Scenario: NKF Sources
- GIVEN NKF materials
- WHEN registered
- THEN MUST include:
  - `nkf-kdoqi` - KDOQI Clinical Practice Guidelines
  - `nkf-ckd-intercept` - CKD Intercept resources

### Requirement: Source Verification
The system SHALL verify sources are current and accessible.

#### Scenario: Currency Check
- GIVEN a registered source
- WHEN verified
- THEN it MUST check:
  - Source is still available at URL
  - No newer version exists
  - Content matches cached excerpts

#### Scenario: Quarterly Verification
- GIVEN the quarterly refresh cycle
- WHEN sources are checked
- THEN ALL registered sources MUST be re-verified
- AND outdated sources MUST be flagged
- AND new versions MUST trigger content review

### Requirement: Citation Tracking
The system SHALL track which content cites which sources.

#### Scenario: Citation Index
- GIVEN the source registry
- WHEN citations are tracked
- THEN each source entry MUST include:
  - `cited_by` - list of files citing this source
  - `citation_count` - number of citations

#### Scenario: Unused Source Detection
- GIVEN source analysis completes
- WHEN a source has zero citations
- THEN it MAY be flagged for removal
- AND MUST be logged

### Requirement: Source Excerpt Management
The system SHALL maintain source excerpts for citation verification.

#### Scenario: Excerpt Storage
- GIVEN an excerpt from a source
- WHEN stored
- THEN it MUST include:
  - Source ID
  - Section/page reference
  - Verbatim text
  - Date extracted

#### Scenario: Excerpt-Claim Verification
- GIVEN a claim with citation
- WHEN verified
- THEN the source excerpt MUST semantically support the claim
- AND contradictions MUST be flagged

### Requirement: Source Attribution Format
The system SHALL use consistent attribution format.

#### Scenario: Inline Citation
- GIVEN a factual claim in content
- WHEN cited inline
- THEN format MUST be `[Source Name, Section/Page]`
- Example: `[KDIGO 2024 CKD Guidelines, Chapter 1]`

#### Scenario: Reference Section
- GIVEN a content file with citations
- WHEN a reference section is included
- THEN it MUST list full source details
- AND use consistent formatting
