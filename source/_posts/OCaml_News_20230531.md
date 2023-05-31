---
title: OCaml News 2023/5/31
date: 2023-05-31
tags: [OCaml, Technique]
---

# 二〇二三年五月二十一 - 二〇二三年五月三十一日

## 为什么OCaml中总是约定俗成的写 `type t = ...` ?

在OCaml中我们经常会看到：
```ocaml
module Foo = struct
    type t = ...
    ...
end
```
这种写法已经存在于29年前的 [Caml Light sources](https://github.com/camllight/camllight/blob/master/sources/src/lib/hashtbl.mli#L5) 中， SML里面也能看到这种写法。 按照惯例，当一个模块定义了一个唯一的核心抽象数据类型时，就写成`type t = ...`。

为什么要这么写也有比较多原因，具体可以看论坛原帖: [https://discuss.ocaml.org/t/why-is-ocaml-convention-to-use-type-t/12256](https://discuss.ocaml.org/t/why-is-ocaml-convention-to-use-type-t/12256)

但可以知道的是，有了这个约定之后Functor的使用会更加方便。 例如标准库的`Set`模块，大家都可以直接:
```ocaml
Set.Make(Foo)
```

而不是多写一些无用的代码：
```ocaml
Set.Make(struct
    include Foobar
    type t = foobar
    let compare = compare_foobar 
end)

```

## 如何更高效的使用OCaml    

在这个帖子中，针对在OCaml中使用新的库由于因为文档很少并且需要阅读源码导致非常耗时的问题展开了讨论:

论坛原帖: [https://discuss.ocaml.org/t/how-do-you-stay-productive-in-ocaml/8221](https://discuss.ocaml.org/t/how-do-you-stay-productive-in-ocaml/8221)

## 求值顺序

在OCaml中，想这样的代码:
```ocaml
foo(f x, f y, f z)
```
会先对 `f z` 求值而不是 `f x`，OCaml官方并没有定义求值顺序，实现上是从右到左的，如果想从左到右只能一个个let。

论坛原帖: [https://discuss.ocaml.org/t/evaluation-order/12258](https://discuss.ocaml.org/t/evaluation-order/12258)

## OCaml Platform路线图

在2020年的OCaml Platform会议中，avsm和OCaml Platform团队提出了针对开发工具（例如编辑器）的改进，使开发效率提升，这三年以来OCaml的开发工具和开发人员体验发生了很大变化，OCaml Platform的工作也取得了重大进展。

> 2020年OCaml Platform会议视频: [https://watch.ocaml.org/w/2KbfRNv2oLtkKXkbd5u9F1](https://watch.ocaml.org/w/2KbfRNv2oLtkKXkbd5u9F1)

对于未来，OCaml Platform打算研究新的OCaml工作流原型。并认为应该反思过去三年所做的一切并制定未来三年的路线图。

所以在过去的几个月里，OCaml Platform一直致力于收集尽可能多的社区反馈，并组织了几个会议，会见了使用OCaml的来自各个行业的开发者，并从他们口中了解相关的需求和痛点。在会议中还共同思考了理想的 OCaml 开发人员体验应该是什么。

OCaml Platform希望由社区驱动自身，所以公布了路线图，并开始收集反馈并对其进行更新迭代:

> OCaml Platfrom路线图: [https://github.com/tarides/ocaml-platform-roadmap](https://github.com/tarides/ocaml-platform-roadmap)

论坛原帖: [https://discuss.ocaml.org/t/a-roadmap-for-the-ocaml-platform-seeking-your-feedback/12238](https://discuss.ocaml.org/t/a-roadmap-for-the-ocaml-platform-seeking-your-feedback/12238)

## OCaml的Debug体验

VS Code唯一的debug支持是 [hackwaly/ocamlearlybird](https://github.com/hackwaly/ocamlearlybird/) ， 但遗憾的是它已经不积极维护了（根据 README 判断它只支持 4.11 和 4.12）。

所以在出现更好的替代方案之前...
> The most effective debugging tool is still careful thought, coupled with judiciously placed print statements!!!

不过除此之外还是有很多Debug相关的库和方案的，比如上一期的 [ppx_minidebug](https://github.com/lukstafi/ppx_minidebug) 和 [ppx_debug](https://github.com/dariusf/ppx_debug) 或者是 [ppx_interact](https://github.com/dariusf/ppx_interact)。

具体的可以看论坛原帖： [https://discuss.ocaml.org/t/enhancing-ocaml-debugging-experience-in-visual-studio-code/12236](https://discuss.ocaml.org/t/enhancing-ocaml-debugging-experience-in-visual-studio-code/12236)

## 类似 MIT Scratch/Berkeley Snap/Google Blockly 之类的OCaml实现？

[Blockly](https://github.com/google/blockly)是一个基于网络的可视化编程编辑器。

OCaml中也有类似的 [Hazle](https://hazel.org/)

论坛原帖: [https://discuss.ocaml.org/t/exists-scratch-snap-blockly-for-ocaml-js/12234](https://discuss.ocaml.org/t/exists-scratch-snap-blockly-for-ocaml-js/12234)

## Tiny_httpd v0.13

[Tiny_httpd](https://github.com/c-cube/tiny_httpd) 是一个极简的 HTTP 1.1 服务器库，它依赖线程（或线程池）而不是异步/协作多任务处理。可能有点异端。

## Parany v14.0.0

[Parany](https://github.com/UnixJunkie/parany)可以用于并行化任何类型的计算,在这个版本中作者将运行时切换回了`fork+marshal`

论坛原帖: [https://discuss.ocaml.org/t/new-major-release-of-parany-v14-0-0/12208](https://discuss.ocaml.org/t/new-major-release-of-parany-v14-0-0/12208)

## Merlin v4.9

[Merlin](https://github.com/ocaml/merlin) 是为OCaml提供现代IDE功能的编辑器后端服务，这个新版本带来了许多改进和错误修复。而且发现并修复了一个重要的内存消耗问题.

论坛原帖: [https://discuss.ocaml.org/t/ann-new-release-merlin-4-9/12277](https://discuss.ocaml.org/t/ann-new-release-merlin-4-9/12277)

## OCaml Learn板块更新

社区成员为官网的[Learn板块](https://staging.ocaml.org/docs)贡献了以章有关[Sequence](https://discuss.ocaml.org/t/creating-a-tutorial-on-sequences/12091)的教程。

论坛原帖: [https://discuss.ocaml.org/t/creating-a-tutorial-on-sequences/12091](https://discuss.ocaml.org/t/creating-a-tutorial-on-sequences/12091)

## 生态
- [streamable](https://github.com/janestreet/streamable):  A collection of types suitable for incremental serialization. 
- [incr_dom](https://github.com/janestreet/incr_dom):    A library for building dynamic webapps, using Js_of_ocaml. 