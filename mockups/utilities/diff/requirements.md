# Requirements: Text Diff Utility

## Overview
- Utility name: Text Diff Utility
- Slug: `diff`
- Route: `/diff`
- Goal: Compare two text inputs and clearly show differences at both line-level and character-level.

## User Goals
- Paste two texts and instantly understand what changed.
- Identify exact line differences and exact characters/segments changed.
- Focus only on changed areas without visual noise.
- Revisit previous comparisons from local history.

## Core Features
- Two input textareas: left (original) and right (updated).
- Compare action that computes line-level and inline differences.
- Side-by-side diff view with highlighted changed lines.
- Inline highlight for modified lines.
- Difference summary panel listing only changed entries.
- History persisted in browser `localStorage`.

## Detailed Behaviors
- Inputs:
- Left and right textareas support multiline content.
- Provide `Compare` and `Clear` actions.
- Comparison logic:
- Detect added, removed, and modified lines.
- For modified lines, highlight changed segments inline.
- Summary:
- Show total counts: added, removed, modified.
- Show compact change cards with line numbers and before/after snippets.
- History:
- Save comparison snapshot when user runs comparison.
- Snapshot includes timestamp, left text, right text, options, and diff counts.
- Show list of recent snapshots.
- Clicking a history item restores inputs and rendered result.
- Allow deleting one item and clearing all history.

## Edge Cases
- Both inputs empty: show guidance instead of diff.
- One side empty: treat all lines as added or removed.
- Very long lines: preserve layout with wrapping and scroll-safe containers.
- Repeated lines: maintain stable order with deterministic pairing.

## Accessibility
- Inputs and controls use visible labels.
- Color is not the only signal; include text badges (Added/Removed/Modified).
- Buttons and list items are keyboard accessible.
- Sufficient color contrast for highlighted states in dark theme.

## Performance/Quality Constraints
- Handle at least ~500 lines per side without freezing typical desktop interaction.
- Keep history size bounded (max 40 entries).
- Avoid external dependencies; implement with project-standard React/Next setup.

## Acceptance Criteria
- User can enter two texts and run comparison.
- Changed lines are highlighted in side-by-side view.
- Modified lines show inline differences.
- Summary panel lists only changed entries with readable before/after data.
- Comparison history persists across reloads in localStorage.
- User can restore, delete, and clear history entries.
- Route `/diff` renders correctly and build passes.
