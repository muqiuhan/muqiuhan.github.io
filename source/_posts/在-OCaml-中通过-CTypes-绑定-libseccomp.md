---
title: 在 OCaml 中通过 CTypes 绑定 libseccomp
date: 2026-03-22 23:13:33
tags: [Technique]
---

CTypes 允许我们用纯 OCaml 代码绑定 C lib 而不用编写任何 C 代码。这篇文章是以 [bonding](https://github.com/muqiuhan/bonding) 项目中的 `libseccomp` 绑定为例写的。

CTypes 的核心概念是建立 OCaml 类型与 C 类型的双向映射，ctypes 中有如下基本类型：

```ocaml
open Ctypes

(* C 类型与 OCaml 类型的对应关系 *)
let c_int : int typ = int                    (* int *)
let c_uint : Unsigned.UInt.t typ = uint      (* unsigned int *)
let c_long : Signed.Long.t typ = long        (* long *)
let c_int64 : Unsigned.UInt64.t typ = uint64_t  (* int64_t / uint64_t *)
let c_float : float typ = float              (* float *)
let c_double : float typ = double            (* double *)
let c_char : char typ = char                 (* char *)
let c_void : unit typ = void                 (* void *)
```

## 指针

对于 C 的指针，CTypes 提供了多种指针表示：

```ocaml
(* 通用指针：void* *)
let void_ptr : unit ptr typ = ptr void

(* 类型化指针：int* *)
let int_ptr : int ptr typ = ptr int

(* 不透明指针：用于表示我们不知道内部结构的 C 结构体 *)
let scmp_filter_ctx : unit ptr typ = ptr void
```

bonding 中的 seccomp_stubs.ml 中是这么写的：

```ocaml
type scmp_filter_ctx = unit ptr
let scmp_filter_ctx : scmp_filter_ctx typ = ptr void
```

这里 `scmp_filter_ctx` 是 libseccomp 的核心类型，它是一个不透明指针。C 库不暴露其内部结构，我们只能通过库函数操作它。使用 `ptr void` 是表示不透明指针的标准做法。

## 结构体 

对于结构体，ctypes 通过 `structure` 和 `field` 函数定义:

```ocaml
(* 定义 C 结构体：
   struct scmp_arg_cmp {
     unsigned int arg;
     unsigned int op;
     uint64_t datum_a;
     uint64_t datum_b;
   };
*)

let scmp_arg_cmp : unit structure typ =
  let s = structure "scmp_arg_cmp" in         (* 1. 创建结构体模板 *)
  let _arg = field s "arg" uint in            (* 2. 添加字段 *)
  let _op = field s "op" uint in
  let _datum_a = field s "datum_a" uint64_t in
  let _datum_b = field s "datum_b" uint64_t in
  seal s;                                      (* 3. 封印结构体 *)
  s                                            (* 4. 返回类型描述符 *)
```

注意：

- `structure "name"` 创建一个未完成的类型描述符
- `field s "fieldname" typ` 添加字段，返回字段访问器
- `seal s` 完成结构体定义，之后不可再添加字段
- 返回的 `s` 可以作为类型使用

例如：

```ocaml
let scmp_arg_cmp : unit structure typ =
  let s = structure "scmp_arg_cmp" in
  let _arg = field s "arg" uint in
  let _op = field s "op" uint in
  let _datum_a = field s "datum_a" uint64_t in
  let _datum_b = field s "datum_b" uint64_t in
  seal s;
  s
```

定义结构体后，可以通过字段访问器读写值：

```ocaml
(* 写入字段值 *)
let set_arg_cmp_values struct_ptr arg_val op_val datum_a_val datum_b_val =
  let s = structure "scmp_arg_cmp" in
  let arg = field s "arg" uint in
  let op = field s "op" uint in
  let datum_a = field s "datum_a" uint64_t in
  let datum_b = field s "datum_b" uint64_t in
  seal s;
  
  (* 使用 setf 设置字段值 *)
  setf struct_ptr arg (Unsigned.UInt.of_int arg_val);
  setf struct_ptr op (Unsigned.UInt.of_int op_val);
  setf struct_ptr datum_a (Unsigned.UInt64.of_int64 datum_a_val);
  setf struct_ptr datum_b (Unsigned.UInt64.of_int64 datum_b_val)
```

这里展示了如何创建辅助函数来操作结构体。注意：
- 每次都需要重新定义结构体和字段访问器
- `setf` 的参数顺序：结构体指针、字段访问器、值
- OCaml 的无符号类型需要显式转换

## 动态库

使用 CTypes 绑定 C 库只需要：加载库、然后绑定函数。

首先，加载共享库：

```ocaml
let libseccomp =
  let paths = [ "libseccomp.so.2"; "libseccomp.so.1"; "libseccomp.so" ] in
  let rec try_paths = function
    | [] ->
      Dl.dlopen ~filename:"libseccomp.so.2" ~flags:[ Dl.RTLD_NOW ]
    | path :: rest -> (
      try Dl.dlopen ~filename:path ~flags:[ Dl.RTLD_NOW ] with
      | _ ->
        try_paths rest)
  in
  try_paths paths
```

这段代码用了一个提升动态库加载稳定性的小技巧：

- 尝试多个可能的库文件名（不同系统可能版本不同）
- 依次尝试，直到成功
- 如果全部失败，使用默认路径（触发异常）

注意 `Dl.dlopen` 的参数：
- `filename`: 库文件名（可以是绝对路径或库文件名）
- `flags`: 加载标志
  - `RTLD_NOW`: 立即解析所有符号
  - `RTLD_LAZY`: 延迟解析符号

加载完成后使用 `Foreign.foreign` 绑定到函数，基本语法：

```ocaml
let function_name = 
  Foreign.foreign
    ~from:library
    "c_function_name"
    (arg1_type @-> arg2_type @-> ... @-> returning return_type)
```

单参数函数：

```ocaml
let seccomp_init =
  Foreign.foreign
    ~from:libseccomp
    "seccomp_init"
    (uint32_t @-> returning scmp_filter_ctx)
```

对应的 C 函数原型：

```c
scmp_filter_ctx seccomp_init(uint32_t def_action);
```

`Foreign.foreign` 的参数：
- `~from:libseccomp`: 指定函数所在的库
- `"seccomp_init"`: C 函数名
- `uint32_t @-> returning scmp_filter_ctx`: 函数签名
  - `@->` 分隔参数
  - `returning` 标记返回类型

对于多参数函数：

```ocaml
let seccomp_rule_add =
  Foreign.foreign
    ~from:libseccomp
    "seccomp_rule_add"
    (scmp_filter_ctx @-> uint32_t @-> int @-> uint @-> returning int)
```

**C 函数原型**：
```c
int seccomp_rule_add(scmp_filter_ctx ctx, uint32_t action, 
                      int syscall, unsigned int arg_cnt);
```

对于无参数函数：

```ocaml
let seccomp_arch_native =
  Foreign.foreign 
    ~from:libseccomp 
    "seccomp_arch_native" 
    (void @-> returning uint32_t)
```

对于指针参数：

```ocaml
let seccomp_load =
  Foreign.foreign 
    ~from:libseccomp 
    "seccomp_load" 
    (scmp_filter_ctx @-> returning int)
```

**C 函数原型**：
```c
int seccomp_load(scmp_filter_ctx ctx);
```

对于字符串参数：

```ocaml
let seccomp_syscall_resolve_name =
  Foreign.foreign
    ~from:libseccomp
    "seccomp_syscall_resolve_name"
    (string @-> returning int)
```

这里 CTypes 会自动处理 OCaml 字符串与 C 字符串的转换。

对于返回 NULL 的情况：

```ocaml
let seccomp_syscall_resolve_num_arch =
  Foreign.foreign
    ~from:libseccomp
    "seccomp_syscall_resolve_num_arch"
    (uint32_t @-> int @-> returning string_opt)
```

`string_opt` 处理可能返回 NULL 的字符串指针。

## 内存管理

C 需要手动管理内存，CTypes 提供了相应的工具。

分配单个值：

```ocaml
(* 分配并初始化单个值 *)
let ptr = allocate int 42

(* 读取值 *)
let value = !@ ptr

(* 写入值 *)
ptr <-@ 100
```

分配数组：

```ocaml
(* 分配数组（未初始化） *)
let arr = allocate_n int ~count:10

(* 分配并初始化数组 *)
let arr = allocate_n int ~count:5 ~initial:0
```

例如：

```ocaml
let cmp_array = Ctypes.allocate_n Stubs.Types.scmp_arg_cmp ~count:n in
```

### 指针算术

```ocaml
let arr = allocate_n int ~count:10

(* 访问第 i 个元素 *)
let elem_ptr = arr +@ i

(* 读写元素 *)
let value = !@ elem_ptr
elem_ptr <-@ 42
```

例如：

```ocaml
Stubs.Types.set_arg_cmp_values
  !@(cmp_array +@ i)  (* 第 i 个结构体的指针 *)
  cmp.arg
  (cmp_op_to_int cmp.op)
  cmp.datum_a
  cmp.datum_b
```

`!@` 运算符解引用指针，`+@` 进行指针算术。

### 指针转换

```ocaml
(* 类型化指针转 void 指针 *)
let void_p = to_voidp int_ptr

(* void 指针转类型化指针 *)
let int_p = from_voidp int void_p

(* 获取空指针 *)
let null_ptr : unit ptr = null

(* 检查是否为空指针 *)
if is_null ptr then ...
```

**实例解析（seccomp.ml:96）**：

```ocaml
if Ctypes.ptr_compare ctx Ctypes.null = 0 then
  Error Init_failed
```

检查 `seccomp_init` 是否返回了 NULL（失败）。

## 一些模式

### 类型视图（Type Views）

当 C 类型与 OCaml 类型不能直接对应时，使用 `view` 创建自定义转换：

```ocaml
(* 将 C int 转换为 OCaml bool *)
let c_bool = view
  ~read:(fun i -> i <> 0)
  ~write:(fun b -> if b then 1 else 0)
  int
```

### 枚举类型映射

在 seccomp 实现中，使用 OCaml 变体和转换函数映射 C 枚举：

```ocaml
(* OCaml 端的类型定义（seccomp.ml:18-25） *)
type action =
  | Allow
  | Errno of int
  | KillProcess
  | KillThread
  | Log
  | Trace of int
  | Trap

(* C 端的常量定义（seccomp_stubs.ml:58-73） *)
module Constants = struct
  let scmp_act_allow = 0x7fff0000l
  let scmp_act_kill_thread = 0x00000000l
  let scmp_act_kill_process = 0x00000000l
  let scmp_act_trap = 0x00030000l
  let scmp_act_log = 0x7ffc0000l
  let scmp_act_errno code = 
    Int32.(logor 0x00050000l (logand (of_int code) 0x0000ffffl))
end

(* 转换函数（seccomp.ml:60-75） *)
let action_to_uint32 = function
  | Allow -> int32_to_uint32 Stubs.Constants.scmp_act_allow
  | KillThread -> int32_to_uint32 Stubs.Constants.scmp_act_kill_thread
  | KillProcess -> int32_to_uint32 Stubs.Constants.scmp_act_kill_process
  | Trap -> int32_to_uint32 Stubs.Constants.scmp_act_trap
  | Log -> int32_to_uint32 Stubs.Constants.scmp_act_log
  | Errno code -> int32_to_uint32 (Stubs.Constants.scmp_act_errno code)
  | Trace code -> int32_to_uint32 (Stubs.Constants.scmp_act_trace code)
```

这种模式的优势：

- OCaml 端使用类型安全的变体
- C 端使用整数常量
- 转换函数处理映射
- 编译器帮助捕获类型错误

### 错误处理模式

C 那边通常用返回值表示错误。OCaml 使用 result 类型，例如在 seccomp 的 binding 中我这么做：

```ocaml
type error =
  | Init_failed
  | Rule_add_failed of int
  | Load_failed of int
  | Unknown_syscall of string

let init default_action =
  let ctx = Stubs.Functions.seccomp_init (action_to_uint32 default_action) in
  if Ctypes.ptr_compare ctx Ctypes.null = 0 then
    Error Init_failed
  else
    Ok ctx
```

## 完整示例

让我们来看看一个完整的 `rule_add_conditional` 函数的实现：

```ocaml
let rule_add_conditional ctx action syscall cmps =
  let n = Array.length cmps in
  if n = 0 then
    rule_add ctx action syscall
  else (
    (* 1. 分配 C 数组 *)
    let cmp_array = Ctypes.allocate_n Stubs.Types.scmp_arg_cmp ~count:n in
    
    (* 2. 填充每个结构体 *)
    Array.iteri
      (fun i cmp ->
         Stubs.Types.set_arg_cmp_values
           !@(cmp_array +@ i)  (* 解引用第 i 个元素 *)
           cmp.arg
           (cmp_op_to_int cmp.op)
           cmp.datum_a
           cmp.datum_b)
      cmps;
    
    (* 3. 调用 C 函数 *)
    let result =
      Stubs.Functions.seccomp_rule_add_array
        ctx
        (action_to_uint32 action)
        syscall
        (Unsigned.UInt.of_int n)
        cmp_array
    in
    
    (* 4. 检查结果 *)
    if result < 0 then
      Error (Rule_add_failed result)
    else
      Ok ()
  )
```

- 数组分配: `allocate_n` 分配 `n` 个 `scmp_arg_cmp` 结构体的空间
- 结构体填充: 
   - `cmp_array +@ i` 获取第 i 个元素的指针
   - `!@` 解引用得到结构体
   - `set_arg_cmp_values` 填充字段
- 函数调用: 传递数组和长度给 C 函数
- 返回值: C 函数返回负值表示错误

对应的 C API：
```c
int seccomp_rule_add_array(scmp_filter_ctx ctx, uint32_t action,
                            int syscall, unsigned int arg_cnt,
                            const struct scmp_arg_cmp *arg_array);
```

### 双层架构 Binding

seccomp 绑定用了清晰的三层架构：
- seccomp.ml / seccomp.mli 是顶层 API 纯粹的OCaml 风格的类型和函数
- seccomp_stubs.ml 绑定层，放 CTypes 绑定，类型和函数定义

### 模块组织

```ocaml
(* seccomp_stubs.ml 的模块组织 *)

module Types = struct        (* C 类型定义 *)
  type scmp_filter_ctx = unit Ctypes.ptr
  val scmp_filter_ctx : ...
  val scmp_arg_cmp : ...
end

module Constants = struct    (* C 常量 *)
  let scmp_act_allow = ...
  let scmp_cmp_ne = ...
end

module Functions = struct    (* C 函数绑定 *)
  let seccomp_init = ...
  let seccomp_load = ...
end
```

类型，常量，函数分离。


## 常见问题

### 1. 内存泄漏

C 分配的内存需要手动释放：
```ocaml
(* 始终提供 release 函数 *)
let release ctx = Stubs.Functions.seccomp_release ctx

(* 使用 Fun.protect 确保清理 *)
let with_filter default_action f =
  match init default_action with
  | Error e -> Error e
  | Ok ctx ->
    try
      let result = f ctx in
      release ctx;
      result
    with e ->
      release ctx;
      raise e
```

### 2. 类型不匹配

OCaml 和 C 的类型表示不同：
```ocaml
(* 使用 Unsigned 模块的转换函数 *)
let int32_to_uint32 n = Unsigned.UInt32.of_int32 n

(* 显式类型转换 *)
let c_uint = Unsigned.UInt.of_int 42
```

### 3. 空指针检查

C 函数可能返回 NULL：
```ocaml
(* 始终检查返回的指针 *)
if Ctypes.ptr_compare ctx Ctypes.null = 0 then
  Error Init_failed
else
  Ok ctx
```

### 4. 字符串所有权

C 返回的字符串生命周期不确定：
```ocaml
(* 如果 C 返回需要释放的字符串，使用 string 并复制 *)
let result = Bytes.of_string c_string in
(* 释放 C 字符串 *)
C.free c_string_ptr;
Bytes.to_string result
```

## 调试技巧

### 1. 检查库加载

```ocaml
let () =
  try
    let _ = Dl.dlopen ~filename:"libseccomp.so.2" ~flags:[ Dl.RTLD_NOW ] in
    print_endline "Library loaded successfully"
  with
  | Dl.DL_error msg ->
    Printf.eprintf "Failed to load library: %s\n" msg
```

### 2. 检查函数绑定

```ocaml
let () =
  try
    let _ = Foreign.foreign ~from:libseccomp "seccomp_init" 
      (Ctypes.uint32_t @-> returning Ctypes.ptr Ctypes.void) in
    print_endline "Function bound successfully"
  with
  | _ ->
    print_endline "Function binding failed"
```

### 3. 检查结构体大小

```ocaml
let () =
  let s = structure "scmp_arg_cmp" in
  let _ = field s "arg" uint in
  seal s;
  Printf.printf "Struct size: %d\n" (sizeof s)
```

## 参考资源

- CTypes 官方文档: https://github.com/yallop/ocaml-ctypes
- CTypes 教程: https://github.com/yallop/ocaml-ctypes/wiki/ctypes-tutorial
- CTypes Wiki: https://github.com/yallop/ocaml-ctypes/wiki
- libseccomp 文档: https://man7.org/linux/man-pages/man3/seccomp.3.html
- bonding 项目: https://github.com/muqiuhan/bonding
