# CORTEX — Compliance, Security & Privacy Specification

> **Version**: 1.0
> **Last Updated**: March 4, 2026
> **Regulatory Framework**: HIPAA (Privacy Rule, Security Rule, Breach Notification Rule)
> **State Law**: Tennessee medical records retention (10 years)
> **Infrastructure**: GCP under TKE's existing BAA

---

## 1. Regulatory Landscape

### HIPAA Compliance

CORTEX processes Protected Health Information (PHI) including:
- Patient names, MRNs, dates of birth
- Clinical notes, lab results, medication lists
- Audio recordings of patient encounters
- Provider-patient conversation transcripts

All components must comply with the HIPAA Privacy Rule, Security Rule, and Breach Notification Rule.

### Key Regulatory Constraints

| Requirement | CORTEX Approach |
|-------------|-----------------|
| BAA with cloud provider | GCP BAA already in place for TKE |
| BAA with AI model providers | Vertex AI models covered under GCP BAA; Claude for Healthcare has separate healthcare addendum |
| Encryption at rest | AES-256 (GCP default for all services) |
| Encryption in transit | TLS 1.3 for all connections |
| Access controls | IAP (zero-trust) + Context-Aware Access + RBAC + row-level security |
| Audit trail | Complete audit log of all PHI access and modifications |
| Minimum necessary | Users see only patients assigned to them |
| Patient consent | Verbal consent captured and logged before recording |
| Data retention | 10 years (Tennessee law) for medical records and audio |
| Breach notification | Cloud Monitoring alerts + incident response plan |

### State Law: Tennessee

- **Medical records retention**: 10 years from last encounter (Tenn. Code Ann. § 68-11-305)
- **Audio recording consent**: Tennessee is a one-party consent state for audio recording. However, TKE policy requires explicit patient consent for transparency and trust.

---

## 2. Data Classification

### PHI Categories in CORTEX

| Data Type | PHI Level | Storage | Encryption | Retention |
|-----------|-----------|---------|------------|-----------|
| Audio recordings | High | GCS | AES-256 at rest, TLS 1.3 in transit | 10 years |
| Transcripts | High | Cloud SQL | AES-256 at rest, TLS 1.3 in transit | 10 years |
| Clinical notes (final) | High | Cloud SQL | AES-256 at rest, TLS 1.3 in transit | 10 years |
| Note drafts/versions | High | Cloud SQL | AES-256 at rest, TLS 1.3 in transit | 10 years |
| EPIC data pastes | High | Cloud SQL | AES-256 at rest, TLS 1.3 in transit | 10 years |
| EPIC screenshots | High | GCS | AES-256 at rest, TLS 1.3 in transit | 10 years |
| Entity extractions | High | Cloud SQL | AES-256 at rest, TLS 1.3 in transit | 10 years |
| Consent records | High | Cloud SQL | AES-256 at rest, TLS 1.3 in transit | 10 years |
| Audit logs | Medium | Cloud SQL + BigQuery | AES-256 | Indefinite |
| User accounts | Medium | Cloud SQL | AES-256 | While employed + 7 years |
| System logs | Low | Cloud Logging | Google-managed | 90 days (configurable) |
| Analytics (aggregated) | De-identified | BigQuery | AES-256 | Indefinite |

### Data Flow Diagram (PHI Boundaries)

