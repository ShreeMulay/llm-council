# OpenSpec Conventions - TKE CKD Note Template

## Specification Standards

- All specs use Markdown tables for structured data
- Section IDs: `snake_case` (e.g., `kidney_function`, `raas_inhibition`)
- Card codes: `TKE-XXXX` (e.g., `TKE-RAAS`, `TKE-SGLT`)
- Field types: `number`, `enum`, `text`, `date`, `boolean`, `calculated`
- Source types: `labs_api`, `med_list`, `vitals`, `provider`, `patient`, `calculated`, `previous_note`, `fax_manager`, `ocr_scan`, `transcription`

## Clinical Standards

- All clinical content follows KDIGO 2024-2025 guidelines unless noted
- Drug references include generic name + common brand
- Lab ranges include units and target values
- All targets are evidence-based with citation

## Change Management

- Proposals go in `changes/<change-id>/proposal.md`
- Status: DRAFT -> PROPOSED -> APPROVED -> IMPLEMENTING -> COMPLETE
- Archive completed changes to `changes/archive/`
