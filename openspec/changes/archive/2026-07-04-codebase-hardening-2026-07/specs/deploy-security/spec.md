# Deploy Security Delta — Codebase Hardening 2026-07

## New Requirements

### Requirement: Strict Vertex deployment verification

Deploy tooling SHALL verify that production health reports `require_vertex_anthropic=true` and the expected Vertex project/location before a deployment is considered successful.

#### Scenario: Health lacks strict Vertex mode

GIVEN a deployment completed at the platform level
WHEN post-deploy verification reads `/health`
AND the health payload does not report `require_vertex_anthropic=true`
THEN deploy verification SHALL fail.

### Requirement: Public ingress requires robust API-key enforcement

For Cloud Run or any public proxy ingress, authentication SHALL NOT trust client-controlled `X-Forwarded-For` entries for bypassing the API key. Tailnet allowlist bypasses SHALL be disabled unless explicitly enabled for a trusted direct-ingress deployment.

#### Scenario: Spoofed X-Forwarded-For tailnet IP

GIVEN a public request without `X-Council-Key`
AND `X-Forwarded-For` includes a spoofed tailnet IP followed by a public IP
WHEN the request targets a protected API route
THEN the request SHALL be rejected with 401.

### Requirement: Webhook callback URL safety

Async webhook callback URLs SHALL be validated before council execution begins. Private, loopback, link-local, metadata, multicast, and malformed destinations SHALL be rejected before paid model calls are made.

#### Scenario: Metadata service callback URL

GIVEN an async council request with webhook URL `http://169.254.169.254/latest/meta-data/`
WHEN the request is accepted for processing
THEN the service SHALL reject the request before launching council execution.
