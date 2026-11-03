// One production transition from every admissible state avoids unfolding a history of pointer-
// bearing Results. The invariant includes every reachable state, not only sampled histories.
fn arbitrary_generator() -> UuidV7Generator {
    let initialized: bool = kani::any();
    let last: u64 = kani::any();
    let high: u64 = kani::any();
    let sequence: u64 = kani::any();
    let bits: u8 = kani::any();
    let policy: u8 = kani::any();
    let tolerance_ms: u64 = kani::any();
    kani::assume(last <= MAX_UUID_V7_UNIX_MS && high <= last);
    kani::assume(sequence <= MAX_SEQUENCE && bits <= 12 && policy < 3);
    UuidV7Generator {
        last_ms: initialized.then_some(last),
        clock_high_water_ms: initialized.then_some(high),
        sequence: if initialized { sequence } else { 0 },
        rollback_policy: match policy {
            0 => UuidV7ClockRollbackPolicy::Preserve,
            1 => UuidV7ClockRollbackPolicy::Reset { tolerance_ms },
            _ => UuidV7ClockRollbackPolicy::Error { tolerance_ms },
        },
        sub_millisecond_fraction_bits: bits,
    }
}

// Read actual fields: no shadow state machine supplies the failure-preservation oracle.
fn snapshot(g: &UuidV7Generator) -> (Option<u64>, Option<u64>, u64, UuidV7ClockRollbackPolicy, u8) {
    (
        g.last_ms,
        g.clock_high_water_ms,
        g.sequence,
        g.rollback_policy,
        g.sub_millisecond_fraction_bits,
    )
}

pub(super) fn prove_transition() {
    let mut generator = arbitrary_generator();
    let before = snapshot(&generator);
    let now: u64 = kani::any();
    let fraction_12: u16 = kani::any();
    let entropy: [u8; 10] = kani::any();
    kani::assume(now <= MAX_UUID_V7_UNIX_MS && fraction_12 < 4096);
    let rollback = before.1.map_or(0, |high| high.saturating_sub(now));
    let reset = matches!(before.3, UuidV7ClockRollbackPolicy::Reset { tolerance_ms } if rollback > tolerance_ms);
    let rejected_clock = matches!(before.3, UuidV7ClockRollbackPolicy::Error { tolerance_ms } if rollback > tolerance_ms);
    let fraction = u64::from(fraction_12) / (1u64 << (12 - before.4));
    let counter_bits = 42 - before.4;
    let fresh = reset
        || before
            .0
            .is_none_or(|last| now > last || (now == last && fraction > before.2 >> counter_bits));
    let exhausted = !fresh && before.2 == MAX_SEQUENCE && before.0 == Some(MAX_UUID_V7_UNIX_MS);
    let reseed = fresh || before.2 == MAX_SEQUENCE;
    let mut drawn = 0;
    let result = from_parts(&mut generator, now, fraction_12, |out| {
        drawn += out.len();
        out.copy_from_slice(&entropy[..out.len()]);
        Ok(())
    });
    assert_eq!(
        result.is_err(),
        rejected_clock || exhausted,
        "v7 continuation rejects exactly policy or final timestamp exhaustion"
    );
    assert_eq!(
        drawn,
        if rejected_clock || exhausted {
            0
        } else if reseed {
            10
        } else {
            4
        },
        "v7 continuation draws only the required entropy"
    );
    match result {
        Err(error) => {
            assert_eq!(error.code(), ErrorCode::InvalidTimestamp);
            assert_eq!(
                snapshot(&generator),
                before,
                "v7 rejected transitions preserve all state"
            );
        }
        Ok(uuid) => {
            let bytes = *uuid.as_uuid_bytes();
            let word = u128::from_be_bytes(bytes);
            let timestamp = (word >> 80) as u64;
            let sequence = (((word >> 64) & 0xfff) << 30) | ((word >> 32) & 0x3fff_ffff);
            assert_eq!((word >> 76) & 15, 7);
            assert_eq!((word >> 62) & 3, 2);
            let expected_ms = if fresh {
                now
            } else {
                before.0.unwrap() + u64::from(reseed)
            };
            assert_eq!(
                timestamp, expected_ms,
                "v7 sequence carry advances exactly one millisecond"
            );
            assert_eq!(generator.last_ms, Some(timestamp));
            assert_eq!(u128::from(generator.sequence), sequence);
            assert_eq!(
                generator.clock_high_water_ms,
                Some(if reset {
                    now
                } else {
                    before.1.unwrap_or(now).max(now)
                })
            );
            assert!(
                generator.clock_high_water_ms.unwrap() <= timestamp,
                "v7 successful transitions preserve the reachable-state invariant"
            );
            if !reset && let Some(last) = before.0 {
                assert!(
                    (u128::from(timestamp) << 42) | sequence
                        > (u128::from(last) << 42) | u128::from(before.2),
                    "v7 continuation strictly increases in wire order"
                );
            }
            if !reseed {
                assert_eq!(generator.sequence, before.2 + 1);
            }
            assert_eq!(generator.rollback_policy, before.3);
            assert_eq!(generator.sub_millisecond_fraction_bits, before.4);
        }
    }
}

// A failed callback may corrupt its entire scratch slice; no generator field may commit.
// Equality of actual state is stronger than comparing one chosen retry's output.
// Arbitrary final scratch bytes include every partial overwrite of its initially zero bytes.
pub(super) fn prove_failed_entropy() {
    let mut generator = arbitrary_generator();
    let before = snapshot(&generator);
    let now: u64 = kani::any();
    let fraction_12: u16 = kani::any();
    let overwritten: [u8; 10] = kani::any();
    kani::assume(now <= MAX_UUID_V7_UNIX_MS && fraction_12 < 4096);
    let mut called = false;
    let result = from_parts(&mut generator, now, fraction_12, |out| {
        called = true;
        out.copy_from_slice(&overwritten[..out.len()]);
        Err(Error::new(ErrorCode::Aborted))
    });
    assert!(
        result.is_err(),
        "v7 failed entropy never returns an identifier"
    );
    assert_eq!(
        result.unwrap_err().code(),
        if called {
            ErrorCode::RngUnavailable
        } else {
            ErrorCode::InvalidTimestamp
        }
    );
    assert_eq!(
        snapshot(&generator),
        before,
        "v7 failed entropy preserves every generator field"
    );
}
