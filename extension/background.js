// Right-click an image -> "Check with First Seen" -> the result opens in a new tab.
// WhatsApp Web and many apps show images as blob: URLs that only the page can read,
// so the image bytes are read inside the page and uploaded, not passed as a link.

const API = "http://localhost:8000"; // First Seen backend
const APP = "http://localhost:3000"; // First Seen web app

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "first-seen", title: "Check with First Seen", contexts: ["image"] });
});

// Runs in the page: ask what the forward claims. Optional; Cancel or empty means no claim.
function askClaim() {
  return window.prompt("First Seen: what does the message say this photo shows? (optional)", "") || "";
}

// Runs in the page: read an image the page can see, as a data: URL.
async function readImage(src) {
  const blob = await (await fetch(src)).blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function inPage(tabId, func, args = []) {
  const [{ result }] = await chrome.scripting.executeScript({ target: { tabId }, func, args });
  return result;
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "first-seen" || !info.srcUrl || !tab?.id) return;
  const form = new FormData();
  try {
    const claim = await inPage(tab.id, askClaim);
    if (claim.trim()) form.append("claim", claim.trim());
    if (/^https?:/.test(info.srcUrl)) {
      form.append("image_url", info.srcUrl);
    } else {
      const dataUrl = await inPage(tab.id, readImage, [info.srcUrl]);
      form.append("file", await (await fetch(dataUrl)).blob(), "image.jpg");
    }
    const res = await fetch(`${API}/api/checks`, { method: "POST", body: form });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const { check_id } = await res.json();
    chrome.tabs.create({ url: `${APP}/check/${check_id}`, index: tab.index + 1 });
  } catch (err) {
    // Pages like chrome:// block scripting; fall back to opening the app with the link prefilled.
    console.error("First Seen:", err);
    if (/^https?:/.test(info.srcUrl)) {
      chrome.tabs.create({ url: `${APP}/?image_url=${encodeURIComponent(info.srcUrl)}`, index: tab.index + 1 });
    }
  }
});
