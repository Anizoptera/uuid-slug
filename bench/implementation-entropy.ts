// Qualification runs before timing and restores host functions; timed calls keep native entropy costs.
export interface EntropyEvidence {
  required: boolean;
  rejectedSourceCalls: number;
  secureSourceCalls: number;
  sources: string[];
}

export function qualifyEntropy<Value>(
  probe: () => Readonly<Record<string, boolean>>,
  prepare: () => Value,
  required = true,
): { value: Value; entropy: EntropyEvidence } {
  const web = globalThis.crypto;
  // eslint-disable-next-line typescript/unbound-method -- Restore this exact method; calls below retain its Crypto receiver.
  const originalWeb = web?.getRandomValues;
  const host = globalThis as typeof globalThis & {
    process?: {
      getBuiltinModule?: (name: "node:crypto") => {
        randomFillSync?: (bytes: Uint8Array) => Uint8Array;
      };
    };
  };
  const node = host.process?.getBuiltinModule?.("node:crypto");
  const originalNode = node?.randomFillSync;
  const originalMath = Math.random;
  let blocked = true;
  let webCalls = 0;
  let nodeCalls = 0;
  const failure = new Error("Secure entropy deliberately unavailable during qualification");
  try {
    Math.random = () => {
      throw new Error("Insecure Math.random is forbidden in implementation benchmarks");
    };
    if (web && originalWeb)
      web.getRandomValues = <Array extends ArrayBufferView | null>(array: Array): Array => {
        webCalls++;
        if (blocked) throw failure;
        originalWeb.call(web, array);
        return array;
      };
    if (node && originalNode)
      node.randomFillSync = (bytes) => {
        nodeCalls++;
        if (blocked) throw failure;
        return originalNode(bytes);
      };
    const rejected = Object.values(probe());
    const rejectedSourceCalls = webCalls + nodeCalls;
    if (
      required &&
      (!rejected.length || rejected.some((success) => success) || !rejectedSourceCalls)
    )
      throw new Error("Generation did not reject a failed secure source; no timing is valid.");
    if (!required && (rejected.length || rejectedSourceCalls))
      throw new Error("Reduced build unexpectedly exposes entropy-dependent generation.");
    blocked = false;
    const successful = Object.values(probe());
    if (
      required &&
      (!successful.length ||
        successful.some((success) => !success) ||
        webCalls + nodeCalls === rejectedSourceCalls)
    )
      throw new Error(
        "Generation did not reach the real secure source after failure; no timing is valid.",
      );
    const value = prepare();
    return {
      value,
      entropy: {
        required,
        rejectedSourceCalls,
        secureSourceCalls: webCalls + nodeCalls - rejectedSourceCalls,
        sources: [
          ...(webCalls ? ["crypto.getRandomValues"] : []),
          ...(nodeCalls ? ["node:crypto.randomFillSync"] : []),
        ],
      },
    };
  } finally {
    Math.random = originalMath;
    if (web && originalWeb) web.getRandomValues = originalWeb;
    if (node && originalNode) node.randomFillSync = originalNode;
  }
}
