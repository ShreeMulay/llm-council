# Deployment Delta

## ADDED Requirements

### Requirement: Honest immutable promotion evidence

The rollout SHALL verify promotion evidence before reading or mutating the service and SHALL state its binding scope exactly.

#### Scenario: Verify benchmark without claiming image identity

- **GIVEN** the committed 52-case benchmark binds the roster, registry digest, run manifest, policies, prompt suite, completeness, and threshold outcomes
- **WHEN** a rollout is requested
- **THEN** the verifier MUST validate every pinned hash and passing outcome before service describe, lock acquisition, snapshot, deploy, or traffic mutation
- **AND** the evidence MUST NOT claim to bind an image SHA built after the benchmark
- **AND** runtime probes MUST separately bind the deployed revision/image, registry and projection digests, roster, routes, schema, policy, and objective output

### Requirement: Single manual deployment owner

GitHub SHALL be a mirror whose deployment workflow can be started only by an explicit operator dispatch.

#### Scenario: Mirror master without deployment

- **GIVEN** Forgejo master is mirrored to GitHub master
- **WHEN** GitHub receives the push
- **THEN** no deploy workflow SHALL start
- **AND** no image build, traffic mutation, or paid council probe SHALL occur
- **AND** the GitHub deploy workflow SHALL expose only `workflow_dispatch` as its trigger

#### Scenario: Bind manual dispatch to approved Forgejo master

- **GIVEN** an operator manually dispatches the GitHub mirror workflow with an approved full Forgejo commit SHA
- **WHEN** the workflow prepares to build
- **THEN** it MUST fetch Forgejo `master` and require the dispatch input, checked-out commit, and fetched Forgejo `master` commit to be the same full SHA
- **AND** a missing, abbreviated, malformed, stale, or mismatched SHA MUST fail before build, service access, traffic mutation, or paid probe
- **AND** the executable entry point MUST complete these checks before it calls top-level `run_rollout`

#### Scenario: Bind a local rollout to clean Forgejo master

- **WHEN** a local deployment entry point is invoked
- **THEN** it MUST fetch Forgejo `origin/master` and require a clean worktree whose `HEAD` exactly equals that fetched full SHA
- **AND** it MUST fail before build, service access, traffic mutation, or paid probe when either condition is false
- **AND** the executable entry point MUST complete both checks before it calls top-level `run_rollout`

#### Scenario: Delegate every deployment through one controller

- **GIVEN** the bounded controller is still prospective in Phase 1
- **WHEN** production entry-point contracts are evaluated
- **THEN** `scripts/deploy.sh` MUST be the production entry point and delegate the complete operation to `run_rollout`
- **AND** GitHub manual dispatch MUST invoke only `scripts/deploy.sh` after full-SHA verification rather than build, mutate traffic, or run probes itself
- **AND** `cloudbuild.yaml` MUST be build-only or delegate to `run_rollout`
- **AND** Cloud Build MUST NOT independently mutate Cloud Run traffic, deploy a service, or issue a paid council probe
- **AND** these SHALL remain RED prospective contracts until production implementation is explicitly authorized

### Requirement: Exact bounded paid-attempt state machine

The prospective top-level `run_rollout` controller SHALL own the complete rollout sequence, its five expected paid attempts, and the six-attempt absolute bound. No caller SHALL pass, replace, or reorder an attempt plan.

#### Scenario: Controller owns the immutable sequence

- **WHEN** any approved deployment entry point invokes `run_rollout`
- **THEN** the controller MUST execute benchmark → lock → prior snapshot validation → build → prior stream → shadow deploy/health → shadow sync/stream → 10% → planned restore → restarted 10% → 50% → authoritative 100% convergence → strict approved production health verification → final sync/stream → terminal cleanup/verification → durable retention obligation → mutation disarm → lock release
- **AND** benchmark verification MUST precede lock acquisition
- **AND** lock acquisition MUST precede every Cloud Run service access and initial snapshot validation MUST precede build
- **AND** the public controller interface MUST NOT accept an attempt sequence

#### Scenario: Execute the five expected attempts

