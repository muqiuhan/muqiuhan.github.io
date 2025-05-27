---
title: Prisma 关系型数据库的 Self-relations
date: 2025-02-18 13:45:35
tags: [Technique]
---

> A relation field can also reference its own model, in this case the relation is called a _self-relation_. Self-relations can be of any cardinality, 1-1, 1-n and m-n.

## 一对一
```prisma
model User {
  id          Int     @id @default(autoincrement())
  name        String?
  successorId Int?    @unique
  successor   User?   @relation("BlogOwnerHistory", fields: [successorId], references: [id])
  predecessor User?   @relation("BlogOwnerHistory")
}
```

User 展现了这样一个模型：
- User 可以有一个或零个前驱（predecessor）
- User 可以有一个或零个后继（successor）

注意：不能要求前驱和后继都必须存在，这两个必须有一个是可选的，否则没办法创建第一个 User。

要创建一对一的 self-relation：
- 关系的两端都必须定义一个共享相同名称的 `@relation` 属性（`BlogOwnerHistory`）
- 关系字段必须是[完全注释](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations#relation-fields)的。例如 `successor` 字段需要定义 `field` 和 `references` 参数。
- 关系字段必须由外键支持。`successor` 字段由 `successorId` 外键提供支持，该外键引用 `id` 字段中的值。`successorId` 还需要 `@unique` 属性来保证一对一的关系。

> 一对一的 self-relation 需要两个端点，即使这两个端点是同一条数据。

而在关系型数据库中，一对一的 self-relation 可以用如下 SQL 描述：
```sql
CREATE TABLE "User" (
    id SERIAL PRIMARY KEY,
    "name" TEXT,
    "successorId" INTEGER
);

ALTER TABLE "User" ADD CONSTRAINT fk_successor_user FOREIGN KEY ("successorId") REFERENCES "User" (id);

ALTER TABLE "User" ADD CONSTRAINT successor_unique UNIQUE ("successorId");
```

## 一对多
```prisma
model User {
  id        Int     @id @default(autoincrement())
  name      String?
  teacherId Int?
  teacher   User?   @relation("TeacherStudents", fields: [teacherId], references: [id])
  students  User[]  @relation("TeacherStudents")
}
```

User 展现了这样一个模型：
- 一个 User 只能有零个或一个 teacher
- 一个 User 可以有零个或多个 students

> 可以通过将 `teacher` 字段设[为 required](https://www.prisma.io/docs/orm/prisma-schema/data-model/models#optional-and-mandatory-fields) 来要求每个 User 都有一名 teacher。

用 SQL 描述 User model：

```sql
CREATE TABLE "User" (
    id SERIAL PRIMARY KEY,
    "name" TEXT,
    "teacherId" INTEGER
);

ALTER TABLE "User" ADD CONSTRAINT fk_teacherid_user FOREIGN KEY ("teacherId") REFERENCES "User" (id);
```

`teacherId` 没有使用 `UNIQUE` 约束，这代表着多个 students 可以有同一个 teacher

## 多对多
```
model User {
  id         Int     @id @default(autoincrement())
  name       String?
  followedBy User[]  @relation("UserFollows")
  following  User[]  @relation("UserFollows")
}
```

- 一个 User 可以被零个或多个 Users 关注
- 一个 User 可以关注零个或多个 Users

> 对于关系型数据库，多对多的关系是隐式的，这意味着 Prisma ORM 会在底层数据库中维护一个 [relation table](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/many-to-many-relations#relation-tables):
> A relation table (also sometimes called a _JOIN_, _link_ or _pivot_ table) connects two or more other tables and therefore creates a _relation_ between them. Creating relation tables is a common data modelling practice in SQL to represent relationships between different entities. In essence it means that "one m-n relation is modeled as two 1-n relations in the database".
>
> We recommend using [implicit](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/many-to-many-relations#implicit-many-to-many-relations) m-n-relations, where Prisma ORM automatically generates the relation table in the underlying database. [Explicit](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/many-to-many-relations#explicit-many-to-many-relations) m-n-relations should be used when you need to store additional data in the relations, such as the date the relation was created.

如果需要需要通过多对多的关系来保存其他字段，也可以创建[显式](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/many-to-many-relations#explicit-many-to-many-relations)的多对多 self 关系：
```prisma
model User {
  id         Int       @id @default(autoincrement())
  name       String?
  followedBy Follows[] @relation("followedBy")
  following  Follows[] @relation("following")
}

model Follows {
  followedBy   User @relation("followedBy", fields: [followedById], references: [id])
  followedById Int
  following    User @relation("following", fields: [followingId], references: [id])
  followingId  Int

  @@id([followingId, followedById])
}
```

在关系型数据库中，可以用如下 SQL 描述:

```sql
CREATE TABLE "User" (
    id integer DEFAULT nextval('"User_id_seq"'::regclass) PRIMARY KEY,
    name text
);
CREATE TABLE "_UserFollows" (
    "A" integer NOT NULL REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE,
    "B" integer NOT NULL REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE
);
```

## 在同一模型上建立多个 self-relations
```prisma
model User {
  id         Int     @id @default(autoincrement())
  name       String?
  teacherId  Int?
  teacher    User?   @relation("TeacherStudents", fields: [teacherId], references: [id])
  students   User[]  @relation("TeacherStudents")
  followedBy User[]  @relation("UserFollows")
  following  User[]  @relation("UserFollows")
}
```

## REFS.
- [fully annotated](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations#relation-fields)
- [required](https://www.prisma.io/docs/orm/prisma-schema/data-model/models#optional-and-mandatory-fields)
- [implicit](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/many-to-many-relations#implicit-many-to-many-relations)
- [relation table](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/many-to-many-relations#relation-tables)
- [explicit](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/many-to-many-relations#explicit-many-to-many-relations)
