// Discharge the production formatter's unchecked UTF-8 precondition without replacing its body.
// The grammar oracle uses digit ranges and wire positions, independently of formatter arithmetic.
// Rust checks array initialization and borrowing; standard UTF-8 semantics and Kani's compiler
// remain trusted. Formatter I/O failure and native code generation need their separate checks.
#[kani::proof]
#[kani::unwind(65)]
fn hyphenated_format() {
    let payload: [u8; 16] = kani::any();
    let upper: bool = kani::any();
    let text = format_hyphenated(&payload, upper);
    assert!(
        text.is_ascii(),
        "UUID formatter emits only ASCII for every payload and case"
    );
    assert_eq!(
        crate::text_contract::reference(&text),
        Some(payload),
        "UUID formatter preserves every payload byte in canonical positions"
    );
    assert!(
        text.iter().all(|byte| if upper {
            !byte.is_ascii_lowercase()
        } else {
            !byte.is_ascii_uppercase()
        }),
        "UUID formatter uses exactly the requested hexadecimal case"
    );
}
