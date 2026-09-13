// SPDX-License-Identifier: Apache-2.0

export const TEST_SENTINELS = [
  { name: "nil", uuid: "00000000-0000-7000-8000-000000000000" },
  { name: "anonymous", uuid: "00000000-0001-7000-8000-000000000000" },
  { name: "unknown", uuid: "00000000-0002-7000-8000-000000000000" },
] as const;

export const NIL_TEST_SENTINEL = TEST_SENTINELS.slice(0, 1);
