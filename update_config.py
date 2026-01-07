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
HIDE_SITES = ["版本信息", "DG音乐仓", "lf_live10_min", "六月听书", "世界听书", "蜻蜓FM", "凤凰FM"]

REPLACEMENTS = {
    "随身评书": {"key": "随身评书", "name": "📺斗鱼｜直播", "type": 3, "api": "csp_WexNewDouYuGuard", "searchable": 1, "changeable": 0, "jar": JAR_URL},
    "戏曲多多": {"key": "戏曲多多", "name": "📺虎牙｜直播", "type": 3, "api": "csp_WexNewHuYaGuard", "searchable": 1, "changeable": 0, "jar": JAR_URL},
    "哔哩直播": {"key": "哔哩直播", "name": "📺哔哩｜直播", "type": 3, "api": "csp_WexNewBiLiLiveGuard", "searchable": 1, "changeable": 0, "jar": JAR_URL}
}

def aes_decrypt(data):
    try:
        data = re.sub(r'[^A-Za-z0-9+/=]', '', data)
        missing_padding = len(data) % 4
        if missing_padding:
            data += '=' * (4 - missing_padding)
            
        raw_bytes = base64.b64decode(data)
        valid_len = (len(raw_bytes) // 16) * 16
        if valid_len == 0: return ""
        
        cipher = AES.new(AES_KEY, AES.MODE_ECB)
        decrypted = cipher.decrypt(raw_bytes[:valid_len])
        
        # 移除 AES 填充
        padding_len = decrypted[-1]
        if padding_len < 16:
            decrypted = decrypted[:-padding_len]
            
        return decrypted.decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"解密内部错误: {e}")
        return ""

def main():
    try:
        print(f"正在读取 PNG 源...")
        res = requests.get(SOURCE_URL, timeout=15)
        text = "".join(chr(b) for b in res.content if b < 128)

        if "**" in text:
            parts = text.split("**")
            content = max(parts, key=len)
        else:
            content = text

        print(f"提取密文成功，长度: {len(content)}")
        decrypted_text = aes_decrypt(content)
        
        # --- 核心修正：深度定位和清洗 JSON ---
        # 寻找第一个 { 的位置
        start_idx = decrypted_text.find('{')
        if start_idx == -1:
            print("❌ 解密结果中未发现 JSON 对象")
            return
            
        # 截取从 { 开始的内容
        clean_json_str = decrypted_text[start_idx:]
        
        # 再次利用正则表达式，只保留第一个 { 到最后一个 } 之间的内容
        # 并尝试修正可能存在的非标准 JSON 格式
        try:
            data = json.loads(clean_json_str)
        except json.JSONDecodeError:
            # 如果直接解析失败，尝试暴力截断末尾干扰
            end_idx = clean_json_str.rfind('}') + 1
            data = json.loads(clean_json_str[:end_idx])

        print("✅ 天神源解密并清洗成功！")

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
        print("✅ 任务完成！已生成 my_local.json")

    except Exception as e:
        print(f"❌ 终极报错: {e}")

if __name__ == "__main__":
    main()
