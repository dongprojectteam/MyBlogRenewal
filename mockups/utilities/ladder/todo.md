# Ladder Game TODO

## Scaffolding

- [x] Create `app/ladder/page.tsx` with metadata, JSON-LD, header, and client component.
- [x] Create `app/ladder/ladder-client.tsx`.
- [x] Add `public/images/utilities/ladder-preview.svg`.
- [x] Register `/ladder` in `lib/seed.ts`.
- [x] Add `/ladder` to `app/sitemap.ts`.

## Logic

- [x] Define TypeScript types for complexity, bridges, runs, and route points.
- [x] Implement input normalization and validation.
- [x] Implement seeded random generation.
- [x] Implement bridge generation without same-row adjacent collisions.
- [x] Implement match calculation from stored bridge structure.
- [x] Implement route point calculation for path animation.
- [x] Implement localStorage parse, save, update, delete, and clear helpers.
- [x] Cap saved history at 30 records.

## UI

- [x] Build participant/result editors with add, remove, move up, and move down actions.
- [x] Build complexity segmented control.
- [x] Build generate, shuffle, reset, reveal all, and use-history-as-new actions.
- [x] Build SVG ladder board with participant buttons and result cards.
- [x] Build match summary with hidden and revealed states.
- [x] Build recent history list and detail restore behavior.
- [x] Add empty states for no generated ladder and no history.

## Animation And Polish

- [x] Animate ladder line drawing on generation.
- [x] Animate active route tracing.
- [x] Animate result reveal and reveal-all stagger.
- [x] Add visual distinction for selected, revealed, and hidden participants.
- [x] Add responsive layout and horizontal board scrolling.
- [x] Add reduced-motion CSS fallbacks.
- [x] Ensure long text does not overlap.

## Verification

- [x] Run `npm run build`.
- [x] Verify `/ladder` renders.
- [ ] Verify generation, reveal, reveal all, shuffle, reset, history restore, delete, and clear flows.
- [x] Report any unrelated build blockers.
