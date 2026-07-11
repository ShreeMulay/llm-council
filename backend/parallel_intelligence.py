"""Bounded, network-client-agnostic Parallel intelligence primitives."""

from __future__ import annotations

import asyncio
import copy
import fcntl
import hashlib
import inspect
import ipaddress
import json
import math
import os
import re
import socket
import tempfile
from contextlib import contextmanager
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Literal
from urllib.parse import urlsplit, urlunsplit


@dataclass(frozen=True)
class ParallelLimits:
    max_requests: int = 1
    max_results: int = 5
    max_chars: int = 8_000
    timeout_seconds: float = 10.0
    max_bytes: int = 1_000_000
    max_spend: float = 1.0

    def __post_init__(self) -> None:
        values = (
            self.max_requests,
            self.max_results,
            self.max_chars,
            self.timeout_seconds,
            self.max_bytes,
            self.max_spend,
        )
        if any(isinstance(value, bool) or not isinstance(value, (int, float)) for value in values):
            raise ValueError("limits must be numeric")
        if any(value <= 0 or not math.isfinite(value) for value in values):
            raise ValueError("limits must be positive and finite")


@dataclass(frozen=True)
class Stage0Policy:
    mode: Literal["disabled", "explicit", "classifier"] = "disabled"
    classifier_threshold: float = 0.8

    def __post_init__(self) -> None:
        if self.mode not in {"disabled", "explicit", "classifier"}:
            raise ValueError("unsupported Stage 0 mode")


@dataclass
class Stage0Result:
    query: str
    context: str | None
    metadata: dict[str, Any]
    execution_plan: Any = None


_URL = re.compile(r"https?://[^\s<>\"']+", re.IGNORECASE)


def _explicit_url(query: str) -> str | None:
    match = _URL.search(query)
    return match.group(0).rstrip(".,;!?)") if match else None


def _canonical_url(value: str) -> str | None:
    """Canonicalize only safe HTTP(S) identity fields; never alter fetch input."""
    try:
        parts = urlsplit(value)
        scheme = parts.scheme.lower()
        if scheme not in {"http", "https"} or not parts.hostname or parts.username is not None:
            return None
        host = parts.hostname.lower().rstrip(".")
        if not host or host == "localhost" or host.endswith(".localhost"):
            return None
        try:
            address = ipaddress.ip_address(host)
        except ValueError:
            address = None
        if address is not None and (
            not address.is_global
            or address.is_multicast
            or address.is_loopback
            or address.is_link_local
            or address.is_reserved
            or address.is_private
            or address.is_unspecified
        ):
            return None
        port = parts.port
        if port and not ((scheme == "https" and port == 443) or (scheme == "http" and port == 80)):
            host = f"[{host}]:{port}" if ":" in host else f"{host}:{port}"
        elif ":" in host:
            host = f"[{host}]"
        path_parts: list[str] = []
        for part in parts.path.split("/"):
            if part == "..":
                if path_parts:
                    path_parts.pop()
            elif part not in {"", "."}:
                path_parts.append(part)
        path = "/" + "/".join(path_parts) if parts.path else ""
        return urlunsplit((scheme, host, path, parts.query, ""))
    except (TypeError, ValueError):
        return None


