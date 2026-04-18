const { validateApiKey, getStorageClients, NOTES_CONTAINER_NAME } = require("../shared/utils");

module.exports = async function (context, req) {
  if (!validateApiKey(req)) {
    context.res = { status: 403, body: "Invalid API key" };
    return;
  }

  const ver = parseInt(req.query.version, 10);
  if (!ver || ver < 1) {
    context.res = { status: 400, body: "Invalid version number" };
    return;
  }

  try {
    const { blobServiceClient } = getStorageClients();
    const containerClient = blobServiceClient.getContainerClient(NOTES_CONTAINER_NAME);
    const blobClient = containerClient.getBlockBlobClient(`history/v${ver}.json`);

    const exists = await blobClient.exists();
    if (!exists) {
      context.res = { status: 404, body: "Version not found" };
      return;
    }

    const downloadResponse = await blobClient.download(0);
    const chunks = [];
    for await (const chunk of downloadResponse.readableStreamBody) {
      chunks.push(chunk);
    }
    const data = JSON.parse(Buffer.concat(chunks).toString("utf-8"));

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: data.content || "",
        version: data.version,
        savedAt: data.savedAt,
      }),
    };
  } catch (err) {
    context.log.error("getScratchpadVersion error:", err);
    context.res = { status: 500, body: "Failed to load version" };
  }
};
