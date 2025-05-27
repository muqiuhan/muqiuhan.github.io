---
title: Dealing with complex dependency injection in FSharp
date: 2024-10-18 23:37:40
tags: [Technique, Archive]
---

Today, we're going to cover different ways of encapsulating capabilities and supplying them between functions using functional programming techniques which can be realized in F#.

Managing code dependencies in object oriented languages in 2020 is pretty much one sided problem: dependency injection has won, people use dedicated frameworks to handle that for them, which 99.9% of the time operate using runtime reflection. Of course now you need to learn them as well, potentially misconfigure them and fail at runtime or maybe even discover that not every problem is a stateless web service, but it still better (?) than what we had in the past, and what more can we possibly do anyway?

On the other side in functional space, there's no one opinionated solution or approach - various things have been proposed, usually depending on features that languages and compiler have to offer. And since pretty much all functional languages offer this thing known as partial application, for many years it was the most common answer for the problem of managing dependencies.

In short we're talking about dependency injection by function parameter, like:

```fsharp
// foo requires 2 dependencies to serve the incoming request
let foo bar baz request = ???
// we're providing dependencies by partial application
let wired = foo dependency1 dependency2
// now wired can serve request directly without calling 
// dependencies every time
let response = wired request
```

It's very simple, doesn't require reflection or dedicated library. However there are several pain points coming with this approach - visible especially as our code base grows and become more complex. However latest approaches popularized by libraries like Scala [ZIO](https://zio.dev/?ref=bartoszsypytkowski.com) or Haskell's [Polysemy](https://youtu.be/idU7GdlfP9Q?t=1394&ref=bartoszsypytkowski.com) challenge this approach.

## Partial application

There are some design decisions, when partial application doesn't always give a clear answer. Example:

> Imagine using a set of methods, that are closely related and - in object oriented world - encapsulated within  a single object, like database query/execute or different logging methods (debug/info/warning/error).

Now, given that our function needs to use potentially more than one of these, how should we pass our arguments?:

1. Functional purist path - pass every dependency as a separate function parameter: `let doSmth logError logInfo = ??`. While it allows us to precisely describe what this function uses, it would of course lead to explosion of function parameters. Additionally every time you need new function in your existing code, you need to partially apply it at all call sites.
2. Describe operations using ADT (algebraic data types) and inject a function that will work as an interpreter for them: `let doSmth (log: LogEvent -> unit) = ??`. While it's easy to mock (you don't need to implement everything, only pattern match on cases that matter for a particular test) and reduces params affinity, it also comes with a lot of indirection, that may lead to harder to grasp, especially during debugging. Sometimes a performance penalty is also to be expected.
3. Fallback to objects/interfaces and pass them as methods: `let doSmth (logger: ILogger) = ??`. While interfaces may simplify dependency tree, it's not always obvious when to use it. Mocking story is also more painful + interfaces are not inferred by F# compiler.

These are quite common options I've seen in the wild - each having their own advantages and disadvantages. Which one to use? Good question, as in practice with codebases that are old enough, you usually see 2 or even all 3 of them mixed together. This can lead to some confusion and obscurity over time.

What's worse, none of these cases really solves problem of dependency management - all they do is just try to reduce it to a manageable scope. Eventually you'll end up manually wiring - by partial application - dozens of functions and managing all of the dependencies between them by hand.

### Example

In order to get better understanding, we'll use a fairly simple example - changing user password:

```fsharp
let fetchUser (db: IDbConnection) userId = 
    db.QueryFirstAsync(Sql.FetchUser, {| userId = userid| })
    
let updateUser (db: IDbConnection) user = db.ExecuteAsync(Sql.UpdateUser, user)

let changePass (logger: ILogger) fetch update = fun req -> task {
    let! user = fetch req.UserId
    if user.Hash = bcrypt user.Salt req.OldPass then
        let salt = generateSalt ()
        let user' = { user with Salt = salt; Hash = bcrypt salt req.NewPass }
        do! update user'
        logger.LogInformation "Password change: user %i" user.Id
        return Ok ()
    else 
        logger.LogError "Password change unauthorized: user %i" user.Id
        return Error "Old password is invalid"
}

```

Here we have a fairly short snippet with some dependencies? But how many in practice?:

- Number of parameters suggest 3, but depending on our choices it could be 4 (if we decide to pass log error and info separately) or 2 (if we conflate fetch/update into dedicated interface).
- It's not hard to imagine that in the future our `bcrypt` hashing function may turn out to be configurable - maybe even per each user. That may need a configurable parameter.
- Maybe aside of the logger we may be needing a separate telemetry mechanism to count number of incoming request or password validation failures? That means another parameter.
- Salt generation is pseudo-random process - it we want our function to be deterministic, we should probably parametrize it over explicitly passed `Random` as well.

