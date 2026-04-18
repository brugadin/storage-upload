const { validateApiKey, getStorageClients, NOTES_CONTAINER_NAME } = require("../shared/utils");

const SCRATCHPAD_BLOB = "scratchpad.json";

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
        body: JSON.stringify({ content: "", version: 0 }),
      };
      return;
    }

    const blobClient = containerClient.getBlobClient(SCRATCHPAD_BLOB);
    const blobExists = await blobClient.exists();
    if (!blobExists) {
      context.res = {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "", version: 0 }),
      };
      return;
    }

    const downloadResponse = await blobClient.download(0);
    const chunks = [];
    for await (const chunk of downloadResponse.readableStreamBody) {
      chunks.push(chunk);
    }
    const pad = JSON.parse(Buffer.concat(chunks).toString("utf-8"));

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: pad.content || "",
        version: pad.version || 1,
        updatedAt: pad.updatedAt,
      }),
    };
  } catch (err) {
    context.log.error("getScratchpad error:", err);
    context.res = { status: 500, body: "Failed to load scratchpad" };
  }
};
