"""
Schema Validator - JSON Schema validation for structured outputs.

Ensures LLM outputs conform to expected schemas.
"""

import json
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Any

import jsonschema
from jsonschema import validate, ValidationError as JsonSchemaError

logger = logging.getLogger(__name__)


class ValidationError(Exception):
    """Custom validation error with details."""
    
    def __init__(self, message: str, errors: Optional[list[str]] = None):
        super().__init__(message)
        self.errors = errors if errors is not None else []


@dataclass
class ValidationResult:
    """Result of schema validation."""
    
    valid: bool
    errors: list[str]
    data: Optional[dict] = None
    
    def raise_if_invalid(self) -> None:
        """Raise ValidationError if validation failed."""
        if not self.valid:
            raise ValidationError(
                f"Validation failed with {len(self.errors)} errors",
                errors=self.errors,
            )


class SchemaValidator:
    """Validates JSON data against JSON schemas."""
    
    def __init__(self, schema_dir: str = "config/schemas"):
        """
        Initialize validator with schema directory.
        
        Args:
            schema_dir: Directory containing JSON schema files
        """
        self.schema_dir = Path(schema_dir)
        self._schemas: dict[str, dict] = {}
        self._load_schemas()
    
    def _load_schemas(self) -> None:
        """Load all schemas from schema directory."""
        if not self.schema_dir.exists():
            logger.warning(f"Schema directory not found: {self.schema_dir}")
            return
        
        for schema_file in self.schema_dir.glob("*.schema.json"):
            try:
                with open(schema_file, 'r') as f:
                    schema = json.load(f)
                
                # Use filename without extension as key
                schema_name = schema_file.stem.replace('.schema', '')
                self._schemas[schema_name] = schema
                logger.info(f"Loaded schema: {schema_name}")
                
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse schema {schema_file}: {e}")
            except Exception as e:
                logger.error(f"Failed to load schema {schema_file}: {e}")
    
    def get_schema(self, name: str) -> Optional[dict]:
        """Get a loaded schema by name."""
        return self._schemas.get(name)
    
    def validate(self, data: Any, schema_name: str) -> ValidationResult:
        """
        Validate data against a named schema.
        
        Args:
            data: Data to validate (dict or JSON string)
            schema_name: Name of schema to validate against
            
        Returns:
            ValidationResult with validation status and errors
        """
        # Get schema
        schema = self.get_schema(schema_name)
        if not schema:
            return ValidationResult(
                valid=False,
                errors=[f"Schema not found: {schema_name}"],
            )
        
        # Parse data if string
        if isinstance(data, str):
            try:
                data = json.loads(data)
            except json.JSONDecodeError as e:
                return ValidationResult(
                    valid=False,
                    errors=[f"Invalid JSON: {e}"],
                )
        
        # Validate
        try:
            validate(instance=data, schema=schema)
            return ValidationResult(
                valid=True,
                errors=[],
                data=data,
            )
        except JsonSchemaError as e:
            errors = [str(e.message)]
            
            # Collect all errors
            validator = jsonschema.Draft202012Validator(schema)
            for error in validator.iter_errors(data):
                if str(error.message) not in errors:
                    path = " -> ".join(str(p) for p in error.absolute_path)
                    errors.append(f"{path}: {error.message}" if path else error.message)
            
            return ValidationResult(
                valid=False,
                errors=errors,
                data=data,
            )
    
    def validate_against_schema(self, data: Any, schema: dict) -> ValidationResult:
        """
        Validate data against a provided schema dict.
        
        Args:
            data: Data to validate
            schema: JSON schema dict
            
        Returns:
            ValidationResult with validation status and errors
        """
        if isinstance(data, str):
            try:
                data = json.loads(data)
            except json.JSONDecodeError as e:
                return ValidationResult(
                    valid=False,
                    errors=[f"Invalid JSON: {e}"],
                )
        
        try:
            validate(instance=data, schema=schema)
            return ValidationResult(
                valid=True,
                errors=[],
                data=data,
            )
        except JsonSchemaError as e:
            errors = [str(e.message)]
            
            validator = jsonschema.Draft202012Validator(schema)
            for error in validator.iter_errors(data):
                if str(error.message) not in errors:
                    path = " -> ".join(str(p) for p in error.absolute_path)
                    errors.append(f"{path}: {error.message}" if path else error.message)
            
            return ValidationResult(
                valid=False,
                errors=errors,
                data=data,
            )
    
    def is_schema_compatible(self, schema: dict) -> tuple[bool, list[str]]:
        """
        Check if schema is compatible with LLM structured outputs.
        
        Args:
            schema: JSON schema to check
            
        Returns:
            Tuple of (is_compatible, list of issues)
        """
        issues = []
        
        # Check for unsupported constructs at top level
        top_level_unsupported = ["oneOf", "allOf", "anyOf"]
        for construct in top_level_unsupported:
            if construct in schema:
                issues.append(f"Top-level '{construct}' not supported by LLM structured outputs")
        
        # Check $schema version
        schema_version = schema.get("$schema", "")
        if "2020-12" not in schema_version and "draft/2020-12" not in schema_version:
            issues.append(f"Schema should use JSON Schema draft 2020-12, found: {schema_version}")
        
        return len(issues) == 0, issues
