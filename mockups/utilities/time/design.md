# Design: Time Converter

## Route And Naming
- Page file: `app/time/page.tsx`
- Client file: `app/time/time-client.tsx`

## Information Architecture
- Intro panel with detected source and local zone.
- Workbench with:
  - Timestamp/date input.
  - Quick current-time actions.
  - Local date-time apply controls.
  - Date math controls.
  - Converted facts.
  - Timezone comparison rows.

## State Model
- `input: string`
- `localValue: string`
- `amount: number`
- `unit: TimeUnit`
- `copyState: "idle" | "copied" | "failed"`

## Implementation Notes
- Use native `Date` and `Intl.DateTimeFormat`.
- Treat 12+ digit numeric input as milliseconds and smaller numeric input as seconds.
- Keep all conversion browser-local.
