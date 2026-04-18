// src/models.ts
async function fetchModels(endpointUrl, apiKey) {
  const base = endpointUrl.trim().replace(/\/+$/, "");
  if (!base) return [];
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  for (const path of ["/models", "/v1/models"]) {
    try {
      const res = await fetch(`${base}${path}`, { method: "GET", headers });
      if (!res.ok) continue;
      const data = await res.json();
      if (data?.data && Array.isArray(data.data)) {
        return data.data.map((m) => m.id).filter((id) => typeof id === "string" && id.length > 0).sort();
      }
    } catch {
    }
  }
  return [];
}

export {
  fetchModels
};
