// This virtual module selects the generated bindings and their optimized binary together.
declare module "uuid-slug-test-wasm" {
  export const binaryUrl: string;
  export default function initialize(options: {
    module_or_path: string;
  }): Promise<WebAssembly.Exports>;
  export function evaluate(input: string): unknown;
}
