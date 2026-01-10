const fs = require("fs");
const path = require("path");
const { pinyin } = require("pinyin");

// 模糊匹配关键字
const KEYWORDS = ["缘起", "天神", "iy", "IY", "Iy", "iY"];
const RAW_PREFIX = "https://raw.githubusercontent.com/yvor-liu/tvbox/main/";

// 去除注释和 BOM
function removeComments(str) {
  str = str.replace(/\/\*[\s\S]*?\*\//g, "");
  str = str.replace(/(^|[^:])\/\/.*/g, "$1");
  return str;
}
function removeBOM(str) {
  return str.charCodeAt(0) === 0xFEFF ? str.slice(1) : str;
}

// 找到解压根目录
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

// 找到目标目录
function findTargetDir(root) {
  const entries = fs.readdirSync(root);
  for (const e of entries) {
    const full = path.join(root, e);
    if (fs.statSync(full).isDirectory()) {
      const lower = e.toLowerCase();
      if (KEYWORDS.some(k => lower.includes(k.toLowerCase()))) {
        return full;
      }
    }
  }
  return null;
}

// 中文检测与拼音缩写
function hasChinese(str) {
  return /[\u4e00-\u9fa5]/.test(str);
}
function toPinyinAbbr(str) {
  const arr = pinyin(str, { style: pinyin.STYLE_FIRST_LETTER });
  return arr.flat().join("");
}
function renameToEnglish(name) {
  if (!hasChinese(name)) return name;
  const ext = path.extname(name);
  const base = path.basename(name, ext);
  return toPinyinAbbr(base) + ext;
}

// 递归复制并重命名
function copyDirWithRename(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src);
  for (const entry of entries) {
    const srcPath = path.join(src, entry);
    const renamed = renameToEnglish(entry);
    const destPath = path.join(dest, renamed);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyDirWithRename(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 读取 JSON
function readJson(file) {
  let raw = fs.readFileSync(file, "utf8");
  raw = removeBOM(raw);
  raw = removeComments(raw);
  return JSON.parse(raw);
}

// 路径映射：目录和文件名都转英文
function mapToYqtsiy(srcRoot, yqRoot, absPath) {
  const relFromSrcRoot = path.relative(srcRoot, absPath).replace(/\\/g, "/");
  const parts = relFromSrcRoot.split("/");
  const filename = parts.pop();
  const renamedFile = renameToEnglish(filename);
  const relRenamed = [...parts, renamedFile].join("/");
  return `${path.basename(yqRoot)}/${relRenamed}`;
}

// 修复 JSON 中的路径
function fixPaths(obj, apiDirSrc, srcRoot, yqRoot) {
  const apiDirNorm = apiDirSrc.replace(/\\/g, "/");
  let jsonStr = JSON.stringify(obj);

  // ./xxx
  jsonStr = jsonStr.replace(/"\.\/([^"]+)"/g, (_, p1) => {
    const absSrc = path.posix.normalize(`${apiDirNorm}/${p1}`);
    const mappedRel = mapToYqtsiy(srcRoot, yqRoot, absSrc);
    return `"${RAW_PREFIX}${mappedRel}"`;
  });

  // ../xxx
  jsonStr = jsonStr.replace(/"\.\.\/([^"]+)"/g, (_, p1) => {
    const absSrc = path.posix.normalize(`${path.posix.dirname(apiDirNorm)}/${p1}`);
    const mappedRel = mapToYqtsiy(srcRoot, yqRoot, absSrc);
    return `"${RAW_PREFIX}${mappedRel}"`;
  });

  return JSON.parse(jsonStr);
}

try {
  const root = findRootDir();
  if (!root) {
    console.error("❌ 未找到 ff.zip 解压后的根目录");
    process.exit(1);
  }
  console.log("📁 自动识别根目录:", root);

  const targetDir = findTargetDir(root);
  if (!targetDir) {
    console.error("❌ 未找到包含关键字的目标目录");
    process.exit(1);
  }
  console.log("📁 找到目标目录:", targetDir);

  // 复制到 yqtsiy
  const yqRoot = path.resolve("yqtsiy");
  if (fs.existsSync(yqRoot)) {
    fs.rmSync(yqRoot, { recursive: true, force: true });
  }
  copyDirWithRename(targetDir, yqRoot);
  console.log("✅ 已复制并重命名到:", yqRoot);

  // 找 api.json
  const candidates = [];
  function findApiJson(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const full = path.join(dir, file);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        findApiJson(full);
      } else if (file === "api.json") {
        const lowerPath = full.toLowerCase();
        if (KEYWORDS.some(k => lowerPath.includes(k.toLowerCase()))) {
          candidates.push(full);
        }
      }
    }
  }
  findApiJson(targetDir);

  if (candidates.length === 0) {
    console.error("❌ 未找到包含关键字的 api.json");
    process.exit(1);
  }
  candidates.sort((a, b) => a.length - b.length);
  const apiPathSrc = candidates[0];
  console.log("🔍 找到 api.json（源目录）:", apiPathSrc);

  const parsed = readJson(apiPathSrc);
  const fixed = fixPaths(parsed, path.dirname(apiPathSrc), path.resolve(targetDir), yqRoot);

  // 输出中间文件
  fs.writeFileSync("天神IY.txt", JSON.stringify(fixed, null, 2), "utf8");
  console.log("✅ 成功生成 天神IY.txt");

} catch (e) {
  console.error("❌ 解析失败");
  console.error(e);
  process.exit(1);
}
