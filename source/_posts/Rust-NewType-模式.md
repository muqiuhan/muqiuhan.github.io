---
title: Rust NewType 模式
date: 2023-05-03 11:12:57
tags: [Technique]
---

New Type模式是一种软件设计模式，用于在已有类型的基础上创建一个新的类型。在Rust中，这通常是通过定义一个结构体，其中只包含一个单一成员。这个结构体（New Type）对外提供了一个新的、独立的类型，用于对原始类型增加额外的语义或限制。

## 加强类型安全

```rust
struct Meters(f64);
struct Feet(f64);

let length_in_meters = Meters(100.0);
let length_in_feet = Feet(328.084);

// 编译器会防止以下代码执行，因为类型不匹配
// let wrong_length = Meters(length_in_feet); // 编译错误

// 正确的构造
fn add_lengths(length1: Meters, length2: Meters) -> Meters {
    Meters(length1.0 + length2.0)
}
```

这个例子使用 newtype 模式避免将原始类型f64用于不同的量度，从而增强了类型的安全性。

## 实现特定 trait

```rust
struct Kilometers(f64);

impl Kilometers {
    fn to_miles(&self) -> f64 {
        self.0 * 0.621371
    }
}

let distance = Kilometers(10.0);
println!("The distance in miles is {}", distance.to_miles());
```

这里，Kilometers有一个方法to_miles，该方法是不会影响其他f64数据的。如果我们有另一个表示温度的f64类型，就不会意外调用到与距离相关的方法。

New Type模式同样适用于对`Box<dyn SomeTrait>`类型的包装，这可以在需要动态分派（动态调用实现了某个接口的不同类型的对象的方法）的时候提供便利。通过创建一个New Type来包装这样的`Box<dyn SomeTrait>`类型，可以提供自定义的方法或实现更多的trait，同时也可以让API更加清晰和易于使用。

## 零成本抽象

在Rust中，New Type模式不仅是类型安全的，还是一种零成本抽象。这是因为Rust编译器在编译时期会进行足够的优化，以确保New Type的使用没有运行时开销。 Rust的零成本抽象原则确保了抽象不会引入额外的运行时成本。例如，当你使用Meters这样的New Type时，Rust确保：

1. 无额外内存开销：Meters只包含一个f64，在内存中的表现和单独的f64是一样的。
2. 无额外运行时开销：使用Meters时，性能和直接使用f64完全相同。编译器会移除任何关于New Type的包装和解包的代码。
