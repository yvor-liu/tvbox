const fs = require("fs");
const path = require("path");

// 关键字（模糊匹配）
const KEYWORDS = ["天神", "iy", "IY", "Iy", "iY"];

// Raw URL 前缀
const RAW_PREFIX = "https://raw.githubusercontent.com/yvor-liu/tvbox/main/";

// 对路径进行 URL 编码
function encodePath(p) {
  return p.split("/").map(encodeURIComponent).join("/");
}

// 自动找到 zip 解压后的根目录（包含“本地库”或“ff”）
function findRootDir() {
  const dirs = fs.readdirSync(".");
  for (const d of dirs) {
    if (fs.statSync(d).isDirectory()) {
      if (d.includes("本地库") || d.includes("ff")) {
        return d;
      }
    }
  }
  return null;
}

// 去除注释
function removeComments(str) {
  str = str.replace(/\/\*[\s\S]*?\*\//g, "");
  str = str.replace(/(^|[^:])\/\/.*/g, "$1");
  return str;
}

// 去除 BOM
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
  // 自动识别根目录
  const root = findRootDir();
  if (!root) {
    console.error("❌ 未找到 ff.zip 解压后的根目录");
    process.exit(1);
  }

  console.log("📁 自动识别根目录:", root);

  // 搜索 api.json
  const candidates = findApiJson(root);

  if (candidates.length === 0) {
    console.error("❌ 未找到包含关键字的 api.json");
    process.exit(1);
  }

  candidates.sort((a, b) => a.length - b.length);
  const apiPath = candidates[0];

  console.log("🔍 找到 api.json:", apiPath);

  let raw = fs.readFileSync(apiPath, "utf8");

  raw = removeBOM(raw);
  raw = removeComments(raw);

  let parsed = JSON.parse(raw);

  const relativeDir = path.dirname(apiPath);

  parsed = fixPaths(parsed, relativeDir);

  fs.writeFileSync("天神IY.txt", JSON.stringify(parsed, null, 2), "utf8");

  console.log("✅ 成功生成 天神IY.txt");

} catch (e) {
  console.error("❌ 解析失败");
  console.error(e);
  process.exit(1);
}

