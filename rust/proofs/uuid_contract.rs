//! Check public UUID operations on every input bit, not a second implementation of the library.
use uuid_slug::{ErrorCode, Uuid, UuidV7PayloadLayout, UuidVariant};

// All 128 input bits are unrestricted, including non-RFC variants and every version nibble.
#[kani::proof]
#[kani::unwind(17)]
fn inspection_and_timestamp() {
    let bytes: [u8; 16] = kani::any();
    let uuid = Uuid::from_uuid_bytes_array(bytes);
    let version = bytes[6] / 16;
    let rfc = (128..192).contains(&bytes[8]);
    let variant = match bytes[8] {
        0..128 => UuidVariant::Ncs,
        128..192 => UuidVariant::Rfc,
        192..224 => UuidVariant::Microsoft,
        _ => UuidVariant::Future,
    };
    assert_eq!(
        uuid.uuid_version(),
        version,
        "version inspection preserves the wire nibble"
    );
    assert_eq!(
        uuid.uuid_variant(),
        variant,
        "variant inspection matches every wire prefix"
    );
    assert_eq!(
        uuid.is_rfc_uuid_variant(),
        rfc,
        "RFC inspection matches the wire prefix"
    );
    assert_eq!(
        uuid.is_uuid_v4(),
        rfc && version == 4,
        "v4 inspection requires version and variant"
    );
    assert_eq!(
        uuid.is_uuid_v7(),
        rfc && version == 7,
        "v7 inspection requires version and variant"
    );
    let timestamp = uuid.extract_uuid_v7_unix_ms();
    if rfc && version == 7 {
        let expected = u128::from_be_bytes(bytes) / (1u128 << 80);
        assert_eq!(
            timestamp.unwrap() as u128,
            expected,
            "timestamp preserves every leading wire bit"
        );
    } else {
        assert_eq!(
            timestamp.unwrap_err().code(),
            ErrorCode::InvalidUuidVersion,
            "timestamp rejects other UUID domains"
        );
    }
}

// Independently project network-order bits, omitting only RFC's version and variant fields.
fn payload_word(bytes: &[u8; 16]) -> u128 {
    let mut payload = 0;
    for (index, byte) in bytes.iter().enumerate().skip(6) {
        for bit in (0..8).rev() {
            if (index == 6 && bit >= 4) || (index == 8 && bit >= 6) {
                continue;
            }
            payload = payload * 2 + u128::from((byte >> bit) & 1);
        }
    }
    payload
}

// All u8 width pairs are admitted: invalid configurations must reject, never narrow or wrap.
#[kani::proof]
#[kani::unwind(17)]
#[kani::stub(alloc::fmt::format, crate::diagnostic_text)]
fn payload_layout_admission() {
    let fraction: u8 = kani::any();
    let counter: u8 = kani::any();
    let layout = UuidV7PayloadLayout::new(fraction, counter);
    let valid = fraction <= 12 && u16::from(fraction) + u16::from(counter) <= 74;
    assert_eq!(
        layout.is_ok(),
        valid,
        "layout accepts exactly the documented widths"
    );
    if let Err(error) = layout {
        assert_eq!(error.code(), ErrorCode::InvalidOptions);
    }
}

// The constructor theorem above establishes these preconditions; all valid layouts remain
// admitted. Reassembly plus field bounds uniquely specifies every split of the 74 payload bits.
#[kani::proof]
#[kani::unwind(129)]
#[kani::stub(alloc::fmt::format, crate::diagnostic_text)]
fn payload_layout_and_fields() {
    let fraction: u8 = kani::any();
    let counter: u8 = kani::any();
    kani::assume(fraction <= 12 && u16::from(fraction) + u16::from(counter) <= 74);
    let layout = UuidV7PayloadLayout::new(fraction, counter).unwrap();
    let mut bytes: [u8; 16] = kani::any();
    bytes[6] = (bytes[6] & 15) | 0x70;
    bytes[8] = (bytes[8] & 63) | 0x80;
    let fields = Uuid::from_uuid_bytes_array(bytes)
        .extract_uuid_v7_payload(layout)
        .unwrap();
    let remaining = 74 - fraction - counter;
    let f = fields.sub_millisecond_fraction.map_or(0, |field| {
        assert_eq!(field.bits, fraction);
        u128::from(field.value)
    });
    let c = fields.counter.map_or(0, |field| {
        assert_eq!(field.bits, counter);
        field.value
    });
    assert_eq!(
        fields.sub_millisecond_fraction.is_some(),
        fraction != 0,
        "zero fraction width omits its field"
    );
    assert_eq!(
        fields.counter.is_some(),
        counter != 0,
        "zero counter width omits its field"
    );
    assert!(
        f < 1u128 << fraction
            && c < 1u128 << counter
            && fields.remaining.value < 1u128 << remaining,
        "payload fields fit their declared widths"
    );
    assert_eq!(fields.remaining.bits, remaining);
    assert_eq!(
        (f << (counter + remaining)) | (c << remaining) | fields.remaining.value,
        payload_word(&bytes),
        "payload partition preserves every payload bit"
    );
    assert_eq!(
        u128::from(fields.unix_ms),
        u128::from_be_bytes(bytes) >> 80,
        "payload extraction preserves the timestamp"
    );
}

// The Verus theorem covers arbitrary capacities. This checks actual reads and writes across
// all byte contents, all usize offsets, and every slice length up to two UUID slots.
#[kani::proof]
#[kani::unwind(65)]
#[kani::stub(alloc::fmt::format, crate::diagnostic_text)]
fn caller_buffer_reads_and_writes() {
    let source: [u8; 32] = kani::any();
    let length: usize = kani::any();
    let offset: usize = kani::any();
    kani::assume(length <= source.len());
    let fits = offset as u128 + 16 <= length as u128;
    let read = Uuid::from_uuid_bytes(&source[..length], offset);
    assert_eq!(
        read.is_ok(),
        fits,
        "UUID read accepts exactly fitting ranges"
    );
    if let Ok(uuid) = read {
        assert_eq!(
            uuid.as_uuid_bytes().as_slice(),
            &source[offset..offset + 16],
            "UUID read preserves every source byte"
        );
    } else {
        assert_eq!(read.unwrap_err().code(), ErrorCode::InvalidBuffer);
    }
    let bytes: [u8; 16] = kani::any();
    let mut output = source;
    let written =
        Uuid::from_uuid_bytes_array(bytes).write_uuid_bytes(&mut output[..length], offset);
    assert_eq!(
        written.is_ok(),
        fits,
        "UUID write accepts exactly fitting ranges"
    );
    for index in 0..output.len() {
        let expected = if fits && index >= offset && index - offset < 16 {
            bytes[index - offset]
        } else {
            source[index]
        };
        assert_eq!(
            output[index], expected,
            "UUID write changes only its complete admitted range"
        );
    }
}
