const fs = require("fs");
const path = require("path");

// 去除注释和 BOM
function removeComments(str) {
  str = str.replace(/\/\*[\s\S]*?\*\//g, "");
  str = str.replace(/(^|[^:])\/\/.*/g, "$1");
  return str;
}
function removeBOM(str) {
  return str.charCodeAt(0) === 0xFEFF ? str.slice(1) : str;
}

// 自动识别解压根目录（包含“本地库”或“ff”）
function findRootDir() {
  const dirs = fs.readdirSync(".");
  for (const d of dirs) {
    if (fs.statSync(d).isDirectory()) {
      if (d.includes("本地库") || d.toLowerCase().includes("ff")) {
        return d;
      }
    }
  }
  return null;
}

// 递归查找 api.json
function findApiJson(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      const res = findApiJson(full);
      if (res) return res;
    } else if (file === "api.json") {
      return full;
    }
  }
  return null;
}

// 递归修复路径：只替换以 ./ 或 ../ 开头的字符串
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
  const root = findRootDir();
  if (!root) {
    console.error("❌ 未找到 ff.zip 解压后的根目录");
    process.exit(1);
  }
  console.log("📁 自动识别根目录:", root);

  const apiPath = findApiJson(root);
  if (!apiPath) {
    console.error("❌ 未找到 api.json");
    process.exit(1);
  }
  console.log("🔍 找到 api.json:", apiPath);

  let raw = fs.readFileSync(apiPath, "utf8");
  raw = removeBOM(removeComments(raw));
  const parsed = JSON.parse(raw);

  const fixed = fixPaths(parsed);

  // 输出中间文件
  fs.writeFileSync("天神IY.txt", JSON.stringify(fixed, null, 2), "utf8");
  console.log("✅ 成功生成 天神IY.txt");

} catch (e) {
  console.error("❌ 解析失败");
  console.error(e);
  process.exit(1);
}
