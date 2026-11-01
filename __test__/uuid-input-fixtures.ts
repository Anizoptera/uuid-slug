// Shared UUID inputs keep case spelling and version distinctions identical across behavioral suites.
export const SAMPLE_V7_A = "01987008-ef3e-7f69-b677-22ec1a5bbdb2";
export const MIXED_V7_A = SAMPLE_V7_A.replace(/[a-f]/, (digit) => digit.toUpperCase());
export const SAMPLE_V7_B = "01987bbb-178b-7858-93e8-fc5e5444913b";
export const SAMPLE_V4 = "b1ba599d-4844-4bb0-a1ee-ac0aeb8875f5";
