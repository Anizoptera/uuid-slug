// SPDX-License-Identifier: Apache-2.0

/** Fail a development probe immediately; this helper is never shipped as package behavior. */
export function unwrap<Value>(value: Value): Exclude<Value, Error> {
  if (value instanceof Error) throw value;
  return value as Exclude<Value, Error>;
}
