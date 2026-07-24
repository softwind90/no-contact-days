document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-share-tool]");
  if (!button) return;

  const url = button.dataset.shareUrl || location.href;
  const title = button.dataset.shareTitle || document.title;
  const status = button.parentElement?.parentElement?.querySelector("[data-share-status]") || button.parentElement?.querySelector("[data-share-status]");

  try {
    if (navigator.share) {
      await navigator.share({ title, text: title, url });
      if (status) status.textContent = "Thanks for sharing this free tool.";
      window.trackEvent?.("free_tool_shared", { tool: button.dataset.shareTool, method: "native" });
      return;
    }

    await navigator.clipboard.writeText(url);
    if (status) status.textContent = "Tool link copied. You can share it anywhere.";
    window.trackEvent?.("free_tool_shared", { tool: button.dataset.shareTool, method: "copy" });
  } catch (error) {
    if (error?.name === "AbortError") return;
    if (status) status.textContent = `Copy this link: ${url.replace(/^https:\/\/www\./, "")}`;
  }
});
