interface RustdocItem {
  readonly name: string | null;
  readonly deprecation: object | null;
  readonly inner: {
    readonly assoc_const?: object;
    readonly assoc_type?: object;
    readonly constant?: object;
    readonly function?: object;
    readonly static?: object;
    readonly struct?: {
      readonly kind: { readonly plain?: { readonly fields: readonly number[] } };
      readonly impls: readonly number[];
    };
    readonly struct_field?: object;
    readonly enum?: { readonly variants: readonly number[]; readonly impls: readonly number[] };
    readonly type_alias?: object;
    readonly union?: { readonly fields: readonly number[]; readonly impls: readonly number[] };
    readonly trait?: { readonly items: readonly number[] };
    readonly impl?: { readonly trait: object | null; readonly items: readonly number[] };
    readonly variant?: object;
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

function rustPath(declaration: string): string | undefined {
  let cursor = declaration.indexOf("uuid_slug");
  if (cursor < 0) return undefined;
  let path = "uuid_slug";
  cursor += path.length;
  while (declaration.slice(cursor, cursor + 2) === "::") {
    cursor += 2;
    const segment = /^(?:r#)?([\p{ID_Start}_][\p{ID_Continue}]*)/u.exec(declaration.slice(cursor));
    if (!segment?.[0] || !segment[1]) break;
    path += `::${segment[1]}`;
    cursor += segment[0].length;
    if (declaration[cursor] !== "<") continue;
    let depth = 0;
    do {
      const token = declaration[cursor++];
      if (token === "<") depth++;
      else if (token === ">") depth--;
    } while (depth > 0 && cursor < declaration.length);
  }
  return path === "uuid_slug" ? undefined : path;
}

function rustDeclarationKey(declaration: string): string | undefined {
  const path = rustPath(declaration);
  if (!path) return undefined;
  if (/^pub (?:(?:async|const|unsafe) )*(?:extern "[^"]+" )?fn /.test(declaration))
    return `function ${path}`;
  const keyword = /^pub (mod|struct|enum|union|trait|type|const|static|macro) /.exec(
    declaration,
  )?.[1];
  return `${keyword ?? "value"} ${path}`;
}

function rustdocKind(item: RustdocItem): string {
  if (item.inner.function) return "function";
  if (item.inner.assoc_const || item.inner.constant) return "const";
  if (item.inner.assoc_type || item.inner.type_alias) return "type";
  if (item.inner.struct_field || item.inner.variant) return "value";
  return Object.keys(item.inner)[0] ?? "value";
}

export function annotateRustApi(source: string, deprecated: ReadonlySet<string>): string {
  return source
    .trim()
    .split("\n")
    .map((line) => {
      const key = rustDeclarationKey(line);
      return key && deprecated.has(key) ? `#[deprecated] ${line}` : line;
    })
    .join("\n");
}

export function rustDeprecations(rustdoc: Rustdoc): string[] {
  const deprecated = new Set<string>();
  const add = (id: number, owner: readonly string[]): void => {
    const item = rustdoc.index[id];
    if (!item?.name) return;
    if (item.deprecation)
      deprecated.add(`${rustdocKind(item)} ${[...owner, item.name].join("::")}`);
  };
  for (const [id, path] of Object.entries(rustdoc.paths)) {
    if (path.crate_id !== 0) continue;
    const item = rustdoc.index[id];
    if (!item) continue;
    if (item.deprecation) deprecated.add(`${rustdocKind(item)} ${path.path.join("::")}`);
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
