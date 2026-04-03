const { generateBlobSASQueryParameters, BlobSASPermissions } = require("@azure/storage-blob");
const { validateApiKey, getStorageClients, CONTAINER_NAME } = require("../shared/utils");

module.exports = async function (context, req) {
  if (!validateApiKey(req)) {
    context.res = { status: 403, body: "Invalid API key" };
    return;
  }

  const filename = req.body?.filename;
  if (!filename || typeof filename !== "string") {
    context.res = { status: 400, body: "Missing or invalid 'filename'" };
    return;
  }

  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const safeName = sanitized.replace(/\.\./g, "_");
  const blobName = `${Date.now()}-${safeName}`;

  const { sharedKeyCredential, accountName } = getStorageClients();

  const startsOn = new Date();
  const expiresOn = new Date(startsOn.getTime() + 15 * 60 * 1000);

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName: CONTAINER_NAME,
      blobName,
      permissions: BlobSASPermissions.parse("cw"),
      startsOn,
      expiresOn,
    },
    sharedKeyCredential
  ).toString();

  const uploadUrl = `https://${accountName}.blob.core.windows.net/${CONTAINER_NAME}/${blobName}?${sasToken}`;

  context.res = {
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uploadUrl, blobName, expiresOn: expiresOn.toISOString() }),
  };
};
