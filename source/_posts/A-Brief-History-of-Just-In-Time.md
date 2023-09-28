---
title: A Brief History of Just-In-Time
date: 2023-09-28 04:59:59
tags: [Technique, Compilation]
---

Software systems have been using “just-in-time” compilation (JIT) techniques since the
1960s. Broadly, JIT compilation includes any translation performed dynamically, after a
program has started execution. We examine the motivation behind JIT compilation and
constraints imposed on JIT compilation systems, and present a classification scheme for
such systems. This classification emerges as we survey forty years of JIT work, from
1960–2000.

- [论文链接](/papers/A%20Brief%20History%20of%20Just-In-Time.pdf)

主要介绍了JIT的历史和发展过程， 从上世纪六十年代开始， 一直到现在的第四代JIT系统， 大概有三点：
- 介绍了JIT每一代出现的动机和约束条件
- 介绍了对各种JIT技术的分类方式
  > 1. Invocation
  > 2. Executability
  > 3. Concurrency
- 介绍了各个时期JIT技术的实现方式和优缺点

除此之外还介绍了JIT的工具包以及它们在三个不同的方面的支持程度, 分别是
- Binary code generation.
- Cache coherence.
- Execution.

总体来说，这篇论文算是一个概览，可以当成一个JIT相关论文的查询目录了，它把这过程中的所有研究全部以时间线的方式梳理起来，最后总结分类。