---
title: 小谈 NestJS Zod
date: 2026-03-21 14:09:40
tags: [Technique]
---

NestJS Zod 理论上是可以成为一层真正的契约系统的：请求校验、类型推导、OpenAPI 生成、领域约束复用，前后端一致的输入语义，都在同一份定义里。

> 领域约束是否要复用需要讨论，但只说技术上可行。

最简单的用法是用 `z.object(...)` 定义 schema，用 `createZodDto(schema)` 生成 DTO，然后引入一个全局的 `ZodValidationPipe`。大概是这样：

```ts
import { Module } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';

@Module({
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe
    }
  ]
})
export class AppModule {}
```

DTO 只是 schema 的包装：

```ts
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const createItemSchema = z.object({
  name: z.string().trim().min(1),
  price: z.number().nonnegative()
});

export class CreateItemDto extends createZodDto(createItemSchema) {}
```

这样运行时校验和 TypeScript 类型就共享同一份定义了。

---

Zod 可以很简单的实现字符串非空、数字范围、枚举取值、对象结构、Discriminated Union。DU 比传统 DTO 写法强，因为不同 `type` 对应的字段集合可以天然收敛：

```ts
const requestSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('A'),
    payload: z.object({
      foo: z.string()
    })
  }),
  z.object({
    type: z.literal('B'),
    payload: z.object({
      bar: z.number()
    })
  })
]);
```

但真实业务的问题通常不止于单字段合法。我遇到的一些情况有：
- 某个数组元素本身没问题，但数组整体不能重复
- 某个字段语法上合法，但必须属于当前 `recordType` 允许的字段集合
- 两个字段分别没问题，但组合起来语义冲突

这类规则会比较严重的影响接口可维护性，它们的特点是 "结构正确，语义错误”，假设请求结构是这样的：

```ts
{
  recordType: 'A',
  structuredData: { ... },
  fieldExceptions: [
    { fieldKey: 'x' },
    { fieldKey: 'y' }
  ]
}
```

此处 `fieldExceptions` 的意思是 “标记 structuredData 中的某个字段在业务上的特殊情况”，例如在数据标注系统中，数据标注人员无法结构化录入某个字段。

单看每一项 `{ fieldKey: z.string(), reason?: z.string() }` 完全合法。但可能出现这种情况：

```ts
fieldExceptions: [
  { fieldKey: 'x' },
  { fieldKey: 'x' }
]
```

JSON 结构没问题，类型也没问题，但业务语义上明显重复了。NestJS Zod 处理这类问题的方法是直接在 schema 层面操作：

