// Admit exactly the UUID writes that fit; wraparound must never create a valid destination.
#[cfg(verus_only)]
use vstd::prelude::*;

#[inline]
#[expect(
    clippy::collapsible_if,
    reason = "Verus checks this body but rejects let chains"
)]
#[cfg_attr(verus_only, verus_spec(result => ensures match result {
    Some(end) => end as int == offset as int + 16 && end <= capacity,
    None => (capacity as int) < offset as int + 16,
}))]
pub(crate) fn uuid_end(capacity: usize, offset: usize) -> Option<usize> {
    // An explicit branch lets the verifier check admission without trusting Option::filter.
    if let Some(end) = offset.checked_add(16) {
        if end <= capacity {
            return Some(end);
        }
    }
    None
}