As you see, what seemed to be simple task at the beginning can quickly blow up out of proportion. As the number of arguments grows, the more nasty our wiring code eventually becomes. Quite common pattern is to hide all of that nastiness under the carpet a.k.a. composition root. However this doesn't have to be the case.

Below we'll cover another approach for dealing with dependencies - inspired by Scala [ZIO](https://medium.com/@pascal.mengelt/what-are-the-benefits-of-the-zio-modules-with-zlayers-3bf6cc064a9b?ref=bartoszsypytkowski.com) library - using incremental steps, from first principles to monadic bindings.

## Managing dependencies beyond partial application

Let's start from how our code from above will eventually look like at the end of this step:

```fsharp
let changePass env = fun req -> task {
    let! user = Db.fetchUser env req.UserId
    if user.Hash = bcrypt user.Salt req.OldPass then
        let salt = Random.bytes env 32
        do! Db.updateUser env { user with Salt = salt; Hash = bcrypt salt req.NewPass }
        Log.info env "Changed password for user %i" user.Id
        return Ok ()
    else 
        Log.error env "Password change unauthorized: user %i" user.Id
        return Error "Old password is invalid"
}
```

As you may notice, all of our partially applied parameters disappeared, replaced by some single cryptic `env` parameter. We'll get there soon. We also packed similar capabilities into corresponding modules (`Db`/`Log`/`Random`). Lets start from defining them:

```fsharp
[<Interface>]
type ILogger =
    abstract Debug: string -> unit
    abstract Error: string -> unit 

[<Interface>] type ILog = abstract Logger: ILogger

module Log =
    let debug (env: #ILog) fmt = Printf.kprintf env.Logger.Debug fmt
    let error (env: #ILog) fmt = Printf.kprintf env.Logger.Error fmt
```

Now we can say something more about `env`. The secret is in `#ILog` signature, which means that our environment can be any generic type implementing `ILog` interface. As soon you'll see, this approach is highly composable, but before that we'll need another module:

```fsharp
[<Interface>]
type IDatabase =
    abstract Query: string * 'i -> Task<'o>
    abstract Execute: string * 'i -> Task
	
[<Interface>] type IDb = abstract Database: IDatabase

module Db = 
    let fetchUser (env: #IDb) userId = 
        env.Database.Query(Sql.FetchUser, {| userId = userId |})
    let updateUser (env: #IDb) user = env.Database.Execute(Sql.UpdateUser, user)
```

Now what will happen if we use functions from both `Log` and `Db` modules? As it turns out, F# compiler can properly infer generic constraints over these interfaces. The result `env` type constraint is inferred to be an union - just like set union, which also means that it handles duplicates for us - of all constraints of other functions using `env` in its scope:

```fsharp
let foo env = // env :> IDb and env :> ILog
    let user = Db.fetchUser env 123	// env :> IDb
    Log.debug env "User: %A" user	// env :> ILog
```

Now why did we use two separate interfaces (`ILog`/`ILogger`) instead of making environment implement `ILogger` directly? This is more practical approach that will let us isolate capabilities of particular modules rather than putting them flat into our environment. Example:

```fsharp
module Log =
    let live : ILogger = ?? // create logger interface

[<Struct>]
type AppEnv = 
    interface ILog with member _.Logger = Log.live
    interface IDb with member _.Database = Db.live connectionString
	
foo (AppEnv())
```

We cannot eagerly provide a specific implementation of `ILog`/`IDb`, because they're yet to be defined as part of by our environment type (which may need to implement many interfaces). To maintain module encapsulation `Log` module shouldn't be aware of existence or implementation of `IDb` interface and vice versa for `Db` module. What we can do however is to provide `live` implementation of `ILogger`, which encapsulates capabilities required by the `Log` module. This way we don't need to know details of `ILogger` when defining our environment type.

Strong sides of this approach?:

- We only need to provide a single environment object instead of (potentially) unbounded list of parameters. Since it's always one, it's easier to generalize and compose other functions over it.
- Unlike in reflection-based dependency injection frameworks - everything is still safe and checked by the compiler. If our environment type will not implement an interface required somewhere in the call chain, our code will simply not compile.
- It's still fairly easy to unit test - each function defines only the generic type constraints that it uses in its own call tree, NOT all of the constraints required by the application.
- New dependencies are added implicitly - if your code uses module that requires additional capability, it will be automatically inferred by the compiler and bubble up to our environment type definition. No need to add new function parameters or to pass new argument. Also - unlike the object oriented IoC containers - there's no need to add new dependency as a field or constructor argument.
- It gives some opinionated approach on what should be a dependency - less thinking of _"should that be a function or interface?"_ or _"if these two functions correspond to the same capability, should they be passed separately?"_, which arguably may be a good thing.
- It doesn't impose specific restrictions on libraries and frameworks.

