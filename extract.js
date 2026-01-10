const fs = require("fs");
const path = require("path");
// 正确导入 pinyin 包
const { pinyin } = require("pinyin");

// 关键字（模糊匹配）
const KEYWORDS = ["天神", "iy", "IY", "Iy", "iY"];

// Raw URL 前缀
const RAW_PREFIX = "https://raw.githubusercontent.com/yvor-liu/tvbox/main/";

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

// 检测是否包含中文
function hasChinese(str) {
  return /[\u4e00-\u9fa5]/.test(str);
}

// 生成拼音缩写别名
function generateAlias(filename) {
  const base = path.basename(filename, path.extname(filename));
  const ext = path.extname(filename);

  // 把中文转拼音首字母
  const arr = pinyin(base, { style: pinyin.STYLE_FIRST_LETTER });
  const abbr = arr.flat().join("");

  return `${abbr}${ext}`;
}

// 复制副本（每次覆盖，确保最新）
function ensureAliasFile(dirAbs, relFile) {
  const srcAbs = path.join(dirAbs, relFile);
  const alias = generateAlias(relFile);
  const dstAbs = path.join(dirAbs, alias);
  try {
    fs.copyFileSync(srcAbs, dstAbs);
    console.log(`📄 生成副本: ${alias}`);
  } catch (e) {
    console.error("❌ 副本生成失败:", e);
  }
  return alias;
}

// **目录转码，文件名保留英文或生成副本**
function encodeDirsKeepFilename(p) {
  const parts = p.replace(/\\/g, "/").split("/");
  if (parts.length === 0) return p;
  const filename = parts.pop(); // 保留最后一级文件名原样
  const encodedDirs = parts.map(encodeURIComponent).join("/");
  return encodedDirs ? `${encodedDirs}/${filename}` : filename;
}

// ⭐⭐⭐ 路径修复：目录转码 + 文件名副本 ⭐⭐⭐
function fixPaths(obj, apiDir) {
  const apiDirAbs = apiDir;
  const apiDirNorm = apiDir.replace(/\\/g, "/");
  const apiParentNorm = apiDirNorm.split("/").slice(0, -1).join("/");
  const apiParentAbs = path.dirname(apiDirAbs);

  let jsonStr = JSON.stringify(obj);

  // ./xxx → 当前目录
  jsonStr = jsonStr.replace(
    /"\.\/([^"]+)"/g,
    (_, p1) => {
      let target = p1;
      if (hasChinese(path.basename(target))) {
        target = ensureAliasFile(apiDirAbs, target);
      }
      const joined = `${apiDirNorm}/${target}`;
      const encoded = encodeDirsKeepFilename(joined);
      return `"${RAW_PREFIX}${encoded}"`;
    }
  );

  // ../xxx → 父目录
  jsonStr = jsonStr.replace(
    /"\.\.\/([^"]+)"/g,
    (_, p1) => {
      let target = p1;
      if (hasChinese(path.basename(target))) {
        target = ensureAliasFile(apiParentAbs, target);
      }
      const joined = `${apiParentNorm}/${target}`;
      const encoded = encodeDirsKeepFilename(joined);
      return `"${RAW_PREFIX}${encoded}"`;
    }
  );

  return JSON.parse(jsonStr);
}

try {
  const root = findRootDir();
  if (!root) {
    console.error("❌ 未找到 ff.zip 解压后的根目录");
    process.exit(1);
  }

  console.log("📁 自动识别根目录:", root);

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

  const apiDir = path.dirname(apiPath);

  parsed = fixPaths(parsed, apiDir);

  fs.writeFileSync("iy_merged.json", JSON.stringify(parsed, null, 2), "utf8");

  console.log("✅ 成功生成 iy_merged.json");

} catch (e) {
  console.error("❌ 解析失败");
  console.error(e);
  process.exit(1);
}
