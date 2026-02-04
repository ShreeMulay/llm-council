# Architecture Specification

## System Diagram

```
Staff Browser (@premier-dialysis.com / @thekidneyexperts.com)
        │
        │  HTTPS
        ▼
┌──────────────────────┐
│  Cloud Run Service   │ ← serves static HTML
│  (premier-dialysis-  │
│   search)            │
├──────────────────────┤
│  Identity-Aware      │ ← checks Google identity
│  Proxy (IAP)         │   allows: @premier-dialysis.com
│                      │           @thekidneyexperts.com
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Static HTML Page    │
│  <gen-search-widget  │ ← Google's search widget
│   configId="..."     │   queries Vertex AI Search
│   alwaysOpened>      │   returns answers + citations
└──────────┬───────────┘
           │ Vertex AI Search API
           ▼
┌──────────────────────┐
│  Vertex AI Search    │
│  (Discovery Engine)  │
│                      │
│  ┌────────────────┐  │
│  │ Search App     │  │ ← answer generation, ranking
│  │ - Gemini LLM   │  │
│  │ - Citations     │  │
│  │ - Autocomplete  │  │
│  └───────┬────────┘  │
│          ▼           │
│  ┌────────────────┐  │
│  │ Data Store     │  │ ← document index
│  │ - Unstructured │  │
│  │ - OCR enabled  │  │
│  │ - Auto-chunked │  │
│  └───────┬────────┘  │
└──────────┼───────────┘
           │ Google Drive Connector
           │ (auto-sync daily)
           ▼
┌──────────────────────┐
│  Google Drive        │
│  Premier Dialysis    │
│  P&P's folder        │
│  (100+ documents)    │
└──────────────────────┘
```

## Component Details

### 1. Cloud Run Service

- **Image**: Nginx Alpine serving static files
- **Resources**: Minimum (256MB RAM, 1 vCPU)
- **Scaling**: 0-1 instances (scale to zero when idle)
- **Region**: us-central1
- **Ingress**: Internal + Cloud Load Balancing (for IAP)

### 2. Identity-Aware Proxy (IAP)

- **Backend**: Cloud Run service
- **OAuth Consent Screen**: Internal (Google Workspace)
- **IAP Members**:
  - `domain:premier-dialysis.com` → IAP-secured Web App User
  - `domain:thekidneyexperts.com` → IAP-secured Web App User
- **Requires**: Cloud Load Balancer + backend service (IAP doesn't attach directly to Cloud Run)

### 3. Vertex AI Search App

- **Type**: Search with answer generation
- **Model**: Gemini (latest stable)
- **Answer behavior**:
  - Always cite source documents
  - Include extractive segments (exact quotes)
  - Say "I don't have information on this" for out-of-scope queries
- **Autocomplete**: Enabled
- **Spelling correction**: Enabled

### 4. Data Store

- **Type**: Unstructured documents
- **Source**: Google Drive connector
- **Folder**: `1lWgOw9thvj5hD7qIYukgZ5DRY3OwvoK4`
- **Sync schedule**: Daily (configurable)
- **Processing**: OCR for PDFs, auto-chunking, metadata extraction

## IAP Architecture Detail

Since IAP requires a Cloud Load Balancer, the full auth path is:

```
Browser → Global HTTPS LB → Backend Service (IAP enabled) → Cloud Run
```

Setup steps:
1. Create a serverless NEG pointing to the Cloud Run service
2. Create a backend service with the NEG
3. Enable IAP on the backend service
4. Create an HTTPS load balancer with the backend service
5. Configure SSL cert (managed by Google) for custom domain
6. Add IAP policy: allow `domain:premier-dialysis.com` and `domain:thekidneyexperts.com`

## Alternative: Simplified Auth (If IAP Too Complex)

If the load balancer + IAP setup is too much overhead for a 40-person tool:

1. Deploy Cloud Run with `--allow-unauthenticated`
2. Add Firebase Auth to the HTML page
3. Check email domain client-side before showing widget
4. Less secure but 80% simpler to set up

This can be revisited during Phase 4 implementation.
