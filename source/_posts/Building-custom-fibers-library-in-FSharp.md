---
title: Building custom fibers library in FSharp
date: 2024-10-18 23:38:56
tags: [Technique, Archive]
---

Over the course of last few months on this blog post, I've been sharing about internals and how-to of different concurrency patters. We discussed how to [implement our own actors](https://www.bartoszsypytkowski.com/build-your-own-actor-model/) and specific [affinity-based thread pool](https://www.bartoszsypytkowski.com/thread-safety-with-affine-thread-pools/). Today we'll focus of the most dominant pattern present in modern programming nowadays: fibers, also known as coroutines, futures, tasks, green threads or user-space threads.

The general idea is simple - we want a fine-grained concurrency primitive, that will let us easily compose chain of operations in sequential manner. Of course we could use threads here, but the question is: are threads fine-grained? In many managed languages with OS threads exposed, they can be quite heavy eg. by default in .NET each thread takes around 1MB of memory and requires calling kernel code to cooperate with other threads, which is an expensive operation on its own.

What we're after, are more lightweight structures (less than 1kB), that can live fully in a user space, so that we can have even millions of them cooperating frequently with each other without heavy performance penalties.

Before we begin, I think it's good to discuss different designs. We'll cover several different topics to be able to make more informed decisions, that we're up to apply to our own solution.

### Preemptive vs cooperative scheduler

Scheduler is a subsystem, which direct responsibility is to assign CPU core processing power to a particular fiber. It's also responsible for coordinating fibers execution. The two most common categories of schedulers are preemptive and cooperative.

A preemptive scheduler is the one, that's always in control of fiber execution. It's able to decide on its own, when fiber can be started and stopped. The most obvious example of such is a thread scheduler existing on most operating systems.

Preemptive scheduler usually works in one of two ways:

- Time based scheduler takes a quant of CPU time and gives it to a given fiber, which ten can execute its logic until it reaches its execution time limit (of course, it can finish earlier). This is how OS thread scheduler, but also how Go goroutine scheduler works.
- Another variant is step-based scheduler, which splits fiber's function body into series of (more or less equal) steps. Then each fiber is given a number of steps to execute before preemption occurs. Example of such is Erlang's BEAM - it simply allows each process to execute up to 2000 "reductions", where each reduction is basically a function call. _And since in Erlang there are no loops, only tail-recursive functions, this approach works well for long-living iterative processes as well._

One of the problems with preemptive schedulers is that they usually need some kind of involvement from the compiler or hosting virtual machine in order to work. For this reason, most of the fiber libraries use cooperative schedulers to perform their work.

A cooperative scheduler doesn't have a concept of preemption - once started by the scheduler, a fiber will execute until it doesn't give back the control willingly. This is often done with dedicated programming constructs, and often is known as yielding, parking or awaiting.

In cooperative variant, a fiber body is usually split into series of discrete steps, between which fiber gives control back to the scheduler.

Keep in mind that these two are not mutually exclusive - a preemptive scheduler often provides a way for a fiber to return control back to it when it's known that fiber won't be executing any longer eg. because it has been put to sleep for a while.

### Stackless vs. stackful

A concept, that's somewhat related to a topic above is the idea of stackless and stackful coroutines.

