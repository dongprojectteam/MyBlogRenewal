# Requirements: Korean Text Repair

## Overview
- Utility name: Korean Text Repair
- Slug: `mojibake`
- Route: `/mojibake`
- Goal: Suggest repair candidates for Korean text damaged by common encoding mistakes.

## Core Features
- Text input with sample and clear actions.
- Server-side repair route using `iconv-lite`.
- Candidate ranking by Hangul-heavy scoring.
- Candidate use and copy actions.
- Status and character count display.
- Visible processing note and 50,000 character limit.

## Detailed Behaviors
- Text is sent to `/api/mojibake/repair`.
- Empty text returns no candidates.
- Text over 50,000 characters is rejected before repair.
- Duplicate candidates are removed.
- The original input is kept as a candidate.

## Edge Cases
- Invalid JSON request.
- Percent decoding failure.
- Input that is already valid Korean.
- Very long input.
- Clipboard failure.

## Acceptance Criteria
- `/mojibake` renders in the app shell.
- Sample text produces ranked candidates.
- Oversized text shows a readable error.
- The UI explains that repair runs through this app's server route.
- Build passes.
