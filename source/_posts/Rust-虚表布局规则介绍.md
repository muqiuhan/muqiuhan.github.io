---
title: Rust 虚表布局规则介绍
date: 2023-05-01 11:11:40
tags: [Technique, Rust]
---

在 Rust 中，一个指向未知大小对象（!Sized）的引用或指针被实现为一个由两个 usize 大小的域构成的胖指针。这两个域中，其中一个域保存了被引用或被指向的对象的地址，另一个域保存了一个名为 metadata 的数据。对于 slice 的引用或指针来说，其 metadata 为 slice 的长度。对于 trait object 的引用或指针来说，其 metadata 为虚表（vtable）地址。与 C++ 虚表类似，Rust 虚表的存在使得诸多动态语言特性得以实现，例如动态派发（dynamic dispatch）、向上转换（upcasting）、向下转换（downcast）等。本文将对 Rust 中虚表的布局规则进行简要介绍，并在此过程中对 Rust 中若干动态特性的实现方法进行简要介绍。

>注意：Rust 虚表及其结构属于 Rust 语言的内部实现细节，不保证稳定性。本文所介绍的虚表布局仅反映本文创作时最新的 Rust 虚表结构[1]，在将来 Rust 虚表结构可能会发生变化。一个 Rust 程序的正确性不应该以任何方式依赖于 Rust 虚表的结构。

## 基本结构

Rust 程序中的所有虚表均以一个固定结构的 header 开头。Header 中按顺序包含三个usize 大小的字段：drop_in_place ，size 和 align 。在 header 之后是一系列的 usize 大小字段，其数量以及含义在每个虚表中可能都不同。

```
+---------------+
| drop_in_place |
+---------------+
| size          |
+---------------+
| align         |
+---------------+
| entry1        |
+---------------+
| entry2        |
+---------------+
| entry3        |
+---------------+
```
虚表 header 中的drop_in_place 是一个函数指针，其指向的函数能够原地 drop 当前胖指针所引用的对象。size 和 align 两个域分别给出对象的大小和内存对齐，这两个域共同构成一个 std::alloc::Layout 结构，可用于释放当前胖指针所引用的对象所占据的内存。虚表 header 的存在使得 trait object 总是能被销毁和释放。例如当销毁一个 `Box<dyn Trait>` 时，`Box::<dyn Trait>::drop` 会首先调用虚表中的 drop_in_place 函数原地销毁 Box 所引用的对象，然后再调用 dealloc 函数并传递虚表中的 size 和 align 释放堆空间。

在虚表 header 之后是一系列的字段。在最普遍的情况下，每个字段代表一个指向 trait 所定义的函数的指针。例如，对于下列 object safe 的 trait:

```rust
pub trait Trait {
    fn fun1(&self);
    fn fun2(&self);
    fn fun3(&self);
}
```

如果类型T 实现了 Trait，那么为 T 生成的 Trait 虚表的结构为：

```
+--------------------------+
| fn drop_in_place(*mut T) |
+--------------------------+
| size of T                |
+--------------------------+
| align of T               |
+--------------------------+
| fn <T as Trait>::fun1    |
+--------------------------+
| fn <T as Trait>::fun2    |
+--------------------------+
| fn <T as Trait>::fun3    |
+--------------------------+
```

Trait 中的函数按照声明顺序依次排列在虚表 header 之后。当通过一个指向 T 对象的 &dyn Trait 调用 fun2 函数时，程序会先从虚表的第 5 个域中得到为 T 实现的 Trait::fun2 函数的地址，然后再调用之。

## Super Trait

Object safe 的 trait 可以有 super trait。例如：

```
pub trait Grand {
    fn grand_fun1(&self);
    fn grand_fun2(&self);
}

pub trait Parent : Grand {
    fn parent_fun1(&self);
    fn parent_fun2(&self);
}

pub trait Trait : Parent {
    fn fun(&self);
}
```

如果类型T 实现了 Trait，那么此时为 T 生成的 Trait 虚表的结构为：

```
+-------------------------------+
| fn drop_in_place(*mut T)      |
+-------------------------------+
| size of T                     |
+-------------------------------+
| align of T                    |
+-------------------------------+
| fn <T as Grand>::grand_fun1   |
+-------------------------------+
| fn <T as Grand>::grand_fun2   |
+-------------------------------+
| fn <T as Parent>::parent_fun1 |
+-------------------------------+
| fn <T as Parent>::parent_fun2 |
+-------------------------------+
| fn <T as Trait>::fun          |
+-------------------------------+
```

可以看到，此时Trait 以及 Trait 的所有直接或间接父 trait 所定义的所有函数均包含在虚表 header 之后，且顺序为后序（即先排布 Trait 的父 trait 所定义的所有函数，最后再排布 Trait 所定义的所有函数）。这样的排布方式使得在得到 T 类型的 Trait 虚表的同时也同时得到了 T 类型的 Parent 虚表和 Grand 虚表。T 类型的 Grand 虚表恰好由 Trait 虚表的前五个域构成，T 类型的 Parent 虚表恰好由 Trait 虚表的前七项构成。这使得向上转换变得非常简单。

