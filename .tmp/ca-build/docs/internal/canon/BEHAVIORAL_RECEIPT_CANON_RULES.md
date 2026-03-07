# Keon Behavioral Receipt Canonicalization Rules (v1)

These rules define deterministic hashing and signing for `keon.receipt.behavioral.v1`.

## Canonical JSON
All hashes and signatures MUST be computed over canonical JSON using JSON Canonicalization Scheme (JCS, RFC 8785).

- UTF-8 encoding
- Object keys lexicographically sorted
- No insignificant whitespace
- Numbers in minimal form
- Strings unchanged (no normalization beyond JSON encoding)

## Binding Hashes
Bindings are computed as SHA-256 hex over canonical JSON fragments:

1) policyHash
- Input: canonical JSON of `receipt.policy`
- Output: sha256 hex

2) subjectHash
- Input: canonical JSON of `receipt.subject`
- Output: sha256 hex

3) evaluationHash
- Input: canonical JSON of `receipt.evaluation`
- Output: sha256 hex

## Receipt Signing Payload
The Ed25519 signature MUST be computed over canonical JSON of the receipt object with the following fields included:

Included:
- schema
- receiptId
- issuedAt
- policy
- subject
- evaluation
- bindings
- issuer

Excluded:
- signature (entire object)

I.e., signature covers:
`canonical(receipt_without_signature)`

## RuleSet Hash (`ruleSetHash`)
`ruleSetHash` is a SHA-256 hex hash that identifies the active behavioral enforcement rules.

Recommended computation:
- Generate a canonical policy artifact JSON (validated against `keon.policy.behavioral.v1`)
- Compute sha256 hex over canonical(policyArtifact)

Alternative computation (dev):
- sha256 hex over concatenated file contents of the rule source files
- Must be stable and documented

## Expression Hash (`expressionHash`)
`expressionHash` MUST be SHA-256 hex over the UTF-8 bytes of the final emitted human-facing expression.

- Final means post-rewrite, post-sanitization, and exactly what is shown/spoken.
- Do not include surrounding metadata.
- Do not include trailing null bytes.

## Dispositions
Disposition enum:
- APPROVED
- REWRITE_REQUIRED
- REJECTED

For audit clarity:
- initialDisposition = result after first evaluation (pre-rewrite)
- finalDisposition = result after last evaluation (post-rewrite)

## Replay Safety
Consumers MUST validate:
- signature validity
- subject.tenantId matches execution tenant context
- subject.expressionHash matches emitted text hash
- policyId/version/ruleSetHash match expected policy bundle for the environment
