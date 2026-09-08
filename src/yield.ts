// SPDX-License-Identifier: Apache-2.0

const host = globalThis as {
  setImmediate?: (callback: () => void) => void;
};
const immediate = host.setImmediate?.bind(host);

/** Yield to a host task so timers, input and cancellation can run; a microtask would starve them. */
export function yieldToHost(): Promise<void> {
  // Prioritized scheduler continuations can overtake queued cancellation tasks in browsers.
  if (immediate) return new Promise((resolve) => immediate(resolve));
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    // eslint-disable-next-line unicorn/prefer-add-event-listener -- this private port has one handler; assignment also starts delivery
    channel.port1.onmessage = () => {
      channel.port1.close();
      channel.port2.close();
      resolve();
    };
    channel.port2.postMessage(null);
  });
}
