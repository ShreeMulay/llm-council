# n8n Workflow Conventions

Based on patterns established in the morning_messages project.

## Node Naming

### Format: `type-action-target`

```
fetch-slack-messages
transform-message-data
generate-content-llm
send-google-chat
validate-json-output
```

### Prefixes by Function

| Prefix | Purpose | Example |
|--------|---------|---------|
| `fetch-` | External data retrieval | `fetch-slack-messages` |
| `transform-` | Data manipulation | `transform-to-card-format` |
| `generate-` | LLM content creation | `generate-morning-summary` |
| `send-` | External output | `send-google-chat` |
| `validate-` | Data validation | `validate-llm-response` |
| `store-` | Memory/database ops | `store-to-zep` |
| `check-` | Conditional logic | `check-is-weekend` |
| `error-` | Error handling | `error-collector` |

---

## Error Handling

### Always Set continueOnFail

For external API nodes, enable `continueOnFail` to prevent workflow crashes:

```json
{
  "parameters": { ... },
  "continueOnFail": true
}
```

### Dedicated Error Collection

Create an error collector node that aggregates failures:

```javascript
// Error Collector Node
const errors = [];

for (const item of $input.all()) {
  if (item.json.error) {
    errors.push({
      node: item.json.nodeName,
      error: item.json.error,
      timestamp: new Date().toISOString()
    });
  }
}

if (errors.length > 0) {
  // Route to error notification
  return [{ json: { errors, hasErrors: true } }];
}

return [{ json: { hasErrors: false } }];
```

### Error Notification

Send aggregated errors to admin:

```
Error Collector → IF (hasErrors) → Send Slack/Email
```

---

## LLM Integration

### Preferred: OpenRouter with Claude

```json
{
  "model": "anthropic/claude-3.5-sonnet",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant..."
    },
    {
      "role": "user", 
      "content": "{{$json.prompt}}"
    }
  ],
  "max_tokens": 2000,
  "temperature": 0.7
}
```

### Structured Prompts with XML Tags

```xml
<context>
You are generating a morning message for a nephrology practice.
Today is {{$json.date}}.
</context>

<input_data>
<messages>
{{$json.messages}}
</messages>
</input_data>

<instructions>
1. Summarize the key messages
2. Highlight any urgent items
3. Format for Google Chat card
</instructions>

<output_format>
Respond with valid JSON:
{
  "summary": "...",
  "urgent_items": [...],
  "formatted_message": "..."
}
</output_format>
```

### Always Validate LLM Output

```javascript
// JSON Validation Node
const response = $input.first().json.content;

try {
  // Try to parse as JSON
  const parsed = JSON.parse(response);
  
  // Validate required fields
  if (!parsed.summary || !Array.isArray(parsed.urgent_items)) {
    throw new Error('Missing required fields');
  }
  
  return [{ json: { ...parsed, valid: true } }];
} catch (error) {
  // Return fallback content
  return [{
    json: {
      summary: "Unable to generate summary",
      urgent_items: [],
      formatted_message: response, // Use raw response as fallback
      valid: false,
      error: error.message
    }
  }];
}
```

---

## Memory Systems with Zep

### Store Content to Zep

```javascript
// Before using content, store it
const content = $input.first().json;

// Add to Zep memory
await $http.post('ZEP_API_URL/memory', {
  session_id: 'morning-messages',
  messages: [{
    role: 'assistant',
    content: JSON.stringify(content),
    metadata: {
      date: new Date().toISOString(),
      type: 'morning_message',
      content_hash: hashContent(content)
    }
  }]
});

return [{ json: content }];
```

### Retrieve to Avoid Repetition

```javascript
// Check if content was recently used
const recentMemory = await $http.get('ZEP_API_URL/memory', {
  params: {
    session_id: 'morning-messages',
    last_n: 30  // Last 30 messages
  }
});

const usedContentHashes = recentMemory.messages
  .map(m => m.metadata?.content_hash)
  .filter(Boolean);

// Filter out already-used content
const availableContent = $input.all().filter(item => 
  !usedContentHashes.includes(hashContent(item.json))
);

return availableContent;
```

---

## Pre-Selection Pattern

Select content before LLM generation to ensure quality:

