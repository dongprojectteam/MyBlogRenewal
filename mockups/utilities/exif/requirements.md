# EXIF Toolkit Requirements

## Overview

EXIF Toolkit is a browser-only photo metadata utility available at `/exif`. It lets users inspect, clean, transform, and export image metadata without uploading files to a server. The initial target is common web photo workflows: JPEG metadata reading/editing, privacy cleanup, timestamp correction, GPS review, and batch export.

## User Goals

- Inspect photo metadata before publishing or sharing images.
- Remove sensitive metadata, especially GPS, camera serials, creator fields, and embedded descriptions.
- Correct capture timestamps after timezone or camera clock mistakes.
- Convert GPS EXIF coordinates into decimal coordinates and map links.
- Export a cleaned or adjusted copy of one image or a ZIP for many images.
- Keep the workflow local, understandable, and reversible.

## Core Features

- Multi-file image upload by file picker and drag/drop.
- Client-side parsing for JPEG and other browser-readable image formats.
- Metadata summary with file facts, image dimensions, MIME type, size, capture date, camera/lens, orientation, GPS, copyright/artist, software, and privacy risk flags.
- Search/filter over metadata keys and values.
- Raw metadata table with copyable key/value rows.
- GPS tools:
  - Decimal latitude/longitude display.
  - Google Maps and OpenStreetMap links.
  - GPS privacy warning.
  - Remove GPS from export.
- Date tools:
  - Show original capture date when available.
  - Shift capture date by hours/minutes.
  - Set exact capture date/time.
  - Apply date changes to supported JPEG EXIF exports.
- Text fields for supported JPEG metadata:
  - Artist.
  - Copyright.
  - Image description.
  - Software.
- Privacy presets:
  - Keep image, strip all metadata by canvas re-encode.
  - Remove GPS and risky identity fields where JPEG EXIF editing is supported.
  - Normalize orientation by canvas re-encode.
- Export options:
  - JPEG metadata-preserving edit export where supported.
  - Canvas re-encode export to JPEG, PNG, or WebP.
  - JPEG/WebP quality control.
  - Single download for one selected file.
  - ZIP download for multiple processed files.
- Privacy mode status explaining whether processing is local.

## Detailed Behaviors

- The first uploaded file becomes selected automatically.
- Unsupported or unreadable files remain in the list with an error state.
- File object URLs are revoked when files are replaced or the component unmounts.
- Metadata parsing is asynchronous and should not freeze the UI for normal image batches.
- The summary should degrade gracefully when metadata is missing.
- Privacy risk flags should be derived from metadata presence:
  - High: GPS coordinates.
  - Medium: serial number, owner/artist/copyright, exact capture date, software.
  - Low: camera model, lens model, dimensions, color profile.
- "Remove all metadata" uses canvas re-encoding because it works across browser-decodable formats.
- JPEG EXIF editing should keep image bytes and modify EXIF only when the source is JPEG and the metadata library can write the requested fields.
- If a requested edit cannot be applied safely to the current file type, the UI should show the limitation and offer canvas re-encode instead.
- Batch export should apply the current export options to every successfully loaded file.

## Edge Cases

- File has no EXIF metadata.
- File has malformed or partial EXIF data.
- File is a PNG/WebP/HEIC that the browser can preview but cannot receive EXIF edits.
- File has a large resolution that may fail canvas export.
- GPS contains hemisphere refs or decimal values in different shapes.
- Capture date exists only in one of several common fields.
- Multiple files share the same base name.
- Clipboard or download APIs may fail.
- Browser does not support WebP canvas export.

## Accessibility

- Upload zone is keyboard reachable through a visible file input.
- Interactive controls have labels and disabled states.
- Status messages use text, not color alone.
- Metadata tables are readable with column headers.
- Buttons and tabs keep stable sizes and visible focus outlines from the global styles.

## Performance/Quality Constraints

- All processing must happen in the browser; no server API route should receive image bytes.
- Avoid unnecessary re-parsing when only display filters change.
- Use object URLs for previews, not base64 previews.
- Keep canvas export quality adjustable and default to a conservative value.
- Prefer established metadata/ZIP libraries over hand-written binary parsing.
- The page must compile under the existing strict TypeScript settings.

## Acceptance Criteria

- `/exif` renders inside the existing Next.js app shell.
- A user can add one or more photos and see a selected preview plus metadata summary.
- A user can identify whether GPS metadata exists and open map links when coordinates are present.
- A user can search raw metadata.
- A user can remove all metadata by exporting through canvas re-encode.
- A user can remove GPS/risky JPEG EXIF fields and download the edited JPEG when supported.
- A user can shift or set capture date metadata for supported JPEG exports.
- A user can export one processed file or a ZIP of all successfully loaded files.
- The home utility list can discover the new tool.
- Page metadata and sitemap visibility are covered like other public utilities.
- `npm run build` succeeds.
