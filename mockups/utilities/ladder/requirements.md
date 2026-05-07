# Ladder Game Requirements

## Overview

Ladder Game is a browser-based ladder drawing utility for quick random matching. Users enter participants and results, generate a random ladder, reveal each path with animation, and review or restore previously saved runs from browser storage.

Route: `/ladder`

## User Goals

- Create a fair random match between participants and outcomes.
- Reveal results one by one with a satisfying animated path.
- Keep results hidden until intentionally revealed.
- Reopen past ladder runs and inspect the exact saved result later.
- Reuse past inputs to quickly run a similar game again.

## Core Features

- Participant and result editors
  - Support 2 to 12 participants.
  - Result count must match participant count.
  - Add, remove, edit, and reorder rows.
  - Trim empty values and show validation messages.
- Ladder generation
  - Generate one vertical line per participant.
  - Generate horizontal bridges between adjacent lines.
  - Prevent adjacent bridge collisions on the same row.
  - Support complexity options: simple, balanced, dense.
  - Use a seed so a run is reproducible.
  - Store the concrete bridge structure, not only the seed.
- Result reveal
  - Clicking a participant traces the route from top to bottom.
  - The traced path resolves to exactly one result.
  - Each revealed participant remains visually marked.
  - Users can reveal all results at once.
- Animation
  - Draw ladder lines progressively after generation.
  - Animate the selected route step by step.
  - Highlight current route position while tracing.
  - Reveal the result card with a transition on arrival.
  - Animate shuffle/regeneration transitions.
  - Reveal all results with a staggered sequence.
  - Respect `prefers-reduced-motion` by reducing motion.
- Browser history
  - Save completed/generated runs to `localStorage`.
  - Keep up to 30 most recent records.
  - Show a recent history panel with date, participant count, and summary.
  - Clicking a history item restores the exact saved ladder and matching result.
  - Restored runs are viewable and replayable.
  - Provide delete one record and clear all records actions.
  - Provide "start from this record" to copy saved inputs into a new run.

## Detailed Behaviors

- Default state
  - Preload four participant rows and four result rows so the utility is usable immediately.
  - Default results can be simple placeholders that users can replace.
- Validation
  - Generation is disabled when participant/result counts differ.
  - Generation is disabled below 2 or above 12 participants.
  - Empty participant/result rows are ignored only after explicit trimming.
  - If trimming changes counts, show a count mismatch message.
- Generation
  - New generation creates a new seed and new concrete bridge rows.
  - Regeneration preserves current inputs and complexity.
  - Complexity controls bridge density and ladder height.
  - Every participant maps to a deterministic result based on bridge structure.
- Reveal
  - Result labels remain covered until revealed.
  - Revealing all should mark every participant and result as visible.
  - During route animation, new route requests should cancel and start the latest selected route.
  - On reduced motion, route reveal should complete instantly or near-instantly.
- Saved records
  - Save after a ladder is generated and update the record as reveal state changes.
  - Saved record includes id, createdAt, participants, results, matches, bridge rows, seed, complexity, and revealed indexes.
  - Restoring a record must not recalculate the ladder.
  - Deleting records must update the visible history immediately.

## Edge Cases

- Duplicate names are allowed but displayed with stable positions.
- Very long participant/result text must not overlap the ladder.
- Storage read/write failures should not break the game.
- Corrupt history records should be ignored.
- History should handle an empty state gracefully.
- If a saved record has inconsistent data, it should be skipped during parsing.
- Small mobile screens should preserve playability with horizontal scroll for the ladder.

## Accessibility

- Inputs need clear labels.
- Buttons must expose descriptive text.
- Ladder visualization should have an accessible summary of matches.
- Participant buttons should announce whether the result is hidden or revealed.
- Use semantic lists/tables for history and result summaries where practical.
- Focus states must remain visible.
- Motion-sensitive users should get reduced animations.

## Performance/Quality Constraints

- Keep all game logic client-side.
- Avoid external game libraries for this simple deterministic domain.
- Use stable TypeScript types for ladder state and saved records.
- Limit localStorage records to 30 to keep payload small.
- Avoid layout shifts while lines or route highlights animate.
- Keep styles consistent with the existing DOPT utility pages.

## Acceptance Criteria

- `/ladder` renders in the Next.js app router.
- The home utilities list contains a Ladder Game card.
- Users can generate a ladder with 2 to 12 participants.
- Participant and result counts are validated before generation.
- A generated ladder visibly contains vertical lines and valid non-colliding bridges.
- Clicking each participant reveals an animated route and the correct result.
- "Reveal all" exposes every match.
- "Shuffle" regenerates using the same inputs and selected complexity.
- A generated run is saved in browser history.
- Clicking a history item restores the exact ladder and visible result state.
- History delete and clear actions work.
- A saved record can be used as the basis for a new run.
- The page includes metadata and SoftwareApplication JSON-LD.
- A utility preview image exists for the home card.
- `npm run build` completes or any unrelated blockers are reported.
