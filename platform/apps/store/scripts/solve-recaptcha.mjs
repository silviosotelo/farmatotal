// Solve an invisible reCAPTCHA v2 via a 2captcha-compatible API.
// Usage: node scripts/solve-recaptcha.mjs <apikey> <sitekey> <pageurl> [base]
// Prints the g-recaptcha-response token on success.
const [, , KEY, SITEKEY, PAGEURL, BASE = "https://2captcha.com"] = process.argv;
if (!KEY || !SITEKEY || !PAGEURL) {
  console.error("args: <apikey> <sitekey> <pageurl> [base]");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  // 1) submit
  const inParams = new URLSearchParams({
    key: KEY,
    method: "userrecaptcha",
    googlekey: SITEKEY,
    pageurl: PAGEURL,
    invisible: "1",
    json: "1",
  });
  const inRes = await fetch(`${BASE}/in.php`, { method: "POST", body: inParams });
  const inJson = await inRes.json();
  if (String(inJson.status) !== "1") {
    console.error("SUBMIT_ERROR", JSON.stringify(inJson));
    process.exit(2);
  }
  const id = inJson.request;
  console.error("submitted, id=" + id + " — polling...");

  // 2) poll
  for (let i = 0; i < 40; i++) {
    await sleep(5000);
    const r = await fetch(
      `${BASE}/res.php?key=${KEY}&action=get&id=${id}&json=1`,
    );
    const j = await r.json();
    if (String(j.status) === "1") {
      // token to stdout (only line on stdout)
      console.log(j.request);
      return;
    }
    if (j.request !== "CAPCHA_NOT_READY") {
      console.error("POLL_ERROR", JSON.stringify(j));
      process.exit(3);
    }
    console.error(`  waiting (${(i + 1) * 5}s)...`);
  }
  console.error("TIMEOUT");
  process.exit(4);
}
main().catch((e) => {
  console.error("EXC", e.message);
  process.exit(5);
});
