---
title: Notes Tab UX Drafts
description: Draft UX concepts and implementation recommendations for a cross-device quick notes tab in storage-upload
author: storage-upload team
ms.date: 2026-04-17
ms.topic: concept
keywords:
	- notes
	- ux
	- cross-device
	- static web apps
	- blob storage
estimated_reading_time: 8
---

## Goal

Design a Notes tab that makes it fast to paste text now and continue editing later on another computer or phone.

## Product Principles

* Optimize for speed of capture first
* Preserve edits safely across devices
* Avoid accidental overwrite during concurrent edits
* Keep mobile editing simple and thumb friendly
* Reuse existing app security and deployment patterns

## Recommended Architecture

* Store each note as a JSON document in Blob Storage
* Add dedicated note APIs instead of reusing file upload APIs
* Use optimistic concurrency with version checks (ETag or revision)
* Support autosave with clear status states
* Keep an offline local draft as a safety net when network fails

## Data Model Draft

* id: Short stable note identifier
* title: Optional title, fallback to first line
* content: Note body as plain text
* updatedAt: UTC timestamp
* version: Revision token for conflict detection
* deviceHint: Optional metadata for UX hints

## UX Draft A

Balanced split view for desktop with full-screen editor on mobile.

```text
Top tabs:
[ Upload ] [ Files ] [ Notes ]

Desktop layout:
+-----------------------------------------------------------+
| Notes                                                     |
| [ + New ]  [ Search................. ]  [ Paste ID ][Go] |
+---------------------------+-------------------------------+
| Recent                    | Editor                        |
| - Project TODO            | Title: [Project TODO       ]  |
| - Meeting 2026-04-17      | ----------------------------- |
| - Grocery ideas           | Body                          |
|                           | [ multiline text area      ]  |
|                           |                               |
|                           |                               |
|                           | ----------------------------- |
|                           | Status: Saved 12:41          |
|                           | [Save now] [Copy ID] [Del]   |
+---------------------------+-------------------------------+

Mobile layout:
1. Show recent notes list
2. Tap opens full-screen editor
3. Sticky footer actions: Save, Copy ID, Back
```

## UX Draft B

Fast capture workflow with minimal navigation.

```text
+-----------------------------------------------------------+
| Notes                                                     |
| [ + Quick Note ]                            Status: Saved |
+-----------------------------------------------------------+
| Today                                                     |
| [chip] Fix SWA deploy script flags                        |
| [chip] Test phone editing flow                            |
|                                                           |
| Current note                                              |
| --------------------------------------------------------- |
| Type or paste anything...                                 |
|                                                           |
|                                                           |
| --------------------------------------------------------- |
| [ Save ] [ Resume by ID ] [ Copy link ]                   |
+-----------------------------------------------------------+
```

## UX Draft C

Card grid for users managing many short notes.

```text
+-----------------------------------------------------------+
| Notes                             [ + New ] [ Search ]    |
+-----------------------------------------------------------+
| Pinned                                                    |
| +----------------+  +----------------+  +---------------+ |
| | Sprint plan    |  | API ideas      |  | Temp snippets | |
| | Updated 2h ago |  | Updated 5h ago |  | Updated 1d ago| |
| +----------------+  +----------------+  +---------------+ |
| All notes                                                 |
| +----------------+  +----------------+  +---------------+ |
| | ...            |  | ...            |  | ...           | |
+-----------------------------------------------------------+
```

## Critical Behaviors

### Autosave States

* Saving
* Saved
* Offline (local draft only)
* Conflict detected

### Conflict Handling Modal

```text
+-----------------------------------------------+
| This note changed on another device           |
|-----------------------------------------------|
| Your version                                  |
| [preview]                                     |
|                                               |
| Latest version                                |
| [preview]                                     |
|-----------------------------------------------|
| [Keep Mine As Copy] [Use Latest] [Merge Man.]|
+-----------------------------------------------+
```

## MVP Recommendation

### Phase 1

* Add Notes tab shell to the current UI
* Add notes list, single editor, and Save Now button
* Implement create, get, list, save APIs

### Phase 2

* Add debounced autosave
* Add save status indicator
* Add version check and conflict modal

### Phase 3

* Add resume by ID and copy link
* Add pinned notes and search
* Add markdown preview as optional enhancement

## Suggested Selection

Draft A is the best starting point for this project because it balances desktop productivity and mobile simplicity without adding extra complexity to the first implementation.

## Draft A Implementation Plan with Validation

This plan breaks Draft A into sequential tasks. Each task includes a validation checkpoint so completion is objective.

### Task 1: Define Notes API Contract

* Scope
	* Define request and response shapes for create, get, list, save, and delete note endpoints
	* Define concurrency field (`version`) and conflict response shape
