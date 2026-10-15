# Performance work

Apply `../AGENTS.md` §Work scope before starting experiments; keep required regression checks.
Read `README.md` for commands, `methods.md` for experiment and measurement mechanics,
and `decisions.md` for measured conclusions.

## Choose the decision

- Optimize ordinary successful calls in `../README.md`: single-ID generation, parsing and conversion.
  Failures and batch writes are not optimization targets; never slow single calls for batches.
- Rank primary calls together by fastest qualified rivals, native floors, speed gaps and resource
  evidence. Missing comparisons stay missing; a convenient candidate cannot replace this ranking.
  Choose the largest unresolved primary-runtime cost first and inspect faster implementations before
  accepting a local optimum. Name the violated contract when rejecting a rival; record drift separately.
- Before execution, record the call, removable cost, competing explanations, rejection result and
  next production decision. Keep one candidate active until retained, rejected or explicitly blocked.
  Follow the current authorized execution sequence, never older unchecked proposals.
  Infrastructure and rejected experiments do not close production work.
- Locate the complete-call bottleneck before optimizing a component. Reprofile when it moves;
  dispatch, formatting and allocation can erase a component gain.
- Screen one candidate through the complete call; retain it only after independent packed replays
  and resource evidence. Stop once evidence decides; diagnose conflicting instruments before replay,
  because more samples cannot repair comparisons of different work.
- Qualify rivals by correct wire output, secure randomness and proper native guarantees.
  Counter widths, zero-start counters and random-bit allocation are differences, not disqualifiers.
  Keep weaker rows timed and inspect faster mechanisms that could preserve the requested result.
  Judge other differences by measured consumer harm; materially weaker results cannot win equivalent-result rankings.
- Repeat decision-relevant workloads in independent processes. Keep only reproducible gains whose
  uncertainty rules out an unchanged result, without material loss on speed or resources.
  Statistically detectable but negligible effects do not earn code; unresolved results stay unresolved.
  Close primary-call speed and resource gaps together; throughput alone does not close a task.

## Runtime choices

- Use latest stable runtimes. Rank Node Current and Bun first, Node LTS and Chromium second,
  Deno third, Node Current JITless last.
  Older supported Node versions gate compatibility, not trade-offs. A JITless-only gain needs unchanged
  higher-ranked calls and enough value to justify its lifetime cost.
- Give each call family a native-floor row. Defaults, including case/alphabet presets, must approach
  equivalent native floors and qualified rivals; configured calls add only work those floors lack.
  Keep gaps open until closed, negligible or explained as unavoidable in `decisions.md`.
- Test the focused mechanism before the full runtime matrix; run every applicable runtime before retention.
- Choose separately by runtime and output: native, patched-native, pooled entropy or portable work.
  Count wrapper, conversion, startup and resource costs; minimize faster native delegation first.
  Native base64url does not require native base32. Preserve the best unsupported-output writer and
  fix shared integration regressions rather than discard a faster capability.
- Default guarantees follow proper native behavior. Compare all encoded fields and sustained-burst
  timestamps; intra-millisecond ordering is not a default requirement. Extra guarantees need configuration.
- Measure each portable encoder and fallback on Node, Bun, Deno and Chromium. Rank runtimes actually
  using it first; native-shadowed runtimes verify portability but cannot steer fallback trade-offs.
- After Bun/Deno updates and before periodic reviews, follow §Capability review below.
  Check native, Node-compatible and web APIs; prove selected and fallback semantics, not just presence.
  Within authorized performance work, recheck the full matrix for release candidates and changed
  runtimes or rivals. Inspect changed calls and implementations; new versions inherit no old verdict.
  Update the shared cases when capabilities change; run smoke before the full matrix.

## Capability review

1. Read the installed runtime's types and docs, its release notes since the last reviewed version,
   and current upstream API docs. Search three sets separately: runtime-native APIs, Node-compatible
   APIs, and web or Chromium-compatible APIs. Include additions, changed behavior, deprecations, and
   removals relevant to package routes or benchmark evidence. Node and Chromium inventories are
   candidate sources for Bun and Deno, not proof of support.
2. Probe each candidate on every installed runtime and record the exact runtime version. Check the
   callable shape, output, ownership, errors, limits, and sync or async behavior needed by this
   package. A property check alone is insufficient; equal names can hide different semantics.
3. Detect capability first and probe once at module load. Use runtime identity only when repeated
   public-route measurements show that equal semantics need different implementations. Treat a
   missing or unsuitable method as unavailable; never use repeated exception-driven fallback.
