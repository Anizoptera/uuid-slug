# Quality audit

The UUIDv7 generator must preserve its published contract with the least runtime work, smallest public surface, and fast evidence that fails on material regressions.

- [x] Reconstruct the changed contracts and executable paths from their owners and caller code.
- [x] Attack sequence exhaustion, date normalization, option validation, ownership, and runtime fallback for correctness and simpler designs.
- [ ] Pair every material capability, variant, invariant, and boundary with a non-duplicated public-seam falsifier suitable for later profiling changes.
- [ ] Remove redundant or implementation-coupled verification; mutation-check every retained regression guard.
- [ ] Measure only surviving runtime or tooling candidates against the current implementation.
- [ ] Run the complete project gate, audit the final diff and comments, then remove this roadmap.
