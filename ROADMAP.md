# Native parity

Complete the remaining performance work without changing identifier formats, secure entropy,
caller-input validation or ownership. Default hot paths provide no guarantees beyond proper native
implementations; stronger guarantees require explicit configuration. Do not add code solely
to erase a negligible remaining gap. Optimize defaults under `docs/public-api.md` §Generation
and codecs; measure clock drift without imposing an unrequested
never-ahead promise. Keep remote writes unauthorized. Repair agent guidance before implementation;
propose public-document changes and hold them for explicit approval, including generated reports.

## Next production decision

Deliver retained improvements to ordinary single-ID calls; a rejected experiment does not close a performance gap.

Optimize only primary consumer use cases. Profile every actual hotspot and performance or resource
gap against the main qualified rivals for those calls, then fix the gaps. Other scenarios are
excluded from optimization during this effort; existing correctness contracts remain protected.
Defaults need no stronger generation guarantees than correctly implemented primary qualified
rivals provide. Establish each rival's actual guarantees; put additional guarantees on optional
configured paths. Audit a default restriction before treating it as grounds to reject a mechanism.

Execute only this sequence; older unchecked proposals below are held, not dispatch instructions.

- [ ] Protect retained primary-call improvements before selecting another production candidate.
      Audit `bench/check.ts`, `bench/resources.ts` and `bench/latency.ts` against the optimized
      generation, conversion, paired, masking and parsed-value calls. Add missing normal-call
      resource budgets and native-selection witnesses to the existing owner; prove the guards
      reject restored redundant work in isolated subprocesses. Compare complete-call timing with
      independent native or qualified-library references, measure normal variation before choosing
      a budget, and prove a material slowdown fails it. Keep timing and instrumented counts separate;
      neither establishes total allocation or protects an unmeasured runtime.
  - [x] Make packed revision comparisons reject resolved primary-call slowdowns.
        Reuse `bench/compare.ts` with a named committed baseline and exact successful-call filters;
        changing two related package operations must not change the reference. Keep fresh processes
        as the observation unit and adjust uncertainty for the whole selected comparison set.
        Reject missing, non-finite or insufficient observations instead of treating them as parity.
        A same-revision control must pass, and an isolated result-preserving slowdown must fail.
        Retain failed artifacts and raw records. This gate measures warmed complete-call throughput;
        resource counts remain separate and individual-call tail latency remains unverified.
        `current-primary-timing-ranked-control.jsonl` passes the selected primary calls on Node
        Current, Bun, Deno and Chromium. Short single-batch measurements hide redundant work
        under process variation; do not reuse those settings as regression proof.
        The established longer preparation and multi-batch settings pass the unchanged Node/Bun
        control and reject redundant secure generation on both selected implementations in
        `current-primary-timing-prepared-control.jsonl` and `current-primary-timing-selected-defect.jsonl`.
  - [x] Run the packed timing guard automatically when production inputs change.
        `bench/check.ts` must compare an uncommitted production change with HEAD, or a committed
        production change with its parent, using exact primary-call filters on Node and Bun.
        Documentation-only checks must not pay for rebuilding and timing an unchanged package.
        CI checkouts must contain the committed baseline; prove that shallow history cannot
        silently skip a production comparison and request parent history in each gate-owning lane.
        Keep independent process counts and uncertainty unchanged when reducing acquisition work.
        `current-primary-timing-compact-full-control.jsonl` passes every selected primary call on
        Node Current and Bun; `current-primary-timing-compact-defect.jsonl` rejects result-preserving
        redundant secure generation on both. The routing fixture rejects missing parent history
        and distinguishes pending source, committed source and documentation-only changes.
        Keep additional-runtime comparisons explicit until their routine execution is verified.
  - [x] Verify and route primary timing protection on Deno and Chromium through the existing CI workflow.
        Reuse the primary call inventory and packed comparison; unchanged complete calls must pass
        and result-preserving redundant generation and slug validation must fail on both runtimes.
        Do not duplicate Node/Bun acquisition or run the same TypeScript timing lane for both Rust
        build profiles. Keep resource coverage separate and declare branches this timing cannot prove.
        Give timing its own job so acquisition does not consume the combined WASM test budget;
        detect production changes before installing engines or rebuilding packages.
        `current-primary-timing-web-deno-control.jsonl` passes every selected complete call;
        the matching generation and guard defect reports reject redundant work on both runtimes.
        This proves local packed execution and the gate's rejection behavior, not a remote CI run
        or browser/Deno resource-counter coverage.
  - [x] Extend deterministic primary-call resource protection and prove its rejection paths.
        Native UUIDv4 text must skip revalidation and extra draws; ordinary owned UUIDv4/UUIDv7
        bytes need no temporary arrays; Bun plain base64url must reach native encoding; base32
        must keep its direct writer. Parsed values must avoid redundant WeakMap writes, and masked
        text must keep its allocation-free scratch path in both alphabets. The shared benchmark
        test runs unchanged and result-preserving defective entries in isolated Node and Bun
        processes. Require the intended diagnostic, not merely a nonzero exit; retain failed bundles.
  - [x] Extend the existing primary resource counter and defect fixtures to Deno.
        The selected Deno gate must pass unchanged calls and reject extra owned arrays, duplicate
        paired generation, WeakMap state, masked text temporaries and native UUIDv4 revalidation.
        Reuse the same budgets and specific failure diagnostics; print the executing runtime.
        The focused resource test and `perf:check` Deno selection pass locally; remote CI is unverified.
  - [x] Run the same primary resource oracles on Chromium.
        Compile one shared counter and defect fixture against the built package, then run each
        case in a fresh browser using real Web Crypto. The unchanged counter passes and all
        shared redundant-work defects fail with their intended diagnostics. Apply the zero-read
        UUIDv4 text budget to native and portable writers; native-only checks cannot protect both.
        `perf:check` selects this lane with Chromium. Browser completion must await the module
        and preserve its assertion; navigation alone does not prove asynchronous execution.
        This coverage is Chromium only. WebKit's unchanged paired string-count assertion fails;
        this primary-runtime task does not establish WebKit resource coverage.
  - [ ] Run the Deno/Chromium resource proof in CI when its counter, fixtures or browser driver change.
        Production-only change detection can skip a broken guard while product code is unchanged.
        Keep production timing selection separate so a counter-only edit does not replay identical
        package timing. Prove changed guard inputs select the job and documentation-only edits do not.
  - [x] Resolve the unchanged Bun slug-guard timing failure before committing new guards.
        The retained failing bundle reports a ratio above its unchanged budget, while an isolated
        replay of those same bytes passes. A fixed short call-count warm-up may leave engine
        compilation inside the samples. Change warm-up alone to match the competitor matrix's
        timed preparation, retain every ratio and the existing limits, then repeat fresh processes.
        Reject the correction if normal calls still fail or the deliberate slowdown stops failing.
        `current-primary-gate-warmup/` retains every ratio from fresh Node and Bun processes.
        All selected calls pass their unchanged limits; the benchmark regression suite still
        rejects deliberately repeated parsing. This does not prove the cause of the earlier
        failure or add independent timing protection for primary generation and conversion.
  - [x] Replace the unreliable slug-guard/decoder ratio with a committed slug-guard reference.
        The retained commit-hook bundle fails the slug ratio while its isolated replay passes.
        Paired CPU captures also cross the limit on the caller thread; selecting that metric does
        not repair the guard. Compare the same successful slug guard against committed code in
        the primary timing inventory. Require unchanged Node/Bun controls and a result-preserving
        repeated-validation mutation; remove the unrelated-operation ratio only after that proof.
        `current-primary-slug-guard-control.jsonl` passes the unchanged complete guard on both
        runtimes; `current-primary-slug-guard-defect.jsonl` rejects repeated validation on both.

- [x] Remove the `fastv7` qualification exclusion for counter width and random-bit allocation.
      Its installed implementation uses Web Crypto and writes UUIDv7 version/variant bits.
      The matrix and its regression test qualify it under the native baseline; the refreshed
      `current-native-baseline-v7-qualified-ranking.jsonl` includes it in primary text comparisons.
- [x] Resolve primary UUIDv7 text rankings with `fastv7` included before reusing old rankings.
      The refreshed run has severalfold process variation in unchanged calls; it establishes
      competitor membership, not a reliable performance winner.
      `current-native-baseline-v7-ranking-repeat.jsonl` separates the package from every tested
      qualified library on Node Current/LTS, Bun, Deno and Chromium across fresh processes.
      Bun's small direct-native text difference is acceptable; retain delegation without further tuning.
      This throughput comparison does not establish resource parity or individual-call latency.

- [x] Map primary README consumer calls to current production code and maintained rival rows:
      generate one identifier, parse or convert one identifier, and encode or decode one masked
      UUIDv7. Include paired or value calls only where they serve the same ordinary consumer job.
      UUIDv4 generation uses `src/v4.ts` and `src/v4-slug.ts`; UUIDv7 generation uses
      `src/v7-keyless.ts` and `src/v7-slug.ts`. Compare their text, owned-byte and slug calls with
      the matching `v4.*` and `v7.*` groups in `bench/generation-cases.ts`; compare paired output
      with its maintained composed call, which consumes both results.
      Text/byte/plain-slug conversion uses `src/uuid.ts` and `src/slug.ts`; its maintained rival
      rows live in `bench/conversion-cases.ts`. Immutable parsing uses `src/uuid-value.ts` and
      `value.parse.uuid`, `value.parse.slug`, `value.parse.bytes` in `bench/profile-cases.ts`.
      Masked generation and conversion use `src/masking-codec.ts`; profile `masked.generate`,
      `masked.encode`, `masked.encode.bytes`, `masked.decode`, `masked.decode.bytes` and their
      base32 counterparts in the same profiler. These are package measurements, not evidence of
      rival parity; comparable rival evidence and resource conclusions remain open.
- [ ] Compare each primary call with its main qualified rivals and same-output native floor.
      Reuse applicable evidence; refresh stale comparisons after retained changes. Record speed
      and resource gaps separately, and rank unresolved gaps before selecting implementation work.
  - [x] Compare UUIDv7 text-plus-plain-slug generation with qualified rival compositions.
        Do not infer rival parity from package-only pair rows. Use the existing conversion corpus
        with one generator call followed by native encoding and UUID text formatting where needed;
        the existing pair witness must reject different identities before timing. Include text
        and owned-byte generators with Buffer and typed-array encoders when available. A repeated
        material rival lead selects production profiling; parity closes this comparison without
        another implementation. Measure only paired results on the ranked runtimes.
        `current-primary-v7-pair-ranking.jsonl` favors the actual package pair over every tested
        qualified library composition on every ranked runtime across fresh processes. Before
        closing the resource comparison, capture equal completed and warm-up calls on Bun against
        its fastest library composition in reversed order. A repeated caller-CPU or continuing
        committed-memory loss selects profiling; retained heap cannot establish gross allocation.
        `current-primary-v7-pair-resource-{0,1,2,3}` records lower package caller CPU in both
        reversed pairs and flat second-window committed memory for both implementations. Keep
        production unchanged; these warmed comparisons establish neither total allocation nor
        cold-start parity, and select no material gap for another paired-generation experiment.
  - [x] Inspect engine CPU and sampled-allocation profiles for primary UUID text/byte conversion
        against `uuid`. Repeated unsampled caller CPU favors the package, but retained heap can
        hide temporary allocation. Reuse the existing native profiler with only those four complete
        calls. Attribute samples to implementation frames and keep setup, harness and unattributed
        work separate. A package-specific allocation hotspot selects a focused removal candidate;
        absent attribution or no material disadvantage does not justify more production code.
        `current-primary-conversion-native-allocation` reaches all four selected calls on Node,
        Bun, Deno and Chromium. V8 heap samples attribute allocations to package UUID parsing
        and rival parsing/stringification; harness and unattributed allocations remain separate.
        Unequal completed-call counts and uncaptured browser warm-up counts prevent raw sampled
        totals from establishing a relative allocation disadvantage. Repeated unsampled caller
        CPU favors the package. These profiles select no production rewrite and do not prove
        allocation parity; reopen only with evidence of a material primary-call resource gap.
  - [x] Compare Bun default UUIDv7 slug resource cost with `uuidv7` plus native typed-array
        encoding, the fastest qualified library in the refreshed ranking. Use equal completed
        and warm-up calls in reversed process order. Repeated higher package caller CPU or
        continuing committed-memory growth selects profiling; retained heap alone cannot prove
        allocation volume. Preserve production if no material resource loss reproduces.
        `current-primary-v7-slug-resource-{0,1,2,3}` records lower package caller CPU in
        both process orders and flat second-window committed memory for both implementations.
        First-window commitment varies; retained heap does not establish gross allocation.
        Preserve direct native slug generation; these observations do not select a rewrite.
  - [x] Compare Chromium UUIDv7 slug generation with browser-capable rivals composed with native
        base64url encoding. Pass generators into the existing conversion corpus and add native
        typed-array compositions outside its Buffer branch. Validate complete outputs before
        timing. A repeated material rival advantage selects production profiling; parity or a
        negligible gap preserves the current writer. Host rankings cannot settle browser costs.
        `current-primary-v7-slug-typedarray-ranking.jsonl` contains fresh-process comparisons
        with native typed-array compositions, including `fastv7`. The default package call is
        faster than the tested qualified rivals on Chromium and every measured host. Preserve
        production; this warmed throughput result does not establish allocation parity.
  - [x] Expose primary text/byte conversion corpus rows through the existing runtime profiler.
        Preserve owned slug-decoder rows and corpus witnesses; measure the package and `uuid`
        together across Node Current, Bun, Deno and Chromium before claiming resource parity.
        `current-primary-conversion-runtime-resource-comparison` contains the selected rows
        on every runtime. Caller CPU favors the package on Node Current, Bun and Deno;
        sampled and retained heap observations do not establish total allocation parity.
  - [x] Refresh ordinary owned UUIDv7 bytes and primary conversion throughput comparisons.
        `current-primary-v7-owned-ranking-repeat.jsonl` does not reproduce the old Deno loss.
        `current-primary-conversion-ranking.jsonl` shows Deno's faster Buffer slug decoder uses
        shared backing storage; a plain view exposes that storage rather than owning it privately.
        `current-deno-native-owned-decode-screen.jsonl` verifies native decoding into a dedicated
        allocation but measures it slower than the package conversion. This mechanism screen
        does not justify replacing production or establish resource parity.
  - [x] Compare Bun's ordinary owned UUIDv7 bytes with the fastest qualified library's resources.
        The retained ranking favors package throughput over `uuidv7` and `uuid`; it does not
        prove lower resource cost. Use the existing generation-case memory profiler with the
        same completed and warm-up call counts in reversed process order. A repeated caller-CPU
        or continuing memory-growth loss changes priority; retained heap alone cannot establish
        total allocation parity. Keep each case's actual name, calls and runtime in its evidence.
        The profiler's heap record lacks runtime identity; include its executing Bun version and
        executable before retaining comparison evidence. Repeat the same captures with that metadata.
        `current-primary-v7-owned-rival-metadata-{0,1,2,3}` records lower package caller CPU
        in both reversed pairs and flat second-window committed memory for both implementations.
        Package retained-heap growth is slightly larger. Compare one completed call after the
        same warm-up to distinguish observation overhead from retained per-call work before
        attributing that difference to the generator; this control cannot prove total allocation.
        `current-primary-v7-owned-rival-control-{0,1}` retains at least as much heap after one
        completed call as the million-call captures; every capture adds the same generic-object
        count. Do not attribute that retained-heap difference to per-call generation allocation.
        No CPU or continuing committed-memory loss reproduces in this warmed comparison;
        preserve the current writer. Total allocation and cold-start comparisons remain open.
  - [x] Compare Bun's ordinary owned UUIDv4 bytes with Web Crypto and `uuid` resources.
        The retained throughput ranking puts the native floor near the package and `uuid`
        behind it. Use equal completed and warm-up call counts with reversed process order;
        compare each complete secure draw and plain-owned result. A repeated CPU or continuing
        committed-memory loss selects the next implementation target. Do not use retained heap
        as total allocation evidence or optimize caller buffers from this single-ID comparison.
        `current-primary-v4-owned-rivals-{0,1,2,3,4,5}` records near-equal caller CPU to
        Web Crypto and lower caller CPU than `uuid` in both orders. Every second window keeps
        committed memory flat. First-window process CPU changes direction against Web Crypto;
        no repeated material resource loss selects a rewrite. Preserve the ordinary owned path.
  - [x] Remove redundant error unwrapping from argument-free generation comparisons.
        Public default overloads return identifiers directly and throw their ruled entropy
        failure; configured and conversion overloads retain error values. The shared corpus
        adds `unwrap` to several defaults, so it measures extra caller work rivals do not need.
        Remove it only from no-error-return calls, retain configured and conversion handling,
        and refresh the affected ordinary text, owned-byte and paired-output comparisons.
        Existing corpus validation must still reject invalid output before timing. Recheck
        qualified rival and native-floor ordering before choosing another production change.
        `current-default-caller-generation-ranking.jsonl` retains three fresh-process medians
        for the corrected default calls. Bun UUIDv4 text loses to `crypto-randomuuid` in every
        process; Deno owned UUIDv7 bytes loses to `uuidv7` in every process. Bun UUIDv7 text
        also trails its native floor. These supersede the corresponding older ordering below.
  - [x] Assess Bun UUIDv4 text's repeated qualified-rival loss. Profile the corrected
        complete caller against `crypto-randomuuid` and Web Crypto with equal work; inspect
        native selection, direct delegation and case handling before changing production code.
        Preserve configured behavior and fallback; reject a candidate without repeated
        complete-call improvement. Then address Deno owned UUIDv7 bytes and the native-floor
        gaps already listed here. Do not reopen rejected base64 wrapper shapes unchanged.
        `current-default-v4-text-profile-{0,1,2,3,4,5}` repeats higher package caller CPU
        than `crypto-randomuuid` in both orders, while Web Crypto costs more caller CPU than
        the package. Both package and library use Node-compatible native generation; isolate
        surrounding dispatch rather than replacing entropy or optimizing the portable writer.
        `candidates-v4-kg6thC` rejects returning trusted native success inside its `try` block:
        Node and Bun correctness and resource witnesses pass, but Bun text is slower in both
        reversed orders. Preserve production and do not replay that unchanged candidate.
        `candidates-v4-uULJyw` leaves an inline lowercase-only entry unresolved and does not
        justify retention. `candidates-v4-da6Omz` separates the cold preset body; the packed
        comparison in `current-v4-cold-preset-packed.jsonl` improves Bun lowercase but slows
        Node Current lowercase and uppercase on both hosts, with intervals excluding parity.
        Reject the shared implementation and remove its experiment definition. The raw source
        and proofs remain in the reports. A later candidate must select independently for native
        defaults, uppercase and portable runtimes; do not repeat the shared helper arrangement.
        The negligible-difference ruling ends tuning solely to erase a small wrapper gap;
        `current-primary-v4-outcome-ranking.jsonl` does not justify another rewrite.
  - [x] Isolate UUIDv4 preset-check call overhead with the existing `literal-guards` candidate.
        The native function is already shared with the faster Bun rival. Replace only the
        successful preset predicate call with its identical two comparisons; preserve normalization,
        native trust and failures. Reject without repeated complete-call gains on Bun and Node
        Current; the native kernel and configured entropy paths are not this experiment's target.
        `candidates-v4-CVrsro` is slower on Bun in both orders. Keep the existing predicate;
        another spelling of its checks does not close the native-call wrapper gap.
  - [x] Remove native-result validation and function-identity trust tracking from default UUIDv4
        and UUIDv7 calls after reconciling their documentation. Trust proper native results;
        preserve caller-input validation, secure randomness, output spelling and native-exception
        fallback. Extra guarantees belong only on explicit configurable paths. This ruling is
        settled and must not be raised for approval again. Shared Node and Bun probes require
        direct native output for text and slugs; reinstating UUIDv4 result validation fails its
        focused regression. The complete check and emitted declaration help verify the change.
  - [ ] Verify direct native delegation in Node and Bun, then compare complete primary calls
        with the same-output native implementations and qualified rivals. Record repeated speed
        and resource evidence; removing unnecessary guarantees alone does not prove a speed gain.
        `current-direct-native-baseline-packed.jsonl` and
        `current-direct-native-other-runtime-packed.jsonl` repeat complete calls on Node Current,
        Bun, Deno, Chromium, Firefox, WebKit and Node Current without JIT. Every timing difference
        is unresolved; native and rival parity remain open. Keep direct delegation as the ruled
        baseline, not as a claimed speedup. Default wrapper work remains the next primary target.
  - [x] Screen direct native success return against the baseline without identity tracking.
        Keep preset checks and exception fallback; reject repeated primary-call losses. The
        earlier trusted-function experiment cannot settle this changed success/error boundary.
        `candidates-v4-KB0Fjw` has large variation in unchanged portable controls and native calls;
        the focused repeat steadies Bun controls but leaves only a small lowercase gain and no
        uppercase gain. Node with JIT selects the unchanged portable writer; its run cannot
        judge this native branch. Direct profiling without JIT gives no repeated improvement.
        Keep production unchanged; this candidate does not close the qualified-rival gap.
  - [x] Preserve native UUIDv7 text delegation when its remaining wrapper difference is negligible.
        The refreshed comparison shows a small native-floor difference and no qualified-library
        loss. Do not add another native-only wrapper solely to remove that difference.
  - [x] Test UUIDv7 default text's successful-string recognition against its native floor.
        The native helper already returns a string on success; the public preset path then
        performs an Error-instance check. Compare a string-first result branch without changing
        preset validation, fallback, configured calls or the declared entropy throw. Reject
        without repeated complete-call gains on the primary runtimes; do not change failure speed.
        `candidates-keyless-pMFYdF` does not reproduce a Bun win and slows Node Current text;
        preserve production and remove the unsuccessful experiment definition.
  - [x] Compare Deno owned UUIDv7 generation with the existing sequenced byte generator.
        `uuidv7` uses a four-byte entropy draw for continuation; the package's ordinary owned
        writer draws sixteen bytes. Test the existing generator as Deno's selected default,
        retaining current selection elsewhere, before inventing another entropy interface.
        Preserve ownership, clock and failure behavior. Retain only repeated complete-call
        improvement without increased resource cost; private counters are not a new public promise.
        `candidates-keyless-Ehwavj` changes direction between source-screen processes.
        `packed-source-fdchFC` retains the independent packed substitution;
        `current-deno-sequenced-owned-packed.jsonl` rejects it across six processes with a
        slower median and an interval excluding parity.
        Preserve production. The rival gap remains open; fewer entropy bytes alone do not
        justify selecting the full sequenced generator.
  - [x] Profile Deno's remaining owned UUIDv7 loss independently of the held UUIDv4 contract.
        Reuse the generation corpus and Deno CPU profiler for the package and `uuidv7`, with
        reversed process order and the same warm-up and sample settings. Separate startup,
        harness and GC samples from generator work. Inspect whether secure fill, timestamp
        writing or sequence work explains the difference before choosing another source change.
        `current-deno-owned-{0,1,2,3}` retains nonempty CPU profiles and matching qualified
        single-case measurements in both orders. Writer work dominates both implementations;
        package captures also attribute samples to `readClock`. Profiled throughput crosses
        parity and does not replace the unprofiled ranking. Test direct clock invocation with
        identical failure containment; reject without repeated complete-call improvement.
        `candidates-keyless-n8Qu4j` repeats lower Bun owned-byte cost in both orders;
        Node is near unchanged and Deno changes direction. Compare packed calls independently
        before retaining the candidate; preserve every other runtime's primary-call performance.
        `current-owned-direct-clock-packed.jsonl` and `packed-source-4UDYJ5` do not reproduce
        the owned-byte gain on Bun or Deno across six processes. Improvements in other rows
        cannot establish a gain in this mechanism. Remove the candidate and preserve production;
        sampled wrapper work alone does not justify rewriting it.
  - [x] Refresh one complete primary-call ranking before another source candidate. Compare UUIDv4
        and UUIDv7 text, owned bytes and slugs, paired output, and the six text/byte/plain-slug
        conversions on Node Current, Bun, Node LTS, Chromium and Deno. Reuse the maintained
        matrix with comma-separated name filters so one build measures only these jobs; preserve
        single-term filtering. Three fresh processes per runtime distinguish persistent gaps
        from order-sensitive differences. Show named qualified rivals and native floors separately,
        keep their process medians, and label missing masking or value comparisons and resource
        parity explicitly. Rank by runtime priority and complete-call loss before changing code.
        `current-primary-complete-ranking.jsonl` preserves three process medians per measured
        call on each ranked host; `current-primary-slug-rivals-ranking.jsonl` supplies the
        separately named slugid and short-uuid conversion rows. Compare actual public defaults,
        not the fastest private or composed package alternative. These are warmed successful
        call measurements, not installed-package startup, individual-call latency or resource parity.
        Current ordering of measured primary-call gaps:

        | Priority | Consumer call | Faster reference | Evidence and next decision |
        | --- | --- | --- | --- |
        | Small remaining difference | Bun UUIDv4 text | `crypto-randomuuid` | `current-primary-v4-outcome-ranking.jsonl` retains a small absolute gap. Existing wrapper candidates do not justify more code; negligible differences are acceptable. Reopen only for material consumer or resource cost. |
        | Small remaining difference | Bun bytes to plain base64url slug | Native `toBase64` | Direct native delegation is retained. `current-primary-conversion-ranking.jsonl` shows a small wrapper difference; do not repeat rejected wrapper shapes solely to erase it. Preserve direct base32 selection. |
        | Preserve | Bun UUIDv4 plain slug generation | Web Crypto draw plus native base64url encoding | `current-primary-v4-outcome-ranking.jsonl` favors the package; the old loss is not a current optimization target. |
        | Preserve | UUIDv7 plain slug generation on ranked hosts and Chromium | Native generation and qualified library compositions | `current-primary-v7-slug-typedarray-ranking.jsonl` includes browser-capable qualified rivals with native encoding and favors the package on every measured runtime. Preserve production; reopen only for a reproduced material gap. |
        | Small remaining difference | Bun UUIDv7 text | `Bun.randomUUIDv7` text output | `current-native-baseline-v7-ranking-repeat.jsonl` shows a small native-floor difference and a lead over tested qualified libraries, including `fastv7`. Preserve native delegation rather than adding another wrapper. |
        | Preserve | Deno owned UUIDv7 bytes | `uuidv7` | `current-primary-v7-owned-ranking-repeat.jsonl` does not reproduce the old qualified-rival loss. Preserve the independent writer; do not select a rewrite from the stale ranking. |
        | Lower runtime priority | Deno UUID text to bytes | Buffer hex decoding | Package 177.73 ns versus 166.36 ns; this floor returns Buffer rather than the package's plain owned array. Compare equivalent ownership before treating it as a qualified loss. |

        The corrected default-call report above supersedes older generation ordering. Node Current,
        Node LTS and Chromium favor the package on the compared generation and conversion calls;
        this does not prove missing native floors. Slugid loses both text/slug conversions on every
        measured host. Short-uuid also costs more, but uses a different numeric wire spelling.
        Paired output uses the qualified library compositions and Bun resource captures above;
        immutable values and masking lack qualified external comparisons. Chromium UUIDv7 slug comparisons use the refreshed report above. Resource parity remains
        open; timing and instrumented operation counts cannot establish total allocation.
      `current-primary-v4-text-refresh.jsonl` retains a Bun default-text loss in three processes.
      `current-primary-v7-slug-refresh.jsonl` does not reproduce the old Bun native-slug loss;
      do not choose another slug-generation tweak from that stale ranking.
      `current-primary-conversions-refresh.jsonl` retains Bun byte-to-plain-slug loss against
      native `toBase64`; other conversion results favor the package apart from small Deno parsing
      uncertainty. Guard and timestamp rows are incidental corpus output, not optimization targets.
  - [x] Correct `bench/README.md` filter guidance: the generation filter
        accepts comma-separated case-name substrings, and a single term retains its old meaning.