```ts
function withUniqueFieldExceptions<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((value, ctx) => {
    const fieldExceptions = (value as {
      fieldExceptions?: Array<{ fieldKey: string }>;
    }).fieldExceptions;

    if (!fieldExceptions) return;

    const seen = new Set<string>();

    for (const [index, item] of fieldExceptions.entries()) {
      if (seen.has(item.fieldKey)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate field exception for ${item.fieldKey}.`,
          path: ['fieldExceptions', index, 'fieldKey']
        });
      }

      seen.add(item.fieldKey);
    }
  });
}
```

如果把去重校验写在 service/command/query 中，系统中的其他任何组件（例如测试）都可能绕过去。但如果写在 schema 中，所有入口只要用的是这份 schema，就天然继承这个约束。

注意在这个 helper 中有一个细节：错误路径要详细到具体数组项。`path: ['fieldExceptions', index, 'fieldKey']` 这个写法可以让前端拿到错误后不只是知道请求失败，而是能知道哪一项重复/错误。对于复杂表单，这种可定位性比一条顶层报错有用。

另外我这里给出的 helper 主要向展示的是 schema 层面的约束能力，不是业务对象， `withUniqueFieldExceptions` 不是某个接口私有逻辑，而是一种可复用的 schema 装饰器模式。同理可以有 `withUniqueAttachmentChanges`、`withNonOverlappingRanges`、`withConsistentDateOrder`。这类 helper 一旦抽出来，schema 层就具备组合能力，业务约束可以像搭积木一样拼装。

沿着这个思路，我们可以进一步的表示 “`fieldExceptions[].fieldKey` 不应该是任意字符串，它必须属于当前 `recordType` 允许的字段集合”：

```ts
function createFieldExceptionSchema(fieldKeys: [string, ...string[]]) {
  return z.object({
    fieldKey: z.enum(fieldKeys),
    reason: z.string().trim().max(500).optional()
  });
}
```

然后在 `discriminatedUnion` 的每个分支里绑定自己的字段白名单：

```ts
const requestSchema = z.discriminatedUnion('recordType', [
  withUniqueFieldExceptions(
    z.object({
      recordType: z.literal('A'),
      structuredData: z.object({
        foo: z.union([z.number(), z.string(), z.null()])
      }).strict(),
      fieldExceptions: z.array(createFieldExceptionSchema(['foo'])).default([])
    })
  ),
  withUniqueFieldExceptions(
    z.object({
      recordType: z.literal('B'),
      structuredData: z.object({
        bar: z.union([z.number(), z.string(), z.null()])
      }).strict(),
      fieldExceptions: z.array(createFieldExceptionSchema(['bar'])).default([])
    })
  )
]);
```

这样 `recordType` 和合法字段天然绑定，不需要额外写一堆 if/else，错误会在 parse 阶段就暴露而不是进入业务流程后才抛异常。schema 在这里承担了类型分支的职责。

---

但对于复杂输入的场景，需要注意分层，validator 和 normalizer 应该分开。schema 不一定负责把所有值变干净，但它应该负责把输入约束在一个可以被 normalizer 处理的范围内。比如数值输入，前端可能传 `12.3`、`"12.3"`、`null`，schema 可以先允许 `z.union([z.number(), z.string(), z.null()])`，parse 成功之后再进入统一的 normalizer。这种分层比在 schema 里直接做满所有 coercion 会更加可维护，因为它把两个问题拆开了：schema 负责数据能不能被系统处理，normalizer 负责进来的数据如何变成领域标准格式。这能避免 schema 逐渐膨胀成一个难以维护的黑盒。

运行时 schema 和文档 schema 可以适度分离。有些真实运行时 schema 很复杂，比如 DU、`superRefine`、动态字段白名单等，有些约束还依赖运行时上下文，这些对 OpenAPI JSON Spec 的生成不一定友好。可以考虑保留两套：`requestSchema` 真实运行时校验用，`requestDtoSchema` 专门服务 OpenAPI 的描述性 schema。controller 的 DTO 从 `requestDtoSchema` 生成，但真正执行业务前，再对原始 payload 走一次 `requestSchema.safeParse(...)`。

> 文档可读性和运行时严谨性不必强行绑定在同一份 schema 表达能力上。如果一份 schema 同时满足两者当然最好，如果不能，优先保证运行时正确性。

注意，虽然 Controller 已经有 `ZodValidationPipe`，但如果用 CQRS，那么在 command/query handler 最好还要再次 `safeParse` 一下，因为进入 handler 的 payload 未必只来自 HTTP，还可能来自 cron、queue consumer、internal dispatch、test fixture、script。如果 handler 是真正的业务入口，那它就应该自己守住边界。这不是重复，而是分层后更加清晰的职责，因为 Pipe 只保护 HTTP 入口，handler 内 `safeParse` 主要保护业务入口。

最后，直接对 schema 写测试：

```ts
it('rejects duplicated field exceptions', () => {
  const result = requestSchema.safeParse({
    recordType: 'A',
    structuredData: { foo: '1' },
    fieldExceptions: [
      { fieldKey: 'foo' },
      { fieldKey: 'foo' }
    ]
  });

  expect(result.success).toBe(false);
});
```

这种测试验证的是契约本身，不是某个 service 逻辑的分支，这种测试看起来更有价值也更清晰。
