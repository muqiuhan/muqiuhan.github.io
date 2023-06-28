---
title: 隐藏一些OCaml Effect的机制，让其语法在精神上更接近delimcc
date: 2023-06-28 21:47:16
tags: [Technique, OCaml]
---


[delimcc_of_fxhandler这个库](https://github.com/kayceesrk/delimcc_of_fxhandler)在OCaml5的effect handlers上实现了一些delimcc原语(shift/reset, control/prompt这些)：
```ocaml
  let p = new_prompt () in
  assert ([] = push_prompt p (fun () ->
                 1::2::take_subcont p (fun _k -> [])));
  assert ([1;2] = push_prompt p (fun () ->
                 1::2::take_subcont p (fun k -> push_subcont k [])));
  assert (135 =
    let p1 = new_prompt () in
    let p2 = new_prompt () in
    let p3 = new_prompt () in
    let pushtwice sk =
      sk (fun () ->
        sk (fun () ->
          shift0 p2 (fun sk2 -> sk2 (fun () ->
            sk2 (fun () -> 3))) ()))
     in
     push_prompt p1 (fun () ->
       push_prompt p2 (fun () ->
         push_prompt p3 (fun () -> shift0 p1 pushtwice ()) + 10) + 1) + 100);

  print_endline "Success!"
```

另外， [avsm这里](https://github.com/avsm/ocaml/commits/effect-syntax)可以看到一些OCaml的Effect Syntax进展。

还有 [multi-shot continuations in OCaml](https://github.com/dhil/ocaml-multicont)，在这个仓库里面还讨论了一些有趣的问题，例如，OCaml 编译器和runtime会做出一些假设从而进行一些优化，这些优化在使用multi-shot continutation时是不可取的（或完全错误的）。编译器优化导致错误的一个例子是堆到栈的转换，例如:
```ocaml
(* An illustration of how the heap to stack optimisation is broken.
 * This example is adapted from de Vilhena and Pottier (2021).
 * file: heap2stack.ml
 * compile: ocamlopt -I $(opam var lib)/multicont multicont.cmxa heap2stack.ml
 * run: ./a.out *)

(* We first require a little bit of setup. The following declares an
   operation `Twice' which we use to implement multiple returns. *)
type _ Effect.t += Twice : unit Effect.t

(* The handler `htwice' interprets `Twice' by simply invoking its
   continuation twice. *)
let htwice : (unit, unit) Effect.Deep.handler
  = { retc = (fun x -> x)
    ; exnc = (fun e -> raise e)
    ; effc = (fun (type a) (eff : a Effect.t) ->
      let open Effect.Deep in
      match eff with
      | Twice -> Some (fun (k : (a, _) continuation) ->
         continue (Multicont.Deep.clone_continuation k) ();
         continue k ())
      | _ -> None) }

(* Now for the interesting stuff. In the code below, the compiler will
   perform an escape analysis on the reference `i' and deduce that it
   does not escape the local scope, because it is unaware of the
   semantics of `perform Twice', hence the optimiser will transform
   `i' into an immediate on the stack to save a heap allocation. As a
   consequence, the assertion `(!i = 1)' will succeed twice, whereas
   it should fail after the second return of `perform Twice'. *)
let heap2stack () =
  Effect.Deep.match_with
    (fun () ->
      let i = ref 0 in
      Effect.perform Twice;
      i := !i + 1;
      Printf.printf "i = %d\n%!" !i;
      assert (!i = 1))
    () htwice

(* The following does not trigger an assertion failure. *)
let _ = heap2stack ()

(* To fix this issue, we can wrap reference allocations in an instance
   of `Sys.opaque_identity'. However, this is not really a viable fix
   in general, as we may not have access to the client code that
   allocates the reference! *)
let heap2stack' () =
  Effect.Deep.match_with
    (fun () ->
      let i = Sys.opaque_identity (ref 0) in
      Effect.perform Twice;
      i := !i + 1;
      Printf.printf "i = %d\n%!" !i;
      assert (!i = 1))
    () htwice

(* The following triggers an assertion failure. *)
let _ = heap2stack' ()
```