4. Run the selected path and compatible fallback through the same public-route corpus. Prove wire
   results, errors, ownership, and resource behavior before comparing speed. Run decision-relevant
   measurements twice and apply the runtime priority ladder above.
5. Keep only decision-changing conclusions in `bench/decisions.md`: observed versions and
   behavior, selected path, rejected live alternatives, evidence limits, and the condition that
   requires review again. Generated capability inventories and reports stay under `bench/reports/`.

## Drivers and evidence

- Extend the nearest driver in `bench/` or `scripts/`; read exports and callers first. Split only
  for a different oracle, runtime, isolation or feedback boundary, never because a filename matches.
  Isolate source substitutions from the shared working tree. Keep benchmark dependencies dev-only.
- Keep drivers in the repository, raw output in `reports/` and conclusions in `decisions.md`.
  Extract executable baselines outside the repository; Git ignores do not exclude compiler or tests.
  Source captures must be text or archives, never executable `.ts` files. Never bypass artifact checks
  or suppress source-capture compiler errors.
  `bench/reports/` is git-ignored and exists only on the machine that ran it, so a report path is
  NOT evidence for anyone else. A durable claim states its own evidence: the deciding numbers,
  runtime versions and measurement date.
- Scope cleanup before setup. Preserve real failure evidence and its reproduction command until
  diagnosis; expected rejection fixtures archive inside their cleanup scope. Remove successful
  bundles, resolved failures and temporary checkouts. Before committing, inspect creator-owned paths
  in `/tmp` and runtime `tmpdir()`, stop children, and preserve reusable caches.
- Keep package captures immutable and share identical content by hash. Preserve earlier graphs
  before replacing captures; replace linked files, never rewrite them. Read `methods.md` before pruning;
  `scripts/compact-reports.ts` preserves bytes.
- Use package commands for Node/Bun tests, API checks and generation comparisons so supervisors
  own interruption cleanup. Include setup in cleanup; generated verification files must not remain.
- Capture compiler diagnostics verbatim through the retained profiler. `bench/compare.ts` needs
  JSON-only host output; prove the requested compiler artifact works before interpreting a missing trace.
- Keep the same candidates in smoke and full runs. Smoke checks wiring, not rankings.
  Use smoke matrices in CI; run full benchmark matrices manually.
  Failed processes, malformed records and empty requested lanes must fail the matrix.

## Measurements

- Follow `methods.md` §Measurement limits. Identify independent samples; batch throughput is not
  individual-call latency. Account for unequal batch weighting before comparing wall and CPU costs.
  Read driver verdicts; require the selected statistic in every analyzed record and fail on missing fields.
  Keep direct runtime operations separate from composed pipeline outcomes.
- Filter exploratory work narrowly; use exact `=case` names for bounded profiling repairs.
  Read each driver's runtime selector and the version recorded in each result. Comparison and
  profiling variables differ. Drain timing processes to terminal exit before starting another.
- Time the code each overload requires. Unwrap only calls returning errors as values; defaults
  return IDs directly. Keep output and failure witnesses outside timed work.
  Parallelize preparation, not timing; reuse builds and observations while their inputs are unchanged.
  Consume every timed result so the engine cannot discard the measured work.
- Check exact output and private byte ownership before timing. Native floors include required
  normalization, padding rejection and formatting; report absent capabilities, never time substitutes as native.
  Allocated generation must return fresh plain arrays with separate backing storage.
  Keep Buffer-only rows timed with ownership rejections;
  views over pooled Buffer storage cannot win owned-array comparisons.
- For cold imports, isolate both graphs from driver imports and resolve both paths before timing.
  An already-loaded graph measures the module cache, not startup; exclude it from the comparison.
- Capture workload memory before retaining CPU samples. Sample records are harness memory,
  not package state; record each pass's call count. Counters do not measure total allocation.

## Regression protection

- Before timing, map contracts and failure modes, add the smallest missing falsifiers, and mutate
  the mechanism to prove detection. Run owning runtime tests before and after measurement.
- Preserve protected calls and independent references; slowing both sides cannot hide a loss.
  Count avoidable work separately from timing. Diagnose and repair a failing gate.
  Derive budgets from normal variation and necessary work. Never pass by dropping calls or runtimes,
  slowing baselines or loosening budgets; changed scope or acceptable loss needs explicit authorization.
- Prove harness changes with an unchanged control and a valid-output waste mutation that fails for
  the intended diagnostic. Broken IDs prove correctness coverage, not performance/resource protection.
- Follow `methods.md` §Regression protection for complete lanes and hooks, including cleanup.
  Benchmarks are exempt from routine-lane limits; calibration must not block evidenced primary-call repairs.