```
┌─────────────────────────────────────────────────────────────────┐
│                     PHI BOUNDARY (GCP)                           │
│                                                                  │
│  ┌──────────┐        ┌──────────┐        ┌──────────────────┐  │
│  │ Client   │──TLS──▶│Cloud Run │──TLS──▶│ Cloud SQL        │  │
│  │ (PWA)    │        │(Backend) │        │ (MySQL 8.4)      │  │
│  └──────────┘        └──────────┘        └──────────────────┘  │
│       │                    │                                     │
│       │                    ├──TLS──▶ GCS (Audio, Screenshots)   │
│       │                    ├──TLS──▶ Vertex AI (STT, Models)    │
│       │                    └──TLS──▶ Vertex AI RAG Engine       │
│       │                                                          │
│  ┌────┴─────┐                                                    │
│  │ Offline  │  ← Encrypted with session-derived key             │
│  │ Cache    │  ← IndexedDB on device                            │
│  │ (temp)   │  ← Cleared on sync                                │
│  └──────────┘                                                    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                CITRIX VDI BOUNDARY                         │   │
│  │  Philippines data entry team accesses CORTEX via          │   │
│  │  Citrix VDI only. PHI never leaves US servers.            │   │
│  │  No local storage, no screenshots, no clipboard export.   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Consent Framework

### Recording Consent

Audio recording requires explicit patient consent. This is a **hard gate** — no recording begins without consent capture.

### Consent Flow

```
1. Scribe/Provider opens encounter for patient
2. CORTEX displays consent capture screen (mandatory)
3. Options:
   a. "Verbal consent obtained" — proceed with recording
   b. "Patient declined recording" — proceed WITHOUT recording (manual entry only)
   c. "Patient unable to consent" — specify reason, proceed WITHOUT recording
   d. "Legal representative consented" — specify relationship, proceed with recording
4. Consent decision is logged with:
   - Patient MRN
   - Consent type (verbal, declined, unable, representative)
   - Consented by (patient, POA, legal rep — name)
   - Provider present
   - Timestamp
   - Encounter ID
