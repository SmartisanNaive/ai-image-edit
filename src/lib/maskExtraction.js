/**
 * 根据遮罩图层从主图层中提取内容
 * @param {string} mainImageUrl - 主图层的 URL
 * @param {string} maskImageUrl - 遮罩图层的 URL
 * @returns {Promise<string>} - 返回提取后的透明背景图片 data URL
 */
export async function extractByMask(mainImageUrl, maskImageUrl) {
    return new Promise((resolve, reject) => {
        const mainImg = new Image();
        const maskImg = new Image();

        mainImg.crossOrigin = 'anonymous';
        maskImg.crossOrigin = 'anonymous';

        let mainLoaded = false;
        let maskLoaded = false;

        const processImages = () => {
            if (!mainLoaded || !maskLoaded) return;

            try {
                // 创建画布，尺寸以主图层为准
                const canvas = document.createElement('canvas');
                canvas.width = mainImg.width;
                canvas.height = mainImg.height;
                const ctx = canvas.getContext('2d', { alpha: true });

                // 绘制主图层
                ctx.drawImage(mainImg, 0, 0);
                const mainImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                // 创建临时画布处理遮罩图层
                const maskCanvas = document.createElement('canvas');
                maskCanvas.width = mainImg.width;
                maskCanvas.height = mainImg.height;
                const maskCtx = maskCanvas.getContext('2d', { alpha: true });

                // 将遮罩图层缩放到主图层尺寸
                maskCtx.drawImage(maskImg, 0, 0, mainImg.width, mainImg.height);
                const maskImageData = maskCtx.getImageData(0, 0, canvas.width, canvas.height);

                // 应用遮罩：遮罩图层的亮度决定主图层的透明度
                const mainData = mainImageData.data;
                const maskData = maskImageData.data;

                for (let i = 0; i < mainData.length; i += 4) {
                    // 计算遮罩像素的亮度（灰度值）
                    const maskBrightness = (maskData[i] + maskData[i + 1] + maskData[i + 2]) / 3;

                    // 遮罩的 alpha 通道也考虑进去
                    const maskAlpha = maskData[i + 3] / 255;

                    // 最终的 alpha = 遮罩亮度 * 遮罩透明度
                    const finalAlpha = (maskBrightness / 255) * maskAlpha;

                    // 应用到主图层的 alpha 通道
                    mainData[i + 3] = Math.round(mainData[i + 3] * finalAlpha);
                }

                // 将处理后的数据放回画布
                ctx.putImageData(mainImageData, 0, 0);

                // 转换为 data URL
                canvas.toBlob((blob) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = () => reject(new Error('转换图片失败'));
                    reader.readAsDataURL(blob);
                }, 'image/png');

            } catch (error) {
                reject(new Error(`遮罩抠图失败: ${error.message}`));
            }
        };

        mainImg.onload = () => {
            mainLoaded = true;
            processImages();
        };

        maskImg.onload = () => {
            maskLoaded = true;
            processImages();
        };

        mainImg.onerror = () => reject(new Error('加载主图层失败'));
        maskImg.onerror = () => reject(new Error('加载遮罩图层失败'));

        mainImg.src = mainImageUrl;
        maskImg.src = maskImageUrl;
    });
}