- **GIVEN** the immutable benchmark and free identity gates pass
- **WHEN** the rollout succeeds without infrastructure retry
- **THEN** paid attempts MUST occur exactly in order as `prior-stream`, `shadow-sync`, `shadow-stream`, `final-sync`, and `final-stream`
- **AND** no paid attempt SHALL occur at rehearsal 10%, planned rehearsal restoration, restarted 10%, or 50%
- **AND** each attempt MUST create `rollout-evidence/<rollout-id>/attempts/NNNN-started.json` before its network request and separately create `NNNN-completed.json` after classification
- **AND** both objects MUST be immutable generation-match `0` creates and MUST never be updated
- **AND** each started record's exact content-free fields MUST be `rollout_id`, `stage`, `surface`, `url_sha256`, `attempt_number`, optional `retry_of`, `paid_gate_state`, and `classification: started`
- **AND** its completed record MUST repeat and exactly match that started record's `rollout_id`, `attempt_number`, `stage`, `surface`, `url_sha256`, optional `retry_of` presence and value, and `paid_gate_state`
- **AND** the completed `classification` MUST be exactly one bounded outcome from `succeeded`, `http_429`, `http_503`, `timeout`, `connection_reset`, `objective`, `instruction`, `factual`, `evaluator_format`, `schema`, `content`, `fallback`, `route`, `policy`, `usage`, `pricing`, `identity`, `absolute_slo`, or `semantic_unknown`
- **AND** typed smoke semantic failures MUST retain their actual bounded category; an unrecognized semantic failure MUST become `semantic_unknown` and MUST never default to `objective`
- **AND** `url_sha256` MUST identify the exact URL without storing the URL, and no prompt, response, content, secret, PHI, raw exception, or raw error SHALL be stored
- **AND** a started attempt MUST count after process crash even when no completion exists

#### Scenario: Refuse automatic crash recovery

- **GIVEN** a generation-0 deployment lock already exists, including a stale lock left by an interrupted rollout
- **WHEN** a normal controller run attempts lock acquisition
- **THEN** it MUST return explicit `stale_lock_recovery_required` status
- **AND** it MUST NOT steal, expire, replace, or release the existing lock
- **AND** it MUST NOT read or mutate the service, build an image, inspect an attempt ledger, or issue a paid request
- **AND** recovery MUST require a separate bounded manual procedure with durable snapshot and owned-state proof

#### Scenario: Retry one classified infrastructure failure

- **GIVEN** a paid attempt fails with HTTP 429, HTTP 503, timeout, or connection reset
- **WHEN** no infrastructure retry has yet been consumed
- **THEN** the rollout MAY retry once at the same stage, exact URL, and API surface
- **AND** the global ledger SHALL contain no more than six attempts
- **AND** an objective, instruction, factual, evaluator-format, schema/content, fallback, route, policy, usage, pricing, identity, absolute-SLO, unknown, or other semantic failure MUST NOT be retried
- **AND** any second infrastructure failure MUST be terminal
- **AND** real sync and stream HTTP adapters MUST raise one typed, content-free infrastructure exception for actual HTTP 429, HTTP 503, timeout, and connection reset outcomes
- **AND** the production boundary MUST preserve that exact classification for the controller while all schema, semantic, objective, route, fallback, policy, usage, and pricing failures remain non-retryable

#### Scenario: Restore during the planned rehearsal

- **GIVEN** the planned 10% rollback rehearsal has started
- **WHEN** exact prior state is being restored and verified
- **THEN** no paid attempt SHALL start during that restoration
- **AND** successful restoration MUST leave the paid gate available for the separately approved final sync and stream attempts

#### Scenario: Reject generic paid-count carry-forward

- **GIVEN** no exact resume authorization has been supplied
- **WHEN** an operator starts fresh mode
- **THEN** `ROLLOUT_PRIOR_PAID_ATTEMPTS` and `--prior-paid-attempts` MUST equal canonical `0`
- **AND** bool, negative, positive, noncanonical, malformed, or resume-evidence values MUST fail before controller execution
- **AND** the fresh five-attempt sequence and optional single infrastructure retry MUST retain six as the absolute maximum

#### Scenario: Resume exactly after two proven prior probes