A stackful variant is aware of underlying execution stack and can preserve/restore parts of it when yielding/continuing a fiber. Examples of this approach could be Go, Lua, Python asyncio and in the future, also [Java Loom](https://www.youtube.com/watch?v=NV46KFV1m-4&ref=bartoszsypytkowski.com) project. Implementing such option (if it's not implemented by a runtime already) usually requires diving deep into low-level internals, since execution stack is not something that most managed languages offers the users to play with, and doing so without coordination with runtime can cause problems - like determining liveness of objects for GC purposes.

Stackless coroutine usually captures locals that we want to preserve as part of callback object (lambda), that is allocated as an object on the heap and scheduled on yield continuation. These steps are usually visible directly in code (eg. await in C#, Rust and JavaScript, but also joints of Scala for-comprehensions, bang-suffix in F# or Haskell do-notation), but sometimes can be implicit like in case of Kotlin. Take into account that while many languages offer syntax support for those constructs, it's not explicitly necessary to work - take a look at JavaScript and `Promise.then` as an example.

Stackless coroutines usually construct their logic around one of two concepts:

1. Finite state machines - this variant is usually faster and can be encoded manually (example of such case is Akka actors), but for a human eye it usually doesn't really read as a sequential step-by-step program execution, unless it has some support from the compiler itself (see: C# and Rust).
2. Monadic sequencing via bind/flatMap operator, which is very popular in functional languages. While we cover it in more details in the rest of this blog post, for now it's enough to say that it's a way to chain callback-based behaviors together in a way, that resembles standard sequential code.

For sure one of the advantages of stackful coroutines is that they're _mono-colored_: you can yield/continue coroutine execution from within any other function, while in the stackless variant splits your world into _two-colored_ functions - synchronous and asynchronous - where async one can be only called and yielded safely (without blocking underlying OS thread) from within another async function.

### Eager vs lazy fibers

We already mentioned two important events in fiber execution life cycle - starting and parking. Here I briefly discuss about different design decisions on when to start a fiber execution.

Eager execution means, that fiber is started automatically after its creation. An example of such are Scala `Future[A]` and JavaScript `Promise`. Since execution process starts right away, we're willingly resign from a certain degree of control over how or when to execute given fiber. Usually this is solved by wrapping a fiber creation into another function or lambda.

Lazy execution is much more common and preferred way of work, as it allows us to separate place where we want to define our asynchronous sequence of steps from the place, where the execution details are defined. It's used in C# TPL as well as pretty much in all functional languages implementations (excluding Scala futures mentioned earlier).

### Interruption

There are also few decisions regarding premature escaping the fiber execution, also known as interruption/cancelation: one of them requires passing special object - a token - between method calls and explicit checking for its completion. It is how C# Tasks work. However putting such requirement onto the API user can be cumbersome and error-prone option. Therefore pretty much every other coroutine library either allows to direcly interrupt a fiber or (like in case of F# Async) passes cancelation tokens and check if they were triggered under the hood.

## Implementation

Since we talked a bit about various approaches, let's get to the meat of this blog post: implementing our own coroutine library in F#. So, what properties will it have?:

1. We use cooperative scheduling (we don't want to tweak the compiler) of stackless fibers with support from F# computation expression for nice syntax.
2. We use simple approach by defining custom `bind` operator with support from F# computation expressions. No state machines.
3. We'll use lazy invocation.
4. We'll make use of implicitly passed cancelation tokens. We'll handle them directly inside the linking code.

All of these give us in very similar approach to that found inside of native F# `Async` data type. To begin with, we'll simply define the shape of our fiber.

Underneath, pretty much every cooperative stackless coroutine approach uses callbacks to drive the flow of synchronous segments of code to be executed one after another. So what we need is a callback which takes a result of previous coroutine and schedules in within some context of execution:

```fsharp
type Fiber<'a> = Fiber of (ExecutionContext -> FiberCallback<'a> -> unit)
```

Here we'll represent Fiber as a simple single-case discriminated union. We could as well define other specialized cases, like:

- Situation when coroutine is executed immediately and doesn't need to be awaited on: think about variant of `ValueTask` from C# Task Parallel Library.
- Case when coroutine fails - in that case we might want to store an artificial tracing context that would allow us to create nicely-formatted "stack traces": since .NET Core 2.1, C# already provides similar solution however AFAIK it's been solved differently.

Ok, but what are `ExecutionContext` and `FiberCallback<'a>`? Let's start from callback. We can represent it as follows:

```fsharp
type FiberCallback<'a> = FiberResult<'a> -> unit
```

It's just a simple function, which takes result of previous fiber execution and handles it. What's the `FiberResult<'a>` then?

Our fiber can complete successfully (returning a value) or fail with an exception. We'll be conservative here and won't go into more typed world of [IO bifunctor](http://degoes.net/articles/bifunctor-io?ref=bartoszsypytkowski.com). We can easy define these possible outputs in F# using `Result<'a, exn>`.

Question is: is that exhaustive? Well... no. As we already mentioned, there's a 3rd state, often overlooked or conflated with failure: a canceled fiber. A canceled fiber doesn't produce any output - since it was canceled before completion. In F# we already know how to represent an absence of value - simply use an option. Therefore our ultimate Fiber result type could look like this:

```fsharp
type FiberResult<'a> = Result<'a, exn> option
```

Now, the `ExecutionContext`. While it can be compound of many different capabilities throughout the system - even to serve as functional equivalent of dependency injection - here I'll use it only for implicit passing of specific scheduler info and cancelation tokens from one fiber to another.

```fsharp
type ExecutionContext = IScheduler * Cancel
```

`IScheduler` interface is used to abstract component responsible for running our fibers. At the moment all we need is an ability to schedule fiber execution:

```fsharp
[<Interface>]
type IScheduler = 
  abstract Schedule: (unit -> unit) -> unit
```

While the name and signature imply multithreaded execution model, it doesn't have to be the case. We can even implement scheduler which will simulate everything on a single core.

For now, we can simply implement a scheduler API on top of our standard .NET thread pool:

```fsharp
module Scheduler

open System.Threading

let shared = 
  { new ISchedule with
      member __.Schedule fn = 
        ThreadPool.QueueUserWorkItem(WaitCallback (fun _ -> fn())) |> ignore  }
```

### Cancellation

Now it's a time for cancellation tokens. Of course we could just make use of a flag - conceptually working like native .NET `CancellationToken`. However given implicit cancellation, it may not be enough. Example:

> Imagine, that inside our fiber we're scheduling the race between two other fibers ie. one writing data to a file and other which will complete after timeout. Now, whenever one of them completes first, we want to cancel another one to stop wasting resources for result that no longer matters.

This simple scenario is similar to what .NET `Task.WhenAny` is used - with a difference that, unlike TPL, we want to actually cancel other executing tasks instead of letting them run (potentially forever) :D

Now, since our cancellation is not explicit, we need to deal with few things:

1. Whenever parent fiber is cancelled, all child fibers it spawned are also cancelled.
2. Whenever we cancel a fiber that loose the race, we don't want to accidentally cancel a token of its parent.

This behavior implies at least using two separate tokens, however in practice it will be more pragmatic to make our `Cancel` token work as a tree hierarchy - this way we can easily keep track of things and support more complex scenarios.

```fsharp
[<Sealed;AllowNullLiteral>]
type Cancel(parent: Cancel) =
  let mutable flag: int = 0
  let mutable children: Cancel list = []
  new() = Cancel(null)
  /// Check if token was cancelled
  member __.Cancelled = flag = 1
  /// Remove child token
  member private __.RemoveChild(child) = 
    let rec loop child =
      let children' = children
      let nval = children' |> List.filter ((<>) child)
      if not (obj.ReferenceEquals(children', Interlocked.CompareExchange(&children, nval, children')))
      then loop child
    if not (List.isEmpty children) then loop child
  /// Create a new child token and return it.
  member this.AddChild () =
    let rec loop child =
      let children' = children
      if (obj.ReferenceEquals(children', Interlocked.CompareExchange(&children, child::children', children')))
      then child
      else loop child
    loop (Cancel this)
  /// Cancel a token
  member this.Cancel() =
    if Interlocked.Exchange(&flag, 1) = 0 then
      for child in Interlocked.Exchange(&children, []) do child.Cancel()
      if not (isNull parent) then parent.RemoveChild(this)

```

The general idea is simple: every new cancellation token (except root) may have a parent and a list of children. Canceling parent means canceling its children as well. After cancellation, we need to unpin child from its parent (therefore need for `RemveChild` operation) to avoid memory leaks.

##### Lock-free updates

What might be confusing for some in the code above, are recursive loops inside of `AddChild`/`RemoveChild` operations. This is a good place to introduce lock-free algorithms: we use atomic operations from [Interlocked](https://www.bartoszsypytkowski.com/building-custom-fibers-library-in-f/docs.microsoft.com/en-us/dotnet/api/system.threading.interlocked) class to make sure that we can replace field references within a single CPU instruction, therefore making such field update safe without synchronized access. This is also known as Compare-And-Swap semantics.

This alone however is not enough, as `Interlocked.CompareExchange(&field, new', old)` can only safely replace a single field with new value if it contained an old one. This means that you cannot safely add or remove element to the list. So what can we do?

1. We're taking a value from the field.
2. Update that value.
3. Conditionally put it back again. What if in the meantime the field was already replaced by another concurrently running thread? In that case `Interlocked.CompareExchange` will return field value other that the one we read in step 1. This is why we compare its result with the variable we expected.
4. If the expectation fails, we'll retry - hence a recursive loop. Eventually even in high contention scenarios we should be able to complete after few retries. Given cheap and idempotent update operation, this still will be way faster than trying to call kernel code to obtain mutex/semaphore lock.

While this may sound like something error prone - we can potentially add the same element multiple times - in practice it's safe, because our collection here is an immutable data structure. Adding the same element multiple times without updating the reference will always produce the same result.

### Back on track...

Now we have pretty much all core structures. We're ready to start building our fiber operators. Starting from the basic ones - a successfully completed fiber and the failed one:

```fsharp
let success r = Fiber <| fun (_, c) next -> 
  if c.Cancelled then next None else next (Some (Ok r))

let fail ex = Fiber <| fun (_, c) next -> 
  if c.Cancelled then next None else next (Some (Error ex))
```

Here, we simply pass a result/error to our Fiber callback:

- Cancelled fiber call `next` callback with `None` - as fibers cancelled before completion produce output .
- Successful call results in passing `Some (Ok result)` to a callback...
- ... while failed result can be identified with `Some (Error exception)`.

You'll be able to see a cancellation check made here as preamble of pretty much every operator body, which we'll define. While it may sound cumbersome remember: we do that so that users of our fibers won't have to :)

Next very important operation is result mapping - we want to map result of one fiber into something else, returning another (lazy) fiber:

```fsharp
let mapResult (fn: Result<'a> -> Result<'b>) (Fiber call) = Fiber <| fun (s, c) next ->
  if c.Cancelled then next None
  else 
    try 
      call (s, c) (fun result ->
        if c.Cancelled then next None
        else next (Option.map fn result))
    with e -> next (Some (Error e))
```

We can use this function to compose more traditionally-looking `map` function...

```fsharp
let map (fn: 'a -> 'b) fiber = mapResult (Result.map fn) fiber
```

... however `mapResult` is more powerful - you could easily imagine using to apply failure recovery (a.k.a `try`/`catch` semantics) by simply mapping `Error exception` → `Ok recoveredValue`:

```fsharp
let catch fn fiber = mapResult (function Error e -> fn e | ok -> ok) fiber
```

Another must-have function is binding operator (also know as `flatMap` in other languages like Scala, or `Promise.then` in JavaScript). It gives us the ability to compose fibers together - we'll also use it when we come up to building a computation expression for our fibers.

```fsharp
let bind (fn: 'a -> Fiber<'b>) (Fiber call) = Fiber <| fun (s, c) next ->
   if c.Cancelled then next None 
   else 
     try
       call (s, c) (fun result ->
         if c.Cancelled then next None
         else match result with
              | Some (Ok r) ->
                 let (Fiber call2) = fn r
                 call2 (s, c) next // pass `next` callback over to next fiber
              | None -> next None
              | Some (Error e) -> next (Some(Error e)))
     with e -> next (Some(Error e))
```

It's simple - we execute one fiber from within another, passing the `next` callback from outer function as an argument to inner one.

### Fiber computation expressions

With these few functions we're already prepared to build a basic computation expression, that will enable us programming with fibers in pleasant way:

```fsharp
[<Struct>]
type FiberBuilder =
    member inline __.Zero = Fiber.success (Unchecked.defaultof<_>)
    member inline __.ReturnFrom fib = fib
    member inline __.Return value = Fiber.success value
    member inline __.Bind(fib, fn) = Fiber.bind fn fib

[<AutoOpen>]
module FiberBuilder =

    let fib = FiberBuilder()
```

While in F# [there are many more operators](https://docs.microsoft.com/en-us/dotnet/fsharp/language-reference/computation-expressions?ref=bartoszsypytkowski.com) we could pack into our computation expression, these are basic ones that will let it work. With such construct, we'll be able to write programs like:

```fsharp
let inline millis n = TimeSpan.FromMilliseconds (float n)

let program: Fiber<int> = fib {
  let a = fib {
    do! Fiber.delay (millis 1000) // create some artificial delay
    return 3
  }
  let! b = a |> Fiber.timeout (millis 3000) // execute task within specified timeout
  return b }
```

Sure, we have neither delay nor timeout operators at the moment, but at least you know where are we heading now :)

### Delayed execution

In order to implement delays, we could theoretically just call `Thread.Sleep` and get over it, but this approach is devastating from any coroutine library point of view. Most user-space thread libraries work by using a predefined fixed pool of OS-level threads and scheduling coroutines on them - you can read more about building thread pools [here](https://www.bartoszsypytkowski.com/thread-safety-with-affine-thread-pools/).

However, `Thread.Sleep(timeout)` doesn't know thread pooling mechanism - all it knows about is that we called suspending current OS thread of execution. This means, that this thread will not be awoken by kernel until timeout completes. What it means, is that none of our fibers will be able to use that thread. This is bad, because usually thread pools are made to fit in-line with number of machine CPU cores. In practice, `Thread.Sleep` may keep one of our CPU cores idle, wasting machine power in the process.

For this reason we usually want to build a suspendable fibers, that will respect our thread pool. This however cannot be done without cooperation with scheduler itself. Therefore, we need to extend API of our scheduler:

```fsharp
type IScheduler =
  abstract Schedule: (unit -> unit) -> unit
  abstract Delay: TimeSpan * (unit -> unit) -> unit
```

And our simple implementation of it as well:

```fsharp
let shared = 
    { new IScheduler with
      member __.Schedule fn = ....
      member this.Delay (timeout: TimeSpan, fn) = 
        let mutable t = Unchecked.defaultof<Timer>
        let callback = fun _ -> 
          t.Dispose()
          fn()
          ()
        t <- new Timer(callback, null, int timeout.TotalMilliseconds, Timeout.Infinite)
    }
```

We'll use a .NET timers here to implement our delays. With these in our hands, our`Fiber.delay` operation is trivial to implement:

```fsharp
let delay (timeout): Fiber<unit> =
  Fiber <| fun (s, c) next ->
    if c.Cancelled then next None
    else s.Delay(timeout, fun () -> 
      if c.Cancelled 
      then next None 
      else next (Some (Ok ())))
```

### Composing parallel fibers

We're slowly getting to the end. What I left for this blog post was to implement two basic operators, that are prevalent in most coroutine libraries:

- `Fiber.parallel` which will schedule multiple fibers to run in parallel and returns a fiber which aggregates their results.
- Running two fibers in parallel and returning the result of whichever completes first, while cancelling a second one. We already discussed this approach before. Here I'll call it `Fiber.race`.

#### Aggregating parallel results

We'll start from building a parallel operator, which will change our array of fibers into fiber with an array of results. But let's define the semantics of that operation first:

- Our result fiber completes only when all of the aggregated fibers completed with successful result.
- If any of the fibers fails, the resulting fiber also fails.
- If any of the fibers fails or get cancelled, all pending ones are also cancelled.

The core skeleton of that operation could look like following:

```fsharp
let parallel (fibers: Fiber<'a>[]): Fiber<'a[]> =
  Fiber <| fun (s, c) next ->
    if c.Cancelled then next None
    else 
      let child = c.AddChild()
      let successes = Array.zeroCreate remaining
      let mutable remaining = Array.length fibs
      fibers |> Array.iteri (fun idx (Fiber call) ->
        s.Schedule (fun () -> (* to be defined *))
      )
```

Here, we create a dedicated cancellation token, an array of results and a countdown counter - we're going to decrement it every time one of our fibers completes to know when we're ready to return a complete result. I've left a placeholder for a lambda body that we actually want to schedule. We're going to fill it right away:

```fsharp
// defined above: s.Schedule <| fun () ->
call (s, child) (fun result -> 
match result with
| Some (Ok success) ->
  // fill the result array
  successes.[idx] <- success
  if c.Cancelled && Interlocked.Exchange(&remaining, -1) > 0 then
    next None
  elif Interlocked.Decrement(&remaining) = 0 then
    // if all results have been returned, call the `next` callback
    if c.Cancelled then next None
    else next (Some (Ok successes))
| Some (Error fail) ->
  if Interlocked.Exchange(&remaining, -1) > 0 then 
    child.Cancel() // we failed, cancel other fibers
    if c.Cancelled then next None
    else next (Some (Error fail))
| None ->
  if Interlocked.Exchange(&remaining, -1) > 0 then next None)
```

As you probably noticed, we're using `Interlocked` class again - that's because now we have multiple fibers running in parallel, therefore our access to shared mutable values is not thread safe. This includes `remaining` counter decrement operation. This however doesn't apply to `successes.[i] <- success` - since every fiber knows and touches only its own index within result array, there's no worry that any other will try to push its result in the same place.

What you also can see, we're using a `-1` here as a magic value - we'll use it on the counter as a flag to determine if any of the fibers failed/was cancelled - and if so, which one of them will call the `next` callback.

#### Racing to completion

With first operator (`Fiber.parallel`) ready, now it's the time to implement `Fiber.race`. Since I've discussed it behavior multiple times in this post already, let's dive straight into the code:

```fsharp
let race (Fiber left) (Fiber right): Fiber<Choice<'a, 'b>> =
  Fiber <| fun (s, c) next ->
    if c.Cancelled then next None
    else 
      let mutable flag = 0
      let cancelChild = c.AddChild()
      let run fiber choice =
          (* to be described *)
      run left Choice1Of2
      run right Choice2Of2
```

So again, we want to have shared mutable flag, which we'll use to determine, which of the fibers finished as a first one to be able to call fiber's callback safely and cancel the other. You may see, that our returned fiber uses `Choice<,>` type - this means, that our left and right fibers can have results of different types. We'll use that soon, but first we need to complete our `run` function body:

```fsharp
let run fiber choice =
  s.Schedule (fun () ->
    fiber (s, cancelChild) (fun result ->
      if Interlocked.Exchange(&flag, 1) = 0 then
        cancelChild.Cancel()
        if c.Cancelled then next None
        else match result with
             | None -> next None
             | Some(Ok v) -> next (Some(Ok(choice v)))
             | Some(Error e) -> next (Some(Error e))))
```

What we do here is simply trying to race to "reserve" out flag variable - the winner gets his result mapped to corresponding choice, while looser gets cancelled.

What's interesting, we can now combine our `race` and `delay` functions to easily implement timeout mechanism:

```fsharp
let timeout (t: TimeSpan) fiber =
  Fiber <| fun (s, c) next ->
    let (Fiber call) = race (delay t) fiber
    call (s, c) (fun result ->
      if c.Cancelled then next None
      else match result with
           | None -> next None
           | Some(Ok (Choice1Of2 _)) -> next None // timeout won
           | Some(Ok (Choice2Of2 v)) -> next (Some(Ok v))
           | Some(Error e) -> next (Some(Error e))
    )
```

The one last thing left for us, is to be able to run out fibers on the main thread - otherwise we'd start our program, schedule fibers to run in the background and then close the program without waiting for the results.

```fsharp
let blocking (s: IScheduler) (cancel: Cancel) (Fiber fn) =
  use waiter = new ManualResetEventSlim(false)
  let mutable res = None
  s.Schedule(fun () -> fn (s, cancel) (fun result ->
    if not cancel.Cancelled then
      Interlocked.Exchange(&res, Some result) |> ignore
    waiter.Set()))
  waiter.Wait()
  res.Value
```

It's simple - we'll use standard synchronization primitives provided by .NET runtime, to hold current OS thread until we complete. Sure it's blocking an OS thread, but we'll eventually need that if we don't want our program's main function to finish before all fibers inside the thread pool complete.

### Simulating real environment in tests

In theory, we could be done here. But, if you managed to read up to this point, we may want to cover one last scenario. Imagine that we'd want to test our fibers. However running tests using standard thread pool scheduler can lead to funky issues:

- Sometimes you may trigger some race conditions in your code, that only happen in specific situations (like high CPU contention) and are almost impossible to reproduce during debug sessions.
- Other times you may have some lengthy delays/timeouts in your code, like waiting for seconds or even minutes before continuing. Guess what: now your test will wait for just as long.

These are not new problems. They are well known in world of concurrent and distributed systems. What we need, is a simulation of execution environment. If you want to listen more about that concept, I could recommend you [this presentaton](https://www.youtube.com/watch?v=4fFDFbi3toc&ref=bartoszsypytkowski.com). To run our test predictably, we'll create a dedicated test scheduler, which will run our code in deterministic fashion (on a single core) and in a way that's detached from other invariants eg. actual physical clock and random number generator.

The idea here is simple - our scheduler will operate on notion of virtual timeline. When we'll try to schedule a new function - to trigger either immediately or after some timeout - we'll store it inside an ordered collection, a timeline. Some of the technical decisions we also made for purposes of this implementation:

- Whenever a fiber is going to schedule multiple parallel executions "at the same time", we'll put them all into a single bucket on a timeline. Later on I'll cover, why this is useful.
- We'll assume, that single operation execution is instantaneous. It means, it doesn't advance our scheduler's clock. We do it only for delayed executions.

After describing the concept behind the algorithm, the actual implementation really shouldn't be that surprising:

```fsharp
type TestScheduler(now: DateTime) =
  let mutable running = false
  let mutable currentTime = now.Ticks
  let mutable timeline = Map.empty
  let schedule delay fn = (* to be defined *)
  let rec run () = (* to be defined *)
  interface IScheduler with
    member this.Schedule fn = 
      schedule 0L fn
      if not running then
        running <- true
        run ()
    member this.Delay (timeout: TimeSpan, fn) = schedule timeout.Ticks fn
```

We're using a `running` flag here to not try to invoke `run` multiple times in nested manner - this would cause non-tailable recursion and potential stack overflow in more expensive tests.

The schedule function is pretty simple - calculate expected execution time for a function, then add that function to be executed at that point in time.

```fsharp
let schedule delay fn = 
  let at = currentTime + delay
  timeline <-
    match Map.tryFind at timeline with
    | None -> Map.add at [fn] timeline 
    | Some fns -> Map.add at (fn::fns) timeline
```

Given all of the code we already survived in this blog post, run loop should be pretty simple:

```fsharp
let rec run () =
  match Seq.tryHead timeline with
  | None -> running <- false
  | Some (KeyValue(time, bucket)) ->
    timeline <- Map.remove time timeline
    currentTime <- time
    for fn in List.rev bucket do 
      fn ()          
    run ()
```

We'll try to pick the first entry from the timeline - since here we use F# map, which is sorted in ascending order, we know that first entry is the one with the shortest execution timeout. We update our "current" time to match the expected one we calculated earlier, and finally we execute all functions scheduled at that time and repeat the loop all over until we eventually run out of scheduled actions.

Now here's the trick - we use `List.rev` to execute functions in the same order in which they were scheduled, because we want our tests to be deterministic and our bugs to be reproducible. However this is not the only strategy - since we know that functions in the same bucket could as well be executing in parallel, we could shuffle them around in different permutations for early discovery of some data races! I'll won't dive into it, but leave that idea as food for thoughts for you.

One last note about the test scheduler is that isolating it from the actual physical clock means, we cannot trust our time functions (like `DateTime.UtcNow`) any longer. This shouldn't really be an issue though - because relying on physical time would potentially make our tests indeterministic, we didn't want to use it anyway, right?

However, we need to be able to obtain current time from the scheduler, so we need to extend its API:

```fsharp
type IScheduler =
  abstract UtcNow: unit -> unit
  // ... other methods
  
type TestScheduler() =
  let mutable currentTime = DateTime.UtcNow.Ticks
  // ... rest of the implementation
  interface IScheduler with
    member __.UtcNow() = DateTime(currentTime)
    // ... other methods
```

And that's all. As always, if you got confused or have a problems along the way, you can get the entire code [here](https://gist.github.com/Horusiath/9c790691130150b524aaa9ab426ed982?ref=bartoszsypytkowski.com). I wanted to thank to Anthony Lloyd for his initial work on porting Scala [ZIO](https://zio.dev/?ref=bartoszsypytkowski.com) library to F#, which brought me an inspiration to write this piece.