- [ ] Profile the actual complete calls with gaps and inspect their faster rivals. Name the
      removable work, the rival explanation, and the observation that would reject the attribution.
  - [x] Profile ordinary Bun masked UUIDv7 generation with the existing fixed-call profiler.
        Shared option, generator and result checks may add removable default-call cost; cipher
        or entropy work may dominate instead. Use sampled stacks and unsampled caller CPU to
        select the next mechanism. Preserve caller-supplied generator validation and wire output;
        no sampled wrapper cost or a negligible complete-call saving rejects a wrapper rewrite.
        `current-primary-bun-masked-generation-resource` attributes the largest top-frame group
        to the configured sequence writer in `src/v7.ts`, followed by the cipher. The codec's
        default byte source is `uuidV7BytesFor`, not ordinary default owned-byte generation.
        Check the codec's published generation behavior before testing that source substitution;
        sampled shared validation work alone does not select a wrapper rewrite.
  - [x] Screen ordinary owned-byte generation as the masking codec's default byte source.
        The codec promises secure UUIDv7 bytes and its masked wire format, not shared ordering.
        Change only public codec construction; retain explicit-time generation, selected generators,
        immutable-value payload layout and the injected failure seam. Existing Node/Bun wire,
        timestamp, entropy and generator-failure witnesses must pass before timing. Reject without
        repeated complete masked-generation gains or on a material primary-call resource loss.
        `candidates-codec-BzjRUN` rejects the first substitution because public byte generation
        throws its existing entropy error and the codec wrapped it again. Preserve that error
        unchanged only for the package-owned default; keep injected callback containment intact.
        `current-codec-default-owned-screen-cause-preserved.jsonl` passes Node, Bun and resource
        witnesses. Bun masked generation improves in both orders, but a large baseline variation
        and slower base32 decode controls require independent packed comparisons before retention.
        `current-codec-default-owned-packed.jsonl` and its repeat do not resolve a repeated
        ordinary masked-generation gain. Bun immutable generation resolves slower in the first
        comparison and has a slower median again in the noisy repeat. Reject this public-generator
        substitution and remove its definition; source and packed archives retain the experiment.
        This does not prove the configured writer necessary. A later candidate must change the
        mechanism, such as an error-valued default byte entry, rather than replay this wrapper.
  - [x] Compare Bun UUIDv4 text CPU and retention for the package, `crypto-randomuuid`, and bound
        Web Crypto in equal-call reversed captures. The library directly exports Node-compatible
        `crypto.randomUUID`; native binding may explain the loss, or package dispatch and trust
        checks may add it. Reuse one qualified case definition for timing and profiling. Higher
        package CPU with equivalent bound-native CPU selects wrapper attribution; a faster library
        than both selects native method attribution. Varying memory does not prove allocation.
        Prefer the fastest complete native call when it wins; minimize its wrapper rather than
        requiring portable TypeScript to match it. Audit any claimed guarantee mismatch against
        actual consumer requirements and qualified rivals before rejecting native selection.
        `current-v4-rival-{0-package,1-bound,2-library,3-library,4-bound,5-package}` captures
        each exact call with 1,048,576 measured calls, 262,144 warm-up calls and two memory windows.
        Package caller CPU is 35,839/34,689 microseconds; bound Web Crypto is 32,805/33,373;
        the direct library is 30,568/30,229. Both native selection and the wrapper contribute
        to the gap in these captures. Sampling concentrates in `randomUUID`; memory growth
        varies and does not establish allocation parity. Minimize the direct native path next,
        then measure the package call and import/retention costs before retaining it. Earlier
        rejected import selection remains counterevidence, not permission to adopt this kernel win.
  - [x] Screen Bun native UUIDv4 selection through the existing built-in module loader rather
        than an additional static import. Fresh reversed captures favor direct Node-compatible
        generation; loading its module or retaining its state may erase the complete-call gain.
        Keep Web Crypto when the loader or method is absent. Preserve ordinary case handling
        and generation failures. Reject absent repeated public-call improvement or material
        startup/resource loss; use existing runtime proofs, generation cases and packed comparisons.
        `current-bun-native-loader-serial-{0,1,2}.jsonl` keeps the remaining rival loss visible:
        default text costs 1.103–1.128 times the direct library call. Packed baseline comparisons
        in `current-bun-native-loader-packed{,-repeat}.jsonl` favor native selection, with median
        ratios 0.928 and 0.910; uppercase and other controls remain unresolved. Isolated cold
        imports vary in both directions. Reversed fixed-call memory captures show small collected
        heap differences and varying native commitment; they do not establish gross allocation.
        `current-bun-native-loader-ranked-packed.jsonl` covers Node Current, Bun, all three
        browser engines, Deno and Node Current JITless; the separate LTS packed comparison
        covers Node LTS. Their intervals leave small differences unresolved, including the
        broader Bun result. Retain the small selection change on the repeated focused evidence;
        resource parity and the remaining default-text rival gap stay open.
  - [x] Preserve Bun default text when only a negligible rival gap remains. The current ranking
        and rejected wrapper screens above do not justify more production code. Reopen only
        for a reproduced material speed or resource loss, not an older ranking.
  - [x] Compare equal-call Bun `package.conversion.bytes.slug` and
      `platform.tobase64.conversion.bytes.slug` captures in reversed order. Current encoding may
      spend removable time writing scratch and constructing text, or validation and native-call
      containment may consume the floor gap. Attribute stacks separately from unsampled CPU;
      no repeated resource loss or unchanged writer work rejects a writer-only explanation.
      `current-primary-byte-slug-{0-package,1-native,2-native,3-package}` captures equal completed
      and warm-up calls in reversed order. Package caller and process CPU exceed native in both
      pairs; sampled package work concentrates in Latin-1 `toString` and its byte writer, whereas
      native work concentrates in `toBase64`. Resident and committed growth vary; neither proves
      gross allocation or a leak. Inspect a direct plain-result path that avoids the shared writer
      dispatch; do not repeat rejected generic native branches or bound calls unchanged.
      The later native writer and `current-primary-conversion-ranking.jsonl` supersede this
      writer attribution: the remaining native-floor difference is negligible and acceptable.
      Preserve production; this old profile must not dispatch another wrapper experiment.
  - [x] Screen a separate plain-UUID encoder for Bun byte-to-slug conversion. Select its
        native function once; other hosts keep the existing encoder identity, and masked
        tails keep their current writer. The hypothesis is that separating the plain call
        avoids the failed shared dispatch shape. Reject it if repeated complete conversions
        do not improve, base32 calls lose, or capability-failure and payload proofs fail.
        Use the existing native probe and packed comparison before widening its callers.
        `current-plain-native-separated-packed-fixed.jsonl` improves base64url conversion
        but slows base32hex. Reject the shared plain helper shape. Screen a native-only optional
        helper so base32hex reaches its original encoder directly; retain neither trade-off.
        `current-plain-native-optional-packed.jsonl` still slows base32hex, so the public
        conditional is also rejected. Screen selecting the plain writer on the existing
        alphabet object once: the public call then has one writer call and no native branch.
        This adds a fixed method per alphabet; reject any primary-call or resource regression.
        Alphabet-selected wrappers also slow base32hex. Compare its wrapper with storing the
        original encoder directly: recovery implicates the added call layer; continued loss
        rejects indirect dispatch itself. Keep the same public call and native writer otherwise.
        The direct-method screen improves base64url by 3.8% while leaving a possible base32
        loss unresolved. Decoder-only Bun browser builds with development selection reject
        the metadata design: minified output grows from 7,771 to 11,514 bytes and unminified
        output retains `encodePortable`. Both bundles execute the same exact-byte oracle.
        Reject all four shapes; remove their production and probe changes. The native gap
        remains open, with no demonstrated physical floor or permission to slow another job.
  - [x] Add plain-slug decoding to the existing named-root consumer graph before another
        encoder change. Keep the consumer job visible in artifact measurements; existing
        masking and generation exclusions do not establish removal of encoding functions.
  - [x] Screen known-alphabet selection inside byte-to-slug conversion before adding native
        dispatch. The default already identifies base64url, so repeating alphabet normalization
        may add removable caller work; the fixed writer may instead dominate the complete call.
        Compare default-only selection with both scalar presets in isolated source candidates.
        Keep wrapper normalization, offsets, error propagation and all writers unchanged.
        Reject absent reproducible complete-call improvement or a loss in base32 conversion.
        Use the existing source screen, exact-byte tests and packed comparison; do not retain
        a faster helper without a faster consumer call.
        `candidates-slug-HS6BhT` rejects default-only selection for base32 cost; scalar selection
        survives. The wrong-selection mutation fails the exact-byte oracle in Node and Bun.
        `current-scalar-alphabet-packed{,-repeat}.jsonl` reproduces Bun base64url gains with
        median ratios 0.952 and 0.957. Base32 differences remain unresolved. The ranked packed
        comparison favors Node Current base64url; its small browser control losses do not
        reproduce in `current-scalar-alphabet-browser-controls.jsonl`. Node LTS comparisons
        remain unresolved. Four reversed equal-call profiles reduce Bun caller CPU in both
        pairs; heap growth is similar and native commitment varies, not allocation parity.
        Decoder-only raw bundle sizes match across all maintained optimizers in both packed
        artifacts. Keep the resolver for wrappers and invalid inputs; the native floor gap stays open.
  - [x] Retain measured scalar selection in the public byte-to-slug implementation, then run
        the complete check against the final source. Preserve declarations, accepted inputs,
        normalization, offsets, errors and encoder selection. Hold public performance prose
        for exact approval; the roadmap and raw captures retain the active evidence meanwhile.
  - [x] Refresh Bun primary rivals after retaining scalar selection. Three fresh host captures
        in `current-scalar-retained-primary-bun-{0,1,2}.jsonl` keep byte-to-base64url conversion
        as the largest confirmed loss: package medians are 42.07–43.78 ns versus native
        34.15–35.46 ns. UUIDv4 text beats `crypto-randomuuid` in the first capture and loses
        modestly in the other two; UUIDv4 slug generation no longer reproduces its prior loss consistently.
        These complete-call observations supersede those stale Bun gap priorities, not the
        retained scalar-selection comparison. Keep native encoding as the next target.
  - [x] Screen direct native encoding inside the scalar-selected public byte conversion.
        The changed premise is reduced caller normalization, not a new generic encoder branch.
        Capture the native capability once outside shared alphabet metadata; preserve the original
        encoder for other hosts, base32 and native failure. Use the existing native probe through
        the public conversion, and reject base32 loss, decoder retention or absent repeated gain.
        `candidates-slug-Xd0mcf` improves base64url but slows base32 in both orders, so reject
        the post-normalization native branch. Exact valid default/preset shortcuts preserve
        input validation but still need complete-call comparisons with base32 controls.
        `candidates-slug-HgXTbi` rejects both default placements: base32 slows in both orders
        despite faster base64url. Leaf-writer comparisons preserve public dispatch and validation;
        prove exact bytes, capability absence and failure before timing complete calls.
        `candidates-alphabet-llSmSc` rejects leaf selection of `toBase64`: byte conversion
        slows in both orders. A native method working on plain arrays proves semantics only,
        not a complete-call gain. The resource counter covers direct Buffer construction with
        a plain-array interception control; its invariant counts the selected native entry.
        `candidates-alphabet-JVQdV3` rejects direct Buffer leaf encoding too: byte conversion
        slows in both orders after behavior, fallback and resource proofs pass. None of these
        native placements closes the primary gap; retain the scalar-selected production path.
  - [x] Isolate a small native default dispatcher from the existing general conversion body.
        The public default shortcuts enlarge that body and slow base32; native leaf calls retain
        normalization cost and fail to beat the current complete call. Extract the original body
        without changing validation or encoders, then measure default and base32 calls together.
        Reject the shape before wider measurements if either primary call reproducibly loses.
        Keep the native floor gap open; rejected placements do not prove an inherent limit.
        `current-native-split-packed{,-repeat}.jsonl` rejects the split default-only wrapper:
        repeated packed calls improve base64url but slow base32. Avoid revalidating already-proven
        16-byte scalar-preset input on that path. Screen a shared exact-payload preset dispatcher
        with native base64url and direct existing base32 encoding; other inputs keep the complete
        original general body. Reject any repeated primary regression before a wider matrix.
        `candidates-slug-gE3Poq` still slows base32 in both orders. Test only exception placement
        next: move native try/catch into the existing small helper while keeping the shared
        preset dispatcher identical. This distinguishes that placement's cost without relaxing
        fallback guarantees or changing the encoder. Reject another base32 loss.
        `candidates-slug-uyUWUU` retains a base32 loss with outlined exception handling too.
        Reject these wrapper shapes; no production change is justified by their base64url gain.
  - [x] Screen removal of repeated range validation for exact 16-byte inputs at numeric offset zero.
        Those two facts prove the complete range; all other inputs retain the original check.
        The shared Node and Bun conversion tests must reject nonzero, negative, fractional and
        nonfinite offsets on an exact payload before the invalid-offset mutant can be timed.
        Screen the existing conversion without native dispatch changes. Prove invalid offsets
        still fail by removing that condition in an isolated mutant, then compare both alphabets.
        Retain only repeated complete-call gain without another primary loss or resource cost.
        `candidates-slug-9YGVww` rejects the lost-offset mutant in both Node and Bun through the
        shared bounds test. `candidates-slug-EJIeif` passes correctness for the valid shortcut,
        but slows base32 in both orders and does not reproduce a base64url gain. Reject it.
  - [x] Screen direct returns for validated scalar alphabets before adding native encoding.
        Known base32 and base64 selectors need no error-result recognition. Keep byte and offset
        validation intact; boxed selectors retain normalization. Compare a direct-return control
        with native encoding only in the validated base64 branch, after the base32 return.
        Reject a primary regression or an unrepeated gain before widening the runtime comparison.
        `candidates-slug-AImfzK` slows base32 in both orders for both shapes. Reject them.
  - [x] Let native plain encoding validate its own byte-array brand on default calls.
        The native intrinsic already rejects fake and unsupported receivers. A canonical
        22-character result establishes a 16-byte input without repeating package brand checks.
        Other lengths, offset calls and supported non-array sources retain general conversion.
        Disable a throwing native capability only after proving its receiver was a valid payload;
        invalid input must not change future dispatch. Prove fallback and payload corruption,
        then reject a repeated base32 loss or absent complete-call gain before wider measurement.
        `candidates-slug-KN2Thu` passes receiver, fallback and corruption proofs. Base64url
        improves in both orders, but base32 slows in both; reject the combined path.
  - [x] Select a plain encoder by alphabet without adding native checks to the public hot body.
        Keep current byte, offset and selector validation. A private encoder map can select native
        base64url once and replace a throwing entry with its portable writer; base32 uses its
        existing writer. This differs from branching inside public conversion or shared metadata.
        Reject absent complete-call gain, repeated base32 loss or decoder-only retained code.
        Use the existing present, absent, throwing and corrupt native probes before timing.
        `candidates-slug-YgPm7b` passes those proofs but slows Node conversions and Bun base32
        in both orders. Reject the map; its small Bun base64url gain cannot justify those losses.
  - [x] Compare one fixed-payload encoder entry with the rejected alphabet map.
        Use the existing encoder directly on other hosts and for base32, without name lookup or
        portable wrapper closures. Native selection handles only validated 16-byte plain payloads,
        so it needs neither length nor masked-tail checks. Disable a throwing entry once.
        Reject repeated base32 loss or absent complete-call gain before widening measurements.
        `candidates-slug-7ayG1n` resolves no Bun base64url gain and slows base32 in both orders.
        Reject the extra entry; keep native delegation direct.
  - [x] Put direct native delegation on ordinary Bun base64url conversion and finish its controls.
        Use the already-proven native method for exact arrays and scalar base64url presets;
        keep other forms and capability failure on the existing conversion. Do not add another
        indirect encoder map or wrapper. Treat measured base32 losses as unfinished implementation
        work, not grounds for leaving native unused. Completion still requires resolving primary
        regressions, proving decoder-only removal and comparing ranked complete calls and resources.
        `current-native-direct-primary-packed.jsonl` resolves a Bun base32 slowdown; base64url
        gains remain unresolved across its full process interval. Put exact-array base32 presets
        on their existing writer before native dispatch, then compare the same complete calls.
        `current-native-base32-focused-packed.jsonl` repeats the native base64url gain but leaves
        base32 unresolved with a slower median. Test whether separating general input conversion
        from the ordinary preset body removes that cost; retain native selection either way.
        `current-native-preset-body-primary-packed.jsonl` leaves Bun effects unresolved and
        detects a small Node base64url loss. Exact base64url arrays must call the existing writer
        directly when native encoding is absent, avoiding the new general-helper hop.
        `current-native-preset-fallback-focused-packed.jsonl` favors Bun base64url and Node
        base32, but resolves a Bun base32 loss. Isolate native exception containment from the
        ordinary public body; compare both complete calls before attributing the loss to it.
        `current-native-containment-focused-packed.jsonl` retains the Bun base32 loss and
        leaves base64url unresolved. Remove the containment helper; consolidate exact-array
        validation and preset selection so each primary call makes one writer choice.
        `current-native-common-preset-focused-packed.jsonl` leaves both runtimes unresolved;
        Bun base32's median loss is smaller. Compare equal completed-call CPU and resource captures
        in reversed order before another implementation change; do not infer parity from noise.
        `current-native-common-base{32,64}-{0-baseline,1-current,2-current,3-baseline}` completes
        equal-call reversed captures. Caller CPU falls in both pairs for both alphabets; heap
        differences do not establish total allocation. Preserve the candidate for ranked-runtime
        and decoder-only graph checks; timing parity and full resource parity remain unresolved.
        `current-native-common-ranked-packed.jsonl` and `current-native-common-lts-packed.jsonl`
        resolve Chromium and Node LTS base64url gains and JITless gains for both alphabets.
        Other intervals include parity; no ranked comparison resolves a primary-call loss.
        `current-native-common-{baseline,current}-graph.txt` shows small decoder-only growth
        in most optimizers. Retain the existing checker's emitted decoder bundles, identify the
        surviving code, and remove unrelated native encoding work before closing this task.
        The retained bundles show the new `typeof Bun`/`toBase64` capability read after writers
        are removed. Mark its named capture as removable; verify the build retains the optimizer
        annotations and the decoder graph removes this read before rechecking complete calls.
        `current-native-capture-decoder/` removes the new probe in every maintained optimizer.
        Raw sizes equal the baseline except for a smaller Rollup output; the checked archive
        preserves both capture annotations. Recheck complete calls on the final capture shape.
        `current-native-capture-final-primary-packed.jsonl` leaves final timing differences
        unresolved. `current-native-final-base{32,64}-{0-baseline,1-current,2-current,3-baseline}`
        records lower Bun caller CPU in both reversed pairs for both alphabets; retention does
        not prove total allocation parity. `current-native-final-floor-bun-{0,1,2}.jsonl`
        retains a complete-call loss against native base64url in every process.
        `current-native-final-runtime-profiles/` records Node LTS, Bun, Deno and Chromium;
        `current-native-final-current-runtime-profiles/` supplies the explicit Node Current capture.
        Read actual runtime records before assigning either capture to the runtime ladder.
        `current-primary-conversion-ranking.jsonl` supersedes the earlier native-floor target:
        the remaining Bun base64url wrapper difference is negligible and acceptable. Native
        delegation, ranked complete-call comparisons, reversed caller-CPU captures and decoder-only
        removal establish retention; sampled heap does not establish total allocation parity.
        Reopen only for a material primary-call regression, not the accepted wrapper difference.
  - [x] Screen native receiver validation against the retained shared preset dispatcher.
        Bun's final sampling capture attributes remaining caller work to the public wrapper.
        Compute the scalar selector once; native base64url validates its receiver and a
        22-character result establishes the payload length. Preserve base32's existing guard
        and writer, and disable native failure only for a valid payload. This differs from the
        rejected intrinsic default wrapper because the general body and base32 dispatcher are
        already separated. Reject lost receiver, length, offset or fallback behavior, repeated
        base32 loss, or absent repeated base64url gain before wider measurements.
        `candidates-slug-ZF9A8S` passes behavior, resource, capability and corrupted-output
        proofs but slows base32 in both orders on Node and Bun. Bun base64url gain does not
        repeat. Reject this shape; preserve its isolated source and raw proofs in that report.
  - [x] Isolate native call-target mutability without changing preset validation or writers.
        Keep the captured native function constant and track its failure with a separate flag.
        A mutable call target may inhibit specialization; an extra flag may instead cost more.
        Compare the complete calls in both orders and reject base32 loss or absent repeated
        base64url gain. Existing native probes must prove absence and permanent failure fallback.
        `candidates-slug-hhEo3i` passes the probes but slows Bun base64url and base32 in both
        orders. Reject the extra flag; the recorded isolated source supports future remeasurement.
  - [x] Profile the base32 writer before expanding its packing loop.
        `current-base32-writer-profile` completes 1,048,576 calls after 262,144 warm-up calls.
        Its sampling summary reports 277 samples in native `toString`, 48 in the base32 writer
        and 43 in the consumer loop. Sampling locates work, not exact cost fractions. Preserve
        the compact packing loop; compare native string construction before enlarging it.
  - [x] Recompare direct Latin-1 construction through both primary byte-to-slug alphabets.
        Earlier repeated comparisons resolve byte-to-text gains but leave generation effects
        unresolved. Native UUIDv7 defaults bypass this factory; their unchanged timing cannot
        establish whether primary conversions benefit. Reuse `latin1:direct-latin1`, compare
        complete conversion calls and masked controls, and retain only repeated gains without
        primary loss, extra resource work or broken optional-capability fallback.
        `candidates-latin1-6cK87o` rejects byte loss on Bun before timing. The intact
        `candidates-latin1-cdI95M` passes fallback and payload proofs, but changes unchanged
        generation controls too. Four isolated `current-latin1-isolated-*` equal-call captures
        do not reproduce its large base64 slowdown in caller CPU. Keep that conflict unresolved;
        compare packed conversion calls before attributing the multi-case source result.
        `current-latin1-primary-packed.jsonl` keeps every requested batch across six process
        pairs. Conversion and masking intervals include no change; no material primary gain
        earns the extra factory logic. Keep the original factory and the native gap open.
  - [x] Screen removal of the copy after decoding primitive text for masked encoding.
        `decodeUuid` allocates parsed and unmasked string results. Its shared sentinel bytes
        return from `encodeMasked` before any write. Borrowed arrays, views and immutable UUID
        objects must still copy. Reuse the existing owned-block entry only for primitive text;
        prove a borrowed-input mutation fails, count the removed copy, and compare both masked
        alphabets and byte controls before retaining the change on ranked runtimes.
        `candidates-codec-Qg1Ion` rejects caller-buffer mutation on Node and Bun. The valid
        `candidates-codec-SUwqDL` passes correctness, but does not resolve text gains and slows
        Bun byte controls in both orders. Do not retain the newly allocated owned-block route.
  - [x] Parse primitive UUID text directly into the codec's existing private encoding scratch.
        UUID text lengths cannot be slug lengths. Both supported UUID text spellings can use
        the existing transactional caller-buffer parser, eliminating its temporary array and
        the subsequent copy while preserving the reusable cipher block. Sentinels still return
        before mutation; other representations retain their current decoder and byte ownership.
        Verify version rejection, wire identity, sentinels and custom-callback reentrancy on both
        runners. Count zero temporary arrays and copies, then compare complete masked calls and
        byte controls before widening to ranked runtimes.
        `candidates-codec-Lz7q3N` removes one array and one copy from UUID text while keeping
        caller-byte copies. `current-scratch-text-ranked-packed.jsonl` repeats complete calls
        across ranked runtimes; Node Current, Bun, Chromium and Deno text gains survive, with no
        resolved control loss. Equal-call Bun captures in `current-scratch-text-isolated-*`
        reduce caller CPU in both orders. `current-scratch-text-lts-packed.jsonl` keeps the LTS
        comparison; its base32 gain resolves and other intervals remain open. The shared nested
        callback witness covers text and borrowed bytes. Complete checks pass; the old allocation
        fails the zero-buffer resource gate. `current-scratch-text-retained-native` captures both
        masked text alphabets on Node Current, Bun, Deno and Chromium. Native base64 parity and
        missing external masking/resource comparisons remain open; this gain does not close them.
  - [x] Profile ordinary masked text encoding and byte decoding on Bun in equal-call windows.
        Cipher rounds may dominate, or UUID parsing, packing, validation and string construction
        may consume more work. Capture each exact call independently in reversed order; inspect
        sampled stacks beside unsampled CPU and memory, not as allocation totals or rival parity.
        Select a change only from the attributed primary cost; reject another encoder rewrite if
        cipher or validation work dominates. Reuse the existing profiler and configured codec.
        `current-primary-masking-{0-encode,1-decode,2-decode,3-encode}` captures each exact call
        with equal completed and warm-up counts. Both decoding captures concentrate sampled work
        in `feistel16`, then payload restoration and base decoding. Encoding divides substantial
        work between string construction and the cipher; its sample attribution varies between
        `feistel16`, `mix32` and `tagFor`. Memory growth varies and does not establish allocation
        or rival parity. Inspect the shared cipher's fixed loops before selecting a candidate;
        preserve its rounds, key order and wire vectors. Do not repeat the rejected string writer.
        Compare any proposed loop change with `bench/PERFORMANCE.md` §Rejected TypeScript
        hot-path shapes and §Feistel round function first; a hot frame alone does not reopen
        rejected unrolling, key selection or word access. Name the changed mechanism or premise.
