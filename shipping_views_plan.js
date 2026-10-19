// =========================================================
// shipping_views_plan.js - 計画・割振り画面モジュール (WebVer. 115 完全修復版)
// =========================================================

// 【計画画面ビュー】
const YoshiiPlanView = () => {
    const ctx = React.useContext(AppContext);
    return (
        <div className="p-3 bg-white flex-grow flex flex-col h-full overflow-hidden text-xs">
            <div className="flex justify-between items-center mb-2 no-print flex-shrink-0">
                <h2 className="text-base font-extrabold text-emerald-900 border-b-2 border-emerald-600 pb-0.5">
                    吉井電気 出荷計画一覧 [仕入先: {ctx.selectedVendorFilter || 'ALL'}]
                </h2>
            </div>
            <div className="table-container flex-grow border rounded shadow-inner overflow-x-auto overflow-y-auto">
                <table className="w-full text-center border-collapse text-[11px]">
                    <thead className="sticky top-0 z-30 bg-gray-200 font-bold shadow-sm">
                        <tr className="bg-gray-200 border-b">
                            <th className="p-1 border">型式</th>
                            <th className="p-1 border">品名</th>
                            <th className="p-1 border">仕入先</th>
                            <th className="p-1 border">計画数</th>
                            <th className="p-1 border">備考</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ctx.plans.filter(p => p.company === 'yoshii').map((plan, idx) => (
                            <tr key={plan.id || idx} className="hover:bg-gray-50 border-b">
                                <td className="p-1 border font-bold text-left pl-2">{plan.model}</td>
                                <td className="p-1 border text-left pl-2">{plan.productName || '-'}</td>
                                <td className="p-1 border">{plan.vendorCode || '-'}</td>
                                <td className="p-1 border font-mono text-right pr-2">{Number(plan.planQty || 0).toLocaleString()}</td>
                                <td className="p-1 border text-left pl-2">{plan.notes || ''}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// 【割振り画面ビュー - 行D&D順序入れ替え・Firestore一括更新完全修復版】
const YoshiiAllocationView = () => {
    const ctx = React.useContext(AppContext);
    const [exportModal, setExportModal] = React.useState({ isOpen: false, type: 'excel' });

    // 当月対象のコンテナデータ取得
    let monthContainers = ctx.containers.filter(c => c.company === 'yoshii' && (c.deliveryMonth === ctx.yoshiiAllocMonth || (!c.deliveryMonth && ctx.yoshiiAllocMonth === ctx.currentMonthStr)));

    if (ctx.selectedVendorFilter && ctx.selectedVendorFilter !== 'ALL') {
        monthContainers = monthContainers.filter(c => {
            return Object.keys(c.allocations || {}).some(m => {
                const q = c.allocations[m];
                if (q <= 0) return false;
                const matchModelDetails = ctx.masterData.yoshii?.modelDetails?.[m] || {};
                const normTarget = normalizeModelCode(m);
                const matchPlanInfo = ctx.plans.find(p => normalizeModelCode(p.model) === normTarget && p.vendorCode);
                const vCode = matchModelDetails.vendorCode !== undefined ? matchModelDetails.vendorCode : (matchPlanInfo?.vendorCode || '');
                return vCode === ctx.selectedVendorFilter;
            });
        });
    }

    // 重複除去マップ
    const uniqueContainersMap = new Map();
    monthContainers.forEach(c => {
        if (c.id && !uniqueContainersMap.has(c.id)) {
            uniqueContainersMap.set(c.id, c);
        }
    });
    let displayContainers = Array.from(uniqueContainersMap.values());

    // 並び順制御（allocNo / sortOrder 昇順）
    displayContainers.sort((a, b) => {
        const orderA = a.allocNo !== undefined ? a.allocNo : (a.sortOrder !== undefined ? a.sortOrder : 999999);
        const orderB = b.allocNo !== undefined ? b.allocNo : (b.sortOrder !== undefined ? b.sortOrder : 999999);
        return orderA - orderB;
    });

    // 行追加
    const handleAddRow = async () => {
        if (ctx.authUser && !ctx.authUser.canEdit) return;
        const newNo = displayContainers.length + 1;
        const newDoc = {
            company: 'yoshii',
            deliveryMonth: ctx.yoshiiAllocMonth,
            managementNo: `YK${newNo}`,
            allocNo: newNo,
            sortOrder: newNo,
            allocations: {},
            spareParts: {},
            createdAt: new Date().toISOString()
        };
        await ctx.updateContainer(null, newDoc, ctx.yoshiiAllocMonth, 'yoshii', '割振り新規行追加');
    };

    // 行削除
    const handleDeleteRow = async (containerId, managementNo) => {
        if (ctx.authUser && !ctx.authUser.canEdit) return;
        if (!window.confirm(`管理番号 [${managementNo || '未設定'}] の行を削除しますか？`)) return;
        await ctx.deleteContainer(containerId);
        ctx.logOperation('割振り', '削除', `管理番号 [${managementNo || '未設定'}] を削除`);
    };

    return (
        <div className="p-3 bg-white flex-grow flex flex-col h-full overflow-hidden text-xs">
            <div className="flex justify-between items-center mb-2 no-print flex-shrink-0">
                <div className="flex items-center gap-3">
                    <h2 className="text-base font-extrabold text-emerald-900 border-b-2 border-emerald-600 pb-0.5">
                        吉井電気 割振り設定 [仕入先: {ctx.selectedVendorFilter || 'ALL'}]
                    </h2>
                    <div className="flex items-center gap-1 font-bold">
                        <span>対象納入月:</span>
                        <input type="month" value={ctx.yoshiiAllocMonth} onChange={e => ctx.setYoshiiAllocMonth(e.target.value)} className="border p-1 rounded font-bold bg-white text-indigo-900 text-xs"/>
                    </div>
                </div>

                <div className="flex items-center gap-2 font-bold">
                    <button onClick={handleAddRow} className="px-2.5 py-1 text-xs font-bold rounded bg-blue-600 hover:bg-blue-700 text-white shadow transition flex items-center gap-1">＋ 行追加</button>
                    <button onClick={ctx.handleStartTracking} className={`px-2 py-1 text-xs font-bold rounded shadow transition ${ctx.isChangeTrackingMode ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}>{ctx.isChangeTrackingMode ? '● 変更記録中' : '変更開始'}</button>
                    <button onClick={ctx.handleClearTracking} className="px-2 py-1 text-xs font-bold rounded bg-gray-600 hover:bg-gray-700 text-white shadow transition">変更クリア</button>
                </div>
            </div>

            <div className="table-container flex-grow border rounded shadow-inner overflow-x-auto overflow-y-auto" ref={ctx.tableContainerRef}>
                <table className="w-full text-center border-collapse text-[11px]">
                    <thead className="sticky top-0 z-30 bg-gray-200 font-bold shadow-sm">
                        <tr className="bg-gray-200 border-b">
                            <th className="p-1 border w-[30px] min-w-[30px]">移動</th>
                            <th className="p-1 border w-[70px] min-w-[70px]">管理番号</th>
                            <th className="p-1 border w-[80px] min-w-[80px]">進行状況</th>
                            <th className="p-1 border w-[100px] min-w-[100px]">コンテナNO.</th>
                            <th className="p-1 border w-[110px] min-w-[110px]">積載型式</th>
                            <th className="p-1 border w-[60px] min-w-[60px]">割振数</th>
                            <th className="p-1 border w-[65px] min-w-[65px]">総数量</th>
                            <th className="p-1 border w-[65px] min-w-[65px]">到着港</th>
                            <th className="p-1 border w-[75px] min-w-[75px]">ETD</th>
                            <th className="p-1 border w-[75px] min-w-[75px]">ETA</th>
                            <th className="p-1 border w-[65px] min-w-[65px]">サイズ</th>
                            <th className="p-1 border w-[140px] min-w-[140px]">本船名</th>
                            <th className="p-1 border min-w-[120px]">備考</th>
                            <th className="p-1 border w-[40px] min-w-[40px] no-print">削除</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayContainers.map((container, idx) => {
                            const allocs = container.allocations || {};
                            let modelKeys = Object.keys(allocs).filter(m => Number(allocs[m]) > 0);

                            if (ctx.selectedVendorFilter && ctx.selectedVendorFilter !== 'ALL') {
                                modelKeys = modelKeys.filter(m => {
                                    const matchModelDetails = ctx.masterData.yoshii?.modelDetails?.[m] || {};
                                    const normTarget = normalizeModelCode(m);
                                    const matchPlanInfo = ctx.plans.find(p => normalizeModelCode(p.model) === normTarget && p.vendorCode);
                                    const vCode = matchModelDetails.vendorCode !== undefined ? matchModelDetails.vendorCode : (matchPlanInfo?.vendorCode || '');
                                    return vCode === ctx.selectedVendorFilter;
                                });
                            }

                            const totalQty = modelKeys.reduce((sum, m) => sum + Number(allocs[m] || 0), 0);
                            const rowSpan = Math.max(modelKeys.length, 1);

                            const isDragging = ctx.draggedRowId === container.id;
                            const isDragOver = ctx.dragOverRowId === container.id;
                            const dragClass = isDragging ? 'dragging-row' : (isDragOver ? 'drag-over-bottom' : '');

                            if (modelKeys.length === 0) {
                                return (
                                    <tr 
                                        key={container.id || idx} 
                                        draggable={true}
                                        onDragStart={(e) => ctx.handleDragStart(e, container.id)}
                                        onDragOver={(e) => ctx.handleDragOver(e, container.id)}
                                        onDragEnd={ctx.handleDragEnd}
                                        onDrop={(e) => ctx.handleDrop(e, container.id, displayContainers)}
                                        className={`hover:bg-gray-50 border-b h-[24px] ${dragClass}`}
                                    >
                                        {/* D&D ドラッグハンドル */}
                                        <td className="border drag-handle text-gray-400 font-bold select-none cursor-grab active:cursor-grabbing">⋮⋮</td>
                                        
                                        {/* 割振り画面：管理番号・進行状況は編集可能（白背景） */}
                                        <td className="border bg-white">
                                            <LocalInput value={container.managementNo || ''} originalValue={(container.originals || {}).managementNo} originalMeta={(container.originalMetas || {}).managementNo} onChange={(v, orig) => ctx.updateContainer(container.id, { managementNo: v }, ctx.yoshiiAllocMonth, 'yoshii', '管理番号')} className="w-full text-center border-none bg-transparent font-bold"/>
                                        </td>
                                        <td className="border bg-white">
                                            <DynamicSelect value={container.status || '手配中'} originalValue={(container.originals || {}).status} originalMeta={(container.originalMetas || {}).status} onChange={(val, cat, orig) => ctx.handleSelectChange(container.id, 'status', true, 'yoshii', true, '進行状況')(val, cat, orig)} category="statuses" options={ctx.masterData.common.statuses} isCommon className="w-full text-center border-none bg-transparent"/>
                                        </td>

                                        {/* コンテナNO：編集可能（白背景） */}
                                        <td className="border bg-white">
                                            <LocalInput value={container.containerNo || ''} originalValue={(container.originals || {}).containerNo} originalMeta={(container.originalMetas || {}).containerNo} onChange={(v, orig) => ctx.updateContainer(container.id, { containerNo: v }, ctx.yoshiiAllocMonth, 'yoshii', 'コンテナNO')} className="w-full text-center font-mono border-none bg-transparent"/>
                                        </td>

                                        {/* 積載型式：固定表示（グレー背景） */}
                                        <td className="border readonly-cell font-normal">-</td>
                                        
                                        {/* 割振数：0表示（白背景） */}
                                        <td className="border bg-white font-mono text-right pr-1">0</td>

                                        {/* 総数量：自動計算保護（グレー背景） */}
                                        <td className="border readonly-cell font-extrabold text-right pr-1 font-mono">0</td>

                                        {/* 船便手配項目：編集可能（白背景） */}
                                        <td className="border bg-white">
                                            <DynamicSelect value={container.port || ''} originalValue={(container.originals || {}).port} originalMeta={(container.originalMetas || {}).port} onChange={(val, cat, orig) => ctx.handleSelectChange(container.id, 'port', true, 'yoshii', false, '到着港')(val, cat, orig)} category="ports" options={ctx.masterData.yoshii.ports} className="w-full text-center border-none bg-transparent"/>
                                        </td>
                                        <td className="border bg-white">
                                            <LocalInput type="date" value={container.etd || ''} originalValue={(container.originals || {}).etd} originalMeta={(container.originalMetas || {}).etd} onChange={(v, orig) => ctx.updateContainer(container.id, { etd: v }, ctx.yoshiiAllocMonth, 'yoshii', 'ETD')} className="w-full text-center border-none bg-transparent"/>
                                        </td>
                                        <td className="border bg-white">
                                            <LocalInput type="date" value={container.eta || ''} originalValue={(container.originals || {}).eta} originalMeta={(container.originalMetas || {}).eta} onChange={(v, orig) => ctx.updateContainer(container.id, { eta: v }, ctx.yoshiiAllocMonth, 'yoshii', 'ETA')} className="w-full text-center border-none bg-transparent"/>
                                        </td>
                                        <td className="border bg-white">
                                            <DynamicSelect value={container.containerSize || container.size || ''} originalValue={(container.originals || {}).containerSize} originalMeta={(container.originalMetas || {}).containerSize} onChange={(val, cat, orig) => ctx.handleSelectChange(container.id, 'containerSize', true, 'yoshii', true, 'サイズ')(val, cat, orig)} category="containerSizes" options={ctx.masterData.common.containerSizes} isCommon className="w-full text-center border-none bg-transparent"/>
                                        </td>
                                        <td className="border bg-white">
                                            <LocalInput value={container.vessel || ''} originalValue={(container.originals || {}).vessel} originalMeta={(container.originalMetas || {}).vessel} onChange={(v, orig) => ctx.updateContainer(container.id, { vessel: v }, ctx.yoshiiAllocMonth, 'yoshii', '本船名')} className="w-full text-center border-none bg-transparent"/>
                                        </td>
                                        <td className="border bg-white">
                                            <LocalTextArea value={container.shipNotes || ''} originalValue={(container.originals || {}).shipNotes} originalMeta={(container.originalMetas || {}).shipNotes} onChange={(v, orig) => ctx.updateContainer(container.id, { shipNotes: v }, ctx.yoshiiAllocMonth, 'yoshii', '備考')}/>
                                        </td>
                                        <td className="border text-center no-print">
                                            <button onClick={() => handleDeleteRow(container.id, container.managementNo)} className="text-red-500 hover:text-red-700 font-bold">✕</button>
                                        </td>
                                    </tr>
                                );
                            }

                            return modelKeys.map((m, mIdx) => {
                                const qty = allocs[m] || 0;

                                return (
                                    <tr 
                                        key={`${container.id || idx}-${m}`} 
                                        draggable={mIdx === 0}
                                        onDragStart={(e) => mIdx === 0 && ctx.handleDragStart(e, container.id)}
                                        onDragOver={(e) => ctx.handleDragOver(e, container.id)}
                                        onDragEnd={ctx.handleDragEnd}
                                        onDrop={(e) => ctx.handleDrop(e, container.id, displayContainers)}
                                        className={`hover:bg-gray-50 border-b h-[24px] ${mIdx === 0 ? dragClass : ''}`}
                                    >
                                        {mIdx === 0 && (
                                            <>
                                                {/* D&D ドラッグハンドル */}
                                                <td rowSpan={rowSpan} className="border drag-handle text-gray-400 font-bold select-none cursor-grab active:cursor-grabbing align-middle">⋮⋮</td>
                                                
                                                {/* 管理番号・進行状況・コンテナNO：編集可能（白背景） */}
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">
                                                    <LocalInput value={container.managementNo || ''} originalValue={(container.originals || {}).managementNo} originalMeta={(container.originalMetas || {}).managementNo} onChange={(v, orig) => ctx.updateContainer(container.id, { managementNo: v }, ctx.yoshiiAllocMonth, 'yoshii', '管理番号')} className="w-full text-center border-none bg-transparent font-bold"/>
                                                </td>
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">
                                                    <DynamicSelect value={container.status || '手配中'} originalValue={(container.originals || {}).status} originalMeta={(container.originalMetas || {}).status} onChange={(val, cat, orig) => ctx.handleSelectChange(container.id, 'status', true, 'yoshii', true, '進行状況')(val, cat, orig)} category="statuses" options={ctx.masterData.common.statuses} isCommon className="w-full text-center border-none bg-transparent"/>
                                                </td>
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">
                                                    <LocalInput value={container.containerNo || ''} originalValue={(container.originals || {}).containerNo} originalMeta={(container.originalMetas || {}).containerNo} onChange={(v, orig) => ctx.updateContainer(container.id, { containerNo: v }, ctx.yoshiiAllocMonth, 'yoshii', 'コンテナNO')} className="w-full text-center font-mono border-none bg-transparent"/>
                                                </td>
                                            </>
                                        )}

                                        {/* 積載型式：固定表示（グレー背景） */}
                                        <td className="border readonly-cell font-bold text-left pl-1">{m}</td>

                                        {/* 割振数：編集可能（白背景） */}
                                        <td className="border bg-white">
                                            <LocalInput type="number" value={qty} onChange={(v) => {
                                                const newAllocs = { ...(container.allocations || {}), [m]: Number(v || 0) };
                                                ctx.updateContainer(container.id, { allocations: newAllocs }, ctx.yoshiiAllocMonth, 'yoshii', `型式 [${m}] 割振数`);
                                            }} className="w-full text-right pr-1 border-none bg-transparent font-bold text-emerald-800 font-mono"/>
                                        </td>

                                        {mIdx === 0 && (
                                            <>
                                                {/* 総数量：自動計算保護（グレー背景） */}
                                                <td rowSpan={rowSpan} className="border readonly-cell font-extrabold text-right pr-1 align-middle font-mono">{totalQty.toLocaleString()}</td>
                                                
                                                {/* 船便手配項目：編集可能（白背景） */}
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">
                                                    <DynamicSelect value={container.port || ''} originalValue={(container.originals || {}).port} originalMeta={(container.originalMetas || {}).port} onChange={(val, cat, orig) => ctx.handleSelectChange(container.id, 'port', true, 'yoshii', false, '到着港')(val, cat, orig)} category="ports" options={ctx.masterData.yoshii.ports} className="w-full text-center border-none bg-transparent"/>
                                                </td>
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">
                                                    <LocalInput type="date" value={container.etd || ''} originalValue={(container.originals || {}).etd} originalMeta={(container.originalMetas || {}).etd} onChange={(v, orig) => ctx.updateContainer(container.id, { etd: v }, ctx.yoshiiAllocMonth, 'yoshii', 'ETD')} className="w-full text-center border-none bg-transparent"/>
                                                </td>
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">
                                                    <LocalInput type="date" value={container.eta || ''} originalValue={(container.originals || {}).eta} originalMeta={(container.originalMetas || {}).eta} onChange={(v, orig) => ctx.updateContainer(container.id, { eta: v }, ctx.yoshiiAllocMonth, 'yoshii', 'ETA')} className="w-full text-center border-none bg-transparent"/>
                                                </td>
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">
                                                    <DynamicSelect value={container.containerSize || container.size || ''} originalValue={(container.originals || {}).containerSize} originalMeta={(container.originalMetas || {}).containerSize} onChange={(val, cat, orig) => ctx.handleSelectChange(container.id, 'containerSize', true, 'yoshii', true, 'サイズ')(val, cat, orig)} category="containerSizes" options={ctx.masterData.common.containerSizes} isCommon className="w-full text-center border-none bg-transparent"/>
                                                </td>
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">
                                                    <LocalInput value={container.vessel || ''} originalValue={(container.originals || {}).vessel} originalMeta={(container.originalMetas || {}).vessel} onChange={(v, orig) => ctx.updateContainer(container.id, { vessel: v }, ctx.yoshiiAllocMonth, 'yoshii', '本船名')} className="w-full text-center border-none bg-transparent"/>
                                                </td>
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">
                                                    <LocalTextArea value={container.shipNotes || ''} originalValue={(container.originals || {}).shipNotes} originalMeta={(container.originalMetas || {}).shipNotes} onChange={(v, orig) => ctx.updateContainer(container.id, { shipNotes: v }, ctx.yoshiiAllocMonth, 'yoshii', '備考')}/>
                                                </td>
                                                <td rowSpan={rowSpan} className="border text-center no-print align-middle">
                                                    <button onClick={() => handleDeleteRow(container.id, container.managementNo)} className="text-red-500 hover:text-red-700 font-bold">✕</button>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                );
                            });
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};