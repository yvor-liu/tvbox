const fs = require("fs");
const path = require("path");

// 关键字（用于筛选 api.json 路径）
const KEYWORDS = ["缘起", "天神", "iy", "IY", "Iy", "iY"];

// 去除注释和 BOM
function removeComments(str) {
  str = str.replace(/\/\*[\s\S]*?\*\//g, "");
  str = str.replace(/(^|[^:])\/\/.*$/gm, "$1");
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

// 在指定目录下收集所有包含关键字的 api.json 候选
function collectApiJsonCandidates(dir, out = []) {
  const entries = fs.readdirSync(dir);
  for (const e of entries) {
    const full = path.join(dir, e);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      collectApiJsonCandidates(full, out);
    } else if (e === "api.json") {
      const lowerPath = full.toLowerCase();
      if (KEYWORDS.some(k => lowerPath.includes(k.toLowerCase()))) {
        out.push(full);
      }
    }
  }
  return out;
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
  // 1) 自动识别解压根目录
  const root = findRootDir();
  if (!root) {
    console.error("❌ 未找到 ff.zip 解压后的根目录");
    process.exit(1);
  }
  console.log("📁 自动识别根目录:", root);

  // 2) 收集包含关键字的 api.json 候选，并选择最短路径（原逻辑）
  const candidates = collectApiJsonCandidates(root);
  if (candidates.length === 0) {
    console.error("❌ 未找到包含关键字的 api.json");
    process.exit(1);
  }
  candidates.sort((a, b) => a.length - b.length);
  const apiPath = candidates[0];
  console.log("🔍 选定 api.json:", apiPath);

  // 3) 去除注释和 BOM
  let raw = fs.readFileSync(apiPath, "utf8");
  raw = removeBOM(removeComments(raw));
  const parsed = JSON.parse(raw);

  // 4) 递归修复相对路径 → 天神 Gitee raw 地址
  const fixed = fixPaths(parsed);

  // 5) 输出中间文件
  fs.writeFileSync("天神IY.txt", JSON.stringify(fixed, null, 2), "utf8");
  console.log("✅ 成功生成 天神IY.txt");

} catch (e) {
  console.error("❌ 解析失败");
  console.error(e);
  process.exit(1);
}
