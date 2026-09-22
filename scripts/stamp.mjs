/* يضع ختم بناء واحداً على كل الصفحات ويعلّق به روابط الكود (app.js / style.css / boot.js / print.css)
   حتى لا يبقى متصفّح الزائر على نسخة قديمة بعد النشر. يُشغَّل قبل كل دفع:  node scripts/stamp.mjs */
import fs from "fs";

const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
const pages = ["index.html", "banks.html", "government.html", "business.html", "profile.html", "404.html"];
const assets = ["app.js", "style.css", "boot.js", "print.css"];

for (const f of pages) {
  if (!fs.existsSync(f)) continue;
  let s = fs.readFileSync(f, "utf8");
  s = s.replace(/<meta name="build" content="[^"]*">/,
                `<meta name="build" content="${stamp}">`);
  for (const a of assets) {
    s = s.replace(new RegExp(`(assets/${a.replace(".", "\\.")})(\\?v=[0-9]+)?`, "g"), `$1?v=${stamp}`);
  }
  fs.writeFileSync(f, s);
}
console.log("build stamp:", stamp);
