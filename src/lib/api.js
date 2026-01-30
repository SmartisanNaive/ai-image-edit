
export const API_CONFIG = {
    baseUrl: 'https://foxi-ai.top', // Default, can be overridden
    apiKey: '', // User must provide
    timeoutMs: 300_000, // 300 秒
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = API_CONFIG.timeoutMs) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } catch (err) {
        if (err?.name === 'AbortError') {
            throw new Error(`请求超时（${Math.round(timeoutMs / 1000)}秒）`);
        }
        // 浏览器网络层错误（例如 net::ERR_CONNECTION_CLOSED / CORS 阻止 / 断网）通常会表现为 TypeError: Failed to fetch
        if (err instanceof TypeError) {
            throw new Error(
                '网络请求失败：连接被中断（可能是服务端主动断开、网络/代理不稳定、或请求体过大导致网关重置连接）。'
            );
        }
        throw err;
    } finally {
        clearTimeout(timer);
    }
};

const isLikelyBase64 = (value) => {
    if (!value || typeof value !== 'string') return false;
    // very loose check: base64 chars, optional padding, no whitespace
    return /^[A-Za-z0-9+/]+={0,2}$/.test(value) && value.length > 64;
};

const parseDataUrl = (value) => {
    if (!value || typeof value !== 'string') return null;
    if (!value.startsWith('data:image/')) return null;
    const [meta, b64] = value.split(',');
    if (!b64) return null;
    const mimeType = meta.split(';')[0].slice('data:'.length) || 'image/png';
    return { mimeType, base64: b64 };
};

const base64ToBlob = (base64, mimeType = 'image/png') => {
    const byteString = atob(base64);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeType });
};

/**
 * Fetch image from URL and convert to base64
 */
const fetchImageAsBase64 = async (imageUrl) => {
    try {
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);

        const blob = await response.blob();
        const mimeType = blob.type || 'image/jpeg';

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result;
                const base64 = dataUrl.split(',')[1];
                resolve({ mimeType, base64 });
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (err) {
        throw new Error(`无法下载图片: ${err.message}`);
    }
};

