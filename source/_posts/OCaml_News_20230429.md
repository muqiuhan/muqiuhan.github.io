---
title: OCaml News Intro
date: 2023-04-29
tags: [OCaml, Technique]
---

这里是OCaml News，一个整合了OCaml社区以及周边生态最新信息的地方，先前一直在OCaml群内发送零散的信息，太细碎了，于是在此归纳整理，不过这一系列的更新频率是不规律的，并不遵循Weekly之类的频率，而是帖满即发。

总体上每一次更新分为三大类：
1. 论坛，即 [discuss.ocaml.org](https://discuss.ocaml.org/) 上有趣的新帖子
2. 生态，即OCaml本身或周边生态中中出现的新工具，库
3. 文章，即OCaml相关的最新论文，博客文章

所以：

---

# ？？？ - 二零二三年四月二十九日

## 论坛

### 呼吁新的 opam 存储库维护者
[OPAM](https://opam.ocaml.org/)是OCaml的官方包管理器，它通过[opam-repository](https://github.com/ocaml/opam-repository)存储OCaml包，opam-repository由少数人力共同维护，以确保包的时效性、和高质量。OPAM的维护团队正在寻找新的贡献者来帮助他们维护opam-repository。

帮助维护opam-repository并不是OCaml或OPAM方面的专家才能参与。新加入的维护者将从审查和批准对repo的更改开始，经过几周的工作后，你可以决定留下来继续做这份工作，届时将被授予完全访问权限。

论坛原帖：[https://discuss.ocaml.org/t/call-for-new-opam-repository-maintainers/12041](https://discuss.ocaml.org/t/call-for-new-opam-repository-maintainers/12041)

### Local Type Definition

OCaml目前并不支持类似如下的Local Type Definition:
```OCaml
let f : unit -> unit = 
 fun () ->
  let type t = A | B in
  ...
```

但可以通过let open一个只有t的module来实现:
```OCaml
let f : unit -> unit = 
 fun () ->
  let open struct type t = A | B end in
  ...
```

其实前者可以当作后者的糖，但目前还没实现，这是相关PR: [Add local type definition syntax #12151](https://github.com/ocaml/ocaml/pull/12151)

论坛原帖：[https://discuss.ocaml.org/t/local-type-definition](https://discuss.ocaml.org/t/local-type-definition)

## 生态
### 使用LablGtk3实现的七个GUI示例
行业中存在各种各样不同语言的GUI工具包和各种各样不同的GUI开发方式。7GUIs代表GUI编程中典型的七项任务。

项目页面：[https://7guis.github.io/7guis/](https://7guis.github.io/7guis/)
使用LablGtk3实现的7GUIs Github连接：[https://github.com/F-loyer/7guis-ocaml-lablgtk3](https://github.com/F-loyer/7guis-ocaml-lablgtk3)

## 文章

### 使用Dream编写REST API
这篇文章是使用Dream、Yojson和Caqti的经验之谈，这篇文章的重点不是做出价值判断（X框架好，Y框架不好之类的），而是理解如何将一个工作流程转换为另一个工作流程的概念.

文章连接：[https://jsthomas.github.io/ocaml-dream-api.html](https://jsthomas.github.io/ocaml-dream-api.html)
