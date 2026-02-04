# Deployment Guide

## Prerequisites

1. **Google Cloud account** with billing enabled
2. **gcloud CLI** installed: `https://cloud.google.com/sdk/docs/install`
3. **Authenticated**: `gcloud auth login`
4. **Access** to the Premier Dialysis P&P Google Drive folder

## Quick Start (30 minutes)

### Phase 1: GCP Project Setup

```bash
# Create a new GCP project (or use existing)
gcloud projects create premier-dialysis-search --name="Premier Dialysis Search"

# Set it as active
gcloud config set project premier-dialysis-search

# Link billing account
gcloud billing accounts list
gcloud billing projects link premier-dialysis-search --billing-account=YOUR_BILLING_ACCOUNT_ID

# Claim the $1,000 AI Applications free credit
# Go to: https://console.cloud.google.com/gen-app-builder
# Click "Get started" — credit is applied automatically for new customers
```

### Phase 2: Run Setup Script

```bash
cd development/premier-dialysis-search
chmod +x gcp/setup.sh
./gcp/setup.sh
```

The script will:
1. Enable all required APIs
2. Guide you through Data Store creation (console UI)
3. Guide you through Search App creation (console UI)
4. Deploy the static site to Cloud Run
5. Output the live URL

### Phase 3: Test Without Auth

At this point, the search page is live on Cloud Run (unauthenticated).
Test it:
1. Open the Cloud Run URL in your browser
2. Try searching for policies
3. Verify citations are accurate
4. Run automated tests: `bun run scripts/test-queries.ts`

### Phase 4: Add IAP Authentication

Follow `gcp/iap-config.md` step by step. Summary:
1. Configure OAuth consent screen
2. Create serverless NEG → backend service → URL map → HTTPS proxy → forwarding rule
3. Enable IAP on the backend service
4. Add domain whitelist: `@premier-dialysis.com`, `@thekidneyexperts.com`
5. Lock down Cloud Run to only accept load balancer traffic

### Phase 5: Custom Domain (Optional)

1. Get the load balancer IP from the forwarding rule
2. Add DNS A record: `policies.premier-dialysis.com` → IP
3. Wait for managed SSL cert (~15-30 min)

### Phase 6: Rollout

1. Share the URL with 3-5 pilot users
2. Collect feedback for 2-3 days
3. Roll out to all 40 staff
4. Share the staff guide (`docs/staff-guide.md`)

## Maintenance

### Adding New Domains

```bash
gcloud iap web add-iam-policy-binding \
  --resource-type=backend-services \
  --service=premier-dialysis-backend \
  --member="domain:newdomain.com" \
  --role="roles/iap.httpsResourceAccessor"
```

### Updating the Search Page

```bash
# Edit firebase/public/index.html
# Then redeploy:
gcloud run deploy premier-dialysis-search \
  --source=firebase/ \
  --region=us-central1
```

### Monitoring

- **Search analytics**: Console > AI Applications > your app > Analytics
- **Cloud Run logs**: Console > Cloud Run > premier-dialysis-search > Logs
- **Cost**: Console > Billing > Reports (filter by project)

## Cost Monitoring

| Metric | Where to Check |
|--------|---------------|
| Query count | AI Applications > Analytics |
| Monthly spend | Billing > Reports |
| Free credit remaining | Billing > Credits |
| Cloud Run requests | Cloud Run > Metrics |

Set a budget alert at $50/mo to catch any unexpected usage.
