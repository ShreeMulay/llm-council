# IAP Configuration Guide

## Overview

Identity-Aware Proxy (IAP) restricts access to the policy search app to staff from `@premier-dialysis.com` and `@thekidneyexperts.com`. IAP requires a Cloud Load Balancer in front of Cloud Run.

## Prerequisites

- Cloud Run service deployed (`premier-dialysis-search`)
- APIs enabled: `iap.googleapis.com`, `compute.googleapis.com`
- OAuth consent screen configured

## Step 1: Configure OAuth Consent Screen

1. Go to: **APIs & Services > OAuth consent screen**
   - `https://console.cloud.google.com/apis/credentials/consent`
2. Select **External** user type (required for multi-domain)
3. Fill in:
   - App name: `Premier Dialysis Policy Search`
   - Support email: your admin email
   - Authorized domains: `premier-dialysis.com`, `thekidneyexperts.com`
4. Scopes: default (email, profile, openid)
5. Test users: add a few staff emails for initial testing
6. Save

## Step 2: Create Serverless NEG

```bash
# Create a serverless network endpoint group pointing to Cloud Run
gcloud compute network-endpoint-groups create premier-dialysis-neg \
  --region=us-central1 \
  --network-endpoint-type=serverless \
  --cloud-run-service=premier-dialysis-search
```

## Step 3: Create Backend Service

```bash
# Create backend service
gcloud compute backend-services create premier-dialysis-backend \
  --global \
  --load-balancing-scheme=EXTERNAL_MANAGED

# Add the NEG to the backend service
gcloud compute backend-services add-backend premier-dialysis-backend \
  --global \
  --network-endpoint-group=premier-dialysis-neg \
  --network-endpoint-group-region=us-central1
```

## Step 4: Create URL Map and HTTPS Proxy

```bash
# Create URL map
gcloud compute url-maps create premier-dialysis-urlmap \
  --default-service=premier-dialysis-backend

# Create managed SSL certificate (if using custom domain)
gcloud compute ssl-certificates create premier-dialysis-cert \
  --domains=policies.premier-dialysis.com \
  --global

# Or use a self-managed cert / skip for IP-only access

# Create HTTPS proxy
gcloud compute target-https-proxies create premier-dialysis-https-proxy \
  --ssl-certificates=premier-dialysis-cert \
  --url-map=premier-dialysis-urlmap

# Create forwarding rule (this gives you an external IP)
gcloud compute forwarding-rules create premier-dialysis-https-rule \
  --global \
  --target-https-proxy=premier-dialysis-https-proxy \
  --ports=443
```

## Step 5: Enable IAP

```bash
# Enable IAP on the backend service
gcloud iap web enable \
  --resource-type=backend-services \
  --service=premier-dialysis-backend
```

## Step 6: Add Domain Whitelist

```bash
# Allow all users from @premier-dialysis.com
gcloud iap web add-iam-policy-binding \
  --resource-type=backend-services \
  --service=premier-dialysis-backend \
  --member="domain:premier-dialysis.com" \
  --role="roles/iap.httpsResourceAccessor"

# Allow all users from @thekidneyexperts.com
gcloud iap web add-iam-policy-binding \
  --resource-type=backend-services \
  --service=premier-dialysis-backend \
  --member="domain:thekidneyexperts.com" \
  --role="roles/iap.httpsResourceAccessor"
```

## Step 7: Configure DNS (Custom Domain)

If using a custom domain like `policies.premier-dialysis.com`:

1. Get the load balancer IP:
   ```bash
   gcloud compute forwarding-rules describe premier-dialysis-https-rule \
     --global --format='value(IPAddress)'
   ```
2. Add an A record in your DNS:
   - `policies.premier-dialysis.com` → `<IP from above>`
3. Wait for SSL certificate provisioning (~15-30 min)

## Step 8: Update Cloud Run to Reject Direct Access

Once IAP + LB are working, lock down Cloud Run to only accept traffic from the load balancer:

```bash
gcloud run services update premier-dialysis-search \
  --region=us-central1 \
  --ingress=internal-and-cloud-load-balancing
```

This prevents anyone from bypassing IAP by hitting the Cloud Run URL directly.

## Verification

1. Open `https://policies.premier-dialysis.com` in a browser
2. You should see a Google sign-in page
3. Sign in with an `@premier-dialysis.com` or `@thekidneyexperts.com` account
4. You should see the policy search page
5. Try signing in with a different domain — should be denied

## Adding More Domains Later

```bash
gcloud iap web add-iam-policy-binding \
  --resource-type=backend-services \
  --service=premier-dialysis-backend \
  --member="domain:newdomain.com" \
  --role="roles/iap.httpsResourceAccessor"
```

## Adding Individual Users (Non-Domain)

```bash
gcloud iap web add-iam-policy-binding \
  --resource-type=backend-services \
  --service=premier-dialysis-backend \
  --member="user:contractor@gmail.com" \
  --role="roles/iap.httpsResourceAccessor"
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| 403 after sign-in | Check IAP policy — domain may not be added |
| Redirect loop | Check OAuth consent screen authorized domains |
| SSL error | Wait for cert provisioning (up to 30 min) |
| Cloud Run 403 | Check ingress setting — should allow LB traffic |
| "This app is blocked" | OAuth consent screen may be in testing mode — publish it |
