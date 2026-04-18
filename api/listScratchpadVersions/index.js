const { validateApiKey, getStorageClients, NOTES_CONTAINER_NAME } = require("../shared/utils");

module.exports = async function (context, req) {
  if (!validateApiKey(req)) {
    context.res = { status: 403, body: "Invalid API key" };
    return;
  }

  try {
    const { blobServiceClient } = getStorageClients();
    const containerClient = blobServiceClient.getContainerClient(NOTES_CONTAINER_NAME);

    const exists = await containerClient.exists();
    if (!exists) {
      context.res = {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([]),
      };
      return;
    }

    const versions = [];
    for await (const blob of containerClient.listBlobsFlat({ prefix: "history/" })) {
      const match = blob.name.match(/history\/v(\d+)\.json$/);
      if (!match) continue;

      // Download each version to get content preview and savedAt
      const blobClient = containerClient.getBlockBlobClient(blob.name);
      const downloadResponse = await blobClient.download(0);
      const chunks = [];
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(chunk);
      }
      const data = JSON.parse(Buffer.concat(chunks).toString("utf-8"));

      versions.push({
        version: parseInt(match[1], 10),
        savedAt: data.savedAt || blob.properties.lastModified?.toISOString(),
        preview: (data.content || "").substring(0, 120),
      });
    }

    versions.sort((a, b) => b.version - a.version);

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(versions),
    };
  } catch (err) {
    context.log.error("listScratchpadVersions error:", err);
    context.res = { status: 500, body: "Failed to list versions" };
  }
};
