# Requirements: Regex Tester

## Overview
- Utility name: Regex Tester
- Slug: `regex`
- Route: `/regex`
- Goal: Test JavaScript regular expressions with highlights, capture groups, named groups, and replacement preview.

## Core Features
- Pattern input.
- JavaScript flag toggles: `g`, `i`, `m`, `s`, `u`, `y`.
- Test text editor.
- Replacement input and preview.
- Highlighted match output.
- Capture group and named group list.
- Copy replacement output.

## Detailed Behaviors
- Match listing forces global iteration so all matches can be displayed.
- Zero-width matches advance safely.
- Match list is capped at 1,000 entries with a visible notice.
- Invalid regex errors are shown without crashing.

## Edge Cases
- Empty pattern.
- Invalid regex syntax.
- Zero-width matches.
- Very large match counts.
- Clipboard failure.

## Acceptance Criteria
- `/regex` renders in the app shell.
- Sample pattern highlights matches and capture groups.
- Replacement preview updates as inputs change.
- More than 1,000 matches displays a truncation notice.
- Build passes.
