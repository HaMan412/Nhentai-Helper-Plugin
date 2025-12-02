import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { HttpsProxyAgent } from 'https-proxy-agent';

export default class Downloader {
    constructor(proxy) {
        const config = {
            timeout: 30000,
            headers: { 'Referer': 'https://nhentai.net/' }
        };

        if (proxy) {
            config.httpsAgent = new HttpsProxyAgent(proxy);
            config.proxy = false;
        }

        this.client = axios.create(config);
    }

    async download(pages, id, onProgress) {
        const dir = `./plugins/nh-downloader/temp/${id}`;
        fs.mkdirSync(dir, { recursive: true });

        const files = [];
        for (let i = 0; i < pages.length; i += 5) {
            const batch = pages.slice(i, i + 5);
            await Promise.all(batch.map(async p => {
                const file = path.join(dir, `${p.num.toString().padStart(3, '0')}.${p.ext}`);
                const res = await this.client.get(p.url, { responseType: 'stream' });
                await new Promise((ok, fail) => {
                    res.data.pipe(fs.createWriteStream(file)).on('finish', ok).on('error', fail);
                });
                files.push(file);
                onProgress?.(files.length, pages.length);
            }));
        }
        return files.sort();
    }

    cleanup(id) {
        const dir = `./plugins/nh-downloader/temp/${id}`;
        if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true });
        }
    }
}
