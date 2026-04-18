# Storage Upload

A temporary storage and scratchpad tool. Upload a file or paste text on one device, grab it on another, then let it disappear. Files auto-delete after 7 days. The scratchpad is a single overwritable text area.

## Architecture

```
┌─────────────────────────┐
│   Static Web App        │
│  ├─ src/ (frontend)     │
│  └─ api/ (functions)    │
└────────┬────────────────┘
         │
         └──> Azure Storage
              ├─ uploads   (7-day lifecycle policy)
              └─ notes     (scratchpad blob)
```

- **Frontend:** HTML/JavaScript in `src/` with three tabs: Upload, Files, Scratchpad
- **API:** Node.js managed functions for SAS tokens, file management, and scratchpad CRUD
- **Storage:** Azure Blob Storage with lifecycle management

## Project Structure

```
├── azure.yaml                 # azd configuration
├── src/                       # Static frontend
│   ├── index.html
│   └── staticwebapp.config.json
├── api/                       # Node.js v3 model functions
│   ├── package.json
│   ├── host.json
│   ├── shared/
│   │   └── utils.js          # Storage clients, crypto polyfill
│   ├── getUploadUrl/          # Generate upload SAS token
│   ├── getDownloadUrl/        # Generate download SAS token
│   ├── listFiles/             # List files in container
│   ├── deleteFile/            # Delete a file by name
│   ├── getScratchpad/         # Load the single scratchpad
│   └── saveScratchpad/        # Save scratchpad with version check
└── infra/                     # Bicep infrastructure
    ├── main.bicep
    ├── main.parameters.json
    └── modules/
        ├── storage.bicep      # Storage account + lifecycle policy
        └── static-web-app.bicep
```

## Key Features

- **Temporary storage:** Uploaded files auto-delete after 7 days via blob lifecycle policy
- **Scratchpad:** Single overwritable text area with autosave, optimistic concurrency, and conflict resolution
- **SAS Token Generation:** Time-limited tokens (15 min) for secure blob access
- **API Key Protection:** Optional API key header validation
- **Cross-device:** Paste text or upload a file on one device, access on another

## Endpoints

- `POST /api/getUploadUrl` - Generate upload token
  - Request: `{ "filename": "..." }`
  - Response: `{ "uploadUrl": "...", "blobName": "...", "expiresOn": "..." }`

- `GET /api/getDownloadUrl?name=<blobName>` - Generate download token
  - Response: `{ "downloadUrl": "...", "expiresOn": "..." }`

- `GET /api/listFiles` - List uploaded files
  - Response: Array of blob metadata

- `DELETE /api/deleteFile?name=<blobName>` - Delete a file
  - Response: `204 No Content` on success, `404` if not found

- `GET /api/getScratchpad` - Load scratchpad
  - Response: `{ "content": "...", "version": N, "updatedAt": "..." }`

- `PUT /api/saveScratchpad` - Save scratchpad
  - Request: `{ "content": "...", "version": N }`
  - Response: `{ "content": "...", "version": N+1, "updatedAt": "..." }`
  - `409` on version conflict with `{ "serverContent": "...", "serverVersion": N }`

## Configuration

### Environment Variables

- `AzureWebJobsStorage` - Storage connection string (provided by azd)
- `API_KEY` - Optional API key for protecting endpoints (x-api-key header)

### Storage

- Containers: `uploads` (files, 7-day auto-delete), `notes` (scratchpad)
- Filenames sanitized to alphanumeric + `._-`
- Blobs named: `{timestamp}-{sanitized-filename}`
- Lifecycle policy deletes uploads older than 7 days automatically

## SWA Managed Functions Notes

⚠️ **Important:** Use Azure CLI `swa deploy` for deploying managed functions, not `azd up`.

```bash
# Deploy with functions
swa deploy \
  --deployment-token "$SWA_DEPLOYMENT_TOKEN" \
  --api-location api \
  --env production
```

### Key Gotchas

1. **Node.js v18 Crypto:** Polyfill in `shared/utils.js` handles `globalThis.crypto`
2. **Route Fallback:** `staticwebapp.config.json` excludes `/api/*` from SPA fallback
3. **Function Model:** v3 model (function.json + index.js) used; v4 model unstable on SWA
4. **Build:** `azd` doesn't package functions; requires manual `swa deploy`

## Development

```bash
# Install dependencies
cd api && npm install

# Local Azure Storage Emulator or connection string
export AzureWebJobsStorage="..."

# Run functions locally (requires Azure Functions Core Tools)
func start --csharp-worker false
```

## Deployment

### Initial Setup

```bash
azd init -t https://github.com/brugadin/storage-upload
azd env new production
azd provision
```

### Deploy Functions + Frontend

```bash
# Build static frontend
cd src && npm run build

# Deploy using SWA CLI
swa deploy \
  --deployment-token "${{ secrets.SWA_DEPLOYMENT_TOKEN }}" \
  --api-location api \
  --env production
```

### Update Bicep Infrastructure

```bash
az deployment sub create \
  --template-file infra/main.bicep \
  --parameters infra/main.parameters.json \
  --location eastus
```

## Security Considerations

- SAS tokens limited to 15 minutes
- Filenames sanitized against path traversal
- Optional API key authentication
- Storage account keys never exposed in frontend
- Azure Managed Identity recommended in production

## References

- [Azure Storage Blob SAS](https://learn.microsoft.com/en-us/azure/storage/blobs/sas-service-sas-how-to-create-generate-csharp)
- [SWA Managed Functions](https://learn.microsoft.com/en-us/azure/static-web-apps/functions-bring-your-own)
- [Static Web App Config](https://learn.microsoft.com/en-us/azure/static-web-apps/configuration)
