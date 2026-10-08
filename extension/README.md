# First Seen browser extension

Right-click any image and choose **Check with First Seen**. It works on WhatsApp Web, news
sites, X and Facebook. It asks what the message claims (you can skip this), then opens
the result in a new tab.

## Install (Chrome, Edge, Brave)

1. Start the backend (`uvicorn firstseen.api:app --port 8000`) and the web app
   (`npm run dev`), as described in the main README.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and choose this `extension/` folder.

WhatsApp Web shows photos as `blob:` URLs that only the page can read, so the extension
reads the image inside the page and uploads the bytes. It never sends a page's link or
contents anywhere except to your local First Seen backend.
