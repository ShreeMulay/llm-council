"""TKE Privacy Engine — De-Identification Processor.

Cloud Function entry point for the de-identification pipeline.
Supports both HTTP triggers (API calls) and Pub/Sub triggers (async jobs).

Pipeline: Extract Text → Gemini De-ID → DLP Verify → Return Results
"""

import asyncio
import base64
import json
import logging
import os
import time
import uuid

import functions_framework
from flask import Request, jsonify
from pydantic import BaseModel, ValidationError
from typing import Literal

from processors.text_extractor import extract_text
from processors.gemini_deid import deidentify_text, GeminiDeIDResult
from processors.dlp_verifier import verify_deidentified_text
from outputs.docs_writer import write_deid_doc
from outputs.markdown_writer import write_deid_markdown
from outputs.sheets_writer import append_audit_row
from outputs.firestore_writer import store_phi_mapping

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("tke-deid-processor")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
GCP_PROJECT_ID = os.environ.get("GCP_PROJECT_ID", "")
CONFIDENCE_THRESHOLD = float(os.environ.get("CONFIDENCE_THRESHOLD", "0.95"))
MAX_FILE_SIZE_MB = int(os.environ.get("MAX_FILE_SIZE_MB", "10"))
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

# Load provider whitelist from environment or default path
PROVIDER_WHITELIST_PATH = os.environ.get(
    "PROVIDER_WHITELIST_PATH",
    os.path.join(
        os.path.dirname(__file__), "..", "..", "config", "provider_whitelist.json"
    ),
)


# ---------------------------------------------------------------------------
# Pydantic Models
# ---------------------------------------------------------------------------
class DeIDJob(BaseModel):
    """Incoming de-identification job request."""

    job_id: str = ""
    source: Literal["drive", "chat", "api"] = "api"
    file_uri: str | None = None
    raw_text: str | None = None
    requestor: str = "unknown"
    encounter_date: str | None = None
    mode: Literal["standard", "batch", "synthetic", "verify"] = "standard"
    callback: dict | None = None


class PHIEntity(BaseModel):
    """A single PHI entity found and replaced."""

    token: str
    entity_type: str
    original: str
    confidence: float
    notes: str = ""


class DeIDResult(BaseModel):
    """Complete de-identification result."""

    job_id: str
    deidentified_text: str
    entities: list[PHIEntity]
    providers_preserved: list[str]
    eponyms_preserved: list[str]
    total_phi: int
    total_replaced: int
    age_90_plus_applied: bool
    dlp_residual_findings: int = 0
    dlp_findings_details: list[dict] = []
    confidence_score: float = 1.0
    needs_review: bool = False
    processing_time_ms: int = 0


# ---------------------------------------------------------------------------
# Provider Whitelist
# ---------------------------------------------------------------------------
def load_provider_names() -> list[str]:
    """Load TKE provider names from the whitelist JSON file.

    Returns:
        Flat list of all provider name variations.
    """
    try:
        whitelist_path = os.path.normpath(PROVIDER_WHITELIST_PATH)
        with open(whitelist_path) as f:
            data = json.load(f)
        names = data.get("all_names_flat", [])
        logger.info("Loaded %d provider names from whitelist", len(names))
        return names
    except FileNotFoundError:
        logger.warning(
            "Provider whitelist not found at %s. All names will be treated as potential PHI.",
            PROVIDER_WHITELIST_PATH,
        )
        return []
    except (json.JSONDecodeError, KeyError) as e:
        logger.error("Failed to parse provider whitelist: %s", e)
        return []


# ---------------------------------------------------------------------------
# File Fetching
# ---------------------------------------------------------------------------
async def fetch_file_content(file_uri: str) -> tuple[bytes, str | None, str | None]:
    """Fetch file content from a URI (GCS, Drive, or local path).

    Args:
        file_uri: URI of the file to fetch. Supports:
            - gs://bucket/path (Google Cloud Storage)
            - /local/path (local filesystem, for testing)

    Returns:
        Tuple of (content_bytes, mime_type, filename).

    Raises:
        ValueError: If URI scheme is unsupported.
        RuntimeError: If file cannot be fetched.
    """
    if file_uri.startswith("gs://"):
        return await _fetch_from_gcs(file_uri)
    elif file_uri.startswith("/") or file_uri.startswith("./"):
        return _fetch_from_local(file_uri)
    else:
        raise ValueError(
            f"Unsupported file URI scheme: {file_uri}. Supported: gs://, local paths"
        )


