# Roadmap

## Public TypeScript API hostile audit

Goal: keep the smallest caller-facing surface that states what it enforces, rejects known misuse at compile time, reports runtime failures by the action callers can take, and performs no unrequested work.

- [ ] Inventory every root export, declaration, default, failure, effect, and injected boundary against real caller jobs.
- [ ] Falsify suspected ambiguity and misuse with packed consumer code, compile failures, and direct runtime cases.
- [ ] Fix only defects that survive those checks; preserve published wire values and document each retained trade-off at its declaration.
- [ ] Run Node, Bun, declaration, API-baseline, packed-consumer, and full repository checks; prove each new regression can fail.
