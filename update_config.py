import requests
import json
import base64

# 1. 配置信息（使用你提供的加速明文地址）
SOURCE_URL = "https://wget.la/https://raw.githubusercontent.com/IY-CPU/IY/main/天神IY.png"
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
        print(f"正在读取在线源...")
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        response = requests.get(SOURCE_URL, headers=headers, timeout=15)
        content = response.text.strip()

        # 打印前 20 个字符，帮我们在日志里确认是否加密
        print(f"原始数据前20位: {content[:20]}")

        # 尝试解密逻辑
        if content.startswith('{'):
            # 如果是 { 开头，说明没加密，直接转 JSON
            data = response.json()
        else:
            # 尝试 Base64 解码（天神源常见的混淆方式）
            try:
                # 兼容某些带前缀或特殊处理的 Base64
                if "**" in content: # 某些源用 ** 分割
                    content = content.split("**")[1]
                
                decoded_data = base64.b64decode(content).decode('utf-8')
                data = json.loads(decoded_data)
                print("✅ 成功通过 Base64 解码数据")
            except Exception as b64_err:
                print(f"❌ 无法通过标准方式解密，可能存在高级加密: {b64_err}")
                return

        # 过滤 Lives
        if "lives" in data:
            data["lives"] = [live for live in data["lives"] if live.get("name") not in HIDE_LIVES]

        # 过滤并替换 Sites
        if "sites" in data:
            new_sites = []
            for site in data["sites"]:
                key = site.get("key")
                if key in HIDE_SITES:
                    continue
                if key in REPLACEMENTS:
                    new_sites.append(REPLACEMENTS[key])
                else:
                    new_sites.append(site)
            data["sites"] = new_sites

        # 生成新文件
        with open("my_local.json", "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print("✅ 处理成功！已生成 my_local.json")

    except Exception as e:
        print(f"❌ 运行失败: {e}")

if __name__ == "__main__":
    main()
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
        print(f"正在读取在线源: {SOURCE_URL}")
        response = requests.get(SOURCE_URL, timeout=15)
        response.encoding = 'utf-8'
        
        # 此时已经是明文 JSON，直接解析
        data = response.json()

        # 过滤 Lives
        if "lives" in data:
            data["lives"] = [live for live in data["lives"] if live.get("name") not in HIDE_LIVES]

        # 过滤并替换 Sites
        if "sites" in data:
            new_sites = []
            for site in data["sites"]:
                key = site.get("key")
                if key in HIDE_SITES:
                    continue
                if key in REPLACEMENTS:
                    new_sites.append(REPLACEMENTS[key])
                else:
                    new_sites.append(site)
            data["sites"] = new_sites

        # 生成新文件
        with open("my_local.json", "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print("✅ 处理成功！已生成 my_local.json")

    except Exception as e:
        print(f"❌ 运行失败: {e}")

if __name__ == "__main__":
    main()
