# Requirements: Calendar Memo

## Overview
- Utility name: Calendar Memo
- Slug: `calendar`
- Route: `/calendar`
- Goal: Provide a browser calendar with Korean public holiday lookup and per-date local memos.

## User Goals
- Move between months, years, and ISO weeks.
- See Korean public holidays in the calendar grid.
- Select a date and write a memo that remains after reload.
- Reopen saved memo dates quickly from a list.

## Core Features
- Monthly calendar with Monday-first weeks and ISO week numbers.
- Previous month, next month, today, year, month, and week navigation.
- Korean holiday fetch through `/api/holidays`.
- Browser `localStorage` memo persistence.
- Saved memo list with date, week number, and preview text.
- Page metadata, JSON-LD, sitemap entry, seed entry, and preview image.

## Detailed Behaviors
- The selected date defaults to today.
- Memo text is saved per `YYYY-MM-DD` key.
- Empty memo text removes the saved memo.
- Corrupt memo storage is ignored and cleared.
- Storage read/write failures show a visible non-blocking notice.
- Holiday API requires `HOLIDAY_SERVICE_KEY`.
- Holiday fetch failures show a visible error without breaking memo editing.

## Edge Cases
- Invalid localStorage payload.
- Browser storage quota or private browsing failures.
- Missing holiday API key.
- Holiday API upstream failure.
- Leap years and months spanning five or six calendar rows.

## Acceptance Criteria
- `/calendar` renders in the app shell.
- Calendar navigation updates the grid correctly.
- Memos persist across reloads when storage is available.
- Storage failures are reported.
- Holiday data loads when `HOLIDAY_SERVICE_KEY` is configured.
- Build passes.
