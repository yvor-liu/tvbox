const fs = require("fs");

// 深度合并，但对 sites 做“整体替换”
function deepMerge(base, patch) {
  const result = JSON.parse(JSON.stringify(base));

  for (const key in patch) {
    // 特殊处理 sites
    if (key === "sites" && Array.isArray(patch[key])) {
      const baseSites = Array.isArray(base.sites) ? base.sites : [];
      const patchSites = patch.sites;

      // 构建一个 map 方便按 key 替换
      const map = new Map();

      // 先放入 base 的所有 site（保持原样）
      for (const s of baseSites) {
        if (s.key) map.set(s.key, s);
      }

      // 再用 patch 覆盖（完整替换）
      for (const s of patchSites) {
        if (s.key) map.set(s.key, s); // 整体替换，不保留旧字段
      }

      // 转回数组
      result.sites = Array.from(map.values());
      continue;
    }

    // 普通对象深度合并（但不合并数组）
    if (
      typeof patch[key] === "object" &&
      patch[key] !== null &&
      !Array.isArray(patch[key])
    ) {
      result[key] = deepMerge(result[key] || {}, patch[key]);
    } else {
      // 直接覆盖
      result[key] = patch[key];
    }
  }

  return result;
}

try {
  const api = JSON.parse(fs.readFileSync("天神IY.txt", "utf8"));
  const edited = JSON.parse(fs.readFileSync("edited.json", "utf8"));

  const merged = deepMerge(api, edited);

  fs.writeFileSync("iy_merged.json", JSON.stringify(merged, null, 2), "utf8");

  console.log("✅ 合并完成：site 完整替换，未在 edited 中出现的字段不保留");

} catch (e) {
  console.error("❌ 合并失败");
  console.error(e);
  process.exit(1);
}
