const { validateApiKey, getStorageClients, NOTES_CONTAINER_NAME } = require("../shared/utils");

const SCRATCHPAD_BLOB = "scratchpad.json";

module.exports = async function (context, req) {
  if (!validateApiKey(req)) {
    context.res = { status: 403, body: "Invalid API key" };
    return;
  }

  try {
    const body = req.body || {};
    const { content, version } = body;

    if (typeof version !== "number") {
      context.res = { status: 400, body: "Missing or invalid 'version' in request body" };
      return;
    }

    const { blobServiceClient } = getStorageClients();
    const containerClient = blobServiceClient.getContainerClient(NOTES_CONTAINER_NAME);
    await containerClient.createIfNotExists();

    const blobClient = containerClient.getBlockBlobClient(SCRATCHPAD_BLOB);
    const blobExists = await blobClient.exists();

    // Optimistic concurrency: check current version
    let currentVersion = 0;
    let currentData = null;
    if (blobExists) {
      const downloadResponse = await blobClient.download(0);
      const chunks = [];
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(chunk);
      }
      currentData = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
      currentVersion = currentData.version || 0;

      if (currentVersion !== version) {
        context.res = {
          status: 409,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            error: "conflict",
            message: "Scratchpad was modified by another session",
            serverContent: currentData.content || "",
            serverVersion: currentData.version,
          }),
        };
        return;
      }
    }

    // Archive current version to history before overwriting
    if (currentData && currentVersion > 0) {
      try {
        const historyBlobName = `history/v${currentVersion}.json`;
        const historyClient = containerClient.getBlockBlobClient(historyBlobName);
        const archivePayload = JSON.stringify({
          content: currentData.content || "",
          version: currentVersion,
          savedAt: currentData.updatedAt || new Date().toISOString(),
        });
        await historyClient.upload(archivePayload, Buffer.byteLength(archivePayload), {
          blobHTTPHeaders: { blobContentType: "application/json" },
        });

        // Prune: keep only the most recent 30 versions
        const historyBlobs = [];
        for await (const blob of containerClient.listBlobsFlat({ prefix: "history/" })) {
          historyBlobs.push(blob.name);
        }
        if (historyBlobs.length > 30) {
          historyBlobs.sort((a, b) => {
            const aNum = parseInt(a.match(/v(\d+)/)[1], 10);
            const bNum = parseInt(b.match(/v(\d+)/)[1], 10);
            return aNum - bNum;
          });
          const toDelete = historyBlobs.slice(0, historyBlobs.length - 30);
          for (const name of toDelete) {
            await containerClient.getBlockBlobClient(name).deleteIfExists();
          }
        }
      } catch (archiveErr) {
        context.log.warn("Failed to archive version:", archiveErr.message);
      }
    }

    const now = new Date().toISOString();
    const updated = {
      content: content !== undefined ? content : "",
      updatedAt: now,
      version: currentVersion + 1,
    };

    const padJson = JSON.stringify(updated);
    await blobClient.upload(padJson, Buffer.byteLength(padJson), {
      blobHTTPHeaders: { blobContentType: "application/json" },
    });

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    };
  } catch (err) {
    context.log.error("saveScratchpad error:", err);
    context.res = { status: 500, body: "Failed to save scratchpad" };
  }
};