所谓向上转换，即 Rust 允许将&dyn Trait 转换为 &dyn Parent 或 &dyn Grand 。在向上转换的过程中，胖指针的对象地址域保持不变，但 metadata 域可能需要进行调整，因为不同的 trait 可能具有不同的虚表地址。但在当前示例中，向上转换不需要调整 metadata 域，因为一个指向 Trait 虚表的指针同时也指向 Parent 虚表和 Grand 虚表。在后文中我们会进一步介绍需要调整 metadata 域的向上转换的情况。

> 注意：目前 stable Rust 暂不支持向上转换。要使用向上转换特性，必须使用 nightly 工具链，并向源文件中添加 #![feature(trait_upcasting)] 特性开关。

## 多重继承
Trait 可以有多个 super trait。例如：
```
pub trait Base {
    fn base_fun1(&self);
    fn base_fun2(&self);
}

pub trait Left : Base {
    fn left_fun1(&self);
    fn left_fun2(&self);
}

pub trait Right : Base {
    fn right_fun1(&self);
    fn right_fun2(&self);
}

pub trait Trait : Left + Right {
    fn fun(&self);
}
```

如果类型T 实现了 Trait，那么此时为 T 生成的 Trait 虚表的结构为：

```
+-----------------------------+
| fn drop_in_place(*mut T)    |
+-----------------------------+
| size of T                   |
+-----------------------------+
| align of T                  |
+-----------------------------+
| fn <T as Base>::base_fun1   |
+-----------------------------+
| fn <T as Base>::base_fun2   |
+-----------------------------+
| fn <T as Left>::left_fun1   |
+-----------------------------+
| fn <T as Left>::left_fun2   |
+-----------------------------+
| fn <T as Right>::right_fun1 |
+-----------------------------+
| fn <T as Right>::right_fun2 |
+-----------------------------+
| ptr to <T as Right>::vtable |
+-----------------------------+
| fn <T as Trait>::fun        |
+-----------------------------+
```

可以看到，此时Trait 及其所有直接或间接父 trait 所定义的所有函数仍然包含在虚表内，因此通过 &dyn Trait 调用的函数仍然可以直接从虚表内得到其实际目标函数的地址。另外，Trait 虚表内仍然包含有效的 Base 虚表和 Left 虚表。因此，将 &dyn Trait 向上转换为 &dyn Left 或 &dyn Base 仍然是极其简单的，不需要调整胖指针的 metadata 域。但是，将 &dyn Trait 向上转换为 &dyn Right 就需要调整 metadata 域了，因为 Trait 虚表内并不包含一个有效的 Right 虚表。这也是 Trait 虚表中 ptr to `<T as Right>::vtable` 域的作用：在执行向上转换时，程序会读取 Trait 虚表的这个域作为得到的 &dyn Right 胖指针的 metadata 。这也是 *Rust 向上转换与 C++ 向上转换的一个很大不同：在 C++ 中的向上转换通常并不需要访问虚表（除非需要执行跨虚继承边界的转换），但在 Rust 中向上转换可能需要访问虚表。*

更加一般地，对于一个 object safe 的 traitTr，将其第一个父 trait、第一个父 trait 的第一个父 trait、…… 这一系列直接或间接父 trait 记为这个 trait 的 PrefixTrait 集合。在将 &dyn Tr 向上转换时，如果转换到的目标 trait 包含在 PrefixTrait 集合内，那么这个向上转换是平凡的：不需要调整胖指针的 metadata 域。否则，这个向上转换需要在 Tr 的虚表内读取目标 trait 的虚表指针作为转换结果的 metadata 。在 Tr 的虚表结构中，位于 PrefixTrait 集合中的父 trait 只需要排布他们所定义的函数即可；对于其他父 trait 还需要额外在虚表内排布一个指向其虚表的指针用于向上转换。

## 向下转换
Rust 提供了一个特殊的 trait：std::any::Any 。该 trait 支持向下转换，即可以将 &dyn Any 转换为 T 。转换过程中会对胖指针所指向的对象的实际类型进行检查，确认其确实是一个 T 类型的对象。Any trait 的虚表结构有一些特殊；在虚表 header 之后，Any 虚表仅包含一个域，这个域直接给出胖指针指向的对象的类型标识（由一个 std::any::TypeId 类型的值表示）。例如，对于任意的 T: 'static，编译器为其生成的 Any 虚表为：

```
+--------------------------+
| fn drop_in_place(*mut T) |
+--------------------------+
| size of T                |
+--------------------------+
| align of T               |
+--------------------------+
| TypeId of T              |
+--------------------------+
```
在执行向下转换时，程序首先检查转换到的类型是否与虚表中给出的TypeId 所标识的类型一致。若类型检查通过，向下转换操作可以直接返回胖指针中的指针域作为转换结果。

### REFERENCE

1. Vtable format to support dyn upcasting coercion https://rust-lang.github.io/dyn-upcasting-coercion-initiative/design-discussions/vtable-layout.*html*