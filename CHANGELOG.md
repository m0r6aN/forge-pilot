# Changelog

## [v1.0.1] - 2026-02-14
### Added
- `npm run omega:register` dev-only workflow artifact registration command.
- SDK-driven workflow registration script (`scripts/omega-register.mjs`).

### Changed
- `/api/launch/teaser/answer` now resumes via SDK with governed resume input (`answers`).
- Dependency switched to local workspace SDK (`file:../omega-sdk-ts`) for same-cycle contract features.
- Launch checkout enforces trace+receipt metadata binding (fail-closed).
