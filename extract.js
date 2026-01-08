const fs = require("fs");
const path = require("path");

// 关键字（模糊匹配）
const KEYWORDS = ["天神", "iy", "IY", "Iy", "iY"];

// Raw URL 前缀（注意：中文目录需要 URL 编码）
const RAW_PREFIX = "https://raw.githubusercontent.com/yvor-liu/tvbox/main/";

// 对路径进行 URL 编码（逐段编码）
function encodePath(p) {
  return p.split("/").map(encodeURIComponent).join("/");
}

// 去除注释（支持 /* */ 和 //）
function removeComments(str) {
  str = str.replace(/\/\*[\s\S]*?\*\//g, ""); // /* ... */
  str = str.replace(/(^|[^:])\/\/.*/g, "$1"); // //
  return str;
}

// 去除 UTF-8 BOM
function removeBOM(str) {
  return str.charCodeAt(0) === 0xFEFF ? str.slice(1) : str;
}

// 递归搜索 api.json（必须包含关键字）
function findApiJson(dir) {
  const files = fs.readdirSync(dir);
  let candidates = [];

  for (const file of files) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      const result = findApiJson(full);
      if (result) candidates = candidates.concat(result);
    } else if (file === "api.json") {
      const lowerPath = full.toLowerCase();
      if (KEYWORDS.some(k => lowerPath.includes(k.toLowerCase()))) {
        candidates.push(full);
      }
    }
  }

  return candidates;
}

// 修复相对路径 → Raw URL
function fixPaths(obj, basePath) {
  const jsonStr = JSON.stringify(obj);

  const encodedBase = encodePath(basePath);

  const fixed = jsonStr.replace(
    /"\.\/([^"]+)"/g,
    (_, p1) => `"${RAW_PREFIX}${encodedBase}/${encodeURIComponent(p1)}"`
  );

  return JSON.parse(fixed);
}

try {
  // 搜索 api.json
  const candidates = findApiJson("本地库【ff】");

  if (candidates.length === 0) {
    console.error("❌ 未找到包含关键字的 api.json");
    process.exit(1);
  }

  // 选择最短路径（优先级最高）
  candidates.sort((a, b) => a.length - b.length);
  const apiPath = candidates[0];

  console.log("🔍 找到 api.json:", apiPath);

  let raw = fs.readFileSync(apiPath, "utf8");

  raw = removeBOM(raw);
  raw = removeComments(raw);

  let parsed = JSON.parse(raw);

  // 计算相对路径（用于 Raw URL 拼接）
  const relativeDir = path.dirname(apiPath);

  // 修复相对路径
  parsed = fixPaths(parsed, relativeDir);

  // 输出纯净 JSON
  fs.writeFileSync("天神IY.txt", JSON.stringify(parsed, null, 2), "utf8");

  console.log("✅ 成功生成 天神IY.txt");

} catch (e) {
  console.error("❌ 解析失败");
  console.error(e);
  process.exit(1);
}

