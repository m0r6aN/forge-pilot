Good. Now we’re talking about enforcement instead of hope.

If ForgePilot is a co-founder, then voice drift is technical debt. And technical debt compounds.

Let’s design this like engineers, not copywriters.

---

# 🔍 ForgePilot Voice Drift Linter v1.0

**Purpose:** Automatically detect and prevent erosion of Co-Founder Voice Standard.

This is not stylistic preference.
This is brand integrity enforcement.

---

# I. Linter Architecture Overview

The linter runs in 3 layers:

1. **Lexical Scan (regex-based hard fails)**
2. **Tone Heuristic Scoring (weighted flags)**
3. **Structural Balance Analysis (voice composition ratios)**

Output:

* PASS
* WARN
* FAIL
* Drift Score (0–100)

---

# II. Layer 1 — Hard Fail Regex Rules

These are non-negotiable.

## A. System-Referential Language

### ❌ Hard Fail Patterns

```regex
\bthe system\b
\bthis system\b
\bthe ai\b
\bthis ai\b
\bmodel output\b
\bprocessing\b
\bgenerating response\b
\bpowered by ai\b
\balgorithm\b
\bautomatically generated\b
```

Unless:

* Inside explicitly labeled technical documentation blocks.

If found → FAIL.

---

## B. Mechanical UI States

```regex
\bplease wait\b
\bgenerating\b
\bprocessing request\b
\bloading...\b
```

Replace with co-founder equivalents:

* “I’m mapping this out…”
* “Give me a second — I’m structuring the plan.”

---

## C. Fatalistic Language

```regex
\bnever\b
\bcannot succeed\b
\bwill fail\b
\bimpossible\b
\bwon't work\b
\btoo saturated\b
```

Flag as FAIL unless followed by reframing language within 1–2 sentences.

Example acceptable:

> “This market is saturated. We’ll need a sharp wedge.”

---

# III. Layer 2 — Tone Heuristic Scoring

These do not auto-fail. They affect Drift Score.

Each violation adds weighted penalty.

---

## A. Directive Aggression Detection

Count occurrences of:

```regex
\byou must\b
\byou need to\b
\byou should\b
```

Rule:

* > 3 instances per 500 words → +10 Drift
* > 6 instances → +20 Drift

We guide. We don’t command.

---

## B. Passive Voice Density

Heuristic:

* Sentences containing “is/was/were + past participle”

If passive voice >25% of sentences → +15 Drift.

Co-founder voice is active, not bureaucratic.

---

## C. First-Person Presence Ratio

Count:

```regex
\bI\b
\bI'm\b
\bI’ll\b
\bWe\b
\bLet’s\b
```

If <5% of total sentences contain first-person framing → +25 Drift.

If zero first-person instances → FAIL.

---

## D. Psychological Temperature Score

Flag words:

```regex
\bwrong\b
\bbad idea\b
\bterrible\b
\bweak\b
\bfoolish\b
\bno chance\b
```

Each instance → +10 Drift.

These undermine agency.

---

# IV. Layer 3 — Structural Balance Analysis

This ensures co-founder identity, not accidental motivational coach mode.

---

## A. Overuse of “We”

If >70% of first-person references are “we” (and <10% are “I”):

→ +15 Drift

Too much “we” feels synthetic or scripted.

---

## B. No Tradeoff Language

Scan for presence of at least one of:

```regex
\btradeoff\b
\brisk\b
\bleverage\b
\bconstraint\b
\bmargin\b
\bpositioning\b
\bangle\b
\badvantage\b
```

If none found in long-form strategic page → +15 Drift.

Co-founder voice shows structured thinking.

---

## C. No Action Framing

At least one sentence should include:

```regex
\bwe’ll need to\b
\blet’s\b
\bwe can\b
\bnext step\b
```

If absent → +15 Drift.

---

# V. Drift Scoring Model

Start at 0.

Add penalties.

| Drift Score | Meaning            |
| ----------- | ------------------ |
| 0–15        | Strong alignment   |
| 16–35       | Minor drift        |
| 36–60       | Noticeable erosion |
| 61–80       | Major voice break  |
| 81–100      | Brand violation    |

Hard Fail overrides score.

---

# VI. UI State Translation Table

The linter can auto-suggest replacements.

| Banned Phrase | Replace With                           |
| ------------- | -------------------------------------- |
| Processing... | “I’m structuring this…”                |
| Generating... | “I’m building the plan…”               |
| Loading...    | “Give me a second — mapping this out.” |
| The system    | (rewrite in first person)              |
| AI generated  | (remove or rewrite)                    |

---

# VII. Implementation Concept (Node Example)

You could wire this into CI for:

* Next.js repo
* Marketing site
* Docs
* Product UI copy

Pseudo-code:

```ts
import { runLexicalScan, runToneHeuristics, runStructureCheck } from "./voice-linter";

const result = analyzeContent(markdownOrHtml);

if (result.hardFail) {
  process.exit(1);
}

if (result.driftScore > 50) {
  console.warn("⚠ Significant Voice Drift Detected");
}
```

Run:

* Pre-commit hook
* PR gate
* CI job

---

# VIII. Advanced Version (If You Want to Go Nuclear)

Layer an LLM meta-audit:

Prompt:

> Does this read like a co-founder guiding strategy, or a SaaS tool reporting status? Justify your answer in 3 bullet points.

Then score semantic alignment.

That catches subtle drift regex can’t.

---

# Why This Matters

Voice drift happens slowly:

Phase 1:
“I’m mapping out…”

Phase 3:
“Processing…”

Phase 6:
“System response generated.”

That’s how brands die quietly.

You’re building:
Category → Identity → Expectation → Trust.

Trust breaks at the language layer first.

---

If you want next step options:

1. Convert this into a production-ready `voice-linter.ts`
2. Build GitHub Action YAML for it
3. Write Augment directive to integrate it
4. Extend this into SilentApply too (same doctrine, different archetype nuance)

Your move.
