import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

export default class NhentaiAPI {
    constructor(cookie, proxy) {
        const config = {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
                'Cookie': cookie,
                'Referer': 'https://nhentai.net/'
            }
        };

        if (proxy) {
            config.httpsAgent = new HttpsProxyAgent(proxy);
            config.proxy = false;
        }

        this.client = axios.create(config);
    }

    async getGallery(id) {
        const { data } = await this.client.get(`https://nhentai.net/api/gallery/${id}`);

        // 正确的图片格式映射，包含webp
        const getExt = (t) => ({
            'j': 'jpg',
            'p': 'png',
            'g': 'gif',
            'w': 'webp'  // WebP格式！
        }[t] || 'jpg');

        return {
            id: data.id,
            title: data.title.pretty || data.title.english,
            mediaId: data.media_id,
            pages: data.images.pages.map((p, i) => ({
                url: `https://i.nhentai.net/galleries/${data.media_id}/${i + 1}.${getExt(p.t)}`,
                num: i + 1,
                ext: getExt(p.t)
            }))
        };
    }
}
