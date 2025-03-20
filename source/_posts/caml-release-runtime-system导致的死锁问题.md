---
title: caml_release_runtime_system导致的死锁问题
date: 2023-06-28 21:45:55
tags: [Technique]
---


给出一个`test.ml`:
```ocaml
Printf.eprintf "hello from OCaml\n%!"
```

和`test-ocaml-5.c`:
```c
#include <stdio.h>
#include <stdlib.h>
#include <caml/misc.h>
#include <caml/callback.h>
#include <caml/threads.h>

int
main (int argc, char *argv[])
  {
    fprintf (stderr, "starting up ...\n");
    caml_startup (argv);
    fprintf (stderr, "acquiring ...\n");
    caml_acquire_runtime_system ();
    fprintf (stderr, "acquired\n");
    // here is where I would be calling an OCaml callback
    // omitted for simplicity
    caml_release_runtime_system ();
    exit (0);
  }
```

然后用OCaml5的ocaml native compiler编译一下（这里我用的是`ocaml-variants.5.0.0+options`）：
`ocamlopt -g test-ocaml-5.c test.ml -o test-ocaml-5`

运行`test-ocaml-5` 会出现:
```
starting up ...
hello from OCaml
acquiring ...
Fatal error: Fatal error during lock: Resource deadlock avoided

[1]    8998 IOT instruction (core dumped)  ./test-ocaml-5
```

这里我尝试了一下 4.14.0 和 4.14.1 ， 都没有出现这个情况，而如果用`threads`编译的话:
`ocamlopt -g -I +unix unix.cmxa -I +threads threads.cmxa test-ocaml-5.c test.ml -o test-ocaml-5`

无论在5.0还是4.14.x，都会挂起。

出现这个问题的一个可能原因是，在`test-ocaml-5.c`中，我在开头调用了`caml_startup()`，这会让当前线程获取锁，而`caml_acquire_runtime_system()`会再次获取它，`caml_acquire_runtime_system()` 应该在`caml_release_runtime_system（）`之后调用：

```ocaml
int
main (int argc, char *argv[])
  {
    fprintf (stderr, "starting up ...\n");
    caml_startup (argv);
    fprintf (stderr, "acquiring ...\n");
    caml_release_runtime_system ();
    caml_acquire_runtime_system ();
    fprintf (stderr, "acquired\n");
    exit (0);
  }
```

运行结果为:
```
starting up ...
hello from OCaml
acquiring ...
acquired
```