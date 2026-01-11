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

// 修复相对路径：直接改为天神 Gitee raw 地址
function fixPaths(obj) {
  let jsonStr = JSON.stringify(obj);

  // ./xxx → 天神 Gitee raw
  jsonStr = jsonStr.replace(/"\.\/([^"]+)"/g, (_, p1) => {
    return `"https://gitee.com/cpu-iy/lib/raw/master/${p1}"`;
  });

  // ../xxx → 天神 Gitee raw
  jsonStr = jsonStr.replace(/"\.\.\/([^"]+)"/g, (_, p1) => {
    return `"https://gitee.com/cpu-iy/lib/raw/master/${p1}"`;
  });

  return JSON.parse(jsonStr);
}

try {
  // 假设 ff.zip 已经解压到 ffdir
  const apiPath = findApiJson("ffdir");
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
