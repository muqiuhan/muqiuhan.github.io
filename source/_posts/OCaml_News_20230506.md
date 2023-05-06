---
title: OCaml News 2023/5/6
date: 2023-05-06
tags: [OCaml, Technique]
---

# 二零二三年四月二十九日 - 二零二三年五月六日

## Dune正在探索集成包管理，提供统一的开发体验

dune, opam, opam-monorepo团队在几个月前联合起来，共同解决这个来自之前社区报告中的重要痛点。

在dune的github上有对于这项工作的详细解释：https://github.com/ocaml/dune/issues/7680

https://discuss.ocaml.org/t/explorations-on-package-management-in-dune/12101

[论坛原帖：https://discuss.ocaml.org/t/explorations-on-package-management-in-dune/12101](https://discuss.ocaml.org/t/explorations-on-package-management-in-dune/12101)

## OCaml/C FFI对象的生命周期问题
OCaml manual中有一节名为[﻿
5 Living in harmony with the garbage collector](https://v2.ocaml.org/manual/intfc.html#s%3Ac-gc-harmony)，其中介绍了六个规则，帮助编写C FFI。

对于如下C代码:
```C
value pair(value a, value b) {
  CAMLparam2(a, b); /*required*/
  CAMLlocal1(r); /*required*/
  r = caml_alloc(2,0);
  Store_field(r,0,a);
  Store_field(r,1,b);
  CAMLreturn(r); /*required*/
}
```

这里的`CAMLlocal1(r)`并不是必须的，如果a和b是立即值，那么其他注释有`require`的代码。也不是必须的，对于这六个规则应该持保留态度，它们并不是必须严格遵守的，只是为了更安全。

[论坛原帖：https://discuss.ocaml.org/t/ocaml-c-ffi-object-lifetimes/12099](https://discuss.ocaml.org/t/ocaml-c-ffi-object-lifetimes/12099)

## 使用Elm Style编写函数式Web应用

Fmlib 是一个函数式库，其中包含以下组件:
- Fmlib_std: 标准的数据结构（B树等）
- Fmlib_pretty: Pretty Printing
- Fmlib_parse: Parsing
- Fmlib_browser: Web应用程序
- Fmlib_js: 与浏览器/Nodejs交互

github仓库：[https://github.com/hbr/fmlib](https://github.com/hbr/fmlib)

一些简单的示例：[https://hbr.github.io/fmlib/webapp/index.html](https://hbr.github.io/fmlib/webapp/index.html)

[论坛原帖：https://discuss.ocaml.org/t/ann-functional-web-applications-running-in-the-browser/11984](https://discuss.ocaml.org/t/ann-functional-web-applications-running-in-the-browser/11984)

## 使用OCaml编写NeoVIM插件

VCaml是一个用于在 OCaml 中编写 Neovim 插件的库。

github仓库: [https://github.com/janestreet/vcaml](https://github.com/janestreet/vcaml)

论坛上相关的讨论: [https://discuss.ocaml.org/t/repo-for-nvim-plugins-in-ocaml-neovim-vcaml/12049](https://discuss.ocaml.org/t/repo-for-nvim-plugins-in-ocaml-neovim-vcaml/12049)

## Format和PPrint在实践中的对比

[论坛原帖： https://discuss.ocaml.org/t/format-vs-pprint-in-practice/12087](https://discuss.ocaml.org/t/format-vs-pprint-in-practice/12087)

## BLAS/LAPACK的OCaml Binding
这个 OCaml 库绑定了两个广泛使用的数学 FORTRAN 库：
- BLAS : [www.netlib.org/blas/](www.netlib.org/blas/)
- LAPAK : [www.netlib.org/lapack/](www.netlib.org/lapack/)

Github仓库：[https://github.com/mmottl/lacaml](https://github.com/mmottl/lacaml)

## 基于Effects的实验性WebServer
Github仓库: [https://github.com/avsm/eeww](https://github.com/avsm/eeww)

## 纯（？）函数式SSH库
awa-ssh是一个使用ISC协议开源的OCaml SSH库
Github仓库：[https://github.com/mirage/awa-ssh](https://github.com/mirage/awa-ssh)