"""JSON-based storage for conversations with per-conversation locking."""

import asyncio
import json
import os
import re
import tempfile
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path
from .config import CONVERSATIONS_DIR

# Valid conversation ID: UUID format only (prevents path traversal)
_VALID_ID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.IGNORECASE
)

# Per-conversation locks to prevent read-modify-write races.
# Safe because uvicorn runs a single event loop per worker.
_conversation_locks: Dict[str, asyncio.Lock] = {}


def _get_lock(conversation_id: str) -> asyncio.Lock:
    """Get or create an asyncio lock for a conversation."""
    if conversation_id not in _conversation_locks:
        _conversation_locks[conversation_id] = asyncio.Lock()
    return _conversation_locks[conversation_id]


def _validate_conversation_id(conversation_id: str) -> None:
    """Validate conversation ID is a safe UUID format. Raises ValueError on invalid input."""
    if not _VALID_ID_RE.match(conversation_id):
        raise ValueError(
            f"Invalid conversation ID format: {conversation_id!r} (must be UUID)"
        )


def ensure_data_dir():
    """Ensure the data directory exists."""
    CONVERSATIONS_DIR.mkdir(parents=True, exist_ok=True)


def get_conversation_path(conversation_id: str) -> str:
    """Get the file path for a conversation."""
    _validate_conversation_id(conversation_id)
    path = (CONVERSATIONS_DIR / f"{conversation_id}.json").resolve()
    # Double-check resolved path stays under CONVERSATIONS_DIR
    if not str(path).startswith(str(CONVERSATIONS_DIR.resolve())):
        raise ValueError(f"Path traversal detected: {conversation_id!r}")
    return str(path)


def create_conversation(conversation_id: str) -> Dict[str, Any]:
    """
    Create a new conversation.

    Args:
        conversation_id: Unique identifier for the conversation

    Returns:
        New conversation dict
    """
    ensure_data_dir()

    conversation = {
        "id": conversation_id,
        "created_at": datetime.utcnow().isoformat(),
        "title": "New Conversation",
        "messages": [],
    }

    # Save to file
    path = get_conversation_path(conversation_id)
    with open(path, "w") as f:
        json.dump(conversation, f, indent=2)

    return conversation


def get_conversation(conversation_id: str) -> Optional[Dict[str, Any]]:
    """
    Load a conversation from storage.

    Args:
        conversation_id: Unique identifier for the conversation

    Returns:
        Conversation dict or None if not found
    """
    path = get_conversation_path(conversation_id)

    if not os.path.exists(path):
        return None

    with open(path, "r") as f:
        return json.load(f)


def save_conversation(conversation: Dict[str, Any]):
    """
    Save a conversation to storage using atomic write (temp + rename).

    Args:
        conversation: Conversation dict to save
    """
    ensure_data_dir()

    path = get_conversation_path(conversation["id"])
    # Atomic write: write to temp file in same directory, then rename
    dir_path = os.path.dirname(path)
    fd, tmp_path = tempfile.mkstemp(dir=dir_path, suffix=".tmp")
    try:
        with os.fdopen(fd, "w") as f:
            json.dump(conversation, f, indent=2)
        os.replace(tmp_path, path)  # Atomic on POSIX
    except BaseException:
        # Clean up temp file on any failure
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise


def list_conversations() -> List[Dict[str, Any]]:
    """
    List all conversations (metadata only).

    Returns:
        List of conversation metadata dicts
    """
    ensure_data_dir()

    conversations = []
    for filename in os.listdir(CONVERSATIONS_DIR):
        if filename.endswith(".json"):
            path = str(CONVERSATIONS_DIR / filename)
            with open(path, "r") as f:
                data = json.load(f)
                # Return metadata only
                conversations.append(
                    {
                        "id": data["id"],
                        "created_at": data["created_at"],
                        "title": data.get("title", "New Conversation"),
                        "message_count": len(data["messages"]),
                    }
                )

    # Sort by creation time, newest first
    conversations.sort(key=lambda x: x["created_at"], reverse=True)

    return conversations


async def add_user_message(conversation_id: str, content: str):
    """
    Add a user message to a conversation (async, with locking).

    Args:
        conversation_id: Conversation identifier
        content: User message content
    """
    async with _get_lock(conversation_id):
        conversation = get_conversation(conversation_id)
        if conversation is None:
            raise ValueError(f"Conversation {conversation_id} not found")

        conversation["messages"].append({"role": "user", "content": content})
        save_conversation(conversation)


async def add_assistant_message(
    conversation_id: str,
    stage1: List[Dict[str, Any]],
    stage2: List[Dict[str, Any]],
    stage3: Dict[str, Any],
):
    """
    Add an assistant message with all 3 stages to a conversation (async, with locking).

    Args:
        conversation_id: Conversation identifier
        stage1: List of individual model responses
        stage2: List of model rankings
        stage3: Final synthesized response
    """
    async with _get_lock(conversation_id):
        conversation = get_conversation(conversation_id)
        if conversation is None:
            raise ValueError(f"Conversation {conversation_id} not found")

        conversation["messages"].append(
            {"role": "assistant", "stage1": stage1, "stage2": stage2, "stage3": stage3}
        )
        save_conversation(conversation)


async def update_conversation_title(conversation_id: str, title: str):
    """
    Update the title of a conversation (async, with locking).

    Args:
        conversation_id: Conversation identifier
        title: New title for the conversation
    """
    async with _get_lock(conversation_id):
        conversation = get_conversation(conversation_id)
        if conversation is None:
            raise ValueError(f"Conversation {conversation_id} not found")

        conversation["title"] = title
        save_conversation(conversation)


def delete_conversation(conversation_id: str) -> bool:
    """
    Delete a conversation from storage.

    Args:
        conversation_id: Conversation identifier

    Returns:
        True if deleted, False if not found
    """
    path = get_conversation_path(conversation_id)

    if not os.path.exists(path):
        return False

    os.remove(path)
    return True
