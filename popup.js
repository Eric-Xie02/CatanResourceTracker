function renderResources(resources) {
  for (const [res, count] of Object.entries(resources)) {
    const el = document.getElementById(res);
    if (el) el.textContent = count;
  }
}

chrome.storage.local.get("opponentResources", (data) => {
  console.log("Storage on open:", data);
  if (data.opponentResources) renderResources(data.opponentResources);
});

chrome.storage.onChanged.addListener((changes, area) => {
  console.log("Storage changed:", area, changes);
  if (area === "local" && changes.opponentResources) {
    renderResources(changes.opponentResources.newValue);
  }
});
