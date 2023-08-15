---
title: 使用 [@poll error] 实现线程安全的数据结构
date: 2023-08-15 11:48:55
tags: [Technique, OCaml]
---

OCaml的标准库提供了许多mutable的数据结构，比如Hashtbl, Queue, Stack之类的，但是这些数据结构都不是线程安全的。在 OCaml 4 和 OCaml 5 中，单个Domain中一次只能运行一个线程。换句话说，单个Domain中的线程仍然不会并行运行，除非在不同所的Domain中。

而在单个Domain中 OCaml 的 runtime 是通过在safe point期间半抢占式的切换线程。也就是说，线程切换只会发生在safe point期间。例如内存分配就是是safe point。这意味着在没有safe point的代码块内，可以在Domain内原子性地进行多次读写或访问操作，因为线程没被切换。

OCaml 编译器提供了一个名为 [`[@poll error]`](https://github.com/ocaml/ocaml/pull/10462) 的annotation，可以在函数中使用它来确保该函数不包含safe point。

所以通过使用 `[@poll error]` 就可以创建在Domain内原子性执行的函数，也就是说，基于此特性可以实现单个Domain内线程安全的数据结构，例如 thread-table 便是使用这个特性实现的 Hash Table。可以看看它的 add 函数的实现:

```ocaml
let[@poll error] add_atomically t buckets n i before after =
  t.rehash = 0 && buckets == t.buckets
  && before == Array.unsafe_get buckets i
  && begin
       Array.unsafe_set buckets i after;
       let length = t.length + 1 in
       t.length <- length;
       if n < length && n < max_buckets_div_2 then t.rehash <- n * 2;
       true
     end

let rec add t k' v' =
  let h = Mix.int k' in
  maybe_rehash t;
  let buckets = t.buckets in
  let n = Array.length buckets in
  let i = h land (n - 1) in
  let before = Array.unsafe_get buckets i in
  let after = Cons (k', v', before) in
  if not (add_atomically t buckets n i before after) then add t k' v'
```

相比使用 Stdlib.Mutex，这种无锁实现会有更好的性能（特别是对于只读操作），并且还允许例如信号处理之类的上下文操作。