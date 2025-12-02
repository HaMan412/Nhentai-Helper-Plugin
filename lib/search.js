import puppeteer from '../../../lib/puppeteer/puppeteer.js';

export default class NhentaiSearch {
    async search(keyword, page = 1) {
        let browser = null;
        let pageObj = null;

        try {
            browser = await puppeteer.browserInit();
            pageObj = await browser.newPage();

            await pageObj.setViewport({ width: 2560, height: 1440 });
            await pageObj.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

            const searchUrl = `https://nhentai.net/search/?q=${encodeURIComponent(keyword)}&page=${page}`;
            console.log('正在访问:', searchUrl);

            await pageObj.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

            // 等待图片加载完成
            await pageObj.waitForSelector('.gallery img', { timeout: 10000 });

            // 等待所有封面图片加载完成
            await pageObj.evaluate(() => {
                return Promise.all(
                    Array.from(document.querySelectorAll('.gallery img')).map(img => {
                        if (img.complete) return Promise.resolve();
                        return new Promise(resolve => {
                            img.onload = resolve;
                            img.onerror = resolve;
                        });
                    })
                );
            });

            console.log('图片加载完成');

            // 提取ID和标题
            const results = await pageObj.$$eval('.gallery', galleries => {
                return galleries.map(gallery => {
                    const link = gallery.querySelector('a.cover');
                    const caption = gallery.querySelector('.caption');

                    if (!link) return null;

                    const match = link.href.match(/\/g\/(\d+)\//);
                    const id = match ? match[1] : null;
                    const title = caption ? caption.textContent.trim() : '';

                    return id ? { id, title } : null;
                }).filter(Boolean);
            });

            const ids = results.map(r => r.id);
            console.log(`找到 ${ids.length} 个结果`);

            if (ids.length === 0) {
                throw new Error('未找到搜索结果，请检查关键词');
            }

            // 截取漫画容器元素
            const containerElement = await pageObj.$('.container.index-container');
            if (!containerElement) {
                throw new Error('未找到漫画容器元素');
            }

            const screenshot = await containerElement.screenshot({ type: 'png' });

            return {
                screenshot,
                results,
                ids,
                currentPage: page,
                keyword
            };

        } catch (error) {
            console.error('搜索失败:', error);
            throw error;
        } finally {
            // 确保资源释放，防止内存泄露
            if (pageObj) {
                try {
                    await pageObj.close();
                } catch (err) {
                    console.error('关闭页面失败:', err.message);
                }
            }
        }
    }

    formatIdsForForward(results, keyword, page) {
        return [
            `搜索关键词：${keyword}`,
            `当前页码：第${page}页`,
            `找到 ${results.length} 个结果：`,
            '',
            ...results.map((r, index) => `${index + 1}.\n【${r.id}】\n${r.title}`)
        ];
    }
}