* Validation
	* OpenAPI-style contract section added in this document or a dedicated API contract file
	* Each endpoint has at least one example request and response
	* Conflict response clearly specifies HTTP status and payload fields

### Task 2: Create Shared Notes Storage Utilities

* Scope
	* Add helper functions for note blob pathing, read, write, list, and metadata extraction
	* Reuse existing storage credential bootstrap from shared utilities
* Validation
	* Utility module exports are used by note functions with no duplicated storage bootstrap logic
	* Local static checks pass for the API project
	* No regression in existing upload and file APIs

### Task 3: Implement Create Note Function

* Scope
	* Add `POST /api/createNote`
	* Persist note JSON with generated `id`, `updatedAt`, and initial `version`
* Validation
	* Manual API call returns `201` with note object including `id` and `version`
	* Created note can be retrieved by id
	* Invalid payload returns `400`

### Task 4: Implement Get and List Note Functions

* Scope
	* Add `GET /api/getNote?id=...`
	* Add `GET /api/listNotes`
* Validation
	* `getNote` returns `200` for valid id and `404` for missing id
	* `listNotes` returns sorted results by `updatedAt` descending
	* Both endpoints enforce API key behavior consistent with existing functions

### Task 5: Implement Save Note with Optimistic Concurrency

* Scope
	* Add `PUT /api/saveNote`
	* Require client `version`, compare with current server version, and reject stale writes
* Validation
	* Save with latest version returns `200` and increments version
	* Save with stale version returns conflict status and server note snapshot
	* Conflict payload includes enough fields for UI merge decision

### Task 6: Implement Delete Note Function

* Scope
	* Add `DELETE /api/deleteNote?id=...`
* Validation
	* Existing note delete returns `204`
	* Missing note delete returns `404`
	* Deleted note no longer appears in `listNotes`

### Task 7: Add Notes Tab Shell in Frontend

* Scope
	* Add tab navigation for Upload, Files, Notes
	* Keep existing Upload and Files behavior intact
* Validation
	* User can switch among all three tabs without console errors
	* Existing upload and file list flows still function
	* Layout follows style rules for color, typography, and touch targets

### Task 8: Build Draft A Notes Layout

* Scope
	* Build Recent list pane + Editor pane on desktop
	* Build full-screen editor pattern on mobile
* Validation
	* Desktop breakpoint shows two-pane layout
	* Mobile breakpoint collapses to list then editor flow
	* Controls are usable with 44x44 minimum interactive targets

### Task 9: Wire Notes CRUD in UI

* Scope
	* Connect New, select note, Save now, Delete actions to APIs
	* Refresh recent list after each mutation
* Validation
	* Creating a note updates list and opens editor
	* Saving updates `updatedAt` and status text
	* Deleting removes note from list and resets editor state

### Task 10: Add Debounced Autosave and Save Status

* Scope
	* Add debounced autosave after editor changes
	* Show states: Saving, Saved, Offline, Conflict
* Validation
	* Typing triggers autosave only after debounce window
	* Save status transitions are visible and accurate
	* Network failure moves state to Offline without losing local text

### Task 11: Add Conflict Resolution UX

* Scope
	* Show conflict modal when save API reports stale version
	* Support actions: Keep Mine As Copy, Use Latest, Merge Manually
* Validation
	* Simulated dual-client edit produces conflict modal
	* Each action executes the expected follow-up behavior
	* No silent overwrite occurs when conflict is detected

### Task 12: Add Resume by ID and Copy ID Actions

* Scope
	* Add `Paste ID` input and `Go` action
	* Add `Copy ID` action in editor controls
* Validation
	* Pasting valid id opens target note
	* Invalid id shows clear error feedback
	* Copy action places id on clipboard in supported browsers

### Task 13: Regression and Accessibility Pass

* Scope
	* Validate legacy features and new Notes tab accessibility basics
* Validation
	* Upload, list files, download, and delete file flows still pass manual checks
	* Keyboard navigation works across Notes actions
	* Labels and status text are announced correctly by accessibility tooling checks

## Validation Matrix

| Area | Minimum validation method | Pass criteria |
| --- | --- | --- |
| API behavior | Manual endpoint checks with sample payloads | Expected status codes and payload shapes |
| Concurrency | Two-client conflict simulation | Stale writes rejected and conflict UI triggered |
| Frontend UX | Desktop and mobile manual walkthrough | Draft A layout and flows behave as designed |
| Regression | Existing file upload flows | No breakage in current features |
| Accessibility | Keyboard and semantic checks | Core interactions reachable and understandable |

## Recommended Execution Order

1. Complete tasks 1-6 (API foundation)
2. Complete tasks 7-9 (UI shell and CRUD wiring)
3. Complete tasks 10-12 (autosave, conflict handling, resume by id)
4. Complete task 13 (final validation and polish)