- [ ] Change one evidenced bottleneck at a time. Reject a component-only gain, a primary-call
      regression, or a speed gain paid for by material resource loss. Never choose a mechanism
      merely because the existing experiment driver can measure it.
  - [x] Screen fixed message-block expansion inside the current inline Feistel round through
        masked encoding, decoding and generation, including both alphabets. Both Bun decoding
        profiles attribute their largest sampled cost to the cipher. Expanding its three absorption
        blocks may remove message selection; the larger body may instead lose to the compact loop.
        Earlier rejected expansion changed the outer Feistel traversal or the general hash's
        compression rounds, not this inline message-block loop. Keep every hash round, constant,
        key and output word unchanged. A changed length-block mutation must fail existing wire
        oracles on Node and Bun before timing. Reject absent repeated complete-call gains or a
        primary-call loss; expand only a survivor to packed runtime and resource evidence.
        `current-feistel-message-blocks-mutation.log` rejects changed length through the Node
        cipher vector and Node/Bun masked wire vectors. The intact screen passes behavior and
        resource counters, but Bun text decoding loses in both orders and byte-decoding gains
        do not repeat. Node gains vary by call and order. Reject the larger body; preserve
        `candidates-feistel-ged6nP` and remove its live fixture. No production change is justified.
  - [x] Screen native base64url directly after `uuidBytesToPlainSlug` validation for a whole
        UUID byte array on Bun. The complete-call profile supports removable Latin-1 writer cost;
        validation and native-call containment may instead erase the gain. Keep offsets, base32hex
        and masked output on the existing writer. Prove native selection, absence, throwing fallback
        and rejected output corruption before timing. Reject unrepeated complete-call gains or a
        material primary control loss; expand only a survivor to packed and resource evidence.
        `current-native-plain-result-screen.log` passes native selection, fallback, corruption
        and runtime proofs. Bun conversion improves only slightly in both orders while controls
        move too; the result does not close the rival gap. Reject the extra native branch and
        remove its live fixture; retain `candidates-slug-6QxHUJ`. Distinguish validation cost from
        native-call overhead before another conversion rewrite.
  - [x] Compare the existing fixed character-code base64url writer with Bun's Latin-1 writer
        through complete conversion, generation, paired and masked calls. Eliminating scratch
        writes and `Buffer.toString` may lower cost; native string construction may still be faster.
        Reuse the existing writer without adding a new algorithm. A lost-final-byte mutation must
        fail Node and Bun payload oracles before timing. Reject absent repeated primary-call gains
        or a material primary loss; expand a survivor to packed/runtime/resource evidence.
        `current-character-code-base64-mutation.log` rejects final-byte loss on both runners.
        The intact screen exposes resource accounting that omitted character-code slug strings
        when UUID text uses Latin-1; count each observed constructor without coupling the writers.
        `current-character-code-base64-screen-fixed.log` passes corrected counters and behavior,
        but raises Bun conversion and masked costs in both orders. Reject the writer substitution
        and remove its live fixture; retain `candidates-alphabet-XaUPJ8` and the counter correction.
- [ ] Verify each retained change through affected runtime and packed consumer calls, preserving
      identifier and failure contracts. Rerank remaining primary gaps; stop repeating a rejected
      mechanism unless new evidence changes its premise. Keep missing evidence explicitly open.

Do not optimize caller buffers, batch paths, rare misuse, failure speed, or secondary inspection
scenarios in this effort. Their existing checks remain correctness checks, not performance work.

