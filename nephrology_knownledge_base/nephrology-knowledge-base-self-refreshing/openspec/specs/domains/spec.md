# Domains Specification

## Purpose

Defines the knowledge domains, their scope, and the topics each domain covers for the Nephrology Knowledge Base.

## Requirements

### Requirement: Glossary Domain (00-glossary)
The system SHALL maintain a glossary domain for terminology definitions.

#### Scenario: Glossary Structure
- GIVEN the glossary domain
- WHEN organized
- THEN it MUST contain:
  - `_index.md` - Glossary overview
  - `clinical-terms.md` - Medical terminology (GFR, Kt/V, URR, etc.)
  - `regulatory-terms.md` - CMS, QIP, ESRD program terms
  - `business-terms.md` - Revenue cycle, bundled payment terms

#### Scenario: Term Definition Format
- GIVEN a glossary term entry
- WHEN written
- THEN it MUST include:
  - Term name (heading)
  - Definition (paragraph)
  - Related terms (wikilinks)
  - Source citation (if from authoritative source)

### Requirement: Clinical Domain (01-clinical)
The system SHALL maintain clinical knowledge for nephrology practice.

#### Scenario: Clinical Topics
- GIVEN the clinical domain
- WHEN fully populated
- THEN it MUST cover:
  - `ckd/` - Chronic Kidney Disease (staging, progression, risk factors)
  - `esrd/` - End-Stage Renal Disease (management, modality selection)
  - `aki/` - Acute Kidney Injury (recognition, staging, management)
  - `dialysis/` - Dialysis modalities (HD, PD, home dialysis)
  - `transplant/` - Kidney transplantation (pathways, evaluation)
  - `medications/` - Drug dosing in kidney disease
  - `labs/` - Lab interpretation (GFR, electrolytes, etc.)
  - `comorbidities/` - HTN, DM, CVD in kidney disease

#### Scenario: Clinical Content Priority
- GIVEN clinical topics
- WHEN prioritized
- THEN CKD, ESRD, and Dialysis MUST be marked high priority
- AND content MUST align with KDIGO guidelines

### Requirement: Care Delivery Domain (02-care-delivery)
The system SHALL maintain knowledge about care delivery models.

#### Scenario: Care Delivery Topics
- GIVEN the care delivery domain
- WHEN fully populated
- THEN it MUST cover:
  - `value-based-care/` - KCC model, ACOs, quality incentives
  - `home-dialysis/` - PD programs, home HD programs
  - `care-coordination/` - Transitions, multidisciplinary teams
  - `patient-education/` - Education programs, materials
  - `quality-improvement/` - QI initiatives, PDSA cycles

### Requirement: Regulatory Domain (03-regulatory)
The system SHALL maintain regulatory and compliance knowledge.

#### Scenario: Regulatory Topics
- GIVEN the regulatory domain
- WHEN fully populated
- THEN it MUST cover:
  - `cms-esrd/` - CMS ESRD regulations
  - `conditions-for-coverage/` - CfC requirements for facilities
  - `quality-programs/` - ESRD QIP, Star ratings
  - `federal-register/` - Federal Register updates
  - `state-regulations/` - State-specific requirements

#### Scenario: Regulatory Source Priority
- GIVEN regulatory content
- WHEN cited
- THEN primary sources MUST be:
  - CMS ESRD Measures Manual (current version)
  - Federal Register notices
  - Official CMS guidance documents

### Requirement: Business Domain (04-business)
The system SHALL maintain business and operations knowledge.

#### Scenario: Business Topics
- GIVEN the business domain
- WHEN fully populated
- THEN it MUST cover:
  - `revenue-cycle/` - Billing, coding, claims
  - `bundled-payments/` - ESRD PPS, payment models
  - `staffing/` - Staffing models, ratios, roles
  - `facility-operations/` - Operational procedures
  - `reporting/` - Quality and financial reporting

### Requirement: Emerging Domain (05-emerging)
The system SHALL maintain knowledge about emerging topics.

#### Scenario: Emerging Topics
- GIVEN the emerging domain
- WHEN fully populated
- THEN it MUST cover:
  - `ai-in-nephrology/` - AI/ML applications
  - `precision-medicine/` - Genomics, biomarkers
  - `digital-health/` - Telehealth, apps, RPM
  - `new-therapies/` - Pipeline drugs, clinical trials

### Requirement: Domain Index Files
Each domain SHALL have an `_index.md` that provides an overview.

#### Scenario: Index File Content
- GIVEN a domain `_index.md` file
- WHEN written
- THEN it MUST contain:
  - Domain title and description
  - List of topics with brief descriptions
  - Subtopics for each topic (outline style)
  - Priority indicators (high/medium/low)
  - Suggested authoritative sources

#### Scenario: Index File Format
- GIVEN a domain `_index.md` file
- WHEN formatted
- THEN topics MUST use outline style (bullet lists)
- AND subtopics MUST be nested under their parent topic
- AND wikilinks MUST connect to topic files
