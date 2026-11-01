//! Prove the shipped admission body using Verus's usize and checked_add contracts.
//! Allocation, diagnostics, compiled writes and other compilers need separate checks.
#![feature(proc_macro_hygiene)]
use vstd::prelude::*;

#[path = "../uuid-slug/src/buffer_range.rs"]
mod buffer_range;
