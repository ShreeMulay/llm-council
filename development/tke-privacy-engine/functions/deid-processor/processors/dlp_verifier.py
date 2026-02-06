"""Cloud DLP verification of de-identified text.

After Gemini de-identifies clinical text, this module runs Google Cloud DLP
on the OUTPUT to catch any residual PHI that Gemini may have missed.
If any findings are detected, the job is flagged for human review.
"""

import logging
import os

import google.cloud.dlp_v2 as dlp_v2

logger = logging.getLogger(__name__)

GCP_PROJECT_ID = os.environ.get("GCP_PROJECT_ID", "")
GCP_REGION = os.environ.get("GCP_REGION", "us-central1")

# All PHI-relevant info types for DLP inspection
DEFAULT_INFO_TYPES = [
    "PERSON_NAME",
    "US_SOCIAL_SECURITY_NUMBER",
    "PHONE_NUMBER",
    "EMAIL_ADDRESS",
    "DATE_OF_BIRTH",
    "LOCATION",
    "STREET_ADDRESS",
    "MEDICAL_RECORD_NUMBER",
    "US_HEALTHCARE_NPI",
    "US_DEA_NUMBER",
    "IP_ADDRESS",
    "URL",
    "CREDIT_CARD_NUMBER",
    "US_DRIVERS_LICENSE_NUMBER",
    "US_PASSPORT",
    "AGE",
]

# Minimum likelihood for a finding to be reported
DEFAULT_MIN_LIKELIHOOD = dlp_v2.Likelihood.POSSIBLE

# Maximum text size for a single DLP inspect call (500 KB)
MAX_DLP_CONTENT_SIZE = 500_000


class DLPFinding:
    """A single DLP finding representing potential residual PHI."""

    def __init__(
        self,
        info_type: str,
        likelihood: str,
        quote: str,
        start: int,
        end: int,
    ) -> None:
        self.info_type = info_type
        self.likelihood = likelihood
        self.quote = quote
        self.start = start
        self.end = end

    def to_dict(self) -> dict:
        """Convert finding to a dictionary for serialization."""
        return {
            "info_type": self.info_type,
            "likelihood": self.likelihood,
            "quote": self.quote,
            "location": {"start": self.start, "end": self.end},
        }


class DLPVerificationResult:
    """Result of DLP verification on de-identified text."""

    def __init__(
        self,
        findings: list[DLPFinding],
        needs_review: bool,
        total_findings: int,
    ) -> None:
        self.findings = findings
        self.needs_review = needs_review
        self.total_findings = total_findings

    def to_dict(self) -> dict:
        """Convert result to a dictionary for serialization."""
        return {
            "total_findings": self.total_findings,
            "needs_review": self.needs_review,
            "findings": [f.to_dict() for f in self.findings],
        }


def _create_dlp_client() -> dlp_v2.DlpServiceClient:
    """Create and return a Cloud DLP client.

    Returns:
        Configured DlpServiceClient instance.
    """
    return dlp_v2.DlpServiceClient()


def _build_inspect_config(
    info_types: list[str] | None = None,
    min_likelihood: dlp_v2.Likelihood | None = None,
) -> dlp_v2.InspectConfig:
    """Build the DLP inspection configuration.

    Args:
        info_types: List of info type names to scan for. Defaults to DEFAULT_INFO_TYPES.
        min_likelihood: Minimum likelihood threshold. Defaults to POSSIBLE.

    Returns:
        Configured InspectConfig for the DLP API.
    """
    if info_types is None:
        info_types = DEFAULT_INFO_TYPES
    if min_likelihood is None:
        min_likelihood = DEFAULT_MIN_LIKELIHOOD

    info_type_objects = [dlp_v2.InfoType(name=it) for it in info_types]

    # Custom regex detectors for TKE-specific patterns that DLP might miss
    custom_detectors = [
        dlp_v2.CustomInfoType(
            info_type=dlp_v2.InfoType(name="MEDICAL_RECORD_NUMBER_CUSTOM"),
            regex=dlp_v2.CustomInfoType.Regex(
                pattern=r"\b(?:MRN|Medical Record|Chart)\s*#?\s*:?\s*\d{4,12}\b"
            ),
            likelihood=dlp_v2.Likelihood.LIKELY,
        ),
        dlp_v2.CustomInfoType(
            info_type=dlp_v2.InfoType(name="HEALTH_PLAN_ID_CUSTOM"),
            regex=dlp_v2.CustomInfoType.Regex(
                pattern=r"\b(?:Member|Subscriber|Plan)\s*(?:ID|#|No)\s*:?\s*[A-Z0-9]{6,20}\b"
            ),
            likelihood=dlp_v2.Likelihood.LIKELY,
        ),
    ]

    return dlp_v2.InspectConfig(
        info_types=info_type_objects,
        custom_info_types=custom_detectors,
        min_likelihood=min_likelihood,
        include_quote=True,
        limits=dlp_v2.InspectConfig.FindingLimits(
            max_findings_per_request=100,
        ),
    )


