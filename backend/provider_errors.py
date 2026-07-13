"""Bounded provider exceptions safe for failure provenance and logs."""


class XAIInvalidUsageError(ValueError):
    """Raised when xAI returns usage data outside the accepted schema."""

    def __init__(self) -> None:
        super().__init__("invalid xAI usage payload")
