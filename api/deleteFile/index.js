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

  const { blobServiceClient } = getStorageClients();
  const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
  const blobClient = containerClient.getBlobClient(blobName);

  const exists = await blobClient.exists();
  if (!exists) {
    context.res = { status: 404, body: "File not found" };
    return;
  }

  await blobClient.delete();

  context.res = { status: 204 };
};
