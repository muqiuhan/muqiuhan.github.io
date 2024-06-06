---
title: .NET AOT 下的 F# 命令行参数解析库选择
date: 2024-06-06 20:50:35
tags: [F#, Technique]
---

Argu 不支持 AOT，不过用 F# 的话可以看整个 .NET 的生态，我看了一下 C# 的 CommandLineParser：
https://github.com/commandlineparser

在这个 PR 中支持了 Native AOT
https://github.com/commandlineparser/commandline/pull/913

除此之外，还有一个更加精巧的 F# 库可以用，只有两百多行：
https://github.com/B2R2-org/FsOptParse/

AOT 后的大小很可观，并且支持 full trim.

用例：

```fsharp
(** defines a state to pass to the option parser *)
type opts =
  {
    optX : int;
    optY : bool;
    optZ : string;
  }

(** default option state *)
let defaultOpts =
  {
    optX = 0;
    optY = false;
    optZ = "";
  }

(*
  An example command line specification, which is a list of Options.
  Each Option describes a command line option (switch) that is specified with
  either a short (a single-dash option) or long option (a double-dash option).
*)
let spec =
  [
    (* This option can be specified with -x <NUM>. There is an extra argument to
       specify a value in integer. *)
    Option ((* description of the option *)
            descr="this is a testing param X",
            (* how many extra argument must be provided by a user? *)
            extra=1,
            (* callback sets up the option and returns it *)
            callback=(fun opts arg -> {opts with optX=(int) arg.[0]}),
            (* use a short option style -x *)
            short="-x"
           );

    (* This option can be specified with -y. There is no extra argument. This
       option just sets a flag, optY. *)
    Option ((* description of the option *)
            descr="this is a testing param Y",
            (* set the option to be true *)
            callback=(fun opts _ -> {opts with optY=true}),
            (* use a short option style (-y) *)
            short="-y",
            (* also use a long option style (--yoohoo) *)
            long="--yoohoo"
           );

    (* A dummy option to pretty-print the usage *)
    Option ((* description of the option *)
            descr="",
            dummy=true
           );
    Option ((* description of the option *)
            descr="[Required Options]",
            descrColor=System.ConsoleColor.DarkCyan,
            dummy=true
           );

    (* The third option is a required option. In other words, option parsing
       will raise an exception if this option is not given by a user. This
       option takes in an additional integer argument, and set it to the global
       variable z. *)
    Option ((* description of the option *)
            descr="required parameter <STRING> with an integer option",
            (* callback to set the optZ value *)
            callback=(fun opts arg -> {opts with optZ=arg.[0]}),
            (* specifying this is a required option *)
            required=true,
            (* one additional argument to specify an integer value *)
            extra=1,
            (* use only a long option style *)
            long="--req"
           );
  ]

let _ =
  let prog = "opttest.fsx"
  let args = System.Environment.GetCommandLineArgs ()
  let usageGetter () = "[Usage]\n  %p %o"
  try
    let left, opts = optParse spec usageGetter prog args defaultOpts
    printfn "Rest args: %A, x: %d, y: %b, z: %s"
      left opts.optX opts.optY opts.optZ
    0
  with
    | SpecErr msg ->
        eprintfn "Invalid spec: %s" msg
        exit 1
    | RuntimeErr msg ->
        eprintfn "Invalid args given by user: %s" msg
        usagePrint spec prog usageGetter (fun () -> exit 1)
```
