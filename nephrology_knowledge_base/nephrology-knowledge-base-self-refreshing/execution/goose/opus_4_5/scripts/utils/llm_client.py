"""
LLM Client - Unified interface for multiple LLM providers.

Supports:
- Anthropic (Claude Sonnet 4.5, Opus 4.5) - Direct API
- Google AI (Gemini)
- OpenRouter (for Anthropic models via OpenRouter proxy)
"""

import os
import json
import logging
from dataclasses import dataclass, field
from typing import Optional, Any
from datetime import datetime

import requests
import yaml
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)

# OpenRouter API endpoint
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"


@dataclass
class LLMResponse:
    """Response from an LLM API call."""
    
    content: str
    model: str
    provider: str
    usage: dict = field(default_factory=dict)
    raw_response: Any = None
    structured_output: Optional[dict] = None
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    
    def to_dict(self) -> dict:
        """Convert response to dictionary."""
        return {
            "content": self.content,
            "model": self.model,
            "provider": self.provider,
            "usage": self.usage,
            "structured_output": self.structured_output,
            "timestamp": self.timestamp,
        }


class LLMClient:
    """Unified client for multiple LLM providers."""
    
    def __init__(self, config_path: str = "config/llm-configs.yaml"):
        """
        Initialize LLM client with configuration.
        
        Args:
            config_path: Path to YAML configuration file
        """
        self.config = self._load_config(config_path)
        self._init_clients()
        
    def _load_config(self, config_path: str) -> dict:
        """Load configuration from YAML file."""
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
        return config
    
    def _init_clients(self) -> None:
        """Initialize API clients for each provider."""
        # Anthropic (direct)
        anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
        if anthropic_key:
            try:
                import anthropic
                self.anthropic_client = anthropic.Anthropic(api_key=anthropic_key)
                logger.info("Anthropic client initialized")
            except ImportError:
                logger.warning("anthropic package not installed")
                self.anthropic_client = None
        else:
            logger.warning("ANTHROPIC_API_KEY not found")
            self.anthropic_client = None
        
        # OpenRouter (for Anthropic models via proxy)
        self.openrouter_key = os.environ.get("OPENROUTER_API_KEY")
        if self.openrouter_key:
            logger.info("OpenRouter API key found")
        else:
            logger.warning("OPENROUTER_API_KEY not found")
            
        # Google AI
        google_key = os.environ.get("GOOGLE_AI_API_KEY")
        if google_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=google_key)
                self.google_client = genai
                logger.info("Google AI client initialized")
            except ImportError:
                logger.warning("google-generativeai package not installed")
                self.google_client = None
        else:
            logger.warning("GOOGLE_AI_API_KEY not found")
            self.google_client = None
    
    def get_model_config(self, model_name: str) -> dict:
        """Get configuration for a specific model."""
        return self.config.get("models", {}).get(model_name, {})
    
    def get_pass_config(self, pass_name: str) -> dict:
        """Get configuration for a specific pass."""
        return self.config.get("passes", {}).get(pass_name, {})
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=60)
    )
    def generate(
        self,
        prompt: str,
        model: str = "claude-sonnet-4-5",
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 4096,
        schema: Optional[dict] = None,
    ) -> LLMResponse:
        """
        Generate content using specified LLM.
        
        Args:
            prompt: User prompt
            model: Model identifier from config
            system_prompt: Optional system instructions
            temperature: Creativity setting (0-1)
            max_tokens: Maximum output tokens
            schema: JSON schema for structured output
            
        Returns:
            LLMResponse with generated content
        """
        model_config = self.get_model_config(model)
        provider = model_config.get("provider", "anthropic")
        model_id = model_config.get("model_id", model)
        
        if provider == "anthropic":
            return self._generate_anthropic(
                prompt=prompt,
                model_id=model_id,
                system_prompt=system_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
                schema=schema,
            )
        elif provider == "openrouter":
            return self._generate_openrouter(
                prompt=prompt,
                model_id=model_id,
                system_prompt=system_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
                schema=schema,
            )
        elif provider == "google":
            return self._generate_google(
                prompt=prompt,
                model_id=model_id,
                system_prompt=system_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
                schema=schema,
            )
        else:
            raise ValueError(f"Unsupported provider: {provider}")
    
    def _generate_anthropic(
        self,
        prompt: str,
        model_id: str,
        system_prompt: Optional[str],
        temperature: float,
        max_tokens: int,
        schema: Optional[dict],
    ) -> LLMResponse:
        """Generate using Anthropic API."""
        if not self.anthropic_client:
            raise RuntimeError("Anthropic client not initialized")
        
        messages = [{"role": "user", "content": prompt}]
        
        kwargs = {
            "model": model_id,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": messages,
        }
        
        if system_prompt:
            kwargs["system"] = system_prompt
        
        # Use structured outputs if schema provided
        if schema:
            # Import transform_schema for structured outputs
            from anthropic import transform_schema
            
            kwargs["betas"] = ["structured-outputs-2025-11-13"]
            kwargs["output_format"] = {
                "type": "json_schema",
                "schema": transform_schema(schema),
            }
            
            response = self.anthropic_client.beta.messages.create(**kwargs)
        else:
            response = self.anthropic_client.messages.create(**kwargs)
        
        content = response.content[0].text
        
        # Parse structured output if schema was provided
        structured_output = None
        if schema:
            try:
                structured_output = json.loads(content)
            except json.JSONDecodeError:
                logger.warning("Failed to parse structured output as JSON")
        
        return LLMResponse(
            content=content,
            model=model_id,
            provider="anthropic",
            usage={
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
            },
            raw_response=response,
            structured_output=structured_output,
        )
    
    def _generate_openrouter(
        self,
        prompt: str,
        model_id: str,
        system_prompt: Optional[str],
        temperature: float,
        max_tokens: int,
        schema: Optional[dict],
    ) -> LLMResponse:
        """Generate using OpenRouter API (for Anthropic models via proxy)."""
        if not self.openrouter_key:
            raise RuntimeError("OpenRouter API key not configured")
        
        headers = {
            "Authorization": f"Bearer {self.openrouter_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/nephrology-knowledge-base",
            "X-Title": "Nephrology Knowledge Base",
        }
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        payload = {
            "model": model_id,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        
        # Request JSON output if schema provided
        if schema:
            payload["response_format"] = {"type": "json_object"}
        
        response = requests.post(
            OPENROUTER_API_URL,
            headers=headers,
            json=payload,
            timeout=120,
        )
        
        if response.status_code != 200:
            error_detail = response.text[:500]
            raise RuntimeError(f"OpenRouter API error {response.status_code}: {error_detail}")
        
        result = response.json()
        
        if "error" in result:
            raise RuntimeError(f"OpenRouter error: {result['error']}")
        
        content = result["choices"][0]["message"]["content"]
        
        # Parse structured output if schema was provided
        structured_output = None
        if schema:
            try:
                structured_output = json.loads(content)
            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse structured output as JSON: {e}")
                # Try to clean up the response
                cleaned = content.strip()
                if cleaned.startswith("```"):
                    cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
                    if cleaned.endswith("```"):
                        cleaned = cleaned.rsplit("```", 1)[0]
                try:
                    structured_output = json.loads(cleaned)
                    logger.info("Successfully parsed JSON after cleanup")
                except json.JSONDecodeError:
                    logger.error(f"JSON parse failed even after cleanup. First 500 chars: {content[:500]}")
        
        usage = result.get("usage", {})
        
        return LLMResponse(
            content=content,
            model=model_id,
            provider="openrouter",
            usage={
                "input_tokens": usage.get("prompt_tokens", 0),
                "output_tokens": usage.get("completion_tokens", 0),
            },
            raw_response=result,
            structured_output=structured_output,
        )
    
    def _generate_google(
        self,
        prompt: str,
        model_id: str,
        system_prompt: Optional[str],
        temperature: float,
        max_tokens: int,
        schema: Optional[dict],
    ) -> LLMResponse:
        """Generate using Google AI API."""
        if not self.google_client:
            raise RuntimeError("Google AI client not initialized")
        
        model = self.google_client.GenerativeModel(model_id)
        
        full_prompt = prompt
        if system_prompt:
            full_prompt = f"{system_prompt}\n\n{prompt}"
        
        generation_config = {
            "temperature": temperature,
            "max_output_tokens": max_tokens,
        }
        
        if schema:
            generation_config["response_mime_type"] = "application/json"
        
        response = model.generate_content(
            full_prompt,
            generation_config=generation_config,
        )
        
        content = response.text
        
        # Parse structured output if schema was provided
        structured_output = None
        if schema:
            try:
                structured_output = json.loads(content)
            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse structured output as JSON: {e}")
                # Try to clean up the response
                cleaned = content.strip()
                # Remove markdown code blocks if present
                if cleaned.startswith("```"):
                    cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
                    if cleaned.endswith("```"):
                        cleaned = cleaned.rsplit("```", 1)[0]
                try:
                    structured_output = json.loads(cleaned)
                    logger.info("Successfully parsed JSON after cleanup")
                except json.JSONDecodeError:
                    logger.error(f"JSON parse failed even after cleanup. First 500 chars: {content[:500]}")
        
        return LLMResponse(
            content=content,
            model=model_id,
            provider="google",
            usage={},  # Google doesn't provide token counts in same format
            raw_response=response,
            structured_output=structured_output,
        )
    
    def generate_with_concurrence(
        self,
        prompt: str,
        models: list[str],
        system_prompt: Optional[str] = None,
        temperature: float = 0.1,
    ) -> dict:
        """
        Generate using multiple models for concurrence checking.
        
        Args:
            prompt: User prompt
            models: List of model identifiers
            system_prompt: Optional system instructions
            temperature: Creativity setting
            
        Returns:
            Dictionary with responses from each model and agreement analysis
        """
        responses = {}
        
        for model in models:
            try:
                response = self.generate(
                    prompt=prompt,
                    model=model,
                    system_prompt=system_prompt,
                    temperature=temperature,
                )
                responses[model] = response
            except Exception as e:
                logger.error(f"Error generating with {model}: {e}")
                responses[model] = None
        
        # Analyze agreement (simplified - in production would do semantic comparison)
        successful_responses = [r for r in responses.values() if r is not None]
        agreement_rate = len(successful_responses) / len(models) if models else 0
        
        return {
            "responses": responses,
            "agreement_rate": agreement_rate,
            "all_models_succeeded": len(successful_responses) == len(models),
        }
