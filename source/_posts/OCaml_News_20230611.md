---
title: OCaml News 2023/6/11
date: 2023-06-11
tags: [OCaml, Technique]
---

# 二〇二三年五月三十一日 - 二〇二三年六月十一日

## Lambda演算中的可计算性极限

OCaml 的用户可能有兴趣阅读有关 lambda 演算的理论论文。

" [Limits of Computability in Lambda Calculus](https://hbr.github.io/Lambda-Calculus/computability/text.html)" 这篇论文介绍了在lambda演算中有一些函数是不可计算的。

详细讨论可以看[论坛原帖](https://discuss.ocaml.org/t/limits-of-computability-in-lambda-calculus/12295)

## OCaml 5.1.0~alpha2
随着 OCaml 5.1.0 持续稳定的工作进展，OCaml 5.1.0 的第二个 alpha 版本发布了， 这个版本修复了GC和Windows ABI的问题。
除此之外，类型系统兼容性得到增强,恢复支持 s390x/IBM Z

详细的更新可以查看 [论坛原帖](https://discuss.ocaml.org/t/second-alpha-release-of-ocaml-5-1-0/12299)

## OCaml中能否实现 constraint 不等

OCaml提供了对类型定义添加约束的方法， 即`constraint`:
```ocaml
module A = struct type t = int end
module B = struct type t = float end

(** Error: This type constructor expands to type t but is used here with type float *)
type t = A.t constraint t = B.t
```

能否实现判断两个类型是不兼容的呢？ 比如: `type t = A.t constraint t <> B.t`。

类型相关的理论在学了在学了呜呜,目前来看这不是个好的做法...，详细可以看[论坛原帖](https://discuss.ocaml.org/t/type-inequality-constraints/12364#main-container)

## 在OCaml5的并行程序中使用全局哈希表是否安全？

这里指的应该是 `Stdlib.Hashtbl`。

只能安全一点点，因为对哈希表访问没有同步,所以只是内存安全而不是线程安全。
文档指出，对哈希表的不同步访问是程序员的锅，要么使用锁保护表，要么用并发哈希表的不同实现。
在表没有涉及大小调整操作的情况下，共享哈希表是安全的。在调整大小的情况下，添加/删除可能会与任何其他操作产生冲突。

[查看论坛原帖](https://discuss.ocaml.org/t/is-it-safe-to-use-a-global-hash-table-in-an-ocaml-5-parallel-program/11144/1)

## 谈谈你心目中理想ML的样子吧！

- Haskell的类型系统和简洁 
- OCaml的模块系统和对象系统
- Rust的low level内存控制和借用以及并发检查
- Lisp的宏系统和REPL
- JetBrains相关IDE支持
- 和x86_64汇编一样的编译速度

有种许愿的美，🙏

[查看论坛上其他愿望](https://discuss.ocaml.org/t/whats-your-laundry-list-of-features-for-an-ideal-ml/10217/5)

## OOP Visitors在Polymorphic情况下的类型错误

像Java里面:
```java
interface Tree {
  public <B> B accept(TreeVisitor<B> v);
}

interface TreeVisitor<B> {
  public B visitLeaf(Leaf t);
}

class Leaf implements Tree {
  public final int value;

  public Leaf(int value) {
    this.value = value;
  }

  public <B> B accept(TreeVisitor<B> v) {
    return v.visitLeaf(this);
  }
}
```

要是直接翻译成OCaml:
```ocaml
class virtual tree =
  object
    method virtual accept : 'a . 'a tree_visitor -> 'a
  end

and virtual ['a] tree_visitor =
  object
    method virtual visit_leaf : (leaf -> 'a)
  end

and leaf (i : int) =
  object (self)
    method get = i

    method accept (v : 'a tree_visitor) : 'a =
      v#visit_leaf (self :> leaf)
  end
```

是会报错滴:
```
File "visitor.ml", line 3, characters 28-54:
3 |     method virtual accept : 'a . 'a tree_visitor -> 'a
                                ^^^^^^^^^^^^^^^^^^^^^^^^^^
Error: The universal type variable 'a cannot be generalized:
       it escapes its scope.
```

OCaml的类在定义时是单态的，比如:
```ocaml
class ['a] c (x:'a) = 
  object
    method x = x
  end
and d = 
  object
    method strange = (new c 0)#x
  end
```

这里`c`是:
```ocaml
class ['a] c : 'a -> object constraint 'a = int method x : 'a end
```
因为在d里面 `new c 0` 定义了一个 `int c` 的对象。


所以正确的写法应该是:
```ocaml
class virtual ['a, 'leaf, 'node, 'empty] open_tree_visitor = 
  object
    method virtual visit_leaf :  'leaf -> 'a
    method virtual visit_node :  'node -> 'a
    method virtual visit_empty :  'empty -> 'a
  end

class virtual tree = 
  object
    method virtual accept : 'a .
      ('a, 'leaf, 'node, 'empty) open_tree_visitor -> 'a
  end

and leaf (i : int) = 
  object (self:'self)
    inherit tree
    method get = i
    method accept v = v#visit_leaf (self :> leaf)
  end

and node (x : tree) (y: tree) = 
  object (self:'self)
    inherit tree
    method left = x
    method right = y
    method accept v = v#visit_node (self :> node)
  end

and empty = 
  object (self:'self)
    inherit tree
    method accept v = v#visit_empty (self :> empty)
  end
```

[查看论坛原帖](https://discuss.ocaml.org/t/type-errors-in-polymorphic-oop-visitors/12357)

## 进一步约束模块的接口

> 基于dune，有一个模块`A.ml`它的接口是`A.mli`，但是当它在主模块中时，我想使用进一步约束过的的接口`A_sub.mli`，因为只有`A_Sub`的功能对用户有用。

其实在library下面声明一个和library同名的 `xxx.ml`，在里面写 `module A = struct include A end` 就可以啦，很常见的做法。

详细讨论可以[查看论坛原帖](https://discuss.ocaml.org/t/export-wrapped-modules-with-a-restricted-interface/12361)

## OCaml环不环保？

[这篇文章](https://infra.ocaml.org/2023/05/30/emissions-monitoring.html)说道，对于在 ocaml.org 集群中监测的19台机器，
每周大约产生70公斤的二氧化碳当量， 

自 ocaml.org 重新设计以来， 社区一直致力于对环境影响负责。第一步是通过计算使用的能源总量来准确量化影响，为了确定未来所做的任何改善是否能减少二氧化碳排放量。

为此，开发了一个用于获取各种碳强度API的HTTP客户端: [carbon-intensity](https://github.com/geocaml/carbon-intensity)

英国特定地区API的非常简单，使用只需要用户提供Eio的网络功能：
```ocaml
# Eio_main.run @@ fun env ->
  Mirage_crypto_rng_eio.run (module Mirage_crypto_rng.Fortuna) env @@ fun _ ->
  Carbon.Gb.get_intensity env#net
  |> Eio.traceln "%a" Carbon.Gb.Intensity.pp;;
+period: 2022-08-28T17:30Z - 2022-08-28T18:00Z
+forecast: 255 gCO2/kWh
+actual: None
+index: high
+
- : unit = ()
```

某些API需要更多配置，例如法国的需要token:
```ocaml
# Eio_main.run @@ fun env ->
  Mirage_crypto_rng_eio.run (module Mirage_crypto_rng.Fortuna) env @@ fun _ ->
  let token = Eio.Path.(load (env#fs / ".co2-token")) in
  let t = Carbon.Co2_signal.v token in
  Carbon.Co2_signal.get_intensity ~net:env#net ~country_code:`FR t
  |> Eio.traceln "%a" Carbon.Co2_signal.Intensity.pp;;
+country: FR
+datetime: 2022-08-29T11:00:00.000Z
+intensity: 99 gCO2/kWh
+fossil fuel percentage: 15.230000
- : unit = ()
```

更详细的可以看[论坛原帖](https://discuss.ocaml.org/t/initial-emissions-monitoring-of-the-ocaml-org-infrastructure/12335)， 以及论坛上[关于carbon-intensity的帖子](https://discuss.ocaml.org/t/ocaml-carbon-footprint/8580)

## float_of_int的细节

试图弄清楚 `float_of_int` 在amd64和arm64上的行为， 生成的 Cmm 大概是
```box_float (Cop(Cfloatofint (untag_int myfloat)))```

在 amd64 上，它被转换为序列:
```asm
（** untag_int *）
sarq        $1, %rax
cvtsi2sdq   %rax, %xmm0
```

而在arm64上使用scvtf实现。

[论坛原帖](https://discuss.ocaml.org/t/how-is-cfloatofint-translated/12342)

## Debugging Native Code in OCaml！

[本视频](https://www.youtube.com/watch?v=OV19_FqAUCw)适用于：
- 非 OCaml 开发人员对 OCaml 的工作原理感到好奇
- 中级 OCaml 开发人员

更多讨论可以看[论坛原帖](https://discuss.ocaml.org/t/ann-debugging-native-code-in-second-ocaml-youtube-video/12315)

## Outreachy Summer 2023

Outreachy是一项带薪远程实习计划，目的是促进开源和开放科学的多样性。Outreachy的实习是为那些在本国()技术行业面临代表性不足、歧视或系统性偏见的人提供的。

关于今年Outreachy的信息可以看这个帖子: [Outreachy Summer 2023](https://discuss.ocaml.org/t/outreachy-summer-2023/11159/2)
如果想加入，可以看: [Become an Outreachy Mentor: support the growth and diversity of the OCaml community](https://discuss.ocaml.org/t/become-an-outreachy-mentor-support-the-growth-and-diversity-of-the-ocaml-community/8213)

## 一些生态
- [OCaml-Minisat github repo](https://github.com/c-cube/ocaml-minisat/) minisat是一个小巧快速的SAT Solver， 这是其OCaml Bining
- [MPP](https://github.com/ocaml/MPP-language-blender) 兼容OCaml5咯， mpp就是meta preprocesser
- [caml2html](https://github.com/mjambon/caml2html)可以将OCaml源码文件转换成带高亮的HTML
- [containers](https://github.com/c-cube/ocaml-containers/releases/tag/v3.12) 3.12发布了
- [multicoretests](https://github.com/ocaml-multicore/multicoretests)是用于测试Multicore OCaml 的 PBT 测试套件和库