- [x] Compare wider pooled reads and erasures for sixteen-byte draws with the retained byte
      blocks through complete owned-byte and slug calls. Copying may dominate the Bun portable
      gap, or wider access and unpacking may add more work. Preserve unaligned offsets, byte order,
      lazy initialization, every erased byte and refill failures; retain four-byte copying unchanged.
      Both lost-byte and lost-erasure mutations must fail existing Node/Bun pool oracles before
      timing. Reject absent repeated gains or a primary-call loss; inspect the retained view only
      if throughput survives. Keep production unchanged during the screen.
      `current-pool-word-sixteen-screen.log` shows slower Bun owned bytes in both process orders;
      reject the wider copy and retained view. Existing Node/Bun byte and erasure oracles reject
      both mutations. Preserve `candidates-pool-826UnC`; remove the live fixture.

- [ ] Refresh complete primary single-ID calls against qualified alternatives after retained
      alphabet selection. Older rankings may overstate conversion gaps; choose the next mechanism
      only from current generation, parsing, conversion and masking evidence. Exclude caller-buffer
      optimization and do not repeat rejected component tweaks without a changed premise.

- [x] Screen a direct base64url preset in `generatePlainUuidV4Slug()` against resolving every
      alphabet through the shared helper. The default may pay removable normalization and error
      recognition, or the engine may already inline them. Preserve boxed strings, other alphabets,
      invalid-name errors and entropy failures; a wrong default alphabet must fail the existing
      wire oracle before timing. Reject absent repeated complete-call gains or a material control
      loss. Expand only a survivor to packed and resource evidence; leave production unchanged.
      `current-v4-slug-preset-mutation.log` rejects the wrong default spelling on Node and Bun.
      `current-v4-slug-preset-screen.log` shows a modest Node gain but Bun changes direction
      with process order and controls move too. Reject the preset branch for this Bun gap;
      retain `candidates-v4-slug-ASKF4D` and remove the live fixture without changing production.

- [ ] Compare direct alphabet selection with the shared own-property lookup through ordinary
      byte/text conversion, slug generation and paired output on Node Current and Bun. The lookup
      may add removable dispatch work, or compilation may already erase it. Preserve wrapper
      normalization, unknown-name rejection and both encodings; swap the base32 result to prove
      existing wire oracles reach the selector before timing. Reject absent reproduced complete-call
      gains or a material control loss; expand a survivor to packed/runtime/resource evidence only.
      `current-slug-alphabet-mutation.log` rejects the wrong-alphabet result in Node and Bun.
      `current-slug-alphabet-screen.log` improves byte conversion in both orders on Node Current
      and Bun, while paired/text controls include mixed effects. Packed comparisons in
      `current-slug-alphabet-packed{,-all,-lts}.jsonl` reproduce conversion gains on Node,
      Chromium and Deno without a separated selected-case loss. Bun equal-call captures lower
      CPU in both orders; collected heap is retention evidence, not gross allocation.
      `current-slug-alphabet-native-{0-baseline,1-candidate,2-candidate,3-baseline}` retains
      every requested native format. Deno and Chromium conversion gains repeat in both orders;
      aggregate sampled bytes per timed call decrease but include warm-up and harness work.
  - [x] Finish packed-module selection and synchronous-only execution in `bench/profile-all.ts`;
        preserve its existing native evidence and avoid unrelated async construction. The control
        emits both byte conversions on every host; its Chromium bundle contains the candidate selector.
  - [x] Capture baseline/candidate native resource profiles in reversed order on remaining hosts,
        inspect CPU and allocation with each process's own completed-call counts, then retain or reject.
  - [x] Retain direct selection after the fresh complete gate; retire its live source fixture and
        preserve source archives, mutation failures and packed comparisons for the documentation proposal.
        `/tmp/uuid-slug-alphabet-retention-check.log` records the complete gate; no API signature changes.
  - [ ] Obtain approval for the exact performance conclusion and packed synchronous rerun instructions.

- [x] Screen Node-compatible UUIDv4 selection in the Bun adapter through `generateUuidV4()`
      and uppercase text, with byte and UUIDv7 calls as controls. Direct-method evidence supports
      removable method cost; public dispatch may erase it, or the added import may raise startup
      cost. Keep validation and native-failure fallback unchanged. Reject absent repeated complete-call
      gains or a material resource/control loss; require packed and cold-import evidence before retention.
      `current-bun-v4-method-screen.log` passes Node/Bun behavior and resource counters,
      then reverses the small default and uppercase differences with process order. Reject this
      method substitution before packed/resource expansion; preserve `candidates-bun-v4-0rO1be`
      and remove its live fixture. This screen does not establish a complete-call gain.

- [x] Refresh the maintained qualified corpus in three independent processes per measured host.
      `current-primary-ranking-refresh.jsonl` retains positive fresh-process samples, rejected and
      unsupported rows. Primary default-call losses remain concentrated on Bun UUIDv4 text,
      byte-to-slug encoding and native UUIDv7 slug output. Owned byte generation does not regain
      its old rival loss. Caller-buffer losses stay secondary. The larger timestamp floor gap
      compares extraction with validation against a parse-only reference; preserve validation.
      Keep packed and resource parity open; use the Bun default-call gaps for the next change.
      Bun's direct Node-compatible UUIDv4 method also beats direct Web Crypto in all three
      processes. Separate method selection from wrapper cost before another guard rewrite;
      the earlier Node-compatible substitution's resource result remains unresolved.
- [x] Compare the Node-compatible and Web Crypto UUIDv4 methods in exact warmed resource windows.
      `current-v4-method-floor-{0,1,2,3}-*` records one exact method per capture and reverses process
      order. Later-window Node-compatible CPU is lower in both orders; later committed-memory
      growth is zero for both methods. RSS changes do not establish a persistent penalty.
      Both methods load before snapshots, so startup/import cost and complete package-call
      retention remain open. Reopen method selection without treating the old cold captures
      as evidence of steady growth or claiming resource parity.

- [x] Re-rank ordinary owned UUIDv4/v7 bytes on Bun after independent default draws and block
      copying. Older rival gaps may persist or the retained changes may have closed them.
      Use the existing qualified corpus in fresh processes; select the largest remaining
      complete-call gap before another rewrite, and keep resource parity separate.
      All three `current-owned-byte-rivals-sequential-*` screens favor package bytes against
      every qualified row; discard the overlapping `current-owned-byte-rivals-*` captures.
      This selects another throughput target without closing packed or resource parity.
- [x] Screen binding the captured native base64 call once for Bun byte-to-slug conversion.
      The rejected native branch still used `.call` for every result; intrinsic dispatch may
      erase its kernel gain, or the conversion boundary may dominate either call shape.
      Preserve exact bytes, masking tails, base32hex, absent/throwing native fallback and controls.
      Move only the alphabet candidate owner before extending it; prove existing replacements
      identical. Reject absent repeated complete-call gains before any packed/resource expansion.
      `current-native-bound-call-screen.log` passes intact and native fallback/resource proofs;
      the corrupted last character fails its independent byte oracle. Both Bun orders raise
      byte encoding, UUID conversion and default-pair cost. Reject the bound call without wider
      replays; preserve its source capture and remove the rejected fixture from the live catalog.

- [ ] Close the remaining Bun default UUIDv4 text gap. The current corpus repeatedly places
      Bun default text behind native generation and qualified
      libraries; Node default text remains faster. The complete-call Bun profile mainly samples
      native `randomUUID`, with a smaller public-wrapper contribution. Preserve lowercase,
      uppercase, wrapper normalization, invalid-case errors and native fallback. A candidate needs
      repeated complete-call gains, matching resource captures and packed-runtime qualification.
      `current-v4-literal-guards-isolated.log` passes both runtime proofs and completes the reversed
      two-round screen, but the text effect changes direction. Reject retention of direct guards;
      no useful helper cost is established. Discard the earlier repaired screen for comparison
      because it overlaps the complete check. The original screen times out before its first row:
      its corpus imports its own timing entry through the module override. Clearing only that
      override on the same bundle restores every expected row; keep the driver correction.
      `bun-node-v4-packed.log` separates a small text gain, but `bun-node-v4-resource-*` does not
      establish combined resource improvement: caller CPU changes direction and resident growth
      increases in all pairs. Reject the extra Node-compatible import.
      Bun's detached Web Crypto `randomUUID` fails with `ERR_INVALID_THIS`; that receiver
      requirement applies to Web Crypto only. The detached Node-compatible function succeeds,
      but `candidates-bun-v4-0rO1be/node-compatible-source.txt` already tests it without binding;
      its complete-call screen does not reproduce a gain. Do not repeat either rejected mechanism.
      `bun-call-v4-packed.log` completes six fresh-process pairs after the full check, with no
      separated gain for either text case. Reject the wrapper; retain the original bound function.
      Reject the trusted-success early return: `v4-trusted-return-packed-fixed-warmup.log`
      completes equal-count warm-up comparisons without a separated complete-call gain.
      `v4-trusted-return-screen.log` changes direction with process order; the lost-case mutation
      reaches the uppercase oracle on both runners. Keep the captures, remove the rejected fixture,
      and leave the native-text gap open. Do not repeat these shapes without new causal evidence.

- [x] Rank ordinary UUID-to-plain-slug and reverse conversion against the qualified corpus.
      `current-uuid-slug-conversion-ranking.log` favors the package against slugid on every measured
      runtime; this proves neither native-floor nor resource parity. Keep those separate gaps open.
      `current-byte-slug-encoding-ranking.log` identifies Bun byte-to-slug encoding behind native
      `toBase64`, while the other measured runtimes favor the package. Profile that Bun call and
      its native reference. `current-bun-byte-slug-{package,native}-profile` completes both
      equal-call passes; package sampling is dominated by native `toString`, with encoder work
      also visible. Sampling does not isolate individual boundary checks or prove allocations.
      The whole-buffer comparison below does not support retention. Do not repeat rejected
      native-encoding dispatch shapes without a changed cause or mechanism.

- [ ] Close the Bun owned UUIDv7 byte gap before another default-slug tweak. The maintained
      owned-byte screens trail `uuid`; equal-call memory captures retain more heap and resident
      memory, while caller CPU disagrees. Profiles repeatedly rank result allocation first.
      Preserve `primary-owned-bytes-*` and `bun-owned-v7-resource-*`; sample attribution alone
      does not establish a cause. Do not repeat the allocation shapes: separate-helper and
      wrapper CPU gains do not reproduce, while scratch-copy increases CPU in every comparison.
      `owned-v7-{helper,copy,wrapper}-screen-*` retains equal-call captures; intact Node/Bun
      tests pass, and short-array or shared-output mutations fail the existing payload or
      private-storage oracles. No allocation shape earns a production change.
      Inspect the rival's selected entropy and sequence implementation, then reassess independent
      default draws with complete-call CPU and memory. Earlier higher source-refill counts are
      a cost to measure, not proof of higher total resource cost; keep secure entropy, all payload
      bits, configured generator behavior and failure transactionality as constraints.
      Reject the independent-direct screen: `candidates-v7-draw-UKqaoh` contains paused batches,
      and `owned-v7-independent-fixed-*` caller-CPU ratios change direction across equal-call
      comparisons. Retained-memory differences do not establish a useful combined gain. Its
      unchanged payload metadata also calls freshly random bits a fixed counter.
      Next screen only argument-free owned bytes built from the existing secure UUIDv4 byte
      generator, then timestamp and version replacement. Sequence state may explain removable
      cost; extra entropy copying or wrapper work may erase the gain. Keep configured calls and
      immutable-value generation unchanged so their declared layouts stay truthful. Reject on
      payload loss, incorrect timestamps, ownership loss, changed entropy failures, or no repeated
      complete-call gain; inspect equal-call resources before retention.
      `owned-v7-v4-fixed-*` reduces caller CPU and retained heap in each equal-call Bun pair,
      but resident memory varies. Both runtimes reject its lost-byte mutation. Packed qualification
      rejects the UUIDv4 dependency because Parcel retains that generation owner in slug and
      masking consumers; preserve `owned-v7-v4-packed.log`. Continue the same default-byte
      mechanism using the existing secure fill directly, without the UUIDv4 dependency or its
      redundant version write. Requalify the package boundary; do not weaken its graph checks.
      The direct-fill candidate passes packed consumers, payload mutations and independent default
      timestamp-boundary witnesses; clock mutations fail on Node and Bun before timing.
      `owned-v7-random-packed.log` favors Bun default bytes in every caller-CPU comparison,
      while Node bytes and unchanged controls remain unresolved. `owned-v7-random-fixed-*`
      reduces Bun caller CPU, retained heap and final resident memory in each equal-call pair.
      Isolated Node immutable-value caller CPU changes direction across five matched pairs;
      `owned-v7-node-value-control-*` weakens attribution of the mixed-workload loss to this
      candidate, without proving parity. Its recovered measurements lack a terminal-status record.
      Keep retention open. Isolate the same Bun control, then repeat packed bytes and unchanged
      calls: a repeated byte gain with stable controls supports retention; a reproduced control
      loss rejects global selection. Compare the survivor with the qualified owned-byte rivals.
      The second packed replay reproduces the Bun byte gain and separates a Node byte gain,
      but also separates a Node selected-generator loss. Bun isolated value CPU changes direction.
      Isolate the Node selected-generator call next: persistent loss rejects this public-wrapper
      shape; disappearance weakens attribution to its code and leaves workload conditioning open.
      `owned-v7-node-selected-control-*` does not reproduce that loss in isolated calls.
      Qualify the unchanged candidate on the remaining packed runtimes before retention; reject
      a reproduced ordinary-call loss. Reuse the generation corpus with an explicit candidate
      module for complete-call rival comparisons instead of timing only package-vs-baseline.
      `owned-v7-random-packed-secondary.log` separates byte gains on Chromium and WebKit,
      but a byte loss on Node JITless; Firefox and Deno remain unresolved. Reject universal
      selection. `owned-v7-random-rivals-0.jsonl` still places Bun owned bytes behind `uuid`.
      Next preserve JITless generation through its existing runtime flag and replace the
      independent draw's repeated timestamp division with fixed high/low stores. A complete-call
      gain supports removable timestamp arithmetic; no gain rejects that rewrite. Recheck payload
      and clock mutations, private output, entropy failures, controls and ranked runtimes.
      The fixed candidate passes both runtime proofs and timestamp/tail mutations; the first
      all-runtime packed comparison restores JITless cost and retains primary byte gains, but
      separates slower Node and Chromium immutable-value calls. Keep production unchanged.
      Isolate the fixed candidate's Node value call before choosing code: a persistent CPU loss
      supports a changed call shape; disappearance leaves the mixed-workload effect unresolved.
      Profile that call's generator and immutable construction frames to locate any reproduced cost.
      Isolated fixed-candidate Node value CPU does not reproduce the mixed loss. The mixed
      timings execute different counts of the faster preceding byte call, so their controls do
      not hold prior work constant. Extend the existing profiler to prepare one measured value
      call with equal completed calls of the preceding operations. A remaining loss supports a
      state/code cost; its disappearance challenges the unequal-work comparison. Keep counts
      in the report, preserve native profiling after preparation, and reject ambiguous setup.
      `owned-v7-fixed-node-prior-value-*` holds preceding calls constant and does not reproduce
      a consistent value loss; one pair still permits it. Keep the cause unresolved. Compare
      native sampled value-call stacks after that preparation: added generator/construction
      work supports a code cost; unchanged stacks weaken that explanation without proving parity.
      `owned-v7-fixed-node-prior-native-*` samples the same leading value frames and its CPU
      comparison changes direction. Neither isolated instrument establishes a consistent Node
      value cost. Chromium's mixed value loss remains unchecked. Next qualify repeated Bun
      rival calls and fixed-call resources; a remaining rival or resource loss rejects this
      candidate before more control investigation. Preserve every raw pair and process status.
      `owned-v7-fixed-writer-rivals-repeat-*` favors Bun bytes against every qualified row;
      `owned-v7-fixed-rival-resource-valid-*` favors caller and process CPU and resident growth
      against `uuid`, with a small retained-heap increase. This is not gross-allocation evidence.
      Isolate Chromium immutable-value calls through the existing packed comparison next: a
      repeated loss rejects global selection; disappearance keeps the mixed conditioning unresolved.
      `owned-v7-fixed-chromium-value-isolated.log` does not reproduce the mixed value loss.
      `owned-v7-fixed-baseline-resource-*` lowers Bun caller CPU in each pair; heap and resident
      differences vary, so resource parity remains unproved. Isolate the remaining Bun buffer
      control, then repeat only bytes across ranked runtimes before choosing production code.
      `owned-v7-fixed-bun-into-control-*` is slower in most isolated pairs. Hold adoption and
      the wider replay. Fixed-call CPU and sampled stacks for this same buffer call must
      distinguish an added implementation cost from timing variation before changing the shape.
      `owned-v7-fixed-into-resource-*` also changes CPU direction; sampled function hashes match,
      but that does not prove equal cost. Reject retention of this layout. Screen moving only
      the independent helper to the end of its existing owner; unchanged configured declarations
      then keep their source order. A repeated buffer loss rejects the placement change; a byte
      gain without it advances the same mechanism, not a second generation design.
      `owned-v7-tail-source-screen.log` preserves the byte gain. Existing source and helper
      bytes match the earlier candidate exactly apart from placement. `owned-v7-tail-bun-into-control-*`
      changes CPU direction and does not qualify placement as a performance improvement. Keep
      that uncertainty explicit; repeat only the primary byte job across ranked runtimes to
      decide whether this ordinary private-helper layout retains the mechanism's useful gain.
      `owned-v7-tail-ranked-bytes.log` favors bytes on Node Current, Bun and all three browser
      engines; Deno and JITless remain unresolved. The LTS report also favors bytes, but its
      terminal status is unavailable, so it cannot qualify completion. Primary speed supports
      the independent draw; source placement does not resolve the buffer control or resource
      question. Do not repeat these throughput screens unchanged. Before retention, inspect
      whether the final helper can reuse the existing clock and entropy boundary without adding
      work to configured calls; qualify that exact production shape and keep resource gaps open.
      Compare the tail helper's default bytes and configured buffer calls with its own baseline
      through the existing fixed-call Bun resource profiler. Lower primary CPU with no repeated
      material heap or resident growth supports retention; a repeated resource or buffer loss
      rejects it. This measures the survivor's resource cost, which the earlier placement has
      not proved, rather than repeating its already resolved byte-throughput screen.
      `owned-v7-tail-resource-*` lowers default-byte caller CPU and retained heap in every pair;
      buffer CPU stays close to baseline, while resident differences vary. Retain the independent
      draw for ordinary owned defaults and preserve configured/immutable generation. The exact
      production helper consolidates imports and keeps the source header intact. Its full check
      passes; repeat packed byte calls on this exact graph before committing, and leave gross
      allocation and rival resource parity open rather than treating retention as task closure.
      `owned-v7-production-ranked-bytes.log` reproduces gains on Node Current, Bun and all three
      browser engines; Deno and JITless are unresolved. Both compiled Node and Bun pass timestamp
      boundary and owned-array witnesses. `owned-v7-production-bundled-resource-*` reduces Bun
      caller CPU, retained heap and resident growth in every matched pair, with native profiles.
      Discard `owned-v7-production-resource-*` for attribution: it mixed source and bundled graphs.
      Commit the verified default-byte change; keep the remaining floor/rival resource gaps open.

