// Polyfill globalThis.crypto for Node.js 18 in SWA managed functions
if (!globalThis.crypto) {
  globalThis.crypto = require("crypto");
}

const {
  BlobServiceClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  StorageSharedKeyCredential,
} = require("@azure/storage-blob");

const CONTAINER_NAME = "uploads";
const NOTES_CONTAINER_NAME = "notes";

function validateApiKey(req) {
  const expected = process.env.API_KEY;
  if (!expected) return true;
  const provided = req.headers["x-api-key"];
  return provided === expected;
}

function parseConnectionString(cs) {
  const parts = {};
  cs.split(";").forEach((p) => {
    const idx = p.indexOf("=");
    if (idx > -1) parts[p.substring(0, idx)] = p.substring(idx + 1);
  });
  return parts;
}

function getStorageClients() {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  const parsed = parseConnectionString(connectionString);
  const sharedKeyCredential = new StorageSharedKeyCredential(
    parsed["AccountName"],
    parsed["AccountKey"]
  );
  return { blobServiceClient, sharedKeyCredential, accountName: parsed["AccountName"] };
}

module.exports = { validateApiKey, getStorageClients, CONTAINER_NAME, NOTES_CONTAINER_NAME };