export async function uploadFile({ dataUrl, apiKey, baseUrl, filename = 'upload.png' }) {
    const url = `${baseUrl || API_CONFIG.baseUrl}/v1/files`;

    // 支持传入 data:image/... 或 https://...
    if (typeof dataUrl !== 'string' || dataUrl.length === 0) {
        throw new Error('上传失败：缺少文件数据');
    }
    if (/^https?:\/\//i.test(dataUrl)) {
        return { url: dataUrl };
    }

    const parsed = parseDataUrl(dataUrl);
    if (!parsed) throw new Error('上传失败：仅支持图片 dataURL');

    const formData = new FormData();
    formData.append('file', base64ToBlob(parsed.base64, parsed.mimeType), filename);

    const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey || API_CONFIG.apiKey}`
        },
        body: formData
    });

    if (!response.ok) {
        let message = '文件上传失败';
        try {
            const err = await response.json();
            message = err.error?.message || message;
        } catch {
            // ignore
        }
        throw new Error(message);
    }

    const data = await response.json();
    if (!data?.url) throw new Error('文件上传失败：响应中缺少 url');
    return data; // { id, url, ... }
}

/**
 * Extract base64 image from Gemini Native API response
 * Response format: { candidates: [{ content: { parts: [{ inlineData: { mimeType, data } }] } }] }
 */
const extractBase64ImageFromGeminiNative = (payload) => {
    try {
        // Try to extract from candidates[0].content.parts
        const parts = payload?.candidates?.[0]?.content?.parts;
        if (Array.isArray(parts)) {
            for (const part of parts) {
                // Check for inlineData (base64 image)
                const inlineData = part?.inlineData;
                if (inlineData?.data && inlineData?.mimeType) {
                    return {
                        mimeType: inlineData.mimeType,
                        base64: inlineData.data
                    };
                }

                // Check for text content that might contain image URL or base64
                const text = part?.text;
                if (typeof text === 'string') {
                    // Try to parse as data URL
                    const asDataUrl = parseDataUrl(text);
                    if (asDataUrl) return asDataUrl;

                    // Check if it's a markdown image link
                    const markdownMatch = text.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/);
                    if (markdownMatch) {
                        // For now, we can't fetch external URLs, so return null
                        // In the future, we could fetch and convert to base64
                        console.warn('Gemini returned external image URL:', markdownMatch[1]);
                    }
                }
            }
        }
    } catch (err) {
        console.error('Error extracting image from Gemini native response:', err);
    }

    return null;
};

const extractBase64ImageFromChat = (payload) => {
    // Try common shapes (provider variations)
    const candidates = [];

    // 1) OpenAI-like images API passthrough
    const directB64 = payload?.data?.[0]?.b64_json;
    if (typeof directB64 === 'string') candidates.push({ mimeType: 'image/png', base64: directB64 });

    // 2) chat.completions: choices[0].message.content (string or array)
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content === 'string') {
        const asDataUrl = parseDataUrl(content);
        if (asDataUrl) return asDataUrl;

        // Check for markdown image link: ![alt](url)
        const markdownMatch = content.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/);
        if (markdownMatch) {
            const imageUrl = markdownMatch[1];
            // Return the URL directly, we'll handle fetching in the caller
            return { mimeType: 'image/jpeg', base64: null, url: imageUrl };
        }

        // maybe it is a raw base64 string
        if (isLikelyBase64(content)) return { mimeType: 'image/png', base64: content };

        // maybe it is JSON in string
        try {
            const obj = JSON.parse(content);
            const b64 = obj?.b64_json || obj?.image || obj?.data?.b64_json;
            const dataUrl = obj?.data_url || obj?.image_url || obj?.url;
            const parsed = parseDataUrl(dataUrl);
            if (parsed) return parsed;
            if (typeof b64 === 'string' && isLikelyBase64(b64)) return { mimeType: obj?.mime_type || 'image/png', base64: b64 };
        } catch {
            // ignore
        }
    }

    if (Array.isArray(content)) {
        for (const part of content) {
            const url = part?.image_url?.url || part?.image_url || part?.url;
            const parsed = parseDataUrl(url);
            if (parsed) return parsed;
            const b64 = part?.b64_json || part?.b64 || part?.image?.b64_json;
            if (typeof b64 === 'string' && isLikelyBase64(b64)) return { mimeType: part?.mime_type || 'image/png', base64: b64 };
        }
    }

    // 3) some providers place images in a separate field
    const maybeImages = payload?.images || payload?.output?.images || payload?.choices?.[0]?.message?.images;
    if (Array.isArray(maybeImages)) {
        for (const img of maybeImages) {
            const parsed = parseDataUrl(img?.data_url || img?.url);
            if (parsed) return parsed;
            const b64 = img?.b64_json || img?.b64;
            if (typeof b64 === 'string' && isLikelyBase64(b64)) return { mimeType: img?.mime_type || 'image/png', base64: b64 };
        }
    }

    // fallback to candidates
    if (candidates.length > 0) return candidates[0];
    return null;
};

/**
 * Helper to convert Blob/File to Base64
 */
export const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]); // Remove data:image/...;base64,
        reader.onerror = error => reject(error);
    });
};

/**
 * Call the Gemini Image Generation API
 * Supports both OpenAI format and Gemini native format
 */
export async function generateImage({ prompt, aspectRatio = '1:1', apiKey, baseUrl, model, size = '1024x1024', useGeminiNative = false }) {
    if (useGeminiNative) {
        // Gemini Native API format
        const url = `${baseUrl || API_CONFIG.baseUrl}/v1beta/models/${model || 'gemini-2.5-flash-image'}:generateContent`;

        const response = await fetchWithTimeout(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey || API_CONFIG.apiKey}`
            },
            body: JSON.stringify({
                contents: [
                    {
                        role: "user",
                        parts: [{ text: prompt }]
                    }
                ],
                generationConfig: {
                    responseModalities: ["image"],
                    imageConfig: {
                        aspectRatio: aspectRatio,
                        imageSize: size
                    }
                }
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || '生成失败');
        }

        const data = await response.json();

        // Extract image from Gemini native response
        const extracted = extractBase64ImageFromGeminiNative(data);
        if (!extracted) throw new Error('生成失败：未从响应中解析到图片数据');

        return {
            data: [{
                b64_json: extracted.base64
            }]
        };
    } else {
        // OpenAI format
        const url = `${baseUrl || API_CONFIG.baseUrl}/v1/images/generations`;

        // Build request body
        const requestBody = {
            prompt,
            model: model || "gemini-2.5-flash-image",
            n: 1,
            size: size,
            aspect_ratio: aspectRatio,
            response_format: "b64_json"
        };

        // Add extra_body for additional image config if needed
        if (aspectRatio || size) {
            requestBody.extra_body = {
                google: {
                    image_config: {}
                }
            };

            if (aspectRatio) {
                requestBody.extra_body.google.image_config.aspect_ratio = aspectRatio;
            }

            if (size) {
                requestBody.extra_body.google.image_config.image_size = size;
            }
        }

        const response = await fetchWithTimeout(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey || API_CONFIG.apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || '生成失败');
        }

        return await response.json();
    }
}

