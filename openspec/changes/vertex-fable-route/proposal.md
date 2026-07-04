# Route Claude Fable 5 Through Vertex AI Anthropic

Status: APPROVED

## Summary

Route `anthropic/claude-fable-5` through Anthropic-on-Vertex as the primary provider while retaining OpenRouter as a non-PHI/deidentified fallback only.

## Motivation

Claude Fable 5 is the default council member, lead evaluator, and chairman. The OpenRouter route is not PHI-safe. The configured Google Cloud / Vertex AI route is BAA-safe and PHI-eligible when running in covered Google Cloud projects/services under BAA, so the default Fable path must use Vertex AI Anthropic with Cloud Run ADC/service-account auth.

## Scope

### In scope

- Add Vertex Anthropic configuration and routing helpers.
- Use `AnthropicVertex(project_id=..., region=...)` with ADC/service account auth.
- Map `anthropic/claude-fable-5` to Vertex model ID `claude-fable-5`.
- Send adaptive thinking omitted from display and high output effort when supported.
- Keep OpenRouter fallback for Fable but document it as non-PHI/deidentified only.
- Add tests for config routing and Vertex client payload/response parsing.
- Set Cloud Run `VERTEX_PROJECT_ID` and `VERTEX_LOCATION` without JSON keys.

### Out of scope

- PHI detection or automatic fallback suppression based on prompt content.
- Service-account key files.
- Changing the Fireworks GLM-5.2 xHigh or Kimi K2.7 Code production slots.

## Acceptance Criteria

- Fable primary routing uses Vertex AI Anthropic and returns provider `vertex-anthropic`.
- Fable fallback remains available through OpenRouter and is clearly documented as non-PHI/deidentified only.
- Cloud Run deploy config sets Vertex project/location env vars and does not add JSON key secrets.
- Tests cover config helpers and Vertex client payload/response parsing without network calls.
