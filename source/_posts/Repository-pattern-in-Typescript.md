---
title: Repository pattern in Typescript
date: 2025-02-19 13:43:13
tags: [Technique]
---

> The Repository design pattern is a [structural pattern](https://www.geeksforgeeks.org/structural-design-patterns/) that abstracts data access, providing a centralized way to manage data operations. By separating the data layer from business logic, it enhances code maintainability, testability, and flexibility, making it easier to work with various data sources in an application.

抽象化数据访问层的主要作用是将应用的业务逻辑与对数据库的数据访问等实现细节进行解耦。DB 框架的更改不应该影响到应用程序的核心服务，并且它们应该对业务逻辑代码透明。

业务服务应该只依赖于抽象，而不是实现，数据服务同理。

---

# Intro.

例如，此时有一个书籍存储的微服务，并且有一个“添加新书籍”的操作用例，在此用例中可以通过使用 `Book` 这个 _Repository_ 来添加新书籍，而 `Book` 具体使用什么数据库，怎么存并不是业务需要关心的事情。


## 具体实现方式

假设有以下实体类型定义：

```typescript
export class Author {
  firstName: string;
  lastName: string;
}

export class Genre {
  name: string;
}

export class Book {
  title: string;
  author: Author;
  genre: Genre;
  publishDate: Date;
}
```

### 抽象化
第一步是抽象化出一个通用的 _Repository_ ，其中包含通用的操作：

```typescript
export abstract class IGenericRepository<T> {
  abstract getAll(): Promise<T[]>;

  abstract get(id: string): Promise<T>;

  abstract create(item: T): Promise<T>;

  abstract update(id: string, item: T);
}
```

- 这里具体有那些函数可以根据需要（业务）自己定义。
- 类型参数 `T` 表示每个实体。

接着，定义一个数据服务，其中包含使用 `IGenericRepositoiry` 定义的具体实例对应的 _Repository_：
```typescript
import { Author, Book, Genre } from '../entities';
import { IGenericRepository } from './generic-repository.abstract';

export abstract class IDataServices {
  abstract authors: IGenericRepository<Author>;

  abstract books: IGenericRepository<Book>;

  abstract genres: IGenericRepository<Genre>;
}
```

- 这里有三个 _Repository_ 分别对应不同的实体。
- `IGenericRepository` 中定义的函数是每个 _Repository_ 公开的通用存储函数。

以上这些就是对业务中的实体的 _Repository_ 抽象，这样就隔离开了业务和存储逻辑，例如使用 MongoDB，可以实现一个 `MongoGenericRepository`：

```typescript
import { Model } from 'mongoose';
import { IGenericRepository } from '../../../core';

export class MongoGenericRepository<T> implements IGenericRepository<T> {
  private _repository: Model<T>;
  private _populateOnFind: string[];

  constructor(repository: Model<T>, populateOnFind: string[] = []) {
    this._repository = repository;
    this._populateOnFind = populateOnFind;
  }

  getAll(): Promise<T[]> {
    return this._repository.find().populate(this._populateOnFind).exec();
  }

  get(id: any): Promise<T> {
    return this._repository.findById(id).populate(this._populateOnFind).exec();
  }

  create(item: T): Promise<T> {
    return this._repository.create(item);
  }

  update(id: string, item: T) {
    return this._repository.findByIdAndUpdate(id, item);
  }
}
```

然后实现一个 `MongoDataServices`:
```typescript
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IDataServices } from '../../../core';
import { MongoGenericRepository } from './mongo-generic-repository';
import {
  Author,
  AuthorDocument,
  Book,
  BookDocument,
  Genre,
  GenreDocument,
} from './model';

@Injectable()
export class MongoDataServices
  implements IDataServices, OnApplicationBootstrap
{
  authors: MongoGenericRepository<Author>;
  books: MongoGenericRepository<Book>;
  genres: MongoGenericRepository<Genre>;

  constructor(
    @InjectModel(Author.name)
    private AuthorRepository: Model<AuthorDocument>,
    @InjectModel(Book.name)
    private BookRepository: Model<BookDocument>,
    @InjectModel(Genre.name)
    private GenreRepository: Model<GenreDocument>,
  ) {}

  onApplicationBootstrap() {
    this.authors = new MongoGenericRepository<Author>(this.AuthorRepository);
    this.books = new MongoGenericRepository<Book>(this.BookRepository, [
      'author',
      'genre',
    ]);
    this.genres = new MongoGenericRepository<Genre>(this.GenreRepository);
  }
}
```

---

Sunday, March 30, 2025 7:58 PM:

感觉以上全错，不应该过度抽象 Repository 的，就让它分散在各个模块中，还可以参考 https://github.com/Papooch/nestjs-cls 实现不会抽象泄漏的事务性 Repository 方法。