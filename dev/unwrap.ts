// SPDX-License-Identifier: Apache-2.0

/** Fail a success-path fixture immediately while preserving its typed value. */
function assertValue<T>(value: T): asserts value is Exclude<T, Error> {
  if (value instanceof Error) throw value;
}

export function unwrap<T>(value: T) {
  assertValue(value);
  return value;
}
