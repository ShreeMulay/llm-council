"""
Checkpoint Manager - State management for generation passes.

Handles:
- Checkpoint creation after each step
- Recovery from previous checkpoints
- Pass progress tracking
"""

import json
import logging
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import Optional, Any

logger = logging.getLogger(__name__)


@dataclass
class Checkpoint:
    """Represents a checkpoint state."""
    
    checkpoint_id: str
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    pass_number: int = 1
    completed_items: list[str] = field(default_factory=list)
    pending_items: list[str] = field(default_factory=list)
    files_created: list[str] = field(default_factory=list)
    files_modified: list[str] = field(default_factory=list)
    state: dict[str, Any] = field(default_factory=dict)
    errors: list[str] = field(default_factory=list)
    can_resume: bool = True
    
    def to_dict(self) -> dict:
        """Convert checkpoint to dictionary."""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: dict) -> "Checkpoint":
        """Create checkpoint from dictionary."""
        return cls(**data)
    
    def save(self, filepath: str) -> None:
        """Save checkpoint to file."""
        path = Path(filepath)
        path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(path, 'w') as f:
            json.dump(self.to_dict(), f, indent=2)
        
        logger.info(f"Checkpoint saved: {filepath}")
    
    @classmethod
    def load(cls, filepath: str) -> "Checkpoint":
        """Load checkpoint from file."""
        with open(filepath, 'r') as f:
            data = json.load(f)
        return cls.from_dict(data)


class CheckpointManager:
    """Manages checkpoints for generation passes."""
    
    def __init__(self, passes_dir: str = "passes"):
        """
        Initialize checkpoint manager.
        
        Args:
            passes_dir: Base directory for pass logs and checkpoints
        """
        self.passes_dir = Path(passes_dir)
        self.current_checkpoint: Optional[Checkpoint] = None
    
    def _get_quarter(self) -> str:
        """Get current quarter string (e.g., '2025-Q1')."""
        now = datetime.now()
        quarter = (now.month - 1) // 3 + 1
        return f"{now.year}-Q{quarter}"
    
    def _get_pass_dir(self, pass_number: int) -> Path:
        """Get directory for a specific pass."""
        quarter = self._get_quarter()
        return self.passes_dir / quarter / f"pass-{pass_number}"
    
    def create_checkpoint(
        self,
        pass_number: int,
        checkpoint_name: str,
        completed_items: Optional[list[str]] = None,
        pending_items: Optional[list[str]] = None,
        files_created: Optional[list[str]] = None,
        files_modified: Optional[list[str]] = None,
        state: Optional[dict[str, Any]] = None,
        errors: Optional[list[str]] = None,
    ) -> Checkpoint:
        """
        Create and save a new checkpoint.
        
        Args:
            pass_number: Current pass number
            checkpoint_name: Name for this checkpoint (e.g., 'domain-01-clinical')
            completed_items: Items completed so far
            pending_items: Items still to process
            files_created: Files created in this pass
            files_modified: Files modified in this pass
            state: Additional state data
            errors: Any errors encountered
            
        Returns:
            Created Checkpoint object
        """
        checkpoint_id = f"pass-{pass_number}-{checkpoint_name}"
        
        checkpoint = Checkpoint(
            checkpoint_id=checkpoint_id,
            pass_number=pass_number,
            completed_items=completed_items or [],
            pending_items=pending_items or [],
            files_created=files_created or [],
            files_modified=files_modified or [],
            state=state or {},
            errors=errors or [],
            can_resume=True,
        )
        
        # Save checkpoint
        pass_dir = self._get_pass_dir(pass_number)
        checkpoint_path = pass_dir / f"checkpoint-{checkpoint_name}.json"
        checkpoint.save(str(checkpoint_path))
        
        self.current_checkpoint = checkpoint
        return checkpoint
    
    def get_latest_checkpoint(self, pass_number: int) -> Optional[Checkpoint]:
        """
        Get the latest checkpoint for a pass.
        
        Args:
            pass_number: Pass number to check
            
        Returns:
            Latest Checkpoint or None if no checkpoints exist
        """
        pass_dir = self._get_pass_dir(pass_number)
        
        if not pass_dir.exists():
            return None
        
        checkpoints = list(pass_dir.glob("checkpoint-*.json"))
        if not checkpoints:
            return None
        
        # Sort by modification time, get latest
        latest = max(checkpoints, key=lambda p: p.stat().st_mtime)
        return Checkpoint.load(str(latest))
    
    def list_checkpoints(self, pass_number: int) -> list[str]:
        """
        List all checkpoints for a pass.
        
        Args:
            pass_number: Pass number to check
            
        Returns:
            List of checkpoint filenames
        """
        pass_dir = self._get_pass_dir(pass_number)
        
        if not pass_dir.exists():
            return []
        
        return [p.name for p in pass_dir.glob("checkpoint-*.json")]
    
    def can_resume(self, pass_number: int) -> bool:
        """
        Check if a pass can be resumed from checkpoint.
        
        Args:
            pass_number: Pass number to check
            
        Returns:
            True if resumable checkpoint exists
        """
        checkpoint = self.get_latest_checkpoint(pass_number)
        return checkpoint is not None and checkpoint.can_resume
    
    def resume_from_checkpoint(self, pass_number: int) -> Optional[Checkpoint]:
        """
        Resume from the latest checkpoint.
        
        Args:
            pass_number: Pass number to resume
            
        Returns:
            Checkpoint to resume from, or None
        """
        checkpoint = self.get_latest_checkpoint(pass_number)
        
        if checkpoint and checkpoint.can_resume:
            self.current_checkpoint = checkpoint
            logger.info(f"Resuming from checkpoint: {checkpoint.checkpoint_id}")
            return checkpoint
        
        return None
    
    def mark_complete(self, pass_number: int) -> Checkpoint:
        """
        Mark a pass as complete.
        
        Args:
            pass_number: Pass number to mark complete
            
        Returns:
            Final checkpoint
        """
        checkpoint = Checkpoint(
            checkpoint_id=f"pass-{pass_number}-complete",
            pass_number=pass_number,
            completed_items=self.current_checkpoint.completed_items if self.current_checkpoint else [],
            pending_items=[],
            files_created=self.current_checkpoint.files_created if self.current_checkpoint else [],
            files_modified=self.current_checkpoint.files_modified if self.current_checkpoint else [],
            state={"status": "complete"},
            errors=[],
            can_resume=False,
        )
        
        pass_dir = self._get_pass_dir(pass_number)
        checkpoint_path = pass_dir / "checkpoint-complete.json"
        checkpoint.save(str(checkpoint_path))
        
        self.current_checkpoint = checkpoint
        return checkpoint
    
    def write_log(self, pass_number: int, content: str) -> None:
        """
        Write or append to pass log file.
        
        Args:
            pass_number: Pass number
            content: Content to write
        """
        pass_dir = self._get_pass_dir(pass_number)
        pass_dir.mkdir(parents=True, exist_ok=True)
        
        log_path = pass_dir / "log.md"
        
        with open(log_path, 'a') as f:
            timestamp = datetime.utcnow().isoformat()
            f.write(f"\n## {timestamp}\n\n{content}\n")