def _is_false_positive(finding: dlp_v2.InspectResult.Finding, deidentified_text: str) -> bool:
    """Check if a DLP finding is a false positive in de-identified context.

    TKE tokens like [TKE-NAME-1] may trigger PERSON_NAME detection.
    Medical terms may trigger false positives.

    Args:
        finding: A DLP finding to evaluate.
        deidentified_text: The full de-identified text for context.

    Returns:
        True if the finding is likely a false positive.
    """
    quote = finding.quote or ""

    # TKE tokens are not PHI — they are our replacement tokens
    if quote.startswith("[TKE-") and quote.endswith("]"):
        return True

    # Common medical terms that trigger PERSON_NAME false positives
    medical_false_positives = {
        "goodpasture", "foley", "tenckhoff", "henoch", "schönlein", "schonlein",
        "kimmelstiel", "wilson", "berger", "alport", "bartter", "gitelman",
        "liddle", "fanconi", "wilms", "bright", "addison", "cushing", "conn",
        "wegener", "takayasu", "kawasaki", "raynaud", "swan", "ganz",
        "hickman", "quinton", "cimino", "brescia", "bowman", "henle",
        "tamm", "horsfall", "doppler", "gram", "papanicolaou",
    }
    if quote.lower().strip() in medical_false_positives:
        return True

    # Check if the quote is part of a medical eponym phrase in context
    eponym_patterns = [
        "syndrome", "disease", "catheter", "fistula", "graft", "stain",
        "capsule", "loop of", "protein", "ultrasound", "phenomenon",
        "granulomatosis", "arteritis", "vasculitis", "nephropathy",
    ]
    # Look at surrounding context
    quote_pos = deidentified_text.find(quote)
    if quote_pos >= 0:
        context_start = max(0, quote_pos - 30)
        context_end = min(len(deidentified_text), quote_pos + len(quote) + 30)
        context = deidentified_text[context_start:context_end].lower()
        for pattern in eponym_patterns:
            if pattern in context:
                return True

    return False


def _likelihood_to_str(likelihood: dlp_v2.Likelihood) -> str:
    """Convert DLP Likelihood enum to string.

    Args:
        likelihood: DLP Likelihood enum value.

    Returns:
        Human-readable likelihood string.
    """
    mapping = {
        dlp_v2.Likelihood.LIKELIHOOD_UNSPECIFIED: "UNSPECIFIED",
        dlp_v2.Likelihood.VERY_UNLIKELY: "VERY_UNLIKELY",
        dlp_v2.Likelihood.UNLIKELY: "UNLIKELY",
        dlp_v2.Likelihood.POSSIBLE: "POSSIBLE",
        dlp_v2.Likelihood.LIKELY: "LIKELY",
        dlp_v2.Likelihood.VERY_LIKELY: "VERY_LIKELY",
    }
    return mapping.get(likelihood, "UNKNOWN")


async def verify_deidentified_text(
    deidentified_text: str,
    info_types: list[str] | None = None,
    min_likelihood: dlp_v2.Likelihood | None = None,
) -> DLPVerificationResult:
    """Run Cloud DLP on de-identified text to catch residual PHI.

    This is the verification step AFTER Gemini de-identification.
    Any findings indicate potential PHI that Gemini missed.

    Args:
        deidentified_text: The text that has already been de-identified by Gemini.
        info_types: Optional list of info type names to scan for.
        min_likelihood: Optional minimum likelihood threshold.

    Returns:
        DLPVerificationResult with any residual PHI findings.

    Raises:
        ValueError: If GCP_PROJECT_ID is not set.
        RuntimeError: If DLP API call fails.
    """
    if not GCP_PROJECT_ID:
        raise ValueError(
            "GCP_PROJECT_ID environment variable is required for Cloud DLP."
        )

    if not deidentified_text or not deidentified_text.strip():
        logger.info("Empty text provided to DLP verifier, skipping.")
        return DLPVerificationResult(findings=[], needs_review=False, total_findings=0)

    # Truncate if text exceeds DLP limit
    text_to_inspect = deidentified_text
    if len(text_to_inspect.encode("utf-8")) > MAX_DLP_CONTENT_SIZE:
        logger.warning(
            "Text exceeds DLP size limit (%d bytes). Truncating to %d bytes.",
            len(text_to_inspect.encode("utf-8")),
            MAX_DLP_CONTENT_SIZE,
        )
        text_to_inspect = text_to_inspect[:MAX_DLP_CONTENT_SIZE]

    client = _create_dlp_client()
    inspect_config = _build_inspect_config(info_types, min_likelihood)

    parent = f"projects/{GCP_PROJECT_ID}/locations/{GCP_REGION}"

    request = dlp_v2.InspectContentRequest(
        parent=parent,
        inspect_config=inspect_config,
        item=dlp_v2.ContentItem(value=text_to_inspect),
    )

    try:
        logger.info(
            "Running DLP verification on %d chars of de-identified text",
            len(text_to_inspect),
        )
        response = client.inspect_content(request=request)
    except Exception as e:
        raise RuntimeError(f"Cloud DLP inspection failed: {e}") from e

    # Process findings, filtering out false positives
    real_findings: list[DLPFinding] = []

    if response.result and response.result.findings:
        for finding in response.result.findings:
            # Skip false positives
            if _is_false_positive(finding, deidentified_text):
                logger.debug(
                    "DLP false positive filtered: %s (%s)",
                    finding.quote,
                    finding.info_type.name,
                )
                continue

            # Extract location info
            start_offset = 0
            end_offset = 0
            if finding.location and finding.location.byte_range:
                start_offset = finding.location.byte_range.start
                end_offset = finding.location.byte_range.end

            real_findings.append(
                DLPFinding(
                    info_type=finding.info_type.name,
                    likelihood=_likelihood_to_str(finding.likelihood),
                    quote=finding.quote or "",
                    start=start_offset,
                    end=end_offset,
                )
            )

    needs_review = len(real_findings) > 0
    total_findings = len(real_findings)

    if needs_review:
        logger.warning(
            "DLP found %d residual PHI items in de-identified text. Flagging for review.",
            total_findings,
        )
        for f in real_findings:
            logger.warning(
                "  Residual PHI: type=%s, likelihood=%s, quote='%s'",
                f.info_type,
                f.likelihood,
                f.quote[:50],
            )
    else:
        logger.info("DLP verification passed: no residual PHI detected.")

    return DLPVerificationResult(
        findings=real_findings,
        needs_review=needs_review,
        total_findings=total_findings,
    )
