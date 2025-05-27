---
title: Scala 3 (Capture Checking)
date: 2025-03-25 16:20:25
tags: [Technique]
---

> https://docs.scala-lang.org/scala3/reference/experimental/cc.html

Scala 3 在其类型系统的演进过程中，引入了诸多实验性特性，旨在提升语言的表达能力和代码的可靠性。Capture Checking 是其中一项引人注目的创新。目前还在试验阶段，其通过增强静态分析的能力，在编译时捕获潜在的错误，从而减少运行时问题的发生。

Capture Checking引入了一系列核心概念，这些概念共同构成了其类型系统的基础：

- 捕获类型 (Capturing Types): 捕获类型采用 `T^{c₁, ..., cᵢ}` 的形式，其中 `T` 是一个普通的 Scala 类型，而 `{c₁, ..., cᵢ}` 则是一个捕获的 Capabilities 集合。这个捕获集合明确地列出了类型 `T` 的值所依赖或能够访问的 Capabilities。这种类型表示方式为类型信息增加了一个新的维度，它不仅描述了数据的结构，还包含了数据交互的环境或资源的相关信息。
- Capabilities: 在 Capture Checking 的语境下，Capabilities 指的是方法或类的参数、局部变量，或者其类型本身就是一个具有非空捕获集合的捕获类型的封闭类的 `this` 引用。这些实体之所以需要被跟踪，是因为它们通常代表了执行某些操作或访问某些资源的“权限”或“授权”。跟踪这些 Capabilities 意味着可以控制这种影响在程序中的传播方式和范围。
- 通用 Capability (`cap`): 通用 Capability `cap` 是一个最基本的 Capability，所有的其他的 Capabilities 都派生自它。类型 `T^` 是 `T^{cap}` 的简写形式，表示类型 `T` 的值可以捕获任意的 Capability。`cap` 的存在为 Capture Checking 系统提供了一种 __处理精确跟踪并非必需或不可行__ 的场景的方式。它充当了一种通配符，表明一个值可能依赖于任何 Capability。
- 纯函数 vs. 非纯函数 (Pure vs. Impure Functions): Capture Checking 显式地区分了纯函数和非纯函数。类型为 `A => B` 的函数被认为是非纯函数，它可以捕获任意 Capability，等价于 `A ->{cap} B` 1。而类型为 `A -> B` 的函数则是纯函数，它不能捕获任何 Capability。此外，还可以使用 `A ->{c, d} B` 的形式来显式指定函数只能捕获 Capability `c` 和 `d`。这种区分使得类型系统能够强制执行函数式编程的原则，其中纯函数因其可预测性和可测试性而备受推崇。
- 子捕获 (Subcapturing): 子捕获描述了捕获集合之间的关系。如果一个捕获集合 `C₁` 中的每个元素都包含在另一个捕获集合 `C₂` 中，那么我们说 `C₁` 是 `C₂` 的子捕获，记作 `C₁ <: C₂` 1。子捕获关系在类型系统中扮演着重要的角色，例如在判断类型兼容性时。它允许具有较小捕获集合的值在需要具有较大捕获集合的地方使用，这基于一种替代原则，即更受限制的 Capability 集合是较少受限制的集合的子类型。
- Capability Classes: 扩展了 `caps.Capability` trait 的类被称为 Capability Class。它们的类型捕获集合始终为 `{cap}`。Capability Class 似乎提供了一种在类型系统中显式定义和管理基本 Capability 的方法。它们与通用 Capability `cap` 的关联表明，它们具有与环境进行广泛交互的潜力。

> Capture Checking 的主要目标是通过静态地跟踪资源或能力的使用情况，从而防止与资源生命周期和可访问性相关的错误。这尤其在涉及资源管理和并发编程的场景中显得至关重要。通过这种静态跟踪，Capture Checking 旨在提高代码的整体安全性，并增强程序的鲁棒性。

Capture Checking 试图解决编程语言中长期存在的一些问题：

