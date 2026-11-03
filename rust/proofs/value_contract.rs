//! Prove shipped buffer admission and payload partition bodies with Verus.
//! Allocation, diagnostics, compiled writes and other compilers need separate checks.
#![feature(proc_macro_hygiene)]
use vstd::prelude::*;

#[path = "../uuid-slug/src/buffer_range.rs"]
mod buffer_range;

#[path = "../uuid-slug/src/payload_fields.rs"]
mod payload_fields;

#[path = "../uuid-slug/src/generation_state.rs"]
mod generation_state;