Now we could as well stop here - IMHO this approach is already good and useful for most cases. We can also try to push it further. As you've seen, our code now requires quite a lot of `env` passing around. Could we do something about this? It turns out that yes, we could.

## Reader monad

Before we continue: what we're going to cover now is less useful in terms of current state of F# ecosystem for the reasons I'll mention later.

The pattern we'll use here is known as a [Reader Monad](https://fsharpforfunandprofit.com/posts/elevated-world-6/?ref=bartoszsypytkowski.com). While it's useful in certain situations, it's not widely used - IMO it's fault lies in the name itself, which somehow managed to sound both borderline meaningless and scary in ears of many developers.

The rest of this blog post will be introduction to this style in F#, however focused solely around problem of dependency management - we'll ignore other aspects of monads.

We'll going to reuse our environment type from above, but now encode it directly into another type we'll call `Effect`. Since I've mentioned that our pattern has M-word in it, you can safely assume that our handler's logic will be defined as a lazy sequence of steps to be executed (sounds almost like async/await). In F# we'll sugar them by using custom computation expression (I'm going to call it `effect { ... }`) returning our effect type, which we'll define as:

```fsharp
[<Struct>] type Effect<'env, 'out> = Effect of ('env -> 'out)
```

Where:

- `env` is our environment type we already talked about above.
- `out` defines a returned value type of our effect.

Eventually, with this type in hand our simple request handler will be looking like that:

```fsharp
let changePass req = effect {
    let! user = Db.fetchUser req.UserId
    if user.Hash = bcrypt user.Salt req.OldPass then
        let! salt = Random.bytes 32
        do! Db.updateUser { user with Salt = salt; Hash = bcrypt salt req.NewPass }
        do! Log.info "Changed password for user %i" user.Id
        return Ok ()
    else 
        do! Log.error "Password change unauthorized: user %i" user.Id
        return Error "Old password is invalid"
}
```

As you see, there's no more `env` parameter being passed around. It's now an implicit part of our effect expression. However at the moment we didn't provide enough infrastructure in our code to make that thing work. What we're going to need is a set of operators, we can use to make our computation expression happen.

First we're going to need some `Effect<'env,'out>` constructors:

```fsharp
module Effect =
    /// Create value with no dependency requirements.
    let inline value (x: 'out): Effect<'env,'out> = Effect (fun _ -> x)
    /// Create value which uses depenendency.
    let inline apply (fn: 'env -> 'out): Effect<'env,'out> = Effect fn
```

We also need some way to run our effect to be able to make it... well effectful:

```fsharp
module Effect =

	(* ...other functions... *)
	
    let run (env: 'env) (Effect fn): 'out = fn env
```

And since we already mentioned `Effect` is monad, we also gonna need a `bind` function as well if we want to compose our effects together:

```fsharp
module Effect =

	(* ...other functions... *)
	
    let inline bind (fn: 'a -> Effect<'env,'b>) effect =
        Effect (fun env ->
            let x = run env effect // compute result of the first effect
            run env (fn x) // run second effect, based on result of first one
        )
```

This is pretty much it. We're just going to add compose all of these into builder type to make it usable as F# computation expression:

```fsharp
[<Struct>]
type EffectBuilder =
    member inline __.Return value = Effect.value value
    member inline __.Zero () = Effect.value (Unchecked.defaultof<_>)
    member inline __.ReturnFrom (effect: Effect<'env, 'out>) = effect
    member inline __.Bind(effect, fn) = Effect.bind fn effect
    
let effect = EffectBuilder()
```

Of course this, we still need to adapt the modules we prepared earlier to now operate on effects rater than plain functions. We can make this easier by using our `Effect.apply` function, like:

```fsharp
module Log =    
    let debug fmt =
        let ap s = Effect.apply (fun (x: #ILog) -> x.Logger.Debug s)
        Printf.kprintf ap fmt
```

So - as you may have noticed in final form of our effect-based `changePass` function - in result we almost fully erased all of the dependency-wiring code from our example. There are several downsides of this approach:

- We do a lot of more bindings (see `let!`/`do!` expressions), which means more lambda closures, indirection (wait to see call stacks) and more allocations.
- Altogether we also erased `task { ... }` computation expression and with it an out-of-the-box ability to write asynchronous code. This is one of the downsides of using monads - cross-type composition is painful.

Of course we could enrich our `Effect` type to be able to bind it with `Task`/`Async`. That however means, that our pattern grows in complexity and becomes more of a framework rather than something to be easily applied into existing code. Is that bad? Not necessarily, but for sure comes with a bigger commitment, as now you're not only writing business logic but eventually maintain new effect library. Maybe in future this concept will grow into its own space in favor of the F# ecosystem.

## Summary

We came from partial application as tool for dependency injection, over more structured approach promoting single environment type with help of powerful F# type inference, up to encapsulating it into a Reader Monad. That's a long way. I hope you'll give it a try and it will help you determine the approach that works for you.