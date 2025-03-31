---
title: 在F#中处理复杂依赖注入的实践指南
date: 2025-03-31 09:51:08
tags: [Technique]
---


## 一、传统手艺：Partial Application

在函数式编程中，Partial Application 是传递依赖的常用方式。例如：

```fsharp
let foo bar baz request = ...
let wired = foo dependency1 dependency2
let response = wired request
```

**优点**：  
- 无需框架或反射，直接通过函数参数传递依赖。  
- 符合函数式编程的纯函数理念。

**缺点**：  
- 参数爆炸：当功能扩展时，参数数量激增（如日志、数据库、加密等）。  
- 维护困难：新增依赖需修改所有调用点的参数传递。  
- 隐式依赖：难以从函数签名直接区分核心参数与辅助依赖。

---

## 二、结构化方法：单一环境参数（`env`）

为解决参数爆炸问题，可将依赖封装为单一环境对象`env`，并通过接口约束访问权限：

```fsharp
[<Interface>] type ILog = abstract Logger: ILogger
[<Interface>] type IDb = abstract Database: IDatabase

module Log =
    let info (env: #ILog) = env.Logger.Info("Message")

module Db =
    let fetchUser (env: #IDb) = env.Database.Query(...)
```

**优点**：  
- **显式依赖声明**：函数签名仅需`env`参数，编译器验证接口实现。  
- **模块化隔离**：各模块仅声明所需接口（如`ILog`、`IDb`），避免全局依赖。  
- **易于测试**：通过模拟`env`实现单元测试，无需依赖具体实现。

**应用场景**：  
```fsharp
let changePass env req = task {
    let! user = Db.fetchUser env req.UserId
    Log.info env "Processing user: %i" user.Id
    ...
}
```

---

## 三、Reader Monad

为消除显式的`env`传递，可引入 Reader Monad，将环境隐式注入计算流程：

```fsharp
[<Struct>] type Effect<'env, 'out> = Effect of ('env -> 'out)

module Effect =
    let run env (Effect fn) = fn env
    let bind f effect = Effect (fun env -> run env (f (run env effect)))

type EffectBuilder() =
    member __.Bind(e, f) = Effect.bind f e
    member __.Return(x) = Effect (fun _ -> x)

let effect = EffectBuilder()
```

然后：
```fsharp
let changePass req = effect {
    let! user = Db.fetchUser req.UserId
    let! salt = Random.bytes 32
    do! Log.info "Password updated for user %i" user.Id
    return Ok()
}
```

**优点**：  
- **隐式依赖管理**：通过`effect`计算表达式自动传递`env`，减少样板代码。  
- **组合性**：支持与其他计算表达式（如`async`/`task`）结合，处理异步操作。

**缺点**：  
- **性能开销**：频繁的闭包创建和间接调用可能导致性能下降。  
- **生态兼容性**：需自定义计算表达式，与现有异步框架集成复杂。


## Refs.
- Spring的构造器注入
- Blazor的DI实现