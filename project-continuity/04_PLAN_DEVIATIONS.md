# Plan Deviations

Original plan vs what was actually built/changed.

| Original Plan | Actual Decision | Reason |
|---------------|-----------------|--------|
| `LocationController` split into REST + WS service | Kept as-is (82 lines) | Overkill for 3 methods; brief says "prefer less code" |
| Create full Booking DTO with `@Valid` | Created DTO without `@Valid` | Many fields are optional depending on flow; validation checked in service |
| Merge `toLong`/`toDouble`/`toDoubleOrNull` | Left as-is | Different null semantics: 0 for money fields, null for coordinates |
