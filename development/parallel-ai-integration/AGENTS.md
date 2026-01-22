# Parallel AI Integration Rules

## Project-Specific Guidelines

### API Key Management
- API key stored in `~/.bash_secrets` as `PARALLEL_API_KEY`
- Never commit API keys to repository
- Use environment variables for all configuration

### Architecture Decisions
- Parallel is preferred over Tavily/Exa for all new search integrations
- Use Search API for simple lookups
- Use Task API for complex multi-step research
- Use FindAll API for dataset creation

### Performance Optimization
- Leverage Parallel's token-efficient responses to reduce LLM costs
- Use compressed excerpts where full content not needed
- Batch requests when possible

### Documentation
- Track usage and accuracy improvements over time
- Document any custom prompt patterns that work well
- Share learnings with team

## Code Standards

### Python
- Use official Python SDK: `pip install parallel`
- Type hints required for all public functions
- Error handling for API failures

### TypeScript
- Use official TypeScript SDK: `npm install @parallel-ai/sdk`
- Async/await for all API calls
- Proper TypeScript types for responses

## Testing

### Unit Tests
- Mock Parallel API responses
- Test error handling and edge cases
- Verify prompt construction

### Integration Tests
- Run against Parallel test endpoints
- Validate response structure
- Check accuracy on known queries

---

See `openspec/AGENTS.md` for detailed Parallel API documentation and benchmarks.