/**
 * 使用 OpenAI Chat Completions 格式的"绘图模型"（例如 gemini-3-pro-image-preview）
 * 说明：不同服务商返回图片的字段可能不同，这里做了尽可能兼容的解析。
 * 支持 Gemini 原生格式和 OpenAI 格式
 */
export async function generateImageViaChatCompletions({ prompt, apiKey, baseUrl, model, aspectRatio = '1:1', imageSize = '', useGeminiNative = false }) {
    if (useGeminiNative) {
        // Gemini Native API format
        const url = `${baseUrl || API_CONFIG.baseUrl}/v1beta/models/${model}:generateContent`;

        const response = await fetchWithTimeout(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey || API_CONFIG.apiKey}`
            },
            body: JSON.stringify({
                contents: [
                    {
                        role: "user",
                        parts: [{ text: prompt }]
                    }
                ],
                generationConfig: {
                    responseModalities: ["image"],
                    imageConfig: {
                        aspectRatio: aspectRatio,
                        imageSize: "800:800"
                    }
                }
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || '生成失败');
        }

        const data = await response.json();
        const extracted = extractBase64ImageFromGeminiNative(data);
        if (!extracted) throw new Error('生成失败：未从响应中解析到图片数据');
        return extracted; // { mimeType, base64 }
    } else {
        // OpenAI format
        const url = `${baseUrl || API_CONFIG.baseUrl}/v1/chat/completions`;

        // Build request body
        const requestBody = {
            model,
            stream: false,
            messages: [
                {
                    role: 'user',
                    content: [{ type: 'text', text: prompt }]
                }
            ]
        };

        // Add extra_body for Google image config
        if (aspectRatio || imageSize) {
            requestBody.extra_body = {
                google: {
                    image_config: {}
                }
            };

            if (aspectRatio) {
                requestBody.extra_body.google.image_config.aspect_ratio = aspectRatio;
            }

            if (imageSize) {
                requestBody.extra_body.google.image_config.image_size = imageSize;
            }
        }

        const response = await fetchWithTimeout(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey || API_CONFIG.apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || '生成失败');
        }

        const data = await response.json();
        const extracted = extractBase64ImageFromChat(data);
        if (!extracted) throw new Error('生成失败：未从响应中解析到图片数据');

        // If extracted contains a URL instead of base64, fetch and convert it
        if (extracted.url && !extracted.base64) {
            const fetched = await fetchImageAsBase64(extracted.url);
            return fetched; // { mimeType, base64 }
        }

        return extracted; // { mimeType, base64 }
    }
}

/**
 * Edit image using Gemini Native API format
 */
async function editImageViaGeminiNative({ imageDataUrl, maskDataUrl, prompt, apiKey, baseUrl, model }) {
    const url = `${baseUrl || API_CONFIG.baseUrl}/v1beta/models/${model}:generateContent`;

    // 解析图片数据
    const imageParsed = parseDataUrl(imageDataUrl);
    if (!imageParsed) throw new Error('无效的图片数据');

    // 构建 parts 数组
    const parts = [{ text: prompt }];

    // 添加原图
    parts.push({
        inlineData: {
            mimeType: imageParsed.mimeType,
            data: imageParsed.base64
        }
    });

    // 如果有遮罩，添加遮罩图
    if (maskDataUrl) {
        const maskParsed = parseDataUrl(maskDataUrl);
        if (maskParsed) {
            parts.push({
                inlineData: {
                    mimeType: maskParsed.mimeType,
                    data: maskParsed.base64
                }
            });
        }
    }

    const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey || API_CONFIG.apiKey}`
        },
        body: JSON.stringify({
            contents: [{
                role: "user",
                parts: parts
            }],
            generationConfig: {
                responseModalities: ["image"]
            }
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || '编辑失败');
    }

    const data = await response.json();
    const extracted = extractBase64ImageFromGeminiNative(data);
    if (!extracted) throw new Error('编辑失败：未从响应中解析到图片数据');

    return extracted; // { mimeType, base64 }
}

