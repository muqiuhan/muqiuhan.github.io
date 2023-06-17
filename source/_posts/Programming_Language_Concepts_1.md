---
title: Programming Language Concepts Reading Notes
date: 2023-06-17
tags: [F#, Technique, PL]
---

# Introduction

> how to represent arithmetic expressions and other program fragments as data structures in F# as well as Java, and how to compute with such program fragments. We also introduce various basic concepts of programming languages.

## Syntax and Semantics

What does this (well-formed) program mean, how does it behave—what happens when we execute it?

- One may distinguish two kinds of syntax
	1. By concrete syntax we mean the representation of a program as a text.
	2. By abstract syntax we mean the representation of a programs as a tree or by an object structure.
- One may distinguish two kinds of semantics
	1. Dynamic semantics concerns the meaning or effect of a program at run-time.
	2. Static semantics roughly concerns the compile-time correctness of the program (are variables declared, is the program well-typed, and so on)

Static semantics can be checked without executing the program, and may be enforced by closedness checks (type checks, type inference, and more...).

In the conditional expression `if e1 then e2 else e3`, the interpreter might start by testing whether expressions e2 and e3 are syntactically identical, in which case there is no need to evaluate e1, only e2 (or e3). Although possible, __this shortcut is rarely useful__.