async def _fetch_from_gcs(gcs_uri: str) -> tuple[bytes, str | None, str | None]:
    """Fetch a file from Google Cloud Storage.

    Args:
        gcs_uri: GCS URI in format gs://bucket/path/to/file.

    Returns:
        Tuple of (content_bytes, mime_type, filename).
    """
    from google.cloud import storage

    # Parse gs://bucket/path
    parts = gcs_uri.replace("gs://", "").split("/", 1)
    if len(parts) != 2:
        raise ValueError(f"Invalid GCS URI: {gcs_uri}")

    bucket_name, blob_path = parts[0], parts[1]
    filename = blob_path.rsplit("/", 1)[-1] if "/" in blob_path else blob_path

    client = storage.Client(project=GCP_PROJECT_ID)
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_path)

    if not blob.exists():
        raise RuntimeError(f"File not found in GCS: {gcs_uri}")

    content = blob.download_as_bytes()
    mime_type = blob.content_type

    if len(content) > MAX_FILE_SIZE_BYTES:
        raise ValueError(
            f"File exceeds maximum size of {MAX_FILE_SIZE_MB} MB: "
            f"{len(content) / (1024 * 1024):.1f} MB"
        )

    logger.info(
        "Fetched %d bytes from GCS: %s (type: %s)", len(content), gcs_uri, mime_type
    )
    return content, mime_type, filename


def _fetch_from_local(path: str) -> tuple[bytes, str | None, str | None]:
    """Fetch a file from local filesystem (for testing).

    Args:
        path: Local file path.

    Returns:
        Tuple of (content_bytes, None, filename).
    """
    import mimetypes

    with open(path, "rb") as f:
        content = f.read()

    if len(content) > MAX_FILE_SIZE_BYTES:
        raise ValueError(
            f"File exceeds maximum size of {MAX_FILE_SIZE_MB} MB: "
            f"{len(content) / (1024 * 1024):.1f} MB"
        )

    filename = os.path.basename(path)
    mime_type, _ = mimetypes.guess_type(path)
    return content, mime_type, filename


# ---------------------------------------------------------------------------
# Core Pipeline
# ---------------------------------------------------------------------------
async def process_deid_job(job: DeIDJob) -> DeIDResult:
    """Execute the full de-identification pipeline.

    Pipeline steps:
    1. Extract text from file or use raw text
    2. Run Gemini de-identification
    3. Run DLP verification on output
    4. Compute confidence score and review flag

    Args:
        job: The de-identification job to process.

    Returns:
        Complete DeIDResult with de-identified text and metadata.

    Raises:
        ValueError: If neither file_uri nor raw_text is provided.
        RuntimeError: If any pipeline step fails.
    """
    pipeline_start = time.monotonic()
    logger.info(
        "Processing de-ID job %s (source: %s, mode: %s)",
        job.job_id,
        job.source,
        job.mode,
    )

    # Step 1: Get text content
    if job.raw_text:
        text = job.raw_text
        logger.info("Using raw text input (%d chars)", len(text))
    elif job.file_uri:
        logger.info("Fetching file: %s", job.file_uri)
        content, mime_type, filename = await fetch_file_content(job.file_uri)
        text = extract_text(content, mime_type, filename)
        logger.info("Extracted %d chars from file", len(text))
    else:
        raise ValueError("Job must provide either 'raw_text' or 'file_uri'")

    if not text.strip():
        raise ValueError("Extracted text is empty — nothing to de-identify")

    # Step 2: Load provider whitelist
    provider_names = load_provider_names()

    # Step 3: Gemini de-identification
    logger.info("Running Gemini de-identification...")
    gemini_result: GeminiDeIDResult = await deidentify_text(
        text=text,
        encounter_date=job.encounter_date,
        provider_names=provider_names,
    )
    logger.info(
        "Gemini complete: %d PHI found, %d replaced in %d ms",
        gemini_result.total_phi,
        gemini_result.total_replaced,
        gemini_result.processing_time_ms,
    )

    # Step 4: DLP verification on the de-identified output
    logger.info("Running DLP verification on de-identified output...")
    dlp_result = await verify_deidentified_text(gemini_result.deidentified_text)
    logger.info(
        "DLP verification: %d residual findings, needs_review=%s",
        dlp_result.total_findings,
        dlp_result.needs_review,
    )

    # Step 5: Compute confidence score
    confidence_score = _compute_confidence(gemini_result, dlp_result.total_findings)
    needs_review = dlp_result.needs_review or confidence_score < CONFIDENCE_THRESHOLD

    # Step 6: Build final result
    pipeline_elapsed_ms = int((time.monotonic() - pipeline_start) * 1000)

    entities = [
        PHIEntity(
            token=e.token,
            entity_type=e.entity_type,
            original=e.original,
            confidence=e.confidence,
            notes=e.notes,
        )
        for e in gemini_result.entities
    ]

    result = DeIDResult(
        job_id=job.job_id,
        deidentified_text=gemini_result.deidentified_text,
        entities=entities,
        providers_preserved=gemini_result.providers_preserved,
        eponyms_preserved=gemini_result.eponyms_preserved,
        total_phi=gemini_result.total_phi,
        total_replaced=gemini_result.total_replaced,
        age_90_plus_applied=gemini_result.age_90_plus_applied,
        dlp_residual_findings=dlp_result.total_findings,
        dlp_findings_details=[f.to_dict() for f in dlp_result.findings],
        confidence_score=confidence_score,
        needs_review=needs_review,
        processing_time_ms=pipeline_elapsed_ms,
    )

    logger.info(
        "Job %s complete: %d PHI replaced, confidence=%.2f, needs_review=%s, %d ms total",
        job.job_id,
        result.total_replaced,
        result.confidence_score,
        result.needs_review,
        pipeline_elapsed_ms,
    )

    return result