- [ ] Close the Bun default base64url UUIDv7 slug gap. Compare the complete public call with
      native slug output in the maintained generation corpus, then profile the package call.
      Portable clock, entropy and encoding work may dominate; preset validation may instead
      explain the gap. Native delegation removes the former but not the latter. Reject a
      candidate that loses payload bits, canonical padding, fallback causes or configured controls.
      Repeat the focused comparison before choosing a production change; retain raw pauses.
      `native-v7-slug-next-*` locates sampled work in string construction, clock reads,
      byte generation and encoding, rather than preset validation. The repeated floor comparison
      contains severe pauses; it does not qualify retention. Screen direct native base64url output.
      The direct-native candidate passes Node/Bun payload and fallback tests, and disabling its
      selection fails both exact-output oracles. Primary packed caller-thread CPU favors Bun
      slugs, but control intervals are broad. Isolate configured slug and pair controls with
      longer CPU windows before retention; do not repeat the paused mixed workload unchanged.
      Isolated controls still permit a Bun configured-slug loss; keep qualification open.
      Sequential fixed-call captures reduce retained heap and resident-memory growth relative
      to the portable capture, but do not prove gross allocation parity. Preserve
      `native-v7-slug-candidate-*`; the first concurrent resource captures are invalid comparisons.
      `99b24ce` passes the full check and commit hook. The ranked packed comparison exits zero
      with every requested case and preparation count present; Bun default-slug caller-thread CPU
      improves again, while configured controls remain unresolved. Preserve
      `native-v7-slug-ranked-qualification.log`. Next isolate configured Bun code shape with
      profiles of the unchanged configured call and its baseline: increased wrapper/dispatch work
      supports a source-shape cost, while unchanged stacks and CPU challenge that explanation.
      Resolve that control before another throughput replay or claiming retention qualified.
      Initial fixed-call profiles show no added wrapper samples; sample totals alone are not CPU
      evidence. Record caller-thread and process CPU around the existing unsampled memory pass,
      then repeat equal calls in both orders to distinguish code cost from sampler scheduling.
      Repeated candidate stacks change with inlining, so frame counts do not establish a wrapper
      cost. Exclude CPU captures overlapped by analysis or type checking; run six fresh fixed-call
      pairs sequentially, alternating order, with no competing measurement or verification work.
      Six sequential pairs center caller-thread CPU near parity; their interval still permits a
      small loss. Retained heap rises slightly in most candidate captures, while resident growth
      varies. Preserve `configured-slug-fixed-*`; no added wrapper-cost mechanism is established.
      Stop replaying this unchanged control. Next compare default native slug calls with the native
      floor and qualified rivals, including retained memory; the configured small-loss limit stays open.
      Repeated default-slug floor screens favor the package call, but the corpus has no rival
      UUIDv7 slug rows. Compose existing qualified rival generators with the already witnessed
      native encoders, then compare complete calls and memory before declaring rival parity.
      `native-slug-rivals-current-*` includes text, fresh bytes and reusable-buffer compositions;
      the package beats the fastest qualified rival in all six Bun processes. Two captures in each
      order also show lower caller CPU, retained heap and final resident memory against that rival,
      but not gross allocation parity. Preserve `native-slug-resource-*`; extend qualification
      to Node Current before targeting another production mechanism.
- [ ] Qualify Bun native default UUIDv7 text with equal executed preparation instead of elapsed
      warm-up alone. Add an opt-in call count to the existing profiler, then revisit the preserved
      import-selected candidate: prior explicit-time controls lacked preparation counts, and a
      current Node observation executes only 128 warm-up calls during 111 ms elapsed. Preserve
      all controls and raw pauses; reject a reproduced configured-call loss after matched work.
      Matched primary CPU observations favor Bun default and uppercase text; isolated configured
      controls center near parity but still permit small losses. Ranked and LTS captures do not
      resolve a slowdown. Full checks and native-selection mutations pass their intended oracles.
      Six fresh rival processes favor the candidate against every qualified library; native-floor
      parity and gross allocation remain unresolved. Preserve `native-v7-matched-*` evidence.
      Retain the tested code independently of the held public-document patch. Keep native-floor
      and rival RSS gaps open; next profile Bun slug generation rather than smaller text changes.
- [x] Compare equal-call Bun default text resource profiles with qualified `uniku` text using
      the existing generation corpus and Bun memory profiler. Native generation may move cost
      into unobserved runtime storage; lower throughput cost alone does not settle that risk.
      Reuse the corpus's qualification and output oracle. Retained heap, allocator commitment
      and sampled stacks can expose a resource loss, but cannot establish gross allocation parity.
      `native-v7-qualified-resource-*` shows lower CPU and retained heap for native package text,
      but higher RSS than `uniku`; portable package text has still higher CPU, retained heap and
      RSS than native text. These captures do not establish gross allocation or resource parity.
- [x] Screen removing repeated range validation for generator-owned explicit-time text scratch. The same
      fixed storage already bypasses validation for current-time text; caller-owned output must
      retain all range and atomic-failure checks. Prove both paths in the existing Node/Bun cases,
      then compare complete explicit-time calls with default text, bytes and slugs as controls.
      Reject the change: `explicit-scratch-range-packed.log` shows no useful primary-host gain.
      Both guard mutations fail the existing invalid-offset oracle; keep caller validation intact.
- [x] Record actual warm-up calls and caller-thread CPU in the existing profiler before another
      source comparison. Elapsed wall time alone cannot show equal engine preparation under
      interruption; use the observations to decide whether warm-up differs, not to assert readiness.
      Direct Bun and compiled Node runs emit both observations. Node explicit-time warm-up runs
      only 128 calls despite 111 ms elapsed, with 405 µs caller-thread CPU; do not treat its timing
      as prepared-engine evidence. The full check exits zero; earlier captures remain unexplained.
- [ ] Finish guidance repair before resuming the pending production candidate: audit Markdown
      contract owners for invented guarantees, stale qualification and instructions invisible at
      the decision point. Public documents require explicit approval; propose their exact edits.
      Exclude `fastv7` from competitor rankings while retaining informational measurements.
- [ ] Finish the active native Bun UUIDv7 text candidate before reopening formatter experiments.
      Keep default selection lazy and configured options inline. Shared native handling slowed
      Node defaults; extracting configured options increased Node explicit-time wall and CPU cost.
      Both Node optimization captures inline public and delegated generation; they do not support
      lost caller inlining as the cause. Do not use trace-enabled timings as performance evidence.
      Repeated packed calls favor Bun default and uppercase text. The expanded comparison's
      owned-byte wall loss is not resolved in the isolated control; CPU intervals cross parity.
      Isolated Node default and explicit-time controls remain unresolved, not equivalent.
      Do not repeat inconclusive timing unchanged. The earlier five-call replay
      favors Bun text but exposes Bun slug wall loss and Node explicit-time CPU loss; neither
      establishes regression-free controls. Keep `native-v7-inline-current-load.log` as partial
      evidence: selected-generator text was omitted. Every filter term must match before timing.
      Resolve those losses with a distinguishing profile or a usable execution environment;
      do not widen the matrix or infer parity from an interval crossing no change.
      Identical-baseline controls also show a small Node explicit-time CPU difference with a wide
      interval; they weaken attribution to the candidate, not establish parity. Keep the raw
      `native-v7-identical-baseline-controls.log`. Equal-call Bun slug profiles locate the same
      portable clock, entropy, byte-writing and base64url work; they expose no added native
      default work. Keep `native-v7-slug-*-profile/`; sampled stacks do not prove cost equality.
      Trust proper native output directly; do not restore the removed validation helper.
      Return native fallback errors unchanged; the public default call alone owns the throw.
      Replace the capture-free native selection closure with one named function; cache selection
      in the existing public default slot. Require the native/absent/failure tests, initialization
      counters and complete-call controls before retaining this smaller shape.
      The named-function comparison cannot qualify retention: Bun explicit-time and selected-
      generator calls show losses, while owned-byte observations vary widely. Preserve
      `native-v7-named-default-controls.log`; do not repeat this setup or claim control parity.
      Use the existing workload corpus for a fixed-call, same-process ABBA screen before another
      packed replay. Identical-baseline blocks also alternate owned-byte CPU cost with order;
      this falsifies attributing that pattern to the candidate. Shared-process results do not
      establish packed parity or an allocation mechanism. Keep both interleaved raw logs.
      Fold the forwarding native function into its helper: retain one lazy selected call,
      direct native delegation and exception fallback, with configured handling unchanged.
      The folded native boundary and full check pass. Keep `native-v7-folded-candidate.patch`
      and its interleaved screen; require the packed controls before retaining the cut.
      Both folded packed replays favor Bun default text. Uppercase and control uncertainty
      remain open; keep `native-v7-folded-packed-controls.log` and `native-v7-folded-packed-repeat.log`.
      Use `native-v7-folded-profile/` for the current complete-call profile, not an older source form.
      Measure preset initialization before the first UUID-plus-slug call: prior pair setup
      hides unnecessary portable generator construction. Reorder the existing resource witnesses
      without adding cases. The intact native and portable paths pass; injected portable setup
      fails the native cold-count assertion. Keep `native-v7-cold-preset-*` evidence.
      Keep raw comparisons and exact candidate source in `bench/reports/native-v7-inline-*`.
      Use the prepared README/security patch for approval; public text remains held.
      Native text profiles and counters show replaced portable generation and formatting without
      temporary arrays. Retained heap and sampled stacks do not prove total allocation or parity.
      Matched default-text captures in both orders disagree on retained heap, RSS and committed
      memory growth. Keep `native-v7-folded*-profile*` captures;
      neither page totals nor retained heap measure gross native allocation per identifier.
      Measure memory before CPU sampling; retained profile records otherwise enter the workload
      snapshot. The separated captures in both orders favor native retained heap growth;
      keep `native-v7-memory-separated-*`. Record each pass's calls and require snapshots to
      exclude CPU sample records. Gross allocation and complete-call control parity stay open.
      Isolate explicit-time generation in fresh packed Node/Bun processes before repeating the
      mixed corpus. A persistent loss requires correcting its public-call boundary; a bounded
      no-loss result clears that control only, not the other cases or their mixed warm-up effects.
      The isolated replay separates Bun wall time only; Bun CPU and both Node measures remain
      unresolved. Keep `native-v7-folded-explicit-time-isolated*`; the run does not clear this control.
      Worker-only controls distinguish thread CPU from process CPU on Node and Bun. Retain
      both totals in the existing driver: the isolated packed thread intervals narrow the
      uncertainty but do not clear explicit-time parity. Keep `native-v7-folded-thread-cpu-controls.log`.
      Longer complete-call observations reproduce Bun default and uppercase thread-CPU gains,
      but Node explicit-time and Bun selected-generator intervals still permit losses. Keep
      `native-v7-folded-thread-cpu-longer-*`; reject further equivalent timing replays.
      Resolve the shared public-call boundary without adding work to portable or configured calls;
      prove capability selection through fresh imports rather than late test-only replacement.
      Select native capability at import without a draw or portable setup; restore the previous
      lazy public body. Fresh-import boundary cases pass on both hosts, and disabling selection
      fails their native-result oracle. The packed comparison preserves both Bun text gains but
      separates an explicit-time thread-CPU loss; keep `native-v7-selected-at-load-controls.log`.
      The isolated explicit-time comparison remains unresolved; keep
      `native-v7-selected-at-load-explicit-time-isolated.log`. Reject this source form rather than
      replaying it again: configured parity and total allocation are not established. Preserve its
      source patch and fresh-import fixture in `native-v7-selected-at-load-rejected.patch` and
      `native-v7-capability-fixture.ts.txt`; production keeps the previously retained implementation.
      Reject it if repeated complete calls show a material primary-call regression, resource
      costs grow without a requested benefit, or a published contract fails. Preserve configured
      generators and the native-absent path; do not infer their behavior from native success.
- [ ] Resolve the current Bun default UUIDv7 text gap first. Reuse the existing complete-call
      observations and profiles; refresh only evidence that cannot decide the current choice.
  - [ ] Evaluate native Bun UUIDv7 text for ordinary defaults without timestamp repair; retain
        created-generator controls for explicit ordering, clock and layout requirements. Prove
        native success, absence, malformed output, fallback and dual failure before timing;
        compare repeated complete calls and resources, then propose any consumer-document changes.
  - [ ] Remove drift-only disqualification from benchmark ranking and stale implementation
        comments before evaluating native defaults. Preserve drift measurements, secure-entropy
        qualification and published-contract checks; verify the actual generated report.
      Compare the package, same-output native floor and qualified rivals with matching output,
      entropy and ownership. Keep native contract failures visible without adopting them.
- [ ] Identify the largest removable cost in that call before choosing another implementation.
      Inspect the package and faster implementations; separate clock/sequence, secure entropy,
      intermediate byte writes, formatting and required returned-string allocation. Use the
      existing profiler and the smallest causal substitution that distinguishes live explanations.
      Sampling a hot function does not identify an expensive expression; timings of separate
      components do not establish the complete call's lower bound.
  - [x] Isolate native string conversion with UTF-8 and ASCII decoding of the unchanged UUID
        character buffer. UUID output contains only ASCII; preserve every digit, case and offset,
        and require the lost-byte mutation to fail the independent formatter oracle before timing.
        Compare complete Bun/Node generation and conversion, not decoder calls alone. Reject
        negligible gains or primary-call losses before packed replay; count cold construction
        and retained resources if a survivor justifies integration. Keep general Latin-1 scratch
        semantics unchanged. Both native-decoder substitutions slow Bun generation and conversion
        in both process orders; reject them before packed replay. Byte elimination remains open.
- [ ] Select one substantial change from the attributed work. Weigh direct generator-field
      formatting with shared storage, native generation and repair, secure pooled draws,
      default specialization, and their coherent combinations against unchanged production.
      Reuse prior rejection evidence; reopen a mechanism only when a changed premise predicts
      a different observable result. Do not preselect prefix reuse or another dispatch tweak.
  - [x] Compare generator-field formatting with shared character storage and case tables,
        with and without prefix reuse. Eliminate the intermediate byte write/read cycle;
        preserve clock, sequence, all payload bits, uppercase and generic conversion. Require
        lost-tail, stale-prefix and missing-invalidation mutations to fail their intended oracles
        before timing. Keep Node's native-absent generator on the existing path and account for
        construction costs if complete-call gains survive. Reject primary-call losses before replay.
        Tail loss, stale prefixes and missing conversion invalidation fail independent Bun text
        assertions. Intact behavior/resources pass; reject the uncached form's Node slug losses
        and cached form's Bun conversion losses before broader replays. Shared storage alone
        does not resolve these losses; their engine-level cause remains unestablished.
- [ ] Prove and screen that change through the complete public call on Bun and Node Current.
      State the hypothesis, counterevidence, affected contracts and retention decision before
      execution. Include uppercase, slug and owned-byte controls when the change reaches them;
      count added allocation, retained storage, initialization and generator construction.
      Reject a material primary-call loss or a negligible saving before broad replays.
  - [x] Reassess direct Latin-1 string construction against the retained fixed formatter.
        The earlier rejection names a small saving, not a correctness failure or established
        regression. Resolve Node uppercase and Bun byte/slug controls in packed comparisons
        before retaining the Bun text saving. Two packed comparisons reproduce the Bun text
        and conversion saving; other primary-call intervals remain unresolved.
  - [ ] Test direct Latin-1 construction in the Buffer implementation instead of wrapping UUID
        scratch creation. Primary packed gains survive, but the remaining-runtime comparison
        finds a JITless conversion loss; do not adopt the current source form. Keep the portable
        formatter unchanged and avoid a second scratch-wrapper object. Prove absent-method
        behavior, construction resources and affected-call profiles; native parity stays open.
    - [x] Prove requested batch counts reach packed host and browser measurements and use
          one median per fresh process. The same-revision Node/Bun/Chromium control checks
          raw batch counts, process counts and medians independently. Retain raw batches.
    - [ ] Establish a default-text benefit before broadening the Buffer candidate comparison.
          Corrected repeated comparisons reproduce a conversion saving but leave generation
          unresolved; unchanged controls also vary. Equal-call Bun profiles still rank the
          character writer and string construction first. Do not infer a generation gain
          from conversion, a resource gain from retained heap, or an engine cause from samples.
    - [x] Reject whole-buffer Latin-1 reads as unsupported by the current comparison.
          `current-whole-buffer-packed-primary.log` leaves Bun byte encoding, text conversion and
          generation unresolved. Its intact runtime proof did not precede timing, so the replay
          cannot support retention. The lost-byte mutation reaches slug-length and UUID-text
          oracles; it does not qualify the intact candidate. Keep production unchanged, preserve
          the evidence, and do not broaden or repeat this shape without a new decision-changing reason.
- [ ] Retain a survivor only after the existing packed replays, affected-runtime profiles,
      behavior/resource proofs and full check support it. Commit the production improvement
      and obtain approval to record its benefit and limits in `bench/PERFORMANCE.md`; otherwise keep
      the gap open and choose a different attributed mechanism.
- [ ] Then rank the remaining open generation, parsing and conversion gaps by ordinary-call
      importance, runtime rank, measured avoidable cost and expected benefit per implementation
      effort. Keep configured/batch, edge and JITless optimization behind unresolved primary
      Node/Bun work. Preserve their tasks below; priority changes do not erase scope.

For every experiment, name the production decision that each possible result changes. If the
results all leave the next action unchanged, do not run it. Use maintained filters and reuse
builds and observations while their inputs remain valid. Run independent timing processes
sequentially; parallelize only noncompeting preparation and correctness work. If interference
makes a comparison inconclusive, validate the instrument before repeating that comparison.
Do not respond with a wider runtime matrix or another code variant to an unexplained regression.
Resolve the distinguishing question, reject the candidate, or report the precise remaining gap.
Keep only the reasoning needed to choose the next action here; measurements belong in the
performance report. Full correctness gates remain required even when exploratory feedback is short.

## Primary-call hillclimb

Close the researched TypeScript gaps against the fastest equivalent runtime or library result,
with no material speed or resource loss in another primary call. Art's target is a statistically
negligible remaining gap, preferably a reproduced advantage. Failure to detect a difference is
not equivalence: retain independent process observations and bound the remaining effect before
closing a gap. Record measurements, rejected mechanisms and limits in `bench/PERFORMANCE.md`.
Keep one implementation candidate active; screen narrowly, then retain only after packed replays.
Prioritize Bun default UUIDv7 text construction before further counter refinements: the native
gap is larger, and repeated public-call profiles put formatting and string construction first.
Measure the complete caller result before attributing a bottleneck to a component. For each
candidate, state the removable work and its falsifier before changing code; include setup costs
when a faster repeated call adds retained state. A runtime policy is not a physical limit:
keep contract changes reserved for Art, and claim impossibility only with a named bound.

- [x] Isolate source screens and packed comparisons with committed archives instead of Git worktrees;
      the baseline control must execute its owning proofs and every selected timing case.
- [x] Refresh the primary-call baseline from two maintained competitor runs; keep owned-byte,
      Bun default generation, encoding and Deno decoding gaps open, with resource parity unmeasured.