- 不安全的资源管理: 例如，传统的 `try-with-resources` 模式旨在确保资源在使用后被正确关闭。Capture Checking 通过跟踪与资源相关的 Capabilities，可以防止在资源关闭或失效后继续使用它的情况。文档中提到的 `usingLogFile` 示例就展示了这一点，其中一个闭包尝试写入一个已经关闭的文件，而Capture Checking可以捕获这种不安全的操作:

```scala
def usingLogFile[T](op: FileOutputStream => T): T =
  val logFile = FileOutputStream("log")
  val result = op(logFile)
  logFile.close()
  result
```

```scala
def usingLogFile[T](op: FileOutputStream^ => T): T =
  // same body as before
```

```
   |  val later = usingLogFile { f => () => f.write(0) }
   |              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   |The expression's type () => Unit is not allowed to capture the root capability `cap`.
   |This usually means that a capability persists longer than its allowed lifetime.
```

- Effect Polymorphism: Capture Checking 提供了一种更灵活和精确地推理和控制副作用的机制。它可以被视为一种 Effect system，允许类型系统跟踪和控制代码可能产生的副作用。
- “函数的颜色”问题: 在异步编程中，区分同步和异步操作一直是一个挑战。Capture Checking 有可能帮助区分和管理同步与异步计算，这通过跟踪与异步操作相关的 Capabilities 来实现。
- 基于区域的内存分配: Capture Checking 可以通过推理与内存位置相关的Capability，来促进更安全的内存管理。这暗示了 Capture Checking 与内存管理之间可能存在更深层次的集成，从而可能实现更高效和更安全的内存使用。
- CE: Scala 3 通过使用 `CanThrow` 跟踪抛出特定异常的Capability，实现了一个干净且完全安全的 CE 系统。这提供了一种类型安全的替代方案，相较于传统的 CE，这种方式可能更加灵活和有原则。
- 逃逸分析: Capture Checking 可以防止局部Capability逃逸其预期的作用域。例如，当一个闭包捕获了一个局部Capability，并且这个闭包被赋值给一个全局变量或者以不安全的方式从函数返回时，Capture Checking 可以检测到这种潜在的风险。

---

在 Scala 3 中，函数类型 `A => B` 被认为是不纯的，它可以捕获任意 Capability。实际上，`A => B` 是 `A ->{cap} B` 的别名，明确地表明了它可能捕获 "通用 Capability"。这种默认行为反映了 Scala 过去函数可以拥有任意副作用的特点。然而，随着 Capture Checking 的引入，开发者被鼓励更明确地表达函数的纯度。

与不纯函数相对的是纯函数，其类型为 `A -> B`，表示该函数不能捕获任何 Capability。纯函数是函数式编程中的核心概念，Capture Checking 提供了一种在类型层面强制执行纯性的方法。确保函数的纯性可以使代码更具可预测性和可测试性，因为纯函数的输出完全取决于其输入，并且没有副作用。

开发者还可以指定函数可以捕获的特定 Capability，语法为 `A ->{c, d} B`，表示该函数可以捕获 Capability `c` 和 `d`。这种语法允许对函数可以使用的Capability 进行精确控制，从而提高了资源管理的细粒度。通过显式列出捕获的 Capability，编译器可以验证函数是否遵守这些约束，并防止其意外访问其他资源。

捕获注解 `^` 的优先级高于 `->` 。理解运算符的优先级对于正确解释和编写带有捕获注解的函数类型至关重要。不正确的解析可能导致意想不到的行为或类型错误。例如，`A ^ C -> B` 表示一个从捕获的 `A` 到 `B` 的纯函数。

```scala
def f(x: ->{c} Int): Int
```

Capture Checking 也适用于上下文函数。不纯的上下文函数使用 `?=>`，行为类似于 `=>`，可以捕获任意Capability。纯的上下文函数使用 `?->`，行为类似于 `->`，不能捕获任何Capability。这表明，Capture Checking扩展到了上下文函数，允许控制在它们的隐式参数作用域内捕获的 Capability。

值得注意的是，方法本身并不是值，因此它们不直接捕获Capability。相反，它们对 Capability 的引用会被计入封闭对象的捕获集中。这种区分很重要，因为方法的捕获行为与它们所属对象的状态和Capability相关联，这反映了 Scala 的面向对象特性。

