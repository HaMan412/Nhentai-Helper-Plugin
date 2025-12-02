# Nhentai 下载器

> 为Yunzai提供Nhentai搜索和下载功能的插件

## ✨ 功能

- 🔍 搜索漫画并返回ID列表(车牌号)
- 📥 下载漫画转为PPTX文件
- 🖼️ 可选的搜索结果网页截图（默认关闭）
- 🔒 黑白名单权限控制

## 📦 安装

```bash
# 克隆本插件
git clone https://github.com/HaMan412/Nhentai-Helper.git ./plugins/Nhentai-Helper

# 安装依赖
cd /plugins/Nhentai-Helper
pnpm i
```

## ⚙️ 配置

### 必需配置：设置Cookie

**下载功能需要配置Nhentai Cookie才能使用！**

#### 如何获取Cookie：

1. 打开浏览器，访问 [nhentai.net](https://nhentai.net) 并登录
2. 按 `F12` 打开开发者工具
3. 点击 `Application（应用）` 标签
4. 左侧展开 `Cookies` → 点击 `https://nhentai.net`
5. 找到以下两个值：
   - `csrftoken`
   - `sessionid`
6. 将它们组合起来（用分号和空格分隔）

**示例格式：**
```
csrftoken=d58fUkNueyIGb04GMcwerfszg; sessionid=9tqsgx2uvTn7MlMldfawdwa
```

#### 设置Cookie：

在QQ群中发送(或在后台自行添加)：
```
#nh设置cookie <你的Cookie>
```

### 可选配置

编辑 `config/config.yaml` 可自定义：
- 权限黑白名单
- 代理设置
- 搜索截图开关
- 提示文本等

## 📖 使用指令

### 基础功能

| 指令 | 说明 | 示例 |
|------|------|------|
| `nh搜索 <关键词>` | 搜索漫画 | `nh搜索 东方Project` |
| `nh下载 <ID>` | 下载漫画 | `nh下载 123456` |
| `nh帮助` | 查看帮助 | `nh帮助` |

### 管理命令（仅主人可用）

| 指令 | 说明 |
|------|------|
| `#nh设置cookie <Cookie>` | 设置Cookie |
| `#nh截图 开/关` | 开启/关闭搜索截图 |
| `#nh进度 开/关` | 开启/关闭下载进度提示 |
| `#nh配置` | 查看当前配置 |
| `#nh清理` | 清理临时文件 |

## 💡 提示

- 搜索功能**不需要**Cookie
- 下载功能**必需**Cookie
- 搜索网页截图默认关闭
- 网页截图会在2分钟后自动撤回

## 🛠️ 依赖

- `puppeteer` - 浏览器自动化
- `axios` - HTTP请求
- `sharp` - 图片处理
- `pptxgenjs` - PPTX生成

## ⚠️ 免责声明

本插件仅供学习交流使用，请遵守当地法律法规。使用本插件所产生的一切后果由使用者自行承担。