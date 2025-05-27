---
title: N+1 selects problem 与 Prisma ORM
date: 2025-04-02 16:45:37
tags: [Technique]
---

N+1 查询问题是指在通过 ORM 查询数据时，执行了一次初始查询来获取父对象列表（这 1 次查询），然后为列表中的每一个父对象都单独执行了一次额外的查询来获取其关联的子对象（这 N 次查询）。最终导致总共执行了 1 + N 次数据库查询，其中 N 是初始查询返回的父对象的数量。

举个例子：

假设有两个数据库模型：`User`（用户）和 `Post`（帖子），一个用户可以有多篇帖子（一对多关系）。

现在，需要获取前 10 个用户以及他们各自的所有帖子。

一种有问题的 ORM 实现（或不当的使用方式）可能会这样执行：

1.  第一次查询 (The "1"): 获取前 10 个用户。
    ```sql
    SELECT * FROM User LIMIT 10;
    ```
2.  接下来的 N (=10) 次查询 (The "N"): 对于上一步获取到的每一个用户，单独执行一次查询来获取该用户的帖子。
    ```sql
    -- 用户 1
    SELECT * FROM Post WHERE authorId = 1;
    -- 用户 2
    SELECT * FROM Post WHERE authorId = 2;
    -- 用户 3
    SELECT * FROM Post WHERE authorId = 3;
    -- ... 直到 用户 10
    SELECT * FROM Post WHERE authorId = 10;
    ```

在这个场景下，总共执行了 1 + 10 = 11 次数据库查询。如果 N 的值很大（比如获取 1000 个用户），就会产生 1001 次查询，这对数据库造成巨大的、不必要的压力，并显著增加应用程序的响应时间。每一次数据库交互都有网络延迟和数据库处理的开销，N+1 次查询会将这些开销放大 N 倍。

N+1 问题通常源于 ORM 处理关联数据的方式，特别是与“懒加载”（Lazy Loading）相关的策略。懒加载是指只有在显式访问关联属性时，ORM 才会去数据库加载这些数据。虽然这在某些情况下可以避免加载不需要的数据，但如果在循环中访问关联属性，就很容易触发 N+1 问题。

然而，问题的根源在于没有有效地预先加载（或批量加载）所需的关联数据。即使不使用严格意义上的懒加载，如果 ORM 在处理关联查询时不够智能，采用了逐个获取关联对象的策略，同样会产生 N+1 查询。

在 Prisma 出现之前或在其他 ORM 中，解决 N+1 问题常见的方法包括：

1.  预先加载（Eager Loading）: 在执行初始查询时，就明确指示 ORM 同时将关联数据也查询出来。这通常通过 SQL 的 `JOIN` 操作实现。例如，一次性查询出用户和他们的帖子。虽然这减少了查询次数，但复杂的 `JOIN` 可能会导致查询本身变得庞大和低效，并可能返回冗余数据。
2.  批量加载（Batch Loading）: 先执行初始查询获取父对象列表，然后收集所有父对象的 ID，在第二次查询中使用 `WHERE IN (...)` 子句一次性加载所有相关的子对象。这种方式通常需要两次查询，但避免了 N 次单独的查询。

Prisma ORM 在设计上就考虑了 N+1 问题，并提供了一种既方便开发者又高效的解决方案。当使用 Prisma Client 查询数据并需要包含关联模型时，Prisma 会自动优化查询，避免产生 N+1 查询，主要通过关系查询（Relation Queries）中的 `include` 选项或嵌套读取（nested reads）来实现这一点：

假设想获取所有用户及其发布的帖子，使用 Prisma Client，可以这样写：

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function getUsersWithPosts() {
  const usersWithPosts = await prisma.user.findMany({
    include: {
      posts: true, // 指示 Prisma 加载关联的 posts
    },
  })
  // usersWithPosts 包含了用户列表，每个用户对象中都有一个 posts 数组
  console.log(usersWithPosts)
}

getUsersWithPosts()
  .catch((e) => {
    throw e
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

当执行上述查询时，Prisma 不会 生成 N+1 个 SQL 查询。而是首先会分析请求，并将其转化为数量非常有限的高效 SQL 查询。对于上面这个一对多关系的 `include` 查询，Prisma 通常会执行以下两步（类似于批量加载策略）：

1.  查询父模型: 获取所有 `User` 记录。
    ```sql
    SELECT "public"."User"."id", "public"."User"."name", /* ... other user fields */ FROM "public"."User" WHERE 1=1
    ```
2.  查询关联的子模型: 使用上一步获取到的所有用户 `id`，通过 `WHERE IN (...)` 子句一次性查询所有相关的 `Post` 记录。
    ```sql
    SELECT "public"."Post"."id", "public"."Post"."title", "public"."Post"."authorId", /* ... other post fields */ FROM "public"."Post" WHERE "public"."Post"."authorId" IN ($1, $2, $3, ...) /* 这里的 $1, $2, ... 是第一步查到的用户 ID 列表 */
    ```

Prisma Client 在内存中将这两次查询的结果高效地组合起来，最终返回嵌套的、符合 TypeScript 类型的数据。

## Refs.

* [Stack Overflow: What is the N+1 selects problem in ORM?](https://stackoverflow.com/questions/97197/what-is-the-n1-selects-problem-in-orm-object-relational-mapping)
* [Prisma Docs: Solving the N+1 problem](https://www.prisma.io/docs/orm/prisma-client/queries/query-optimization-performance#solving-the-n1-problem)