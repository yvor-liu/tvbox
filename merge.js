const fs = require("fs");

// 深度合并：普通对象递归合并，数组默认直接覆盖（除了 sites 特殊处理）
function deepMerge(base, patch) {
  const result = JSON.parse(JSON.stringify(base || {}));

  for (const key in patch) {
    // 特殊处理 sites
    if (key === "sites" && Array.isArray(patch[key])) {
      const baseSites = Array.isArray(base?.sites) ? base.sites : [];
      const patchSites = patch.sites;

      // 先复制一份原始数组（原样保留，不合并、不去重）
      let resultSites = [...baseSites];

      // 收集所有需要删除的 key，以及需要“完整替换”的 key
      for (const s of patchSites) {
        if (!s || !s.key) continue;

        const siteKey = s.key;
        const toDelete = s.delete === true;

        // 先把原数组里所有同 key 的删掉（无论是 delete 还是替换，第一步都是删光旧的）
        resultSites = resultSites.filter(item => item.key !== siteKey);

        // 如果是 delete 指令，则不再添加新 site（等于彻底移除）
        if (toDelete) {
          continue;
        }

        // 否则：完整插入 patch 里的这个 site（不保留旧字段）
        // 同时去掉 delete 字段，避免出现在最终结果
        const { delete: _del, ...pureSite } = s;
        resultSites.push(pureSite);
      }

      result.sites = resultSites;
      continue;
    }

    // 其他 key 的普通深度合并（不处理数组内部）
    if (
      typeof patch[key] === "object" &&
      patch[key] !== null &&
      !Array.isArray(patch[key])
    ) {
      result[key] = deepMerge(result[key], patch[key]);
    } else {
      // 非对象 / 数组：直接覆盖
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

  console.log("✅ 合并完成：");
  console.log("   - api.json 内部同 key 的 site 不再被合并");
  console.log("   - edited.json 中同 key 的 site 进行完整替换");
  console.log("   - 带 delete: true 的 site 作为删除指令，不会出现在结果中");

} catch (e) {
  console.error("❌ 合并失败");
  console.error(e);
  process.exit(1);
}

