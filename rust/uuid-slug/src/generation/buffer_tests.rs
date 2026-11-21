use crate::{Error, ErrorCode, Uuid, UuidV7Generator, generate_uuid_v4_into};

// Only the selected UUID span may change, even when time validation fails after range validation.
fn packet_uuid(packet: &[u8; 24]) -> Result<Uuid, Error> {
    assert_eq!(&packet[..4], &[0xa5; 4]);
    assert_eq!(&packet[20..], &[0xa5; 4]);
    Uuid::from_uuid_bytes(packet, 4)
}

#[test]
fn default_entropy_buffer_calls_preserve_storage_and_sequence_on_failure() -> Result<(), Error> {
    let mut packet = [0xa5; 24];
    generate_uuid_v4_into(&mut packet, 4)?;
    assert!(packet_uuid(&packet)?.is_uuid_v4());
    let saved = packet;
    assert_eq!(
        generate_uuid_v4_into(&mut packet, usize::MAX)
            .unwrap_err()
            .code(),
        ErrorCode::InvalidBuffer
    );
    assert_eq!(packet, saved);

    let mut generator = UuidV7Generator::new().with_sub_millisecond_fraction_bits(12)?;
    generator.generate_uuid_v7_at_unix_ms_into(1000.25, &mut packet, 4)?;
    let first = packet_uuid(&packet)?;
    let fields = first.extract_uuid_v7_payload(generator.payload_layout())?;
    assert_eq!(fields.unix_ms, 1000);
    assert_eq!(fields.sub_millisecond_fraction.unwrap().value, 1024);

    let saved = packet;
    assert_eq!(
        generator
            .generate_uuid_v7_at_unix_ms_into(2000.0, &mut packet, 9)
            .unwrap_err()
            .code(),
        ErrorCode::InvalidBuffer
    );
    assert_eq!(packet, saved);
    assert_eq!(
        generator
            .generate_uuid_v7_at_unix_ms_into(f64::NAN, &mut packet, 4)
            .unwrap_err()
            .code(),
        ErrorCode::InvalidTimestamp
    );
    assert_eq!(packet, saved);
    generator.generate_uuid_v7_at_unix_ms_into(1000.25, &mut packet, 4)?;
    let next = packet_uuid(&packet)?;
    assert_eq!(next.extract_uuid_v7_unix_ms()?, 1000);
    assert!(
        next > first,
        "rejected writes must not advance the generator's timestamp"
    );
    Ok(())
}

#[cfg(feature = "std")]
#[test]
fn system_time_and_current_time_buffer_calls_keep_the_selected_span() -> Result<(), Error> {
    use std::time::{Duration, SystemTime};
    let mut packet = [0xa5; 24];
    let mut generator = UuidV7Generator::new();
    generator.generate_uuid_v7_at_into(
        SystemTime::UNIX_EPOCH + Duration::from_millis(1000),
        &mut packet,
        4,
    )?;
    assert_eq!(packet_uuid(&packet)?.extract_uuid_v7_unix_ms()?, 1000);
    generator.generate_uuid_v7_into(&mut packet, 4)?;
    assert!(packet_uuid(&packet)?.is_uuid_v7());
    crate::generate_uuid_v7_into(&mut packet, 4)?;
    assert!(packet_uuid(&packet)?.is_uuid_v7());
    Ok(())
}

#[test]
fn v4_batches_fill_every_slot_with_distinct_v4_ids() -> Result<(), Error> {
    // 5,000 IDs cross the 64 KB reseed point (4,096 IDs) inside one call.
    let mut ids = vec![crate::NIL_UUID; 5_000];
    crate::generate_uuid_v4_batch(&mut ids)?;
    assert!(ids.iter().all(Uuid::is_uuid_v4));
    assert_eq!(
        ids.iter().collect::<std::collections::HashSet<_>>().len(),
        ids.len()
    );
    crate::generate_uuid_v4_batch(&mut [])?;
    Ok(())
}

#[test]
fn v7_batches_continue_one_strictly_increasing_sequence() -> Result<(), Error> {
    for fraction_bits in [0, 12] {
        let mut generator =
            UuidV7Generator::new().with_sub_millisecond_fraction_bits(fraction_bits)?;
        let first = generator.generate_uuid_v7()?;
        let mut ids = vec![crate::NIL_UUID; 5_000];
        generator.generate_uuid_v7_batch(&mut ids)?;
        let mut more = vec![crate::NIL_UUID; 3];
        generator.generate_uuid_v7_batch(&mut more)?;
        let last = generator.generate_uuid_v7()?;
        let all: Vec<Uuid> = [first]
            .into_iter()
            .chain(ids)
            .chain(more)
            .chain([last])
            .collect();
        assert!(all.iter().all(Uuid::is_uuid_v7));
        assert!(
            all.windows(2).all(|pair| pair[0] < pair[1]),
            "fraction bits {fraction_bits}"
        );
        generator.generate_uuid_v7_batch(&mut [])?;
    }
    Ok(())
}
