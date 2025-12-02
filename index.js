import plugin from '../../lib/plugins/plugin.js';
import fs from 'fs';
import yaml from 'yaml';
import NhentaiAPI from './lib/api.js';
import Downloader from './lib/downloader.js';
import PPTXGen from './lib/pptx.js';
import NhentaiSearch from './lib/search.js';
import common from '../../lib/common/common.js';

export class NhDownloader extends plugin {
    constructor() {
        super({
            name: 'Nhentai下载器',
            event: 'message',
            priority: 5000,
            rule: [
                { reg: '^nh帮助$', fnc: 'showHelp' },
                { reg: '^nh下载\\s*(\\d+)$', fnc: 'download' },
                { reg: '^nh搜索\\s+(.+)', fnc: 'search' },
                { reg: '^#nh设置cookie\\s+(.+)', fnc: 'setCookie', permission: 'master' },
                { reg: '^#nh进度\\s*(开|关)', fnc: 'toggleProgress', permission: 'master' },
                { reg: '^#nh截图\\s*(开|关)', fnc: 'toggleScreenshot', permission: 'master' },
                { reg: '^#nh清理$', fnc: 'cleanTemp', permission: 'master' },
                { reg: '^#nh配置$', fnc: 'showConfig', permission: 'master' }
            ]
        });

        this.cfg = yaml.parse(fs.readFileSync('./plugins/Nhentai-Helper/config/config.yaml', 'utf8'));
        this.searcher = new NhentaiSearch();
        this.recallTimers = new Map();
    }

    check(e) {
        if (!e.isGroup) return '仅限群聊使用';
        if (this.cfg.permission.blacklist.includes(e.user_id)) return '您已被禁用';
        if (this.cfg.permission.whitelist_groups.length && !this.cfg.permission.whitelist_groups.includes(e.group_id))
            return '该群未开通';
        return null;
    }

    async search(e) {
        const err = this.check(e);
        if (err) return e.reply(`❌ ${err}`);

        const keyword = e.msg.replace(/^nh搜索\s+/, '').trim();

        try {
            await e.reply('🔍 搜索中，请稍候...');

            const result = await this.searcher.search(keyword, 1);

            const showScreenshot = this.cfg.search.show_screenshot !== false;
            let screenshotMsgId = null;

            if (showScreenshot) {
                const screenshotMsg = await e.reply(segment.image(result.screenshot));
                screenshotMsgId = screenshotMsg.message_id;
            }

            const idMessages = this.searcher.formatIdsForForward(result.results, keyword, result.currentPage);
            const forwardMsg = await common.makeForwardMsg(e, idMessages, `搜索结果 - ${keyword}`);
            await e.reply(forwardMsg);

            if (screenshotMsgId) {
                this.scheduleRecall(e, [screenshotMsgId]);
            }

        } catch (error) {
            console.error('搜索失败:', error);
            e.reply(`❌ 搜索失败: ${error.message}`);
        }
    }

    scheduleRecall(e, messageIds) {
        const key = `${e.group_id}_${e.user_id}`;

        if (this.recallTimers.has(key)) {
            clearTimeout(this.recallTimers.get(key));
        }

        const timer = setTimeout(async () => {
            for (const msgId of messageIds) {
                try {
                    await e.group.recallMsg(msgId);
                } catch (err) {
                    console.log(`撤回消息失败 ${msgId}:`, err.message);
                }
            }
            this.recallTimers.delete(key);
        }, 115000);

        this.recallTimers.set(key, timer);
    }

    async download(e) {
        const err = this.check(e);
        if (err) return e.reply(`❌ ${err}`);

        if (!this.cfg.nhentai.cookie) return e.reply('❌ 未配置Cookie！请主人使用: #nh设置cookie <Cookie>');

        const id = e.msg.match(/\d+/)[0];
        const showProgress = this.cfg.download.show_progress !== false;
        const showLog = this.cfg.download.show_log !== false;

        try {
            const api = new NhentaiAPI(this.cfg.nhentai.cookie, this.cfg.nhentai.proxy);
            const gallery = await api.getGallery(id);

            await e.reply(`📖 ${gallery.title}\n📄 共${gallery.pages.length}页\n⬇️ 下载中...`);

            const dl = new Downloader(this.cfg.nhentai.proxy);
            const files = await dl.download(gallery.pages, id, (cur, tot) => {
                if (showProgress && cur % 10 === 0) {
                    e.reply(`⬇️ ${cur}/${tot}`);
                }
            });

            if (showProgress) {
                await e.reply(`📄 生成PPTX...`);
            }

            const pptx = await new PPTXGen().create(files, id, gallery.title, showLog);

            const sizeMB = fs.statSync(pptx).size / 1024 / 1024;
            if (sizeMB > this.cfg.upload.max_size) {
                return e.reply(`❌ 文件过大: ${sizeMB.toFixed(1)}MB`);
            }

            await e.group.fs.upload(pptx);

        } catch (ex) {
            console.error(ex);

            if (ex.message.includes('403') || ex.message.includes('Forbidden')) {
                e.reply('❌ Cookie已过期或无效！\n请使用 #nh设置cookie <新Cookie> 更新');
            } else if (ex.message.includes('404')) {
                e.reply('❌ 该ID不存在或已被删除');
            } else {
                e.reply(`❌ 失败: ${ex.message}`);
            }
        }
    }

