import fs from 'fs';
import sharp from 'sharp';
import path from 'path';
import { createRequire } from 'module';

// 使用CommonJS方式加载pptxgenjs以避免ES Module问题
const require = createRequire(import.meta.url);

export default class PPTXGen {
    async create(images, id, title, showLog = true) {
        // 使用require加载pptxgenjs的CommonJS版本
        const PptxGenJS = require('pptxgenjs');

        const pptx = new PptxGenJS();
        let count = 0;

        if (showLog) console.log('开始生成PPTX...');

        // 设置PPTX元数据
        pptx.author = 'Nhentai Downloader';
        pptx.company = 'Yunzai-Bot';
        pptx.subject = `Nhentai ${id}`;
        pptx.title = `NH${id}`;

        for (const img of images) {
            try {
                // 读取图片并获取尺寸
                const imgBuffer = fs.readFileSync(img);
                const metadata = await sharp(imgBuffer).metadata();

                // 转换为JPG格式
                const jpegBuffer = await sharp(imgBuffer).jpeg().toBuffer();
                const base64Image = jpegBuffer.toString('base64');

                // 根据图片尺寸创建幻灯片（单位：英寸）
                // 将像素转换为英寸 (72 DPI是标准)
                const imgWidthInch = metadata.width / 72;
                const imgHeightInch = metadata.height / 72;

                // 创建与图片尺寸匹配的幻灯片
                const slide = pptx.addSlide();
                pptx.defineLayout({ name: `layout_${count}`, width: imgWidthInch, height: imgHeightInch });
                pptx.layout = `layout_${count}`;

                // 图片填满整个幻灯片，无边距
                slide.addImage({
                    data: `data:image/jpeg;base64,${base64Image}`,
                    x: 0,
                    y: 0,
                    w: imgWidthInch,
                    h: imgHeightInch
                });

                count++;
                if (showLog && count % 5 === 0) console.log(`已处理 ${count}/${images.length}`);

            } catch (err) {
                console.error(`处理失败 ${path.basename(img)}: ${err.message}`);
            }
        }

        if (showLog) console.log(`PPTX完成: ${count}页`);

        // 文件名: NH{ID}.nh.pptx
        const out = `./plugins/Nhentai-Helper/temp/${id}.nh.pptx`;
        await pptx.writeFile({ fileName: out });
        return out;
    }
}
