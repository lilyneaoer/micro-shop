# Fix: TypeError: taro.taroExports.onLoad is not a function

## Problem

The customer-app was throwing the error:

```
TypeError: taro.taroExports.onLoad is not a function
```

This occurred in the `scan/index.vue` page.

## Root Cause

In Taro 4.x with Vue 3 Composition API (`<script setup>`), the `onLoad` lifecycle hook is **not available** as a direct export from `@tarojs/taro`.

The incorrect code was:

```typescript
import Taro, { onLoad } from "@tarojs/taro";

// Later in the code:
onLoad(async (options) => {
  // Page initialization logic
});
```

## Solution

In Taro 4.x with Vue 3 Composition API, you should use **`useLoad`** instead of `onLoad`:

```typescript
import Taro, { useLoad, useRouter } from "@tarojs/taro";

const router = useRouter();

// Use useLoad hook
useLoad(async () => {
  // Access route params via router.params instead of options parameter
  const qrToken = router.params?.qr_token || router.params?.scene;
  // Page initialization logic
});
```

## Key Changes

1. **Import `useLoad` instead of `onLoad`**:

   ```typescript
   // Before
   import Taro, { onLoad } from "@tarojs/taro";

   // After
   import Taro, { useLoad, useRouter } from "@tarojs/taro";
   ```

2. **Use `useRouter()` to access route parameters**:

   ```typescript
   // Before
   onLoad(async (options) => {
     const qrToken = options?.qr_token;
   });

   // After
   const router = useRouter();
   useLoad(async () => {
     const qrToken = router.params?.qr_token;
   });
   ```

## Taro 4.x Lifecycle Hooks Reference

For Vue 3 Composition API in Taro 4.x, use these hooks:

| Page Lifecycle    | Composition API Hook |
| ----------------- | -------------------- |
| onLoad            | useLoad()            |
| onShow            | useDidShow()         |
| onHide            | useDidHide()         |
| onReady           | useReady()           |
| onUnload          | useUnload()          |
| onPullDownRefresh | usePullDownRefresh() |
| onReachBottom     | useReachBottom()     |

## Alternative Approach

You can also use Vue's `onMounted` hook with `useRouter()`:

```typescript
import { onMounted } from "vue";
import Taro, { useRouter } from "@tarojs/taro";

const router = useRouter();

onMounted(async () => {
  const qrToken = router.params?.qr_token;
  // Page initialization logic
});
```

However, `useLoad` is preferred as it's specifically designed for Taro page lifecycle and fires earlier than `onMounted`.

## Files Modified

- `customer-app/src/pages/scan/index.vue`

## Build Status

✅ Build successful after fix
✅ No compilation errors
