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
        # 核心修正：只保留合法的 Base64 字符，剔除二进制乱码
        # 这行代码会过滤掉图片头部的非法字符
        data = re.sub(r'[^A-Za-z0-9+/=]', '', data)
        
        # 补齐等号
        missing_padding = len(data) % 4
        if missing_padding:
            data += '=' * (4 - missing_padding)
            
        raw_bytes = base64.b64decode(data)
        
        # 对齐 16 字节
        valid_len = (len(raw_bytes) // 16) * 16
        if valid_len == 0: return ""
        
        cipher = AES.new(AES_KEY, AES.MODE_ECB)
        decrypted = cipher.decrypt(raw_bytes[:valid_len])
        
        # 移除填充
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
        # 强制使用二进制方式读取，确保不会因为编码解析乱码
        res = requests.get(SOURCE_URL, timeout=15)
        # 将二进制转为字符串，非 ASCII 字符会直接报错，所以我们要手动处理
        text = "".join(chr(b) for b in res.content if b < 128)

        if "**" in text:
            parts = text.split("**")
            # 找到最长的那一段，那是我们的 AES 密文
            content = max(parts, key=len)
        else:
            content = text

        print(f"提取密文成功，长度: {len(content)}")
        decrypted_text = aes_decrypt(content)
        
        start = decrypted_text.find('{')
        end = decrypted_text.rfind('}') + 1
        
        if start == -1:
            print("❌ 依然无法解析，可能是提取出的 Base64 依然包含杂质")
            return

        data = json.loads(decrypted_text[start:end])
        print("✅ 天神源解密成功！正在过滤...")

        # 过滤 Lives
        if "lives" in data:
            data["lives"] = [l for l in data["lives"] if l.get("name") not in HIDE_LIVES]
        # 过滤并替换 Sites
        if "sites" in data:
            new_sites = []
            for s in data["sites"]:
                key = s.get("key")
                if key in HIDE_SITES: continue
                new_sites.append(REPLACEMENTS.get(key, s))
            data["sites"] = new_sites

        with open("my_local.json", "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print("✅ 配置文件 my_local.json 已成功生成！")

    except Exception as e:
        print(f"❌ 运行报错: {e}")

if __name__ == "__main__":
    main()
