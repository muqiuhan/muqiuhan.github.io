---
title: Rust Partial 语义
date: 2024-05-13 11:12:26
tags: [Technique, Rust]
---

> 在Rust中，PartialEq和PartialOrd trait处理了不是所有值都可以相互比较的情况。

## PartialEq Trait

PartialEq trait用于定义值相等性的比较。它的设计允许类型的值之间进行相等（`==`）和不等（`!=`）的比较。与其对应的 Eq trait 确保一个类型的所有值都是可以可靠比较的，即满足等价关系的特性，如自反性、对称性和传递性。

```rust
fn eq(&self, other: &Self) -> bool;
fn ne(&self, other: &Self) -> bool;
```

在大多数情况下，类型的值都能够完全比较相等性，这时可以实现Eq。然而，对于一些特殊类型的值，如浮点数，由于存在无穷大的正负值和NaN值，导致它们的比较更加复杂。例如，根据IEEE浮点数的标准，NaN与任何值（包括它自己）比较都不相等。

## PartialOrd Trait

PartialOrd trait用于定义值之间的大小比较。类似于PartialEq，它允许部分比较大小，返回一个Option，表示比较结果可能存在，也可能不存在（即比较无法进行时返回None）:

```rust
fn partial_cmp(&self, other: &Self) -> Option<Ordering>;
```

在全部比较可能的场景，我们会使用Ord trait，它要求实现cmp方法，总是返回一个Ordering，表示两个值之间的确切比较关系。Ord是在所有值都能够比较时使用的，例如整数和字符串。

## 设计用意和解决的问题

Rust 设计 PartialEq 和 PartialOrd trait 主要出于以下几个理由：

- **非总序理念**：并不是所有类型都有一个全局的排序方法。例如，复数之间就没有一个自然的大小顺序。为了避免为这些类型人为地赋予一个排序方法，Rust 提供了一个只需部分实现序列操作的选择。
- **IEEE 浮点数标准**：由于浮点数标准定义了特殊值（NaN, 正负无穷），以及NaN不等于自身的规则，浮点数在一些情况下不能进行相等性或大小比较。
- **提升错误处理能力和安全性**：通过返回 `Option<Ordering>`，`partial_cmp` 方法明确指出了失败的可能性，从而迫使程序员在使用时考虑并处理这种情况，增加了代码的正确性和稳健性。
- **表达性和灵活性**：这些 trait 允许开发者为自定义类型定义适当的相等性和排序行为，从而加强了 Rust 类型系统的表达性和灵活性。

PartialEq 和 PartialOrd trait 的设计允许程序员选择精准的相等性和排序语义，同时明确了对于某些类型相等性比较和大小排序并不总是可能的事实。通过引入适度的复杂性，让 Rust 的类型系统更加安全。