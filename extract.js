const fs = require("fs");
const path = require("path");

// 去除注释（支持 /* */ 和 //）
function removeComments(str) {
  // 去掉 /* ... */ 注释
  str = str.replace(/\/\*[\s\S]*?\*\//g, "");
  // 去掉 // 注释（不匹配 URL）
  str = str.replace(/(^|[^:])\/\/.*/g, "$1");
  return str;
}

// 去除 UTF-8 BOM
function removeBOM(str) {
  if (str.charCodeAt(0) === 0xFEFF) {
    return str.slice(1);
  }
  return str;
}

try {
  // 你的 api.json 的真实路径
  const apiPath = path.join("ff", "0本地库【ff】", "缘起【天神IY】", "api.json");

  if (!fs.existsSync(apiPath)) {
    console.error("❌ 未找到 api.json，请检查 zip 是否正确解压");
    console.error("查找路径：" + apiPath);
    process.exit(1);
  }

  let raw = fs.readFileSync(apiPath, "utf8");

  // 去 BOM
  raw = removeBOM(raw);

  // 去注释
  let cleaned = removeComments(raw);

  // 验证 JSON
  const parsed = JSON.parse(cleaned);

  // 写入最终 txt（纯净 JSON）
  fs.writeFileSync("天神IY.txt", JSON.stringify(parsed, null, 2), "utf8");

  console.log("✅ 成功解析 api.json 并生成 天神IY.txt");

} catch (e) {
  console.error("❌ 解析 api.json 失败");
  console.error(e);
  process.exit(1);
}