- [x] Attribute current primary UUIDv7 costs before another candidate screen. Preserve each
      native profiler process's completed-call records, follow CPU and allocation parent links
      beneath public calls, and separate harness, startup, GC and unattributed work. Compare
      repeated captures before ranking removable work; sampled allocation is not retained heap.
      Two captures put text construction and clock handling ahead of entropy copying; allocation
      remains beneath scratch-backed generation. Keep its allocating expression unresolved.
- [ ] Isolate clock and sequence allocation beneath scratch-backed generation with a causal
      substitution. Compare required output allocation separately; reject improvements that
      merely relocate samples or regress another primary call. Extend attribution to generation,
      parsing and conversion jobs with open gaps.
  - [x] Compare mutable numeric closure state with fixed Float64 storage while retaining the
        same clock, entropy and sequence transitions. The timestamp mutation must fail both
        owning runtime witnesses before timing. Reject primary-call regressions; if throughput
        survives, compare sampled allocation and generator construction before retention.
        Reject shared retention: Bun gains fail to reproduce. Node owned-byte screens improve
        in all four processes; matched allocation captures reduce sampled sequence-helper allocation
        while byte-generator allocation remains. This identifies a storage experiment, not boxing
        as its cause or native-floor parity.
  - [ ] Isolate counter storage from timestamp and high-water storage. Compare the smallest
        representation that removes sequence-helper allocation, including construction cost;
        preserve every sequence bit and transactional update, and reject other primary-call losses.
        Counter-only Float64 storage removes nearly all sequence-frame sampled allocation in
        two matched Node process pairs. The lost-carry mutation fails Node and Bun ceiling tests.
        Two packed primary-host comparisons leave ordinary throughput gains unresolved; the longer
        repeat resolves slower Node/Bun construction and slower Bun owned-byte calls. Reject shared
        Float64 retention. Compare a 31-bit low / 11-bit high closure counter without added storage;
        preserve the 42-bit value and independently prove carries before measuring allocation.
        Narrow closure screens preserve behavior and counted resources. Node owned bytes improve
        in all four processes, while Bun and Deno results vary. Combined sequence/byte frame
        allocation falls in matched Node captures; one baseline has no separate sequence samples.
        Two packed low31 comparisons leave retention unresolved: the initial Node byte interval
        excludes parity, but the repeat does not. Retained process CPU and wall measurements
        establish lost execution time in the repeat without identifying its host cause.
        Longer packed observations reproduce the Node byte interval but retain substantial
        execution interference. Node LTS and Chromium comparisons remain unresolved; Deno text
        gains need replication. Preserve every observation, bound remaining primary-call and
        construction losses, and measure any runtime dispatch before deciding retention.
        Defer direct narrow-word byte writes until the larger Bun default-text gap is addressed.
        The lost-bit mutation fails both owning runtime oracles; intact screens pass behavior and
        resource checks, but do not establish a reproduced Bun primary-call benefit.
        Uint32 storage raises Node text costs in every screening process and earns no shared change.
- [x] Exercise the package in a local Cloudflare workerd runtime. Prove imports, entropy,
      clocks and representation round trips before adding a maintained correctness lane.
      Validate benchmark timers against a host clock, separate request overhead from identifier
      work, and probe inspector CPU and allocation capture. Compare plain web capabilities with
      Node compatibility; record local-versus-production limits without claiming deployed performance.
      The compiled portable implementation passes the shared corpus in both compatibility modes;
      bounded timing, CPU profiles and sampled allocation work. A zero-duration control fails.
- [ ] Extend local edge evidence to packed consumers and the owning entropy and clock witnesses;
      integrate a correctness-only smoke lane in the existing workflow after those proofs.
      Benchmark the qualified native floors and competitors before choosing any edge-specific path.
  - [x] Isolate the clock wrapper with the maintained inline-clock substitution. Its removal
        leaves generation allocation in matched Node captures, and Bun throughput gains reverse
        or become losses. Keep production unchanged; the wrapper alone does not explain the
        allocation. Preserve callback-failure containment and prove its shared witness can fail.
- [ ] Close Bun default UUIDv7 text and plain-slug gaps: compare trusted-default specialization,
      native output repair and pooled generation without changing timestamp or entropy contracts.
      Use the next production decision above; completed experiments below supply rejection
      evidence, not instructions to repeat rejected candidates.
  - [x] Compare cached native UUIDv7 timestamp repair, conditional and unconditional, with and
        without the captured clock passed to Bun. Prove matching and mismatching prefixes,
        rollback, carry boundaries and payload preservation before timing. Reject the mechanism
        unless repeated complete-call gains survive sustained counter overflow; keep native
        failure fallback and full package adoption as separate, required proof before retention.
        All four lower bounds lose to package text in both bundled and normal Bun source
        comparisons. Reject these repairs before adding validation, fallback or resource studies;
        native parity stays open and this does not exclude different repair mechanisms.
  - [x] Compare direct UUIDv7 text construction with generating intermediate bytes and formatting
        them on Bun. Preserve the shared sequence, clock, entropy-failure and reentrancy behavior;
        keep owned-byte and configured calls as controls. Prove every timestamp, counter and tail
        bit before timing. Retain specialization only for repeated complete-call gains that
        justify its code and retained storage, with no loss on other runtime paths.
    - [x] Prove timestamp/counter carries and tail preservation with independent text encoding,
          walking input bits and targeted mutations. Both runners reject missing tail and
          timestamp fields; Bun also rejects the missing tail in both direct Latin-1 writers.
    - [x] Compare direct character construction, direct Latin-1 construction and paired-code
          lookups while preserving byte elimination. Record preset-text initialization separately
          from warm resource counts. The separate clock function isolates owned-byte controls;
          consider sharing only after a reproduced gain justifies further work. Character
          construction loses Bun text; paired lookups fail to reproduce their apparent gain
          and plain-slug controls lose in the repeat. Keep production unchanged and do not
          fund shared formatter storage from these unresolved throughput observations.
  - [x] Compare cached timestamp repair of native Bun base64url plain slugs with package slug
        generation. Test unconditional and conditional repair with default and explicit native
        clocks. Independently encode patched UUID bytes to prove timestamp carries, rollback,
        version, variant and all payload bits; prove the oracle rejects timestamp and tail loss
        before timing. Treat complete native-generation-plus-repair calls as lower bounds that
        still lack package validation and fallback. Repeat only survivors; reject losses before
        integration, and keep adoption, overflow behavior and resource proof separate.
        Every repaired form loses to the package in every fresh-process comparison before
        validation or fallback. Reject these mechanisms; the native gap remains open.
  - [x] Compare Bun scratch writes at byte, 16-bit and 32-bit widths through complete default
        generation, uppercase generation and byte-to-text conversion. Preserve tables, offsets,
        hyphens and native string construction; account for the added retained DataView and
        measure its initialization cost only if a repeated throughput gain survives.
        Prove the independent formatter oracle rejects a missing final byte before timing.
        Reject inconsistent gains, extra per-call allocation or another primary-call loss.
        The missing-byte mutation fails Bun's independent offset-output oracle. Both intact
        screens pass behavior and counted resources, but neither wider writer produces a
        repeated default-text and conversion gain. The initial 32-bit losses do not repeat;
        reject both candidates without attributing the variation to an engine mechanism.
  - [x] Isolate the default Bun text CPU profile before selecting another overhead candidate.
        Follow sampled parent links beneath the public call to exclude corpus setup and other
        operations. Both captures put text construction ahead of pooled copying; investigate
        fewer formatting writes or native string work before changing the entropy pool for text.
        Coarse sampling does not establish exact costs or justify a production change.
  - [x] Test direct native Latin-1 string construction through ordinary Bun calls.
        The missing-character mutation fails the text oracle; the intact candidate passes
        behavior and counted resources. Reject the small default-call saving, consistent with
        the earlier isolated rejection, rather than adding a closure and optional-method dependency.
  - [ ] Identify a text-construction change that removes a substantial part of the Bun default
        generation gap. Compare existing rejected mechanisms before another screen; test whole
        construction or generation work rather than another small dispatch refinement.
    - [ ] Decide whether fused generator-field formatting can remove the attributed cost
          without duplicate storage or primary-call regressions. Existing prefix-reuse packed
          comparisons leave retention unresolved; source profiles do not explain the Node slug
          loss. Do not resume that candidate without a discriminating observation. General
          byte-formatter prefix comparisons and capability-gated closure creation are rejected
          below; neither establishes the cost of a shared generator-field formatter.
      - [x] Compare capability-gated draw creation with the original generator.
            Behavior and resource proofs pass, but both Node slug orders and Bun byte
            orders remain slower. Reject this refinement as a demonstrated fix; the
            measured screen does not identify the cause of the primary-call losses.
      - [x] Compare prefix reuse inside the existing native byte formatter, sharing its
            buffer and tables. The stale mutation fails independent timestamp and byte
            witnesses; intact behavior and resources pass. Reject both Bun conversion
            losses against the small generation gain. Generator-field formatting remains
            a distinct option; these byte-prefix comparisons do not measure it.
    - [x] Compare prepacked hexadecimal pairs through independent payload witnesses and
          packed calls. Default-generation gains remain unresolved; the small conversion-only
          gain does not justify retention. Keep the larger native-generation gap open.
    - [x] Compare hexadecimal-chunk concatenation and native join over reused string parts.
          Each lost-tail mutation fails the independent payload oracle. Both repeated Bun
          generation screens lose; matching conversion screens also lose without generation
          dispatch. Reject these composed calls; they do not prove a fused generator's cost
          or identify the engine-level cause. Preserve the native gap as unresolved.
  - [x] Compare native UUIDv4 text repaired to UUIDv7 against native UUIDv7, package generation
        and qualified libraries. Preserve all 74 payload bits and the current clock timestamp;
        compare numeric hexadecimal prefixes with fixed character prefixes on complete calls.
        Prove timestamp carries and retained bytes independently before timing. Include secure
        generation and formatting cost; keep adoption and any payload-layout ruling separate.
        Independent byte witnesses pass timestamp carries and both retained payload patterns.
        Two five-process matrices reproduce slower repaired output on Bun, Node and Deno;
        reject both prefix mechanisms. Bun default text leads every measured library while
        its native UUIDv7 floor remains substantially lower. Keep native parity open.
  - [x] Prove the cold resource witness rejects restored duplicate storage: behavioral tests pass,
        then the isolated source experiment fails with two arrays against one on Bun.
  - [x] Retain buffer sharing through two isolated packed replays including generator
        construction, affected presets, explicit instants and unchanged owned-byte controls.
        Node/WebKit slug gains reproduce; focused Deno and LTS controls resolve earlier reported
        losses to uncertain effects around parity. Bun throughput remains unresolved.
  - [x] Profile the surviving buffer-sharing candidate on each selected runtime and verify
        caller-owned storage, native fallback branches and resource costs before closing it.
        Node/Bun/Deno/Chromium native files remain in a separate report directory; Node/Bun
        resource counters and a restored-allocation mutation prove the retained-storage reduction.
  - [x] Screen a small module-default text wrapper against the unchanged combined function;
        isolate wrapper size from known-preset validation, then compare their combination.
        Expect lower complete-call cost without added retained state. Reject unchanged gains,
        configured-call losses or altered preset errors, wrapper normalization and entropy failures;
        preserve the original configured implementation byte-for-byte in the source experiment.
        Both screens favor smaller wrappers for Bun text but slow Node/Deno explicit-time calls.
        Test a cold helper containing only the configured tail, removing the duplicated preset
        branch; retain it only if the primary gain survives without that configured-call loss.
        Reject the refined wrapper: packed Node explicit-time and Deno default/explicit-time
        calls lose, while Bun default-text uncertainty still includes no improvement.
        Both preset and option mutations fail the intended Node and Bun assertions in unique
        report directories. Preserve these proofs; do not use collided report manifests.
  - [x] Compare the surviving thin configured wrapper through isolated packed artifacts on every
        affected engine; reuse the existing paired comparison and its confidence bounds.
        Extend it to consume maintained source candidates without changing the shared production
        tree. Reject reproduced configured or primary-call losses; do not infer retention from
        source bundling, noisy controls or an unavailable clock ruling. The complete paired
        comparison rejects retention; keep the production wrapper unchanged.
  - [x] Compare direct fixed writes with Bun's indexed UUID-text loop through complete default
        generation and ordinary byte-to-text conversion. Keep case tables, storage and native
        string construction unchanged so the experiment isolates indexing work. Reject it if
        gains do not repeat, uppercase or offsets break, or another primary call loses. Prove
        the last output byte reaches Bun's independent formatter oracle; Node checks preserve
        its unchanged selected formatter. The mutation fails Bun's offset-output assertion.
        Two source screens favor Bun text and conversion with unchanged counted resources;
        both packed replays reproduce Bun default text and byte-to-text gains. Firefox's
        conversion loss does not repeat; the focused browser comparison also does not reproduce
        WebKit's uppercase parsed-writer loss. Retain fixed writes; profiles cover Node, Bun,
        Deno and Chromium, with fresh Node/Bun behavior checks. Overall native parity stays open.
  - [x] Compare caching the existing detached scratch draw with repeated generator lookup in
        default slug and paired generation. Preserve text delegation, buffers, selected generators
        and explicit-time behavior; add no generator method. Reject a lost entropy byte through
        the owning Node/Bun oracle, then screen full calls and counted resources in both orders.
        Retain only after repeated packed gains without another primary-call loss.
        Existing created-generator payload checks let the module-default lost-byte mutation pass;
        secure-source tail-bit checks must exercise both slug alphabets and paired output before
        timing. Discard the mutation's green screen as evidence of preservation.
        The new case passes unchanged production and rejects the mutation on Node and Bun.
        Two intact screens pass behavior/resources but Bun default slug and pair gains reverse
        in the repeat. Reject caching; preserve the current generator lookup.
- [ ] Resolve Bun owned UUIDv7 byte parity and close Deno's gap against qualified libraries; measure
      allocation, secure-source work and sequence costs over the complete returned result.
      Fresh Bun owned-byte comparisons change direction around parity; do not use the older
      clear loss to prioritize another byte rewrite ahead of the remaining native text gap.
  - [x] Compare one unaligned four-byte DataView read and erase with individual pooled byte
        reads and erasures. Preserve lazy initialization, byte order, unaligned reseed offsets,
        erasure and refill failures. The lost-byte mutation must fail Node and Bun before timing.
        Reject inconsistent complete-call gains or another primary-call loss; measure the
        retained view and cold initialization only if repeated throughput gains survive.
        Both runtimes reject the lost-byte mutation. Bun's repeat raises owned-byte and slug
        costs in both process orders; reject the retained view before packed replay.
  - [x] Compare one exact 42-bit Number counter with split high/low words; preserve fractional
        layouts, transactional entropy failures, rollover and writer bytes. The widened-overflow
        mutation must fail the ceiling oracle before timing. Reject inconsistent primary-call gains;
        compare packed configured calls only after repeated Node/Bun/Deno screens survive.
        The widened-overflow mutation fails the shared Node/Bun witness. Focused Bun slug gains
        do not survive the packed comparison; reject the rewrite without claiming a resolved loss.
        Repeated owned-byte rival comparisons preserve Bun's uuid and Deno's uuidv7 gaps.
  - [x] Compare fixed four-byte pool copying and a separate source cursor against the current
        indexed copy-and-erase loop. Preserve lazy draws, all bytes, erasure, refill failures
        and resource counts. The lost-fourth-byte mutation must fail the shared runtime oracle
        before timing. Reject inconsistent full-call gains or v4/text/slug losses; replay packed
        consumers only after a repeated focused gain survives.
        The lost-byte mutation fails both runtime witnesses. Two packed seven-runtime replays
        reproduce Node owned-byte gains; the focused LTS comparison agrees. WebKit's one resolved
        byte loss reverses in its focused replay. Retain fixed stores with unchanged storage and
        entropy counts; preserve the indexed alternative for future runtime reviews. Native profiles
        cover Node, Bun, Deno and Chromium. Bun/Deno byte parity and total allocation remain open.
  - [x] Compare fixed sixteen-byte copying and erasure through complete owned v4/v7 draws.
        `current-bun-owned-v4-profile` includes pooled copying beneath the public owned call;
        a fixed-width path may remove loop work, or allocation and entropy may erase its benefit.
        Require lost-output and lost-erasure mutations to fail both owning runtime lanes before
        timing. Preserve lazy refills, all entropy bits and every other draw width. Reject absent
        repeated Node/Bun gains or another primary-call loss before packed/resource qualification.
        Both lost-byte and lost-erasure mutations fail Node and Bun; intact owning lanes pass.
        Packed primary and other-runtime reports reproduce owned-byte gains. Equal-call Bun
        resource pairs lower caller CPU and final RSS. WebKit slug loss in the broader replay
        becomes unresolved in `current-pool-sixteen-webkit-loss.log`; do not retain while that
        trade-off remains unresolved. The separate helper passes both mutation and intact lanes
        but raises Bun owned UUIDv7 byte cost in both source-screen orders; reject the extra call.
        `fixed-sixteen-blocks` reduces iterations with four-byte blocks and a smaller body.
        The larger body may change continuation optimization, or the extra branch may cost slugs.
        Require both mutations and intact lanes before timing; reject absent Node/Bun gains
        or repeated slug losses before retention. The block source screen preserves byte gains,
        but `current-pool-blocks-packed-primary.log` contains wide primary-runtime variation.
        Isolate slugs without preceding allocation workloads: persistent loss supports a copier
        cost, disappearance weakens it and leaves prior-work conditioning unresolved.
        `current-pool-blocks-isolated-slug.log` does not reproduce the mixed loss on Node, Bun
        or WebKit; this weakens copier attribution, without proving parity.
        Isolated byte gains survive on Node and Bun; Bun caller CPU and resident growth improve
        in all equal-call pairs, while heap effects vary. Remaining engines expose a JITless
        owned-v4 slowdown in `current-pool-blocks-packed-other.log`; reject universal selection.
        `fixed-sixteen-block-offset` computes the source offset once per block and omits zero
        additions. Reduced arithmetic should remove interpreter cost; absence of a repeated
        JITless benefit rejects this refinement. Reprove both mutations and intact lanes.
        Both mutations fail their intended Node/Bun assertions and intact lanes pass.
        `current-pool-block-offset-jitless.log` reproduces a byte gain; requalify primary and
        remaining runtime calls, equal-call resources and native profiles before retention.
        `current-pool-block-offset-packed-primary.log` separates Node owned-v4/v7 and Bun
        owned-v4 gains; other primary calls remain unresolved. Compare equal-call Bun owned-v4
        CPU and retention next: worse resource use rejects a throughput-only improvement.
        `current-pool-block-offset-resource-*` lowers Bun caller CPU in each matched pair;
        resident growth increases in two pairs and final RSS varies. These captures include
        initialization and do not establish allocation parity. Keep retention open; a repeated
        primary-call loss on the remaining runtimes rejects this candidate before further profiling.
        `current-pool-block-offset-packed-other.log` preserves byte gains but separates WebKit
        slug/pair losses and a small Chromium text loss. Isolate each affected call without
        preceding allocation work: persistence rejects the candidate; disappearance leaves the
        mixed-workload attribution unresolved rather than proving the candidate harmless.
        Extend the existing Bun memory owner with opt-in counted warm-up before its snapshots.
        Compare the same draw count after equal preparation: a retained-memory loss that persists
        rejects retention; disappearance separates initialization from repeated-call cost.
        The isolated WebKit slug/pair and Chromium text comparisons do not reproduce their
        mixed losses. `current-pool-block-offset-warm-resource-*` preserves lower Bun caller
        CPU in every pair while resident and heap differences change direction; no repeated
        retained-memory loss is established. Qualify Node LTS and selected native profiles next.
        `current-pool-block-offset-packed-lts.log` separates byte/text-v4 gains but a UUIDv7
        text loss after preceding allocation work. Isolate that call before deciding retention.
        `current-pool-block-offset-isolated-lts-text.log` does not reproduce the mixed text loss.
        Apply the exact proved block copy provisionally; retain only after fresh complete checks
        and native profiles of its selected runtime graphs. Competitive byte parity remains open.
        `current-pool-block-offset-native/` contains successful Node, Bun, Chromium and Deno
        compiled captures; `deno-source.jsonl` separately measures the normal TypeScript entry.
        The production copy span matches the proved candidate byte-for-byte. Hold the exact
        public performance-document update for approval; finish the fresh complete check before
        committing production and the updated candidate controls.
        The fresh complete check passes after formatting the narrowed candidate control.
        Retain the exact proved production copy; no retained storage or per-call views are added.
  - [ ] Obtain approval for the exact `bench/PERFORMANCE.md` update: qualify its final four-byte
        retention paragraph to include sixteen-byte blocks, and record the packed comparisons,
        isolated controls, counted warm-up resource captures and native/source profile limits.
  - [x] Strengthen the existing distinct-byte pooled-draw oracle for sixteen-byte, unaligned
        draws. `current-pool-duplicate-output-oracle.log` rejects the duplicated output byte
        only at that oracle in both Node and Bun; uniform refill/erasure cases remain green.
  - [x] Profile the exact module-default owned-byte call before choosing another substitution;
        separate setup from samples beneath the public generation frame, inspect allocation
        and entropy evidence, and compare the observed costs with the faster rivals' mechanisms.
        CPU and heap captures include Deno source separately from compiled output. Wrapper/body
        samples support a default-dispatch experiment but do not isolate each check or establish
        allocation parity; rivals also return fresh arrays. Keep ownership unchanged.
  - [x] Compare the existing private owned-byte draw with default generator option dispatch;
        screen direct lookup and a cached reference separately. Preserve fresh plain-array
        ownership, all tail bits and configured calls. The lost-byte mutation must fail the
        module-default Node/Bun oracle before timing; retain only repeated complete-call gains.
        The module byte case rejects a pinned tail in both runners. Direct lookup's Bun gain
        reverses in the repeat; cached-reference effects vary on Node and Deno. Neither earns
        a shared change or packed replay; preserve the default method and configured cache.
  - [x] Screen bounded clock validation: after truncation, a nonnegative value below the
        48-bit ceiling needs no separate safe-integer check. Preserve callback type checks,
        negative fractions and entropy state. The overflow mutation must fail the clock oracle
        before timing; reject inconsistent byte gains or text/slug losses before packed replay.
        The shared clock case rejects overflow on Node and Bun and preserves caller storage.
        Both screens leave byte gains inconsistent and the repeat raises Bun text costs;
        reject the substitution before packed replay and keep the owned-byte gaps open.
  - [x] Require fresh plain-array ownership in allocated-generation comparisons, prove rejection
        of Buffer and repeated backing storage, then repeat the owned-byte matrix before ranking.
        Fixed-input decoding already checks this distinction; generated rows must check it too.
        The new check rejects the existing Bun native Buffer row despite its floor-only comment;
        keep it timed and rejected, and compare three native copying methods with owned results.
        Fresh-array fixtures pass; Buffer and shared-backing fixtures fail. Two five-process
        ownership-checked matrices still show Bun trailing uuid and Deno trailing uuidv7;
        keep both production gaps and total resource comparisons open.
      Screen `owned-range-zero`: skip range validation only for package-owned fresh 16-byte output
      at zero offset; reject the candidate if unchanged text/slug calls lose or byte gains fail to repeat.
      Reject the shared candidate: both Deno byte screens lose and Bun text costs rise; keep its
      source substitution for reproduction rather than changing production from Node byte results alone.
