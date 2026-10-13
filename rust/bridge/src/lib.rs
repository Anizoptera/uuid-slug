//! Development hosts run the same dispatcher without publishing a native ABI.
#![deny(unsafe_op_in_unsafe_fn)]

mod dispatch;

fn evaluate_caught(input: &str) -> Result<String, &'static str> {
    std::panic::catch_unwind(|| dispatch::evaluate(input)).map_err(|_| "Rust bridge panicked")
}

#[cfg(not(target_arch = "wasm32"))]
fn plain_caught(input: &str) -> Result<String, &'static str> {
    std::panic::catch_unwind(|| {
        uuid_slug::Uuid::from_uuid_string(input)
            .map(|uuid| {
                uuid.to_plain_uuid_slug(uuid_slug::UuidSlugAlphabet::Base64Url)
                    .into_string()
            })
            .map_err(|error| error.code().as_str())
    })
    .map_err(|_| "Rust bridge panicked")?
}

/// Evaluate a development batch; panics become host errors rather than unwinding across Node.
#[cfg(not(target_arch = "wasm32"))]
#[allow(unsafe_code)]
#[napi_derive::napi]
pub fn evaluate(input: String) -> napi::Result<String> {
    evaluate_caught(&input).map_err(napi::Error::from_reason)
}

/// Convert one UUID through the typed native boundary used by hot-path research.
#[cfg(not(target_arch = "wasm32"))]
#[allow(unsafe_code)]
#[napi_derive::napi]
pub fn plain(input: String) -> napi::Result<String> {
    plain_caught(&input).map_err(napi::Error::from_reason)
}

#[cfg(not(target_arch = "wasm32"))]
#[allow(unsafe_code)]
unsafe fn write_into(
    input: *const u8,
    input_length: usize,
    output: *mut u8,
    capacity: usize,
    operation: fn(&str) -> Result<String, &'static str>,
) -> usize {
    std::panic::catch_unwind(|| {
        if input.is_null()
            || output.is_null()
            || input_length > isize::MAX as usize
            || capacity > isize::MAX as usize
        {
            return 0;
        }
        // SAFETY: the caller promises readable storage and the length is slice-representable.
        let bytes = unsafe { std::slice::from_raw_parts(input, input_length) };
        let Ok(input) = std::str::from_utf8(bytes) else {
            return 0;
        };
        let Ok(output_bytes) = operation(input).map(String::into_bytes) else {
            return 0;
        };
        let required = output_bytes.len();
        if capacity < required {
            return required;
        }
        // SAFETY: the caller promises writable, non-overlapping storage of at least `capacity`.
        unsafe { std::ptr::copy_nonoverlapping(output_bytes.as_ptr(), output, required) };
        required
    })
    .unwrap_or(0)
}

/// Evaluate into caller storage and return the required byte count, or zero on failure.
///
/// A short output buffer is left unchanged and the returned count sizes the retry.
///
/// # Safety
///
/// `input` must be readable for `input_length` bytes. `output` must be writable for `capacity`
/// bytes and must not overlap `input`.
#[cfg(not(target_arch = "wasm32"))]
#[allow(unsafe_code)]
#[unsafe(no_mangle)]
pub unsafe extern "C" fn uuid_slug_evaluate_into(
    input: *const u8,
    input_length: usize,
    output: *mut u8,
    capacity: usize,
) -> usize {
    // SAFETY: this export forwards the caller's buffer contract unchanged.
    unsafe { write_into(input, input_length, output, capacity, evaluate_caught) }
}

/// Convert one UUID into caller storage; return zero on invalid input.
///
/// # Safety
///
/// The buffer contract is identical to [`uuid_slug_evaluate_into`].
#[cfg(not(target_arch = "wasm32"))]
#[allow(unsafe_code)]
#[unsafe(no_mangle)]
pub unsafe extern "C" fn uuid_slug_plain_into(
    input: *const u8,
    input_length: usize,
    output: *mut u8,
    capacity: usize,
) -> usize {
    // SAFETY: this export forwards the caller's buffer contract unchanged.
    unsafe { write_into(input, input_length, output, capacity, plain_caught) }
}