def _compute_confidence(gemini_result: GeminiDeIDResult, dlp_residual: int) -> float:
    """Compute overall confidence score for the de-identification.

    Factors:
    - Average entity confidence from Gemini
    - Number of DLP residual findings (penalizes heavily)
    - Whether all PHI was replaced

    Args:
        gemini_result: Result from Gemini de-identification.
        dlp_residual: Number of residual PHI findings from DLP.

    Returns:
        Confidence score between 0.0 and 1.0.
    """
    if not gemini_result.entities:
        # No PHI found — could be clean text or missed PHI
        # DLP residual findings would catch the latter
        if dlp_residual > 0:
            return max(0.0, 0.5 - (dlp_residual * 0.1))
        return 1.0

    # Average entity confidence
    avg_confidence = sum(e.confidence for e in gemini_result.entities) / len(
        gemini_result.entities
    )

    # Penalty for DLP residual findings
    dlp_penalty = dlp_residual * 0.15

    # Penalty if not all PHI was replaced
    replacement_ratio = (
        gemini_result.total_replaced / gemini_result.total_phi
        if gemini_result.total_phi > 0
        else 1.0
    )

    score = avg_confidence * replacement_ratio - dlp_penalty
    return max(0.0, min(1.0, score))


# ---------------------------------------------------------------------------
# HTTP Trigger
# ---------------------------------------------------------------------------
@functions_framework.http
def deid_http(request: Request):
    """HTTP Cloud Function entry point.

    Accepts POST requests with a DeIDJob JSON body.

    Args:
        request: Flask Request object.

    Returns:
        JSON response with DeIDResult or error details.
    """
    # CORS preflight
    if request.method == "OPTIONS":
        headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "3600",
        }
        return ("", 204, headers)

    if request.method != "POST":
        return jsonify({"error": "Method not allowed. Use POST."}), 405

    try:
        body = request.get_json(silent=True)
        if not body:
            return jsonify({"error": "Request body must be valid JSON"}), 400

        # Generate job_id if not provided
        if not body.get("job_id"):
            body["job_id"] = f"deid-{uuid.uuid4().hex[:12]}"

        # Validate request
        try:
            job = DeIDJob(**body)
        except ValidationError as e:
            return jsonify({"error": "Invalid request", "details": e.errors()}), 400

        # Process the job
        result = asyncio.run(process_deid_job(job))

        response = jsonify(result.model_dump())
        response.headers["Access-Control-Allow-Origin"] = "*"
        return response, 200

    except ValueError as e:
        logger.error("Validation error: %s", e)
        return jsonify({"error": str(e)}), 400
    except RuntimeError as e:
        logger.error("Processing error: %s", e)
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        logger.exception("Unexpected error processing de-ID job")
        return jsonify({"error": f"Internal error: {type(e).__name__}: {e}"}), 500


# ---------------------------------------------------------------------------
# Pub/Sub Trigger
# ---------------------------------------------------------------------------
@functions_framework.cloud_event
def deid_pubsub(cloud_event):
    """Pub/Sub Cloud Function entry point for async job processing.

    Expects a Pub/Sub message with a base64-encoded JSON body
    matching the DeIDJob schema.

    Args:
        cloud_event: CloudEvent containing the Pub/Sub message.
    """
    try:
        # Decode Pub/Sub message
        pubsub_data = cloud_event.data
        message_data = pubsub_data.get("message", {}).get("data", "")

        if not message_data:
            logger.error("Empty Pub/Sub message received")
            return

        decoded = base64.b64decode(message_data).decode("utf-8")
        body = json.loads(decoded)

        # Generate job_id if not provided
        if not body.get("job_id"):
            body["job_id"] = f"deid-ps-{uuid.uuid4().hex[:12]}"

        logger.info("Received Pub/Sub de-ID job: %s", body.get("job_id"))

        # Validate
        try:
            job = DeIDJob(**body)
        except ValidationError as e:
            logger.error("Invalid Pub/Sub message: %s", e.errors())
            return

        # Process
        result = asyncio.run(process_deid_job(job))

        # Write all outputs (Docs, Markdown, Sheets, Firestore)
        if job.callback:
            # Inject source filename from Drive metadata
            if not job.callback.get("source_filename") and job.file_uri:
                fname = (
                    job.file_uri.rsplit("/", 1)[-1]
                    if "/" in job.file_uri
                    else "unknown"
                )
                job.callback["source_filename"] = fname
            _handle_callback(job.callback, result, job)

        logger.info(
            "Pub/Sub job %s complete: %d PHI replaced, confidence=%.2f",
            result.job_id,
            result.total_replaced,
            result.confidence_score,
        )

    except Exception:
        logger.exception("Error processing Pub/Sub de-ID job")
        raise  # Re-raise so Pub/Sub retries