- [ ] Close Bun default UUIDv4 text and plain-slug gaps without weakening native-failure fallback.
  - [x] Inline native text handling into its existing public function without changing preset
        normalization or fallback. Compare unchanged failure recognition with a successful-string
        check to isolate helper placement from recognition cost. Prove trusted-native fallback
        with a targeted mutation before timing; keep portable and byte calls as controls and
        require packed preset and failure-path evidence before retention.
        Source repeats and packed comparisons reproduce Bun default-text gains for the combined
        change. Recognition alone fails to reproduce the Bun gain and is rejected.
        The focused packed repeat does not reproduce WebKit's earlier loss, but its interval
        still allows a small regression. Native profiles, equal-call collected-heap observations
        and direct text counters support retention. The LTS comparison leaves all selected cases
        unresolved and supplies no demonstrated regression or equivalence.
    - [x] Retain importable UUIDv4 candidate modules in the existing source runner and collect
          sequential Bun and Node CPU profiles with adjacent completed-call counts in both orders.
          Exclude captures launched without waiting for each exit. Node selects portable generation;
          Bun's changed wrapper is reached. Frame removal alone does not establish saved cost.
    - [ ] Resolve packed startup and total allocation parity against qualified references; the
          equal-call memory comparison measures collected heap, not gross allocation.
      - [x] Compare exact Bun `v4.string` and `native.v4.string` through equal warmed call windows
            in reversed process order. `current-v4-native-floor-exact-{0,1,2,3}-*` records one
            selected case per capture. First-window package CPU is higher; later windows overlap
            and committed memory does not grow. The captures do not isolate a persistent wrapper
            cost or establish total allocation or packed startup parity. Exclude the earlier
            non-exact `current-v4-native-floor-{0,1}-*` captures: their recorded case sets differ.
            Keep the native floor gap open; prioritize a larger attributed complete-call cost.
    - [x] Add UUIDv4 text resource witnesses and prove the native text path is reached with a
          result-preserving temporary-buffer mutation before production integration.
- [ ] Measure the module-default UUID-plus-slug call against one draw followed by both conversions;
      remove internal option allocation or repeated validation only when complete-call evidence supports it.
      Primitive presets bypass the option record; both all-runtime packed replays improve Node,
      Bun, Chromium and Deno defaults. Native profiles cover all presets and controls. Resolve the
      second replay's unchanged Node control losses before closure; Firefox and WebKit default effects
      remain unresolved. Preserve selected-generator behavior.
      `current-default-pair-draw-ranking.log` does not establish a composed-call advantage:
      direct pairs lead on Node, Chromium and Deno; Bun remains close. Reject rewriting the pair
      draw from that comparison; separate public conversions can conceal an internal difference.
      Preserve explicit generators, instants and immutable layouts.
  - [x] Recompare default Bun pairs with one owned-byte draw and both public conversions after
        block copying. A repeated composed-call gain supports inspecting the pair's sequence
        work; parity or a direct-pair lead rejects that rewrite before adding a scratch path.
        All three `current-bun-pair-draw-after-pool-*` screens favor the composed call.
  - [x] Profile those exact two Bun corpus calls after equal counted preparation and with equal
        completed calls. Sequence-frame CPU supports reusing the independent draw for borrowed
        defaults; formatting or wrapper cost instead selects its owner. Keep configured generator
        layouts, reentrancy, clock errors, entropy failure and pair consistency unchanged.
        `current-bun-pair-fixed-*` completes every equal-count memory and sampling pass.
        Composed calls reduce caller CPU but raise process CPU in every pair; sampling totals
        reverse the unsampled ranking. Frames identify different draw stacks, not sequence cost
        in isolation. Do not retain public-call composition or claim combined resource improvement.
  - [x] Screen the existing independent owned-byte writer for default slug and pair draws.
        Keep configured draws and owned-byte defaults intact; compare default pairs and base32hex
        slugs with unchanged text and owned-byte controls. Removing sequence work may help, while
        fresh-array allocation or entropy copying may erase it. The borrowed buffer also serves
        configured draws; independent reuse would add coordination, so measure the existing
        owned writer before building that mechanism. Reject on lost payload bits,
        wrong clocks, mismatched pair output, changed failures, or absent repeated complete-call
        gain; only a survivor earns packed and equal-call resource comparisons.
        The extracted keyless owner preserves every existing output and anchor failure.
        Both runtime lanes reject lost-byte and pair timestamp mutations. The resource check's
        exact initialization count rejects a lower view count after its upper-bound check passes;
        delete that duplicated evidence and retain every allocation ceiling.
        `current-independent-default-owned-resource-ceiling.log` reaches the repeated pair and
        rejects its fresh byte array. Reject this mechanism before timing and remove its fixtures;
        the source and mutation proofs remain in `candidates-keyless-*` captures.
  - [x] Screen independent default draws inside the existing text-generator guard and buffer.
        Keep created generators and explicit instants on their existing sequence paths. Reuse the
        timestamp writer without a fresh per-call array or duplicate guard. A new branch can slow
        configured calls, and full entropy draws can erase sequence savings; include those controls.
        Reject on payload, clock, failure, reentrancy or allocation regression before timing;
        require repeated complete-call gains and matched resources before production retention.
        `current-independent-default-text-packed.log` contains every selected Node and Bun call,
        with independent paired processes and the requested batches. Pair gains survive packing;
        configured controls remain unresolved. Lost-prefix, lost-tail and lost-clock mutations
        reach their intended oracles before timing. Retain no production substitution yet.
  - [x] Check whether native memory keeps growing across equal-call windows.
        `current-independent-default-text-fixed-*` and `current-independent-default-text-memory-repeat-*`
        show lower caller CPU and retained heap for pairs, but committed-memory growth conflicts.
        `current-independent-default-text-windows-*` brackets equal successive windows without
        retained sample records. Committed memory stays fixed after the first window in every
        process; process CPU gains persist. This rejects recurring committed growth under this
        workload, not a startup-memory difference. Keep the allocation ceilings unchanged.
  - [x] Qualify independent text draws across ranked runtimes, stopping on a material loss.
        Compare packed default calls and configured controls; reject a material normal-call loss.
        Existing primary-runtime gains and bounded memory growth justify this next comparison,
        but neither establishes portability, fallback behavior or complete resource parity.
        `current-independent-default-text-secondary-packed.log` rejects universal selection:
        ordinary Node LTS and Deno calls regress while Chromium pairs improve. The higher-rung
        losses decide rejection without JITless timing. Remove the universal fixtures and routing;
        keep the private-buffer payload oracle and complete-call controls.
  - [x] Screen Bun-only independent text draws through the private runtime selection boundary.
        Prefer a selected module constant that optimizers erase on other hosts; do not infer
        this policy from an unrelated native capability or expose a new caller option.
        Require unselected packed graphs to retain the original draw, unchanged configured calls,
        matching allocation ceilings and repeated Bun complete-call gains before retention.
        `current-bun-independent-text-screen.log` passes behavior and resource proofs; prefix,
        tail and clock mutations reach their intended Bun failures. The archive-restoration
        test rejects a type-valid mutation that retains a previous runtime policy.
        `current-bun-independent-text-packed.log` preserves Bun pair and base32 gains, but Node
        default and composed pairs slow down despite disabled selection. The isolated repeat
        `current-bun-independent-text-node-pairs-repeat.log` does not reproduce either loss;
        every selected comparison remains unresolved. `current-bun-independent-text-secondary-packed.log`
        leaves Node LTS and Deno unresolved but finds small Chromium uppercase and pair losses.
        `current-bun-independent-text-chromium-repeat.log` does not reproduce those losses;
        its intervals still admit small losses. The source screen's compiled Node graph retains
        the false policy and disabled branch. `packed-source-Eyyzkp` contains the measured tarballs
        and named-root pair consumers: Bun and esbuild both retain the disabled per-draw branch.
        Reject this selection shape; benchmark uncertainty does not prove zero cost on unselected hosts.
  - [x] Screen selecting the Bun text state updater at generator construction, outside the draw body.
        Keep the original sequence updater on unselected hosts and configured generators; retain
        the existing guard, byte writer and entropy storage. Changed call targets and state writes
        can erase Bun's gain. Require prefix, tail and clock mutants to fail before timing;
        reject a repeated complete-call loss or resource regression before packed qualification.
        `current-bun-independent-step-prefix-proof.log` passes the intact behavior proof and
        rejects the prefix mutation. Its tail and clock proof logs reject their intended defects.
        `current-bun-independent-step-screen.log` has sharply changing baseline controls, so it
        cannot settle throughput. The retained modules' `current-bun-independent-step-replay-*`
        records repeat slower base32 pairs in both candidate processes; formatter controls stay
        stable. Reject this shape before packing or profiling. Remove its fixtures, policy-only
        source substitution machinery and retired restoration test; retain the measured archives.
        Keep all production performance tasks open until a qualified change reaches production.
- [x] Screen the argument-free UUIDv7 value call without its empty options record and absent-field
      readers; preserve the owned bytes, immutable value, payload layout and thrown entropy failure.
      Require the lost-throw mutation to fail both runtime tests before timing. Compare the full
      value call twice with explicit-time value and owned-byte controls; replay packed consumers
      and profiles only if the gain survives.
      The lost throw fails both runtime oracles. Packed early-branch and split-helper calls raise
      configured Node costs; reject both despite default-call gains. Shared field consumption
      now covers host, browser and Bun memory profiling; older shape-only rows do not prove that job.
  - [x] Compare a shared frozen empty record without changing public generation control flow;
        include generator and codec values and both masked alphabets because they share the reader.
        Reject any primary-call loss; one record must not retain caller data or become mutable.
        Both screens pass behavior/resources but codec-value costs rise in three of four Bun
        processes and Node effects vary. Reject the record before packed replay; retain no
        production substitution. Phase 4's complete value comparison and resource goals stay open.
- [x] Add equivalent slugid and short-uuid conversion comparisons to the existing matrix;
      inspect their implementations, match alphabets and ownership, and exclude setup from per-ID calls.
      Compare canonical v4 conversion against slugid; retain short-uuid's numeric radix-64 spelling
      as a separate measured alternative, because the same alphabet does not give the same wire output.
      Two fresh-process matrices reproduce lower canonical conversion costs against slugid across
      the ranked runtimes. Numeric short-uuid costs remain separately measured; resource parity stays open.
- [ ] Close Bun base64url encoding and Deno owned decoding gaps; compare native conversion with
      full validation and plain Uint8Array ownership rather than an incomplete Buffer-only floor.
  - [x] Reject native base64url selection at the validated plain-conversion boundary.
        `current-native-plain-boundary-screen.log` passes runtime, resource and native-capability
        proofs before timing; corrupted output fails its independent byte oracle. Both Bun orders
        improve byte encoding but slow base32hex byte conversion, while UUID-text conversion does
        not improve. Keep the shared production encoder; preserve source and samples in
        `candidates-plain-conversion-czgKTo`, with no rejected fixture or routing left to maintain.
  - [x] Screen Bun native plain encoding with an early branch and module-selected dispatch;
        both pass payload, absence, native-throw and resource proofs, and the corrupted-output
        oracle fails as intended. Two independent host screens leave conversion and pair gains
        inconsistent; module dispatch raises Bun base32hex cost. Keep production unchanged.
  - [x] Compare fixed base64url block writes with Bun's indexed loop through complete default
        slug generation, validated conversion and paired output. Keep tables, buffers, entropy,
        masking tails and native string construction unchanged. The independent payload oracle
        must reject a lost output byte before timing. Reject inconsistent gains, added resources
        or another primary-call loss; retain only after repeated packed comparisons.
        The byte mutation fails Bun's independent encoder oracle. Both source screens pass
        behavior and counted resources, but the repeat reverses the default-slug gain in one
        order and conversion/pair effects vary. Reject fixed blocks without a packed replay;
        keep the smaller production loop and the overall slug gap open.
  - [x] Compare owned Deno decoding against native arrays, writes and Buffer copies;
        two ownership-checked matrices favor the package on Deno. Buffer-only results remain
        faster but do not supply the promised owned array; total resource parity stays unmeasured.
  - [ ] Compare Deno decoding resources against the equivalent native methods; retain the
        current decoder unless another complete, owned result reproduces a worthwhile advantage.
        Two shared resource captures preserve exact bytes and fresh arrays. Compiled Deno
        decoding uses less measured CPU per timed call than native arrays, native writes and
        Buffer copies; sampled allocation remains insufficient to close total resource parity.
        Repeat on Deno's normal source entry and isolate equal-call allocation before closure.
  - [x] Exclude Buffer-only slug decoding from equivalent-result ranking while keeping it timed;
        require the native copy when comparing caller-private plain arrays, and prove the report
        does not declare the incomplete Buffer result its qualified winner. The five-runtime
        smoke comparison selects only owned alternatives; the incomplete floor remains visible.
- [ ] Measure parsed UUID formatting and slug conversion against direct conversion of the same
      validated private bytes; remove repeated public-boundary work without adding unused representation caches.
      Two complete packed replays reproduce default-text gains across every tested engine and
      cover uppercase, JSON, all inspection fields and both slug alphabets. Node/Bun resource
      gates pass without counted arrays, views or errors; native profiles cover changed methods.
      A focused Chromium replay leaves parsing unresolved around parity and reproduces writer gains.
      Retain the direct writers; comparison against alternatives and total allocation remain open.
      Caller selectors and immutable ownership stay validated.
- [ ] Investigate generation failure-handling friction with executable caller examples; preserve
      the approved default/configured distinction and submit any consumer-visible alternative for Art's ruling.
- [ ] Compare primary-call resources and import costs against qualified alternatives through the
      maintained profile and resource owners; keep unmeasured axes explicitly open.
- [ ] HELD outside this effort: secondary guard, timestamp and caller-buffer optimization.
      Resume only if the maintainer explicitly reopens those scenarios.
- [ ] Reconcile every retained change with owning comments, declarations and consumer docs;
      run full checks once for final delivery and commit each completed part with targeted intermediate checks.
  - [x] Correct README's ambiguous-slug guidance to match the existing mask-first contract;
        execute the dual-valid consumer test and preserve explicit source selection advice.

- [x] Consolidate useful source experiments into the maintained benchmark harness, prove complete
      measurement output and isolated substitutions, preserve raw evidence, and document rerunning.

## Identifier integrity repairs

Restore lossless conversion, immutable UUID ownership, safe normalization, transactional writes,
typed failures, and version-aware consumer types without changing issued identifiers. Preserve the
native-parity tasks below; they continue after these repairs. Limit active implementation
to one repair group, with verification proceeding on its completed dependencies.
Keep complete routine lanes below five minutes without dropping runtime or artifact coverage;
measure lane durations, isolate timings from competing work, and retain only defect-discriminating checks.

- [ ] Evaluate the reproduced shadowed-length misuse only after the normal writer work: do not retain the shared intrinsic-length experiment without repeated normal-call speed and resource evidence across affected runtimes and tested releases. Restore the unchanged checks if the defense slows or adds resource cost to primary use. Keep supported-format correctness and ordinary invalid-input checks intact; do not expand the unusual-input corpus without a decision-relevant need.

