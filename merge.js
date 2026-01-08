const fs = require("fs");

const ARRAY_FIELDS = ["sites", "lives", "flags", "parses", "rules", "ads"];

// 按 API 顺序逐项处理 edited 的三种规则
function mergeArrays(apiArr, editedArr, keyName) {
  if (!Array.isArray(editedArr)) return apiArr;

  // 把 edited 按 keyName 建立一个 map
  const editedMap = new Map();
  for (const item of editedArr) {
    if (!item || !item[keyName]) continue;
    editedMap.set(item[keyName], item);
  }

  const result = [];

  // 1. 按 API 顺序逐项处理
  for (const apiItem of apiArr) {
    const k = apiItem[keyName];
    const editedItem = editedMap.get(k);

    if (!editedItem) {
      // edited 没有 → 保留原项
      result.push(apiItem);
      continue;
    }

    if (editedItem.delete === true) {
      // delete:true → 删除，不写入
      continue;
    }

    // 重名 → 替换（保持原位置）
    const { delete: _del, ...pure } = editedItem;
    result.push(pure);

    // 已处理 → 从 map 中删除
    editedMap.delete(k);
  }

  // 2. 剩下的 edited → 新增（api 中不存在）→ 追加到末尾
  for (const [_, item] of editedMap) {
    if (item.delete === true) continue;
    const { delete: _del, ...pure } = item;
    result.push(pure);
  }

  return result;
}

function deepMerge(api, edited) {
  const result = JSON.parse(JSON.stringify(api));

  for (const key in edited) {
    const value = edited[key];

    if (ARRAY_FIELDS.includes(key) && Array.isArray(value)) {
      const keyName = key === "sites" ? "key" : "name";
      result[key] = mergeArrays(api[key] || [], value, keyName);
      continue;
    }

    if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      result[key] = deepMerge(api[key] || {}, value);
      continue;
    }

    result[key] = value;
  }

  return result;
}

try {
  const api = JSON.parse(fs.readFileSync("天神IY.txt", "utf8"));
  const edited = JSON.parse(fs.readFileSync("edited.json", "utf8"));

  const merged = deepMerge(api, edited);

  fs.writeFileSync("iy_merged.json", JSON.stringify(merged, null, 2), "utf8");

  console.log("✅ 合并完成：按 API 顺序逐项执行删除/替换/新增，逻辑最简最稳");

} catch (e) {
  console.error("❌ 合并失败");
  console.error(e);
  process.exit(1);
}

