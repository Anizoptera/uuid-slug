//! Development transports run the same dispatcher without publishing a native ABI.
#![deny(unsafe_op_in_unsafe_fn)]

mod dispatch;

fn evaluate_caught(input: &str) -> Result<String, &'static str> {
    std::panic::catch_unwind(|| dispatch::evaluate(input)).map_err(|_| "Rust bridge panicked")
}

/// Evaluate a development batch; panics become host errors rather than unwinding across Node.
#[cfg(not(target_arch = "wasm32"))]
#[allow(unsafe_code)]
#[napi_derive::napi]
pub fn evaluate(input: String) -> napi::Result<String> {
    evaluate_caught(&input).map_err(napi::Error::from_reason)
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
    future: std::pin::Pin<Box<uuid_slug::schema::SchemaDerivation>>,
    cancellation: uuid_slug::schema::Cancellation,
    uuid: uuid_slug::Uuid,
}

#[cfg(target_arch = "wasm32")]
#[allow(unsafe_code)]
#[wasm_bindgen::prelude::wasm_bindgen]
impl Derivation {
    /// Copy the seed before host code can mutate its buffer.
    #[wasm_bindgen::prelude::wasm_bindgen(constructor)]
    pub fn new(seed: &[u8], iterations: u32, uuid: &str) -> Result<Self, wasm_bindgen::JsValue> {
        let uuid = uuid_slug::Uuid::parse(uuid)
            .map_err(|error| wasm_bindgen::JsValue::from_str(error.code()))?;
        uuid.timestamp()
            .map_err(|error| wasm_bindgen::JsValue::from_str(error.code()))?;
        let cancellation = uuid_slug::schema::Cancellation::default();
        Ok(Self {
            future: Box::pin(uuid_slug::create_mask_schema_async(
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
        use std::future::Future;
        let mut context = std::task::Context::from_waker(std::task::Waker::noop());
        match self.future.as_mut().poll(&mut context) {
            std::task::Poll::Pending => Ok(None),
            std::task::Poll::Ready(result) => result
                .and_then(|mask| {
                    uuid_slug::Codec::new(uuid_slug::CodecOptions {
                        mask,
                        ..Default::default()
                    })?
                    .uuid_v7_to_masked_slug(self.uuid)
                })
                .map(Some)
                .map_err(|error| wasm_bindgen::JsValue::from_str(error.code())),
        }
    }
}

#[cfg(not(target_arch = "wasm32"))]
#[allow(unsafe_code)]
mod ffi {
    use std::collections::HashMap;
    use std::sync::{LazyLock, Mutex};

    // Handles never repeat: release invalidates a number permanently, including after exhaustion.
    static OUTPUTS: LazyLock<Mutex<Outputs>> = LazyLock::new(|| Mutex::new(Outputs::default()));
    #[derive(Default)]
    struct Outputs {
        next: u32,
        values: HashMap<u32, Vec<u8>>,
    }

    /// Borrow input for this call and return an owned output handle, or zero on failure.
    /// # Safety
    /// `input` must remain readable for `length` bytes for this call; it is never retained.
    // SAFETY: this development library owns the uniquely prefixed symbol.
    #[unsafe(no_mangle)]
    pub unsafe extern "C" fn uuid_slug_evaluate(input: *const u8, length: usize) -> u32 {
        std::panic::catch_unwind(|| {
            if input.is_null() || length > isize::MAX as usize {
                return 0;
            }
            // SAFETY: caller supplies live readable storage, checked for null and slice length.
            let bytes = unsafe { std::slice::from_raw_parts(input, length) };
            let Ok(input) = std::str::from_utf8(bytes) else {
                return 0;
            };
            // This export's outer catch also covers dispatch and output ownership.
            let output = super::dispatch::evaluate(input);
            let Ok(mut outputs) = OUTPUTS.lock() else {
                return 0;
            };
            let Some(handle) = outputs.next.checked_add(1) else {
                return 0;
            };
            outputs.next = handle;
            outputs.values.insert(handle, output.into_bytes());
            handle
        })
        .unwrap_or(0)
    }

    /// Return output length; `usize::MAX` means unknown or released handle.
    // SAFETY: this development library owns the uniquely prefixed symbol.
    #[unsafe(no_mangle)]
    pub extern "C" fn uuid_slug_length(handle: u32) -> usize {
        std::panic::catch_unwind(|| {
            OUTPUTS
                .lock()
                .ok()
                .and_then(|outputs| outputs.values.get(&handle).map(Vec::len))
                .unwrap_or(usize::MAX)
        })
        .unwrap_or(usize::MAX)
    }

    /// Copy a live output into caller storage; return false without writing on invalid input.
    /// # Safety
    /// `output` must remain writable for `capacity` bytes and must not alias bridge-owned storage.
    // SAFETY: this development library owns the uniquely prefixed symbol.
    #[unsafe(no_mangle)]
    pub unsafe extern "C" fn uuid_slug_copy(handle: u32, output: *mut u8, capacity: usize) -> bool {
        std::panic::catch_unwind(|| {
            if output.is_null() || capacity > isize::MAX as usize {
                return false;
            }
            let Ok(outputs) = OUTPUTS.lock() else {
                return false;
            };
            let Some(bytes) = outputs.values.get(&handle) else {
                return false;
            };
            if capacity < bytes.len() {
                return false;
            }
            // SAFETY: caller owns writable nonoverlapping storage; lock keeps source alive.
            unsafe { std::ptr::copy_nonoverlapping(bytes.as_ptr(), output, bytes.len()) };
            true
        })
        .unwrap_or(false)
    }

    /// Release once; repeated or unknown handles return false and cannot free another output.
    // SAFETY: this development library owns the uniquely prefixed symbol.
    #[unsafe(no_mangle)]
    pub extern "C" fn uuid_slug_release(handle: u32) -> bool {
        std::panic::catch_unwind(|| {
            OUTPUTS
                .lock()
                .ok()
                .is_some_and(|mut outputs| outputs.values.remove(&handle).is_some())
        })
        .unwrap_or(false)
    }

    #[test]
    fn release_and_capacity_errors_do_not_write_or_reuse_outputs() {
        let input = b"[]";
        // SAFETY: all pointers below borrow live local buffers for their declared lengths.
        let handle = unsafe { uuid_slug_evaluate(input.as_ptr(), input.len()) };
        assert_ne!(handle, 0);
        let length = uuid_slug_length(handle);
        assert!(length > 0 && length < 1024);
        let mut output = vec![0xa5; length];
        assert!(!unsafe { uuid_slug_copy(handle, output.as_mut_ptr(), length - 1) });
        assert!(output.iter().all(|byte| *byte == 0xa5));
        assert!(unsafe { uuid_slug_copy(handle, output.as_mut_ptr(), length) });
        assert!(uuid_slug_release(handle));
        assert!(!uuid_slug_release(handle));
        assert_eq!(uuid_slug_length(handle), usize::MAX);
        output.fill(0xa5);
        assert!(!unsafe { uuid_slug_copy(handle, output.as_mut_ptr(), length) });
        assert!(output.iter().all(|byte| *byte == 0xa5));
        let next = unsafe { uuid_slug_evaluate(input.as_ptr(), input.len()) };
        assert!(next > handle);
        assert!(uuid_slug_release(next));
    }
}
