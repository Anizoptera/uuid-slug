interface RustdocItem {
  readonly name: string | null;
  readonly deprecation: object | null;
  readonly inner: {
    readonly struct?: {
      readonly kind: { readonly plain?: { readonly fields: readonly number[] } };
      readonly impls: readonly number[];
    };
    readonly enum?: { readonly variants: readonly number[]; readonly impls: readonly number[] };
    readonly union?: { readonly fields: readonly number[]; readonly impls: readonly number[] };
    readonly trait?: { readonly items: readonly number[] };
    readonly impl?: { readonly trait: object | null; readonly items: readonly number[] };
  };
}

interface RustdocPath {
  readonly crate_id: number;
  readonly path: readonly string[];
}

export interface Rustdoc {
  readonly index: Readonly<Record<string, RustdocItem>>;
  readonly paths: Readonly<Record<string, RustdocPath>>;
}

export function rustPath(declaration: string): string | undefined {
  return /uuid_slug(?:::[A-Za-z_][A-Za-z0-9_]*)+/.exec(declaration)?.[0];
}

export function annotateRustApi(source: string, deprecated: ReadonlySet<string>): string {
  return source
    .trim()
    .split("\n")
    .map((line) => {
      const path = rustPath(line);
      return path && deprecated.has(path) ? `#[deprecated] ${line}` : line;
    })
    .join("\n");
}

export function rustDeprecations(rustdoc: Rustdoc): string[] {
  const deprecated = new Set<string>();
  const add = (id: number, owner: readonly string[]): void => {
    const item = rustdoc.index[id];
    if (item?.deprecation && item.name) deprecated.add([...owner, item.name].join("::"));
  };
  for (const [id, path] of Object.entries(rustdoc.paths)) {
    if (path.crate_id !== 0) continue;
    const item = rustdoc.index[id];
    if (!item) continue;
    if (item.deprecation) deprecated.add(path.path.join("::"));
    const children =
      item.inner.struct?.kind.plain?.fields ??
      item.inner.enum?.variants ??
      item.inner.union?.fields ??
      item.inner.trait?.items ??
      [];
    for (const child of children) add(child, path.path);
    const impls =
      item.inner.struct?.impls ?? item.inner.enum?.impls ?? item.inner.union?.impls ?? [];
    for (const impl of impls) {
      const body = rustdoc.index[impl]?.inner.impl;
      if (!body?.trait) for (const child of body?.items ?? []) add(child, path.path);
    }
  }
  return [...deprecated];
}