- **GIVEN** two failed pre-traffic runs each completed a successful prior stream probe and proved `ALREADY_CONVERGED_NO_TRAFFIC`
- **WHEN** an operator selects exact mode `resume-after-prior-v1`
- **THEN** count MUST equal `2` and an approved-prefix manifest URI plus exact nonzero generation MUST be supplied
- **AND** the generation-pinned strict manifest MUST name two distinct source rollout IDs and source approved SHAs and reference two generation-pinned strict source attestations
- **AND** all four checkpoint/recovery references and both attestation references MUST be distinct and use exact fixed-bucket source rollout, completed-attempt 1/2, recovery, and target-SHA-specific `source-attestation-<target-sha>.json` paths
- **AND** each no-extra-fields attestation MUST bind schema version 1, resume mode, its source rollout ID and approved SHA, the current target SHA, fixed project/region/service, exact checkpoint/recovery URI and generation, expected attempt 1 then 2, service URL hash, complete canonical traffic hash, and expected prior revision
- **AND** each immutable recovery object MUST use its exact no-extra-fields production schema: candidate image digest, fixed-service candidate revision, zero candidate traffic, classification `ALREADY_CONVERGED_NO_TRAFFIC`, numeric-string lock generation, current prior revision, source rollout ID, canonical service UID, positive exact service generation, true traffic-snapshot match, and exactly `paid_attempts=1` for source 1 or `cumulative_paid_attempts=2` for source 2; a `status` field MUST NOT be accepted
- **AND** every manifest, checkpoint, recovery, and attestation integer MUST have exact integer type; booleans, floats, fractional values, equality-only values, missing/unknown fields, duplicate IDs/references, and path/content mismatches MUST fail closed
- **AND** benchmark and lock-absence proof MUST precede evidence and service preflight; lock acquisition MUST bind manifest URI/generation and target SHA; all evidence and service state MUST be revalidated under lock before fresh prior health and build
- **AND** only prior stream SHALL be skipped, attempts 3-6 SHALL be shadow sync/stream then final sync/stream, infrastructure retry SHALL be disabled, and attempt 7 MUST be impossible
- **AND** fresh mode MUST remain count `0` and reject all resume fields

#### Scenario: Resume the Oracle-approved incident after shadow probes

- **GIVEN** source run `000754f3c963-1783979097` has exact successful started/completed attempt pairs 3 and 4, exact recovery generation `1783980208306954` with cumulative count 4, and retained candidate `llm-council-000754f3c963-9b63e747` at digest `sha256:b34c651fcbc29f8b6491bfd8ecdf0d7abe7b954d814a750c7ea3a7621dec10c2`
- **WHEN** an operator selects exact mode `resume-after-shadow-v1`
- **THEN** count MUST be exact integer `4`, the manifest MUST be under the fixed `resume-after-shadow-v1` prefix at an exact generation, and all other mode/count/prefix combinations MUST fail closed
- **AND** the strict no-extra-fields manifest MUST separately bind current controller SHA, immutable target SHA `000754f3c963c002b25a35f0b13a7c01a69510f9`, source run, fixed namespace, exact prior manifest URI/generation, exact attempt 3/4 started/completed URI/generations and matching metadata, exact recovery, restored service UID/generation/etag/URL hash/traffic hash, continuation ID, and candidate revision/digest/target SHA
- **AND** the exact prior manifest and its complete source chain MUST be revalidated using its target SHA while controller authorization remains the exact current Forgejo master SHA; controller and target SHA MAY differ
- **AND** all manifest and evidence numeric values MUST have exact JSON integer type, all reads MUST be generation-pinned, and evidence plus current service MUST be read before and after CAS lock acquisition and rechecked around fresh prior health
- **AND** under the newly acquired lock and before mutation, a generation-0 permanent claim keyed safely by manifest URI/generation MUST bind exact manifest, controller, target, continuation ID, and count 4; replay MUST refuse and the claim MUST never be deleted
- **AND** historical recovery lock generation MUST grant no authority, pre-mutation failure MUST release only the newly acquired lock while retaining the claim, and post-mutation rollback MUST require exact owned state and restore the exact snapshot
- **AND** this mode MUST NOT build or deploy, MUST validate the retained candidate Revision resource, and MUST transition directly from restored prior-100 to tagged candidate-100
- **AND** candidate-only production sampling and strict target/image health MUST pass before attempt 5 final sync and attempt 6 final stream, no retry or attempt 7 is allowed, and final traffic MUST be untagged candidate-100 while preserving unrelated snapshot zero targets and tags

