//! Native and WASI hosts share the browser operation corpus and measurement loop.
fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let samples = args.first().map_or(7, |s| s.parse().expect("samples"));
    let duration = args.get(1).map_or(3.0, |s| s.parse().expect("duration"));
    let warmup = args.get(2).map_or(16.0, |s| s.parse().expect("warmup"));
    let filter = args.get(3).map_or("", String::as_str);
    let ticks = args
        .get(4)
        .expect("batch ticks")
        .parse()
        .expect("batch ticks");
    println!(
        "{}",
        uuid_slug_benchmark::benchmark(samples, duration, warmup, filter, ticks)
    );
}
