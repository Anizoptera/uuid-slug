//! Measure varied identifier operations separately from setup and host-bridge overhead.
use std::{hint::black_box, time::Instant};
use uuid_slug::{Error, Uuid};

const SAMPLE_ROUNDS: usize = 5;
const CALLS_PER_ROUND: usize = 100_000;

fn sample<T>(name: &str, inputs: &[Uuid], mut operation: impl FnMut(Uuid) -> T) {
    // Isolate one operation for allocation attribution without changing its workload.
    static FILTER: std::sync::LazyLock<Option<String>> =
        std::sync::LazyLock::new(|| std::env::var("UUID_SLUG_PROFILE_FILTER").ok());
    static PREPARE_ONLY: std::sync::LazyLock<bool> = std::sync::LazyLock::new(|| {
        std::env::var("UUID_SLUG_CODEC_PREPARE_ONLY").as_deref() == Ok("1")
    });
    if FILTER
        .as_ref()
        .is_some_and(|filter| !filter.split(',').any(|term| name.contains(term)))
    {
        return;
    }
    for id in inputs {
        black_box(operation(*id));
    }
    // Exercise the same registered calls under load without reading a performance clock.
    if *PREPARE_ONLY {
        println!(
            "{}",
            serde_json::json!({
                "operation": name, "preparedCalls": inputs.len(),
                "rounds": SAMPLE_ROUNDS, "callsPerRound": CALLS_PER_ROUND
            })
        );
        return;
    }
    for round in 0..SAMPLE_ROUNDS {
        let started = Instant::now();
        for index in 0..CALLS_PER_ROUND {
            black_box(operation(inputs[(index + round) % inputs.len()]));
        }
        println!(
            "{}",
            serde_json::json!({
                "operation": name, "round": round, "calls": CALLS_PER_ROUND,
                "nsPerCall": started.elapsed().as_nanos() as f64 / CALLS_PER_ROUND as f64
            })
        );
    }
}

#[cfg(feature = "os-rng")]
fn entropy_resources() -> Result<(), Error> {
    use uuid_slug::{UuidV7Generator, fill_os_random_bytes, generate_uuid_v4_with_random_fill};
    // Count calls reaching the real platform source, not the OS's internal refills or syscalls.
    for version in [4, 7] {
        let mut generator = UuidV7Generator::new();
        let (mut draws, mut bytes) = (0, 0);
        let calls = 10_000;
        let started = Instant::now();
        for _ in 0..calls {
            let fill = |out: &mut [u8]| {
                draws += 1;
                bytes += out.len();
                fill_os_random_bytes(out)
            };
            black_box(if version == 4 {
                generate_uuid_v4_with_random_fill(fill)?
            } else {
                generator.generate_uuid_v7_at_unix_ms_with_random_fill(1000.0, fill)?
            });
        }
        println!(
            "{}",
            serde_json::json!({
                "operation": "generation/platform-source", "version": version,
                "calls": calls, "nsPerCall": started.elapsed().as_nanos() as f64 / calls as f64,
                "draws": draws, "requestedBytes": bytes
            })
        );
    }
    // Include thread startup/join cost; each worker owns its sequence and uses real entropy.
    for threads in [1, 4] {
        let calls = 10_000;
        let started = Instant::now();
        std::thread::scope(|scope| {
            let workers: Vec<_> = (0..threads)
                .map(|_| {
                    scope.spawn(|| -> Result<(), Error> {
                        let mut generator = UuidV7Generator::new();
                        for _ in 0..calls / threads {
                            black_box(generator.generate_uuid_v7_at_unix_ms_with_random_fill(
                                1000.0,
                                fill_os_random_bytes,
                            )?);
                        }
                        Ok(())
                    })
                })
                .collect();
            for worker in workers {
                worker.join().expect("benchmark worker panicked")?;
            }
            Ok::<_, Error>(())
        })?;
        println!(
            "{}",
            serde_json::json!({
                "operation": "generation/parallel-platform-source", "threads": threads,
                "calls": calls, "nsPerCall": started.elapsed().as_nanos() as f64 / calls as f64
            })
        );
    }
    Ok(())
}

#[path = "codec/cases.rs"]
mod cases;
use cases::visit;

#[cfg(not(all(target_arch = "wasm32", target_os = "unknown")))]
fn main() -> Result<(), Error> {
    struct Native;
    impl cases::Recorder for Native {
        fn sample<T>(&mut self, name: &str, inputs: &[Uuid], operation: impl FnMut(Uuid) -> T) {
            sample(name, inputs, operation);
        }
    }
    visit(&mut Native)?;
    #[cfg(feature = "os-rng")]
    if std::env::var_os("UUID_SLUG_PROFILE_FILTER").is_none() {
        entropy_resources()?;
    }
    println!("{{\"complete\":true}}");
    Ok(())
}
