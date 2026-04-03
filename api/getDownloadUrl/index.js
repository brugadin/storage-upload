const { generateBlobSASQueryParameters, BlobSASPermissions } = require("@azure/storage-blob");
const { validateApiKey, getStorageClients, CONTAINER_NAME } = require("../shared/utils");

module.exports = async function (context, req) {
  if (!validateApiKey(req)) {
    context.res = { status: 403, body: "Invalid API key" };
    return;
  }

  const blobName = req.query.name;
  if (!blobName) {
    context.res = { status: 400, body: "Missing 'name' query parameter" };
    return;
  }

  const { sharedKeyCredential, accountName } = getStorageClients();

  const startsOn = new Date();
  const expiresOn = new Date(startsOn.getTime() + 15 * 60 * 1000);

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName: CONTAINER_NAME,
      blobName,
      permissions: BlobSASPermissions.parse("r"),
      startsOn,
      expiresOn,
    },
    sharedKeyCredential
  ).toString();

  const downloadUrl = `https://${accountName}.blob.core.windows.net/${CONTAINER_NAME}/${blobName}?${sasToken}`;

  context.res = {
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ downloadUrl, expiresOn: expiresOn.toISOString() }),
  };
};