#### Scenario: Normalize exact revision resources

- **WHEN** deploy ownership compares latest-created, latest-ready, template, revision-resource, or expected revision values
- **THEN** it MUST accept a valid short revision ID or the exact full project/region/service revision resource and compare normalized short IDs
- **AND** any malformed ID or any other slash namespace MUST fail closed

#### Scenario: Refuse production namespace overrides before effects

- **GIVEN** production constants `tke-phi-privacy-engine`, `us-central1`, and `llm-council`
- **WHEN** an environment, startup, controller boundary, or production adapter supplies any conflicting project, region, or service
- **THEN** rollout startup MUST fail before benchmark, lock, service, build, or paid boundary calls
- **AND** revision normalization MUST use only the compiled constants, never boundary attributes

#### Scenario: Permanently close paid gate on terminal rollback

- **GIVEN** a terminal failure, signal, timeout, or guarded failure exit requires rollback
- **WHEN** terminal rollback starts
- **THEN** the rollout MUST atomically and permanently close the paid gate before any restore mutation
- **AND** no paid attempt SHALL start during or after terminal rollback

### Requirement: Cooperative lock and optimistic traffic concurrency

The rollout SHALL serialize operators with a generation-safe GCS lock and SHALL mutate traffic only with Cloud Run v2 optimistic concurrency.

#### Scenario: Own and release the deployment lock

- **WHEN** the rollout acquires `gs://tke-phi-privacy-engine_cloudbuild/rollout-locks/tke-phi-privacy-engine/us-central1/llm-council.lock`
- **THEN** acquisition MUST use `--if-generation-match=0`
- **AND** owner identity and the resulting object generation MUST be recorded
- **AND** release MUST conditionally delete only the recorded generation
- **AND** an existing or stale lock MUST NOT be stolen or auto-expired
- **AND** an existing lock MUST produce explicit `stale_lock_recovery_required` status for manual recovery
- **AND** malformed owner content, a missing generation, or an ownership mismatch MUST be rejected
- **AND** acquisition MUST complete before any Cloud Run service read, build, deploy, or traffic mutation

#### Scenario: Require a safe prior state

- **GIVEN** the lock is held
- **WHEN** initial Cloud Run v2 state is captured
- **THEN** service UID, generation, observed generation, etag, exact canonical traffic/tags, prior image, and prior health identity MUST be recorded
- **AND** initial `observedGeneration` MUST equal `generation` and `reconciling` MUST be false
- **AND** canonical protobuf JSON omission of `reconciling` MUST normalize to false, while explicit boolean false/true retain their meanings and explicit null or any nonboolean value MUST fail closed
- **AND** an absent traffic-target `percent` MUST normalize to zero, while every explicit `percent` MUST remain a nonboolean integer from 0 through 100
- **AND** exactly one resolved prior revision MUST own 100% traffic
- **AND** the exact HTTPS service base URL MUST be captured from that same initial Service payload and retained as immutable rollout state
- **AND** a missing or malformed service URL MUST fail closed before build or paid access
- **AND** malformed UID, etag, generation, observed generation, ownership, or any other prior traffic shape MUST release the owned lock and stop before build, deploy, mutation, or paid request

#### Scenario: Patch and converge traffic