- [x] Reproduce wrapper reentrancy and hostile tags; normalize strings intrinsically and resolve selectors before shared scratch becomes live.
- [x] Reproduce structural codec mutation, malformed bytes, retained storage and throws; isolate private UUID bytes and validate callback results with causes.
- [x] Reproduce uppercase caller-buffer decoding; accept mixed-case base32hex while retaining strict padding and atomic writes.
- [x] Normalize retained codec alphabet options and accept equivalent base32hex sentinels in both languages and migration readers.
- [x] Reject invalid generator presets before clocks, entropy and sequence changes; reject host/class constructor options while accepting cross-realm and null-prototype records.
- [x] Reject malformed offsets, clocks and migration formats without invoking caller coercion hooks.
- [x] Compile positive and negative consumers for known UUIDv4 plain slugs in every UUIDv7-only operation; repair declarations and editor help.
- [x] Preserve Rust enum identity while removing incompatible Borrow<str>; test real collections and update API reports and owning guidance.
- [x] Return fresh decoded arrays without redundant copies; instrument owned conversion allocations and preserve borrowed-input ownership.
- [x] Run regressions against their original mechanisms and isolated mutations; retain restoration copies and verify restoration byte-for-byte.
- [x] Update affected source JSDoc, README and durable contract owners; avoid parallel inventories and unrelated rewrites.
- [x] Resolve Rust API extraction prerequisites, then run complete checks and packed compiler-floor consumers.
- [x] Exercise packed browser and debug/release WebAssembly in every configured browser engine.
- [x] Run repeated packed benchmarks and profiles for affected successful calls across ranked runtimes; record results and limitations in bench/PERFORMANCE.md.
- [x] Audit the full repair diff against baseline e6ab40d47587e032446686ee7dd95a8792ec939e; verify every approved repair, comment and changed line, and commit verified groups without remote writes.

## Maintainer rulings (agents never change these; attack them only by asking)

- Goal, 2026-09-16 (AGENTS.md): every default call (no arguments, or only a text-case or alphabet
  preset) costs no more than the fastest native path with the same output on every ranked runtime,
  and beats every qualified competitor. Configured calls may exceed native only by work native
  lacks, and still beat every competitor. Combine native, patched native, pooled entropy, and
  portable work per runtime; never one path everywhere. Default guarantees follow proper native
  behavior; extra guarantees require explicit configuration. Every call family needs a floor row. A gap closes only by
  a change or by a cause in `bench/PERFORMANCE.md` that no implementation can remove.
- Scope: optimize primary successful consumer calls only; secondary scenarios are held.
  Runtime rank: Node Current and Bun, then Node LTS and Chromium, then Deno, then Node JITless.
- Goal: surpass performance and resource efficiency on every primary use case. Timing alone
  cannot close a primary-use gap;
  compare the complete successful call's allocation and resource costs against qualified alternatives.
- Correctness first: map contracts, add falsifiers, and mutate before timing. Keep a change only
  when two packed replays reproduce it. Wire formats stay fixed; default guarantees follow proper native behavior.

## Derived doctrine (agent decisions)

- Qualify generation by the requested output, secure entropy and published guarantees. Report
  timestamp advancement separately; it does not automatically disqualify native or rival defaults.
  The default/configured trade-off follows `docs/public-api.md` §Generation and codecs.
- Screen first (one process per row, every result read, twice), then run two packed replays on all
  runtimes. A screen chooses; only replays retain.
- Keep clock-cost measurements in `bench/PERFORMANCE.md`. Compare clock mechanisms against the
  requested generation contract; observed latency does not establish a physical lower bound.
- Tool limits: Deno cannot screen through the symlinked source (`#runtime` does not resolve), so
  replays decide Deno; the Bash tool cuts the middle of long output, so log commit-hook output.
- Choose the next task by the priority rule above, using current evidence rather than phase
  numbering. A small measured gap is not an irremovable cost. Secondary runtime and batch
  investigations resume after the higher-priority ordinary calls are resolved.

## Phase 1: per-engine text and slug writers

- [x] Retain flat 27-character masked output: repeated mixed comparisons remove the earlier read loss; the resource mutation rejects two string constructions.
- [x] Keep the fixed formatter in its owner: helper-only comparisons reproduce Chromium sentinel losses; the selected writer's mixed comparisons do not.
- [x] Exercise every check tail against independent bit packing in Node and Bun; byte-position, shift and tail mutations fail the oracle, and resource counters require one string construction.
- [x] Repeat the selected writer on installed Node and Bun releases; profile selected and portable paths on Node, Bun, Deno and Chromium. Record WebKit's native-profile gap and measurement limits in bench/PERFORMANCE.md.
- [x] Include private alphabet encoders in Bun's existing memory-profile corpus; the real filtered regression fails when its argument is removed, and completes with a fresh sampling artifact when restored.
- [x] Run identical-baseline controls and formatter/slug separation on WebKit; the formatter reproduces the loss, while the selected native-hex hybrid does not in two mixed replays.
- [x] Reject the same-file helper and packed hex-pair alternatives after repeated mixed losses; repeat the surviving shape across runtime and installed-release comparisons.
- [x] Select WebKit native hex only when available; real Node Current mutation proves selection, capability-absent tests prove fallback, and repeated packed browser calls cover the selected engine.
- [x] Reject the shared native ASCII decoder: its mixed base64url and generation losses outweigh its base32hex gain.
- [x] Verify the official Node Current archive checksum and include Node 26.10.0 in final replays; label older observations by actual release.

Why: fixed character-code writers improve measured UUID conversion on Node, Chromium and Deno.
Bun retains Latin-1; WebKit retains native hex when present because the all-fixed formatter slowed
other successful calls. `bench/PERFORMANCE.md` owns repeated results and their limits.

- [x] Add fixed UUID and slug writers with per-engine selection, every supported check tail,
      independent runtime oracles and one-string resource evidence; retain generic lengths.
- [x] Compare a fixed timestamp writer with the byte-pair table in `src/v7-bounds.ts`; preserve
      inclusive endpoints, full timestamp range and both text cases without temporary byte arrays.
      Retain fixed character codes on JIT-enabled Node, Chromium and Deno; keep byte pairs on Bun
      and JITless Node through shared startup selection. Repeated packed and installed-release
      comparisons retain the gains; a real-process mutation proves JITless selection. Bounds workloads must
      read both endpoints; the resource gate rejects an object-only sink.
- [x] Run two packed seven-runtime replays of the retained writer: no successful row is slower in
      both. The predicted 0.6 ratio is not reached by every Node or Deno row; retain the measured
      improvement, without claiming the native-parity goal is closed.
- [x] Record writer results and compare Chromium default UUIDv4 text against `@lukeed/uuid`:
      two competitor runs separate the package below the rival. Other runtime gaps remain open.
- [x] Screen native `toBase64` over package bytes against the Latin-1 writer on Bun; two packed
      replays show no separated gain. Reject the added branch; keep the remaining slug gap open.
- [ ] Close Bun's UUIDv4 slug gap against native encoding over Web Crypto bytes; isolate entropy
      copying from encoding before selecting another candidate.
- [x] Uppercase: screen the uppercase table against lowercase output plus `toUpperCase()` on Node
      and Bun. Keep direct uppercase: Node's repeated screens favor it; Bun's smaller difference
      is unresolved. No production change follows from the source-only screens.
- [x] Select native UUIDv4 text for JITless Node once at startup; prove CLI and `NODE_OPTIONS`
      precedence through compiled child processes and repeat default and uppercase calls across
      installed releases. Keep pooled formatting with the JIT.
- [ ] Close the remaining JITless UUIDv4 wrapper gap against Node's fastest native `randomUUID`;
      the Web Crypto reference is not that floor. Preserve native failure fallback and preset
      validation; retain only cuts that reproduce without slowing higher-ranked runtime calls.

## Phase 2: instrument every call family

- [x] Report sample means, sample standard deviations and standard errors beside paired medians;
      reject a population-variance mutation and run an identical-revision control. Label existing
      competitor intervals as within-process screens.
- [x] Isolate each browser comparison observation in a fresh process; identical-revision
      controls complete in Chromium, Firefox and WebKit without a resolved timing difference.
- [x] Add a separate opt-in call-timing pass with raw acquisition order, timer controls and
      empirical p50/p99. Reject an omitted call-window mutation; label clock-censored p99.
- [x] Extend the existing competitor driver with fresh-process sampling; retain raw batches,
      count one median per process, and reject a flattened-batch mutation. Exercise both Node
      releases, Bun, Deno and Chromium; keep unlike statistical units unresolved.
- [x] Complete throughput and latency statistics: use fresh processes as independent comparison units,
      preserve raw samples and outliers, report sample counts and uncertainty, and measure timer
      overhead before individual-call latency. Never label batch-average percentiles as call p99.
      Prove the report cannot turn correlated batches into independent-run confidence.

Why: conversion, guard and extraction comparisons identify the remaining default-call gaps;
Phase 5 needs repeated measurements before choosing a change. Masked calls have no native or competitor equivalent: the frozen
Feistel rounds (about half their time) set their floor.

- [x] Add Node Current to `bench:results` beside the pinned LTS. Done when tracked reports carry a
      Node Current column, so the first-ranked runtime needs no scratch probes.
- [x] Add native floor rows for conversions on every runtime where the primitive exists:
      Extend the existing competitor driver with exact fixed-output witnesses and explicit absent
      capabilities; keep generation checks intact and setup outside timing.
      `plainSlugToUuidBytes` against `Uint8Array.fromBase64(slug + "==", { alphabet: "base64url",
    lastChunkHandling: "strict" })` plus a length check; `uuidBytesToPlainSlug` against
      `toBase64({ alphabet: "base64url", omitPadding: true })`; `uuidStringToBytes` against
      `Uint8Array.fromHex` and `Buffer.from(hex, "hex")` over dehyphenated text; `bytesToUuidString`
      against `toHex` or `Buffer` hex plus hyphens; `uuidStringToPlainSlug` and
      `plainSlugToUuidString` against those pairs; `isUuidString` against a canonical regex;
      `extractUuidV7UnixMs(text)` against `parseInt` over the 12 timestamp digits.
- [x] Add competitor rows for conversions (`uuid` `parse`, `stringify`, `validate`).
- [ ] Census UUID
      slug packages (search the registry for base64url UUID encoders such as `slugid` and
      `short-uuid`); rank only those producing the same 128-bit lossless form.
- [x] Make the generated report print package / floor and package / best rival per call and
      runtime with a parity verdict. Done when gap numbers come from the report, not hand copies.
- [x] Measure `fastv7` clock drift separately from entropy and payload layout. Keep the burst
      probe informational; qualify the requested consumer result under the generation policy.

## Phase 3: default generation gaps

Why: default generation misses parity, ns package / target. Bun: UUIDv4 text 31–36 / 27–32 native; UUIDv7 text
75–82 / 39–45 and slug 77–82 / 54–58 native; UUIDv7 new bytes 44.9 / `uuid` 40.6. UUIDv7 text is
about 42 ns draw plus 37 ns Latin-1 formatting. Native timestamp advancement is measured in
`bench/PERFORMANCE.md`; it is not a default disqualification. Timestamp repair costs more than
unrepaired native output, so evaluate the latter under the approved default/configured distinction.
Clock, entropy and formatting need separate measurements; their summed timings do not establish
a physical lower bound for the complete call.

- [ ] UUIDv7 draw (about 42 ns against 22 ns for UUIDv4 bytes): ablate the reentrancy
      `try`, `readClock` wrapper, per-call clock validation for the built-in `Date.now`, rollback
      checks the module generator never enables, the four-byte `randomTail` intermediate copy, and
      rewriting unchanged timestamp bytes within one millisecond. Candidate: a module-level
      generator specialized for `Date.now` without rollback or fraction options. Breaks
      reentrancy, clock-failure, or sequence-exhaustion tests; mutate each removed guard. Not the
      entropy source: Bun Web Crypto and `node:crypto` cost the same per byte on an 8 KiB pool, and
      a 256-byte pool costs more. Done when two replays retain a cut, including UUIDv7 new bytes
      against `uuid`, or §Native floors records the cost that remains and why.
- [x] Screen the known-lowercase shortcut in UUIDv7's inner preset resolver on ordinary
      text, owned bytes and slug calls. Reject mixed text results and repeated owned-byte losses.
- [x] Screen zero-fraction comparison skipping and private timestamp-byte caching before broad
      replays. Reject both shapes: the first has no worthwhile reproduced gain; the second slows
      primary calls. Keep clock-wrapper, validation, reentrancy and tail-copy work open.
- [x] Screen clock-call and counter-write inlining, direct zero-fraction seeding, separate
      continuation and their combination together. Reject reproduced losses and duplicated
      sequence logic without a repeated primary-call gain; keep other mechanisms open.
- [x] Compare fixed tail stores in two packed seven-runtime replays. Reject the rewrite:
      only a small fractional-clock caller-buffer gain reproduces. Keep the shared entropy
      placement witness; the intermediate entropy-copy mechanism remains open.
- [x] Compare independent module draws and direct payload writing without weakening created
      generators. Reject the extra secure-source refills despite modest Bun text and slug gains;
      keep the module-mode bit oracle and its maintained lost-bit falsifier.
- [ ] Bun UUIDv4 text: isolate the default parameter and `isUuidTextCase` check.
      The maintained default-parameter, argument-count and
      direct-preset screens do not establish a worthwhile gain on both primary runtimes; keep
      the remaining native wrapper gap open. Identity tracking must not return. Rejected: removing
      the `try` (saves 1 ns, breaks native-failure fallback) and import-time validation (draws
      entropy before a heap snapshot).
- [x] Reject one native UUIDv4 call site with trust validation inside its exception boundary.
      `current-v4-single-callsite-screen.log` passes Node and Bun behavior proofs but shows slower
      text calls in both process orders. `current-v4-single-callsite-fallback-proof.log` rejects
      the lost-fallback mutation in both runners. Timing preceded that mutation proof, so it is
      rejection evidence only. Preserve the captured source and raw samples; retain no fixture.
      Identity tracking is removed; the native floor gap stays open.
- [x] Screen owned UUIDv4 construction on Node, Bun and Deno. Reject explicit buffers and scratch
      copies after repeated primary-host losses and unresolved Deno direction; retain ordinary
      construction without another dispatch branch. Shared slab views cannot satisfy private
      backing-storage ownership. The owned-output performance gap remains open below.
- [ ] Close the remaining owned UUIDv4 output gap through the complete allocation, secure draw
      and version-bit write; constructor substitutions alone do not explain Deno's cost.
- [x] Screen native decoding of fixed zero bytes before the unchanged secure fill. Reject both
      hex and base64 allocation after repeated complete-call losses on Node, Bun and Deno.
- [x] Screen owned UUIDv7 array construction on Node, Bun and Deno, including Deno's plain
      views over native buffers. Retain ordinary construction; the alternatives lose or remain
      unresolved. Keep UUIDv4 and the remaining owned-output gaps open.

## Phase 4: configured calls

Why: a configured call may cost more than native only by work native lacks, and must beat every
competitor. Caller buffers miss that, ns package / `uuid`: Bun UUIDv4 27.9 / 26.1 (native fill
17.5), UUIDv7 43.5 / 37.0. Other configured calls have no competitor rows.

- [ ] Add competitor rows: `uuid.v7({ msecs })` against `{ at }` (text: Node 189 ns, Bun 92), and
      stateful generator packages against `createUuidV7Generator` and `{ generator }`. Add a keyless
      `generateUuidV7WithPlainSlug()` row; only the selected-generator pair is measured. Done when
      each call has a verdict against its best rival.
- [ ] Pairs and values: `generateUuidV7WithPlainSlug` and `generateUuidV7Value` must cost less than
      the separate text, slug, and byte calls a consumer would combine; measure and fix any loss.
  - [x] Refresh the default UUID-plus-slug comparison against one owned-byte draw and both
        public conversions after retained generation changes. Both fresh-process matrices favor
        the dedicated pair on every measured runtime; preserve it. Total allocation and the
        immutable-value consumer comparison remain open.
- [ ] HELD outside this effort: caller-buffer optimization. The prior proposal copies from the pool
      straight into the caller range after the refill succeeds,
      removing the private copy; this changes every adapter's `fillRandom`. Caller bytes must stay
      unchanged when entropy fails: prove with the transactional buffer tests and entropy-failure
      injection. Then replace §Native floors' "try it if caller-buffer output becomes primary".

## Phase 5: conversions (needs Phase 2 rows)

- [ ] Plain base64url slug to bytes and back: adopt native `fromBase64` or `toBase64` wherever it
      beats the package decoder with length, padding, and trailing-bit checks kept.
- [ ] UUID text to bytes and back: adopt `fromHex`, `toHex`, or `Buffer` hex wherever they beat the
      one-pass parser and package formatter with hyphen positions and mixed case still accepted.
- [x] Close the qualified `uuidv7-js` text extraction gap: two fresh-process comparisons favor
      the package on all ranked competitor runtimes. Two native profile runs show lower CPU
      cost and sampled allocation on Node and Deno; Chromium allocation and Bun CPU and actual
      substring counts favor the package. Bun gross allocation volume remains unmeasured.
- [ ] Close the canonical UUID guard gap against `uuid.validate`; retain compact and wrapped
      input, nil/max handling, version-neutral acceptance, and every existing validation boundary.
      Paired expressions improve the measured non-Bun canonical calls in repeated packed comparisons;
      Bun keeps its original expression to avoid reproduced normalization losses. Resolve Bun's
      rival gap and the unexplained cold-import heap increase before claiming full resource parity.
      Fresh V8 comparisons favor the retained guard over the library; Bun remains mixed.
      Keep resource parity open rather than treating the superseded V8 loss as current work.
- [ ] Close the validated timestamp call's gap against the parse-only native floor without
      weakening full UUIDv7 validation; keep the lower bound distinct from a qualified competitor.
- [x] Retain case-insensitive canonical UUIDv7 validation through the existing text guard;
      repeated packed calls improve canonical extraction on Node and Bun, alternate spellings
      have no repeated resolved loss, and mutation tests and native resource profiles preserve
      full validation. Keep the remaining native and competitor gaps open.
- [x] Retain fixed canonical timestamp reads after full UUIDv7 validation; the independent carry
      oracle rejects signed low words and displaced digits in both runners. Two packed replays
      and native profiles reproduce speed and allocation gains; reuse native parsing on JITless
      Node, with real-process selection and resource mutations. Native-floor gaps stay open.

## Phase 6: deliver (after every source change)

- [ ] Propose the generated-report and §Native floors updates before running `bun run bench:results`,
      which writes public documents. Hold those writes for explicit approval.
- [ ] Propose README direction words (leads, trails, unresolved; no numbers) only where repeated
      comparisons support the change. Hold the edit for explicit approval.
- [ ] Run `bun run check > log 2>&1`; done when it exits 0 and the parity report shows no gap
      without a task here or a recorded cause.

## Proposals outside this plan

- `check:fast` could print failed-step lines last, so truncated hook output still names the failure.
