---
name: storage-upload
description: Azure Storage Upload app - SWA with managed Node.js functions and Blob Storage integration
category: azure
tags:
  - azure-static-web-apps
  - node.js-functions
  - blob-storage
  - sas-tokens
  - bicep
---

# Storage Upload Skill

Context and best practices for working with the **storage-upload** project — a temporary storage and scratchpad tool built on Azure Static Web Apps with managed Node.js functions.

## Product Philosophy

This app is **ephemeral by design**. Uploaded files auto-delete after 7 days. The scratchpad is a single overwritable text area — not a note-taking app. Do not add features that encourage hoarding, permanent storage, multiple notes, or organizational hierarchy. Think "clipboard bridge between devices."

## When to Use This Skill

- Adding features to API functions (getUploadUrl, getDownloadUrl, listFiles)
- Modifying frontend or SWA configuration
- Updating Bicep infrastructure
- Debugging SWA managed function issues
- Deploying to production via `swa deploy`

## Project at a Glance

| Component | Stack | Deployment |
|-----------|-------|-----------|
| Frontend | HTML/JS in `src/` | SWA static hosting |
| API | Node.js v3 functions | SWA managed functions |
| Storage | Azure Blob Storage | Bicep provisioned |
| IaC | Bicep modules | Subscription scope |

## Critical Constraints & Gotchas

### 1. **Node.js v3 Function Model Required**

SWA managed functions use the **v3 programming model** (function.json + index.js per function directory). The v4 model is **unreliable** on SWA.

```
✓ CORRECT (v3):
api/
  getUploadUrl/
    function.json
    index.js

✗ WRONG (v4):
api/
  getUploadUrl/
    index.ts with @azure/functions decorators
```

### 2. **Crypto Polyfill for Node.js 18**

Azure Storage Blob SDK v12.17+ requires `globalThis.crypto`, but SWA Node.js 18 doesn't have it natively.

**Already included in `api/shared/utils.js`:**

```javascript
if (!globalThis.crypto) {
  globalThis.crypto = require("crypto");
}
```

**Do NOT remove this.** It must run before `@azure/storage-blob` imports.

### 3. **`azd up` Does NOT Deploy Functions**

`azd provision` creates infrastructure, but `azd up` **only deploys frontend**.

**For production deployment, always use:**

```bash
swa deploy \
  --output-location src \
  --api-location api \
  --api-language node \
  --api-version 18 \
  --env production
```

Or use the deploy script: `.\scripts\deploy.ps1` (auto-loads token from `.azure/storage-upload/.env`).

> **CRITICAL:** The `--api-language node` and `--api-version 18` flags are **required**. Without them, SWA CLI silently fails (exit 0, no upload). Use `--output-location` instead of a positional argument.

### 4. **Navigation Fallback Excludes `/api/*`**

The frontend SPA fallback in `src/staticwebapp.config.json` must exclude API routes:

```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/api/*"]
  }
}
```

**This prevents `/api/*` routes from being caught by the SPA fallback.** Do NOT modify `exclude`.

### 5. **SWA Service Tag for azd**

The Bicep SWA resource must have the `'azd-service-name': 'web'` tag for `azd` discovery:

```bicep
tags: union(tags, {
  'azd-service-name': 'web'  // Required for azd
})
```

This is already set in `infra/modules/static-web-app.bicep`.

## Visual Style

All frontend work must follow `.github/instructions/style-guide.instructions.md`. Key rules:

- **Primary color:** Nintendo Red `#E60012` (hover: `#cc0010`, light bg: `#fef2f2`)
- **Font:** Inter (400, 500, 600, 700) — no other typefaces
- **Components:** Rounded corners, soft shadows, 44×44px min touch targets
- **File type icons:** Each category has a distinct colored background and icon color — preserve these when adding types
- **Mobile-first:** Responsive layout, thumb-friendly targets

## API Function Patterns

All functions follow the same structure:

1. **API Key Validation:**
   ```javascript
   const { validateApiKey } = require("../shared/utils");
   if (!validateApiKey(req)) {
     context.res = { status: 403, body: "Invalid API key" };
     return;
   }
   ```

2. **Storage Client Access:**
   ```javascript
   const { getStorageClients } = require("../shared/utils");
   const { sharedKeyCredential, accountName } = getStorageClients();
   ```