与函数类型类似，Capture Checking的概念也延伸到了命名参数类型。`=> Int` 允许任意Capability引用，类似于不纯函数类型。`-> Int` 禁止任何Capability引用，类似于纯函数类型。而 `->{c} Int` 则只允许引用Capability `c`。这种一致性确保了即使是延迟求值的表达式也遵循Capability约束。

子捕获（`C₁ <: C₂`）定义了捕获集之间的关系。捕获集 `C₁` 是 `C₂` 的子类型，如果 `C₂` 包含了 `C₁` 中的每一个元素，并且满足以下条件之一：`c ∈ C₂`（直接包含）；`c` 是一个类参数，且 `C₂` 包含 `Cls.this`（Capability 来源于封闭的类实例）；`c` 的类型具有捕获集 `C`，且 `C <: C₂`（基于 Capability 类型的递归子捕获）。子捕获定义了 Capability 依赖的层级结构，这对于类型系统判断一个需要特定 Capability 集合的值是否可以在提供不同 Capability 集合的上下文中使用至关重要。

对于捕获类型的子类型，存在以下规则：纯类型是捕获类型的子类型（`T <: C T`）；较小的捕获集会产生子类型（如果 `C₁ <: C₂` 且 `T₁ <: T₂`，则 `C₁ T₁ <: C₂ T₂`）。这意味着一个依赖较少 Capability 的值通常更通用，可以在更广泛的场景中使用。根 Capability `{cap}` 覆盖了所有其他捕获集，因此任何特定的捕获集都是 `{cap}` 的子类型。这允许具有特定捕获要求的类型在允许任何 Capability 的上下文中使用。

Capability widening（也称为 _avoidance_）是一种简化局部变量类型的机制。局部变量的类型会被 widening 到不提及该变量本身的最小超类型，这个过程通常会涉及到变量的捕获集。这种加宽有助于改善类型推断和代码清晰度，避免局部变量的类型变得过于复杂。

```scala
fs: FileSystem^
ct: CanThrow[Exception]^
l : Logger^{fs}

{l}  <: {fs}     <: {cap}
{fs} <: {fs, ct} <: {cap}
{ct} <: {fs, ct} <: {cap}
```

继承自 `caps.Capability` 的类具有隐式的 `{cap}` 捕获集。这表明这些类的实例本质上代表了一种 Capability。Capability 类提供了一种将 Capability 显式定义和管理为类型系统中的一等公民的方式。开发者可以创建具有特定语义和使用模式的自定义 Capability。

在使用 Capability 类的场景中，通常会结合 using clauses 和隐式参数来减少在代码中显式传递 Capability 的需要。这两种方法提供了一种自动将必要的 Capability 提供给函数和方法的方式，从而减少了样板代码并提高了代码的可读性。

闭包会捕获在其主体中引用的来自其周围环境的 Capability。这导致闭包的函数类型中包含捕获集。例如，如果一个闭包引用了一个局部变量 `fs`，而 `fs` 是一个 Capability，那么该闭包的类型可能就是 `String ->{fs} Unit`。这意味着闭包继承了其封闭代码的 Capability 要求，确保它们只能在这些 Capability 可用的上下文中被使用。

此外，闭包还会捕获它们调用的函数的 Capability。如果一个闭包调用了一个需要特定 Capability 的函数，那么该闭包的捕获集也会包含该 Capability。这种传递性的捕获机制确保了所有 Capability 依赖，无论是直接的还是间接的，都会被闭包所跟踪。

类会将其方法中使用的 Capability 保留为（私有）字段。这意味着如果一个方法使用了作为构造函数参数传递的Capability，该类很可能会存储对它的引用。这会导致类的类型中包含捕获集。例如，一个使用文件系统Capability `xfs` 的 `Logger` 类可能具有类型 `Logger^{xfs}`。这表明类封装了它们所依赖的Capability，并将这些依赖作为其类型签名的一部分。

`@constructorOnly` 注解可以用于标记一个仅在构造函数中使用而不会作为字段保留的类参数。这有助于减少类的捕获集。如果一个参数仅用于初始化，后续不再访问，那么类就没有必要将其保留为一种 Capability。

