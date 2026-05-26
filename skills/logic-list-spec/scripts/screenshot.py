"""
Take mobile screenshots via Chrome CDP with auth & mobile CSS fixes.
"""
import subprocess, time, json, websocket, os, base64, urllib.request

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
BASE_DIR = r"C:\Users\Administrator\Documents\qoder_project\mini-program"
SCREENSHOT_DIR = os.path.join(BASE_DIR, "doc", "V0.3", "screenshots")
PORT = 9226

PAGES = [
    ("product_detail.html", "product_detail.png"),
    ("cart.html", "cart.png"),
    ("order.html", "order.png"),
    ("payment.html", "payment.png"),
    ("pay_success.html", "pay_success.png"),
    ("order_list.html", "order_list.png"),
    ("order_detail.html", "order_detail.png"),
    ("logistics.html", "logistics.png"),
    ("review.html", "review.png"),
    ("write_review.html", "write_review.png"),
    ("product_reviews.html", "product_reviews.png"),
    ("my_reviews.html", "my_reviews.png"),
]

VIEWPORT_WIDTH = 375
VIEWPORT_HEIGHT = 812
SCALE = 2

# Inject before any page script: set login state + fix mobile CSS
INJECT_SCRIPT = r"""
(function(){
  // Set login state
  var account = {"phone":"13800001111","name":"\u5f20\u4e09","avatar":"../images/unsplash/1535713875002-d1d0cf377fde.jpg","gender":"male","birthday":"1995-06-15","email":"","wechatBound":true,"wechatNickname":"\u5f20\u4e09"};
  var accounts = [account,
    {"phone":"13800002222","name":"\u674e\u56db","avatar":"../images/unsplash/1535713875002-d1d0cf377fde.jpg","gender":"male","birthday":"1990-03-20","email":"","wechatBound":false,"wechatNickname":""}
  ];
  localStorage.setItem('syd_accounts', JSON.stringify(accounts));
  localStorage.setItem('syd_current', JSON.stringify(account));
  // Fix mobile CSS: restore 44px padding-top for status bar
  var style = document.createElement('style');
  style.textContent = '.sub-nav, .header-area, .search-header { padding-top: 44px !important; } body { background: #f5f5f5 !important; }';
  document.addEventListener('DOMContentLoaded', function(){
    document.head.appendChild(style);
  });
})();
"""


def get_page_ws_url():
    for _ in range(20):
        try:
            resp = urllib.request.urlopen(f"http://localhost:{PORT}/json")
            targets = json.loads(resp.read())
            for t in targets:
                if t.get("type") == "page":
                    return t["webSocketDebuggerUrl"]
        except Exception:
            time.sleep(0.5)
    raise RuntimeError("No page target found")


def take_screenshot(ws_url, html_file, output_path):
    ws = websocket.create_connection(ws_url, timeout=30)
    msg_id = 1

    def send(method, params=None):
        nonlocal msg_id
        msg = {"id": msg_id, "method": method}
        if params:
            msg["params"] = params
        ws.send(json.dumps(msg))
        while True:
            resp = json.loads(ws.recv())
            if resp.get("id") == msg_id:
                msg_id += 1
                return resp

    send("Page.enable")
    send("Runtime.enable")

    # Set mobile viewport
    send("Emulation.setDeviceMetricsOverride", {
        "width": VIEWPORT_WIDTH,
        "height": VIEWPORT_HEIGHT,
        "deviceScaleFactor": SCALE,
        "mobile": True,
    })
    send("Emulation.setScrollbarsHidden", {"hidden": True})

    # Inject login state + CSS fix before page scripts run
    send("Page.addScriptToEvaluateOnNewDocument", {"source": INJECT_SCRIPT})

    # Navigate
    file_url = f"file:///{BASE_DIR.replace(os.sep, '/')}/pages/{html_file}"
    send("Page.navigate", {"url": file_url})

    # Wait for load + images
    time.sleep(2)
    try:
        send("Runtime.evaluate", {
            "expression": "new Promise(r => setTimeout(r, 2000))",
            "awaitPromise": True,
            "timeout": 5000,
        })
    except Exception:
        pass

    # Screenshot
    result = send("Page.captureScreenshot", {"format": "png"})
    if "result" in result and "data" in result["result"]:
        img_data = base64.b64decode(result["result"]["data"])
        with open(output_path, "wb") as f:
            f.write(img_data)
        print(f"  OK: {os.path.basename(output_path)} ({len(img_data)} bytes)")
    else:
        print(f"  FAIL: {html_file} - {result}")

    ws.close()


def main():
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)

    proc = subprocess.Popen([
        CHROME, "--headless=new",
        f"--remote-debugging-port={PORT}",
        "--disable-gpu", "--no-sandbox",
        "--disable-extensions", "--disable-default-apps",
        "--no-first-run", "--remote-allow-origins=*",
        f"--window-size={VIEWPORT_WIDTH},{VIEWPORT_HEIGHT}",
        "about:blank",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    try:
        ws_url = get_page_ws_url()
        print("Connected to Chrome page target")

        for html_file, png_file in PAGES:
            output_path = os.path.join(SCREENSHOT_DIR, png_file)
            print(f"Capturing {html_file}...")
            take_screenshot(ws_url, html_file, output_path)
    finally:
        proc.terminate()
        proc.wait(timeout=5)
        print("Chrome closed.")


if __name__ == "__main__":
    main()