3. **SAS Token Generation (15 min default):**
   ```javascript
   const startsOn = new Date();
   const expiresOn = new Date(startsOn.getTime() + 15 * 60 * 1000);
   const sasToken = generateBlobSASQueryParameters(
     { containerName, blobName, permissions, startsOn, expiresOn },
     sharedKeyCredential
   ).toString();
   ```

## Existing Functions

| Function | Method | Description |
|----------|--------|-------------|
| `getUploadUrl` | POST | Generate a time-limited SAS upload URL |
| `getDownloadUrl` | GET | Generate a time-limited SAS download URL |
| `listFiles` | GET | List all blobs in the uploads container |
| `deleteFile` | DELETE | Delete a blob by name (returns 204 on success, 404 if not found) |
| `getScratchpad` | GET | Load the single scratchpad blob (returns content + version) |
| `saveScratchpad` | PUT | Save scratchpad with optimistic concurrency (version check, 409 on conflict) |

All functions require the `x-api-key` header and follow the same validation/client pattern.

## Adding a New Function

1. Create directory: `api/{functionName}/`
2. Copy `function.json` template from existing function (e.g., `getUploadUrl/function.json`)
3. Implement `index.js` following the pattern above
4. Function automatically registered in SWA routing

## Environment Variables & Secrets

| Variable | Source | Usage |
|----------|--------|-------|
| `AzureWebJobsStorage` | Bicep output | Storage connection string |
| `API_KEY` | `azure.env` (dev) or secret (prod) | Optional API key validation |
| `SWA_DEPLOYMENT_TOKEN` | SWA portal | `swa deploy` authentication |

## Testing Locally

```bash
# Requires Azure Functions Core Tools
cd api
npm install
export AzureWebJobsStorage="DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net"
func start --csharp-worker false
```

## Performance & Cost Notes

- **SAS Tokens:** 15-minute expiration balances security with UX (files accessible long enough to download)
- **Storage Tier:** Default hot tier; consider cool tier for archival files
- **Function Execution:** Billed per execution + compute time (typically <50ms per token generation)
- **Network:** Static content served from edge; functions invoke from closest region

## Common Issues & Fixes

### Issue: "globalThis.crypto is not defined"

**Cause:** Crypto polyfill missing or loading after storage-blob import.  
**Fix:** Ensure `api/shared/utils.js` crypto polyfill is at the top; import utils first:

```javascript
// ✓ CORRECT
const { getStorageClients } = require("../shared/utils");

// ✗ WRONG (imports storage-blob before polyfill)
const { BlobServiceClient } = require("@azure/storage-blob");
```

### Issue: "API functions returning 404"

**Cause:** `staticwebapp.config.json` missing `/api/*` exclusion.  
**Fix:** Verify `exclude` field contains `"/api/*"`.

### Issue: "azd up doesn't deploy functions"

**Cause:** Using `azd up` instead of `swa deploy`.  
**Fix:** Use `swa deploy --api-location api --env production` for production.

### Issue: "CORS errors from frontend"

**Cause:** SWA CORS not permitting blob storage domain.  
**Fix:** Update `staticwebapp.config.json` `responseOverrides` section (if needed) or use Azure Storage CORS settings.

## Deployment Checklist

- [ ] Functions use v3 model (function.json + index.js)
- [ ] No v4 decorators (@azure/functions)
- [ ] Crypto polyfill imported first in functions
- [ ] `staticwebapp.config.json` excludes `/api/*`
- [ ] SWA Bicep resource has `'azd-service-name': 'web'` tag
- [ ] API key set in `azure.env` or secrets
- [ ] Connection string available (from Bicep output)
- [ ] Using `swa deploy --api-location api` (not `azd up`)
- [ ] `--env production` flag for production

## References

- [SWA Managed Functions](https://learn.microsoft.com/en-us/azure/static-web-apps/functions-bring-your-own)
- [Azure Storage Blob SAS](https://learn.microsoft.com/en-us/azure/storage/blobs/sas-service-sas-how-to-create-generate-csharp)
- [Azure Storage JS SDK](https://github.com/Azure/azure-sdk-for-js/tree/main/sdk/storage/storage-blob)
- [Azure Functions Node.js v3 Model](https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node#nodejs-v3-programming-model)
