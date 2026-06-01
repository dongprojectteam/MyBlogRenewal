# Design: Calendar Memo

## Route And Naming
- Route: `/calendar`
- Page file: `app/calendar/page.tsx`
- Client file: `app/calendar/calendar-client.tsx`
- API route: `app/api/holidays/route.ts`

## Information Architecture
- Shared `SiteHeader`.
- Main panel containing:
  - Calendar toolbar.
  - Year, month, and week controls.
  - Holiday loading/error notices.
  - Month grid.
  - Selected-date memo editor.
  - Saved memo list.

## State Model
- `currentMonth: Date`
- `holidays: Record<string, string[]>`
- `memos: Record<string, string>`
- `hasLoadedMemos: boolean`
- `memoStorageError: string`
- `selectedDateKey: string`
- `isLoadingHoliday: boolean`
- `holidayError: string`

## Data Flow
1. Client loads memos from `localStorage`.
2. Current month changes trigger `/api/holidays?year=YYYY&month=MM`.
3. API route validates parameters and requires `HOLIDAY_SERVICE_KEY`.
4. Memo edits update the selected date key and persist after storage load.

## Implementation Notes
- Keep holiday service key in environment variables.
- Do not write the initial empty memo object before stored memos load.
- Keep memo storage failures visible but non-fatal.
- Keep all memo data browser-local.
