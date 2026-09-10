// Derive research lanes from installed hosts so conformance and benchmarks cannot drift apart.
export type NativeTransport = "ffi" | "napi";

export interface NativeLane {
  readonly command: readonly string[];
  readonly env: Readonly<Record<string, string>>;
  readonly expectedTransport:
    | "Bun FFI"
    | "Bun Node-API"
    | "Deno FFI"
    | "Deno Node-API"
    | "Node FFI"
    | "Node Node-API";
  readonly host: string;
  readonly label: string;
  readonly transport: NativeTransport;
}

interface Host {
  readonly env: Readonly<Record<string, string>>;
  readonly executable: readonly string[];
  readonly ffiArguments: readonly string[];
  readonly name: "Bun" | "Deno" | "Node";
  readonly source: boolean;
  readonly transports: readonly NativeTransport[];
  readonly version: string;
}

function compareVersions(left: string, right: string): number {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index++) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference) return difference;
  }
  return 0;
}

async function capture(command: readonly string[], env: Readonly<Record<string, string>> = {}) {
  const child = Bun.spawn([...command], {
    env: { ...process.env, ...env },
    stderr: "pipe",
    stdout: "pipe",
  });
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  if (exitCode !== 0) throw new Error(`${command.join(" ")} exited ${exitCode}: ${stderr.trim()}`);
  return stdout.trim();
}

async function asdfVersions(tool: "bun" | "nodejs"): Promise<string[]> {
  if (!Bun.which("asdf")) return [];
  return (await capture(["asdf", "list", tool]))
    .split("\n")
    .map((line) => line.replace("*", "").trim())
    .filter((version) => /^\d+\.\d+\.\d+$/.test(version));
}

function newestPerMajor(versions: readonly string[]): string[] {
  const newest = new Map<string, string>();
  for (const version of versions) {
    const major = version.split(".")[0] ?? version;
    const current = newest.get(major);
    if (!current || compareVersions(version, current) > 0) newest.set(major, version);
  }
  return [...newest.values()];
}

export async function nativeMatrix(
  sourceEntry: string,
  bundledEntry: string,
): Promise<NativeLane[]> {
  const [nodeVersions, bunVersions, denoVersion] = await Promise.all([
    asdfVersions("nodejs"),
    asdfVersions("bun"),
    Bun.which("deno")
      ? capture(["deno", "eval", "console.log(Deno.version.deno)"])
      : Promise.resolve(undefined),
  ]);
  const hosts: Host[] = [];
  const availableNodeVersions = nodeVersions.length
    ? nodeVersions
    : [(await capture(["node", "--version"])).replace(/^v/, "")];

  for (const version of newestPerMajor(availableNodeVersions)) {
    const major = Number(version.split(".")[0]);
    if (major < 20) continue;
    hosts.push({
      env: nodeVersions.length ? { ASDF_NODEJS_VERSION: version } : {},
      executable: nodeVersions.length ? ["asdf", "exec", "node"] : ["node"],
      ffiArguments:
        major >= 26 ? ["--experimental-ffi", "--disable-warning=ExperimentalWarning"] : [],
      name: "Node",
      source: false,
      transports: major >= 26 ? ["napi", "ffi"] : ["napi"],
      version,
    });
  }

  const bunVersion = bunVersions.at(-1) ?? Bun.version;
  hosts.push({
    env: bunVersions.length ? { ASDF_BUN_VERSION: bunVersion } : {},
    executable: bunVersions.length ? ["asdf", "exec", "bun"] : [process.execPath],
    ffiArguments: [],
    name: "Bun",
    source: true,
    transports: ["napi", "ffi"],
    version: bunVersion,
  });
  if (denoVersion)
    hosts.push({
      env: {},
      executable: ["deno", "run", "--allow-ffi", "--allow-env", "--allow-read"],
      ffiArguments: [],
      name: "Deno",
      source: false,
      transports: ["napi", "ffi"],
      version: denoVersion,
    });

  return hosts.flatMap((host) =>
    host.transports.map((transport) => ({
      command: [
        ...host.executable,
        ...(transport === "ffi" ? host.ffiArguments : []),
        host.source ? sourceEntry : bundledEntry,
      ],
      env: { ...host.env, UUID_SLUG_RUST_TRANSPORT: transport },
      expectedTransport: `${host.name} ${transport === "ffi" ? "FFI" : "Node-API"}` as const,
      host: `${host.name} ${host.version}`,
      label: `${host.name} ${host.version} ${transport === "ffi" ? "FFI" : "Node-API"}`,
      transport,
    })),
  );
}
