# Copilot Instructions

## Product Philosophy

**storage-upload** is a **temporary** storage and scratchpad tool. All content is ephemeral by design:

- **Uploaded files expire after 7 days** via an Azure Blob Storage lifecycle policy. Do not add features that assume permanent file retention.
- **The scratchpad is a single, overwritable text area** — not a note-taking app. There is intentionally only one scratchpad. Do not add multiple notes, note lists, folders, or organizational features.
- **Cross-device convenience is the goal.** Paste text or upload a file on one device, grab it on another, then let it disappear. Treat this app as a clipboard bridge, not a document manager.

When adding features, ask: "Does this keep the app simple and temporary?" If a feature encourages hoarding or permanent storage, it does not belong here.

## Project Overview

**storage-upload** is a secure file upload/download application built on Azure Static Web Apps with managed Node.js functions and Azure Blob Storage.

| Layer | Tech | Location |
|-------|------|----------|
| Frontend | HTML/JS | `src/` |
| API | Node.js v3 functions | `api/` |
| Infrastructure | Bicep | `infra/` |
| Deployment | SWA CLI | `scripts/deploy.ps1` |

## Key Rules

- **Functions must use Node.js v3 model** (function.json + index.js). The v4 model is unreliable on SWA managed functions.
- **Deploy with `swa deploy`**, not `azd up`. The `--api-language node` and `--api-version 18` flags are required.
- **Crypto polyfill** in `api/shared/utils.js` must load before any `@azure/storage-blob` import.
- **`staticwebapp.config.json`** must exclude `/api/*` from the navigation fallback.

## Style Guide

All frontend UI work must follow `.github/instructions/style-guide.instructions.md`:

- Primary color: Nintendo Red `#E60012`
- Font: Inter (Google Fonts)
- Rounded corners, soft shadows, 44×44px min touch targets
- File type icons use distinct colored backgrounds per category — preserve them
- Mobile-first responsive design

## Skills

See `.github/skills/storage-upload/SKILL.md` for detailed patterns, gotchas, and deployment checklists.
