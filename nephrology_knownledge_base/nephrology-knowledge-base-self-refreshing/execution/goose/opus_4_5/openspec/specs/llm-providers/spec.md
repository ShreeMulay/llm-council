# LLM Providers Specification

## Purpose

Defines the LLM providers, models, and routing strategy for the knowledge base generation pipeline.

## Requirements

### Requirement: Anthropic Models via OpenRouter

The system SHALL use Anthropic models exclusively through OpenRouter.

#### Scenario: Model Selection
- GIVEN the need for Anthropic models
- WHEN selecting a provider
- THEN the system MUST use OpenRouter as the provider
- AND MUST NOT use direct Anthropic API

#### Scenario: Supported Models
- GIVEN Anthropic model requirements
- WHEN configured
- THEN the system MUST support:
  - `claude-sonnet-4-5` → OpenRouter model ID: `anthropic/claude-sonnet-4`
  - `claude-opus-4-5` → OpenRouter model ID: `anthropic/claude-opus-4`
- AND MUST NOT use older Claude models (3.x, etc.)

#### Scenario: API Key Configuration
- GIVEN OpenRouter is the provider
- WHEN the system initializes
- THEN it MUST read `OPENROUTER_API_KEY` from environment
- AND MUST fail gracefully if not set

### Requirement: Model Hierarchy

The system SHALL prioritize models as follows.

#### Scenario: Primary Models (Anthropic via OpenRouter)
- GIVEN content generation tasks
- WHEN selecting a model
- THEN the system SHOULD prefer:
  1. `claude-sonnet-4-5` for most generation tasks
  2. `claude-opus-4-5` for validation and complex reasoning

#### Scenario: Fallback Models (Google)
- GIVEN Anthropic model unavailability or rate limits
- WHEN fallback is needed
- THEN the system MAY use:
  - `gemini-2-5-pro` for generation
  - `gemini-2-5-flash` for lightweight tasks

### Requirement: Pass-Specific Model Assignment

Each pass SHALL use appropriate models for its task.

#### Scenario: Pass 1 - Skeleton Generation
- GIVEN skeleton generation
- WHEN assigning model
- THEN primary MUST be `claude-sonnet-4-5`
- AND fallback MAY be `gemini-2-5-pro`

#### Scenario: Pass 2 - Source Discovery
- GIVEN source discovery
- WHEN assigning model
- THEN primary MUST be `claude-sonnet-4-5`
- AND fallback MAY be `gemini-2-5-pro`

#### Scenario: Pass 3 - Content Generation
- GIVEN citation-first content generation
- WHEN assigning model
- THEN primary MUST be `claude-sonnet-4-5`
- AND fallback MAY be `gemini-2-5-pro`

#### Scenario: Pass 4 - Validation
- GIVEN cross-LLM validation
- WHEN assigning models
- THEN primary MUST be `claude-opus-4-5`
- AND secondary MUST be `claude-sonnet-4-5`
- AND tertiary MAY be `gemini-2-5-pro`
- AND minimum 2 models MUST agree for validation pass

#### Scenario: Pass 5 - Cross-Linking
- GIVEN cross-linking tasks
- WHEN assigning model
- THEN primary MUST be `claude-sonnet-4-5`
- AND fallback MAY be `gemini-2-5-flash`

### Requirement: Concurrence Checking

The system SHALL use multiple LLMs for fact verification.

#### Scenario: Concurrence Models
- GIVEN fact validation requirements
- WHEN checking concurrence
- THEN the system MUST query:
  - `claude-opus-4-5` (highest authority)
  - `claude-sonnet-4-5` (second opinion)
  - `gemini-2-5-pro` (diversity of perspective)

#### Scenario: Agreement Threshold
- GIVEN concurrence responses
- WHEN evaluating agreement
- THEN minimum 80% agreement MUST be required
- AND disagreements MUST be flagged for review

### Requirement: OpenRouter Configuration

The system SHALL properly configure OpenRouter requests.

#### Scenario: Request Headers
- GIVEN an OpenRouter API call
- WHEN constructing the request
- THEN headers MUST include:
  - `Authorization: Bearer {OPENROUTER_API_KEY}`
  - `HTTP-Referer: https://github.com/nephrology-knowledge-base`
  - `X-Title: Nephrology Knowledge Base`

#### Scenario: Model ID Format
- GIVEN an Anthropic model via OpenRouter
- WHEN specifying the model
- THEN the format MUST be `anthropic/{model-name}`
- Example: `anthropic/claude-sonnet-4`

### Requirement: Cost Management

The system SHALL track and optimize API costs.

#### Scenario: Cost Tracking
- GIVEN API responses
- WHEN tracking usage
- THEN the system MUST log:
  - Input tokens
  - Output tokens
  - Model used
  - Estimated cost

#### Scenario: Model Cost Tiers
- GIVEN cost optimization goals
- WHEN selecting models
- THEN costs SHOULD be considered:
  - Opus: highest cost, use for validation only
  - Sonnet: moderate cost, primary generation
  - Gemini: lowest cost, fallback/bulk tasks
