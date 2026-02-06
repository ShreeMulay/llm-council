"""Firestore writer for PHI mapping tables.

Stores the PHI-to-placeholder mapping in a CMEK-encrypted Firestore
database so that authorized users can re-identify text when needed.
Each job gets a top-level document in ``deid_jobs`` and a subcollection
``mappings`` with one document per PHI entity.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone, timedelta
from typing import Any

from google.cloud import firestore

logger = logging.getLogger(__name__)

# Default TTL: 90 days.  After this, Firestore TTL policy auto-deletes the doc.
DEFAULT_TTL_DAYS = 90


def _get_client(
    project_id: str | None = None,
    database: str | None = None,
) -> firestore.Client:
    """Build a Firestore client targeting the PHI-mappings database.

    The database is expected to be created with CMEK encryption
    (see docs/GCP_SETUP_GUIDE.md).
    """
    project = project_id or os.environ.get("GCP_PROJECT_ID")
    db_name = database or os.environ.get("FIRESTORE_DATABASE", "phi-mappings")

    if not project:
        raise ValueError("GCP_PROJECT_ID env var or project_id param is required")

    return firestore.Client(project=project, database=db_name)


def store_phi_mapping(
    *,
    job_id: str,
    source: str,
    requestor: str,
    file_name: str,
    phi_count: int,
    confidence_score: float,
    dlp_residual_count: int,
    status: str,
    output_doc_url: str,
    processing_time_ms: int,
    mappings: list[dict[str, Any]],
    ttl_days: int = DEFAULT_TTL_DAYS,
    project_id: str | None = None,
    database: str | None = None,
) -> str:
    """Write the PHI mapping table to Firestore.

    Parameters
    ----------
    job_id:
        Unique job identifier (used as the Firestore document ID).
    source:
        Origin of the request (``drive``, ``chat``, ``api``).
    requestor:
        Email or name of the person who initiated the request.
    file_name:
        Original file name that was processed.
    phi_count:
        Total number of PHI entities detected.
    confidence_score:
        Overall confidence score (0.0 - 1.0).
    dlp_residual_count:
        Residual PHI count from Cloud DLP verification.
    status:
        Job status (``completed``, ``review_required``, ``failed``).
    output_doc_url:
        URL of the de-identified Google Doc.
    processing_time_ms:
        Total processing time in milliseconds.
    mappings:
        List of PHI mapping entries.  Each entry should contain::

            {
                "original": "John Smith",
                "replacement": "[PATIENT_NAME_1]",
                "phi_type": "PERSON_NAME",
                "start_offset": 45,
                "end_offset": 55,
                "confidence": 0.98,
            }

    ttl_days:
        Number of days before Firestore TTL auto-deletes the document.
        Defaults to 90.
    project_id:
        GCP project ID.  Falls back to ``GCP_PROJECT_ID`` env var.
    database:
        Firestore database name.  Falls back to ``FIRESTORE_DATABASE``
        env var or ``"phi-mappings"``.

    Returns
    -------
    str
        The Firestore document path (e.g. ``deid_jobs/job_abc123``).
    """
    client = _get_client(project_id=project_id, database=database)

    now = datetime.now(timezone.utc)
    expire_at = now + timedelta(days=ttl_days)

    # Top-level job document
    job_ref = client.collection("deid_jobs").document(job_id)

    job_data: dict[str, Any] = {
        "job_id": job_id,
        "source": source,
        "requestor": requestor,
        "file_name": file_name,
        "phi_count": phi_count,
        "confidence_score": confidence_score,
        "dlp_residual_count": dlp_residual_count,
        "status": status,
        "output_doc_url": output_doc_url,
        "processing_time_ms": processing_time_ms,
        "created_at": now,
        "updated_at": now,
        "expire_at": expire_at,  # TTL field - configure TTL policy on this field
        "ttl_days": ttl_days,
        "mapping_count": len(mappings),
    }

    # Use a batch write for atomicity
    batch = client.batch()
    batch.set(job_ref, job_data)

    # Write each mapping as a subcollection document
    mappings_ref = job_ref.collection("mappings")
    for i, mapping in enumerate(mappings):
        mapping_doc = mappings_ref.document(f"phi_{i:04d}")
        mapping_data: dict[str, Any] = {
            "original": mapping["original"],
            "replacement": mapping["replacement"],
            "phi_type": mapping.get("phi_type", "UNKNOWN"),
            "start_offset": mapping.get("start_offset"),
            "end_offset": mapping.get("end_offset"),
            "confidence": mapping.get("confidence", 0.0),
            "index": i,
            "created_at": now,
            "expire_at": expire_at,
        }
        batch.set(mapping_doc, mapping_data)

    batch.commit()
    doc_path = f"deid_jobs/{job_id}"
    logger.info(
        "Stored PHI mapping for job %s (%d mappings) at %s (TTL: %d days)",
        job_id,
        len(mappings),
        doc_path,
        ttl_days,
    )
    return doc_path


def get_phi_mapping(
    job_id: str,
    *,
    project_id: str | None = None,
    database: str | None = None,
) -> dict[str, Any] | None:
    """Retrieve a PHI mapping by job ID.

    Returns the job metadata and all mapping entries, or ``None`` if
    the job document does not exist.
    """
    client = _get_client(project_id=project_id, database=database)
    job_ref = client.collection("deid_jobs").document(job_id)
    job_doc = job_ref.get()

    if not job_doc.exists:
        logger.warning("No PHI mapping found for job %s", job_id)
        return None

    result = job_doc.to_dict()
    result = result if result is not None else {}

    # Fetch subcollection mappings
    mappings_stream = job_ref.collection("mappings").order_by("index").stream()
    result["mappings"] = [doc.to_dict() for doc in mappings_stream]

    return result


def delete_phi_mapping(
    job_id: str,
    *,
    project_id: str | None = None,
    database: str | None = None,
) -> bool:
    """Delete a PHI mapping and all its subcollection documents.

    Returns ``True`` if the document existed and was deleted.
    """
    client = _get_client(project_id=project_id, database=database)
    job_ref = client.collection("deid_jobs").document(job_id)

    job_doc = job_ref.get()
    if not job_doc.exists:
        logger.warning("Cannot delete: no PHI mapping found for job %s", job_id)
        return False

    # Delete subcollection documents first
    batch = client.batch()
    for mapping_doc in job_ref.collection("mappings").stream():
        batch.delete(mapping_doc.reference)
    batch.commit()

    # Delete the parent document
    job_ref.delete()
    logger.info("Deleted PHI mapping for job %s", job_id)
    return True
