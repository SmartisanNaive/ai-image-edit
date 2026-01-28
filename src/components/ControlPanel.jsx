import React from 'react';
import { Button } from './ui/Button';
import { Settings, Sparkles, Image as ImageIcon, Type, X, Plus, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';

export function ControlPanel({
    prompt,
    setPrompt,
    onGenerate,
    isGenerating,
    apiKey,
    setApiKey,
    baseUrl,
    setBaseUrl,
    modelName,
    setModelName,
    useGeminiNative,
    setUseGeminiNative,
    mode,
    setMode,
    imageSize,
    setImageSize,
    aspectRatio,
    setAspectRatio,
    regions = [],
    regionInstructions = {},
    setRegionInstruction,
    focusRegion,
    onPreviewMask,
}) {
    const [showSettings, setShowSettings] = React.useState(false);
    const [copyHint, setCopyHint] = React.useState('');
    const [customSize, setCustomSize] = React.useState('');

    // 自定义模型管理
    const [customModels, setCustomModels] = React.useState(() => {
        try {
            const saved = localStorage.getItem('customModels');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [newModelName, setNewModelName] = React.useState('');
    const [showAddModel, setShowAddModel] = React.useState(false);

    // 保存自定义模型到 localStorage
    React.useEffect(() => {
        try {
            localStorage.setItem('customModels', JSON.stringify(customModels));
        } catch (error) {
            console.error('Failed to save custom models:', error);
        }
    }, [customModels]);

    // 添加自定义模型
    const addCustomModel = () => {
        const trimmed = newModelName.trim();
        if (!trimmed) return;

        // 检查是否已存在
        if (customModels.includes(trimmed)) {
            alert('该模型已存在');
            return;
        }

        setCustomModels(prev => [...prev, trimmed]);
        setNewModelName('');
        setShowAddModel(false);
        setModelName(trimmed); // 自动选中新添加的模型
    };

    // 删除自定义模型
    const deleteCustomModel = (modelToDelete) => {
        setCustomModels(prev => prev.filter(m => m !== modelToDelete));
        // 如果删除的是当前选中的模型，切换到默认模型
        if (modelName === modelToDelete) {
            setModelName('gemini-2.5-flash-image');
        }
    };

    // 预设模型列表
    const presetModels = [
        'gemini-2.5-flash-image',
        'gemini-3-pro-image-preview',
        'nano-banana-2',
        'nano-banana-2-2k',
        'nano-banana-2-4k',
        'nano-banana'
    ];

    const copyToClipboard = async (text) => {
        if (!text) return false;
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            try {
                const el = document.createElement('textarea');
                el.value = text;
                el.style.position = 'fixed';
                el.style.left = '-9999px';
                document.body.appendChild(el);
                el.focus();
                el.select();
                const ok = document.execCommand('copy');
                document.body.removeChild(el);
                return ok;
            } catch {
                return false;
            }
        }
    };

    const composeRegionsPrompt = () => {
        if (!regions || regions.length === 0) return '';

        // 构建高质量的结构化 JSON 格式提示词
        const editRegions = regions.map((r) => {
            const instr = (regionInstructions?.[r.id] || '').trim();
            return {
                region_id: r.id,
                box_2d: r.box_2d, // [y_min, x_min, y_max, x_max] 归一化坐标 (0-1000)
                edit_instruction: instr || '（请填写编辑指令）',
                edit_type: 'modify', // 可选: modify, replace, refine, redraw, style_transfer
            };
        });

        const jsonConfig = {
            task_type: "precise_region_editing",
            edit_regions: editRegions,
            global_constraints: {
                preserve_non_masked: "CRITICAL - All areas outside the white mask regions MUST remain pixel-perfect identical to the original image. Do not alter background, lighting, colors, textures, or any elements in black mask areas.",
                mask_boundary_fusion: "Apply 1% edge feathering for seamless blending between edited and original areas. Ensure perfect color matching, lighting consistency, and natural transitions at mask boundaries.",
                style_consistency: "Match the original image's artistic style, color grading, lighting direction, shadow characteristics, and overall aesthetic perfectly.",
                quality_requirements: "Maintain or enhance image quality. Preserve fine details, textures, and sharpness. No artifacts, blurring, or quality degradation."
            },
            editing_rules: [
                "RULE 1 - Spatial Precision: Use box_2d coordinates as absolute ground truth. Each coordinate is normalized to 0-1000 scale relative to original image dimensions.",
                "RULE 2 - Mask Adherence: Only modify content within white mask areas. Black mask areas are STRICTLY off-limits and must remain unchanged.",
                "RULE 3 - Context Awareness: Analyze the full context within each region. If instruction targets specific subjects (e.g., 'change cat to dog'), only modify the subject while preserving background elements like patterns, textures, and colors.",
                "RULE 4 - Multi-Region Independence: Each region may have different edit types. Process each region according to its specific instruction without cross-contamination.",
                "RULE 5 - Lighting & Shadow Coherence: Ensure edited content matches the original lighting direction, shadow angles, and ambient occlusion. New elements must cast appropriate shadows.",
                "RULE 6 - Perspective & Scale: Maintain correct perspective, proportions, and scale for edited elements relative to the surrounding scene.",
                "RULE 7 - Edge Quality: Produce clean, anti-aliased edges. No jagged lines, halos, or visible seams between edited and original areas."
            ]
        };

        const prompt =
            `# PROFESSIONAL IMAGE EDITING TASK\n\n` +
            `## PRIMARY INSTRUCTION - MASK IS THE SOURCE OF TRUTH\n` +
            `You will receive TWO images:\n` +
            `1. **ORIGINAL IMAGE** - The image to be edited\n` +
            `2. **BINARY MASK** - White regions = areas to edit, Black regions = areas to preserve\n\n` +
            `**CRITICAL**: The MASK is your PRIMARY guide. The white areas in the mask show EXACTLY where to apply edits.\n` +
            `The box_2d coordinates below are SUPPLEMENTARY information to help you understand the mask regions.\n\n` +
            `## MASK INTERPRETATION RULES\n` +
            `1. **WHITE PIXELS in mask** = You MUST edit these areas according to the instructions\n` +
            `2. **BLACK PIXELS in mask** = You MUST NOT touch these areas AT ALL - keep them pixel-perfect identical\n` +
            `3. **Mask boundaries** = Apply 1% edge feathering for seamless blending\n` +
            `4. **If mask and coordinates conflict** = ALWAYS trust the mask, ignore coordinates\n\n` +
            `## EDITING CONFIGURATION\n` +
            `The following JSON provides context about the masked regions. The box_2d coordinates are normalized (0-1000 scale) and serve as reference only.\n` +
            `\`\`\`json\n${JSON.stringify(jsonConfig, null, 2)}\n\`\`\`\n\n` +
            `## CRITICAL WORKFLOW\n` +
            `1. **STEP 1**: Look at the MASK image - identify all white regions\n` +
            `2. **STEP 2**: For each white region in the mask, apply the corresponding edit_instruction\n` +
            `3. **STEP 3**: Ensure ALL black regions in the mask remain completely unchanged\n` +
            `4. **STEP 4**: Blend edges seamlessly with 1% feathering\n\n` +
            `## QUALITY REQUIREMENTS\n` +
            `- Preserve all non-masked areas pixel-perfectly\n` +
            `- Match original image's style, lighting, and quality\n` +
            `- Produce clean, natural-looking edits with no artifacts\n` +
            `- Maintain original image dimensions and format\n\n` +
            `## OUTPUT\n` +
            `Return ONLY the edited image. No text, explanations, or annotations.`;

        return prompt;
    };

    return (
        <div className="flex flex-col h-full gap-6 p-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight text-slate-900">控制面板</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowSettings(!showSettings)}>
                    <Settings size={20} />
                </Button>
            </div>

            {showSettings && (
                <div className="flex flex-col gap-4 p-4 bg-white/50 rounded-ios-md border border-white/60 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-slate-500">API Key</label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="w-full px-3 py-2 bg-white/80 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                            placeholder="sk-..."
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-slate-500">接口地址</label>
                        <input
                            type="text"
                            value={baseUrl}
                            onChange={(e) => setBaseUrl(e.target.value)}
                            className="w-full px-3 py-2 bg-white/80 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                            placeholder="https://..."
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">模型名称</label>
                            <button
                                onClick={() => setShowAddModel(!showAddModel)}
                                className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
                                title="添加自定义模型"
                            >
                                <Plus size={14} />
                                自定义
                            </button>
                        </div>

                        {showAddModel && (
                            <div className="flex gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                                <input
                                    type="text"
                                    value={newModelName}
                                    onChange={(e) => setNewModelName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addCustomModel()}
                                    placeholder="输入模型名称"
                                    className="flex-1 px-2 py-1 text-xs bg-white rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400"
                                />
                                <button
                                    onClick={addCustomModel}
                                    className="px-3 py-1 text-xs bg-slate-600 text-white rounded hover:bg-slate-700 transition-colors"
                                >
                                    添加
                                </button>
                            </div>
                        )}

                        <select
                            value={modelName}
                            onChange={(e) => setModelName(e.target.value)}
                            className="w-full px-3 py-2 bg-white/80 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                        >
                            <optgroup label="预设模型">
                                {presetModels.map(model => (
                                    <option key={model} value={model}>{model}</option>
                                ))}
                            </optgroup>
                            {customModels.length > 0 && (
                                <optgroup label="自定义模型">
                                    {customModels.map(model => (
                                        <option key={model} value={model}>{model}</option>
                                    ))}
                                </optgroup>
                            )}
                        </select>

                        {customModels.length > 0 && (
                            <div className="space-y-1">
                                <p className="text-xs text-slate-400">自定义模型列表：</p>
                                <div className="flex flex-wrap gap-1">
                                    {customModels.map(model => (
                                        <div
                                            key={model}
                                            className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded text-xs"
                                        >
                                            <span className="text-slate-700">{model}</span>
                                            <button
                                                onClick={() => deleteCustomModel(model)}
                                                className="text-slate-400 hover:text-red-600 transition-colors"
                                                title="删除此模型"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={useGeminiNative}
                                onChange={(e) => setUseGeminiNative(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-slate-600 focus:ring-2 focus:ring-slate-400"
                            />
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">使用 Gemini 原生 API</span>
                        </label>
                        <p className="text-xs text-slate-400">勾选后使用 Gemini 原生格式，否则使用 OpenAI 格式</p>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                <div className="flex p-1 bg-gray-200/50 rounded-xl">
                    <button
                        onClick={() => setMode('generate')}
                        className={cn(
                            "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
                            mode === 'generate' ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        生成
                    </button>
                    <button
                        onClick={() => setMode('edit')}
                        className={cn(
                            "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
                            mode === 'edit' ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        编辑
                    </button>
                </div>

                {mode === 'generate' && (
                    <>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">图片尺寸</label>
                            <select
                                value={imageSize}
                                onChange={(e) => setImageSize(e.target.value)}
                                className="w-full px-3 py-2 bg-white/80 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                            >
                                <option value="1024x1024">1K（1024×1024）</option>
                                <option value="2048x2048">2K（2048×2048）</option>
                                <option value="4096x4096">4K（4096×4096）</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">自定义尺寸（可选）</label>
                            <input
                                type="text"
                                value={customSize}
                                placeholder="例如: 800:800 或留空使用上方预设"
                                className="w-full px-3 py-2 bg-white/80 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                                onChange={(e) => {
                                    setCustomSize(e.target.value);
                                    if (e.target.value.trim()) {
                                        setImageSize(e.target.value.trim());
                                    }
                                }}
                            />
                            <p className="text-xs text-slate-400">格式: 宽:高 (如 800:800)，留空则使用上方预设</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">宽高比</label>
                            <select
                                value={aspectRatio}
                                onChange={(e) => setAspectRatio(e.target.value)}
                                className="w-full px-3 py-2 bg-white/80 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                            >
                                <option value="1:1">1:1（方形）</option>
                                <option value="16:9">16:9（宽屏横向）</option>
                                <option value="9:16">9:16（手机竖向）</option>
                                <option value="4:3">4:3（传统横向）</option>
                                <option value="3:4">3:4（传统竖向）</option>
                                <option value="21:9">21:9（超宽屏）</option>
                                <option value="9:21">9:21（超长竖向）</option>
                                <option value="3:2">3:2（相机横向）</option>
                                <option value="2:3">2:3（相机竖向）</option>
                                <option value="5:4">5:4（近方形横向）</option>
                                <option value="4:5">4:5（近方形竖向）</option>
                            </select>
                        </div>
                    </>
                )}

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                            {mode === 'generate' ? '提示词' : '编辑指令'}
                        </label>
                        {prompt && (
                            <button
                                onClick={() => setPrompt('')}
                                className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
                                title="清空提示词"
                            >
                                <X size={14} />
                                清空
                            </button>
                        )}
                    </div>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="w-full h-32 px-4 py-3 bg-white/60 backdrop-blur-sm rounded-ios-md border border-white/60 shadow-inner-cut resize-none focus:outline-none focus:ring-2 focus:ring-slate-400 text-slate-800 placeholder:text-slate-400"
                        placeholder={mode === 'generate' ? "描述你想生成的图片（风格、光影、主体、细节）…" : "先框选/涂抹需要修改的区域，再描述如何修改…"}
                    />
                </div>

                <Button
                    onClick={onGenerate}
                    disabled={isGenerating || !prompt}
                    className="w-full h-14 text-lg shadow-soft-spread"
                >
                    {isGenerating ? (
                        <span className="flex items-center gap-2">
                            <Sparkles className="animate-spin" /> 处理中…
                        </span>
                    ) : (
                        <span className="flex items-center gap-2">
                            <Sparkles /> {mode === 'generate' ? '生成图片' : '应用编辑'}
                        </span>
                    )}
                </Button>
            </div>

            {mode === 'edit' && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-900">矩形区域</h3>
                        {copyHint && <span className="text-xs text-slate-500">{copyHint}</span>}
                    </div>

                    {regions.length === 0 ? (
                        <div className="p-3 bg-white/50 rounded-ios-md border border-white/60 text-xs text-slate-600">
                            还没有矩形框选。请选择底部“矩形框选”工具，在图片上拖拽创建多个区域。
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {regions.map((r) => (
                                <div
                                    key={r.id}
                                    className="p-3 bg-white/50 rounded-ios-md border border-white/60 shadow-sm"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm font-semibold text-slate-900">区域 #{r.id}</div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => focusRegion?.(r.id)}
                                            title="在画布中选中该区域"
                                        >
                                            定位
                                        </Button>
                                    </div>
                                    <div className="mt-1 text-xs text-slate-600">
                                        像素: x={Math.round(r.x)}, y={Math.round(r.y)}, w={Math.round(r.width)}, h={Math.round(r.height)}
                                    </div>
                                    {r.box_2d && (
                                        <div className="mt-1 text-xs text-emerald-600 font-mono">
                                            归一化: [{r.box_2d.join(', ')}]
                                        </div>
                                    )}
                                    <textarea
                                        value={regionInstructions?.[r.id] || ''}
                                        onChange={(e) => setRegionInstruction?.(r.id, e.target.value)}
                                        className="mt-2 w-full h-16 px-3 py-2 bg-white/70 rounded-ios-md border border-white/60 shadow-inner-cut resize-none focus:outline-none focus:ring-2 focus:ring-slate-400 text-slate-800 placeholder:text-slate-400 text-sm"
                                        placeholder="填写该区域要修改成什么，例如：把衣服变成黑色皮夹克…"
                                    />
                                </div>
                            ))}

                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="secondary"
                                        className="flex-1"
                                        onClick={() => {
                                            setPrompt(composeRegionsPrompt());
                                            setCopyHint('已写入到提示词');
                                            setTimeout(() => setCopyHint(''), 1500);
                                        }}
                                    >
                                        写入到提示词
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        className="flex-1"
                                        onClick={async () => {
                                            const ok = await copyToClipboard(composeRegionsPrompt());
                                            setCopyHint(ok ? '已复制' : '复制失败');
                                            setTimeout(() => setCopyHint(''), 1500);
                                        }}
                                    >
                                        复制模板
                                    </Button>
                                </div>
                                <Button
                                    variant="secondary"
                                    className="w-full"
                                    onClick={() => {
                                        if (onPreviewMask) {
                                            try {
                                                onPreviewMask();
                                                setCopyHint('遮罩已添加为新图层');
                                                setTimeout(() => setCopyHint(''), 2000);
                                            } catch (err) {
                                                setCopyHint('预览失败: ' + err.message);
                                                setTimeout(() => setCopyHint(''), 2000);
                                            }
                                        }
                                    }}
                                >
                                    预览遮罩
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="mt-auto">
                <div className="p-4 bg-blue-50/50 rounded-ios-md border border-blue-100/50">
                    <h4 className="text-sm font-semibold text-blue-900 mb-1">提示</h4>
                    <div className="text-xs text-blue-700/80 leading-relaxed space-y-2">
                        {mode === 'generate' ? (
                            <p>建议描述：主体、风格、光线、构图、材质、氛围，可获得更稳定效果。</p>
                        ) : (
                            <>
                                <p className="font-medium">📝 两种编辑模式：</p>
                                <div className="pl-3 space-y-1">
                                    <p>• <span className="font-semibold">精确编辑</span>：使用画笔/矩形框选区域，只修改选中部分</p>
                                    <p>• <span className="font-semibold">对话编辑</span>：无需绘制遮罩，直接输入指令对整张图片进行修改，支持连续对话式编辑</p>
                                </div>
                                <p className="text-blue-600 font-medium mt-2">💡 提示：对话编辑模式可以连续修改同一张图片，实现迭代优化效果</p>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