- **GIVEN** the expected service etag and canonical prior state
- **WHEN** traffic changes
- **THEN** the rollout MUST PATCH only the Cloud Run v2 Service `traffic` field with that etag
- **AND** it MUST poll the returned long-running operation to completion and then poll Service until `observedGeneration == generation`, `reconciling == false`, and canonical `trafficStatuses` exactly match the strict expected-status projection
- **AND** UID MUST remain stable, generation MUST progress as expected, and each accepted transition MUST expose a fresh etag
- **AND** requested canonical traffic and tags MUST equal accepted Service `traffic`, while URI-normalized `trafficStatuses` MUST equal the expected-status projection of that traffic
- **AND** complete traffic targets MUST be strictly type-normalized and sorted by exact routing fields before comparison or hashing, without merging targets, dropping tags, or depending on API response order
- **AND** expected-status projection MUST first apply that strict canonical normalization and then remove only an untagged zero-percent target whose revision also appears in a tagged target; unrelated untagged zero-percent targets, tagged zero-percent targets, every positive target, and all distinct entries MUST remain unchanged
- **AND** projection MUST NOT hide unknown fields, malformed values, duplicates, invalid allocations, omitted positive targets, missing tagged targets, extra statuses, or wrong revision/tag/percent values; strict normalization or exact projected comparison MUST reject them
- **AND** target identity MUST be the exact `(revision, tag)` pair, where an absent tag is distinct from every tagged target; identities and nonempty tags MUST each be unique and every complete allocation MUST sum to exactly 100%
- **AND** each stage MUST transform the snapshot's sole positive prior target in place to the remaining percentage, preserving its exact revision, tag presence, and tag value rather than adding a second prior target
- **AND** immediately after `gcloud run deploy --no-traffic`, Service `traffic` MUST equal the exact canonical snapshot with no candidate target and URI-normalized `trafficStatuses` MUST equal its exact expected-status projection
- **AND** a tagged stage MUST preserve both the automatic untagged candidate target at 0% and a separate tagged candidate target at the requested percentage; final untagged 100% MUST contain exactly one candidate target at 100%
- **AND** deploy ownership MUST reject any candidate traffic target before the tagged PATCH; tagged-stage Service `traffic` MUST retain both candidate targets, while projected statuses MAY omit only the untagged zero-percent candidate and MUST retain the tagged candidate target
- **AND** a generated shadow tag colliding with any snapshot tag MUST fail before build, deploy, traffic PATCH, or paid request
- **AND** planned and terminal restoration MUST restore the exact snapshot traffic and its exact expected-status projection and thereby remove both rollout-owned candidate targets
- **AND** any malformed or error long-running operation, stale or unexpected UID, generation, observed generation, reconciling state, unchanged etag, ownership, canonical traffic, canonical tag, or `trafficStatuses` transition MUST independently fail closed
- **AND** every PATCH body MUST preserve all unrelated traffic tags and remove only the rollout-owned shadow tag when required
- **AND** an omitted long-running-operation `done` field MUST mean pending/false, while an explicitly present nonboolean `done` value MUST fail closed

### Requirement: Authoritative traffic and diagnostic health

Cloud Run control-plane state SHALL be authoritative for percentages while health samples diagnose reachable identity.

#### Scenario: Diagnose a partial stage

- **GIVEN** authoritative control-plane traffic is at 10% or 50%
- **WHEN** service health is sampled
- **THEN** every sample MUST match either the prior or candidate identity
- **AND** observing only one of those known identities SHALL be allowed
- **AND** identity counts MUST NOT be treated as measured traffic percentages
- **AND** the prior and candidate identities MUST differ before sampling begins

#### Scenario: Temporarily identify a legacy prior revision

- **GIVEN** the retained pre-promotion prior revision predates artifact identity emission
- **WHEN** prior identity is captured, a partial stage is sampled, or planned or terminal restoration is proven
- **THEN** a healthy payload with valid config and an entirely absent `artifacts` field MAY identify that prior revision
- **AND** the allowance MUST be explicit and default-off
- **AND** unhealthy or malformed payloads and present empty or partial artifacts MUST fail closed
- **AND** candidate health and final candidate verification MUST remain strict
- **AND** this allowance MUST be removed after production and every retained rollback target emit the complete artifact identity contract

#### Scenario: Require candidate at 100 percent

- **GIVEN** authoritative control-plane traffic is at 100% candidate
- **WHEN** service health is sampled
- **THEN** every sample MUST match the candidate identity

#### Scenario: Strictly bind candidate and final health to approval