```
Fetch All Content
    ↓
Filter by Criteria (date, type, etc.)
    ↓
Check Against Memory (avoid repetition)
    ↓
Score & Rank Content
    ↓
Select Top N Items
    ↓
Pass to LLM for Generation
```

### Content Scoring

```javascript
// Score content for selection
const items = $input.all();

const scored = items.map(item => {
  let score = 0;
  
  // Recency bonus
  const ageHours = (Date.now() - new Date(item.json.timestamp)) / 3600000;
  score += Math.max(0, 24 - ageHours); // Max 24 points for very recent
  
  // Engagement bonus
  score += (item.json.reactions || 0) * 2;
  score += (item.json.replies || 0) * 3;
  
  // Priority bonus
  if (item.json.priority === 'high') score += 10;
  
  // Penalty for recently used
  if (item.json.recentlyUsed) score -= 20;
  
  return { ...item.json, score };
});

// Sort by score descending
scored.sort((a, b) => b.score - a.score);

// Return top 5
return scored.slice(0, 5).map(item => ({ json: item }));
```

---

## Google Chat Card Formatting

### Card Structure

```json
{
  "cards": [{
    "header": {
      "title": "Morning Update",
      "subtitle": "December 16, 2024",
      "imageUrl": "https://example.com/icon.png"
    },
    "sections": [
      {
        "header": "Summary",
        "widgets": [{
          "textParagraph": {
            "text": "Today's key highlights..."
          }
        }]
      },
      {
        "header": "Urgent Items",
        "widgets": [{
          "decoratedText": {
            "topLabel": "Priority",
            "text": "Review patient lab results",
            "button": {
              "text": "View",
              "onClick": {
                "openLink": {
                  "url": "https://..."
                }
              }
            }
          }
        }]
      }
    ]
  }]
}
```

### Build Card Dynamically

```javascript
const data = $input.first().json;

const card = {
  cards: [{
    header: {
      title: data.title || "Daily Update",
      subtitle: new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    },
    sections: []
  }]
};

// Add summary section
if (data.summary) {
  card.cards[0].sections.push({
    header: "Summary",
    widgets: [{
      textParagraph: { text: data.summary }
    }]
  });
}

// Add urgent items
if (data.urgent_items?.length > 0) {
  card.cards[0].sections.push({
    header: "⚠️ Urgent",
    widgets: data.urgent_items.map(item => ({
      decoratedText: {
        text: item.text,
        topLabel: item.source || "Alert"
      }
    }))
  });
}

return [{ json: card }];
```

---

## Scheduling Best Practices

### Use Cron Expressions

```
# Weekdays at 7:00 AM
0 7 * * 1-5

# Every day at 8:00 AM
0 8 * * *

# Every hour during business hours (9-5)
0 9-17 * * 1-5
```

### Skip Holidays/Weekends

```javascript
// Check if today should run
const today = new Date();
const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday

// Skip weekends
if (dayOfWeek === 0 || dayOfWeek === 6) {
  return []; // Empty output stops workflow
}

// Skip holidays (example)
const holidays = ['2024-12-25', '2024-01-01'];
const todayStr = today.toISOString().split('T')[0];
if (holidays.includes(todayStr)) {
  return [];
}

return $input.all();
```

---

## Workflow Organization

### Use Sticky Notes

Add sticky notes to document:
- Workflow purpose
- Data flow
- Configuration requirements
- Known issues

### Group Related Nodes

Use colors to visually group:
- **Blue**: Data fetching
- **Green**: Transformations
- **Purple**: LLM operations
- **Orange**: Output/sending
- **Red**: Error handling

### Modular Sub-workflows

Break complex workflows into reusable sub-workflows:

```
Main Workflow
├── Fetch Data (sub-workflow)
├── Process Content (sub-workflow)
├── Generate Message (sub-workflow)
└── Send & Store (sub-workflow)
```

---

## Testing Workflows

### Manual Test Checklist

1. [ ] Run with test data first
2. [ ] Check each node for errors
3. [ ] Verify external API credentials
4. [ ] Test error handling paths
5. [ ] Validate output format
6. [ ] Check memory/storage operations

### Debug Tips

- Use "Execute Node" to test individual nodes
- Check node output data in the execution log
- Add "Debug" nodes to inspect intermediate data
- Use console.log in Code nodes (visible in execution log)