def _handle_callback(callback: dict, result: DeIDResult, job: DeIDJob) -> None:
    """Write all outputs after de-identification completes.

    Orchestrates all output writers:
    1. Google Doc (formatted de-identified document)
    2. Markdown files (``*_deid.md`` + ``*_summary.md``)
    3. Google Sheets audit row
    4. Firestore PHI mapping (encrypted)

    Args:
        callback: Callback configuration dict with routing info.
        result: The completed DeIDResult.
        job: The original job request (for metadata).
    """
    output_folder_id = callback.get("output_folder_id") or os.environ.get(
        "OUTPUT_FOLDER_ID", ""
    )
    source_filename = callback.get("source_filename", "unknown")

    # Determine status label
    status = "review_required" if result.needs_review else "completed"

    # Entity dicts for writers (tokens + types only, no original PHI in md)
    entity_dicts = [e.model_dump() for e in result.entities]
    phi_types = list({e.entity_type for e in result.entities})

    # ── 1. Google Doc ─────────────────────────────────────────────────────
    doc_url = ""
    try:
        doc_url = write_deid_doc(
            deid_text=result.deidentified_text,
            original_filename=source_filename,
            phi_count=result.total_phi,
            providers_preserved=result.providers_preserved,
            confidence_score=result.confidence_score,
            dlp_residual_count=result.dlp_residual_findings,
            processing_time_ms=result.processing_time_ms,
            output_folder_id=output_folder_id or None,
        )
        logger.info("Google Doc created: %s", doc_url)
    except Exception as e:
        logger.error("Failed to create Google Doc: %s", e)

    # ── 2. Markdown files ─────────────────────────────────────────────────
    md_urls: dict[str, str] = {}
    try:
        md_urls = write_deid_markdown(
            deid_text=result.deidentified_text,
            original_filename=source_filename,
            job_id=result.job_id,
            phi_count=result.total_phi,
            providers_preserved=result.providers_preserved,
            eponyms_preserved=result.eponyms_preserved,
            confidence_score=result.confidence_score,
            dlp_residual_count=result.dlp_residual_findings,
            age_90_plus_applied=result.age_90_plus_applied,
            needs_review=result.needs_review,
            processing_time_ms=result.processing_time_ms,
            entities=entity_dicts,
            output_folder_id=output_folder_id or None,
        )
        logger.info(
            "Markdown files created: deid=%s, summary=%s",
            md_urls.get("deid_url", ""),
            md_urls.get("summary_url", ""),
        )
    except Exception as e:
        logger.error("Failed to create markdown files: %s", e)

    # ── 3. Sheets audit row ───────────────────────────────────────────────
    try:
        append_audit_row(
            job_id=result.job_id,
            source=job.source,
            requestor=job.requestor,
            file_name=source_filename,
            phi_count=result.total_phi,
            phi_types=phi_types,
            confidence_score=result.confidence_score,
            dlp_residual_count=result.dlp_residual_findings,
            status=status,
            output_doc_url=doc_url,
            processing_time_ms=result.processing_time_ms,
        )
        logger.info("Audit row appended for job %s", result.job_id)
    except Exception as e:
        logger.error("Failed to append audit row: %s", e)

    # ── 4. Firestore PHI mapping ──────────────────────────────────────────
    try:
        mappings = [
            {
                "original": e.original,
                "replacement": e.token,
                "phi_type": e.entity_type,
                "confidence": e.confidence,
            }
            for e in result.entities
        ]
        store_phi_mapping(
            job_id=result.job_id,
            source=job.source,
            requestor=job.requestor,
            file_name=source_filename,
            phi_count=result.total_phi,
            confidence_score=result.confidence_score,
            dlp_residual_count=result.dlp_residual_findings,
            status=status,
            output_doc_url=doc_url,
            processing_time_ms=result.processing_time_ms,
            mappings=mappings,
        )
        logger.info("PHI mapping stored in Firestore for job %s", result.job_id)
    except Exception as e:
        logger.error("Failed to store PHI mapping: %s", e)
