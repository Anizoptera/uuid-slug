# TypeScript performance roadmap

## Goal and decision rule

Find remaining avoidable TypeScript work on the existing Node, Bun 1.4.2, Deno, and Chromium
routes without changing public behavior, wire formats, ownership, diagnostics, ordering,
cancellation, or fallback semantics. Treat every candidate as a hypothesis to falsify, not an
implementation commitment. Retain code only after two independent packed complete-route replays
show a material win with no higher-priority regression and the relevant behavior/resource mutation
fails its owning verifier. Record rejected mechanisms and their reopening condition in
`bench/PERFORMANCE.md`; remove experimental code and generated evidence.

Rank primary paths as Node and Bun co-primary, Chromium second, and Deno third. Rank a fallback by
the runtimes whose normal dispatch reaches it; native-shadowed runtimes prove portability but do not
steer its trade-offs. A contract-changing candidate is closed by identifying that boundary unless
the maintainer separately changes the HLD.

## Work

### Highest decision value

- [ ] Replace per-schema `decodeMaskedCandidates` slices with one private working block restored
  from four scalar ciphertext words. Prove caller input, callback isolation, schema order, first
  match, all distinct candidates, and error causes are unchanged; measure 0/1/4/8/16 schemas across
  first, middle, last, miss, and all-candidate routes. Reject unless allocations become O(1) and two
  complete-route replays show no priority-runtime regression.
- [ ] Test direct canonical UUID-string to base64url fallback encoding without an intermediate byte
  array. Preserve exact validation order and diagnostic offsets; compare against native encoding
  and the composed parser/encoder on every runtime. Reject unless repeated complete-route gains pay
  for the duplicated fixed-shape logic.
- [ ] Test direct canonical UUID-string to base32hex encoding without an intermediate byte array.
  Preserve exact validation order and diagnostic offsets; compare against the composed
  parser/encoder on every runtime. Reject unless repeated complete-route gains pay for the
  duplicated fixed-shape logic.

### Conditional implementation candidates

- [ ] Test a construction-time byte-sentinel index against the current 16-byte linear comparison.
  Vary 0/1/4/16/64 sentinels and first/middle/last/miss byte inputs; include construction, memory,
  string encoding, and collision checks. Retain only if repeated byte-call savings repay the index
  without slowing ordinary codecs or duplicating sentinel identity.
- [ ] Test direct canonical base64url slug-to-UUID formatting without an intermediate byte array.
  Preserve canonical-tail rejection and exact invalid-character offsets; reject if native
  hexadecimal formatting or code duplication dominates the public route.
- [ ] Test direct canonical base32hex slug-to-UUID formatting without an intermediate byte array.
  Preserve canonical-tail rejection and exact invalid-character offsets; reject if native
  hexadecimal formatting or code duplication dominates the public route.
- [ ] Test scalar scratch only in final KDF round-key expansion, isolated from the previously
  rejected polymorphic hot hash paths. Measure construction across seed forms and iteration
  boundaries; reject unless allocation and complete construction both improve repeatedly.
- [ ] Test streaming UTF-8 packing for cooperative string seeds with `TextEncoder.encodeInto` where
  available and the current encoder as fallback. Vary ASCII, multibyte, surrogate boundaries, and
  geometric seed sizes; retain only if peak memory and elapsed work improve without extra ordinary
  seed cost or changed derived keys.
- [ ] Test streaming byte-seed hashing that avoids the full packed-word allocation while preserving
  the frozen HalfSipHash byte stream. Compare synchronous and cooperative construction over
  geometric seed sizes; reject unless large-input resource savings justify the additional state
  machine and ordinary seeds remain unaffected.
- [ ] Test a standalone specialized UUID validator rather than sharing parser control flow. Compare
  valid values and invalid character/hyphen/version/variant positions under mixed workloads; reject
  unless both primary runtimes improve repeatedly without a second validation truth source.
- [ ] Isolate Node's unresolved mixed-workload parser slowdown by varying only preceding operation
  families and order. A product change requires a repeatable public workload mechanism, not a
  benchmark-order artifact; close the task if no code-shape candidate predicts and removes it.
- [ ] Test a subarray-free offset byte-to-UUID formatter against native and portable formatting.
  Vary exact, offset, oversized, and caller-supplied buffers; reject unless removing the view yields
  a repeated complete-route win without duplicating the formatter.

### Workload-gated candidates

- [ ] Measure candidate deduplication growth before replacing `Array.includes` with a `Set`. Vary
  schemas that yield 0/1/many duplicate and distinct UUIDs; proceed only if realistic candidate
  counts make quadratic comparison material after charging the set allocation.
- [ ] Measure fresh package import repeatedly before changing module topology. Separate parsing,
  adapter probing, initialization, and filesystem cache state; alter exports only if startup is a
  demonstrated consumer bottleneck and the public synchronous API remains intact.
