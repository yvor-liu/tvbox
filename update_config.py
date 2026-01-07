import requests
import json
import base64

# 1. 配置信息
SOURCE_URL = "https://wget.la/https://raw.githubusercontent.com/IY-CPU/IY/main/天神IY.json"
JAR_URL = "https://ghproxy.net/https://raw.githubusercontent.com/yvor-liu/tvbox/main/1767541963195d1mrhw.txt"

HIDE_LIVES = ["限时测试", "内置测测", "V4-develop202", "V6-范明明（需开启V6网络）", "YY轮播"]

HIDE_SITES = [
    "版本信息", "DG音乐仓", "lf_live10_min", "六月听书", "世界听书", 
    "蜻蜓FM", "凤凰FM", "网络直播", "哔哩演唱会", "哔哩听书", 
    "哔哩相声", "哔哩小品", "哔哩戏曲", "少儿教育", "小学课堂", 
    "初中课堂", "高中课堂", "养生堂", "急救教学"
]

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
        print("正在读取在线源...")
        headers = {"User-Agent": "Mozilla/5.0"}
        response = requests.get(SOURCE_URL, headers=headers, timeout=15)
        content = response.text.strip()
        
        # 尝试解析
        if content.startswith('{'):
            data = response.json()
        else:
            try:
                # 核心修正：更鲁棒的 Base64 提取逻辑
                if "**" in content:
                    parts = content.split("**")
                    # 取出最长的那一段，通常就是加密主体
                    content = max(parts, key=len)
                
                # 补齐 Base64 缺失的等号
                missing_padding = len(content) % 4
                if missing_padding:
                    content += '=' * (4 - missing_padding)
                
                decoded_data = base64.b64decode(content).decode('utf-8')
                
                # 清洗数据：只取第一个 { 到最后一个 } 之间的内容
                start = decoded_data.find('{')
                end = decoded_data.rfind('}') + 1
                data = json.loads(decoded_data[start:end])
                print("✅ 成功通过 Base64 解码并清洗数据")
            except Exception as b64_err:
                print(f"❌ 无法解密: {b64_err}")
                return

        # 过滤 Lives
        if "lives" in data:
            data["lives"] = [live for live in data["lives"] if live.get("name") not in HIDE_LIVES]

        # 过滤并替换 Sites
        if "sites" in data:
            new_sites = []
            for site in data["sites"]:
                key = site.get("key")
                if key in HIDE_SITES: continue
                if key in REPLACEMENTS:
                    new_sites.append(REPLACEMENTS[key])
                else:
                    new_sites.append(site)
            data["sites"] = new_sites

        # 生成文件
        with open("my_local.json", "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print("✅ 任务完成！已生成 my_local.json")

    except Exception as e:
        print(f"❌ 终极报错: {e}")

if __name__ == "__main__":
    main()