class ParallelStage0:
    def __init__(
        self,
        client: Any,
        *,
        policy: Stage0Policy,
        limits: ParallelLimits,
        resolver: Any = None,
        transport_validator: Any = None,
    ) -> None:
        self.client = client
        self.policy = policy
        self.limits = limits
        self.resolver = resolver
        self.transport_validator = transport_validator

    async def _url_is_safe(self, value: str) -> bool:
        return bool(await self._validated_addresses(value))

    async def _validated_addresses(self, value: str) -> tuple[str, ...]:
        canonical = _canonical_url(value)
        if canonical is None:
            return ()
        host = urlsplit(canonical).hostname
        if self.transport_validator is not None:
            result = self.transport_validator(canonical)
            if inspect.isawaitable(result):
                result = await result
            if not result:
                return ()
        try:
            resolved = (
                await asyncio.to_thread(self._resolve_host, host)
                if self.resolver is None
                else self.resolver(host)
            )
            if inspect.isawaitable(resolved):
                resolved = await resolved
            addresses = [ipaddress.ip_address(str(item)) for item in resolved]
            safe = bool(addresses) and all(
                address.is_global
                and not address.is_multicast
                and not address.is_loopback
                and not address.is_link_local
                and not address.is_reserved
                and not address.is_private
                and not address.is_unspecified
                for address in addresses
            )
            return tuple(str(address) for address in addresses) if safe else ()
        except (OSError, TypeError, ValueError):
            return ()

    @staticmethod
    def _resolve_host(host: str | None) -> list[str]:
        if not host:
            return []
        return list(
            {
                item[4][0]
                for item in socket.getaddrinfo(host, None, type=socket.SOCK_STREAM)
            }
        )

    async def run(
        self,
        query: str,
        *,
        classifier_score: float | None = None,
        execution_plan: Any = None,
    ) -> Stage0Result:
        plan = copy.deepcopy(execution_plan)
        planned, reason = self._gate(classifier_score)
        metadata: dict[str, Any] = {
            "planned": planned,
            "gate_reason": reason,
            "request_count": 0,
            "sources": [],
        }
        if not planned:
            return Stage0Result(query, None, metadata, plan)

        requested_url = _explicit_url(query)
        resolved_addresses: tuple[str, ...] = ()
        if requested_url:
            resolved_addresses = await self._validated_addresses(requested_url)
            if not resolved_addresses:
                return self._failed_open(query, metadata, plan, "parallel_unsafe_url")
            if not callable(getattr(self.client, "fetch_trusted", None)):
                return self._failed_open(query, metadata, plan, "parallel_untrusted_transport")
        try:
            if self.limits.max_requests < 1:
                raw: list[dict[str, Any]] = []
            elif requested_url:
                metadata["request_count"] = 1
                raw = await asyncio.wait_for(
                    self.client.fetch_trusted(
                        requested_url,
                        resolved_addresses=resolved_addresses,
                        validate_redirect=self._url_is_safe,
                        timeout=self.limits.timeout_seconds,
                        max_bytes=self.limits.max_bytes,
                        max_spend=self.limits.max_spend,
                    ),
                    timeout=self.limits.timeout_seconds,
                )
            else:
                metadata["request_count"] = 1
                raw = await asyncio.wait_for(
                    self.client.search(
                        query,
                        max_results=self.limits.max_results,
                        timeout=self.limits.timeout_seconds,
                        max_bytes=self.limits.max_bytes,
                        max_spend=self.limits.max_spend,
                    ),
                    timeout=self.limits.timeout_seconds,
                )
        except TimeoutError:
            return self._failed_open(query, metadata, plan, "parallel_timeout")
        except Exception:  # Client failures are deliberately redacted and fail open.
            return self._failed_open(query, metadata, plan, "parallel_retrieval_failed")

        sources, texts = await self._safe_sources(
            raw or [], requested_url, trusted_fetch=bool(requested_url)
        )
        metadata["sources"] = sources
        if not sources:
            return self._failed_open(query, metadata, plan, "parallel_no_safe_evidence")
        metadata.update(provenance_status="available", trust="untrusted_evidence")
        payload = "\n\n".join(texts)
        opening = "<untrusted_parallel_evidence>"
        closing = "</untrusted_parallel_evidence>"
        if self.limits.max_chars < len(opening) + len(closing):
            context = payload[: self.limits.max_chars]
        else:
            available = max(0, self.limits.max_chars - len(opening) - len(closing))
            bounded = payload[:available]
            context = f"{opening}{bounded}{closing}"
        return Stage0Result(query, context, metadata, plan)

    def _gate(self, score: float | None) -> tuple[bool, str]:
        if self.policy.mode == "disabled":
            return False, "disabled"
        if self.policy.mode == "explicit":
            return True, "explicit_request"
        if score is not None and score >= self.policy.classifier_threshold:
            return True, "classifier_threshold"
        return False, "below_threshold"

    async def _safe_sources(
        self,
        raw: list[dict[str, Any]],
        requested_url: str | None,
        *,
        trusted_fetch: bool = False,
    ) -> tuple[list[dict[str, Any]], list[str]]:
        sources: list[dict[str, Any]] = []
        texts: list[str] = []
        seen: set[str] = set()
        for item in raw:
            supplied = item.get("canonical_url")
            url = item.get("requested_url") or item.get("url") or requested_url
            final_url = str(item.get("final_url") or supplied or url or "")
            canonical = _canonical_url(final_url)
            text = item.get("text")
            response_bytes = item.get("response_bytes", len(text.encode()) if isinstance(text, str) else 0)
            cost = item.get("cost", item.get("cost_usd", 0))
            try:
                within_budget = (
                    0 <= float(response_bytes) <= self.limits.max_bytes
                    and 0 <= float(cost) <= self.limits.max_spend
                )
            except (TypeError, ValueError):
                within_budget = False
            if (
                not canonical
                or (not trusted_fetch and not await self._url_is_safe(final_url))
                or canonical in seen
                or not isinstance(text, str)
                or not text
                or not within_budget
            ):
                continue
            seen.add(canonical)
            source = {
                "source_id": str(item.get("source_id", "")),
                "canonical_url": canonical,
                "title": str(item.get("title", "")),
                "retrieved_at": str(item.get("retrieved_at", "")),
            }
            if requested_url:
                source["requested_url"] = str(item.get("requested_url", requested_url))
            sources.append(source)
            texts.append(text)
            if len(sources) >= self.limits.max_results:
                break
        return sources, texts

    @staticmethod
    def _failed_open(
        query: str, metadata: dict[str, Any], plan: Any, code: str
    ) -> Stage0Result:
        metadata.update(
            provenance_status="failed_open",
            warnings=[{"code": code, "stage": "stage0"}],
        )
        return Stage0Result(query, None, metadata, plan)


