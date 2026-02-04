# Premier Dialysis Policy Search — Project Specification

## Vision

Provide Premier Dialysis staff with instant, accurate access to company policies and procedures through a conversational AI search interface. Staff ask questions in natural language and receive answers with exact citations to source documents.

## Problem

- 100+ P&P documents scattered across Google Drive
- Staff waste time manually searching through folders and files
- New hires have no efficient way to learn policies
- State-specific variants (FL/MI/TN) add complexity
- No searchable index — only folder browsing

## Solution

A branded web application powered by Google Vertex AI Search that:
1. Indexes all P&P documents from Google Drive automatically
2. Provides conversational Q&A with Gemini-powered answer generation
3. Cites exact source documents, pages, and sections
4. Auto-syncs when documents are updated in Drive
5. Restricts access to authorized staff via IAP domain whitelist

## Users

| Role | Count | Use Case |
|------|-------|----------|
| Clinical Staff (RNs, Techs) | ~25 | Patient care policies, infection control, medication protocols |
| Admin Staff | ~10 | HR policies, billing procedures, compliance requirements |
| Management | ~5 | Organizational policies, staffing, regulatory compliance |

## Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Search Engine | Vertex AI Search (Discovery Engine) | RAG, indexing, answer generation |
| LLM | Gemini (via Vertex AI) | Answer generation with citations |
| Data Source | Google Drive Connector | Auto-sync P&P folder |
| Hosting | Cloud Run | Serve static HTML page |
| Auth | Identity-Aware Proxy (IAP) | Domain whitelist authentication |
| Frontend | HTML + `<gen-search-widget>` | Minimal, Google-provided widget |

## Document Inventory

### Root Level (100+ files)
- Numbered policies: 1-001 through 6-series
- State variants: FL, MI, TN specific versions
- Formats: PDF, DOCX, Google Docs, Google Sheets

### Subfolders
- CONTRACT FOLDER — vendor/partner contracts
- Job Descriptions — role-specific JDs
- Med Lists — medication reference lists
- New Patient Packet — intake forms
- New Packet Spanish — Spanish language forms
- NxStage Policies — equipment-specific policies
- PDFs only — PDF copies of key documents
- Tracking Tools — infection tracker, audit tools, skills checklists

## Constraints

- **No PHI** flows through the system (P&P docs only)
- **HIPAA not required** for this specific use case
- **Multi-domain** — staff use `@premier-dialysis.com` and `@thekidneyexperts.com`
- **Separate Google Workspaces** — domains are different orgs
- **Budget** — ~$20-30/mo target (year 1 covered by $1K free credit)

## Success Criteria

1. Staff can find any policy answer in <30 seconds
2. Every answer includes a citation to the source document
3. System correctly says "I don't have information on this" for out-of-scope questions
4. New documents in Drive are searchable within 24 hours
5. All 40 staff can access from both email domains
