# shadow-callbag

A utility for implementing shadow callbags inside [tallbags](https://github.com/callbag/tallbag).

`npm install shadow-callbag`

## API

**Factory: `makeShadow(name, sourceShadow)`**

- `name` is a string that identifies the current tallbag operator or source
- `sourceShadow` is the shadow callbag that comes from the source tallbag, when implementing an operator for tallbags

This function returns a shadow callbag. Whenever the tallbag delivers data, you should also deliver that same data to the shadow callbag. See example below.

## Example

Implementing the `tallbag-map` (diffing with `callbag-map`):

```diff
+import makeShadow from 'shadow-callbag';
+// or
+// const makeShadow = require('shadow-callbag').default;

 const map = f => source => (start, sink) => {
   if (start !== 0) return;
-  source(0, (t, d) => {
+  let shadow;
+  source(0, (t, d, s) => {
     if (t === 0) {
+      shadow = makeShadow('map', s);
-      sink(0, d);
+      sink(0, d, shadow);
     } else if (t === 1) {
       const y = f(d);
+      shadow && shadow(1, y);
       sink(1, y);
     } else {
       sink(t, d);
     }
   });
 };
```

## Metadata

The metadata produced by these shadow callbags follows the JSON type below:

```typescript
type Metadata = {
  name: string;
  source?: Metadata | Array<Metadata> | undefined;
  data?: string | number | object;
  timestamp?: number;
};
```

**Name** is a label or identifier for the current tallbag.

**Source** is the metadata for the parent tallbag in a chain (directed acyclic graph) of tallbags, when such parent exists.

**Data and timestamp** describe the most recent delivery of data by this current tallbag.

Example metadata object displaying the chain of operators, `interval-->map-->delay-->forEach`, where only the root tallbag has had a previous delivery of data:

```json
{
  "source": {
    "source": {
      "source": {
        "name": "interval",
        "data": 0,
        "timestamp": 1548507136457
      },
      "name": "map"
    },
    "name": "delay"
  },
  "name": "forEach"
}
```

Example metadata object for the same chain of operators, where all tallbags in the chain have delivered something (pay attention to the monotonic ordering of timestamps):

```json
{
  "source": {
    "source": {
      "source": {
        "name": "interval",
        "data": 0,
        "timestamp": 1548507136457
      },
      "name": "map",
      "data": 0,
      "timestamp": 1548507136458
    },
    "name": "delay",
    "data": 0,
    "timestamp": 1548507136961
  },
  "name": "forEach",
  "data": 0,
  "timestamp": 1548507136961
}
```