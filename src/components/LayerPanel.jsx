import React, { useState } from 'react';
import { Button } from './ui/Button';
import {
    Eye,
    EyeOff,
    Lock,
    Unlock,
    Trash2,
    ChevronUp,
    ChevronDown,
    Scissors,
    Download,
    Copy,
    Layers,
    Check,
    X
} from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * macOS Sequoia-style Layer Panel
 *
 * Design Philosophy:
 * - Native sidebar list style with subtle zebra striping
 * - Hairline separators (0.5px visual weight)
 * - Selection state uses blue "bubble" with proper padding
 * - Icons use 1.5px stroke weight matching SF Symbols
 */
export function LayerPanel({
    layers = [],
    selectedLayerId,
    onSelectLayer,
    onDeleteLayer,
    onToggleVisibility,
    onToggleLock,
    onMoveLayerUp,
    onMoveLayerDown,
    onDuplicateLayer,
    onRemoveBackground,
    onDownloadLayer,
    isRemoving = false,
    removalProgress = null,
    maskExtractionMode = false,
    setMaskExtractionMode,
    mainLayerForMask,
    setMainLayerForMask,
    maskLayerForExtraction,
    setMaskLayerForExtraction,
    onMaskExtraction,
}) {
    const [editingId, setEditingId] = useState(null);
    const [editingName, setEditingName] = useState('');

    const handleStartEdit = (layer) => {
        setEditingId(layer.id);
        setEditingName(layer.name);
    };

    const handleFinishEdit = (layerId) => {
        // TODO: 实现重命名功能
        setEditingId(null);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditingName('');
    };

    const getProgressText = () => {
        if (!removalProgress) return '';
        const { key, current, total } = removalProgress;

        if (key === 'fetch:model') {
            return `下载模型中... ${Math.round((current / total) * 100)}%`;
        }
        if (key === 'compute:inference') {
            return `处理中... ${Math.round((current / total) * 100)}%`;
        }
        return '处理中...';
    };

    // 获取按钮样式的辅助函数
    const getButtonStyle = (isSelected, isMainLayer, isMaskLayer) => {
        if (isSelected || isMainLayer || isMaskLayer) {
            return "hover:bg-white/20 text-white";
        }
        return "hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-gray-600 dark:text-gray-400";
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header - macOS sidebar header style */}
            <div className="flex items-center justify-between px-4 py-3
                            border-b border-black/[0.06] dark:border-white/[0.08]">
                <h3 className="text-[13px] font-semibold tracking-tight text-gray-900 dark:text-gray-100
                               -webkit-font-smoothing-antialiased">
                    图层
                </h3>
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                        {layers.length} 个
                    </span>
                    <button
                        className={cn(
                            "w-7 h-7 rounded-[5px] flex items-center justify-center",
                            "transition-all duration-200 ease-out",
                            "active:scale-[0.92]",
                            maskExtractionMode
                                ? "bg-blue-500 text-white shadow-sm"
                                : "hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-gray-600 dark:text-gray-400"
                        )}
                        onClick={() => {
                            setMaskExtractionMode?.(!maskExtractionMode);
                            if (maskExtractionMode) {
                                setMainLayerForMask?.(null);
                                setMaskLayerForExtraction?.(null);
                            }
                        }}
                        title={maskExtractionMode ? "退出遮罩抠图模式" : "遮罩抠图模式"}
                    >
                        <Layers size={14} strokeWidth={1.5} />
                    </button>
                </div>
            </div>

            {/* Mask Extraction Mode Panel */}
            {maskExtractionMode && (
                <div className="px-4 py-3 bg-purple-50/80 dark:bg-purple-900/20
                                border-b border-purple-100/50 dark:border-purple-800/30">
                    <div className="text-[11px] font-medium text-purple-700 dark:text-purple-300 mb-2">
                        遮罩抠图模式
                    </div>
                    <div className="space-y-2 text-[11px]">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600 dark:text-gray-400">主图层:</span>
                            <span className={cn(
                                "font-medium",
                                mainLayerForMask ? "text-purple-700 dark:text-purple-300" : "text-gray-400"
                            )}>
                                {mainLayerForMask ? layers.find(l => l.id === mainLayerForMask)?.name : "未选择"}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600 dark:text-gray-400">遮罩图层:</span>
                            <span className={cn(
                                "font-medium",
                                maskLayerForExtraction ? "text-purple-700 dark:text-purple-300" : "text-gray-400"
                            )}>
                                {maskLayerForExtraction ? layers.find(l => l.id === maskLayerForExtraction)?.name : "未选择"}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                        <button
                            className={cn(
                                "flex-1 px-3 py-1.5 rounded-[5px] text-[11px] font-medium",
                                "transition-all duration-200 ease-out active:scale-[0.96]",
                                mainLayerForMask && maskLayerForExtraction
                                    ? "bg-purple-500 text-white hover:bg-purple-600"
                                    : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                            )}
                            onClick={onMaskExtraction}
                            disabled={!mainLayerForMask || !maskLayerForExtraction}
                        >
                            <Check size={12} className="inline mr-1" />
                            执行抠图
                        </button>
                        <button
                            className="px-3 py-1.5 rounded-[5px] text-[11px] font-medium
                                     bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300
                                     hover:bg-gray-300 dark:hover:bg-gray-600
                                     transition-all duration-200 ease-out active:scale-[0.96]"
                            onClick={() => {
                                setMaskExtractionMode?.(false);
                                setMainLayerForMask?.(null);
                                setMaskLayerForExtraction?.(null);
                            }}
                        >
                            <X size={12} className="inline mr-1" />
                            取消
                        </button>
                    </div>
                </div>
            )}

            {/* Progress Indicator - macOS style with blue accent */}
            {isRemoving && removalProgress && (
                <div className="px-4 py-3 bg-blue-50/80 dark:bg-blue-900/20
                                border-b border-blue-100/50 dark:border-blue-800/30">
                    <div className="text-[11px] font-medium text-blue-700 dark:text-blue-300 mb-2">
                        {getProgressText()}
                    </div>
                    <div className="w-full h-1 bg-blue-200/50 dark:bg-blue-800/30 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600
                                       transition-all duration-300 ease-out"
                            style={{
                                width: `${Math.round((removalProgress.current / removalProgress.total) * 100)}%`
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Layer List - macOS sidebar list style */}
            <div className="flex-1 overflow-y-auto px-2 py-2">
                {layers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                        <p className="text-[13px] font-medium">暂无图层</p>
                        <p className="text-[11px] mt-1">上传图片以创建图层</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {layers.map((layer, index) => {
                            const isMainLayer = maskExtractionMode && mainLayerForMask === layer.id;
                            const isMaskLayer = maskExtractionMode && maskLayerForExtraction === layer.id;
                            const isSelected = !maskExtractionMode && selectedLayerId === layer.id;

                            return (
                            <div
                                key={layer.id}
                                className={cn(
                                    'group relative rounded-[6px] transition-all duration-200 ease-out cursor-pointer',
                                    /* Selection state - Blue bubble style with proper padding */
                                    isSelected && 'bg-blue-500 shadow-[0_0_0_0.5px_rgba(59,130,246,0.5)]',
                                    /* Mask extraction mode states */
                                    isMainLayer && 'bg-purple-500 shadow-[0_0_0_0.5px_rgba(168,85,247,0.5)]',
                                    isMaskLayer && 'bg-green-500 shadow-[0_0_0_0.5px_rgba(34,197,94,0.5)]',
                                    /* Default states */
                                    !isSelected && !isMainLayer && !isMaskLayer && 'bg-transparent hover:bg-black/[0.03] dark:hover:bg-white/[0.05]',
                                    /* Zebra striping for better readability */
                                    index % 2 === 1 && !isSelected && !isMainLayer && !isMaskLayer && 'bg-black/[0.015] dark:bg-white/[0.02]'
                                )}
                                onClick={() => {
                                    if (maskExtractionMode) {
                                        // 遮罩抠图模式：第一次点击选择主图层，第二次点击选择遮罩图层
                                        if (!mainLayerForMask) {
                                            setMainLayerForMask?.(layer.id);
                                        } else if (mainLayerForMask === layer.id) {
                                            // 取消选择主图层
                                            setMainLayerForMask?.(null);
                                        } else if (!maskLayerForExtraction) {
                                            setMaskLayerForExtraction?.(layer.id);
                                        } else if (maskLayerForExtraction === layer.id) {
                                            // 取消选择遮罩图层
                                            setMaskLayerForExtraction?.(null);
                                        } else {
                                            // 如果两个都已选择，点击其他图层则替换遮罩图层
                                            setMaskLayerForExtraction?.(layer.id);
                                        }
                                    } else {
                                        onSelectLayer?.(layer.id);
                                    }
                                }}
                            >
                                {/* Layer Content */}
                                <div className="flex items-center gap-2 p-2">
                                    {/* Thumbnail - Rounded with subtle border */}
                                    <div className="w-12 h-12 rounded-[6px] border border-black/[0.08] dark:border-white/[0.12]
                                                    bg-white/50 dark:bg-black/30 flex-shrink-0 overflow-hidden
                                                    shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]">
                                        {layer.url && (
                                            <img
                                                src={layer.url}
                                                alt={layer.name}
                                                className="w-full h-full object-contain"
                                            />
                                        )}
                                    </div>

                                    {/* Layer Info */}
                                    <div className="flex-1 min-w-0">
                                        {editingId === layer.id ? (
                                            <input
                                                type="text"
                                                value={editingName}
                                                onChange={(e) => setEditingName(e.target.value)}
                                                onBlur={() => handleFinishEdit(layer.id)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleFinishEdit(layer.id);
                                                    if (e.key === 'Escape') handleCancelEdit();
                                                }}
                                                className="w-full px-2 py-1 text-[13px] font-medium
                                                           bg-white dark:bg-gray-800
                                                           border border-blue-500
                                                           rounded-[5px]
                                                           shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]
                                                           ring-4 ring-blue-500/20 ring-offset-0
                                                           focus:outline-none
                                                           -webkit-font-smoothing-antialiased"
                                                autoFocus
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        ) : (
                                            <div>
                                                <div className="flex items-center gap-1">
                                                    <div
                                                        className={cn(
                                                            "text-[13px] font-medium truncate -webkit-font-smoothing-antialiased",
                                                            isSelected && "text-white",
                                                            isMainLayer && "text-white",
                                                            isMaskLayer && "text-white",
                                                            !isSelected && !isMainLayer && !isMaskLayer && "text-gray-900 dark:text-gray-100"
                                                        )}
                                                        onDoubleClick={(e) => {
                                                            e.stopPropagation();
                                                            handleStartEdit(layer);
                                                        }}
                                                    >
                                                        {layer.name}
                                                    </div>
                                                    {isMainLayer && (
                                                        <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-white/20 text-white rounded">
                                                            主图层
                                                        </span>
                                                    )}
                                                    {isMaskLayer && (
                                                        <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-white/20 text-white rounded">
                                                            遮罩
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        <div className={cn(
                                            "text-[11px] font-medium",
                                            isSelected && "text-blue-100",
                                            isMainLayer && "text-purple-100",
                                            isMaskLayer && "text-green-100",
                                            !isSelected && !isMainLayer && !isMaskLayer && "text-gray-500 dark:text-gray-400"
                                        )}>
                                            {layer.width} × {layer.height}
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons - macOS icon button style */}
                                <div className="flex items-center gap-0.5 px-2 pb-2">
                                    {/* Visibility Toggle */}
                                    <button
                                        className={cn(
                                            "w-7 h-7 rounded-[5px] flex items-center justify-center",
                                            "transition-all duration-200 ease-out",
                                            "active:scale-[0.92]",
                                            getButtonStyle(isSelected, isMainLayer, isMaskLayer)
                                        )}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onToggleVisibility?.(layer.id);
                                        }}
                                        title={layer.visible ? '隐藏图层' : '显示图层'}
                                    >
                                        {layer.visible ? <Eye size={14} strokeWidth={1.5} /> : <EyeOff size={14} strokeWidth={1.5} />}
                                    </button>

                                    {/* Lock Toggle */}
                                    <button
                                        className={cn(
                                            "w-7 h-7 rounded-[5px] flex items-center justify-center",
                                            "transition-all duration-200 ease-out",
                                            "active:scale-[0.92]",
                                            getButtonStyle(isSelected, isMainLayer, isMaskLayer)
                                        )}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onToggleLock?.(layer.id);
                                        }}
                                        title={layer.locked ? '解锁图层' : '锁定图层'}
                                    >
                                        {layer.locked ? <Lock size={14} strokeWidth={1.5} /> : <Unlock size={14} strokeWidth={1.5} />}
                                    </button>

                                    {/* Move Up */}
                                    <button
                                        className={cn(
                                            "w-7 h-7 rounded-[5px] flex items-center justify-center",
                                            "transition-all duration-200 ease-out",
                                            "active:scale-[0.92]",
                                            index === 0 && "opacity-30 cursor-not-allowed",
                                            getButtonStyle(isSelected, isMainLayer, isMaskLayer)
                                        )}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onMoveLayerUp?.(layer.id);
                                        }}
                                        disabled={index === 0}
                                        title="上移图层"
                                    >
                                        <ChevronUp size={14} strokeWidth={1.5} />
                                    </button>

                                    {/* Move Down */}
                                    <button
                                        className={cn(
                                            "w-7 h-7 rounded-[5px] flex items-center justify-center",
                                            "transition-all duration-200 ease-out",
                                            "active:scale-[0.92]",
                                            index === layers.length - 1 && "opacity-30 cursor-not-allowed",
                                            getButtonStyle(isSelected, isMainLayer, isMaskLayer)
                                        )}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onMoveLayerDown?.(layer.id);
                                        }}
                                        disabled={index === layers.length - 1}
                                        title="下移图层"
                                    >
                                        <ChevronDown size={14} strokeWidth={1.5} />
                                    </button>

                                    {/* Duplicate Layer */}
                                    <button
                                        className={cn(
                                            "w-7 h-7 rounded-[5px] flex items-center justify-center",
                                            "transition-all duration-200 ease-out",
                                            "active:scale-[0.92]",
                                            getButtonStyle(isSelected, isMainLayer, isMaskLayer)
                                        )}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDuplicateLayer?.(layer.id);
                                        }}
                                        title="复制图层"
                                    >
                                        <Copy size={14} strokeWidth={1.5} />
                                    </button>

                                    <div className={cn(
                                        "w-[1px] h-4 mx-1",
                                        (isSelected || isMainLayer || isMaskLayer)
                                            ? "bg-white/30"
                                            : "bg-black/[0.08] dark:bg-white/[0.12]"
                                    )} />

                                    {/* Background Removal */}
                                    <button
                                        className={cn(
                                            "w-7 h-7 rounded-[5px] flex items-center justify-center",
                                            "transition-all duration-200 ease-out",
                                            "active:scale-[0.92]",
                                            isRemoving && "opacity-30 cursor-not-allowed",
                                            getButtonStyle(isSelected, isMainLayer, isMaskLayer)
                                        )}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemoveBackground?.(layer.id);
                                        }}
                                        disabled={isRemoving}
                                        title="移除背景"
                                    >
                                        <Scissors size={14} strokeWidth={1.5} />
                                    </button>

                                    {/* Download */}
                                    <button
                                        className={cn(
                                            "w-7 h-7 rounded-[5px] flex items-center justify-center",
                                            "transition-all duration-200 ease-out",
                                            "active:scale-[0.92]",
                                            getButtonStyle(isSelected, isMainLayer, isMaskLayer)
                                        )}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDownloadLayer?.(layer.id);
                                        }}
                                        title="下载图层"
                                    >
                                        <Download size={14} strokeWidth={1.5} />
                                    </button>

                                    {/* Delete */}
                                    <button
                                        className={cn(
                                            "w-7 h-7 rounded-[5px] flex items-center justify-center",
                                            "transition-all duration-200 ease-out",
                                            "active:scale-[0.92]",
                                            (isSelected || isMainLayer || isMaskLayer)
                                                ? "hover:bg-red-500/30 text-red-200"
                                                : "hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                                        )}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm(`确定要删除图层"${layer.name}"吗？`)) {
                                                onDeleteLayer?.(layer.id);
                                            }
                                        }}
                                        title="删除图层"
                                    >
                                        <Trash2 size={14} strokeWidth={1.5} />
                                    </button>
                                </div>
                            </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
