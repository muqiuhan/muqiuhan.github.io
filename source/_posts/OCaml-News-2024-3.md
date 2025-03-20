---
title: OCaml News 2024-3
date: 2024-02-26 10:27:59
tags: [Technique]
---

## 

o-新鲜事儿

- [OCaml 5.1.0 released](https://discuss.ocaml.org/t/ocaml-5-1-0-released/13021)
    
- [[ANN] dune 3.14](https://discuss.ocaml.org/t/ann-dune-3-14/14096)
    

  

- [code search](https://ocaml.codes/search/)
    
- [[ANN] ocaml.codes, code search for OPAM packages](https://discuss.ocaml.org/t/ann-ocaml-codes-code-search-for-opam-packages/14092)
    
- 用 livegrep 基于 opam 包的源码做的代码搜索，还挺方便的。
    

  

- [Announcing Melange 3](https://melange.re/blog/posts/announcing-melange-3)
    
- [[ANN] Melange 3.0](https://discuss.ocaml.org/t/ann-melange-3-0/14102)
    

  

- [Learn-OCaml 1.0 is out!](https://discuss.ocaml.org/t/learn-ocaml-1-0-is-out/14100)
    
- [https://ocaml-sf.org/learn-ocaml-public/](https://ocaml-sf.org/learn-ocaml-public/)
    

  

- [GitHub - owlbarn/owl: Owl - OCaml Scientific Computing @ http://ocaml.xyz](https://github.com/owlbarn/owl)
    
- [Owl project concluding](https://discuss.ocaml.org/t/owl-project-concluding/14117)
    
- 经过八年的维护，Owl项目即将终止
    

## 

o-视频

- [Inferring Locality in OCaml | OCaml Unboxed](https://www.youtube.com/watch?v=jvQ7fj9LlVA)
    
- [OCaml Locals Save Allocations | OCaml Unboxed](https://www.youtube.com/watch?v=AGu4AO5zO8o)
    
- [Ocsigen: Developing Web and mobile applications in OCaml – Jérôme Vouillon & Vincent Balat](https://watch.ocaml.org/w/qQzb94X9WM7zLif7FynPyN)
    
- [Verifying an Effect-Based Cooperative Concurrency Scheduler in Iris by Adrian Dapprich](https://watch.ocaml.org/w/iQNqZzA8gVmd4RQaycAwx4)
    

## 

o-博客 / 文章 / 帖子

- [Introducing DBCaml, Database toolkit for OCaml](https://priver.dev/blog/dbcaml/dbcaml/)
    
- [Building a Connnection Pool for DBCaml on top of riot](https://priver.dev/blog/dbcaml/building-a-connnection-pool/)
    

  

- [Generating static and portable executables with OCaml](https://ocamlpro.com/blog/2021_09_02_generating_static_and_portable_executables_with_ocaml/)
    
- OCaml编译器没有内置生成静态可移植可执行文件的特性，这里提到了一些技巧
    

  

- [Analog of Promise.any() for Multicore OCaml](https://discuss.ocaml.org/t/analog-of-promise-any-for-multicore-ocaml/14145)
    
- [Printf vs. Format?](https://discuss.ocaml.org/t/printf-vs-format/14130)
    
- [How to represent tuples in AST?](https://discuss.ocaml.org/t/how-to-represent-tuples-in-ast/14095)
    
- [How do I pass an unsigned char * (an array of bytes representing binary data) from C to OCaml?](https://discuss.ocaml.org/t/how-do-i-pass-an-unsigned-char-an-array-of-bytes-representing-binary-data-from-c-to-ocaml/14074)
    

## 

o-未来

- [How do we want to present OCaml to the World on OCaml.org?](https://docs.google.com/forms/d/e/1FAIpQLSe1U_5KanTeKt1h9t5vjYohYXepXDhPCru4tsms4OcI5k0Fkw/viewform?pli=1)
    
- 一个问卷，用于更好的改进 [ocaml.org](http://ocaml.org/) 有关学术和工业应用板块的内容。
    

  

- [Feedback / Help Wanted: Upcoming OCaml.org Cookbook Feature](https://discuss.ocaml.org/t/feedback-help-wanted-upcoming-ocaml-org-cookbook-feature/14127)
    
- [ocaml.org](http://ocaml.org/) 准备上线一个cookbook页面，放一些如何用OCaml的生态解决常见需求的资源
    

  

- [State of compaction in OCaml 5?](https://discuss.ocaml.org/t/state-of-compaction-in-ocaml-5/14121/1)
    
- OCaml 5.2 的 compact heap 会将未使用的内存返回给操作系统。在 OCaml 5 的 GC 中，小于 128byte 的块用大小隔离池进行管理，比如有一个池，处理大小为 3byte 的分配，另一个池处理大小为 4byte 的分配等等，这样的池在每个Domain里都有。用这个方法分配速度很快，因为不用找合适的内存间隙了，只要找正确的池大小就行。
    

## 

o-值得被注意的项目

- [GitHub - mbarbin/vcs: A versatile OCaml library for Git interaction](https://github.com/mbarbin/vcs)
    
- [A Versatile OCaml Library for Git Interaction - Seeking Community Feedback](https://discuss.ocaml.org/t/a-versatile-ocaml-library-for-git-interaction-seeking-community-feedback/14155)
    

  

- [GitHub - dbcaml/dbcaml: DBCaml is a database library for OCaml](https://github.com/dbcaml/dbcaml)
    
- [DBcaml, a new database toolkit built on Riot](https://discuss.ocaml.org/t/dbcaml-a-new-database-toolkit-built-on-riot/14150)
    

  

- [GitHub - c-cube/fuseau: [alpha] lightweight fiber library for OCaml 5](https://github.com/c-cube/fuseau)
    
- [[ANN] fuseau 0.1](https://discuss.ocaml.org/t/ann-fuseau-0-1/14157)
    

  

- [GitHub - issuu/ocaml-protoc-plugin: ocaml-protoc-plugin](https://github.com/issuu/ocaml-protoc-plugin)
    
- [Taking over maintanence of a stale project](https://discuss.ocaml.org/t/taking-over-maintanence-of-a-stale-project/14156)
    

  

- [GitHub - darrenldl/docfd: TUI multiline fuzzy document finder](https://github.com/darrenldl/docfd)
    
- [[ANN] Docfd: TUI multiline fuzzy document finder 2.2.0](https://discuss.ocaml.org/t/ann-docfd-tui-multiline-fuzzy-document-finder-2-2-0/14109/1)