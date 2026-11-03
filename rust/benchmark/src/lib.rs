//! Time Rust application loops and expose direct conversion for host crossing measurements.
use std::hint::black_box;
#[path = "../../uuid-slug/benches/codec/cases.rs"]
mod cases;

#[cfg(all(target_arch = "wasm32", target_os = "unknown"))]
use wasm_bindgen::prelude::*;

#[cfg(all(target_arch = "wasm32", target_os = "unknown"))]
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = performance, js_name = now)]
    fn clock_ms() -> f64;
}

#[cfg(not(all(target_arch = "wasm32", target_os = "unknown")))]
fn clock_ms() -> f64 {
    static START: std::sync::LazyLock<std::time::Instant> =
        std::sync::LazyLock::new(std::time::Instant::now);
    START.elapsed().as_secs_f64() * 1000.0
}

/// Convert one UUID text value through the generated JavaScript/WASM boundary.
#[cfg(all(target_arch = "wasm32", target_os = "unknown"))]
#[wasm_bindgen]
pub fn plain(input: &str) -> Result<String, JsValue> {
    // A direct binding measures marshalling and real conversion without JSON test dispatch.
    uuid_slug::Uuid::from_uuid_string(input)
        .map(|uuid| {
            uuid.to_plain_uuid_slug(uuid_slug::UuidSlugAlphabet::Base64Url)
                .into_string()
        })
        .map_err(|error| JsValue::from_str(error.code().as_str()))
}

/// Return batch observations; setup, correctness checks and serialization are outside timing.
#[cfg_attr(all(target_arch = "wasm32", target_os = "unknown"), wasm_bindgen)]
pub fn benchmark(
    samples: u32,
    duration_ms: f64,
    warmup_ms: f64,
    filter: &str,
    batch_ticks: u32,
) -> String {
    assert!(samples > 0 && duration_ms > 0.0 && warmup_ms > 0.0);
    let probe_start = clock_ms();
    let mut previous = probe_start;
    let mut quantum = f64::INFINITY;
    loop {
        let now = clock_ms();
        if now > previous {
            quantum = quantum.min(now - previous);
        }
        previous = now;
        if now - probe_start >= warmup_ms {
            break;
        }
    }
    assert!(quantum.is_finite(), "clock never advanced");
    assert!(batch_ticks > 0);
    let duration_ms = duration_ms.max(quantum * f64::from(batch_ticks));
    let mut recorder = Measurements {
        quantum_ms: quantum,
        samples,
        duration_ms,
        warmup_ms,
        filter,
        rows: Vec::new(),
    };
    cases::visit(&mut recorder).expect("Rust benchmark setup failed");
    assert!(!recorder.rows.is_empty(), "filter selected no Rust calls");
    serde_json::to_string(&recorder.rows).expect("serialize observations")
}

/// Expose real provider outcomes so hosts can reject weak fallback without timing fault injection.
#[cfg_attr(all(target_arch = "wasm32", target_os = "unknown"), wasm_bindgen)]
pub fn entropy_probe() -> String {
    // Return failed draws as data so qualification can verify recovery without a trap.
    #[cfg(feature = "os-rng")]
    {
        let mut bytes = [0; 16];
        serde_json::json!({
            "provider": uuid_slug::fill_os_random_bytes(&mut bytes).is_ok(),
            "uuidV4": uuid_slug::generate_uuid_v4().is_ok(),
            "uuidV7": uuid_slug::UuidV7Generator::new().generate_uuid_v7_at_unix_ms_with_random_fill(
                1_725_000_000_000.0, uuid_slug::fill_os_random_bytes,
            ).is_ok(),
        })
        .to_string()
    }
    #[cfg(not(feature = "os-rng"))]
    "{}".to_owned()
}

struct Measurements<'a> {
    quantum_ms: f64,
    samples: u32,
    duration_ms: f64,
    warmup_ms: f64,
    filter: &'a str,
    rows: Vec<serde_json::Value>,
}

impl cases::Recorder for Measurements<'_> {
    fn sample<T>(
        &mut self,
        name: &str,
        inputs: &[uuid_slug::Uuid],
        mut operation: impl FnMut(uuid_slug::Uuid) -> T,
    ) {
        let Self {
            samples,
            duration_ms,
            warmup_ms,
            filter,
            ..
        } = *self;
        if !filter.is_empty() && !filter.split(',').any(|term| name.contains(term)) {
            return;
        }
        let mut cursor = 0;
        let mut batch = |count: usize| {
            for _ in 0..count {
                let _ = black_box(operation(black_box(inputs[cursor % inputs.len()])));
                cursor = cursor.wrapping_add(1);
            }
        };
        // Calibrate against the actual host clock; elapsed time bounds work, never readiness.
        let mut count = inputs.len();
        let mut calibration = Vec::new();
        let mut resolved = 0;
        let warmup = clock_ms();
        while clock_ms() - warmup < warmup_ms || resolved < 2 {
            let start = clock_ms();
            batch(count);
            let elapsed = clock_ms() - start;
            calibration.push(serde_json::json!({"count": count, "elapsedMs": elapsed}));
            if elapsed < duration_ms {
                count = count.checked_mul(2).expect("batch overflow");
                resolved = 0;
            } else {
                resolved += 1;
            }
        }
        let mut ns = Vec::new();
        let mut operations = 0usize;
        for _ in 0..samples {
            let start = clock_ms();
            batch(count);
            let elapsed = clock_ms() - start;
            assert!(elapsed.is_finite() && elapsed > 0.0, "unresolved timer");
            ns.push(elapsed * 1e6 / count as f64);
            operations = operations
                .checked_add(count)
                .expect("operation count overflow");
        }
        self.rows.push(
            serde_json::json!({"name": name, "ns": ns, "operations": operations, "calibration": calibration, "clockQuantumMs": self.quantum_ms, "targetBatchMs": duration_ms}),
        );
    }
}