    async cleanTemp(e) {
        const tempDir = './plugins/Nhentai-Helper/temp';
        try {
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
                fs.mkdirSync(tempDir);
                e.reply('✅ 临时文件已清理');
            }
        } catch (err) {
            e.reply(`❌ 清理失败: ${err.message}`);
        }
    }

    async setCookie(e) {
        const cookie = e.msg.replace(/^#nh设置cookie\s+/, '').trim();
        this.cfg.nhentai.cookie = cookie;
        fs.writeFileSync('./plugins/Nhentai-Helper/config/config.yaml', yaml.stringify(this.cfg));
        e.reply('✅ Cookie已设置');
    }

    async toggleProgress(e) {
        const action = e.msg.match(/开|关/)[0];
        this.cfg.download.show_progress = (action === '开');
        fs.writeFileSync('./plugins/Nhentai-Helper/config/config.yaml', yaml.stringify(this.cfg));
        e.reply(`✅ 进度提示已${action === '开' ? '开启' : '关闭'}`);
    }

    async toggleScreenshot(e) {
        const action = e.msg.match(/开|关/)[0];
        this.cfg.search.show_screenshot = (action === '开');
        fs.writeFileSync('./plugins/Nhentai-Helper/config/config.yaml', yaml.stringify(this.cfg));
        e.reply(`✅ 搜索截图已${action === '开' ? '开启' : '关闭'}`);
    }

    async showHelp(e) {
        const help = this.cfg.messages?.help || [
            '📚 Nhentai下载器 - 帮助',
            '',
            '【基础功能】',
            '🔍 nh搜索 关键词',
            '   搜索漫画，返回ID列表',
            '   示例：nh搜索 东方Project',
            '',
            '⬇️ nh下载 ID',
            '   下载漫画为PPTX',
            '   示例：nh下载 123456',
            '',
            '【管理命令】',
            '⚙️ #nh配置',
            '   查看当前配置',
            '',
            '📷 #nh截图 开/关',
            '   搜索时是否显示截图',
            '   (默认关闭，节省流量)',
            '',
            '💡 提示：截图会在1分55秒后自动撤回',
            '   ID列表永久保留'
        ].join('\n');

        e.reply(help);
    }

    async showConfig(e) {
        const c = this.cfg;
        const m = this.cfg.messages || {};

        const msg = [
            m.config_header || '📋 Nhentai配置',
            '',
            `${m.config_cookie_label || '🍪 Cookie'}: ${c.nhentai.cookie ? (m.config_status_configured || '已配置') : (m.config_status_not_configured || '未配置')}`,
            `${m.config_proxy_label || '🌐 代理'}: ${c.nhentai.proxy || (m.config_status_none || '无')}`,
            `${m.config_progress_label || '📊 进度提示'}: ${c.download.show_progress ? (m.config_status_on || '开启') : (m.config_status_off || '关闭')}`,
            `${m.config_log_label || '📝 后台日志'}: ${c.download.show_log !== false ? (m.config_status_on || '开启') : (m.config_status_off || '关闭')}`,
            `${m.config_screenshot_label || '📷 搜索截图'}: ${c.search.show_screenshot ? (m.config_status_on || '开启') : (m.config_status_off || '关闭')}`,
            '',
            `${m.config_blacklist_label || '📛 黑名单'}: ${c.permission.blacklist.length}人`,
            `${m.config_whitelist_label || '✅ 白名单群'}: ${c.permission.whitelist_groups.join(', ')}`
        ].join('\n');

        e.reply(msg);
    }
}
