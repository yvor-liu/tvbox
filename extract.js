const fs = require("fs");
const path = require("path");

// 去除注释和 BOM（保留）
function removeComments(str) {
  str = str.replace(/\/\*[\s\S]*?\*\//g, "");
  str = str.replace(/(^|[^:])\/\/.*$/gm, "$1");
  return str;
}
function removeBOM(str) {
  return str.charCodeAt(0) === 0xFEFF ? str.slice(1) : str;
}

/**
 * ⭐【改动 1】：不再识别“本地库”“ff”
 * 现在 ZIP 解压后只有一个文件夹，因此直接找第一个目录即可
 */
function findExtractedFolder() {
  const dirs = fs.readdirSync(".");
  for (const d of dirs) {
    if (fs.statSync(d).isDirectory()) {
      return d; // 直接返回第一个目录
    }
  }
  return null;
}

/**
 * ⭐【改动 2】：不再使用关键字筛选
 * 直接递归查找第一个 api.json
 */
function findApiJson(dir) {
  const entries = fs.readdirSync(dir);
  for (const e of entries) {
    const full = path.join(dir, e);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      const found = findApiJson(full);
      if (found) return found;
    } else if (e === "api.json") {
      return full; // 找到第一个 api.json 就返回
    }
  }
  return null;
}

// 修复相对路径（保留）
function fixPaths(obj) {
  if (typeof obj === "string") {
    if (obj.startsWith("./")) {
      return `https://gitee.com/cpu-iy/lib/raw/master/${obj.slice(2)}`;
    }
    if (obj.startsWith("../")) {
      return `https://gitee.com/cpu-iy/lib/raw/master/${obj.slice(3)}`;
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(fixPaths);
  }
  if (typeof obj === "object" && obj !== null) {
    const res = {};
    for (const [k, v] of Object.entries(obj)) {
      res[k] = fixPaths(v);
    }
    return res;
  }
  return obj;
}

try {
  // 1) 自动识别解压文件夹
  const root = findExtractedFolder();
  if (!root) {
    console.error("❌ 未找到解压后的文件夹");
    process.exit(1);
  }
  console.log("📁 解压目录:", root);

  // 2) 查找唯一的 api.json
  const apiPath = findApiJson(root);
  if (!apiPath) {
    console.error("❌ 未找到 api.json");
    process.exit(1);
  }
  console.log("🔍 找到 api.json:", apiPath);

  // 3) 去除注释和 BOM
  let raw = fs.readFileSync(apiPath, "utf8");
  raw = removeBOM(removeComments(raw));
  const parsed = JSON.parse(raw);

  // 4) 修复路径
  const fixed = fixPaths(parsed);

  // 5) 输出
  fs.writeFileSync("天神IY.txt", JSON.stringify(fixed, null, 2), "utf8");
  console.log("✅ 成功生成 天神IY.txt");

} catch (e) {
  console.error("❌ 解析失败");
  console.error(e);
  process.exit(1);
}
