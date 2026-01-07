import requests
import json
import base64
from Crypto.Cipher import AES

# 1. 配置信息
SOURCE_URL = "https://wget.la/https://raw.githubusercontent.com/IY-CPU/IY/main/天神IY.json"
JAR_URL = "https://ghproxy.net/https://raw.githubusercontent.com/yvor-liu/tvbox/main/1767541963195d1mrhw.txt"

# 天神源常用的 AES 密钥 (固定)
AES_KEY = b"6543210987654321" 

HIDE_LIVES = ["限时测试", "内置测测", "V4-develop202", "V6-范明明（需开启V6网络）", "YY轮播"]
HIDE_SITES = ["版本信息", "DG音乐仓", "lf_live10_min", "六月听书", "世界听书", "蜻蜓FM", "凤凰FM"]

REPLACEMENTS = {
    "随身评书": {"key": "随身评书", "name": "📺斗鱼｜直播", "type": 3, "api": "csp_WexNewDouYuGuard", "searchable": 1, "changeable": 0, "jar": JAR_URL},
    "戏曲多多": {"key": "戏曲多多", "name": "📺虎牙｜直播", "type": 3, "api": "csp_WexNewHuYaGuard", "searchable": 1, "changeable": 0, "jar": JAR_URL},
    "哔哩直播": {"key": "哔哩直播", "name": "📺哔哩｜直播", "type": 3, "api": "csp_WexNewBiLiLiveGuard", "searchable": 1, "changeable": 0, "jar": JAR_URL}
}

def aes_decrypt(data):
    """AES-128-ECB 解密逻辑"""
    cipher = AES.new(AES_KEY, AES.MODE_ECB)
    decrypted = cipher.decrypt(base64.b64decode(data))
    # 去除 PKCS7 填充
    padding_len = decrypted[-1]
    return decrypted[:-padding_len].decode('utf-8')

def main():
    try:
        print("正在获取天神加密源...")
        res = requests.get(SOURCE_URL, timeout=15)
        text = res.text.strip()

        # 如果内容包含 **，截取中间的加密段
        if "**" in text:
            content = text.split("**")[1]
        else:
            content = text

        print("正在尝试 AES 解密...")
        decrypted_text = aes_decrypt(content)
        
        # 提取真正的 JSON 部分
        start = decrypted_text.find('{')
        end = decrypted_text.rfind('}') + 1
        data = json.loads(decrypted_text[start:end])
        print("✅ 天神源解密成功！")

        # 2. 过滤 Lives
        if "lives" in data:
            data["lives"] = [l for l in data["lives"] if l.get("name") not in HIDE_LIVES]

        # 3. 过滤并替换 Sites
        if "sites" in data:
            new_sites = []
            for s in data["sites"]:
                key = s.get("key")
                if key in HIDE_SITES: continue
                new_sites.append(REPLACEMENTS.get(key, s))
            data["sites"] = new_sites

        # 4. 写入文件
        with open("my_local.json", "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print("✅ 任务完成！")

    except Exception as e:
        print(f"❌ 运行报错: {e}")

if __name__ == "__main__":
    main()
