import requests
import json

# 配置信息
SOURCE_URL = "https://d.kstore.dev/download/14505/天神IY.json"
JAR_URL = "https://ghproxy.net/https://raw.githubusercontent.com/yvor-liu/tvbox/main/1767541963195d1mrhw.txt"

# 需要删除的 Live 名称列表
HIDE_LIVES = ["限时测试", "内置测测", "V4-develop202", "V6-范明明（需开启V6网络）", "YY轮播"]

# 需要删除的 Site Key 列表
HIDE_SITES = [
    "版本信息", "DG音乐仓", "lf_live10_min", "六月听书", "世界听书", 
    "蜻蜓FM", "凤凰FM", "网络直播", "哔哩演唱会", "哔哩听书", 
    "哔哩相声", "哔哩小品", "哔哩戏曲", "少儿教育", "小学课堂", 
    "初中课堂", "高中课堂", "养生堂", "急救教学"
]

# 需要替换的站点配置
REPLACEMENTS = {
    "随身评书": {
        "key": "随身评书", "name": "📺斗鱼｜直播", "type": 3,
        "api": "csp_WexNewDouYuGuard", "searchable": 1, "changeable": 0, "jar": JAR_URL
    },
    "戏曲多多": {
        "key": "戏曲多多", "name": "📺虎牙｜直播", "type": 3,
        "api": "csp_WexNewHuYaGuard", "searchable": 1, "changeable": 0, "jar": JAR_URL
    },
    "哔哩直播": {
        "key": "哔哩直播", "name": "📺哔哩｜直播", "type": 3,
        "api": "csp_WexNewBiLiLiveGuard", "searchable": 1, "changeable": 0, "jar": JAR_URL
    }
}

def main():
    try:
        # 1. 下载在线源
        print(f"正在读取在线源...")
        response = requests.get(SOURCE_URL, timeout=15)
        response.encoding = 'utf-8'
        data = response.json()

        # 2. 过滤 Lives
        if "lives" in data:
            data["lives"] = [live for live in data["lives"] if live.get("name") not in HIDE_LIVES]

        # 3. 过滤并替换 Sites
        if "sites" in data:
            new_sites = []
            for site in data["sites"]:
                key = site.get("key")
                # 如果在隐藏列表，则跳过
                if key in HIDE_SITES:
                    continue
                # 如果在替换列表，则使用新配置
                if key in REPLACEMENTS:
                    new_sites.append(REPLACEMENTS[key])
                else:
                    new_sites.append(site)
            data["sites"] = new_sites

        # 4. 生成新文件
        with open("my_local.json", "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print("✅ 成功！已生成 my_local.json")

    except Exception as e:
        print(f"❌ 运行失败: {e}")

if __name__ == "__main__":
    main()