export async function editImageViaChatCompletions({ imageDataUrl, maskDataUrl, prompt, apiKey, baseUrl, model, useGeminiNative = false }) {
    // 如果使用 Gemini 原生格式，调用专门的函数
    if (useGeminiNative) {
        return editImageViaGeminiNative({ imageDataUrl, maskDataUrl, prompt, apiKey, baseUrl, model });
    }

    // 否则使用 OpenAI 格式
    const url = `${baseUrl || API_CONFIG.baseUrl}/v1/chat/completions`;

    // 根据是否有遮罩，构建不同的指令和内容
    let instruction;
    let content;

    if (maskDataUrl) {
        // 有遮罩：使用遮罩编辑指令，直接发送 base64 数据
        instruction =
            `你将收到两张图片：第一张为原图，第二张为遮罩。\n` +
            `编辑规则（必须严格遵守）：\n` +
            `1) 只允许修改遮罩中【白色】区域的内容；遮罩中【黑色】区域必须与原图保持完全一致（像素级不变）。\n` +
            `2) 不要改动黑色区域的任何内容：包括但不限于构图、背景、人物/物体位置、轮廓、大小、颜色、光照、阴影、清晰度、对比度、风格、文字水印等。\n` +
            `3) 白色区域的边缘要自然融合，避免溢出到黑色区域；不要产生新的改动区域或额外元素。\n` +
            `4) 如果指令与"仅修改白色区域/黑色区域完全不变"冲突，优先保证黑色区域不变。\n` +
            `编辑要求：\n${prompt}\n` +
            `仅输出一张编辑后的图片，不要输出任何解释文字。`;

        content = [
            { type: 'text', text: instruction },
            { type: 'image_url', image_url: { url: imageDataUrl } },
            { type: 'image_url', image_url: { url: maskDataUrl } },
        ];
    } else {
        // 无遮罩：直接对整张图片进行编辑，直接发送 base64 数据
        instruction =
            `你将收到一张图片。请根据以下要求对图片进行修改：\n` +
            `${prompt}\n` +
            `仅输出一张编辑后的图片，不要输出任何解释文字。`;

        content = [
            { type: 'text', text: instruction },
            { type: 'image_url', image_url: { url: imageDataUrl } },
        ];
    }

    const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey || API_CONFIG.apiKey}`
        },
        body: JSON.stringify({
            model,
            stream: false,
            messages: [
                {
                    role: 'user',
                    content: content
                }
            ]
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || '编辑失败');
    }

    const data = await response.json();
    const extracted = extractBase64ImageFromChat(data);
    if (!extracted) throw new Error('编辑失败：未从响应中解析到图片数据');

    // 如果返回的是外部 URL，需要下载并转换为 base64
    if (extracted.url && !extracted.base64) {
        const fetched = await fetchImageAsBase64(extracted.url);
        return fetched; // { mimeType, base64 }
    }

    return extracted; // { mimeType, base64 }
}

/**
 * Call the Image Edit API using OpenAI-compatible format
 * According to API docs: /v1/images/edits with multipart/form-data
 * Sends image and mask as separate file uploads
 */
export async function editImage({ imageBase64, maskBase64, prompt, apiKey, baseUrl, model, imageMimeType = 'image/png' }) {
    const url = `${baseUrl || API_CONFIG.baseUrl}/v1/images/edits`;

    // Create FormData
    const formData = new FormData();
    formData.append('model', model || 'nano-banana');
    formData.append('prompt', prompt);

    // Append image files
    const imageBlob = base64ToBlob(imageBase64, imageMimeType);
    const maskBlob = base64ToBlob(maskBase64);

    formData.append('image', imageBlob, 'image.png');
    formData.append('image', maskBlob, 'mask.png');

    formData.append('response_format', 'b64_json');

    const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey || API_CONFIG.apiKey}`
            // Don't set Content-Type - browser will set it with boundary
        },
        body: formData
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || '编辑失败');
    }

    const data = await response.json();
    // Return base64 image data
    return data.data?.[0]?.b64_json;
}
