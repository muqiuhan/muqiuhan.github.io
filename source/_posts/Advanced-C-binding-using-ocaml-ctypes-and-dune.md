---
title: Advanced C binding using ocaml-ctypes and dune
date: 2024-09-15 22:26:03
tags: [Technique, Archive]
---

I was working on a OCaml binding for [libsrt](https://github.com/Haivision/srt) last summer, to add support for SRT real-time input and output to [liquidsoap](https://github.com/savonet/liquidsoap), and came across the need to access the `[sys/socket.h](https://pubs.opengroup.org/onlinepubs/7908799/xns/syssocket.h.html)` C API.

I had already decided to use the very elegant `[ocaml-ctypes](https://github.com/ocamllabs/ocaml-ctypes)` module for the SRT binding so I went with it and created a `[ocaml-sys-socket](https://github.com/toots/ocaml-sys-socket)` module using it as well. It was a very interesting experience that I would like to describe here!

# ocaml-ctypes

The idea behind OCaml ctypes is to create a binding against a C library without having to write C code, or as least as possible. The most straight-forward way of using it is via `[libffi](https://github.com/libffi/libffi)` , providing access to dynamically-loaded libraries.

The second way of using it is by letting the module generate the basic C stubs required to build and link against a shared library. This is the mode that we’re going to use here. In this mode, the programmer has to describe the C headers of the library they intent to bind to using dedicated OCaml modules, operators and types. From that description, ocaml-ctypes is able to generate the required glue for the binding.

One advantage of using ocaml-ctypes is that the created bindings make as few assumptions as possible about the [OCaml C interfacing API](https://caml.inria.fr/pub/docs/manual-ocaml/intfc.html). This is pretty nice, in particular since the [OCaml compiler](https://github.com/ocaml/ocaml) is moving pretty quickly these days (which is awesome!) and also if, perhaps one day, [support for multi-core](https://github.com/ocaml-multicore/ocaml-multicore) is added to the compiler, which will undoubtedly change the C interface API quite a bit.

# dune

`[dune](https://github.com/ocaml/dune)` (formally `jbuilder` ) is a build system for OCaml projects that has recently raised to much popularity, particularly due to its tight integration with the rest of the OCaml ecosystem, such as `[ocamlfind](http://projects.camlcity.org/projects/findlib.html)` and `[opam](https://opam.ocaml.org/)` .

My personal motto in programming in general is that _“Simple things should be simple, but complex things should be possible”_. `dune` certainly does not fit into that category but, rather, makes some complex things extremely easy to setup. It’s the kind of tool that will make your life incredibly easier when what you intent to do fits well within their workflow but might not be easy to bend to some very specific niche use. We will see one such case below.

At any rate, it’s been an amazing experience getting to learn how to use `dune` and the resulting code and build system is remarkably short and elegant, yet very powerful.

# socket.h

`socket.h` is the Unix header that describes the C API to various socket operations, IP version 4 and 6 as well as unix file sockets. There is also a windows API mimicking it, which makes most code using it easily portable to windows.

Most network-based C libraries refer to `socket.h` to describe the type of socket that can be used with their API so it’s an important entry point for a lot of network operations and one that would be nice to support as generically as possible in OCaml.

The catch, though, is that, most likely for historical reasons¹, the [POSIX specifications](https://pubs.opengroup.org/onlinepubs/7908799/xns/syssocket.h.html) only _partially_ defines some of the required data structures and types, which makes it possible to write C code using them but does not give enough information to write C bindings without having to use the compiler to parse the actual system-specific headers of the running host.

For instance, here’s how the `sockaddr` structure is specified:

The _<sys/socket.h>_ header defines the sockaddr structure that includes at least the following members:sa_family_t   sa_family       address family  
char          sa_data[]       socket address (variable-length data)

Likewise, here’s what is specified about the size of the `socklen_t` data type:

_<sys/socket.h>_ makes available a type, socklen_t, which is an unsigned opaque integral type of length of at least 32 bits.

Thus, in order to know the exact offset of `sa_family` inside the `sockaddr` structure or the actual size of a `socklen_t` integer, one has to include the OS-specific header, parse its definitions for that specific OS and, only then, is it possible to compute that offset or data size. Let’s see how it’s done in our binding now!

# Putting it together

The C binding requires 4 separate passes:

- The `[constants](https://github.com/toots/ocaml-sys-socket/tree/master/src/sys-socket/constants)` pass, which computes and exports some specific constant and data sizes, computed from the C headers
- The `[types](https://github.com/toots/ocaml-sys-socket/tree/master/src/sys-socket/types)` pass, which, given the system-specific constants and sizes exported in the previous phase, defines the actual C data structure bindings.
- The `[stubs](https://github.com/toots/ocaml-sys-socket/tree/master/src/sys-socket/stubs)` pass, where we define the actual bindings to the C functions that we wish to export in our API.
- Finally, the [last pass](https://github.com/toots/ocaml-sys-socket/blob/master/src/sys-socket/sys_socket.mli) does a cleanup of the `stubs` pass to export a relevant and OCaml- (and `ocaml-ctypes`) specific public API that is to be used by users of the module.

`dune` makes each of these steps fairly easy to integrate into the next one, defining compilation elements and binaries to build before moving to the next pass.

## Constants pass

During that pass, we compute and export all required C values defined in the headers. We also add our own constants, which give us the sizes that the POSIX specifications leave up to the OS. Here’s the OCaml code for it:

```ocaml
module Def (S : Cstubs.Types.TYPE) = struct
  let af_inet = S.constant "AF_INET" S.int
  let af_inet6 = S.constant "AF_INET6" S.int
  let af_unix = S.constant "AF_UNIX" S.int
  let af_unspec = S.constant "AF_UNSPEC" S.int
  let sa_data_len = S.constant "SA_DATA_LEN" S.int
  let sa_family_len = S.constant "SA_FAMILY_LEN" S.int
  let sock_dgram = S.constant "SOCK_DGRAM" S.int
  let sock_stream = S.constant "SOCK_STREAM" S.int
  let sock_seqpacket = S.constant "SOCK_STREAM" S.int
  let socklen_t_len = S.constant "SOCKLEN_T_LEN" S.int
  let ni_maxserv = S.constant "NI_MAXSERV" S.int
  let ni_maxhost = S.constant "NI_MAXHOST" S.int
  let ni_numerichost = S.constant "NI_NUMERICHOST" S.int
  let ni_numericserv = S.constant "NI_NUMERICSERV" S.int
end
```

Pretty straightforward! Some of these constants are defined by the POSIX headers and some are custom defined for our needs, for instance `SOCKLEN_T_LEN` . Here’s how they are extracted, using the `dune` build configuration for `[gen_constants_c](https://github.com/toots/ocaml-sys-socket/blob/master/src/sys-socket/generator/gen_constants_c.ml)`:

```ocaml
let c_headers = "
#ifdef _WIN32
  #include <winsock2.h>
  #include <ws2tcpip.h>
#else
  #include <sys/socket.h>
  #include <sys/un.h>
  #include <netdb.h>
#endif
#define SA_DATA_LEN (sizeof(((struct sockaddr*)0)->sa_data))
#define SA_FAMILY_LEN (sizeof(((struct sockaddr*)0)->sa_family))
#define SOCKLEN_T_LEN (sizeof(socklen_t))
#ifndef NI_MAXHOST
  #define NI_MAXHOST 1025
#endif
#ifndef NI_MAXSERV
  #define NI_MAXSERV 32
#endif
"
let () =
  let fname = Sys.argv.(1) in
  let oc = open_out_bin fname in
  let format =
    Format.formatter_of_out_channel oc
  in
  Format.fprintf format "%s@\n" c_headers;
  Cstubs.Types.write_c format (module Sys_socket_constants.Def);
  Format.pp_print_flush format ();
  close_out oc
```

This OCaml code makes use of `ocaml-ctypes` to build a binary that exports the OCaml interface defined by `Sys_socket_constants.Def` . Once compiled, its output looks like this:

```ocaml
include Ctypes
let lift x = x
open Ctypes_static

let rec field : type t a. t typ -> string -> a typ -> (a, t) field =
  fun s fname ftype -> match s, fname with
  | View { ty }, _ ->
    let { ftype; foffset; fname } = field ty fname ftype in
    { ftype; foffset; fname }
  | _ -> failwith ("Unexpected field "^ fname)

let rec seal : type a. a typ -> unit = function
  | Struct { tag; spec = Complete _ } ->
    raise (ModifyingSealedType tag)
  | Union { utag; uspec = Some _ } ->
    raise (ModifyingSealedType utag)
  | View { ty } -> seal ty
  | _ ->
    raise (Unsupported "Sealing a non-structured type")

type 'a const = 'a
let constant (type t) name (t : t typ) : t = match t, name with
  | Ctypes_static.Primitive Cstubs_internals.Int, "NI_NUMERICSERV" ->
    8
  | Ctypes_static.Primitive Cstubs_internals.Int, "NI_NUMERICHOST" ->
    2
  | Ctypes_static.Primitive Cstubs_internals.Int, "NI_MAXHOST" ->
    1025
  | Ctypes_static.Primitive Cstubs_internals.Int, "NI_MAXSERV" ->
    32
  | Ctypes_static.Primitive Cstubs_internals.Int, "SOCKLEN_T_LEN" ->
    4
  | Ctypes_static.Primitive Cstubs_internals.Int, "SOCK_STREAM" ->
    1
  | Ctypes_static.Primitive Cstubs_internals.Int, "SOCK_STREAM" ->
    1
  | Ctypes_static.Primitive Cstubs_internals.Int, "SOCK_DGRAM" ->
    2
  | Ctypes_static.Primitive Cstubs_internals.Int, "SA_FAMILY_LEN" ->
    1
  | Ctypes_static.Primitive Cstubs_internals.Int, "SA_DATA_LEN" ->
    14
  | Ctypes_static.Primitive Cstubs_internals.Int, "AF_UNSPEC" ->
    0
  | Ctypes_static.Primitive Cstubs_internals.Int, "AF_UNIX" ->
    1
  | Ctypes_static.Primitive Cstubs_internals.Int, "AF_INET6" ->
    30
  | Ctypes_static.Primitive Cstubs_internals.Int, "AF_INET" ->
    2
  | _, s -> failwith ("unmatched constant: "^ s)

let enum (type a) name ?typedef ?unexpected (alist : (a * int64) list) =
  match name with
  | s ->
    failwith ("unmatched enum: "^ s)
```

The files used to describe how to build this binary using `dune` are located in a separate `[generator](https://github.com/toots/ocaml-sys-socket/tree/master/src/sys-socket/generator)` directory. Here’s the entry to build this one:

```dune
(executable
 (name gen_constants_c)
 (modules gen_constants_c)
 (libraries sys-socket.constants ctypes.stubs))

(rule
 (targets gen_constants.c)
 (deps    (:gen ./gen_constants_c.exe))
 (action  (run %{gen} %{targets})))

(rule
 (targets gen_constants_c)
 (deps    (:c_code ./gen_constants.c))
 (action  (run %{ocaml-config:c_compiler} -I %{lib:ctypes:} -I %{ocaml-config:standard_library} -o %{targets} %{c_code})))
```

This executable is compiled during the next phase. Let’s move into it now!

## Types pass

During that phase, we use the constants exported during the previous phase to describe the various C structures and types. This is by far the most complex part of the code, making use of first-class modules and several OCaml tricks.

First, let’s look at how we tell `dune` that we need to generate the `.ml` file exporting our required constants from the previous pass:

```dune
(rule
 (targets sys_socket_generated_constants.ml)
 (deps    (:exec ../generator/exec.sh)
          (:gen ../generator/gen_constants_c))
 (action  (with-stdout-to %{targets}
            (system "%{exec} %{ocaml-config:system} %{gen}"))))
```

With only this information, if the code refers to a `Sys_socket_generated_constants` module, `dune` will know that this module needs to be generated and how to do it. We will explain later the use of the `exec.sh` wrapper here.

Now that we can make use of the exported constants in our OCaml code, let’s see how we define the `Socklen` module, exporting abstract types and interface to use `socklen_t` integers:

```ocaml
module Constants = Sys_socket_constants.Def(Sys_socket_generated_constants)

module type Socklen = functor (S : Cstubs.Types.TYPE) -> sig
  type socklen
  val socklen_t : socklen S.typ
  val int_of_socklen : socklen -> int
  val socklen_of_int : int -> socklen
end

let socklen : (module Socklen)  =
    match Constants.socklen_t_len with
      | 4 -> (module functor (S : Cstubs.Types.TYPE) -> struct
                 type socklen = Unsigned.uint32
                 let socklen_t = S.uint32_t
                 let int_of_socklen = Unsigned.UInt32.to_int
                 let socklen_of_int = Unsigned.UInt32.of_int
               end)
      | 8 -> (module functor (S : Cstubs.Types.TYPE) -> struct
                 type socklen = Unsigned.uint64
                 let socklen_t = S.uint64_t
                 let int_of_socklen = Unsigned.UInt64.to_int
                 let socklen_of_int = Unsigned.UInt64.of_int
               end)
      | _ -> assert false

module Socklen = (val socklen : Socklen)
```

As you can see, we make use of first-order modules and the size of the `socklen_t` integer to define the right API for the compiling host. Now let’s see how we define the `sockaddr` interface:

```ocaml
module type SaFamily = sig
  type sa_family
  val int_of_sa_family : sa_family -> int
  val sa_family_of_int : int -> sa_family
  
  module T : functor (S : Cstubs.Types.TYPE) -> sig
    val t : sa_family S.typ
  end
end

let saFamily : (module SaFamily)  =
    match Constants.sa_family_len with
      | 1 ->  (module struct
                 type sa_family = Unsigned.uint8
                 let int_of_sa_family = Unsigned.UInt8.to_int
                 let sa_family_of_int = Unsigned.UInt8.of_int                 
                 module T (S : Cstubs.Types.TYPE) = struct
                   let t = S.uint8_t
                 end
               end)
...

module SaFamily = (val saFamily : SaFamily)

module Def (S : Cstubs.Types.TYPE) = struct
  include Constants

  include Socklen(S)

  include SaFamily

  module SaFamilyT = SaFamily.T(S)

  let sa_family_t = S.typedef SaFamilyT.t "sa_family_t"

  module Sockaddr = struct
    type t = unit
    let t = S.structure "sockaddr"
    let sa_family = S.field t "sa_family" sa_family_t
    let sa_data = S.field t "sa_data" (S.array sa_data_len S.char)
    let () = S.seal t
  end
  
  ...
end
```

Here, too, we make use of the size of `sa_family` as exported previously to define the right structure fields.

Next step, we need to compile this interface again to export the right offset for the various structures that have been defined. That’s `dune`’s job again!

First, the generator code:

```ocaml
let c_headers = "
#ifdef _WIN32
  #include <winsock2.h>
  #include <ws2tcpip.h>
#else
  #include <sys/socket.h>
  #include <sys/un.h>
  #include <netinet/in.h>
  #include <netdb.h>
#endif
"

let () =
  let fname = Sys.argv.(1) in
  let oc = open_out_bin fname in
  let format =
    Format.formatter_of_out_channel oc
  in
  Format.fprintf format "%s@\n" c_headers;
  Cstubs.Types.write_c format (module Sys_socket_types.Def);
  Format.pp_print_flush format ();
  close_out oc
```

And the build instructions:

```dune
(executable
 (name gen_types_c)
 (modules gen_types_c)
 (libraries sys-socket.types ctypes.stubs))

(rule
 (targets gen_types.c)
 (deps    (:gen ./gen_types_c.exe))
 (action  (run %{gen} %{targets})))

(rule
 (targets gen_types_c)
 (deps    (:c_code ./gen_types.c))
 (action  (run %{ocaml-config:c_compiler} -I %{lib:ctypes:} -I %{ocaml-config:standard_library} -o %{targets} %{c_code})))
```

Once, compiled, the exported `.ml` looks like this:

```ocaml
include Ctypes
let lift x = x
open Ctypes_static

let rec field : type t a. t typ -> string -> a typ -> (a, t) field =
  fun s fname ftype -> match s, fname with
...
  | Struct ({ tag = "sockaddr"} as s'), "sa_data" ->
    let f = {ftype; fname; foffset = 2} in
    (s'.fields <- BoxedField f :: s'.fields; f)
  | Struct ({ tag = "sockaddr"} as s'), "sa_family" ->
    let f = {ftype; fname; foffset = 1} in
    (s'.fields <- BoxedField f :: s'.fields; f)
  | View { ty }, _ ->
    let { ftype; foffset; fname } = field ty fname ftype in
    { ftype; foffset; fname }
  | _ -> failwith ("Unexpected field "^ fname)

let rec seal : type a. a typ -> unit = function
...
  | Struct ({ tag = "sockaddr_storage"; spec = Incomplete _ } as s') ->
    s'.spec <- Complete { size = 128; align = 8 }
  | Struct ({ tag = "sockaddr"; spec = Incomplete _ } as s') ->
    s'.spec <- Complete { size = 16; align = 1 }
  | Struct { tag; spec = Complete _ } ->
    raise (ModifyingSealedType tag)
  | Union { utag; uspec = Some _ } ->
    raise (ModifyingSealedType utag)
  | View { ty } -> seal ty
  | _ ->
    raise (Unsupported "Sealing a non-structured type")

type 'a const = 'a
let constant (type t) name (t : t typ) : t = match t, name with
  | _, s -> failwith ("unmatched constant: "^ s)

let enum (type a) name ?typedef ?unexpected (alist : (a * int64) list) =
  match name with
  | s ->
    failwith ("unmatched enum: "^ s)
```

As you can see, this exports all the offsets required to access the fields inside a `sockaddr_t` structure. We’re now ready to move to the final stage, which is the actual binding stubs!

## Binding stubs

First step in this pass, just like with the previous ones, we need to configure `dune` to be able to build the exported `.ml` code from the `types` pass:

```dune
(rule
 (targets sys_socket_generated_types.ml)
 (deps    (:exec ../generator/exec.sh)
          (:gen ../generator/gen_types_c))
 (action  (with-stdout-to %{targets}
            (system "%{exec} %{ocaml-config:system} %{gen}"))))
```

And we can now define the proper bindings. Here’s how it looks like:

```ocaml
open Ctypes

module Def (F : Cstubs.FOREIGN) = struct
  open F

  module Types = Sys_socket_types.Def(Sys_socket_generated_types)

  open Types

  let getnameinfo = foreign "getnameinfo" (ptr sockaddr_t @-> socklen_t @-> ptr char @-> socklen_t @-> ptr char @-> socklen_t @-> int @-> (returning int))

...
end
```

As you can see, we’re exporting the `getnameinfo` function, taking various arguments, including a pointer to a `sockaddr_t` structure and a couple of `socklen_t` integers, making use of all the various data types and structures previously defined. The exact specifications of this function can be found [here](https://pubs.opengroup.org/onlinepubs/009695399/functions/getnameinfo.html). We can now define out top-level API..

## Final API

Building upon the previous modules, we export various OCaml idiomatic APIs that the binding user can now use to build new bindings against the `socket.h` APIs.

Just like with the previous steps, first we need to configure the build system:

```dune
(rule
 (targets sys_socket_generated_stubs.ml)
 (deps    (:gen ./generator/gen_stubs.exe))
 (action  (run %{gen} ml %{targets})))

(rule
 (targets sys_socket_generated_stubs.c)
 (deps    (:gen ./generator/gen_stubs.exe))
 (action  (run %{gen} c %{targets})))
```

This time, we need `ocaml-ctypes` to generate two compilation units: a `.ml` file describing the API exported during the `stubs` phase, as well as the C code to glue it with the C APIs. Here’s the code for that generator:

```ocaml
let c_headers = "
#ifdef _WIN32
  #include <winsock2.h>
  #include <ws2tcpip.h>
#else
  #include <sys/socket.h>
  #include <netinet/in.h>
  #include <arpa/inet.h>
  #include <netdb.h>
#endif
#include <string.h>
"

let () =
  let mode = Sys.argv.(1) in
  let fname = Sys.argv.(2) in
  let oc = open_out_bin fname in
  let format =
    Format.formatter_of_out_channel oc
  in
  let fn =
    match mode with
      | "ml" -> Cstubs.write_ml
      | "c"  ->
         Format.fprintf format "%s@\n" c_headers;
         Cstubs.write_c
      | _    -> assert false
  in
  fn ~concurrency:Cstubs.unlocked format ~prefix:"sys_socket" (module Sys_socket_stubs.Def);
  Format.pp_print_flush format ();
  close_out oc
```

The exported `.ml` and `.c` files are omitted here for simplicity but the reader can generated them themselves from the `[ocaml-sys-socket](https://github.com/toots/ocaml-sys-socket)` repository if they are curious about their actual content.

We can now export our top-level API:

```ocaml
open Ctypes

include Sys_socket_types.SaFamily

include Sys_socket_stubs.Def(Sys_socket_generated_stubs)

type socklen = Types.socklen
let socklen_t = Types.socklen_t
let int_of_socklen = Types.int_of_socklen
let socklen_of_int = Types.socklen_of_int

module Sockaddr = struct
  include Types.Sockaddr
  let from_sockaddr_storage = from_sockaddr_storage t
  let sa_data_len = Types.sa_data_len
end

let getnameinfo sockaddr_ptr =
  let maxhost = Types.ni_maxhost in
  let s = allocate_n char ~count:maxhost in
  let maxserv = Types.ni_maxserv in
  let p = allocate_n char ~count:maxserv in
  match getnameinfo sockaddr_ptr (socklen_of_int (sizeof sockaddr_t))
                    s (socklen_of_int maxhost) 
                    p (socklen_of_int maxserv)
                    (Types.ni_numerichost lor
                     Types.ni_numericserv)  with
    | 0 ->
      let host =
        let length =
          Unsigned.Size_t.to_int
            (strnlen s (Unsigned.Size_t.of_int maxhost))
        in
        string_from_ptr s ~length
      in
      let port =
        let length =
          Unsigned.Size_t.to_int
            (strnlen p (Unsigned.Size_t.of_int maxserv))
        in
        let port =
          string_from_ptr p ~length
        in
        try
          int_of_string port
        with _ ->
          match getservbyname p null with
            | ptr when is_null ptr -> failwith "getnameinfo"
            | ptr ->
               Unsigned.UInt16.to_int
                 (ntohs (!@ (ptr |-> Types.Servent.s_port)))
      in
      host, port
    | _ -> failwith "getnameinfo"

...
```

```ocaml
open Ctypes

(** Ctypes routines for C type socklen_t. *)
type socklen
val socklen_t : socklen typ
val int_of_socklen : socklen -> int
val socklen_of_int : int -> socklen

(** Generic sockaddr_t structure. *)
module Sockaddr : sig
  type t
  val t : t structure typ
  val sa_family : (sa_family, t structure) field
  val sa_data : (char carray, t structure) field
  val sa_data_len  : int

  val from_sockaddr_storage : SockaddrStorage.t structure ptr -> t structure ptr
end

(** IP address conversion functions. *)
val getnameinfo : sockaddr ptr -> string * int

...
```

That’s it! We now have `ocaml-ctypes` specific data types and structures that can be used to interface with the host’s native `socket.h` APIs. Note that we also worked on top of the original low-level binding to `getnameinfo` to export a higher-level function more idiomatic to the OCaml language.

# Lagniappe: cross-compilation to Windows

On windows platforms, `liquidsoap` is compiled using `[ocaml-cross-windows](https://github.com/ocaml-cross/opam-cross-windows)` and, since windows does have compatible socket APIs, we wanted to also look at cross-compiling for the windows target, which is where we hit a snag on the current `dune` support.

The problem is that, at each intermediary steps, in the case of a cross-compilation, the compiled binaries need to use the target’s OS headers and not the host’s headers, otherwise we end up using offsets specific to e.g. Debian but for a windows binary.

In this case, this means that the compiled `.exe` binaries need to be windows binaries and that we need to execute them as windows native binaries, using `[wine](https://www.winehq.org/)` .

`dune` has a truly amazing [support for cross-compiling](https://dune.readthedocs.io/en/latest/cross-compilation.html), which we do not cover here, but, unfortunately, its primitives for building and executing binaries do not yet cover this use case. Thus we had to trick it into compiling things the way we wanted to do, which why we are using the `exec.sh` wrapper. Here’s its code:

```sh
#!/bin/sh

SYSTEM=$1
CMD=$2
ARG=$3

if test "${SYSTEM}" = "mingw"; then
  wine $CMD $ARG
elif test "${SYSTEM}" = "mingw64"; then
  wine64 $CMD $ARG
else
  $CMD $ARG
```

Now, you can go back to the previous `dune` files and see how this wrapper allows to execute binaries according to the system that the corresponding `ocamlopt` compiler has been configured to build for.

# Conclusion

It’s been a fun time working on this binding! It’s amazing to see the level of details that can be built through `ocaml-ctypes` using their provided primitives. Ultimately, the binding is very clean and elegant, with very few low-level assumptions.

Likewise, the simplicity and power of the `dune` build system makes this very fluid to build. Without it, each of the described steps above would have been much more painful to execute and compile.

[1]: My bet is that, at the time the POSIX specifications were being written, there we already several inconsistent `socket.h` headers out in the wild among the various historical UNIX flavors..