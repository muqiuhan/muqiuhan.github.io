---
title: G-Machine
date: 2024-01-23 20:09:48
tags: Technique
---

- [The G-machine: A fast, graph-reduction evaluator](https://link.springer.com/chapter/10.1007/3-540-15975-4_50)

G-Machine 是一种通过图规约来对函数式语言程序求值的抽象架构。
与组合子规约不同，组合子规约的control是从表达式图本身动态导出的，而G-Machine是由通过编译Application表达式导出的指令序列指定的。

---

FP的程序基本上都可以用一个表达式的图表示，图计算机就是对这个图求值的机器，总的说来对图的求值是一个不停合并图上的节点生产新节点的过程。

例如：

```ocaml
let x = 2 + 3 in 
  x * x
```

先计算出5，然后创建一个新的节点 `5 * 5`，然后再对这个节点求值，于是求值过程中就产生了很多临时的节点，这些中间节点也被叫做是 spine，求值过程是沿着 spine 进行的。

但是这样就产生了很多额外的开销，lambda lifting 里提到：可以把程序里，很多捕捉了外围绑定的闭包函数中的这些绑定，转换成函数的参数，从而消除闭包，得到的这个函数就可以自由脱离作用域，被静态的编译到机器码里。这些被 float out 的函数也叫 supercombinator.

在上面的代码中，如果不创建新的节点，顺序计算完了第一个 `x`，第二个 `x` 还会再被算一遍。

Spineless reduction 的概念：只有当面临需要重复计算的情况时，才去创建节点，不然就一路顺序算下去

- [Graph reduction](https://en.wikipedia.org/wiki/Graph_reduction)
- [Graph reduction machine](https://en.wikipedia.org/wiki/Graph_reduction_machine)
- https://www.zhihu.com/question/54834531/answer/144213668