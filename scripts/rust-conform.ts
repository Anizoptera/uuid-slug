// Keep native host commands stable while their corpus lives beside the verification fixtures.
import { verifyNativeContracts } from "../__test__/rust-conform-probe";

export * from "../__test__/rust-conform-probe";

if (import.meta.main) await verifyNativeContracts();
