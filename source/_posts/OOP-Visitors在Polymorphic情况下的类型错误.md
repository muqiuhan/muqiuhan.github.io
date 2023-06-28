---
title: OOP Visitors在Polymorphic情况下的类型错误
date: 2023-06-28 21:48:56
tags: [Technique, OCaml]
---

像Java里面:

```java
interface Tree {
  public <B> B accept(TreeVisitor<B> v);
}

interface TreeVisitor<B> {
  public B visitLeaf(Leaf t);
}

class Leaf implements Tree {
  public final int value;

  public Leaf(int value) {
    this.value = value;
  }

  public <B> B accept(TreeVisitor<B> v) {
    return v.visitLeaf(this);
  }
}
```

要是从字面上直接翻译成OCaml:

```ocaml
class virtual tree =
  object
    method virtual accept : 'a . 'a tree_visitor -> 'a
  end

and virtual ['a] tree_visitor =
  object
    method virtual visit_leaf : (leaf -> 'a)
  end

and leaf (i : int) =
  object (self)
    method get = i

    method accept (v : 'a tree_visitor) : 'a =
      v#visit_leaf (self :> leaf)
  end
```

是行不通滴:

```
File "visitor.ml", line 3, characters 28-54:
3 |     method virtual accept : 'a . 'a tree_visitor -> 'a
                                ^^^^^^^^^^^^^^^^^^^^^^^^^^
Error: The universal type variable 'a cannot be generalized:
       it escapes its scope.
```

OCaml的类在定义时是单态的，比如:

```ocaml
class ['a] c (x:'a) = 
  object
    method x = x
  end
and d = 
  object
    method strange = (new c 0)#x
  end
```

这里c是:

```ocaml
class ['a] c : 'a -> object constraint 'a = int method x : 'a end
```

因为在d里面`new c 0`了一个 `int c` 的对象。

所以正确的写法应该是:

```ocaml
class virtual ['a, 'leaf, 'node, 'empty] open_tree_visitor = 
  object
    method virtual visit_leaf :  'leaf -> 'a
    method virtual visit_node :  'node -> 'a
    method virtual visit_empty :  'empty -> 'a
  end

class virtual tree = 
  object
    method virtual accept : 'a .
      ('a, 'leaf, 'node, 'empty) open_tree_visitor -> 'a
  end

and leaf (i : int) = 
  object (self:'self)
    inherit tree
    method get = i
    method accept v = v#visit_leaf (self :> leaf)
  end

and node (x : tree) (y: tree) = 
  object (self:'self)
    inherit tree
    method left = x
    method right = y
    method accept v = v#visit_node (self :> node)
  end

and empty = 
  object (self:'self)
    inherit tree
    method accept v = v#visit_empty (self :> empty)
  end
```