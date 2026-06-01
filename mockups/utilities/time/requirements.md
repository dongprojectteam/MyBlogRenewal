# Requirements: Time Converter

## Overview
- Utility name: Time Converter
- Slug: `time`
- Route: `/time`
- Goal: Convert Unix timestamps, ISO/date strings, local date-time input, UTC, KST, and common time zones.

## Core Features
- Timestamp or date-string input.
- Quick actions for current milliseconds, seconds, and ISO.
- Local `datetime-local` input with apply action.
- Date math amount and unit controls.
- Converted facts: Unix seconds, Unix milliseconds, relative time, ISO.
- Common timezone comparison list.
- Copy ISO action.

## Edge Cases
- Empty input.
- Invalid timestamp or date string.
- Very large timestamp.
- Invalid local date-time input.
- Clipboard failure.

## Acceptance Criteria
- `/time` renders in the app shell.
- Current time quick actions populate valid values.
- Timestamp and ISO inputs convert correctly.
- Date math preview updates with amount and unit.
- Build passes.