#[cfg(all(test, not(target_arch = "wasm32")))]
#[allow(unsafe_code)]
mod ffi_tests {
    #[test]
    fn output_is_atomic_and_invalid_utf8_is_rejected() {
        let input = br#"[{"op":"plain","input":"0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f0000"}]"#;
        let mut short = [0xa5; 4];
        // SAFETY: both slices remain live and non-overlapping for the call.
        let required = unsafe {
            super::uuid_slug_evaluate_into(
                input.as_ptr(),
                input.len(),
                short.as_mut_ptr(),
                short.len(),
            )
        };
        assert!(required > short.len());
        assert_eq!(short, [0xa5; 4]);

        let mut output = vec![0; required];
        // SAFETY: both slices remain live and non-overlapping for the call.
        let written = unsafe {
            super::uuid_slug_evaluate_into(
                input.as_ptr(),
                input.len(),
                output.as_mut_ptr(),
                output.len(),
            )
        };
        assert_eq!(written, required);
        assert_eq!(
            output,
            super::evaluate_caught(str::from_utf8(input).unwrap())
                .unwrap()
                .as_bytes()
        );

        let uuid = b"0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f0000";
        // SAFETY: both slices remain live and non-overlapping for the call.
        let direct_length = unsafe {
            super::uuid_slug_plain_into(
                uuid.as_ptr(),
                uuid.len(),
                output.as_mut_ptr(),
                output.len(),
            )
        };
        assert_eq!(&output[..direct_length], b"AZChssPUfl-KmwwdLj8AAA");

        let invalid = [0xff];
        // SAFETY: both slices remain live and non-overlapping for the call.
        assert_eq!(
            unsafe {
                super::uuid_slug_evaluate_into(
                    invalid.as_ptr(),
                    invalid.len(),
                    output.as_mut_ptr(),
                    output.len(),
                )
            },
            0
        );
        let before = output.clone();
        let invalid_uuid = b"not a UUID";
        // SAFETY: both slices remain live and non-overlapping for the call.
        assert_eq!(
            unsafe {
                super::uuid_slug_plain_into(
                    invalid_uuid.as_ptr(),
                    invalid_uuid.len(),
                    output.as_mut_ptr(),
                    output.len(),
                )
            },
            0
        );
        assert_eq!(output, before);
    }
}

/// Evaluate the same batch in a browser without a Node dependency.
#[cfg(target_arch = "wasm32")]
#[allow(unsafe_code)]
#[wasm_bindgen::prelude::wasm_bindgen]
pub fn evaluate(input: &str) -> Result<String, wasm_bindgen::JsValue> {
    evaluate_caught(input).map_err(wasm_bindgen::JsValue::from_str)
}

/// Development browser driver polls bounded work between real host tasks.
#[cfg(target_arch = "wasm32")]
#[allow(unsafe_code)]
#[wasm_bindgen::prelude::wasm_bindgen]
pub struct Derivation {
    future: std::pin::Pin<
        Box<
            dyn std::future::Future<Output = Result<uuid_slug::UuidV7Mask, uuid_slug::Error>>
                + Send,
        >,
    >,
    cancellation: uuid_slug::UuidV7MaskDerivationCancellation,
    uuid: uuid_slug::Uuid,
}

#[cfg(target_arch = "wasm32")]
#[allow(unsafe_code)]
#[wasm_bindgen::prelude::wasm_bindgen]
impl Derivation {
    /// Copy the seed before host code can mutate its buffer.
    #[wasm_bindgen::prelude::wasm_bindgen(constructor)]
    pub fn new(seed: &[u8], iterations: u32, uuid: &str) -> Result<Self, wasm_bindgen::JsValue> {
        let uuid = uuid_slug::Uuid::from_uuid_string(uuid)
            .map_err(|error| wasm_bindgen::JsValue::from_str(error.code().as_str()))?;
        uuid.extract_uuid_v7_unix_ms()
            .map_err(|error| wasm_bindgen::JsValue::from_str(error.code().as_str()))?;
        let cancellation = uuid_slug::UuidV7MaskDerivationCancellation::default();
        Ok(Self {
            future: Box::pin(uuid_slug::derive_uuid_v7_mask_async(
                seed,
                iterations,
                "browser",
                cancellation.clone(),
            )),
            cancellation,
            uuid,
        })
    }

    /// Request cancellation; the next poll reports the core error.
    pub fn cancel(&self) {
        self.cancellation.cancel();
    }

    /// Return no value while pending, or a masked UUID when derivation finishes.
    pub fn poll(&mut self) -> Result<Option<String>, wasm_bindgen::JsValue> {
        let mut context = std::task::Context::from_waker(std::task::Waker::noop());
        match self.future.as_mut().poll(&mut context) {
            std::task::Poll::Pending => Ok(None),
            std::task::Poll::Ready(result) => result
                .and_then(|mask| {
                    uuid_slug::UuidV7MaskingCodec::new(uuid_slug::UuidV7MaskingCodecOptions::new(
                        mask,
                    ))?
                    .uuid_to_masked_slug(self.uuid)
                    .map(|slug| slug.into_string())
                })
                .map(Some)
                .map_err(|error| wasm_bindgen::JsValue::from_str(error.code().as_str())),
        }
    }
}
