//! Suspend at a foreign callback and replay its completed prefix without invoking it twice.
//!
//! Codecs are immutable and construction publishes only on success, so replay changes no sequence
//! state. JavaScript executes its own callback; Rust still validates every result and inverse.
use serde_json::{Value, json};
use std::cell::RefCell;
use uuid_slug::{Error, ErrorCode};

#[derive(Default)]
struct Callbacks {
    results: Vec<Value>,
    cursor: usize,
    pending: Option<Value>,
}
thread_local! { static CALLBACKS: RefCell<Callbacks> = RefCell::new(Callbacks::default()); }

pub fn begin(request: &Value) {
    CALLBACKS.with(|state| {
        *state.borrow_mut() = Callbacks {
            results: request["callbacks"].as_array().cloned().unwrap_or_default(),
            ..Callbacks::default()
        }
    });
}
pub fn pending() -> Option<Value> {
    CALLBACKS.with(|state| state.borrow_mut().pending.take())
}

pub fn invoke(id: u64, input: [u8; 16]) -> Result<[u8; 16], Error> {
    CALLBACKS.with(|state| {
        let mut state = state.borrow_mut();
        let cursor = state.cursor;
        state.cursor += 1;
        if let Some(result) = state.results.get(cursor) {
            assert_eq!(
                result["callback"], id,
                "foreign callback replay changed its target"
            );
            assert_eq!(
                result["input"],
                json!(input),
                "foreign callback replay changed its input"
            );
            serde_json::from_value(result["output"].clone())
                .map_err(|_| Error::new(ErrorCode::InvalidMask))
        } else {
            state.pending = Some(json!({"callback":id,"input":input}));
            Err(Error::new(ErrorCode::InvalidMask))
        }
    })
}
