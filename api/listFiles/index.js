const { validateApiKey, getStorageClients, CONTAINER_NAME } = require("../shared/utils");

module.exports = async function (context, req) {
  if (!validateApiKey(req)) {
    context.res = { status: 403, body: "Invalid API key" };
    return;
  }

  try {
    const { blobServiceClient } = getStorageClients();
    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

    const files = [];
    for await (const blob of containerClient.listBlobsFlat()) {
      files.push({
        name: blob.name,
        size: blob.properties.contentLength,
        lastModified: blob.properties.lastModified,
        contentType: blob.properties.contentType,
      });
    }

    files.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(files),
    };
  } catch (err) {
    context.log.error("listFiles error:", err);
    context.res = {
      status: 500,
      body: "Failed to list files",
    };
  }
};