5. Consent record is immutable (cannot be edited or deleted)
```

### Consent Data Model

```sql
CREATE TABLE consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID NOT NULL REFERENCES encounters(id),
    patient_mrn VARCHAR(20) NOT NULL,
    consent_type VARCHAR(20) NOT NULL,  -- 'verbal', 'declined', 'unable', 'representative'
    consented_by VARCHAR(50) NOT NULL,  -- 'patient', 'poa', 'legal_rep'
    consented_by_name VARCHAR(255),     -- Name if representative
    consented_by_relationship VARCHAR(100), -- 'spouse', 'parent', 'guardian', etc.
    inability_reason TEXT,              -- If 'unable', why
    provider_present_id UUID NOT NULL REFERENCES users(id),
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Immutable: no updated_at, no soft delete
    CONSTRAINT valid_consent_type CHECK (consent_type IN ('verbal', 'declined', 'unable', 'representative'))
);
```

### Non-Consent Workflow

When a patient declines recording:
1. Encounter continues normally but without audio
2. No transcription, no entity extraction from audio
3. Scribe does manual data entry (typed notes, exam findings)
4. Note council still generates from EPIC data + manual entries
5. Note is flagged: "Generated without encounter recording — based on manual entry and EPIC data only"
6. Billing documentation may be affected (less detail available)

### Pause/Mute During Recording

| State | Trigger | Behavior |
|-------|---------|----------|
| **Recording** | Default during in-room phase | Audio captured, transcribed |
| **Paused** | Provider taps pause button | Audio NOT captured. Visual indicator "Recording Paused." Resume button. |
| **Muted** | Sensitive moment (family discussion, non-patient topic) | Audio NOT captured. Transcript shows "[Recording paused — sensitive discussion]" |

Pause/mute is for:
- Family conversations the patient doesn't want recorded
- Non-clinical discussions (phone calls, side conversations)
- Provider-to-provider discussion that shouldn't be in the note
- Patient request mid-encounter

---

## 4. Access Control

### Authentication — Identity-Aware Proxy (IAP)

CORTEX uses **Google Cloud Identity-Aware Proxy (IAP)** as the primary authentication layer. IAP enforces zero-trust authentication at the infrastructure level — every request is verified before it reaches the application. No application-level OAuth flow is needed.

| Component | Implementation |
|-----------|---------------|
| **Authentication Layer** | Google Cloud Identity-Aware Proxy (IAP) — zero-trust perimeter |
| **Deployment Mode** | Direct on Cloud Run (no load balancer, $0 cost) |
| **Identity Provider** | Google Workspace (@thekidneyexperts.com) |
| **Protocol** | IAP session cookie + signed JWT (`X-Goog-IAP-JWT-Assertion`, ES256) |
| **MFA** | Enforced at Google Workspace level (required for all TKE staff) |
| **Device Management** | Chrome Enterprise Standard (all TKE Chromebooks managed) |
| **Device Trust** | NOT enforced at IAP level — providers need personal phone access. Would require Chrome Enterprise Premium (~$6/user/month) which is not used. |
| **Session** | IAP session cookie, tied to Google login session |
| **Session Termination** | Automatic on Google sign-out, admin revocation via Google Workspace |

**How IAP works:** Browser requests hit IAP before reaching Cloud Run. IAP checks the Google session cookie. If not signed in, redirects to Google Sign-In. After authentication, IAP injects a signed JWT header (`X-Goog-IAP-JWT-Assertion`) containing the user's email and stable ID. The FastAPI backend verifies this JWT and extracts user identity — no app-level OAuth code required.

### Context-Aware Access Policies

IAP enforces these policies at the infrastructure level:

| Policy | Target | Rule | Rationale |
|--------|--------|------|-----------|
| **IP allow-list** | `data_entry` | Allow only from Citrix server IP ranges | Philippines team must use Citrix VDI |
| **US geography** | All roles | Restrict to US-origin requests | All PHI access from US infrastructure |
| **Working hours** | `data_entry` | Restrict to defined hours (e.g., 6 AM - 6 PM CST) | Limit data entry access window |
| **No device restriction** | `provider` | Allow personal phones + managed Chromebooks | Providers need 24/7 mobile access (on-call, personal iPhones/Androids) |
| **No time restriction** | `provider`, `scribe` | 24/7 access | Clinical needs don't follow a schedule |

**Note on Citrix VDI:** IAP sees the Citrix server's US IP address, not the Philippines client IP. This is correct behavior — PHI access originates from US infrastructure.

### Offline Audio Upload — Signed GCS URLs

Service workers may not have access to IAP session cookies. CORTEX uses **pre-signed GCS upload URLs** for offline audio sync:

1. While online (IAP session active): backend generates PUT-only, time-limited (4-hour), path-scoped signed GCS URLs
2. URLs cached in service worker / IndexedDB
3. While offline: audio recorded and encrypted locally
4. When back online: service worker uploads directly to GCS via signed URL
5. Backend notified via GCS Pub/Sub notification

**HIPAA compliance of signed URLs:**
- Time-limited (4-hour expiry), path-scoped (single GCS object), PUT-only (no read/list/delete)
- Unforgeable (HMAC-SHA256 or RSA signed by GCP service account)
- Only generated for IAP-authenticated users
- Audio encrypted in transit (TLS 1.3) and at rest (GCS AES-256)
- GCS covered under TKE's GCP BAA

See `tech-stack.md` Section 10 for full signed URL implementation details.

### Role-Based Access Control

| Role | View Census | View Patient | Create Note | Edit Note | Sign Note | Manage Users | View Audit |
|------|-------------|-------------|-------------|-----------|-----------|--------------|------------|
| `provider` | Own patients | Own patients | Yes | Yes (own) | Yes | No | Own |
| `scribe` | Assigned provider's patients | Assigned | Yes | Yes (assigned) | No | No | No |
| `data_entry` | All (for data entry) | Data fields only | No | No | No | No | No |
| `admin` | All | All | No | No | No | Yes | All |
| `qa` | All | All (read-only) | No | No | No | No | All |

### Row-Level Security

- Providers see only patients assigned to them in the census
- Scribes see only patients of their assigned provider
- Data entry sees all patients (needed for sequential processing) but only data entry fields
- Break-glass access for emergencies (logged, requires justification)

### Break-Glass Access

```sql
-- Emergency access log
CREATE TABLE break_glass_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    patient_mrn VARCHAR(20) NOT NULL,
    reason TEXT NOT NULL,
    accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ
);
```

When a provider needs to access a patient not on their census:
1. "Emergency Access" button with mandatory justification field
2. Access granted immediately (no delay — clinical need)
3. Logged and flagged for admin review within 24 hours
4. Admin reviews and marks as appropriate or escalates

---

## 5. Audit Trail

### What Is Logged

Every interaction with PHI is logged:

| Event | Logged Data |
|-------|-------------|
| Patient record viewed | User, patient MRN, timestamp, fields viewed |
| Note created | User, patient MRN, note ID, timestamp |
| Note edited | User, note ID, section edited, before/after diff, timestamp |
| Note signed | User, note ID, timestamp, billing code |
| Note exported | User, note ID, export format, timestamp |
| Recording started/stopped | User, encounter ID, duration, timestamp |
| Recording paused/resumed | User, encounter ID, pause duration, timestamp |
| EPIC data pasted | User, patient MRN, data type, timestamp |
| Screenshot uploaded | User, patient MRN, filename, timestamp |
| Consent captured | See consent data model above |
| Login/logout | User, IP address, device info, timestamp |
| Break-glass access | User, patient MRN, reason, timestamp |
| Failed access attempt | User, resource, reason for denial, timestamp |
| Data export (bulk) | User, query parameters, record count, timestamp |
| User role change | Admin user, target user, old role, new role, timestamp |

### Audit Log Storage

```sql
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES users(id),
    patient_mrn VARCHAR(20),
    resource_type VARCHAR(50),
    resource_id UUID,
    action VARCHAR(20) NOT NULL,  -- 'view', 'create', 'update', 'delete', 'export', 'sign'
    details JSONB,                -- Event-specific metadata
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Immutable: no UPDATE or DELETE on this table
-- Partition by month for performance
-- Replicate to BigQuery for analysis
```

### Audit Log Retention

- Cloud SQL: 2 years (rolling)
- BigQuery: Indefinite (compliance archive)
- Cannot be modified or deleted (append-only)

---

## 6. Philippines Data Entry — Citrix VDI Security

### Architecture

TKE's Philippines-based data entry team accesses CORTEX exclusively through Citrix VDI (Virtual Desktop Infrastructure). This ensures PHI never leaves US-based servers.

### Security Controls

| Control | Implementation |
|---------|---------------|
| **Access method** | Citrix VDI only — no direct browser access |
| **PHI location** | All PHI stays on US servers. VDI streams pixels only. |
| **Clipboard** | Disabled (no copy from VDI to local machine) |
| **Local storage** | None — VDI session is stateless |
| **Printing** | Disabled |
| **Screenshots** | Blocked by Citrix policy |
| **USB/removable media** | Blocked |
| **Session recording** | Citrix sessions recorded for compliance audit |
| **Idle timeout** | 15 minutes idle → session lock, 30 minutes → disconnect |
| **Device** | TKE-owned Chromebooks shipped to Philippines |
| **Network** | VPN to TKE Citrix infrastructure |
| **IAP policy** | IP allow-list (Citrix server IPs only) + working hours restriction via Context-Aware Access |
| **IAP IP visibility** | IAP sees Citrix server's US IP, not Philippines client IP — correct behavior, PHI access originates from US |
| **Background checks** | Required for all Philippines team members |
| **Training** | HIPAA training required, documented, annual refresher |
| **Access hours** | Restricted via IAP Context-Aware Access time-based policy |

### Data Entry-Specific Restrictions

The data entry role in CORTEX has the most restricted permissions:

1. Can paste EPIC data into CORTEX paste area
2. Can upload screenshots
3. Can confirm/correct parsed data values
4. **Cannot** view clinical notes
5. **Cannot** listen to recordings
6. **Cannot** view prior notes or encounter history
7. **Cannot** export any data
8. **Cannot** access audit logs

### Monitoring

- Citrix session analytics (login times, active time, idle time)
- Access pattern anomaly detection (unusual hours, unusual volume)
- Failed login monitoring with lockout (5 attempts → 30 min lockout)

---

## 7. Encryption

### At Rest

| Component | Encryption | Key Management |
|-----------|------------|----------------|
| Cloud SQL | AES-256 | Google-managed (GMEK) — CMEK optional |
| GCS (audio, documents) | AES-256 | Google-managed (GMEK) |
| BigQuery | AES-256 | Google-managed |
| IndexedDB (offline) | AES-256-GCM | Session-derived key (Web Crypto API) |

### In Transit

| Path | Encryption |
|------|------------|
| Client ↔ Cloud Run | TLS 1.3 |
| Cloud Run ↔ Cloud SQL | TLS 1.3 (Cloud SQL Proxy) |
| Cloud Run ↔ GCS | TLS 1.3 |
| Cloud Run ↔ Vertex AI | TLS 1.3 |
| Citrix VDI ↔ CORTEX | TLS 1.3 (within Citrix tunnel) |

### Offline Encryption

When CORTEX operates offline (no internet connection):

1. Audio is recorded to IndexedDB
2. Encrypted with AES-256-GCM using a session-derived key
3. Key derivation: HKDF from IAP session token + device fingerprint
4. On reconnection: service worker uploads via pre-signed GCS URLs (generated while online), local copy deleted
5. If signed URLs expire before sync: user must return to CORTEX (triggering IAP re-auth) to generate new signed URLs

```javascript
// Simplified offline encryption flow
const sessionKey = await deriveKey(iapSessionToken, deviceFingerprint);
const encryptedAudio = await crypto.subtle.encrypt(
  { name: 'AES-GCM', iv: randomIV },
  sessionKey,
  audioBuffer
);
await indexedDB.put('pending_uploads', { id, encryptedAudio, iv, signedUrl });
```

---

## 8. Hospital Notification (Not MOU)

### DAX Precedent

CORTEX follows the precedent set by Microsoft's DAX Copilot (Dragon Ambient eXperience), which operates in hospitals nationwide without formal Memoranda of Understanding (MOUs). The approach:

1. **Notification, not permission** — Inform the hospital that TKE physicians use an AI-assisted documentation tool
2. **Compliance documentation** — Provide summary of HIPAA compliance measures
3. **Patient consent** — TKE handles consent at the practice level, not the hospital level
4. **Data handling** — No hospital data is stored outside of what's already in the clinical note. Audio is stored by TKE, not the hospital.

### Hospital Notification Template

A notification letter should include:
- Description of CORTEX (AI-assisted documentation)
- Confirmation of HIPAA compliance (BAA with GCP)
- Patient consent process
- Data handling (what's recorded, where it's stored, retention)
- Contact for questions (TKE compliance officer)
- NOT requesting permission — informing of practice

### Hospital-Specific Policies

| Hospital | Policy | Notes |
|----------|--------|-------|
| Jackson-Madison County General | Notification sent | Largest TKE hospital |
| West Tennessee Healthcare facilities | Notification sent | Multiple locations |
| Other facilities | As needed | Template available |

---

## 9. Data Retention

### Retention Schedule

| Data Type | Active Storage | Archive Storage | Total Retention | Deletion Method |
|-----------|---------------|-----------------|-----------------|-----------------|
| Audio recordings | GCS Standard (90 days) | GCS Coldline | 10 years from encounter | Automated lifecycle policy |
| Clinical notes | Cloud SQL | BigQuery archive | 10 years from encounter | Automated |
| Note versions | Cloud SQL | BigQuery archive | 10 years | Automated |
| Transcripts | Cloud SQL | BigQuery archive | 10 years | Automated |
| EPIC data | Cloud SQL | BigQuery archive | 10 years | Automated |
| Consent records | Cloud SQL | BigQuery archive | 10 years | Automated |
| Audit logs | Cloud SQL (2 years) | BigQuery | Indefinite | Never deleted |
| System logs | Cloud Logging (90 days) | — | 90 days | Auto-purge |

### Retention Implementation

```python
# GCS lifecycle policy for audio bucket
lifecycle_rules = [
    {
        "action": {"type": "SetStorageClass", "storageClass": "NEARLINE"},
        "condition": {"age": 90}  # After 90 days
    },
    {
        "action": {"type": "SetStorageClass", "storageClass": "COLDLINE"},
        "condition": {"age": 365}  # After 1 year
    },
    {
        "action": {"type": "Delete"},
        "condition": {"age": 3650}  # After 10 years
    }
]
```

### Right to Delete / Amendment

- Patients can request amendment to their medical records (not deletion — HIPAA does not require deletion of medical records)
- Amendment requests logged and processed per HIPAA § 164.526
- Original record preserved, amendment appended

---

## 10. Incident Response

### Breach Detection

| Detection Method | Monitored By |
|-----------------|--------------|
| Unusual access patterns | Cloud Monitoring + custom alerts |
| Failed authentication spikes | Cloud IAM + alerting |
| Data exfiltration attempts | VPC Flow Logs + DLP |
| Audit log anomalies | BigQuery scheduled queries |
| Citrix VDI policy violations | Citrix analytics |

### Breach Response Plan

```
1. DETECT — Automated alert or human report
2. CONTAIN — Disable affected accounts, revoke tokens
3. ASSESS — Determine scope (which patients, what data)
4. NOTIFY — Per HIPAA Breach Notification Rule:
   - HHS notification within 60 days
   - Patient notification without unreasonable delay
   - If >500 patients: media notification
