//! Development hosts run the same dispatcher without publishing a native ABI.

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
    future: std::pin::Pin<
        Box<
            dyn std::future::Future<Output = Result<uuid_slug::MaskSchema, uuid_slug::Error>>
                + Send,
        >,
    >,
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
            .map_err(|error| wasm_bindgen::JsValue::from_str(error.code().as_str()))?;
        uuid.timestamp()
            .map_err(|error| wasm_bindgen::JsValue::from_str(error.code().as_str()))?;
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
        let mut context = std::task::Context::from_waker(std::task::Waker::noop());
        match self.future.as_mut().poll(&mut context) {
            std::task::Poll::Pending => Ok(None),
            std::task::Poll::Ready(result) => result
                .and_then(|mask| {
                    uuid_slug::Codec::new(uuid_slug::CodecOptions::new(mask))?
                        .uuid_v7_to_masked_slug(self.uuid)
                })
                .map(Some)
                .map_err(|error| wasm_bindgen::JsValue::from_str(error.code().as_str())),
        }
    }
}