- **GIVEN** the candidate image was built from one approved full Forgejo SHA and resolved to one exact immutable image digest
- **WHEN** shadow candidate health or final production service health is accepted
- **THEN** the existing strict deploy-health verifier MUST independently require that approved full SHA and exact image digest
- **AND** it MUST verify the exact roster, registry digest, projection digests, ordered routes and roles, and strict Vertex Fable policy
- **AND** a health identity captured from the candidate itself MUST NOT serve as authority for either acceptance
- **AND** final service health MUST rerun the strict verification against the same approved values rather than trusting the prior shadow result
- **AND** final production service health MUST pass only after authoritative 100% convergence and before either final sync or final stream paid request

### Requirement: Bounded staged observations

The restarted 10% and 50% stages SHALL each receive a five-minute free observation window.

#### Scenario: Record revision telemetry

- **WHEN** either five-minute observation runs
- **THEN** revision-attributed request count, 5xx, and latency telemetry MUST be recorded
- **AND** zero organic requests MUST be reported as `no_evidence`, not success or failure
- **AND** telemetry and telemetry-query failures SHALL be diagnostic only and MUST NOT implicitly pass or fail a promotion gate
- **AND** control-plane convergence and synthetic health checks MUST still pass

### Requirement: Deadline and signal-safe exact rollback

Promotion SHALL be bounded by one monotonic 30-minute deadline and rollback SHALL have a separate five-minute grace.

#### Scenario: Propagate remaining promotion and rollback budget

- **GIVEN** an injected monotonic clock established one 1800-second promotion deadline
- **WHEN** token acquisition, REST access, GCS evidence access, build, deploy, operation polling, service convergence, observation, health, paid probes, telemetry, lock operations, retention work, or sleep starts
- **THEN** it MUST receive no more than the remaining monotonic promotion budget
- **AND** every repeated long-running-operation and Service poll MUST recalculate the remaining budget, so each later poll receives a strictly reduced value as the injected clock advances
- **AND** every gcloud subprocess, secret lookup, HTTP request, and sleep MUST receive a timeout no greater than the then-remaining budget
- **AND** multi-step production adapters MUST reduce one shared adapter budget between their internal operations rather than reuse the original timeout
- **AND** the independent rollback grace MUST be propagated under the same rules to rollback token, REST, poll, health, lock, subprocess, and sleep operations
- **AND** exhaustion MUST prevent every subsequent build, deploy, service access, traffic transition, observation, health check, and paid request
- **AND** every outer execution timeout MUST exceed 2100 seconds

#### Scenario: Roll back on every terminal path

- **GIVEN** mutation has begun and final verification is incomplete
- **WHEN** `ERR`, `TERM`, `INT`, `HUP`, or guarded `EXIT` occurs
- **THEN** rollback MUST remain armed and receive up to five minutes independent of the promotion deadline
- **AND** proof MUST require exact canonical traffic/tag equality, exact expected-status projection, exact prior health identity, stable UID, converged generation, and fresh etag progression
- **AND** canonical traffic, canonical tags, URI-normalized `trafficStatuses`, prior health identity, UID, observed/generation equality, `reconciling == false`, fresh etag, successful LRO shape, and continued lock ownership MUST each be independently necessary proof dimensions
- **AND** independent negative proof MUST reject UID replacement; etags that fail to progress from either snapshot or mutation-owner state; generation rollback or observed-generation mismatch; reconciliation still in progress; and malformed or error LRO completion
- **AND** the owned lock MUST remain held until all rollback proof succeeds
- **AND** rollback MUST issue no paid council request
- **AND** the rollout MUST stop rather than begin a second deployment attempt

#### Scenario: Exit after lock acquisition but before owned mutation

- **GIVEN** the controller owns the recorded lock generation but has not begun any owned service mutation
- **WHEN** `TERM`, `INT`, `HUP`, `ERR`, promotion timeout, or guarded failure `EXIT` occurs before snapshot or after snapshot but before mutation
- **THEN** it MUST generation-conditionally release only its recorded lock generation
- **AND** it MUST NOT read service state solely for cleanup, PATCH traffic, run rollback, or issue a paid request

#### Scenario: Restore exactly on signal or promotion timeout

