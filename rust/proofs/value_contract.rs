//! Prove production buffer admission, payload partitioning and generation arithmetic with Verus.
//! Entropy, state commits, diagnostics and native machine code need separate evidence.
#![feature(proc_macro_hygiene)]
use vstd::prelude::*;

#[path = "../uuid-slug/src/buffer_range.rs"]
mod buffer_range;

#[path = "../uuid-slug/src/payload_fields.rs"]
mod payload_fields;

#[path = "../uuid-slug/src/generation_state.rs"]
mod generation_state;
