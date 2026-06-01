# Requirements: Codec Toolkit

## Overview
- Utility name: Codec Toolkit
- Slug: `codec`
- Route: `/codec`
- Goal: Provide a browser scratchpad for JSON formatting, URL encoding, Base64 conversion, and JWT inspection.

## Core Features
- Modes: JSON, URL, Base64, JWT.
- Sample input per mode.
- JSON format, minify, escape, and unescape actions.
- URL encode and decode actions.
- UTF-8 Base64 encode and decode actions.
- JWT header and payload decode without signature verification.
- Copy output action.
- Facts panel for useful metadata.

## Edge Cases
- Invalid JSON.
- Invalid URL percent encoding.
- Invalid Base64 or JWT segments.
- Empty input.
- Clipboard failure.

## Acceptance Criteria
- `/codec` renders inside the app shell.
- Each mode can process the built-in sample.
- Invalid inputs show readable errors.
- JWT output clearly represents decoded header and payload only.
- Build passes.
