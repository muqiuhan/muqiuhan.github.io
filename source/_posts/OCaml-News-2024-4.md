---
title: OCaml News 2024-3
date: 2024-07-1 10:27:59
tags: [Technique, OCaml]
---

## 那么接下来

- [First beta release for OCaml 5.2.0](https://link.zhihu.com/?target=https%3A//discuss.ocaml.org/t/first-beta-release-for-ocaml-5-2-0/14356).

- [#12876](https://link.zhihu.com/?target=https%3A//github.com/ocaml/ocaml/issues/12876) 和 [#12915](https://link.zhihu.com/?target=https%3A//github.com/ocaml/ocaml/issues/12915) 提供了 ThreadSanitizer 对 Power 和 s390x 上的 Linux 支持。
- [#12677](https://link.zhihu.com/?target=https%3A//github.com/ocaml/ocaml/issues/12677) 和 [#12889](https://link.zhihu.com/?target=https%3A//github.com/ocaml/ocaml/issues/12889) 实现了 `Domain.DLS` 的线程安全。
- [#12924](https://link.zhihu.com/?target=https%3A//github.com/ocaml/ocaml/issues/12924) 和 [#12930](https://link.zhihu.com/?target=https%3A//github.com/ocaml/ocaml/issues/12930) 提到了一个类型系统的错误和其修复方式（merged）:

```ocaml
module type S = sig
  type t [@@immediate]
end

type t = (module S with type t = int)
         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
(*
Error: In this with constraint, the new definition of t
       does not match its original definition in the constrained signature:
      Type declarations do not match:
         type t
       is not included in
         type t [@@immediate]
       The first is not an immediate type.
*)
```

- [OCaml 4.14.2 released](https://link.zhihu.com/?target=https%3A//discuss.ocaml.org/t/ocaml-4-14-2-released/14308).

  

- [Owl project restructured](https://link.zhihu.com/?target=https%3A//discuss.ocaml.org/t/owl-project-restructured/14226).

  

- [Your Feedback Needed on OCaml Home Page Wireframe!](https://link.zhihu.com/?target=https%3A//discuss.ocaml.org/t/your-feedback-needed-on-ocaml-home-page-wireframe/14366)

  

- [Shape with us the New OCaml.org Community Area!](https://link.zhihu.com/?target=https%3A//discuss.ocaml.org/t/shape-with-us-the-new-ocaml-org-community-area/14322)

  

- [OCaml Platform Newsletter: February 2024](https://link.zhihu.com/?target=https%3A//discuss.ocaml.org/t/ocaml-platform-newsletter-february-2024/14361).

- 其中值得注意的是：[探索 dune 和包管理的集成](https://link.zhihu.com/?target=https%3A//ocaml.org/docs/platform-roadmap%23w4-build-a-project) 和 [opam 2.2 的 Windows Native support](https://link.zhihu.com/?target=https%3A//ocaml.org/docs/platform-roadmap%23w5-manage-dependencies).

  

- [OCaml Workshop 2024 at ICFP -- announcement and call for proposals](https://link.zhihu.com/?target=https%3A//discuss.ocaml.org/t/ocaml-workshop-2024-at-icfp-announcement-and-call-for-proposals/14371).

  

- [Volunteers for ICFP 2024 Artifact Evaluation Committee (AEC)](https://link.zhihu.com/?target=https%3A//discuss.ocaml.org/t/volunteers-for-icfp-2024-artifact-evaluation-committee-aec/14355).

  

- [Odoc 3.0 planning](https://link.zhihu.com/?target=https%3A//discuss.ocaml.org/t/odoc-3-0-planning/14360).

  

- [Opam-repository: Updated documentation, retirement and call for maintainers](https://link.zhihu.com/?target=https%3A//discuss.ocaml.org/t/opam-repository-updated-documentation-retirement-and-call-for-maintainers/14325).

- [kit-ty-kate](https://link.zhihu.com/?target=https%3A//discuss.ocaml.org/u/kit-ty-kate) 退休啦。

## 论文

- [Chemoinformatics and structural bioinformatics in OCaml](https://link.zhihu.com/?target=https%3A//jcheminf.biomedcentral.com/articles/10.1186/s13321-019-0332-0).

## 帖子/文章

- [OCaml for building shared libraries: how are the ergonomics and performance?](https://link.zhihu.com/?target=https%3A//discuss.ocaml.org/t/ocaml-for-building-shared-libraries-how-are-the-ergonomics-and-performance/14352)

  

- [Using Awk in Kakoune to Generate SQL Types for OCaml](https://link.zhihu.com/?target=https%3A//mccd.space/posts/awk-with-kakoune/).

  

- [Eio 1.0 Release: Introducing a new Effects-Based I/O Library for OCaml](https://link.zhihu.com/?target=https%3A//tarides.com/blog/2024-03-20-eio-1-0-release-introducing-a-new-effects-based-i-o-library-for-ocaml/).

  

- [[BLOG] The Flambda2 Snippets, by OCamlPro](https://link.zhihu.com/?target=https%3A//discuss.ocaml.org/t/blog-the-flambda2-snippets-by-ocamlpro/14331).

  

- [The Flambda2 Snippets, Episode 0](https://link.zhihu.com/?target=https%3A//ocamlpro.com/blog/2024_03_18_the_flambda2_snippets_0/).

  

- [CPS Representation and Foundational Design Decisions in Flambda2](https://link.zhihu.com/?target=https%3A//ocamlpro.com/blog/2024_03_19_the_flambda2_snippets_1/).

  

- [Monadic Library for Eio Capabilities?](https://link.zhihu.com/?target=https%3A//discuss.ocaml.org/t/monadic-library-for-eio-capabilities/14202)

  

- [Is there any consensus on which type to unify on for errors in result types? What's your preference?](https://link.zhihu.com/?target=https%3A//discuss.ocaml.org/t/is-there-any-consensus-on-which-type-to-unify-on-for-errors-in-result-types-whats-your-preference/14304)

  

- [Create opam switch specifying custom C compiler](https://link.zhihu.com/?target=https%3A//discuss.ocaml.org/t/create-opam-switch-specifying-custom-c-compiler/14276).

## 视频

- [Outreachy Presentations for the December 2023 Round](https://link.zhihu.com/?target=https%3A//watch.ocaml.org/w/b7sv1LQSVZQH6trf4xpwFX).

  

- [Taking Erlang to OCaml 5 (with Leandro Ostera)](https://link.zhihu.com/?target=https%3A//www.youtube.com/watch%3Fv%3DIxQ586TS8Gw).

  

- [OCaml Unboxed: An Exploration of Jane Street's Experiments with OCaml](https://link.zhihu.com/?target=https%3A//www.youtube.com/watch%3Fv%3DLwD3GxsY-pc).

  

- [OCaml for Fun & Profit: An Experience Report • Tim McGilchrist • YOW! 2023](https://link.zhihu.com/?target=https%3A//www.youtube.com/watch%3Fv%3DTxuLrsQZprE).

## 值得注意的项目

- [Eio 1.0: Effects-based direct-style IO for multicore OCaml](https://link.zhihu.com/?target=https%3A//github.com/ocaml-multicore/eio/releases/tag/v1.0).

- [icfp-2023-eio-tutorial: This tutorial covers how to convert an OCaml 4 program using Lwt for concurrency to use OCaml 5 and Eio.](https://link.zhihu.com/?target=https%3A//github.com/ocaml-multicore/icfp-2023-eio-tutorial)

  

- [Down: An unintrusive user experience upgrade for the OCaml toplevel system (REPL).](https://link.zhihu.com/?target=https%3A//erratique.ch/software/down)

  

- [ocaml-rs: OCaml extensions in Rust](https://link.zhihu.com/?target=https%3A//github.com/zshipko/ocaml-rs).

  

- [eio-trace: Trace visualisation tool for Eio programs](https://link.zhihu.com/?target=https%3A//github.com/ocaml-multicore/eio-trace).

  

- [[ANN] DkCoder 0.1.0: A transparently installed OCaml 4.14 environment with one API: run a script.](https://link.zhihu.com/?target=https%3A//discuss.ocaml.org/t/ann-dkcoder-0-1-0/14327)

  

- [[ANN] Docfd 3.0.0: TUI multiline fuzzy document finder](https://link.zhihu.com/?target=https%3A//github.com/darrenldl/docfd/releases/tag/3.0.0).

  

- [[ANN] Ocaml-windows 5.1.1](https://link.zhihu.com/?target=https%3A//discuss.ocaml.org/t/ann-ocaml-windows-5-1-1/14268).

- 这里指的是 [opam-cross-windows](https://link.zhihu.com/?target=https%3A//github.com/ocaml-cross/opam-cross-windows) 支持 5.1.1 了，不是 Windows 支持。

  

- [[ANN] Bindings to QuickJS](https://link.zhihu.com/?target=https%3A//github.com/ml-in-barcelona/quickjs.ml).

  

- [[ANN] ppx_minidebug 1.3.0: toward a logging framework](https://link.zhihu.com/?target=https%3A//github.com/lukstafi/ppx_minidebug).

  

- [[ANN] iostream 0.2](https://link.zhihu.com/?target=https%3A//github.com/c-cube/ocaml-iostream/releases/tag/v0.2).

  

- [[ANN] Js_of_ocaml 5.7](https://link.zhihu.com/?target=https%3A//github.com/ocsigen/js_of_ocaml/releases/tag/5.7.1).

## 有趣的项目

- [ocaml-lua: Lua bindings for OCaml](https://link.zhihu.com/?target=https%3A//github.com/pdonadeo/ocaml-lua).

  

- [csml: High-level bindings between .Net and OCaml](https://link.zhihu.com/?target=https%3A//github.com/LexiFi/csml).

  

- [landmarks: A Simple Profiling Library for OCaml](https://link.zhihu.com/?target=https%3A//github.com/LexiFi/landmarks).

  

- [Ttweetnacl: An OCaml module providing thin bindings to the TweetNaCl cryptographic library.](https://link.zhihu.com/?target=https%3A//erratique.ch/software/ttweetnacl)

  

- [cryptokit: A library of cryptographic primitives (ciphers, hashes, etc) for OCaml](https://link.zhihu.com/?target=https%3A//github.com/xavierleroy/cryptokit).

  

- [llama: A library for building software-defined modular synthesizers in a declarative style.](https://link.zhihu.com/?target=https%3A//github.com/gridbugs/llama)