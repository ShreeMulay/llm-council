# OpenSpec Rules — Premier Dialysis Search

## Specification Standards

- All specs describe the CURRENT state of the system
- Changes go through `changes/` directory as proposals
- Approved changes are implemented, then specs are updated
- Archived changes go to `changes/archive/`

## Key Decisions (Locked)

1. **Platform**: Vertex AI Search — NOT self-hosted RAG
2. **Hosting**: Cloud Run — NOT Firebase Hosting (needs IAP)
3. **Auth**: IAP with domain whitelist — server-enforced
4. **Frontend**: Google's `<gen-search-widget>` — minimal custom code
5. **Data sync**: Google Drive connector — automatic, no custom scripts

## Open Decisions

1. IAP vs Firebase Auth (may simplify during implementation)
2. Custom domain name (TBD)
3. Exact sync frequency (daily vs weekly)
