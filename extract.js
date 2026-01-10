const fs = require("fs");
const path = require("path");

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

// 生成英文别名（简单规则：取拼音首字母或 fallback）
function generateAlias(filename) {
  const base = path.basename(filename, ".py");
  // 简单规则：取拼音首字母缩写（这里用固定映射或直接 fallback）
  // 你可以根据需要改成更复杂的映射
  return "alias_" + Buffer.from(base).toString("hex").slice(0, 6) + ".py";
}

// ⭐⭐⭐ 最终稳定版路径修复（保留中文不转码 + 自动生成别名） ⭐⭐⭐
function fixPaths(obj, apiDir) {
  const apiDirNorm = apiDir.replace(/\\/g, "/");
  const apiParent = apiDirNorm.split("/").slice(0, -1).join("/");

  let jsonStr = JSON.stringify(obj);

  // ./xxx → 拼接到当前目录
  jsonStr = jsonStr.replace(
    /"\.\/([^"]+)"/g,
    (_, p1) => {
      let target = p1;
      if (target.endsWith(".py") && hasChinese(target)) {
        const alias = generateAlias(target);
        const src = path.join(apiDirNorm, target);
        const dst = path.join(apiDirNorm, alias);
        try {
          if (!fs.existsSync(dst)) {
            fs.copyFileSync(src, dst);
            console.log(`📄 生成别名文件: ${alias}`);
          }
        } catch (e) {
          console.error("❌ 别名生成失败:", e);
        }
        target = alias;
      }
      return `"${RAW_PREFIX}${apiDirNorm}/${target}"`;
    }
  );

  // ../xxx → 拼接到父目录
  jsonStr = jsonStr.replace(
    /"\.\.\/([^"]+)"/g,
    (_, p1) => {
      let target = p1;
      if (target.endsWith(".py") && hasChinese(target)) {
        const alias = generateAlias(target);
        const src = path.join(apiParent, target);
        const dst = path.join(apiParent, alias);
        try {
          if (!fs.existsSync(dst)) {
            fs.copyFileSync(src, dst);
            console.log(`📄 生成别名文件: ${alias}`);
          }
        } catch (e) {
          console.error("❌ 别名生成失败:", e);
        }
        target = alias;
      }
      return `"${RAW_PREFIX}${apiParent}/${target}"`;
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

  fs.writeFileSync("天神IY.txt", JSON.stringify(parsed, null, 2), "utf8");

  console.log("✅ 成功生成 天神IY.txt");

} catch (e) {
  console.error("❌ 解析失败");
  console.error(e);
  process.exit(1);
}
