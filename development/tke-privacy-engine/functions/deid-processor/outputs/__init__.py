"""Output writers for de-identification results.

- docs_writer: Creates Google Docs with de-identified text
- sheets_writer: Appends audit rows to Google Sheets
- firestore_writer: Stores PHI mappings in Firestore (CMEK)
- markdown_writer: Creates .md files (deid + summary) in Google Drive
"""

from outputs.docs_writer import write_deid_doc
from outputs.firestore_writer import (
    delete_phi_mapping,
    get_phi_mapping,
    store_phi_mapping,
)
from outputs.markdown_writer import write_deid_markdown
from outputs.sheets_writer import append_audit_row

__all__ = [
    "write_deid_doc",
    "write_deid_markdown",
    "append_audit_row",
    "store_phi_mapping",
    "get_phi_mapping",
    "delete_phi_mapping",
]
