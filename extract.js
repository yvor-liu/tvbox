const fs = require("fs");
const zlib = require("zlib");

const raw = fs.readFileSync("天神IY.json");

let jsonText;

// 尝试作为 gzip 解压
try {
  jsonText = zlib.gunzipSync(raw).toString("utf8");
  console.log("🔧 检测到 gzip 格式，已成功解压");
} catch (e) {
  // 不是 gzip，当作普通文本处理
  jsonText = raw.toString("utf8");
  console.log("ℹ️ 文件不是 gzip，按普通 JSON 处理");
}

// 验证 JSON
try {
  JSON.parse(jsonText);
  fs.writeFileSync("天神IY.txt", jsonText, "utf8");
  console.log("✅ 成功写入天神IY.txt");
} catch (e) {
  console.error("❌ JSON 解析失败");
  console.error(e);
  process.exit(1);
}