类的捕获引用包括从类外部使用的局部 Capability 以及具有捕获类型的构造函数参数（参数Capability）。局部Capability会被内部类继承。

类实例的 `this` 的捕获集是根据捕获的引用、父类以及类内部的使用约束来推断的 1。这种自动推断机制在很多情况下减少了手动指定类捕获集的需要。

```scala
import caps.Capability

class FileSystem extends Capability

class Logger(using FileSystem):
  def log(s: String): Unit = ???

def test(using fs: FileSystem) =
  val l: Logger^{fs} = Logger()
  ...
```

```scala
class Logger(using FileSystem^{cap}):
                   ^^^^^^^^^^^^^^
             redundant capture: FileSystem already accounts for cap
```


捕获隧道 (Capture Tunnelling) 是指当一个类型变量被一个捕获类型实例化时，捕获信息不会立即传播到外层的泛型类型。相反，捕获会“穿过隧道”，并在类型变量被访问或其成员被使用时重新出现。这种机制有助于以更简洁和可管理的方式处理泛型代码中的捕获集，避免类型签名过于复杂。

逃逸检查施加了一些限制。作为类型变量实例的捕获类型不能携带通用Capability `cap` 。可变变量也不能拥有通用捕获集 。逃逸检查阻止了在参数化类型的参数中返回或分配带有局部 Capability 的闭包，因为这可能导致 Capability 逃逸其预期的作用域。单调性规则指出，在一个带有字段 `f` 的类中，`{this}` 覆盖了 `{this.f}` 以及 `this.f` 对纯参数的应用。这意味着如果类实例本身被视为一种 Capability，那么其字段所持有的任何 Capability 也会被隐式地覆盖。逃逸检查对于维护 Capability 跟踪的完整性至关重要，它可以防止 Capability 在其预期生命周期或作用域之外被使用，尤其是在泛型和可变状态的上下文中。

受检异常可以通过导入 `language.experimental.saferExceptions` 来启用。方法上的 `throws` 子句会扩展为一个隐式的 `CanThrow` Capability参数，表明该方法可能抛出指定类型的异常。`throw` 表达式需要 `CanThrow` Capability，而 `try` 表达式会创建这种Capability。在 `language.experimental.captureChecking` 下，由于逃逸的 Capability 而导致未处理异常的代码会被拒绝。为了实现这种集成，`CanThrow` 需要继承 `Capability`，并且需要将逃逸检查扩展到 `try` 表达式，以防止捕获 `cap`。Capture Checking 与受检异常的集成确保了异常的可能性也被作为一种 Capability 需求来跟踪，从而加强了语言的整体资源管理和错误处理 Capability。

---

文档中提供了一个关于惰性列表（Lazy Lists）的较大示例，很好地展示了 Capture Checking 如何在更复杂的数据结构中工作。`LzyList` 的 `tail` 具有一个捕获注解，表明它可以捕获与列表相同的引用。诸如 `map`、`filter` 和 `concat` 等操作在惰性列表上能够正确地推断出捕获集，这取决于原始列表和所使用的函数。值得注意的是 effect polymorphism的概念，传递给这些操作的纯函数不会出现在结果的捕获集中。这与严格列表形成对比，严格列表通常不需要捕获注解，因为它们的副作用不会被延迟。惰性列表的例子具体说明了Capture Checking 如何应用于非平凡的数据结构，展示了其在涉及延迟求值的复杂场景中跟踪依赖关系的Capability。effect polymorphism 是一个显著的优点，它允许在不影响捕获集的情况下使用纯计算。

---

表 1: 代码示例与演示概念

