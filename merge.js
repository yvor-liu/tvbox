const fs = require("fs");
const path = require("path");

// 文件路径
const PNG_PATH = path.join(__dirname, "天神IY.txt");
const PATCH_PATH = path.join(__dirname, "edited.json");
const OUT_PATH = path.join(__dirname, "iy_merged.json");

// 读取 txt（纯 JSON 文本）
const raw = fs.readFileSync(PNG_PATH, "utf8");

// 合并数组（支持 delete:true）
function mergeArray(baseArr, patchArr, keyName = "key") {
  const map = new Map();
  (baseArr || []).forEach(item => map.set(item[keyName], item));

  (patchArr || []).forEach(p => {
    if (p.delete) {
      map.delete(p[keyName]);
    } else {
      const old = map.get(p[keyName]) || {};
      map.set(p[keyName], { ...old, ...p });
    }
  });

  return Array.from(map.values());
}

function main() {
  // 解析天神主接口
  const base = JSON.parse(raw);

  // 解析补丁
  const patch = JSON.parse(fs.readFileSync(PATCH_PATH, "utf8"));

  // 合并 lives
  if (patch.lives) {
    base.lives = mergeArray(base.lives, patch.lives, "name");
  }

  // 合并 sites
  if (patch.sites) {
    base.sites = mergeArray(base.sites, patch.sites, "key");
  }

  // 合并 flags
  if (patch.flags) {
    base.flags = { ...(base.flags || {}), ...patch.flags };
  }

  // 输出最终接口
  fs.writeFileSync(OUT_PATH, JSON.stringify(base, null, 2), "utf8");
  console.log("✅ 已生成:", OUT_PATH);
}

main();

