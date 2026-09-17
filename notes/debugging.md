# Debugging

## Method

1. **Compare to known-good.** Run the thing. What's different from when it worked?
2. **Localise.** Which stage of the pipeline is wrong? Don't read code yet.
3. **Probe that stage.** Minimal input, at least two cases (one that should work, one that shouldn't). One result is ambiguous; two tell you if it's always wrong.
4. **Predict.** What mistake produces _this exact_ symptom?
5. **Read the line.** Confirm or revise the hypothesis.
6. **Fix, re-probe, re-run.**

The step people skip is 4. Predicting "2 lines should appear" is what makes 1 line a bug. Without the number in your head, plausible-looking output passes.

## Symptom shapes

| Symptom                              | Likely cause                                       |
| ------------------------------------ | -------------------------------------------------- | --- | --- |
| Always the same value, any input     | Conditions combined wrong (`&&` vs `               |     | `)  |
| Exactly reversed                     | Swapped comparator args (`b.localeCompare(a)`)     |
| One element missing from a list      | Positional slice, off-by-one                       |
| Wrong only in certain orders         | State overwritten in a loop instead of accumulated |
| Failures across many unrelated files | Bug is low in the stack — something shared         |

## Probes

Throwaway script that calls one function and prints the result. Faster than
adding console.logs to source, and nothing to revert.

`probe/p.ts` (gitignored):

```ts
import { parseEnvFile } from "../src/env-check/parser.js";
console.log(parseEnvFile("API_KEY="));
console.log(parseEnvFile("PORT=3000"));
```

```bash
pnpm exec tsx probe/p.ts
```

Keep it inside the repo so relative imports just work. Overwrite each time.

## Two things I learned the hard way

**All tests passing doesn't mean correct.** 65 green while the exit code was
wrong. Tests only cover cases someone thought of. A bug in an untested path is
invisible until real data hits it.

**A test you haven't seen fail is a test you're trusting on faith.** Break the
code deliberately, watch the test go red, fix it, watch it go
