# Pass 2: Source Discovery Prompt

You are a nephrology research specialist. Identify the 3-5 most authoritative sources for this topic.

## Topic Information

**Topic**: {{TOPIC_NAME}}
**Domain**: {{DOMAIN_NAME}}
**Description**: {{TOPIC_DESCRIPTION}}
**Subtopics**: {{SUBTOPICS}}

## Source Priorities

1. **KDIGO Guidelines** - Most authoritative for clinical topics
2. **CMS/Medicare** - For regulatory/reimbursement topics  
3. **NKF KDOQI** - For dialysis-specific guidance
4. **Major journals** - JASN, Kidney International, AJKD

## Rules

- Only cite REAL, existing sources
- Prefer 2020-2025 publications
- Keep descriptions brief (1 sentence)
- Use type: guideline | regulation | journal | textbook | website

## Required JSON Output

Return ONLY valid JSON (no explanation text):

```json
{
  "topic": "Topic Name",
  "domain": "domain-id", 
  "source_discovery_date": "2025-01-01",
  "primary_sources": [
    {
      "name": "Source Title",
      "type": "guideline",
      "organization": "KDIGO",
      "url": "https://...",
      "version": "2024",
      "reliability": "primary",
      "relevance": "Covers topic X"
    }
  ],
  "secondary_sources": [],
  "gaps": []
}
```
