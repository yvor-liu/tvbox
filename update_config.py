import requests
import json
import base64
import re
from Crypto.Cipher import AES

# 1. 配置信息
SOURCE_URL = "https://wget.la/https://raw.githubusercontent.com/IY-CPU/IY/main/天神IY.png"
JAR_URL = "https://ghproxy.net/https://raw.githubusercontent.com/yvor-liu/tvbox/main/1767541963195d1mrhw.txt"

AES_KEY = b"6543210987654321" 

HIDE_LIVES = ["限时测试", "内置测测", "V4-develop202", "V6-范明明（需开启V6网络）", "YY轮播"]
HIDE_SITES = ["版本信息", "DG音乐仓", "lf_live10_min", "六月听书", "世界听书", "蜻蜓FM", "凤凰FM", "网络直播", "哔哩演唱会", "哔哩听书", "哔哩相声", "哔哩小品", "哔哩戏曲", "少儿教育", "小学课堂", "初中课堂", "高中课堂", "养生堂", "急救教学"]

REPLACEMENTS = {
    "随身评书": {"key": "随身评书", "name": "📺斗鱼｜直播", "type": 3, "api": "csp_WexNewDouYuGuard", "searchable": 1, "changeable": 0, "jar": JAR_URL},
    "戏曲多多": {"key": "戏曲多多", "name": "📺虎牙｜直播", "type": 3, "api": "csp_WexNewHuYaGuard", "searchable": 1, "changeable": 0, "jar": JAR_URL},
    "哔哩直播": {"key": "哔哩直播", "name": "📺哔哩｜直播", "type": 3, "api": "csp_WexNewBiLiLiveGuard", "searchable": 1, "changeable": 0, "jar": JAR_URL}
}

def clean_json(raw_str):
    """暴力清洗非标准 JSON 内容"""
    # 1. 去掉 // 类型的单行注释
    content = re.sub(r'//.*', '', raw_str)
    # 2. 去掉多余的换行和空白
    content = content.strip()
    # 3. 定位真正的 JSON 结构
    start = content.find('{')
    end = content.rfind('}') + 1
    if start == -1 or end <= 0:
        return None
    content = content[start:end]
    # 4. 关键：去掉 JSON 中对象或数组末尾多余的逗号 (e.g., [1,2,] -> [1,2])
    content = re.sub(r',\s*([\]}])', r'\1', content)
    return content

def aes_decrypt(data):
    try:
        data = re.sub(r'[^A-Za-z0-0+/=]', '', data)
        missing_padding = len(data) % 4
        if missing_padding: data += '=' * (4 - missing_padding)
        raw_bytes = base64.b64decode(data)
        valid_len = (len(raw_bytes) // 16) * 16
        if valid_len == 0: return ""
        cipher = AES.new(AES_KEY, AES.MODE_ECB)
        decrypted = cipher.decrypt(raw_bytes[:valid_len])
        padding_len = decrypted[-1]
        if padding_len < 16: decrypted = decrypted[:-padding_len]
        return decrypted.decode('utf-8', errors='ignore')
    except Exception:
        return ""

def main():
    try:
        print("正在获取并解密...")
        res = requests.get(SOURCE_URL, timeout=15)
        text = "".join(chr(b) for b in res.content if 31 < b < 127)
        
        content = text.split("**")[1] if "**" in text else text
        decrypted_text = aes_decrypt(content)
        
        # 使用暴力清洗函数
        final_json_str = clean_json(decrypted_text)
        
        if not final_json_str:
            print("❌ 清洗后未发现有效 JSON")
            return

        try:
            data = json.loads(final_json_str)
        except Exception as e:
            print(f"解析再次失败: {e}")
            print(f"内容片段预览: {final_json_str[:100]}")
            return

        print("✅ 解析成功！正在处理数据...")

        # 过滤与替换
        if "lives" in data:
            data["lives"] = [l for l in data["lives"] if l.get("name") not in HIDE_LIVES]
        if "sites" in data:
            new_sites = []
            for s in data["sites"]:
                key = s.get("key")
                if key in HIDE_SITES: continue
                new_sites.append(REPLACEMENTS.get(key, s))
            data["sites"] = new_sites

        with open("my_local.json", "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print("✅ 任务完成！")

    except Exception as e:
        print(f"❌ 运行报错: {e}")

if __name__ == "__main__":
    main()
