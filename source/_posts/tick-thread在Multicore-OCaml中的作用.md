---
title: tick thread在Multicore OCaml中的作用
date: 2023-08-15 13:29:21
tags: [Technique]
---

Multicore OCaml的程序在启动时会运行一个 tick thread，其实现如下:

```c
/* The tick thread: posts a SIGPREEMPTION signal periodically */

static void * caml_thread_tick(void * arg)
{
  struct timeval timeout;
  sigset_t mask;

  /* Block all signals so that we don't try to execute an OCaml signal handler*/
  sigfillset(&mask);
  pthread_sigmask(SIG_BLOCK, &mask, NULL);
  while(! caml_tick_thread_stop) {
    /* select() seems to be the most efficient way to suspend the
       thread for sub-second intervals */
    timeout.tv_sec = 0;
    timeout.tv_usec = Thread_timeout * 1000;
    select(0, NULL, NULL, NULL, &timeout);
    /* The preemption signal should never cause a callback, so don't
     go through caml_handle_signal(), just record signal delivery via
     caml_record_signal(). */
    caml_record_signal(SIGPREEMPTION);
  }
  return NULL;
}
```

这是因为Multicore OCaml的GC目前需要一个进程（或一个Domain）中的所有线程一起参与以避免并发访问。如果一个线程在system call上被阻塞，那么整个Domain就会被卡住，直到该线程可以参与当前的垃圾收集。为了避免这个问题，tick 线程可以代替被阻塞的线程执行垃圾收集操作。