- **GIVEN** an exact canonical snapshot and owned lock were captured before mutation
- **WHEN** `TERM`, `INT`, `HUP`, `ERR`, promotion timeout, or guarded failure `EXIT` interrupts any mutated state
- **THEN** terminal rollback MUST permanently close the paid gate, PATCH the exact snapshot with optimistic concurrency, and prove canonical traffic/tag equality plus prior identity within rollback grace
- **AND** rollback operation polling, service convergence, and health proof MUST each receive only the remaining independent 300-second rollback grace
- **AND** if the promotion deadline expires after one real controller poll returns but before its next poll, the controller MUST issue no next promotion poll or operation and terminal rollback MUST begin with a fresh independent grace
- **AND** signal and timeout handling MUST not weaken etag, UID, generation, or lock-generation checks
- **AND** immediately before rollback PATCH, current UID, exact canonical state, etag, generation, convergence, and rollout-owned last accepted state MUST all prove mutation ownership
- **AND** each successful rollout mutation MUST replace the tracked rollout-owned converged state used by that next ownership check
- **AND** any unexpected concurrent transition MUST refuse rollback mutation rather than overwrite it

#### Scenario: Recover an ambiguous shadow deploy outcome without guessing ownership

- **GIVEN** exact pre-deploy Service state and a rollout-specific expected revision name, suffix, approved SHA, and immutable image digest were persisted before deploy
- **WHEN** deploy times out or errors after server mutation, or deploy succeeds but the immediate Service read fails
- **THEN** terminal rollback MUST use only its independent rollback grace to retry Service GET
- **AND** an exact same-UID, one-generation-advanced, fresh-etag, nonconverged/reconciling state whose latest-created revision, template revision, image, approved revision environment value, image-digest environment value, expected suffix, and unchanged prior traffic/tags/statuses all match the rollout intent MUST be treated only as an intermediate state and polled again within rollback grace
- **AND** ownership MUST be established only after that exact state converges with the expected latest-created and latest-ready revision, `observedGeneration == generation`, and `reconciling == false`
- **AND** absent, malformed, contradictory, or externally transitioned evidence MUST retain the lock and refuse mutation rather than claim or overwrite ambiguous external state
- **AND** rollback-grace exhaustion before exact owned convergence MUST return `recovery_required`, retain the lock, and perform no rollback mutation or paid request
- **AND** after exact ownership is established, rollback MUST restore and prove the prior snapshot under the normal terminal rollback contract

#### Scenario: Accept the exact converged zero-traffic retired candidate

- **GIVEN** no-traffic deployment converged while the prior tagged revision remains `latestReadyRevision`
- **WHEN** deploy ownership is classified before progression
- **THEN** the controller MUST fetch the exact named candidate Revision resource
- **AND** it MUST require exact resource name; exactly one `Ready=CONDITION_SUCCEEDED`; exactly one `ContainerReady=CONDITION_SUCCEEDED`; exactly one `Active` with state `CONDITION_FAILED`, severity `INFO`, and revision reason `RETIRED`; no other terminal failure; exact immutable image digest; and exact approved-revision and image-digest environment markers
- **AND** the condition-type allowlist MUST be exactly mandatory `Ready`, `ContainerReady`, and `Active`, plus optional `ContainerHealthy`, `ResourcesAvailable`, and `MinInstancesProvisioned`; every unexpected condition type MUST fail closed regardless of state
- **AND** optional `ContainerHealthy`, when present, MUST have state `CONDITION_SUCCEEDED` and no reason, revision reason, or severity; only `ContainerHealthy`, `ResourcesAvailable`, and `MinInstancesProvisioned` MAY be omitted; each optional condition MUST match its exact allowed shape when present; every condition type MUST be unique; every present condition MUST have a known state; and any missing or unknown state or contradictory failed terminal or relevant condition MUST fail closed
- **AND** the Service MUST retain the captured UID, exact canonical snapshot traffic, and exact expected-status projection with no candidate target; advance exactly one generation with a fresh etag; converge observed generation with reconciliation false; name the candidate as latest-created and template revision; and expose successful terminal Ready and ConfigurationsReady conditions with revision reason `RETIRED`
- **AND** that exact state MAY be treated as rollout-owned although `latestReadyRevision` remains prior
- **AND** any mismatched latest-created revision, template revision, image, environment marker, condition, traffic, status, revision resource, UID, generation, or etag MUST fail closed
- **AND** progression MUST use this combined Service ownership and Revision readiness proof rather than require Service `latestReadyRevision` to equal candidate