5. REMEDIATE — Fix root cause, update controls
6. DOCUMENT — Complete incident report, lessons learned
```

### Key Contacts

| Role | Contact |
|------|---------|
| TKE Compliance Officer | TBD |
| IT Solutions | itsolutions@thekidneyexperts.com |
| GCP Support | Google Cloud support portal |
| Legal | TKE legal counsel |

---

## 11. AI-Specific Compliance

### AI Transparency

| Requirement | Implementation |
|-------------|---------------|
| Attestation statement | Required on every signed note: "AI-assisted note, reviewed and approved by [provider]" |
| Model identification | Audit log records which models generated each note and which tier was used |
| Confidence transparency | Provider sees confidence scores and disagreement flags |
| Source traceability | Every claim traceable to source (lab, transcript, EPIC paste) |
| No autonomous decisions | AI suggests, human decides. No auto-signing, no auto-ordering. |

### AI Risk Mitigations

| Risk | Mitigation |
|------|------------|
| Hallucinated lab values | Multi-model council + lab verification against EPIC data + high-risk field flagging |
| Incorrect medication doses | Cross-reference with EPIC med list + pharmacist review for high-risk meds |
| Wrong patient data | MRN verification at encounter start + continuous fuzzy monitoring |
| Fabricated exam findings | Transcript traceability — every exam finding linked to timestamp |
| Billing fraud | "Accurate code capture" framing, transcript-linked evidence, human approval required |
| Model bias | 3-model council with decorrelated training data reduces systematic bias |

### Billing Compliance

Language rules (embedded in all prompts and UI):

| DO SAY | DON'T SAY |
|--------|-----------|
| "Accurate code capture" | "Revenue optimization" |
| "Complete documentation" | "Upcoding" |
| "Defensible coding" | "Maximize billing" |
| "Highest supported code" | "Highest possible code" |
| "Documentation supports..." | "Bill for..." |

The billing suggestion system:
1. AI analyzes note content against E/M guidelines
2. Suggests the highest code that the documentation **actually supports**
3. Links each criterion to specific transcript timestamps or data sources
4. Provider reviews and can change the code
5. Final code selection is always the provider's decision
6. All billing suggestions logged for audit

---

## 12. Training Requirements

| Role | Training | Frequency |
|------|----------|-----------|
| All users | HIPAA Privacy & Security | Annual |
| All users | CORTEX system training | Onboarding + major updates |
| Providers | AI-assisted documentation review | Onboarding |
| Scribes | Data entry + note review workflow | Onboarding |
| Data entry (Philippines) | HIPAA + Citrix VDI security | Onboarding + annual |
| Admin | Audit log review + incident response | Onboarding + annual |

---

## 13. Compliance Checklist

### Pre-Launch

- [ ] GCP BAA confirmed active
- [ ] Cloud SQL encryption verified
- [ ] GCS encryption + lifecycle policies configured
- [ ] RBAC roles implemented and tested
- [ ] Audit logging operational
- [ ] Consent capture workflow tested
- [ ] Citrix VDI restrictions verified
- [ ] Philippines team HIPAA training documented
- [ ] Hospital notification letters sent
- [ ] Attestation statement approved by legal
- [ ] Billing language reviewed by compliance
- [ ] Breach response plan documented
- [ ] Data retention policies configured
- [ ] Penetration test completed
- [ ] Provider training materials ready

### Ongoing

- [ ] Quarterly access review (who has access to what)
- [ ] Monthly audit log review
- [ ] Annual HIPAA training refresher
- [ ] Annual penetration test
- [ ] Annual policy review and update
- [ ] Incident response drill (annual)
