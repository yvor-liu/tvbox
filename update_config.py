import requests
import json
import base64
from Crypto.Cipher import AES

# 1. 配置信息 - 确认使用 .png 后缀
SOURCE_URL = "https://wget.la/https://raw.githubusercontent.com/IY-CPU/IY/main/天神IY.png"
JAR_URL = "https://ghproxy.net/https://raw.githubusercontent.com/yvor-liu/tvbox/main/1767541963195d1mrhw.txt"

# 天神源 AES 密钥 (128位 ECB模式)
AES_KEY = b"6543210987654321" 

HIDE_LIVES = ["限时测试", "内置测测", "V4-develop202", "V6-范明明（需开启V6网络）", "YY轮播"]
HIDE_SITES = ["版本信息", "DG音乐仓", "lf_live10_min", "六月听书", "世界听书", "蜻蜓FM", "凤凰FM"]

REPLACEMENTS = {
    "随身评书": {"key": "随身评书", "name": "📺斗鱼｜直播", "type": 3, "api": "csp_WexNewDouYuGuard", "searchable": 1, "changeable": 0, "jar": JAR_URL},
    "戏曲多多": {"key": "戏曲多多", "name": "📺虎牙｜直播", "type": 3, "api": "csp_WexNewHuYaGuard", "searchable": 1, "changeable": 0, "jar": JAR_URL},
    "哔哩直播": {"key": "哔哩直播", "name": "📺哔哩｜直播", "type": 3, "api": "csp_WexNewBiLiLiveGuard", "searchable": 1, "changeable": 0, "jar": JAR_URL}
}

def aes_decrypt(data):
    """专门针对天神源提取 Base64 后的解密"""
    try:
        # 去除可能存在的非 Base64 字符
        data = data.strip()
        # 补齐等号
        missing_padding = len(data) % 4
        if missing_padding:
            data += '=' * (4 - missing_padding)
            
        raw_bytes = base64.b64decode(data)
        
        # 核心：AES-128-ECB 要求 16 字节对齐
        # 截取掉末尾可能存在的校验位干扰，保留 16 的倍数长度
        valid_len = (len(raw_bytes) // 16) * 16
        if valid_len == 0: return ""
        
        cipher = AES.new(AES_KEY, AES.MODE_ECB)
        decrypted = cipher.decrypt(raw_bytes[:valid_len])
        
        # 移除 PKCS7 填充字符
        padding_len = decrypted[-1]
        if padding_len < 16:
            decrypted = decrypted[:-padding_len]
            
        return decrypted.decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"解密逻辑内部错误: {e}")
        return ""

def main():
    try:
        print(f"正在从 PNG 源获取数据: {SOURCE_URL}")
        res = requests.get(SOURCE_URL, timeout=15)
        text = res.text.strip()

        # 精准定位加密主体
        if "**" in text:
            # 天神源格式通常是: [图片链接]**[加密内容]**[校验位]
            parts = text.split("**")
            # 通常第二段是最长的加密内容
            content = max(parts, key=len)
        else:
            content = text

        print(f"获取到的加密段长度: {len(content)}")
        decrypted_text = aes_decrypt(content)
        
        # 寻找 JSON 的开头和结尾
        start = decrypted_text.find('{')
        end = decrypted_text.rfind('}') + 1
        
        if start == -1:
            print("❌ 解密结果不包含有效的 JSON 结构，请检查密钥是否失效")
            print(f"解密出的前50位预览: {decrypted_text[:50]}")
            return

        data = json.loads(decrypted_text[start:end])
        print("✅ 天神源 (.png) 解密成功！")

        # 过滤与替换逻辑
        if "lives" in data:
            data["lives"] = [l for l in data["lives"] if l.get("name") not in HIDE_LIVES]
        if "sites" in data:
            new_sites = []
            for s in data["sites"]:
                key = s.get("key")
                if key in HIDE_SITES: continue
                new_sites.append(REPLACEMENTS.get(key, s))
            data["sites"] = new_sites

        # 保存结果
        with open("my_local.json", "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print("✅ 配置文件 my_local.json 已成功生成")

    except Exception as e:
        print(f"❌ 运行报错: {e}")

if __name__ == "__main__":
    main()
