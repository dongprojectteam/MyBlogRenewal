---
name: utility-builder-workflow
description: Plan and implement new utilities for this project end-to-end using a strict document-first workflow. Use when the user asks to create a utility/tool/feature page. Always generate a best-fit utility name, create a routeable slug, write requirements.md, design.md, and todo.md, then implement strictly from those documents and expose the utility at /<slug> in the existing Next.js app router.
---

# Utility Builder Workflow

Follow this workflow exactly when creating a new utility.

## 1) Derive Name And Slug

- Infer the most suitable utility name from user intent.
- Create a route slug using lowercase letters, digits, and hyphens only.
- Keep slug concise and descriptive.
- Target route must be `/slug`.

## 2) Create Utility Directory

- Create a utility workspace directory under `mockups/utilities/<slug>/`.
- All planning documents for the utility must be stored in this directory.

Required files:
- `mockups/utilities/<slug>/requirements.md`
- `mockups/utilities/<slug>/design.md`
- `mockups/utilities/<slug>/todo.md`

## 3) Write Rich Requirements (`requirements.md`)

- Expand user intent into a feature-rich, concrete requirements set.
- Include functional requirements, UX behaviors, edge cases, accessibility, and non-functional constraints.
- Include acceptance criteria that are testable.
- Prefer clear bullet lists and concise sections.

Minimum sections:
- Overview
- User Goals
- Core Features
- Detailed Behaviors
- Edge Cases
- Accessibility
- Performance/Quality Constraints
- Acceptance Criteria

## 4) Produce Design (`design.md`)

- Convert requirements into implementation-oriented design.
- Map each requirement to architecture, data flow, and component structure.
- Include mermaid diagrams when useful (flow, state, or structure).
- Specify route path, page layout, component boundaries, state model, validation rules, and error handling.

Minimum sections:
- Route And Naming
- Information Architecture
- UI Structure
- Interaction Flow
- State Model
- Validation And Errors
- Implementation Notes

## 5) Generate Complete TODO (`todo.md`)

- Create an implementation checklist that fully covers the design.
- The TODO must reflect every design area without omission.
- Use markdown checkboxes with small, verifiable tasks.
- Order tasks logically: scaffolding -> UI -> logic -> validation -> polish -> verification.

## 6) Implement Only From The Documents

- Before coding, re-read `requirements.md`, `design.md`, and `todo.md`.
- Implement according to TODO order.
- Do not invent major scope outside these files unless the user asks.
- If scope changes, update docs first, then continue implementation.

## 7) Ensure Route Availability

- Create Next.js app router page at `app/<slug>/page.tsx` so utility is reachable at `/<slug>`.
- Follow existing project patterns and shared styles in `app/globals.css` and existing components.
- If needed, add or update entries so the utility can be discovered from the home utilities list according to current project data flow.

## 8) Verification

- Confirm the route renders and core interactions work.
- Run available build/type checks when feasible.
- Report what was implemented against TODO items and list any gaps.

## Output Convention

When using this skill, explicitly report:
- Chosen utility name
- Chosen slug and route
- Paths to requirements/design/todo files
- Implementation files touched
- Verification results
