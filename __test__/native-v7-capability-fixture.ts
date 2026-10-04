// SPDX-License-Identifier: Apache-2.0

import { runtime } from "#runtime";

// Selection must see capability before public modules load, including on the Node test host.
// The owning probe replaces this canary before calling; drawing during import is a defect.
export const nativeUuidV7CapabilityCanary = () => {
  throw new Error("UUIDv7 capability selection must not draw during import");
};
if (process.env.UUID_SLUG_NATIVE_V7_PROBE === "1") {
  runtime.uuidV7 = nativeUuidV7CapabilityCanary;
  runtime.uuidV7Slug = nativeUuidV7CapabilityCanary;
}
