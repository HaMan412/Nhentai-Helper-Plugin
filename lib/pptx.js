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

        // 使用手机屏幕比例 9:16 (5.625 x 10 英寸，竖屏)
        // 适合手机全屏阅读
        pptx.defineLayout({ name: 'PHONE_9x16', width: 5.625, height: 10 });
        pptx.layout = 'PHONE_9x16';

        let count = 0;

        if (showLog) console.log('开始生成PPTX...');

        // 设置PPTX元数据
        pptx.author = 'Nhentai Downloader';
        pptx.company = 'Yunzai-Bot';
        pptx.subject = `Nhentai ${id}`;
        pptx.title = `NH${id}`;

        // 手机屏幕幻灯片尺寸（英寸）- 9:16竖屏
        const slideWidth = 5.625;
        const slideHeight = 10;

        for (const img of images) {
            try {
                // 读取图片并获取尺寸
                const imgBuffer = fs.readFileSync(img);
                const metadata = await sharp(imgBuffer).metadata();

                // 转换为JPG格式（提高质量）
                const jpegBuffer = await sharp(imgBuffer).jpeg({ quality: 95 }).toBuffer();
                const base64Image = jpegBuffer.toString('base64');

                // 计算图片的原始宽高比
                const imgRatio = metadata.width / metadata.height;
                const slideRatio = slideWidth / slideHeight;

                let imgW, imgH, imgX, imgY;

                // 根据宽高比计算图片尺寸，确保完整显示
                if (imgRatio > slideRatio) {
                    // 图片更宽，以宽度为准
                    imgW = slideWidth;
                    imgH = slideWidth / imgRatio;
                    imgX = 0;
                    imgY = (slideHeight - imgH) / 2; // 垂直居中
                } else {
                    // 图片更高，以高度为准
                    imgH = slideHeight;
                    imgW = slideHeight * imgRatio;
                    imgX = (slideWidth - imgW) / 2; // 水平居中
                    imgY = 0;
                }

                // 创建幻灯片
                const slide = pptx.addSlide();

                // 添加图片（居中显示，完整可见）
                slide.addImage({
                    data: `data:image/jpeg;base64,${base64Image}`,
                    x: imgX,
                    y: imgY,
                    w: imgW,
                    h: imgH
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
