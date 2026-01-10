const fs = require("fs");
const path = require("path");
// 正确导入 pinyin 包
const { pinyin } = require("pinyin");

// 关键字（模糊匹配）
const KEYWORDS = ["缘起", "天神", "iy", "IY", "Iy", "iY"];

// Raw URL 前缀（你的仓库根）
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
      if (d.includes("本地库") || d.toLowerCase().includes("ff")) {
        return d;
      }
    }
  }
  return null;
}

// 在 root 下模糊查找目标目录（包含关键字）
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

// 检测是否包含中文
function hasChinese(str) {
  return /[\u4e00-\u9fa5]/.test(str);
}

// 转拼音缩写
function toPinyinAbbr(str) {
  const arr = pinyin(str, { style: pinyin.STYLE_FIRST_LETTER });
  return arr.flat().join("");
}

// 重命名为英文（目录或文件）
function renameToEnglish(name) {
  if (!hasChinese(name)) return name;
  const ext = path.extname(name);
  const base = path.basename(name, ext);
  const abbr = toPinyinAbbr(base);
  return `${abbr}${ext}`;
}

// 递归复制并重命名（目录与文件名都转英文）
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

// 解析并返回 JSON 对象
function readJson(file) {
  let raw = fs.readFileSync(file, "utf8");
  raw = removeBOM(raw);
  raw = removeComments(raw);
  return JSON.parse(raw);
}

// 将相对路径（./ 或 ../）解析为绝对源路径
function resolveRelative(baseDir, rel) {
  const norm = baseDir.replace(/\\/g, "/");
  const joined = path.posix.normalize(`${norm}/${rel}`);
  return joined;
}

// 将源绝对路径映射到 yqtsiy 副本中的相对路径（保持同层级结构）
function mapToYqtsiy(srcRoot, yqRoot, absPath) {
  const relFromSrcRoot = path.relative(srcRoot, absPath).replace(/\\/g, "/");
  // relFromSrcRoot 的每一段都已在复制时转为英文；这里只需要把路径前缀替换为 yqtsiy
  return `${path.basename(yqRoot)}/${relFromSrcRoot}`;
}

// 修复 JSON 中的路径：将 ./ 和 ../ 引用改为 RAW_PREFIX + yqtsiy 路径（全英文）
function fixPaths(obj, apiDirSrc, srcRoot, yqRoot) {
  const apiDirNorm = apiDirSrc.replace(/\\/g, "/");
  let jsonStr = JSON.stringify(obj);

  // ./xxx → 当前目录
  jsonStr = jsonStr.replace(
    /"\.\/([^"]+)"/g,
    (_, p1) => {
      const absSrc = resolveRelative(apiDirNorm, p1);
      const mappedRel = mapToYqtsiy(srcRoot, yqRoot, absSrc);
      return `"${RAW_PREFIX}${mappedRel}"`;
    }
  );

  // ../xxx → 父目录
  jsonStr = jsonStr.replace(
    /"\.\.\/([^"]+)"/g,
    (_, p1) => {
      const absSrc = resolveRelative(path.posix.dirname(apiDirNorm), p1);
      const mappedRel = mapToYqtsiy(srcRoot, yqRoot, absSrc);
      return `"${RAW_PREFIX}${mappedRel}"`;
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

  const targetDir = findTargetDir(root);
  if (!targetDir) {
    console.error("❌ 未找到包含关键字的目标目录");
    process.exit(1);
  }
  console.log("📁 找到目标目录:", targetDir);

  // 复制到仓库根目录并重命名为全英文 yqtsiy（目录与文件名都转英文）
  const yqRoot = path.resolve("yqtsiy");
  // 清理旧的 yqtsiy
  if (fs.existsSync(yqRoot)) {
    fs.rmSync(yqRoot, { recursive: true, force: true });
  }
  copyDirWithRename(targetDir, yqRoot);
  console.log("✅ 已复制并重命名到:", yqRoot);

  // 找到源目录中的 api.json（用于解析相对引用）
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

  // 读取源 api.json
  const parsed = readJson(apiPathSrc);

  // 修复路径为 RAW_PREFIX + yqtsiy/...（全英文）
  const fixed = fixPaths(parsed, path.dirname(apiPathSrc), path.resolve(targetDir), yqRoot);

  // 输出为 天神IY.txt（中间过渡文件）
  fs.writeFileSync("天神IY.txt", JSON.stringify(fixed, null, 2), "utf8");
  console.log("✅ 成功生成 天神IY.txt");

} catch (e) {
  console.error("❌ 解析失败");
  console.error(e);
  process.exit(1);
}