|   |   |   |
|---|---|---|
|代码片段|演示概念|捕获行为解释|
|`import language.experimental.captureChecking`|启用Capture Checking|必须通过此导入才能使用Capture Checking特性。|
|`T^{c₁, ..., cᵢ}`|捕获类型的声明|表示类型 `T` 的值可能依赖或访问Capability `c₁, ..., cᵢ`。|
|`A => B`|不纯函数类型|函数可以捕获任意Capability，是 `A ->{cap} B` 的别名。|
|`A -> B`|纯函数类型|函数不能捕获任何Capability。|
|`A ->{c, d} B`|指定捕获Capability的函数类型|函数只能捕获Capability `c` 和 `d`。|
|`=> Int`|允许任意Capability引用的命名参数类型|类似于不纯函数类型。|
|`-> Int`|禁止任何Capability引用的命名参数类型|类似于纯函数类型。|
|`->{c} Int`|只允许特定Capability引用的命名参数类型|只允许引用Capability `c`。|
|`class C extends caps.Capability`|Capability类的定义|类 `C` 的实例本身代表一种Capability，具有隐式的 `{cap}` 捕获集。|
|`@constructorOnly val p: Int`|构造函数专用参数|参数 `p` 仅在构造函数中使用，不会作为类的字段保留，有助于减少类的捕获集。|
|`() -> Iterator^`|具有存在性Capability的函数结果类型|返回一个迭代器，该迭代器可能捕获某种Capability，但具体是哪种Capability在编译时未知。|
|`ops*`|可达Capability|表示通过Capability `ops` 可访问的任何协变出现的Capability。|
|`type Source[X^] = ...`|使用Capability多态的类型定义|类型 `Source` 被参数化为可以持有Capability集 `X^`。|


当 `cap` 出现在函数的结果类型中时，通常表示一个由存在性量词绑定的未知类型（例如，`() -> Iterator^` 意味着 `() -> Exists x. Iterator^x`）。这表明返回的迭代器可能捕获了某种 Capability，但具体的哪种 Capability 在静态类型检查时是未知的。在内部，这种存在性 Capability 使用带有 sealed trait `Exists` 的依赖函数类型来表示 。结果类型中协变的 `cap` 会被替换为一个新的 existential variable。当应用一个具有 existential result 类型 `Exists ex.T` 的函数时，结果是 `T`，其中 `ex` 被 `cap` 替换。Existential Capability 允许类型系统表达在编译时具体捕获的 Capability 未知的情况，从而提供了灵活性，同时仍然保持了一定程度的跟踪。

Reach Capability 用于表达一个变量引用了通过另一个Capability“Reach”的任何操作。例如，如果 `ops` 是一个表示一组操作的Capability，那么 `ops*` 就表示出现在 `ops` 类型中且通过 `ops` 访问的任何协变 Capability。Reach Capability 提供了一种间接推理和跟踪 Capability 的方式，这对于建模具有相互连接资源的复杂系统非常有用。

Capability 多态允许使用带有上界 `CapSet` 的类型变量来参数化操作的捕获集。这使得定义诸如 `Source[X^]` 这样的类型成为可能，其中 `X^` 表示监听器可以持有的一组 Capability。Capability 多态增强了代码的表达性和可重用性，因为它允许函数和数据结构在它们可能依赖的 Capability 集上进行参数化。

---

Scala 3 提供了几个与 Capture Checking 相关的编译选项，。`-Xprint:cc` 选项会打印出带有推断捕获类型的程序代码 1。这对于理解编译器是如何推断捕获集的以及调试与类型相关的错误非常有用。另一个选项是 `-Ycc-debug`，它提供了关于 Capture Checking 过程的详细的、面向实现的的信息。这个选项对于需要深入了解 Capture Checking 器工作原理或者遇到复杂问题的开发者来说很有帮助。这些编译选项是使用 Capture Checking 的开发者的重要工具，它们允许开发者检查编译器的推理并诊断问题。


Capture Checking被实现为一个传播约束求解器，它在标准的类型检查阶段之后运行，未知的捕获集由约束变量表示。在类型中显式编写的捕获集被求解器视为常量。类型之间的子类型要求会转化为它们各自捕获集上的子捕获测试。求解器根据程序的结构和类型约束，将 Capability 传播给约束变量及其超集。捕获集的映射受到类型参数的变性（协变、逆变、不变）的影响。装箱（boxing）和拆箱（unboxing）是用于隐藏和恢复捕获集的虚拟操作，特别是在类型参数的上下文中用于管理捕获隧道。`-Ycc-debug` 的输出提供了关于变量依赖关系和Capture Checking器在编译过程中的状态的深入信息。
