---
title: C++ vector 的 push_back 和 emplace_back
date: 2023-05-11 11:10:34
tags: [Technique, C++]
---

```c++
/// Inserts a new element at the end of the vector, right after its current last element. This new element is constructed in place using args as the arguments for its constructor.
/// This effectively increases the container size by one, which causes an automatic reallocation of the allocated storage space if -and only if- the new vector size surpasses the current vector capacity.
/// The element is constructed in-place by calling allocator_traits::construct with args forwarded.
///A similar member function exists, push_back, which either copies or moves an existing object into the container.
template <class... Args>
void emplace_back (Args&&... args);
```

`push_back` 会构造一个临时对象，这个临时对象会被拷贝或者移入到容器中，然而 `emplace_back` 会直接根据传入的参数在容器的适当位置进行构造而避免拷贝或者移动。

传统观点认为 `push_back` 会构造一个临时对象，这个临时对象会被移入到 v 中，然而 `emplace_back` 会直接根据传入的参数在适当位置进行构造而避免拷贝或者移动。从标准库代码的实现角度来说这是对的，但是对于提供了优化的编译器来讲，上面示例中最后两行表达式生成的代码其实没有区别。

真正的区别在于，`emplace_back` 更加强大，它可以调用任何类型的（只要存在）构造函数。而 push_back 会更加严谨，它只调用隐式构造函数。隐式构造函数被认为是安全的。如果能够通过对象 T 隐式构造对象 U，就认为 U 能够完整包含 T 的所有内容，这样将 T 传递给 U 通常是安全的。正确使用隐式构造的例子是用 `std::uint32_t` 对象构造 `std::uint64_t` 对象，错误使用隐式构造的例子是用 `double` 构造 `std::uint8_t`。

如果想要调用显示构造函数，那么就调用 `emplace_back`。如果只希望调用隐式构造函数，那么请使用更加安全的 `push_back`:

```c++
std::vector<std::unique_ptr<T>> v;
T a;
v.emplace_back(std::addressof(a)); // compiles
v.push_back(std::addressof(a)); // fails to compile
```

`std::unique_ptr<T>` 包含了显示构造函数通过 `T*` 进行构造。因为 `emplace_back` 能够调用显示构造函数，所以传递一个裸指针并不会产生编译错误。然而，当 v 超出了作用域，`std::unique_ptr<T>` 的析构函数会尝试 delete 类型 `T*` 的指针，而类型 `T*` 的指针并不是通过 new 来分配的，因为它保存的是栈对象的地址，因此 delete 行为是未定义的。