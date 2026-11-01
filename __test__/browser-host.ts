// Supply the test oracles' Node byte container without replacing any UUID implementation.
import { Buffer } from "buffer/";
import { server } from "vitest/browser";

const from = Buffer.from.bind(Buffer);
Object.defineProperty(Buffer, "from", {
  value(...args: unknown[]): unknown {
    if (typeof args[0] === "string" && args[1] === "base64url") args[1] = "base64";
    return Reflect.apply(from, Buffer, args);
  },
});
// eslint-disable-next-line typescript/unbound-method -- call() supplies the actual Buffer receiver.
const toString = Buffer.prototype.toString;
Buffer.prototype.toString = function (
  this: Buffer,
  encoding?: string,
  start?: number,
  end?: number,
) {
  const result = toString.call(this, encoding === "base64url" ? "base64" : encoding, start, end);
  return encoding === "base64url"
    ? result.replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "")
    : result;
};
Object.defineProperty(globalThis, "Buffer", { value: Buffer, configurable: true });
console.info(`Test worker: ${server.browser}; ${navigator.userAgent}`);

// Message delivery is an actual host task, not a guessed readiness delay.
export function setImmediate(): Promise<void> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.addEventListener(
      "message",
      () => {
        channel.port1.close();
        channel.port2.close();
        resolve();
      },
      { once: true },
    );
    channel.port1.start();
    channel.port2.postMessage(null);
  });
}