async def augment_for_execution(
    path: Literal["sync", "stream", "async"], query: str, *, stage0: ParallelStage0, **kwargs: Any
) -> Stage0Result:
    """Single augmentation path used by every execution transport."""
    if path not in {"sync", "stream", "async"}:
        raise ValueError("unsupported execution path")
    return await stage0.run(query, **kwargs)


@dataclass
class CandidateProposal:
    proposal_id: str
    kind: str
    logical_id_suggestion: str
    routes: list[str]
    provenance: list[dict[str, Any]]
    capabilities: list[str]
    family: str
    observed_version: str
    confidence: float
    conflicts: list[str] = field(default_factory=list)
    required_next_probe: str = "independent verification and benchmark"
    status: str = "candidate"
    event_ids: list[str] = field(default_factory=list)


class ParallelMonitor:
    """Validates discovery events and persists proposals only."""

    def __init__(
        self,
        *,
        proposal_store: Path,
        registry: Any = None,
        registry_path: Path | None = None,
        lifecycle_path: Path | None = None,
        deployment_path: Path | None = None,
        production_path: Path | None = None,
    ) -> None:
        self.proposal_store = Path(proposal_store)
        # Defensive snapshots prevent accidental coupling to protected state.
        self._protected = copy.deepcopy(
            (registry, registry_path, lifecycle_path, deployment_path, production_path)
        )
        self._events: dict[str, CandidateProposal] = {}
        self._identities: dict[str, CandidateProposal] = {}
        with self._locked_store():
            self._reload()

    @property
    def proposal_count(self) -> int:
        return len(self._identities)

    def ingest(self, event: dict[str, Any]) -> CandidateProposal:
        data = copy.deepcopy(event)
        if data.get("schema_version") != "1.0":
            raise ValueError("unsupported or missing schema_version")
        required = {"event_id", "provider", "model", "version", "source", "routes", "confidence"}
        if missing := required - data.keys():
            raise ValueError(f"missing event fields: {', '.join(sorted(missing))}")
        self._validate_event(data)
        with self._locked_store():
            self._reload()
            if data["event_id"] in self._events:
                return self._events[data["event_id"]]
            identity = self._identity(data["provider"], data["model"], data["version"])
            proposal = self._identities.get(identity)
            source = copy.deepcopy(data["source"])
            if proposal is not None:
                if source not in proposal.provenance:
                    proposal.provenance.append(source)
                event_id = str(data["event_id"])
                if event_id not in proposal.event_ids:
                    proposal.event_ids.append(event_id)
                self._persist_all()
                self._events[event_id] = proposal
                return proposal
            digest = hashlib.sha256(identity.encode()).hexdigest()[:16]
            logical = f"{str(data['provider']).strip().casefold()}/{str(data['model']).strip().casefold()}"
            proposal = CandidateProposal(
                proposal_id=f"candidate-{digest}",
                kind="candidate_proposal",
                logical_id_suggestion=logical,
                routes=copy.deepcopy(data["routes"]),
                provenance=[source],
                capabilities=copy.deepcopy(data.get("capabilities", [])),
                family=str(data.get("family", "")),
                observed_version=str(data["version"]),
                confidence=float(data["confidence"]),
                event_ids=[str(data["event_id"])],
            )
            self._identities[identity] = proposal
            self._events[str(data["event_id"])] = proposal
            self._persist_all()
            return proposal

    @staticmethod
    def _identity(provider: Any, model: Any, version: Any) -> str:
        return "|".join(str(value).strip().casefold() for value in (provider, model, version))

    @staticmethod
    def _validate_event(data: dict[str, Any]) -> None:
        for key in ("event_id", "provider", "model", "version"):
            if not isinstance(data[key], str) or not data[key].strip():
                raise ValueError(f"invalid {key}")
        routes = data["routes"]
        if not isinstance(routes, list) or not routes or not all(
            isinstance(route, str) and route.strip() for route in routes
        ):
            raise ValueError("routes must be a non-empty string list")
        capabilities = data.get("capabilities", [])
        if not isinstance(capabilities, list) or not all(
            isinstance(item, str) and item.strip() for item in capabilities
        ):
            raise ValueError("capabilities must be a string list")
        source = data["source"]
        if not isinstance(source, dict) or not {"id", "url"} <= set(source):
            raise ValueError("source requires id and url")
        if not all(isinstance(source[key], str) and source[key].strip() for key in ("id", "url")):
            raise ValueError("source id and url must be non-empty strings")
        if _canonical_url(source["url"]) is None:
            raise ValueError("source url is unsafe")
        confidence = data["confidence"]
        if isinstance(confidence, bool) or not isinstance(confidence, (int, float)):
            raise ValueError("confidence must be numeric")
        if not math.isfinite(confidence) or not 0 <= confidence <= 1:
            raise ValueError("confidence must be finite and between zero and one")

    @contextmanager
    def _locked_store(self):
        self.proposal_store.parent.mkdir(parents=True, exist_ok=True)
        lock_path = self.proposal_store.with_suffix(self.proposal_store.suffix + ".lock")
        with lock_path.open("a+b") as lock:
            fcntl.flock(lock.fileno(), fcntl.LOCK_EX)
            try:
                yield
            finally:
                fcntl.flock(lock.fileno(), fcntl.LOCK_UN)

    def _reload(self) -> None:
        self._identities = {}
        self._events = {}
        if not self.proposal_store.exists():
            return
        for line in self.proposal_store.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            try:
                proposal = CandidateProposal(**json.loads(line))
            except (TypeError, ValueError, json.JSONDecodeError):
                continue
            logical = proposal.logical_id_suggestion.split("/", 1)
            if len(logical) != 2:
                continue
            identity = self._identity(logical[0], logical[1], proposal.observed_version)
            self._identities[identity] = proposal
            for event_id in proposal.event_ids:
                self._events[event_id] = proposal

    def _persist_all(self) -> None:
        self.proposal_store.parent.mkdir(parents=True, exist_ok=True)
        content = "".join(
            json.dumps(asdict(proposal), sort_keys=True) + "\n"
            for proposal in self._identities.values()
        )
        fd, temporary = tempfile.mkstemp(prefix=f".{self.proposal_store.name}.", dir=self.proposal_store.parent)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as output:
                output.write(content)
                output.flush()
                os.fsync(output.fileno())
            os.replace(temporary, self.proposal_store)
            directory_fd = os.open(self.proposal_store.parent, os.O_RDONLY)
            try:
                os.fsync(directory_fd)
            finally:
                os.close(directory_fd)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)
