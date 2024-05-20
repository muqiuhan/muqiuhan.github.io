---
title: Rescript @genType import 问题
date: 2024-05-20 19:05:27
tags: [Technique, Rescript]
---


Rescript 11 之后，`@genType` 被合并进编译器，无需任何依赖就能使用，当在 Rescript 中 `@genType` 了使用某些 Rescript built-in 的基本类型时，可能会生成有问题的 `import` 相关代码，例如：

```rescript
@genType
module LoginResponse = {
  let status = response => {
    response
    ->Js.Json.decodeObject
    ->Option.flatMap(response => {
      response->Js_dict.get("status")
    })
  }
}
```

`status` 函数具有 `Js.Json.t => option<Js.Json.t>` 类型，那么在生成的 TypeScript 文件中，会出现这样的 import:

```typescript
import type { Json_t as Js_Json_t } from "./Js.gen.tsx"
```

而 `Js.gen.tsx` 这个文件是不存在的，解决方案是使用 `@genType` 的 `shim`：

- 在 `rescript.json` 中的 `gentypeconfig` 中添加 `shim` 配置:
```json
...
"gentypeconfig": {
...
  "shims": {
    "Js": "Js"
  },
...
}
...
```

- 然后新建 `Js.shim.ts`:
```typescript
export type Json_t = unknown;

export type t = unknown;

export type Exn_t = Error;
```

- 删除原来由 `@genType` 生成的 TypeScript 文件并重新生成

现在生成的 TypeScript 文件将会从 `Js.shim.ts` import 类型:

```typescript
import type {Json_t as Js_Json_t} from '../../src/model/Js.shim.ts';
```
