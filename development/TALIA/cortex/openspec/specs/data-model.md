# CORTEX — Data Model Specification

> **Version**: 1.0
> **Last Updated**: March 4, 2026
> **Database**: Cloud SQL (PostgreSQL 16)
> **Shared Instance**: CORTEX tables coexist with TALIA 1.0 (AppSheet) tables
> **Schema**: `cortex` (separate schema from TALIA 1.0's `public` schema)

---

## 1. Schema Strategy

CORTEX and TALIA 1.0 share a single Cloud SQL PostgreSQL instance but use separate schemas:

```
PostgreSQL Instance (db-g1-small, us-central1)
├── Schema: public        ← TALIA 1.0 (AppSheet) tables
│   ├── hospital_census
│   ├── patient_registry
│   ├── provider_schedule
│   ├── quality_metrics
│   └── ... (13 AppSheet tables total)
│
├── Schema: cortex        ← CORTEX tables (this spec)
│   ├── users
│   ├── encounters
│   ├── recordings
│   ├── transcripts
│   ├── transcript_segments
│   ├── entity_extractions
│   ├── epic_data_pastes
│   ├── notes
│   ├── note_sections
│   ├── note_versions
│   ├── procedure_notes
│   ├── consent_records
│   ├── billing_suggestions
│   ├── council_runs
│   ├── council_outputs
│   ├── feedback
│   └── audit_log
│
└── Schema: shared        ← Cross-references (future)
    └── patient_cortex_link (maps AppSheet patient to CORTEX encounter)
```

### Cross-Schema Access

CORTEX reads from `public.hospital_census` (TALIA 1.0) to populate the patient census screen. This is a **read-only** relationship — CORTEX never writes to TALIA 1.0 tables.

```sql
-- CORTEX reads census from TALIA 1.0
SELECT * FROM public.hospital_census 
WHERE provider_id = :provider_id 
AND status = 'active';
```

---

## 2. Core Tables

### users

CORTEX users (providers, scribes, data entry, admin, QA). Authentication is handled by IAP (Identity-Aware Proxy) at the infrastructure level. This table stores the user profile and RBAC role. The `google_id` is populated from the IAP JWT `sub` claim.

```sql
CREATE TABLE cortex.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_id VARCHAR(255) UNIQUE NOT NULL,       -- IAP JWT 'sub' claim (stable user identifier)
    email VARCHAR(255) UNIQUE NOT NULL,            -- IAP JWT 'email' claim (@thekidneyexperts.com)
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'scribe',    -- 'provider', 'scribe', 'data_entry', 'admin', 'qa'
    npi VARCHAR(10),                                -- National Provider Identifier (providers only)
    specialty VARCHAR(100),                         -- e.g., 'Nephrology'
    assigned_provider_id UUID REFERENCES cortex.users(id),  -- Scribe → Provider assignment
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_role CHECK (role IN ('provider', 'scribe', 'data_entry', 'admin', 'qa'))
);

CREATE INDEX idx_users_email ON cortex.users(email);
CREATE INDEX idx_users_role ON cortex.users(role);
CREATE INDEX idx_users_assigned_provider ON cortex.users(assigned_provider_id);
```

### encounters

The central table. One row per patient encounter (one rounding visit = one encounter).

```sql
CREATE TABLE cortex.encounters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_mrn VARCHAR(20) NOT NULL,
    patient_name VARCHAR(255) NOT NULL,              -- Denormalized for display
    room_number VARCHAR(20),
    facility VARCHAR(255),
    admission_day INTEGER NOT NULL DEFAULT 0,        -- Day 0 = new consult
    
    -- Encounter metadata
    encounter_date DATE NOT NULL DEFAULT CURRENT_DATE,
    note_type VARCHAR(30) NOT NULL,                  -- 'consult_hp', 'progress_note', 'critical_care', 'acp', 'procedure'
    consult_reason TEXT,                              -- Verbatim from referring team
    
    -- Active domains (JSONB array of domain IDs)
    active_domains JSONB NOT NULL DEFAULT '[]'::jsonb,  -- e.g., ["aki", "electrolytes", "volume_hemodynamics"]
    acuity_score INTEGER CHECK (acuity_score BETWEEN 1 AND 10),
    
    -- 3-Phase workflow state
    phase VARCHAR(20) NOT NULL DEFAULT 'hallway_huddle',  -- 'hallway_huddle', 'in_room', 'post_room', 'review', 'signed'
    
    -- Participants
    provider_id UUID NOT NULL REFERENCES cortex.users(id),
    scribe_id UUID REFERENCES cortex.users(id),
    
    -- Council tier
    council_tier VARCHAR(10),                        -- 'full', 'quick', 'single'
    
    -- Timestamps
    hallway_started_at TIMESTAMPTZ,
    in_room_started_at TIMESTAMPTZ,
    post_room_started_at TIMESTAMPTZ,
    note_generated_at TIMESTAMPTZ,
    note_signed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_note_type CHECK (note_type IN ('consult_hp', 'progress_note', 'critical_care', 'acp', 'procedure')),
    CONSTRAINT valid_phase CHECK (phase IN ('hallway_huddle', 'in_room', 'post_room', 'review', 'signed'))
);

CREATE INDEX idx_encounters_provider_date ON cortex.encounters(provider_id, encounter_date);
CREATE INDEX idx_encounters_patient_mrn ON cortex.encounters(patient_mrn);
CREATE INDEX idx_encounters_phase ON cortex.encounters(phase);
CREATE INDEX idx_encounters_date ON cortex.encounters(encounter_date);
```

---

## 3. Audio & Transcription Tables

### recordings

Audio recording files. One encounter may have multiple recordings (hallway dictation, in-room, post-room dictation).

```sql
CREATE TABLE cortex.recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID NOT NULL REFERENCES cortex.encounters(id),
    
    -- Recording metadata
    recording_phase VARCHAR(20) NOT NULL,            -- 'hallway_huddle', 'in_room', 'post_room'
    duration_seconds INTEGER,
    file_format VARCHAR(10) NOT NULL DEFAULT 'flac', -- 'flac', 'wav', 'webm'
    file_size_bytes BIGINT,
    sample_rate INTEGER DEFAULT 16000,
    channels INTEGER DEFAULT 1,
    
    -- Storage
    gcs_bucket VARCHAR(255) NOT NULL,
    gcs_path VARCHAR(500) NOT NULL,                  -- e.g., 'recordings/2026/03/04/{encounter_id}/{recording_id}.flac'
    
    -- Processing state
    status VARCHAR(20) NOT NULL DEFAULT 'uploading', -- 'uploading', 'uploaded', 'transcribing', 'transcribed', 'failed'
    stt_provider VARCHAR(20),                        -- 'chirp3', 'voxtral'
    
    -- Offline handling
    uploaded_from_offline BOOLEAN NOT NULL DEFAULT false,
    offline_encrypted BOOLEAN NOT NULL DEFAULT false,
    
    -- Pause tracking
    pauses JSONB DEFAULT '[]'::jsonb,                -- [{start_ms: 120000, end_ms: 135000, reason: "sensitive"}]
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_recording_phase CHECK (recording_phase IN ('hallway_huddle', 'in_room', 'post_room')),
    CONSTRAINT valid_status CHECK (status IN ('uploading', 'uploaded', 'transcribing', 'transcribed', 'failed'))
);

CREATE INDEX idx_recordings_encounter ON cortex.recordings(encounter_id);
CREATE INDEX idx_recordings_status ON cortex.recordings(status);
```

### transcripts

Full transcript for a recording. One recording = one transcript.

```sql
CREATE TABLE cortex.transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recording_id UUID NOT NULL REFERENCES cortex.recordings(id),
    encounter_id UUID NOT NULL REFERENCES cortex.encounters(id),
    
    -- Full text
    full_text TEXT NOT NULL,
    
    -- Processing metadata
    stt_provider VARCHAR(20) NOT NULL,               -- 'chirp3', 'voxtral'
    stt_model_version VARCHAR(50),
    language VARCHAR(10) DEFAULT 'en-US',
    word_count INTEGER,
    confidence_avg FLOAT,
    
    -- Diarization
    speaker_count INTEGER,
    speakers JSONB,                                   -- [{"label": "Dr. Mulay", "role": "provider"}, {"label": "Patient", "role": "patient"}]
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transcripts_recording ON cortex.transcripts(recording_id);
CREATE INDEX idx_transcripts_encounter ON cortex.transcripts(encounter_id);
```

### transcript_segments

Word/phrase-level segments with timestamps and speaker labels. Used for audio-to-text traceability.

```sql
CREATE TABLE cortex.transcript_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transcript_id UUID NOT NULL REFERENCES cortex.transcripts(id),
    
    segment_index INTEGER NOT NULL,                  -- Order within transcript
    speaker_label VARCHAR(50),                       -- 'Dr. Mulay', 'Patient', 'Nurse', 'Family'
    speaker_role VARCHAR(20),                        -- 'provider', 'patient', 'nurse', 'family', 'other'
    text TEXT NOT NULL,
    
    -- Timing
    start_ms INTEGER NOT NULL,                       -- Milliseconds from recording start
    end_ms INTEGER NOT NULL,
    
    confidence FLOAT,                                -- STT confidence for this segment
    
    CONSTRAINT valid_timing CHECK (end_ms > start_ms)
);

CREATE INDEX idx_segments_transcript ON cortex.transcript_segments(transcript_id);
CREATE INDEX idx_segments_timing ON cortex.transcript_segments(transcript_id, start_ms);
```

---

## 4. Data Input Tables

### epic_data_pastes

Pasted text from EPIC (labs, meds, vitals, notes). One encounter may have multiple pastes.

```sql
CREATE TABLE cortex.epic_data_pastes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID NOT NULL REFERENCES cortex.encounters(id),
    pasted_by UUID NOT NULL REFERENCES cortex.users(id),
    
    -- Raw input
    raw_text TEXT,                                    -- Pasted text
    screenshot_gcs_path VARCHAR(500),                -- If screenshot instead of text
    input_type VARCHAR(20) NOT NULL,                 -- 'text_paste', 'screenshot'
    
    -- Parsed output
    detected_data_type VARCHAR(30),                  -- 'labs', 'vitals', 'medications', 'notes', 'orders', 'mixed'
    parsed_data JSONB,                               -- Structured extracted data
    parse_confidence FLOAT,
    
    -- Identity verification
    detected_mrn VARCHAR(20),                        -- MRN found in pasted data
    mrn_match BOOLEAN,                               -- Does it match encounter patient?
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending',   -- 'pending', 'parsed', 'confirmed', 'rejected'
    confirmed_by UUID REFERENCES cortex.users(id),
    confirmed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_input_type CHECK (input_type IN ('text_paste', 'screenshot')),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'parsed', 'confirmed', 'rejected'))
);

CREATE INDEX idx_epic_pastes_encounter ON cortex.epic_data_pastes(encounter_id);
```

### entity_extractions

Structured entities extracted from transcripts by Gemini Flash.

```sql
CREATE TABLE cortex.entity_extractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID NOT NULL REFERENCES cortex.encounters(id),
    transcript_id UUID REFERENCES cortex.transcripts(id),
    
    -- Extraction results
    entities JSONB NOT NULL,                         -- Full structured extraction (see tech-stack.md for schema)
    
    -- Processing metadata
    model VARCHAR(50) NOT NULL,                      -- 'gemini-2.0-flash' etc.
    model_version VARCHAR(50),
    extraction_type VARCHAR(20) NOT NULL,             -- 'transcript', 'epic_paste', 'screenshot'
    source_id UUID,                                   -- Reference to transcript or epic_data_paste
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_extractions_encounter ON cortex.entity_extractions(encounter_id);
```

---

## 5. Note Tables

### notes

The clinical note. Each encounter typically produces one note (but may have addenda).

```sql
CREATE TABLE cortex.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID NOT NULL REFERENCES cortex.encounters(id),
    
    -- Note metadata
    note_type VARCHAR(30) NOT NULL,                  -- Mirrors encounter note_type
    version INTEGER NOT NULL DEFAULT 1,              -- Increments on edit
    is_addendum BOOLEAN NOT NULL DEFAULT false,
    parent_note_id UUID REFERENCES cortex.notes(id), -- For addenda
    
    -- Content
    full_text TEXT,                                   -- Plain text rendering of full note
    structured_content JSONB,                        -- Structured note by domain/section
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'generating', -- 'generating', 'draft', 'review', 'signed', 'amended'
    
    -- Council metadata
    council_tier VARCHAR(10),                        -- 'full', 'quick', 'single'
    council_run_id UUID,                             -- Reference to council_runs
    
    -- Billing
    suggested_billing_code VARCHAR(10),              -- E/M code: '99231', '99232', '99233', etc.
    final_billing_code VARCHAR(10),                  -- Provider's final selection
    billing_justification JSONB,                     -- Structured evidence for billing code
    
    -- Signing
    signed_by UUID REFERENCES cortex.users(id),
    signed_at TIMESTAMPTZ,
    attestation_text TEXT,                            -- The attestation statement at signing
    
    -- Export
    exported_at TIMESTAMPTZ,
    export_format VARCHAR(20),                       -- 'smart_copy', 'pdf', 'print'
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_status CHECK (status IN ('generating', 'draft', 'review', 'signed', 'amended'))
);

CREATE INDEX idx_notes_encounter ON cortex.notes(encounter_id);
CREATE INDEX idx_notes_status ON cortex.notes(status);
CREATE INDEX idx_notes_signed_by ON cortex.notes(signed_by, signed_at);
```

### note_sections

Individual sections within a note, organized by domain. Each section has its own confidence score and review status.

```sql
CREATE TABLE cortex.note_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES cortex.notes(id),
    
    -- Domain mapping
    domain_id VARCHAR(50) NOT NULL,                  -- e.g., 'aki', 'electrolytes', 'volume_hemodynamics'
    domain_group VARCHAR(50) NOT NULL,               -- e.g., 'core_kidney', 'internal_milieu'
    section_order INTEGER NOT NULL,                  -- Display order
    
    -- Content
    assessment_text TEXT,
    plan_text TEXT,
    subjective_text TEXT,                            -- For H&P notes
    objective_text TEXT,                             -- For H&P notes
    
    -- Confidence & provenance
    confidence VARCHAR(10) NOT NULL DEFAULT 'medium', -- 'high', 'medium', 'low'
    provenance JSONB,                                 -- Source tags for each data point
    high_risk_fields JSONB,                          -- Fields requiring verification
    
    -- Council disagreement
    has_disagreement BOOLEAN NOT NULL DEFAULT false,
    disagreement_details JSONB,                      -- All 3 model opinions + chairman rationale
    
    -- Review status
    review_status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'edited', 'flagged'
    reviewed_by UUID REFERENCES cortex.users(id),
    reviewed_at TIMESTAMPTZ,
    
    -- If edited, store the diff
    original_content JSONB,                          -- Content before provider edits
    edit_diff JSONB,                                 -- What was changed
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_confidence CHECK (confidence IN ('high', 'medium', 'low')),
    CONSTRAINT valid_review_status CHECK (review_status IN ('pending', 'accepted', 'edited', 'flagged'))
);

CREATE INDEX idx_note_sections_note ON cortex.note_sections(note_id);
CREATE INDEX idx_note_sections_domain ON cortex.note_sections(domain_id);
CREATE INDEX idx_note_sections_confidence ON cortex.note_sections(confidence);
```

### note_versions

Full version history of every note. Immutable — captures the note state at each version.

```sql
CREATE TABLE cortex.note_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES cortex.notes(id),
    version_number INTEGER NOT NULL,
    
    -- Snapshot of note at this version
    full_text TEXT NOT NULL,
    structured_content JSONB NOT NULL,
    sections_snapshot JSONB NOT NULL,                -- All sections at this version
    
    -- What changed
    change_type VARCHAR(20) NOT NULL,                -- 'generated', 'edited', 'signed', 'addendum'
    change_description TEXT,
    changed_by UUID NOT NULL REFERENCES cortex.users(id),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Immutable: no updated_at
    CONSTRAINT unique_note_version UNIQUE (note_id, version_number)
);

CREATE INDEX idx_note_versions_note ON cortex.note_versions(note_id);
```

---

## 6. Procedure Notes

### procedure_notes

Structured procedure documentation (HD, CVVH, CVVHDF, SLED, PD, PLEX, Aquadex, catheter placement).

```sql
CREATE TABLE cortex.procedure_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES cortex.notes(id),
    encounter_id UUID NOT NULL REFERENCES cortex.encounters(id),
    
    -- Procedure identification
    procedure_type VARCHAR(30) NOT NULL,             -- 'hd', 'cvvh', 'cvvhdf', 'sled', 'pd', 'plex', 'aquadex', 'catheter'
    
    -- Common fields
    indication TEXT NOT NULL,
    indication_source VARCHAR(20),                   -- 'ai_generated', 'manual', 'template'
    access_type VARCHAR(50),                         -- 'RIJ TDC', 'LIJ TDC', 'AV fistula', 'AV graft', etc.
    access_site VARCHAR(50),
    access_inserted_date DATE,
    
    -- Dialysis parameters (JSONB for flexibility across modalities)
    prescription JSONB,                              -- Modality-specific parameters
    
    -- Weight & UF
    pre_weight_kg DECIMAL(5,1),
    post_weight_kg DECIMAL(5,1),
    dry_weight_kg DECIMAL(5,1),
    uf_goal_liters DECIMAL(4,2),
    actual_uf_liters DECIMAL(4,2),
    
    -- Anticoagulation
    anticoag_type VARCHAR(30),                       -- 'heparin', 'acd_a', 'citrate', 'none'
    anticoag_details JSONB,
    
    -- Monitoring
    monitoring_checklist JSONB,                      -- [{item: "Pre/Post vitals", checked: true}]
    
    -- Complications
    complications VARCHAR(20) DEFAULT 'none',        -- 'none', 'minor', 'major'
    complication_details TEXT,
    
    -- PLEX-specific
    plex_exchange_volume DECIMAL(4,2),               -- Plasma volumes
    plex_replacement_fluid VARCHAR(50),              -- 'albumin_5pct', 'ffp', 'cryo_poor', 'mixed'
    plex_asfa_category VARCHAR(20),                  -- 'category_i', 'category_ii', 'category_iii'
    plex_asfa_indication VARCHAR(100),
    plex_sessions_completed INTEGER,
    plex_sessions_planned INTEGER,
    
    -- Template
    template_id UUID,                                -- If created from saved template
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_procedure_type CHECK (procedure_type IN ('hd', 'cvvh', 'cvvhdf', 'sled', 'pd', 'plex', 'aquadex', 'catheter'))
);

CREATE INDEX idx_procedure_notes_encounter ON cortex.procedure_notes(encounter_id);
CREATE INDEX idx_procedure_notes_type ON cortex.procedure_notes(procedure_type);
```

---

## 7. Council Tables

### council_runs

Tracks each council execution (the full pipeline: generate → review → synthesize).

```sql
CREATE TABLE cortex.council_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID NOT NULL REFERENCES cortex.encounters(id),
    note_id UUID REFERENCES cortex.notes(id),
    
    -- Configuration
    tier VARCHAR(10) NOT NULL,                       -- 'full', 'quick', 'single'
    models_used JSONB NOT NULL,                      -- ["gemini-3.1-pro", "claude-sonnet-4.6", "mistral-medium-3"]
    chairman_model VARCHAR(50),
    
    -- Pipeline status
    status VARCHAR(20) NOT NULL DEFAULT 'generating', -- 'generating', 'reviewing', 'synthesizing', 'complete', 'failed'
    
    -- Timing
    generation_started_at TIMESTAMPTZ,
    generation_completed_at TIMESTAMPTZ,
    review_started_at TIMESTAMPTZ,
    review_completed_at TIMESTAMPTZ,
    synthesis_started_at TIMESTAMPTZ,
    synthesis_completed_at TIMESTAMPTZ,
    total_duration_ms INTEGER,
    
    -- Token usage
    total_input_tokens INTEGER,
    total_output_tokens INTEGER,
    estimated_cost_usd DECIMAL(6,4),
    
    -- Errors
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_council_runs_encounter ON cortex.council_runs(encounter_id);
CREATE INDEX idx_council_runs_status ON cortex.council_runs(status);
```

### council_outputs

Individual model outputs at each step of the council pipeline.

```sql
CREATE TABLE cortex.council_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    council_run_id UUID NOT NULL REFERENCES cortex.council_runs(id),
    
    -- Model identification
    model_name VARCHAR(50) NOT NULL,                 -- 'gemini-3.1-pro', 'claude-sonnet-4.6', 'mistral-medium-3'
    step VARCHAR(20) NOT NULL,                       -- 'generation', 'review', 'synthesis'
    
    -- Content
    output_text TEXT,
    structured_output JSONB,
    
    -- Review-specific (Step 2)
    reviewed_models JSONB,                           -- Which models' notes were reviewed
    quality_scores JSONB,                            -- Scores given to each reviewed note
    issues_found JSONB,                              -- Flagged issues
    ranking JSONB,                                   -- Ranking of reviewed notes
    
    -- Performance
    input_tokens INTEGER,
    output_tokens INTEGER,
    latency_ms INTEGER,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_council_outputs_run ON cortex.council_outputs(council_run_id);
CREATE INDEX idx_council_outputs_model ON cortex.council_outputs(model_name);
```

---

## 8. Consent & Audit Tables

### consent_records

See `compliance.md` for full consent framework. Schema:

```sql
CREATE TABLE cortex.consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID NOT NULL REFERENCES cortex.encounters(id),
    patient_mrn VARCHAR(20) NOT NULL,
    consent_type VARCHAR(20) NOT NULL,               -- 'verbal', 'declined', 'unable', 'representative'
    consented_by VARCHAR(50) NOT NULL,               -- 'patient', 'poa', 'legal_rep'
    consented_by_name VARCHAR(255),
    consented_by_relationship VARCHAR(100),
    inability_reason TEXT,
    provider_present_id UUID NOT NULL REFERENCES cortex.users(id),
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Immutable
    CONSTRAINT valid_consent_type CHECK (consent_type IN ('verbal', 'declined', 'unable', 'representative'))
);

CREATE INDEX idx_consent_encounter ON cortex.consent_records(encounter_id);
CREATE INDEX idx_consent_patient ON cortex.consent_records(patient_mrn);
```

### audit_log

See `compliance.md` for full audit framework. Schema:

```sql
CREATE TABLE cortex.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES cortex.users(id),
    patient_mrn VARCHAR(20),
    resource_type VARCHAR(50),
    resource_id UUID,
    action VARCHAR(20) NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    
    -- Immutable: no UPDATE or DELETE
) PARTITION BY RANGE (created_at);

-- Monthly partitions
CREATE TABLE cortex.audit_log_2026_03 PARTITION OF cortex.audit_log
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE cortex.audit_log_2026_04 PARTITION OF cortex.audit_log
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
-- ... generate monthly

CREATE INDEX idx_audit_user ON cortex.audit_log(user_id, created_at);
CREATE INDEX idx_audit_patient ON cortex.audit_log(patient_mrn, created_at);
CREATE INDEX idx_audit_event ON cortex.audit_log(event_type, created_at);
```

### break_glass_log

Emergency access log. See `compliance.md`.

```sql
CREATE TABLE cortex.break_glass_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES cortex.users(id),
    patient_mrn VARCHAR(20) NOT NULL,
    reason TEXT NOT NULL,
    accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_by UUID REFERENCES cortex.users(id),
    reviewed_at TIMESTAMPTZ
);

CREATE INDEX idx_break_glass_user ON cortex.break_glass_log(user_id);
CREATE INDEX idx_break_glass_reviewed ON cortex.break_glass_log(reviewed_by) WHERE reviewed_at IS NULL;
```

---

## 9. Feedback Table

### feedback

Provider feedback on AI-generated content. Used for quality improvement.

```sql
CREATE TABLE cortex.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES cortex.notes(id),
    note_section_id UUID REFERENCES cortex.note_sections(id),
    
    -- Feedback type
    feedback_type VARCHAR(20) NOT NULL,              -- 'accept', 'edit', 'flag', 'billing_change', 'disagreement_resolution'
    
    -- Content (for edits)
    original_content TEXT,
    final_content TEXT,
    edit_diff JSONB,
    
    -- For disagreement resolution
    chosen_model VARCHAR(50),                        -- Which model the provider agreed with
    
    -- For billing changes
    ai_suggested_code VARCHAR(10),
    provider_final_code VARCHAR(10),
    
    -- Context
    council_tier VARCHAR(10),
    provider_id UUID NOT NULL REFERENCES cortex.users(id),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feedback_note ON cortex.feedback(note_id);
CREATE INDEX idx_feedback_type ON cortex.feedback(feedback_type);
CREATE INDEX idx_feedback_provider ON cortex.feedback(provider_id);
```

---

## 10. Billing Suggestions

### billing_suggestions

AI-generated billing code suggestions with evidence.

```sql
CREATE TABLE cortex.billing_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES cortex.notes(id),
    encounter_id UUID NOT NULL REFERENCES cortex.encounters(id),
    
    -- Suggested code
    suggested_code VARCHAR(10) NOT NULL,             -- E/M code: '99231', '99232', '99233', '99253', etc.
    coding_method VARCHAR(10) NOT NULL,              -- 'mdm' (medical decision making), 'time'
    
    -- MDM components
    mdm_problems JSONB,                              -- Number and complexity of problems addressed
    mdm_data JSONB,                                  -- Amount and complexity of data reviewed
    mdm_risk JSONB,                                  -- Risk of complications/morbidity/mortality
    
    -- Time-based
    total_time_minutes INTEGER,
    time_components JSONB,                           -- Breakdown: face-to-face, chart review, coordination, etc.
    
    -- Evidence (transcript-linked)
    evidence JSONB NOT NULL,                         -- [{criterion, evidence_text, transcript_timestamp, source}]
    
    -- Alternative codes
    alternative_codes JSONB,                         -- Other defensible codes with justification
    
    -- Resolution
    final_code VARCHAR(10),                          -- What the provider selected
    provider_id UUID REFERENCES cortex.users(id),
    resolved_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_billing_encounter ON cortex.billing_suggestions(encounter_id);
CREATE INDEX idx_billing_code ON cortex.billing_suggestions(suggested_code);
```

---

## 11. Entity Relationship Diagram

```
                           ┌──────────────┐
                           │    users     │
                           └──────┬───────┘
                                  │
                    ┌─────────────┼─────────────────┐
                    │             │                  │
                    ▼             ▼                  ▼
             ┌────────────┐ ┌─────────┐      ┌────────────┐
             │ encounters │ │ consent │      │ audit_log  │
             └─────┬──────┘ │ records │      └────────────┘
                   │        └─────────┘
      ┌────────┬───┼────────┬──────────┬──────────────┐
      │        │   │        │          │              │
      ▼        ▼   ▼        ▼          ▼              ▼
┌──────────┐ ┌────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐
│recordings│ │note│ │epic_data │ │ entity   │ │ procedure    │
│          │ │ s  │ │ _pastes  │ │extractions│ │ _notes       │
└────┬─────┘ └─┬──┘ └──────────┘ └──────────┘ └──────────────┘
     │         │
     ▼         ├──────────────────┐
┌──────────┐   │                  │
│transcripts│  ▼                  ▼
└────┬──────┘ ┌──────────┐ ┌───────────────┐
     │        │note      │ │ note_versions │
     ▼        │_sections │ └───────────────┘
┌──────────┐  └─────┬────┘
│transcript│        │
│_segments │        ▼
└──────────┘  ┌──────────┐
              │ feedback  │
              └──────────┘

     ┌───────────────┐
     │ council_runs  │
     └───────┬───────┘
             │
             ▼
     ┌───────────────┐
     │council_outputs│
     └───────────────┘
     
     ┌───────────────────┐
     │billing_suggestions│
     └───────────────────┘
     
     ┌───────────────┐
     │break_glass_log│
     └───────────────┘
```

---

## 12. Migration Strategy

### Phase 1: CORTEX Schema Creation

```sql
-- 1. Create schema
CREATE SCHEMA IF NOT EXISTS cortex;

-- 2. Create all tables (in dependency order)
-- users → encounters → recordings → transcripts → ...

-- 3. Create indexes

-- 4. Set up row-level security policies
ALTER TABLE cortex.encounters ENABLE ROW LEVEL SECURITY;
CREATE POLICY provider_access ON cortex.encounters
    FOR ALL TO cortex_app
    USING (provider_id = current_setting('app.current_user_id')::uuid);
```

### Phase 2: TALIA 1.0 Migration (Separate)

The TALIA 1.0 migration from Google Sheets to Cloud SQL is documented in `docs/cloud-sql-migration-email.html` and handled by AppSheet's built-in "Copy App to SQL Database" feature.

### Cross-Reference View

```sql
-- View joining TALIA census with CORTEX encounters
CREATE VIEW cortex.census_with_encounters AS
SELECT 
    c.patient_mrn,
    c.patient_name,
    c.room_number,
    c.facility,
    c.admission_date,
    c.attending_provider,
    e.id AS encounter_id,
    e.phase,
    e.active_domains,
    e.acuity_score,
    n.status AS note_status,
    n.suggested_billing_code
FROM public.hospital_census c
LEFT JOIN cortex.encounters e ON e.patient_mrn = c.patient_mrn 
    AND e.encounter_date = CURRENT_DATE
LEFT JOIN cortex.notes n ON n.encounter_id = e.id
WHERE c.provider_id = current_setting('app.current_user_id')
AND c.status = 'active';
```

---

## 13. Performance Considerations

| Table | Expected Volume | Partitioning | Archival |
|-------|----------------|--------------|----------|
| encounters | ~375/month | None (low volume) | Archive > 2 years to BigQuery |
| recordings | ~500/month | None | GCS lifecycle (Standard → Coldline) |
| transcripts | ~500/month | None | Archive > 2 years |
| transcript_segments | ~50,000/month | By transcript_id | Archive > 2 years |
| notes | ~375/month | None | Archive > 2 years |
| note_sections | ~2,000/month | None | Archive > 2 years |
| note_versions | ~1,000/month | None | Archive > 2 years |
| audit_log | ~50,000/month | **Monthly partitions** | BigQuery replication |
| council_outputs | ~3,000/month | None | Archive > 1 year |

At TKE's current volume (~15 patients/day), Cloud SQL db-g1-small is more than sufficient. The heaviest table is `audit_log`, which is partitioned monthly and replicated to BigQuery.
