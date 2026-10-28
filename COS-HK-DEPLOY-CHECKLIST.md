# 星泽 · Tencent COS Hong Kong (ap-hongkong) deploy checklist

Personal Tencent Cloud **International** account only (tencentcloud.com). Never tmwinno / T8.
Legend: 🔑 = the owner (Man Lin) must do this in his own sign-in or with his own card. 🤖 = Dev can do it once given a scoped key or the console is open.

## ⚠️ Main gotcha (read first)
- If a bucket was **created after 2024-01-01**, every file opened from a **COS default domain** downloads instead of opening in the browser. That covers the bucket domain `*.cos.ap-hongkong.myqcloud.com` and the static-website domain `*.cos-website.ap-hongkong.myqcloud.com`. COS sends `Content-Disposition: attachment` and `x-cos-force-download: true`, so `index.html` downloads instead of rendering. Setting your own Content-Disposition on the object does not help, because it only takes effect on a **custom domain with static website enabled**.
  - https://cloud.tencent.com/document/product/436/96243 (security notice, effective 2024-01)
  - https://www.tencentcloud.com/document/product/436/30958 (Setting Static Website, note box)
  - https://www.tencentcloud.com/document/product/436/9512 (Hosting a Static Website)
  - https://cloud.tencent.com/document/product/436/56555 (FAQ: Content-Disposition only on custom domain)
- **So the Tester cannot test on a bare COS URL.** You need a **custom domain** (e.g. `www.<domain>`) bound as a *Static Website* origin and pointed there with a CNAME.
- **ICP:** for delivery outside the Chinese mainland, which includes the HK region, no ICP filing is needed: https://www.tencentcloud.com/document/product/436/18424 . The Chinese-site (cloud.tencent.com) console asks for 备案. That only applies to mainland regions and accounts, so use the international console with ap-hongkong.
- If a custom domain is the last step before testing anyway, it is also the domain SEO wants before Moments.

## Billing (cheapest)
- Default mode is **pay-as-you-go**. New COS users get a **50 GB STANDARD storage package free for 180 days**, granted automatically when COS is first activated. It covers storage only. Requests and public downstream traffic are still billed, but at this site's size (<1 MB) that's a few cents.
  https://www.tencentcloud.com/document/product/436/6240 · https://www.tencentcloud.com/document/product/436/16871
- Do **not** buy resource packs. Use **STANDARD** storage class only (not IA, Archive or Deep Archive). Skip CDN at first; a custom endpoint without CDN is enough.
- Set a low balance alert in Billing Center.

## Steps
1. 🔑 Sign up / sign in at tencentcloud.com with a **personal** account → Individual identity verification → add your own card. Open the COS console (https://console.tencentcloud.com/cos) and activate COS (this starts the free tier).
2. 🔑/🤖 **Create bucket**: name `xingze-<appid>`, region **Hong Kong (ap-hongkong)**, access **Public Read / Private Write**, no versioning, no encryption needed, STANDARD class.
3. 🔑/🤖 **Static website**: Bucket → Basic Configurations → Static Website → Enable. Index document `index.html`, error document `404.html`, error status code 404. Leave "Force HTTPS" off until step 6 is done. Docs: https://www.tencentcloud.com/document/product/436/30958
4. 🤖 **Upload**: unzip `/workspace/xingze-cos-stub.zip` and upload while keeping the folder structure (`index.html`, `404.html`, `robots.txt`, `css/`, `js/`, `data/`, `images/`, `products/index.html`, `finds/index.html`, `hk-agent/index.html`, `about/index.html`). Every subfolder needs its own `index.html` (it already has one). Check the Content-Types: `.html` text/html; charset=utf-8, `.json` application/json, `.css` text/css. You can upload in the console, or use COSCMD / COSCLI with a **sub-account key limited to this bucket** (🔑 the owner creates it in CAM; no root key).
5. 🔑 **Custom domain**: buy or own a domain (any registrar; GoDaddy is connected). Bucket → Domains and Transfer → Custom Endpoint → Add Domain, origin type **Static Website Endpoint**. Then add the given **CNAME** at the DNS provider (`www` → CNAME). Docs: https://www.tencentcloud.com/document/product/436/9512 , https://cloud.tencent.com/document/product/436/36638
6. 🔑/🤖 **HTTPS**: get a free SSL cert (Tencent SSL Certificates console, or upload your own). Attach it to the custom endpoint, then turn on **Force HTTPS** (302 from HTTP).
7. 🤖 **Verify**: run `curl -sI https://www.<domain>/` and expect `200`, `content-type: text/html`, and **no** `content-disposition: attachment`. `/products/` → products/index.html; `/xyz` → 404.html with status 404.
8. **Endpoint for the Tester:** `https://www.<domain>/`. This is the only URL that counts. The `*.cos-website.ap-hongkong.myqcloud.com` URL is for debugging only and will download HTML.
9. SEO: change `og:url`, `hreflang` and `PROVISIONAL-OSS-HK.example` in every page head to the real domain. Add `share.jpg` and `favicon.ico`, which currently 404.

## Fallback
If the custom domain can't be done in time, a bare COS URL **won't** pass the Tester gate (HTML downloads). Fall back to the PM-ruled ECS trial or GitHub Pages capture-only.
