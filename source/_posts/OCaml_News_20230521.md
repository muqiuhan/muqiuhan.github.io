---
title: OCaml News 2023/5/21
date: 2023-05-21
tags: [OCaml, Technique]
---

# 二〇二三年五月十五日 - 二〇二三年五月二十一日

## Fmlib_browser 0.5.4

之前介绍过的[Fmlib: Ocaml函数式Monadic库](https://github.com/hbr/fmlib)更新了其中的 [Fmlib_browser](https://hbr.github.io/fmlib/odoc/fmlib_browser/)模块, Fmlib_browser可以帮助用Elm-Style开发纯函数式风格的Web App。

论坛原帖: [https://discuss.ocaml.org/t/ann-release-0-5-4-of-fmlib-browser/12184](https://discuss.ocaml.org/t/ann-release-0-5-4-of-fmlib-browser/12184)

## 测试一下OCaml的FFI

以 《[The absurd cost of finalizers in Go](https://lemire.me/blog/2023/05/19/the-absurd-cost-of-finalizers-in-go/)》 这篇文章作为动机，测试一下OCaml FFI方面的性能比Go好多少或差多少:


|test|ocaml 5.0|go 1.19.9|
|----|---------|---------|
|native add|0.3 ns|0.3 ns|
|foreign add|1.5 ns|60.4 ns|
|c allocate & free|4.0 ns|71.6 ns|
|allocate & free|17.2 ns|133.3 ns|
|alloc auto|125.6 ns|1180 ns|
|alloc dummy|131.0 ns|1197 ns|
|alloc custom|109.4 ns|-|

但这不一定是一个准确的测试,例如应该使用`Sys.time`还是`Unix.gettimeofday`来计算时间还有待商榷， 更详细的请看论坛原帖: [https://discuss.ocaml.org/t/critique-my-use-of-ffi/12193](https://discuss.ocaml.org/t/critique-my-use-of-ffi/12193)

## OCaml在改善开发人员体验方面取得的进展

[OCaml Platform](https://ocaml.org/docs/platform)是提高OCaml工作效率的工具集。 他们在OCaml平台上所做的所有工作都有一个目标： *改善 OCaml开发人员的体验*。

以下是目前正在研究并改善的一些工作流程：

1. 构建包：构建工作流的直接目标是消除与使用两种不同的工具进行包管理和构建系统相关的差异。例如OCaml开发者通常需要使用opam下载包再用dune作为构建系统构建包，为此，他们计划将opam直接集成到dune中，使其成为构建OCaml项目所需的单一工具，就像cargo一样。 这项工作也可以改进其他工作流程，例如处理多个项目，交叉编译等。
    > 计划在此: [https://discuss.ocaml.org/t/explorations-on-package-management-in-dune/12101](https://discuss.ocaml.org/t/explorations-on-package-management-in-dune/12101)

3. 编译为JavaScript： 不断改善将OCaml编译为JavaScript的工具。 改善dune与Js_of_ocaml的集成，他们也一直在致力于Dune和[Melange](https://github.com/melange-re/melange)的集成， Melange fork自[ReScript](https://github.com/rescript-lang/rescript-compiler)编译器，专注于与OCaml生态系统集成。

4. 文档生成： OCaml包的文档是 OCaml2020至2022调查中的一个主要痛点。 他们正在努力改善OCaml开发人员创建高质量的文档的体验。 例如通过添加新功能、改进导航和扩展odoc标记语法以支持丰富的内容（例如表格、图像和图形）来使odoc生成的文档手册更加高质量。 初次之外还将把OCaml的编辑器支持引入Web和第三方平台，例如OCaml Playground 和 GitHub Codespaces。

5. 代码格式化： 提高准确性， 增强向后兼容性， 更加深入地集成dune和ocamlformat

与此同时，OCaml Platform也一直在寻找新的维护者和贡献者， 具体的可以看论坛原帖: [https://discuss.ocaml.org/t/ocaml-platform-newsletter-april-2023/12187](https://discuss.ocaml.org/t/ocaml-platform-newsletter-april-2023/12187)

## 在odoc中内嵌HTML

通过 `{%html: <p>foo</p> %}` 来实现， [例如](https://github.com/ocaml/odoc/blob/72ac2cfdf34ecc0ed574f9e4dd692f5d9b3da412/test/generators/cases/markup.mli#L142C1-L152):
```
    {1 Raw HTML}

    Raw HTML can be {%html:<input type="text" placeholder="inserted">%} as
    inline elements into sentences.

    {%html:
    <blockquote>
      If the raw HTML is the only thing in a paragraph, it is treated as a block
      element, and won't be wrapped in paragraph tags by the HTML generator.
    </blockquote>
    %}
```


论坛原帖：[https://discuss.ocaml.org/t/is-it-possible-to-include-inline-html-in-ocaml-documentation-odoc/12177](https://discuss.ocaml.org/t/is-it-possible-to-include-inline-html-in-ocaml-documentation-odoc/12177)

## 开源的OCaml静态博客生成工具

- [YOCaml: A static site generator, mostly written in OCaml](https://github.com/xhtmlboi/yocaml)
- [Finch: Simple and fast site generator ](https://github.com/roddyyaga/finch)

论坛原帖: [https://discuss.ocaml.org/t/open-source-tool-to-make-a-static-blog-in-ocaml/11967](https://discuss.ocaml.org/t/open-source-tool-to-make-a-static-blog-in-ocaml/11967)

## 一些GADT的实践用法

[这个帖子](https://discuss.ocaml.org/t/open-source-projects-using-gadts/9640) 列出了一些使用了GADT的开源项目，除此之外，还有一篇 [《Petrol：使用 GADT 在 OCaml 中嵌入类型安全的 SQL API》](https://gopiandcode.uk/logs/log-ways-of-sql-in-ocaml.html)。

函数式语言实现中的LR parser generator生成的代码是无类型的、不必要的低效代码，使用GADT，可以生成类型良好（不会意外崩溃或失败）且高效的解析器， 这篇论文讲了细节: [Towards efficient, typed LR parsers](http://cambium.inria.fr/~fpottier/publis/fpottier-regis-gianas-typed-lr.pdf)


论坛原帖: [https://discuss.ocaml.org/t/a-bestiary-of-gadt-examples/12143](https://discuss.ocaml.org/t/a-bestiary-of-gadt-examples/12143)

## 对 OCaml.org 的改进

本月，OCaml发布了从3月开始准备的一项改善 OCaml.org 的Learn板块的[调查结果](https://discuss.ocaml.org/t/you-started-to-learn-ocaml-less-than-12-months-ago-please-help-us-with-our-user-survey-on-the-ocaml-org-learning-area/11945)。该调查在各种平台上进行了推广，包括官方OCaml讨论平台，Discord，LinkedIn，Twitter等，并得到了积极的相应，从五月份开始，官方会根据调查结果改善Learn板块。

除了的Learn板块的改进之外，官方还对文档进行了一些较小的改进，具体表现在ocaml官网的仓库中许多未完成的包含对学习区域现有文档页面更新的pr， 这些pr将在五月份合并大部分。

除此之外还有大量细节的更改可以查看论坛原帖: [https://discuss.ocaml.org/t/ocaml-org-newsletter-april-2023/12173](https://discuss.ocaml.org/t/ocaml-org-newsletter-april-2023/12173)

## 生态

- [cri: IRC protocol in OCaml](https://github.com/dinosaure/cri)
- [bob: A peer-to-peer file-transfer tool in OCaml](https://github.com/dinosaure/bob)
- [art: Adaptive Radix Tree in OCaml](https://github.com/dinosaure/art)
- [uucd: Unicode character database decoder for OCaml](https://github.com/dbuenzli/uucd)
- [OCANNL: OCaml Compiles Algorithms for Neural Networks Learning](https://github.com/lukstafi/ocannl)
- [codept: Contextual Ocaml DEPendencies Tool: alternative ocaml dependency analyzer](https://github.com/Octachron/codept)
- [pp_loc: Pretty-printing for error source locations](https://github.com/Armael/pp_loc)