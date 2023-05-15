---
title: OCaml News 2023/5/9
date: 2023-05-09
tags: [OCaml, Technique]
---

# 二〇二三年五月六日 - 二〇二三年五月九日

## 在Eio中不使用Unix和Sys模块实现所有I/O和文件系统操作？

> EIO: [Effects-based direct-style IO for multicore OCaml](https://github.com/ocaml-multicore/eio)

例如`Sys.is_directory`， `Sys.file_exists`，`Sys.is_regular_file`这些函数在Eio中并没有相关的实现， 因为Eio目前还缺少很多文件操作的实现： [Add missing file operations #510](https://github.com/ocaml-multicore/eio/issues/510)。

但退一步，如果需要，可以用 `Eio_unix.run_in_systhread`来运行Unix的相关操作从而不阻塞Eio线程。

关于执行外部命令， 例如`Sys.command`或`Unix.create_process`函数， 在Eio中可以通过`Eio.Process`模块实现，例如:
```ocaml
# Eio_main.run @@ fun env ->
  let proc_mgr = Eio.Stdenv.process_mgr env in
  Eio.Process.run proc_mgr ["echo"; "hello"];;
hello
- : unit = ()
```

相关文档: [https://github.com/ocaml-multicore/eio#running-processes](https://github.com/ocaml-multicore/eio#running-processes)

论坛原帖：[https://discuss.ocaml.org/t/what-are-equivalent-to-some-sys-functions-in-eio-and-other-eio-questions/12126](https://discuss.ocaml.org/t/what-are-equivalent-to-some-sys-functions-in-eio-and-other-eio-questions/12126)

## 为一个现有的Dune项目生成最小的mli文件

> Reanalyze: [Experimental analyses for ReScript and OCaml: globally dead values/types, exception analysis, and termination analysis.](https://github.com/rescript-association/reanalyze)

reanalyze可以分析项目中的dead code, 它并不能直接实现这个需求， 但可能可以利用这些信息对实施相关分析提供一个良好的起点。

论坛原帖: [https://discuss.ocaml.org/t/how-to-create-the-minimal-mli-files-using-dune/12115](https://discuss.ocaml.org/t/how-to-create-the-minimal-mli-files-using-dune/12115)

## 自动派生枚举转换函数

主要想实现的是自动生成如下代码中的 `_foo` 和 `_bar` 函数。 也就是将具有无参数constructors的variant视为enum，并为每个constructor映射一个整数值:

```ocaml
type my_enum = A | B | C | D | E

let _foo (x : my_enum) : int =
  match x with
  | A -> 0
  | B -> 1
  | C -> 2
  | D -> 3
  | E -> 4

let _bar (n : int) : my_enum =
  match n with
  | 0 -> A
  | 1 -> B
  | 2 -> C
  | 3 -> D
  | 4 -> E
  | _ -> failwith "not handled"
```

`ppx_deriving`有enum deriver， 可以实现,例如

```ocaml
# type insn = Const | Push | Pop | Add [@@deriving enum];;
type insn = Const | Push | Pop | Add
val insn_to_enum : insn -> int = <fun>
val insn_of_enum : int -> insn option = <fun>
val min_insn : int = 0
val max_insn : int = 3
# insn_to_enum Pop;;
- : int = 2
# insn_of_enum 3;;
- : insn option = Some Add
```

相关文档: [https://github.com/ocaml-ppx/ppx_deriving#plugin-enum](https://github.com/ocaml-ppx/ppx_deriving#plugin-enum)

论坛原帖: [https://discuss.ocaml.org/t/auto-derive-enum-conversions/12119](https://discuss.ocaml.org/t/auto-derive-enum-conversions/12119)

## 在Linux上编译OCaml程序， 在FreeBSD上跑

> 以Linux和FreeBSD都在x86-64架构上运行为例

如果程序是纯OCaml（没有C bindings之类的），那么只要目标系统中有OCaml解释器(ocamlrun)， ocamlc生成的字节码就可以运行， 如果不是的话...

从Linux x86-64到FreeBSD x86-64从表面上看似乎没有太大的困难。 如果知道怎么配置Linux到FreeBSD的交叉编译器（最好使用clang和FreeBSD sysroot），并且愿意维护交叉编译器,
可以联系[jbeckford](https://discuss.ocaml.org/u/jbeckford)，他愿意合作将其添加到`dkml-base-compiler.4.14.x`中。

相关阅读: [Linux的二进制兼容性](https://docs.freebsd.org/en/books/handbook/linuxemu/)

论坛原帖: [https://discuss.ocaml.org/t/how-to-compile-ocaml-program-on-linux-for-running-on-freebsd/12110](https://discuss.ocaml.org/t/how-to-compile-ocaml-program-on-linux-for-running-on-freebsd/12110)

## OCaml的速度竞赛

> speed-comparison: [A repo which compares the speed of different programming languages](https://github.com/niklas-heer/speed-comparison)

这里用OCaml实现了莱布尼茨算法用于计算圆周率:
```ocaml
(* ocamlopt -O2 -o leibniz leibniz.ml && strip leibniz *)

let rec calc sum curr upto =
  if curr >= upto then sum
  else calc (sum +. 1. /. float_of_int curr) (curr + 4) upto

let calc rounds =
  let double = rounds * 2 in
  calc 0. (1 - double) (double + 1)

let () =
  let rounds_txt = open_in_bin "rounds.txt" in
  let rounds = int_of_string (input_line rounds_txt) in
  close_in rounds_txt;

  let pi = 4. *. calc rounds in
  Printf.printf "%.16f\n" pi
```

但性能:
```ocaml
$ time ./leibniz
3.1415926435899633
./leibniz  0.38s user 0.00s system 99% cpu 0.388 total
```

比Go版本:
```Golang
time ./leibniz_go
3.141592663589326
./leibniz_go  0.13s user 0.01s system 95% cpu 0.142 total
```

慢了很多， 这是因为从生成的[汇编代码](https://godbolt.org/z/xWrTxa3ov)来看， OCaml编译器无法在递归调用中unbox浮点数用于返回值。而命令式版本：
```ocaml
let calc rounds =
  let sum = ref 0. in
  let curr = ref (1 - rounds * 2) in
  for _ = 0 to rounds - 1 do
    sum := !sum +. 1. /. float_of_int !curr;
    curr := !curr + 4;
  done;
  !sum

let () =
  let rounds_txt = open_in_bin "rounds.txt" in
  let rounds = int_of_string (input_line rounds_txt) in
  close_in rounds_txt;

  let pi = 4. *. calc rounds in
  Printf.printf "%.16f\n" pi
```
的性能将会好得多([对应的汇编](https://godbolt.org/z/sW46nh1GK))

所以为了使数字运算的OCaml代码运行得更快，应该避免递归调用（这会抑制unbox浮点值）。

论坛原帖：[https://discuss.ocaml.org/t/ocaml-speed-comparison-calculating-pi-with-leibniz-optimize/12112](https://discuss.ocaml.org/t/ocaml-speed-comparison-calculating-pi-with-leibniz-optimize/12112)

---

## 一些库

-  OCaml PPX deriver for reflection : [https://github.com/thierry-martinez/refl](https://github.com/thierry-martinez/refl)
-  LexiFi runtime types : [https://github.com/LexiFi/lrt](https://github.com/LexiFi/lrt)
-  Auto generation of idiomatic bindings between Reason and JavaScript: either vanilla or typed with TypeScript/FlowType : [https://github.com/rescript-association/genType](https://github.com/rescript-association/genType)