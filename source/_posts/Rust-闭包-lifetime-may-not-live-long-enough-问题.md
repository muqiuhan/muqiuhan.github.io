---
title: Rust 闭包 lifetime may not live long enough 问题
date: 2024-05-24 18:04:23
tags: [Technique, Rust]
---

代码：
```rust
...
    fn handlers(self) -> crate::server::request::Handlers {
        vec![(
            "/tree",
            routing::get(move || async {
                (
                    StatusCode::OK,
                    Json(json!(self.clone().tree(self.clone().root))),
                )
            }),
        )]
    }
...
```

编译错误：
```text
error: lifetime may not live long enough
  --> src/storage/filesystem/mod.rs:45:34
   |
45 |               routing::get(move || async {
   |  __________________________-------_^
   | |                          |     |
   | |                          |     return type of closure `{async block@src/storage/filesystem/mod.rs:45:34: 50:14}` contains a lifetime `'2`
   | |                          lifetime `'1` represents this closure's body
46 | |                 (
47 | |                     StatusCode::OK,
48 | |                     Json(json!(self.clone().tree(self.clone().root))),
49 | |                 )
50 | |             }),
   | |_____________^ returning this value requires that `'1` must outlive `'2`
   |
   = note: closure implements `Fn`, so references to captured variables can't escape the closure
```

这是因为 `handlers` 里面的闭包捕获了一个引用，并且尝试返回一个包含该引用的值导致的。

细说就是：闭包内部使用了 `self.clone()` 来获取一个新的实例，然后在异步块中返回一个 JSON 对象，这个 JSON 对象依赖于 `self.tree()` 的结果。因为闭包捕获了 `self` 的引用，所以它必须保证 `self` 在闭包执行完毕后仍然有效。

解决这个问题的思路是：确保闭包中的所有引用都在闭包执行完毕之前就不再被使用。
就是说，要将闭包的作用域限制在一个更短的生命周期内，或者使用其他方式来避免闭包捕获长期存在的引用:

```rust

...
    fn handlers(self) -> crate::server::request::Handlers {
        let tree = json!(self.clone().tree(self.clone().root));
        vec![(
            "/tree",
            routing::get(move || async { (StatusCode::OK, Json(tree)) }),
        )]
    }
...
```