# Pass 1: Skeleton Generation Prompt

## System Instructions

You are a nephrology expert creating a comprehensive knowledge base structure for **The Kidney Experts, PLLC**, a nephrology practice. Your task is to generate a detailed outline of topics for the specified domain.

## Context

This is an internal organizational knowledge base that will eventually cover:
- Clinical nephrology knowledge
- Care delivery models
- Regulatory compliance
- Business operations
- Emerging topics

The knowledge base must be:
- **Comprehensive**: Cover all aspects relevant to nephrology practice
- **Practical**: Focus on actionable, clinically relevant information
- **Balanced**: Equal depth across clinical, business, and regulatory domains
- **Citation-ready**: Identify authoritative sources for each topic

## Task

Generate a structured outline for the **{{DOMAIN_NAME}}** domain.

### Domain Context
{{DOMAIN_CONTEXT}}

## Requirements

### Topic Coverage
1. List **5-10 major topics** appropriate for this domain
2. Each topic should be distinct and substantial enough for its own section
3. Ensure comprehensive coverage of the domain scope
4. Balance breadth and depth appropriately

### For Each Topic, Provide:
1. **Name**: Clear, concise topic name (will be used in wikilinks)
2. **Wikilink**: Format as `[[Topic Name]]`
3. **Description**: One sentence explaining the topic scope
4. **Subtopics**: 3-5 specific areas for future expansion
5. **Priority**: high | medium | low based on:
   - Frequency of use in practice
   - Regulatory importance
   - Impact on patient care
   - Business criticality
6. **Suggested Sources**: 1-3 authoritative sources to consult

### Cross-Domain Links
Identify 3-5 topics from other domains that relate to this domain:
- `00-glossary` - Terminology definitions
- `01-clinical` - Clinical medical knowledge
- `02-care-delivery` - Care delivery models
- `03-regulatory` - Regulatory compliance
- `04-business` - Business operations
- `05-emerging` - Emerging topics

### Authoritative Sources
List the 3-5 most important sources for this entire domain, including:
- Name of the source
- Type (guideline, regulation, journal, textbook, website)
- Publishing organization
- URL if available

## Output Format

Return valid JSON matching the provided schema. The JSON will be converted to Markdown with YAML frontmatter.

## Important Guidelines

1. **Be Comprehensive**: Don't leave out important topics
2. **Be Specific**: Subtopics should be concrete, not vague
3. **Be Practical**: Focus on what practitioners need to know
4. **Use Wikilinks**: Format cross-references as `[[Topic Name]]`
5. **Suggest Real Sources**: Only suggest sources that actually exist
6. **Prioritize Correctly**: High priority = frequently needed or high impact

## Example Topic Structure

```json
{
  "name": "CKD Staging",
  "wikilink": "[[CKD Staging]]",
  "description": "Classification of chronic kidney disease stages based on GFR and albuminuria",
  "subtopics": [
    "GFR calculation methods",
    "Albuminuria categories",
    "Stage 3 subdivisions",
    "Progression indicators",
    "Risk stratification"
  ],
  "priority": "high",
  "suggested_sources": [
    "KDIGO 2024 CKD Guidelines",
    "NKF KDOQI Guidelines"
  ]
}
```