- [ ] Measure repeated-decode locality before designing a bounded decode cache. Proceed only with a
  real reuse distribution, explicit capacity and invalidation, and total memory/latency benefit;
  unbounded storage and hidden mutable codec behavior remain forbidden.
- [ ] Measure large cooperative string-seed peak memory before replacing chunk arrays with a bounded
  reusable encoding buffer. Proceed only when retained/gross allocation evidence shows the chunks,
  rather than packed words or hashing, dominate.
- [ ] Measure invalid-input frequency and `UuidSlugError` construction attribution before exploring
  cheaper error creation. Preserve `Error` identity, stack, cause, code, and diagnostics; no change
  is allowed if the proposed saving weakens an observable error contract.

### Contract-boundary falsification

- [ ] Falsify deferred byte-seed copying against the async constructor's call-time snapshot
  contract. Close without implementation if caller mutation can change derived keys; otherwise
  measure the lawful design's call-time blocking and total allocation.
- [ ] Falsify transferring the caller's byte-seed buffer against caller ownership. Test only a
  design that leaves caller storage usable and preserves synchronous capture; close if transfer
  detaches observable storage or an extra copy merely moves the same work.
- [ ] Falsify worker-owned byte-seed snapshots against cross-runtime availability and end-to-end
  cost. Charge worker startup, messaging, transfer, cancellation, and fallback; close if preserving
  synchronous capture leaves the original main-thread copy in place.
- [ ] Falsify fused validation and direct writes into caller-owned output against atomic failure.
  Retain staging unless a single-pass design can prove no caller byte changes for every late invalid
  character, noncanonical tail, range failure, and runtime exception.
- [ ] Falsify a second native-capability cache against the existing module-load probes and injected
  native-failure seam. Close unless attribution shows the one property dispatch is material and a
  cache preserves production fallback tests without duplicate state.
- [ ] Falsify automatic previous-key reordering against caller-ordered first-match semantics. Do not
  implement unless all observable ambiguous matches remain identical; otherwise record that the
  proposed speedup changes the contract.
- [ ] Falsify parallel previous-key attempts against ordered completion and sub-microsecond task
  costs. Charge scheduling, coordination, cancellation, and every earlier unresolved key; close if
  the earliest lawful return cannot beat sequential traversal.
- [ ] Falsify adding a wire key selector against existing identifier compatibility and information
  exposure. Treat it as an HLD change, not an optimization, unless a backward-compatible spelling
  preserves every issued identifier and the maintainer explicitly approves the new observable.
- [ ] Falsify worker offload for ordinary synchronous operations against transfer, scheduling, and
  synchronous API costs. Close if end-to-end latency exceeds direct execution or if preserving the
  call shape requires blocking coordination.
- [ ] Recheck HalfSipHash round unrolling only after a retained upstream layout or engine change
  invalidates its two-replay rejection; otherwise close from existing evidence without rerunning it.
- [ ] Recheck scalar HalfSipHash message protocols only after a retained upstream call-shape or
  engine change invalidates their two-replay rejection; keep the general call monomorphic.
- [ ] Recheck alternate ordinary-array Feistel scratch only after an engine change invalidates its
  two-replay rejection; do not substitute a new array shape without complete-route evidence.
- [ ] Recheck `DataView` Feistel word access only after engines can eliminate its view cost or one
  safely reusable view can serve varying caller buffers; otherwise retain shift-based helpers.
- [ ] Recheck private direct built-in mask dispatch only after attribution predicts a material
  callback-dispatch win that repays the extra registry and constructor.
- [ ] Recheck codec-closure Feistel scratch only if transforms stop being synchronous and
  callback-free or an engine demonstrates a repeated closure-locality gain.
- [ ] Recheck fixed four-round Feistel unrolling only after a primary engine stops optimizing the
  constant trip count; reject any secondary-only gain that does not repay duplicated cipher code.
- [ ] Recheck separate mask and unmask Feistel loops only after direction selection becomes an
  attributed bottleneck; preserve one reversible wire-format implementation otherwise.
- [ ] Recheck construction-time scalar key capture only after typed-array indexing becomes an
  attributed primary-runtime bottleneck; charge its branches and packed-code growth.
- [ ] Recheck fixed-offset big-endian read/write inlining only after generated code shows the shared
  helpers are no longer inlined or specialized by a primary engine.

### Closure

- [ ] Pair every roadmap candidate with its source mechanism, consumer route, contract boundary,
  discriminating experiment, and explicit stop rule; delete duplicates or entries that cannot turn
  a decision.
- [ ] Run affected Node, Bun 1.4.2, Deno, and Chromium behavior/resource lanes for every retained
  change, including a deliberate mutation that proves each new verifier reaches its intended defect.
- [ ] Run two independent packed comparisons for every retained candidate, then the complete profile
  corpus and `bun run check`; verify packaged TypeScript and Rust APIs are unchanged.
- [ ] Move durable conclusions to `bench/PERFORMANCE.md`, remove generated evidence and completed
  roadmap tasks, and leave the worktree clean.