#### Scenario: Avoid a redundant rollback traffic mutation

- **GIVEN** terminal rollback owns the exact current Service state and canonical traffic plus URI-normalized statuses already equal the snapshot traffic and its expected-status projection
- **WHEN** rollback proof runs
- **THEN** it MUST prove stable UID, converged generation, reconciliation false, exact prior health, and the exact owned lock generation
- **AND** it MUST NOT issue a traffic PATCH or require a synthetic post-PATCH generation/etag progression
- **AND** the exact post-deploy snapshot state MUST use this no-PATCH path even though the candidate revision, template, generation, and etag prove the deployment occurred
- **AND** only after those proofs pass it MUST disarm mutation and generation-conditionally release the owned lock
- **AND** traffic or status drift MUST retain the exact etag-conditioned PATCH, LRO, convergence, health, and lock-proof rollback path
- **AND** both this no-PATCH proof and the PATCH rollback proof MUST use the exact service base URL captured during initial prior state capture, never a placeholder or rediscovered URL

#### Scenario: Poll rollback until exact convergence

- **GIVEN** rollback PATCH returned a valid pending or completed long-running operation
- **WHEN** operation or Service reads show exact rollout-owned intermediate reconciliation
- **THEN** rollback MUST repeatedly poll both the long-running operation and Service as applicable until generation equals observed generation, `reconciling` is false, exact snapshot traffic/tags and its exact expected-status projection are present, prior identity passes, and every other rollback proof dimension passes
- **AND** valid intermediate reconciling states MUST continue polling rather than fail immediately
- **AND** rollback-grace exhaustion MUST fail closed, retain the lock, and perform no paid request

### Requirement: Exact terminal cleanup and retention

Success SHALL preserve state not owned by the rollout and retain rollback capacity.

#### Scenario: Complete successful rollout

- **GIVEN** final sync and stream probes pass through the production URL
- **WHEN** cleanup completes
- **THEN** candidate MUST own 100% untagged traffic with exact candidate identity and digests
- **AND** final URI-normalized statuses MUST exactly equal the final traffic's expected-status projection, retaining the positive candidate target and omitting no positive or tagged target
- **AND** only the rollout-created shadow tag MUST be removed
- **AND** unrelated tags MUST be preserved
- **AND** service generation MUST be converged before traffic rollback mutation is disarmed
- **AND** terminal ordering MUST be final canonical/candidate verification, durable retention obligation creation, rollback-mutation disarm, generation-conditioned owned-lock release, then guarded exit
- **AND** guarded exit MUST perform no service or traffic mutation after lock release
- **AND** the prior revision MUST be retained for at least 24 hours without any revision delete
- **AND** a durable content-free GCS retention obligation MUST record the rollout ID, prior revision, and `retain_until` timestamp derived no earlier than the injected current UTC clock plus 24 hours
- **AND** deployment runtime MUST NOT execute `bd` or create a Bead
- **AND** after successful deployment, the orchestrator MUST create the time-blocked follow-up Bead from the durable GCS obligation; it SHALL NOT block deployment success

#### Scenario: Complete failed rollout

- **WHEN** exact rollback proof passes after a failure
- **THEN** the rollout-created shadow tag MUST be absent
- **AND** unrelated prior tags and canonical traffic MUST exactly match the snapshot
- **AND** the prior revision and evidence required for investigation MUST be retained
- **AND** no rollout path SHALL delete a revision
- **AND** no second rollout SHALL start without new explicit operator instruction

### Requirement: Complete shared-checkout landing

Completion SHALL be claimed only from a validated checkout synchronized with the authoritative remote.

#### Scenario: Claim completion

- **GIVEN** Forgejo has merged and GitHub has mirrored the release without auto-deployment
- **WHEN** completion is claimed
- **THEN** the user's shared checkout MUST match the authoritative remote
- **AND** generated registry files and promoted IDs MUST exist in that checkout
- **AND** validation MUST have run from the shared checkout
