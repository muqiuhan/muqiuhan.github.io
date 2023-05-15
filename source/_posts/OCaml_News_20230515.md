---
title: OCaml News 2023/5/15
date: 2023-05-15
tags: [OCaml, Technique]
---

# 二〇二三年五月九日 - 二〇二三年五月十五日

## 关于OCaml最新的并行特性相关文档

1. Eio的README有很多例子: [https://github.com/ocaml-multicore/eio](https://github.com/ocaml-multicore/eio)
2. ocaml-multicore组织官方的教程仓库: [https://github.com/ocaml-multicore/parallel-programming-in-multicore-ocaml](https://github.com/ocaml-multicore/parallel-programming-in-multicore-ocaml)
3. OCaml的Manual: [https://v2.ocaml.org/releases/5.0/htmlman/parallelism.html](https://v2.ocaml.org/releases/5.0/htmlman/parallelism.html)

论坛原帖: [https://discuss.ocaml.org/t/new-concurrency-features/12158](https://discuss.ocaml.org/t/new-concurrency-features/12158)

## 使用OCaml通过串口与STM32通信

在Linux/Unix上可以:
- 适用于linux/unix的oserial: [https://github.com/m-laniakea/oserial](https://github.com/m-laniakea/oserial)
- 直接打开 `/dev/XXX` 文件用Unix模块相关的API与其交互， 一个例子: [https://gist.github.com/dbuenzli/035bc5c8598069360dd7301f55e7774a](https://gist.github.com/dbuenzli/035bc5c8598069360dd7301f55e7774a)

Windows目前没有解决方案。

论坛原帖: [https://discuss.ocaml.org/t/is-there-any-library-of-ocaml-to-use-serial-port-of-pc/3658](https://discuss.ocaml.org/t/is-there-any-library-of-ocaml-to-use-serial-port-of-pc/3658)

## 使用OCaml构建IOS APP

- 通过Js_of_ocaml编译为JavaScript并使用像CapacitorJS（甚至是旧的Cordova）这样的框架或许是一条路子。
- [Psellos](http://psellos.com/aboutus.html)是一个注重现代函数式语言(OCaml, F#, Haskell)的组织，它们维护了一个将OCaml编译到IOS的交叉编译器: [http://psellos.com/ocaml/compile-to-iphone.html](http://psellos.com/ocaml/compile-to-iphone.html)
- ocaml-cocoa的demo: [https://github.com/dboris/ocaml-cocoa/blob/master/examples/count_clicks.ml](https://github.com/dboris/ocaml-cocoa/blob/master/examples/count_clicks.ml)


论坛原帖: [https://discuss.ocaml.org/t/building-ios-apps-with-ocaml/12153](https://discuss.ocaml.org/t/building-ios-apps-with-ocaml/12153)

## Ahref现在使用Melange构建

[Melange]()是结合使用 OCaml 和 Reason 生成 JavaScript 的工具组合。
[Ahrefs](https://ahrefs.com/)是一个SEO软件套装，包含外链建设、关键字研究、竞争对手分析，排名跟踪和站点审核等工具。Ahrefs内部的大多数功能都是为营销专业人员设计的。

自去年 9 月以来，Melange、Dune 和 Ahrefs 开发团队一直致力于加强 Dune 和 Melange 之间的集成。作为一家在后端使用大量 OCaml 的公司，Ahrefs看到了Melange可以将其前端技术栈与OCaml更紧密结合(通过使用Melange与UI相关的JavaScript生态系统集成)。因此，该公司决定投资并积极参与以实现这种整合。

论坛原帖: [https://discuss.ocaml.org/t/ahrefs-is-now-built-with-melange/12107](https://discuss.ocaml.org/t/ahrefs-is-now-built-with-melange/12107)


## Ahref正在招聘OCaml开发人员

一如既往，Ahrefs正在寻找OCaml开发人员，他们总部位于新加坡，团队遍布各地，所以也支持远程，详见:
[https://ahrefs.com/jobs/ocaml-developer](https://ahrefs.com/jobs/ocaml-developer)

论坛原帖: [https://discuss.ocaml.org/t/ahrefs-is-hiring/12136](https://discuss.ocaml.org/t/ahrefs-is-hiring/12136)

## string literals inside comments #5745 

草，OCaml的parser不会忽略注释中的引号：
```
$ echo '(* "test *)' | ocaml 
OCaml version 5.0.0
Enter #help;; for help.

# (* "test *)tive `utop_prompt_fancy_light'.
# * 
Error: This comment contains an unterminated string literal
Line 1, characters 3-4:   String literal begins here
# 
```

而经过讨论认为修复这个问题是向后不兼容的，所以修复这个词法分析器错误的风险似乎大于好处，就给close了。

相关issue: [https://github.com/ocaml/ocaml/issues/5745](https://github.com/ocaml/ocaml/issues/5745)

有趣的是F#也继承了这个问题:
```
$ echo '(* "test *)' | dotnet fsi

Microsoft (R) F# Interactive version 12.5.0.0 for F# 7.0
Copyright (c) Microsoft Corporation. All Rights Reserved.

For help type #help;;

> 
  (* "test *)
  ^^

/home/muqiu-han/stdin(1,1): error FS0517: End of file in string embedded in comment begun at or before here
```

