const openStudioButton = document.querySelector("#openStudio");

openStudioButton?.addEventListener("click", async () => {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabId = activeTab?.id;
  const studioUrl = chrome.runtime.getURL(
    `studio.html${Number.isInteger(tabId) ? `?targetTabId=${tabId}` : ""}`
  );
  await chrome.tabs.create({ url: studioUrl });
  window.close();
});
