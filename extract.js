const fs = require("fs");
const zlib = require("zlib");

const raw = fs.readFileSync("天神IY.json");

let jsonText;
try {
  jsonText = zlib.gunzipSync(raw).toString("utf8");
} catch (e) {
  console.error("❌ 解压 gzip 失败");
  process.exit(1);
}

try {
  JSON.parse(jsonText);
  fs.writeFileSync("天神IY.txt", jsonText, "utf8");
  console.log("✅ 成功解压并写入天神IY.txt");
} catch (e) {
  console.error("❌ JSON 解析失败");
  process.exit(1);
}
