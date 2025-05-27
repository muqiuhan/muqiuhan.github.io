---
title: DDD 中的 Ubiquitous Language
date: 2025-03-14 18:03:49
tags: [Technique]
---

Ubiquitous Language（通用语言）是 Domain-Driven Design (DDD) 中的一个核心概念。它是一种共享的、统一的语言，用于描述和讨论领域模型中的概念和规则。Ubiquitous Language 的目的是确保开发团队和业务专家之间的沟通更加高效和准确，从而减少误解和错误。

一般来说，Ubiquitous Language 有以下特点：

1. 共享：Ubiquitous Language 是由开发团队和业务专家共同创建和使用的。它不仅用于代码和文档，还用于日常的沟通和讨论。
2. 统一：在整个项目中，Ubiquitous Language 应该是一致的。无论是在代码、文档、会议还是白板上，都应该使用相同的术语和概念。
3. 精确：Ubiquitous Language 应该尽可能精确，避免模糊和歧义。每个术语都应该有明确的定义和含义。
4. 演进：Ubiquitous Language 是动态的，会随着项目的进展和业务需求的变化而演进。团队应该定期审查和更新它。

基于此，它可以用在这些地方：

1. 命名：在代码中使用 Ubiquitous Language 来命名类、方法、变量等。例如，如果业务专家使用“订单”来描述一个概念，那么在代码中也应该使用“Order”而不是“Purchase”或“Transaction”。
2. 文档：在文档中使用 Ubiquitous Language 来描述系统的设计、架构和功能。这有助于业务专家更容易理解技术文档。
3. 沟通：在团队会议、讨论和白板会议中使用 Ubiquitous Language。这有助于确保所有参与者都在讨论同一个概念。
4. 测试：在编写测试用例时，使用 Ubiquitous Language 来描述测试的前提条件、步骤和预期结果。这有助于确保测试覆盖了业务需求。

假设正在开发一个电子商务系统，业务专家使用“订单”来描述用户购买的商品集合。团队可以在代码中使用“Order”来命名相关的类和方法：

```fsharp
type Order = {
    items: OrderItem list
    customer: Customer
    orderDate: DateTime
}

type OrderItem = {
    product: Product
    quantity: int
}

type Customer = {
    name: string
}

type Product = {
    name: string
    price: float
}

let addItem (order: Order) (item: OrderItem) =
    { order with items = order.items @ [item] }

let getTotalAmount (order: Order) =
    let total = 0.0
    for item in order.items do
        total <- total + item.price
    total

let getPrice (item: OrderItem) =
    item.product.price * item.quantity

let getTotalPrice (order: Order) =
    let total = 0.0
    for item in order.items do
        total <- total + getPrice(item)
    total
```

在这个示例中使用了“Order”、“OrderItem”、“Customer”和“Product”等术语，这些术语都是 Ubiquitous Language 的一部分，可以提高代码与业务需求的一致性。