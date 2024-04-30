---
title: TypeScript With Rust Errors, No Try Catch, Heresy
date: 2024-04-30 11:13:54
tags: [Technique, TypeScript]
---

> It’s hard to miss things when you don’t know different things exist

The first problem is, and personally, I believe it’s the biggest JavaScript problem ever: we don’t know what can throw an error. From a JavaScript error perspective, it’s the same as the following:

```javascript
try {
  let data = “Hello”;
} catch (err) {
  console.error(err);
}
```

JavaScript doesn’t know; JavaScript doesn’t care. You should know.

Second thing, this is perfectly viable code:
```javascript
const request = { name: “test”, value: 2n };
const body = JSON.stringify(request);
const response = await fetch("https://example.com", {
  method: “POST”,
  body,
});
if (!response.ok) {
  return;
}
```

No errors, no linters, even though this can break your app.

Right now, in my head, I can hear, “What’s the problem, just use try/catch everywhere.” Here comes the third problem: we don’t know which one is thrown. Of course, we can somehow guess by the error message, but what about bigger services/functions with many places where errors can happen? Are you sure you are handling all of them properly with one try/catch?

---
```rust
let greeting_file_result = File::open(“hello.txt”);  
let greeting_file = match greeting_file_result {  
  Ok(file) => file,  
  Err(error) => panic!("Problem opening the file: {:?}", error),  
};
```

The most verbose of the three shown here and, ironically, the best one. So, first of all, Rust handles the errors using its amazing enums (they are not the same as TypeScript enums!). Without going into detail, what is important here is that it uses an enum called `Result` with two variants: `Ok` and `Err`. As you might guess, `Ok` holds a value and `Err` holds…surprise, an error :D.

The summary here is that Rust always know where there might be an error. And it force you to deal with it right where it appears (mostly). No hidden ones, no guessing, no breaking app with a surprise face.

And this approach is just better. By A MILE.

We cannot make TypeScript errors work like the Rust. The limiting factor here is the language itself; it doesn’t have the proper tools to do that.

But what we can do is try to make it similar. And make it simple:

```typescript
export type Safe<T> =  
  | {  
    success: true;  
    data: T;  
  }  
  | {  
    success: false;  
    error: string;  
  };
```

we do need a few try/catches. The good thing is we only need about two, not 100,000:

```typescript
export function safe<T>(promise: Promise<T>, err?: string): Promise<Safe<T>>;
export function safe<T>(func: () => T, err?: string): Safe<T>;
export function safe<T>(
  promiseOrFunc: Promise<T> | (() => T),
  err?: string,
): Promise<Safe<T>> | Safe<T> {
  if (promiseOrFunc instanceof Promise) {
    return safeAsync(promiseOrFunc, err);
  }
  return safeSync(promiseOrFunc, err);
}

async function safeAsync<T>(
  promise: Promise<T>, 
  err?: string
): Promise<Safe<T>> {
  try {
    const data = await promise;
    return { data, success: true };
  } catch (e) {
    console.error(e);
    if (err !== undefined) {
      return { success: false, error: err };
    }
    if (e instanceof Error) {
      return { success: false, error: e.message };
    }
    return { success: false, error: "Something went wrong" };
  }
}

function safeSync<T>(
  func: () => T, 
  err?: string
): Safe<T> {
  try {
    const data = func();
    return { data, success: true };
  } catch (e) {
    console.error(e);
    if (err !== undefined) {
      return { success: false, error: err };
    }
    if (e instanceof Error) {
      return { success: false, error: e.message };
    }
    return { success: false, error: "Something went wrong" };
  }
}
```

This is just a wrapper with our `Safe` type as the return one. But sometimes simple things are all you need. Let’s combine them with the example from above.

```typescript
const request = { name: “test”, value: 2n };  
const body = safe(  
  () => JSON.stringify(request),  
  “Failed to serialize request”,  
);  
if (!body.success) {  
  // handle error (body.error)  
  return;  
}  
const response = await safe(  
  fetch("https://example.com", {  
    method: “POST”,  
    body: body.data,  
  }),  
);  
if (!response.success) {  
  // handle error (response.error)  
  return;  
}  
if (!response.data.ok) {  
  // handle network error  
  return;  
}  
// handle response (body.data)
```

New solution is longer, but it performs better because of the following reasons:

- no try/catch
- we handle each error where it occurs
- we can specify an error message for a specific function
- we have a nice top-to-bottom logic, all errors on top, then only the response at the bottom