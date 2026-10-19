// =========================================================
// shipping_views_ship.js - 出荷日程・ドレージ画面モジュール (WebVer. 110)
// =========================================================

// 【出荷日程画面ビュー】
const YoshiiShipView = () => {
    const ctx = React.useContext(AppContext);
    const [exportModal, setExportModal] = React.useState({ isOpen: false, type: 'excel' });

    const [rangeMode, setRangeMode] = React.useState('year');
    const [selectedYear, setSelectedYear] = React.useState(2026);
    const [customStartMonth, setCustomStartMonth] = React.useState('2026-04');
    const [customEndMonth, setCustomEndMonth] = React.useState('2027-03');

    const [sortConfig, setSortConfig] = React.useState([]);

    const generateMonths = () => {
        const months = [];
        if (rangeMode === 'year') {
            for (let i = 0; i < 12; i++) {
                const mo = (i + 3) % 12 + 1;
                const yr = (i + 3) >= 12 ? Number(selectedYear) + 1 : Number(selectedYear);
                months.push(`${yr}-${String(mo).padStart(2, '0')}`);
            }
        } else {
            let curr = new Date(`${customStartMonth}-01`);
            const end = new Date(`${customEndMonth}-01`);
            while (curr <= end && months.length < 36) {
                const yr = curr.getFullYear();
                const mo = String(curr.getMonth() + 1).padStart(2, '0');
                months.push(`${yr}-${mo}`);
                curr.setMonth(curr.getMonth() + 1);
            }
        }
        return months;
    };

    const displayMonths = generateMonths();

    // 1. 吉井電気の対象月コンテナを取得
    let targetContainers = ctx.containers.filter(c => 
        c.company === 'yoshii' && displayMonths.includes(c.deliveryMonth)
    );

    // 2. ベンダー制限フィルター
    if (ctx.selectedVendorFilter && ctx.selectedVendorFilter !== 'ALL') {
        targetContainers = targetContainers.filter(c => {
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

    // 3. データ重複防止（ID一意化による無限コピー現象の修復）
    const uniqueContainersMap = new Map();
    targetContainers.forEach(c => {
        if (c.id && !uniqueContainersMap.has(c.id)) {
            uniqueContainersMap.set(c.id, c);
        }
    });
    const uniqueContainers = Array.from(uniqueContainersMap.values());

    const handleExecuteExport = () => {
        if (exportModal.type === 'print') {
            setTimeout(() => window.print(), 300);
            return;
        }

        const headers = ['管理番号', '進行状況', 'コンテナNO.', '積載型式', '外装箱', '化粧箱', 'ラベル', '割振数', '総数量', '到着港', 'ETD', 'ETA', 'サイズ', '本船名', '備考'];
        const rows = [];

        uniqueContainers.forEach(c => {
            const allocs = c.allocations || {};
            const allocModels = Object.keys(allocs).filter(m => allocs[m] > 0);

            if (allocModels.length === 0) {
                rows.push([c.managementNo || '-', c.status || '手配中', c.containerNo || '-', '-', '-', '-', '-', 0, 0, c.port || '-', c.etd || '-', c.eta || '-', c.size || '-', c.vessel || '-', c.shipNotes || '']);
            } else {
                allocModels.forEach((m, idx) => {
                    const q = allocs[m];
                    const parts = c.spareParts?.[m] || {};
                    rows.push([
                        idx === 0 ? (c.managementNo || '-') : '',
                        idx === 0 ? (c.status || '手配中') : '',
                        idx === 0 ? (c.containerNo || '-') : '',
                        m,
                        parts.outerBox || 0,
                        parts.innerBox || 0,
                        parts.label || 0,
                        q,
                        idx === 0 ? Object.values(allocs).reduce((a,b)=>a+Number(b||0),0) : '',
                        idx === 0 ? (c.port || '-') : '',
                        idx === 0 ? (c.etd || '-') : '',
                        idx === 0 ? (c.eta || '-') : '',
                        idx === 0 ? (c.containerSize || c.size || '-') : '',
                        idx === 0 ? (c.vessel || '-') : '',
                        idx === 0 ? (c.shipNotes || '') : ''
                    ]);
                });
            }
        });

        const filename = `吉井電気_出荷日程表_${ctx.getFormattedShortDate().replace(/\//g,'')}.xlsx`;
        exportToExcelSimple({
            title: `吉井電気 出荷日程表 [仕入先: ${ctx.selectedVendorFilter || 'ALL'}]`,
            headers, rows, filename
        });
    };

    return (
        <div className="p-3 bg-white flex-grow flex flex-col h-full overflow-hidden text-xs">
            <div className="flex justify-between items-center mb-2 no-print flex-shrink-0">
                <div className="flex items-center gap-3">
                    <h2 className="text-base font-extrabold text-emerald-900 border-b-2 border-emerald-600 pb-0.5">
                        吉井電気 出荷日程表 [仕入先: {ctx.selectedVendorFilter || 'ALL'}]
                    </h2>

                    <div className="flex items-center gap-1 bg-gray-50 p-0.5 rounded border text-xs">
                        <select value={rangeMode} onChange={e => setRangeMode(e.target.value)} className="font-bold border rounded px-1 py-0.5 bg-white">
                            <option value="year">年度指定</option>
                            <option value="custom">カスタム指定</option>
                        </select>

                        {rangeMode === 'year' ? (
                            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="font-bold border rounded px-1 py-0.5 bg-white text-emerald-800">
                                <option value={2025}>2025年度</option>
                                <option value={2026}>2026年度</option>
                                <option value={2027}>2027年度</option>
                            </select>
                        ) : (
                            <div className="flex items-center gap-1 font-bold">
                                <input type="month" value={customStartMonth} onChange={e => setCustomStartMonth(e.target.value)} className="border rounded px-1 bg-white"/>
                                <span>〜</span>
                                <input type="month" value={customEndMonth} onChange={e => setCustomEndMonth(e.target.value)} className="border rounded px-1 bg-white"/>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 font-bold">
                    <button onClick={() => setExportModal({ isOpen: true, type: 'excel' })} className="px-2 py-1 text-xs font-bold rounded bg-emerald-700 hover:bg-emerald-800 text-white shadow transition flex items-center gap-1">📊 Excel出力</button>
                    <button onClick={() => setExportModal({ isOpen: true, type: 'print' })} className="px-2 py-1 text-xs font-bold rounded bg-slate-700 hover:bg-slate-800 text-white shadow transition flex items-center gap-1">🖨 印刷</button>
                    <button onClick={ctx.handleStartTracking} className={`px-2 py-1 text-xs font-bold rounded shadow transition ${ctx.isChangeTrackingMode ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}>{ctx.isChangeTrackingMode ? '● 変更記録中' : '変更開始'}</button>
                    <button onClick={ctx.handleClearTracking} className="px-2 py-1 text-xs font-bold rounded bg-gray-600 hover:bg-gray-700 text-white shadow transition">変更クリア</button>
                </div>
            </div>

            <div className="table-container flex-grow border rounded shadow-inner overflow-x-auto overflow-y-auto">
                <table className="w-full text-center border-collapse text-[11px]">
                    <thead className="sticky top-0 z-30 bg-gray-200 font-bold">
                        <tr className="bg-gray-200 border-b">
                            <th className="p-1 border min-w-[70px]">管理番号</th>
                            <th className="p-1 border min-w-[80px]">進行状況</th>
                            <th className="p-1 border min-w-[100px]">コンテナNO.</th>
                            <th className="p-1 border min-w-[110px]">積載型式</th>
                            <th className="p-1 border bg-emerald-50 text-emerald-900" colSpan={3}>補充部品 (PCS)</th>
                            <th className="p-1 border min-w-[60px]">割振数</th>
                            <th className="p-1 border min-w-[65px] bg-emerald-100 font-extrabold text-emerald-900">総数量</th>
                            <th className="p-1 border min-w-[65px]">到着港</th>
                            <th className="p-1 border min-w-[75px]">ETD</th>
                            <th className="p-1 border min-w-[75px]">ETA</th>
                            <th className="p-1 border min-w-[65px]">サイズ</th>
                            <th className="p-1 border min-w-[140px]">本船名</th>
                            <th className="p-1 border min-w-[120px]">備考</th>
                        </tr>
                        <tr className="bg-emerald-50 text-[10px] font-bold border-b">
                            <td colSpan={4} className="border text-center">補充部品 内訳詳細 →</td>
                            <td className="border w-[50px] text-emerald-800">外装箱</td>
                            <td className="border w-[50px] text-emerald-800">化粧箱</td>
                            <td className="border w-[50px] text-emerald-800">ラベル</td>
                            <td colSpan={8} className="border"></td>
                        </tr>
                    </thead>
                    <tbody>
                        {uniqueContainers.map((container, cIdx) => {
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

                            if (modelKeys.length === 0) {
                                return (
                                    <tr key={container.id || cIdx} className="hover:bg-emerald-50 border-b h-[24px]">
                                        <td className="border font-bold">{container.managementNo || '-'}</td>
                                        <td className="border">
                                            <DynamicSelect value={container.status || '手配中'} onChange={(val, cat, orig) => ctx.handleSelectChange(container.id, 'status', true, 'yoshii', true, '進行状況')(val, cat, orig)} category="statuses" options={ctx.masterData.common.statuses} isCommon className="w-full text-center border-none bg-transparent"/>
                                        </td>
                                        <td className="border">
                                            <LocalInput value={container.containerNo || ''} onChange={(v, orig) => ctx.updateContainer(container.id, { containerNo: v }, ctx.yoshiiAllocMonth, 'yoshii', 'コンテナNO')} className="w-full text-center font-mono border-none bg-transparent"/>
                                        </td>
                                        <td className="border text-gray-400 font-normal">-</td>
                                        <td className="border text-gray-400">0</td>
                                        <td className="border text-gray-400">0</td>
                                        <td className="border text-gray-400">0</td>
                                        <td className="border font-bold">0</td>
                                        <td className="border font-extrabold bg-emerald-50 text-emerald-900">0</td>
                                        <td className="border">
                                            <DynamicSelect value={container.port || ''} onChange={(val, cat, orig) => ctx.handleSelectChange(container.id, 'port', true, 'yoshii', false, '到着港')(val, cat, orig)} category="ports" options={ctx.masterData.yoshii.ports} className="w-full text-center border-none bg-transparent"/>
                                        </td>
                                        <td className="border">
                                            <LocalInput type="date" value={container.etd || ''} onChange={(v, orig) => ctx.updateContainer(container.id, { etd: v }, ctx.yoshiiAllocMonth, 'yoshii', 'ETD')} className="w-full text-center border-none bg-transparent"/>
                                        </td>
                                        <td className="border">
                                            <LocalInput type="date" value={container.eta || ''} onChange={(v, orig) => ctx.updateContainer(container.id, { eta: v }, ctx.yoshiiAllocMonth, 'yoshii', 'ETA')} className="w-full text-center border-none bg-transparent"/>
                                        </td>
                                        <td className="border">
                                            <DynamicSelect value={container.containerSize || container.size || ''} onChange={(val, cat, orig) => ctx.handleSelectChange(container.id, 'containerSize', true, 'yoshii', true, 'サイズ')(val, cat, orig)} category="containerSizes" options={ctx.masterData.common.containerSizes} isCommon className="w-full text-center border-none bg-transparent"/>
                                        </td>
                                        <td className="border">
                                            <LocalInput value={container.vessel || ''} onChange={(v, orig) => ctx.updateContainer(container.id, { vessel: v }, ctx.yoshiiAllocMonth, 'yoshii', '本船名')} className="w-full text-center border-none bg-transparent"/>
                                        </td>
                                        <td className="border">
                                            <LocalTextArea value={container.shipNotes || ''} onChange={(v, orig) => ctx.updateContainer(container.id, { shipNotes: v }, ctx.yoshiiAllocMonth, 'yoshii', '備考')}/>
                                        </td>
                                    </tr>
                                );
                            }

                            return modelKeys.map((m, mIdx) => {
                                const qty = allocs[m] || 0;
                                const parts = container.spareParts?.[m] || {};

                                return (
                                    <tr key={`${container.id || cIdx}-${m}`} className="hover:bg-emerald-50 border-b h-[24px]">
                                        {mIdx === 0 && (
                                            <>
                                                <td rowSpan={rowSpan} className="border font-bold bg-white align-middle">{container.managementNo || '-'}</td>
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">
                                                    <DynamicSelect value={container.status || '手配中'} onChange={(val, cat, orig) => ctx.handleSelectChange(container.id, 'status', true, 'yoshii', true, '進行状況')(val, cat, orig)} category="statuses" options={ctx.masterData.common.statuses} isCommon className="w-full text-center border-none bg-transparent"/>
                                                </td>
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">
                                                    <LocalInput value={container.containerNo || ''} onChange={(v, orig) => ctx.updateContainer(container.id, { containerNo: v }, ctx.yoshiiAllocMonth, 'yoshii', 'コンテナNO')} className="w-full text-center font-mono border-none bg-transparent"/>
                                                </td>
                                            </>
                                        )}

                                        <td className="border font-bold text-left pl-1">{m}</td>
                                        <td className="border">
                                            <LocalInput type="number" value={parts.outerBox !== undefined ? parts.outerBox : ''} onChange={(v) => {
                                                const newParts = { ...(container.spareParts || {}), [m]: { ...(container.spareParts?.[m] || {}), outerBox: v === '' ? 0 : Number(v) } };
                                                ctx.updateContainer(container.id, { spareParts: newParts }, ctx.yoshiiAllocMonth, 'yoshii', `型式 [${m}] 外装箱`);
                                            }} className="w-full text-right pr-1 border-none bg-transparent font-normal"/>
                                        </td>
                                        <td className="border">
                                            <LocalInput type="number" value={parts.innerBox !== undefined ? parts.innerBox : ''} onChange={(v) => {
                                                const newParts = { ...(container.spareParts || {}), [m]: { ...(container.spareParts?.[m] || {}), innerBox: v === '' ? 0 : Number(v) } };
                                                ctx.updateContainer(container.id, { spareParts: newParts }, ctx.yoshiiAllocMonth, 'yoshii', `型式 [${m}] 化粧箱`);
                                            }} className="w-full text-right pr-1 border-none bg-transparent font-normal"/>
                                        </td>
                                        <td className="border">
                                            <LocalInput type="number" value={parts.label !== undefined ? parts.label : ''} onChange={(v) => {
                                                const newParts = { ...(container.spareParts || {}), [m]: { ...(container.spareParts?.[m] || {}), label: v === '' ? 0 : Number(v) } };
                                                ctx.updateContainer(container.id, { spareParts: newParts }, ctx.yoshiiAllocMonth, 'yoshii', `型式 [${m}] ラベル`);
                                            }} className="w-full text-right pr-1 border-none bg-transparent font-normal"/>
                                        </td>
                                        <td className="border text-right pr-1 font-bold text-emerald-800">{qty.toLocaleString()}</td>

                                        {mIdx === 0 && (
                                            <>
                                                <td rowSpan={rowSpan} className="border font-extrabold bg-emerald-100 text-emerald-900 text-right pr-1 align-middle">{totalQty.toLocaleString()}</td>
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">
                                                    <DynamicSelect value={container.port || ''} onChange={(val, cat, orig) => ctx.handleSelectChange(container.id, 'port', true, 'yoshii', false, '到着港')(val, cat, orig)} category="ports" options={ctx.masterData.yoshii.ports} className="w-full text-center border-none bg-transparent"/>
                                                </td>
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">
                                                    <LocalInput type="date" value={container.etd || ''} onChange={(v, orig) => ctx.updateContainer(container.id, { etd: v }, ctx.yoshiiAllocMonth, 'yoshii', 'ETD')} className="w-full text-center border-none bg-transparent"/>
                                                </td>
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">
                                                    <LocalInput type="date" value={container.eta || ''} onChange={(v, orig) => ctx.updateContainer(container.id, { eta: v }, ctx.yoshiiAllocMonth, 'yoshii', 'ETA')} className="w-full text-center border-none bg-transparent"/>
                                                </td>
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">
                                                    <DynamicSelect value={container.containerSize || container.size || ''} onChange={(val, cat, orig) => ctx.handleSelectChange(container.id, 'containerSize', true, 'yoshii', true, 'サイズ')(val, cat, orig)} category="containerSizes" options={ctx.masterData.common.containerSizes} isCommon className="w-full text-center border-none bg-transparent"/>
                                                </td>
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">
                                                    <LocalInput value={container.vessel || ''} onChange={(v, orig) => ctx.updateContainer(container.id, { vessel: v }, ctx.yoshiiAllocMonth, 'yoshii', '本船名')} className="w-full text-center border-none bg-transparent"/>
                                                </td>
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">
                                                    <LocalTextArea value={container.shipNotes || ''} onChange={(v, orig) => ctx.updateContainer(container.id, { shipNotes: v }, ctx.yoshiiAllocMonth, 'yoshii', '備考')}/>
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

            <ExportPrintModal isOpen={exportModal.isOpen} onClose={() => setExportModal({ isOpen: false, type: 'excel' })} screenName="出荷日程表" currentMonthStr={ctx.currentMonthStr} defaultMode="year" onStartExport={handleExecuteExport} />
        </div>
    );
};

// 【ドレージ手配画面ビュー】
const YoshiiDrayageView = () => {
    const ctx = React.useContext(AppContext);
    const [exportModal, setExportModal] = React.useState({ isOpen: false, type: 'excel' });

    const [rangeMode, setRangeMode] = React.useState('year');
    const [selectedYear, setSelectedYear] = React.useState(2026);
    const [customStartMonth, setCustomStartMonth] = React.useState('2026-04');
    const [customEndMonth, setCustomEndMonth] = React.useState('2027-03');

    const generateMonths = () => {
        const months = [];
        if (rangeMode === 'year') {
            for (let i = 0; i < 12; i++) {
                const mo = (i + 3) % 12 + 1;
                const yr = (i + 3) >= 12 ? Number(selectedYear) + 1 : Number(selectedYear);
                months.push(`${yr}-${String(mo).padStart(2, '0')}`);
            }
        } else {
            let curr = new Date(`${customStartMonth}-01`);
            const end = new Date(`${customEndMonth}-01`);
            while (curr <= end && months.length < 36) {
                const yr = curr.getFullYear();
                const mo = String(curr.getMonth() + 1).padStart(2, '0');
                months.push(`${yr}-${mo}`);
                curr.setMonth(curr.getMonth() + 1);
            }
        }
        return months;
    };

    const displayMonths = generateMonths();

    let targetContainers = ctx.containers.filter(c => 
        c.company === 'yoshii' && displayMonths.includes(c.deliveryMonth)
    );

    if (ctx.selectedVendorFilter && ctx.selectedVendorFilter !== 'ALL') {
        targetContainers = targetContainers.filter(c => {
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

    const uniqueContainersMap = new Map();
    targetContainers.forEach(c => {
        if (c.id && !uniqueContainersMap.has(c.id)) {
            uniqueContainersMap.set(c.id, c);
        }
    });
    const uniqueContainers = Array.from(uniqueContainersMap.values());

    const handleExecuteExport = () => {
        if (exportModal.type === 'print') {
            setTimeout(() => window.print(), 300);
            return;
        }

        const headers = ['管理番号', '進行状況', 'コンテナNO.', '積載型式', '割振数', '総数量', '到着港', 'ETD', 'ETA', 'フリータイム', '納品日', '納品時間', '納品先', '備考', 'コンテナサイズ', '本船名'];
        const rows = [];

        uniqueContainers.forEach(c => {
            const allocs = c.allocations || {};
            const allocModels = Object.keys(allocs).filter(m => allocs[m] > 0);

            if (allocModels.length === 0) {
                rows.push([c.managementNo || '-', c.status || '手配中', c.containerNo || '-', '-', 0, 0, c.port || '-', c.etd || '-', c.eta || '-', c.freeTime || '-', c.drayageDeliveryDate || '-', c.drayageDeliveryTime || '-', c.drayageDestination || '-', c.drayageNotes || '', c.containerSize || c.size || '-', c.vessel || '-']);
            } else {
                allocModels.forEach((m, idx) => {
                    const q = allocs[m];
                    rows.push([
                        idx === 0 ? (c.managementNo || '-') : '',
                        idx === 0 ? (c.status || '手配中') : '',
                        idx === 0 ? (c.containerNo || '-') : '',
                        m,
                        q,
                        idx === 0 ? Object.values(allocs).reduce((a,b)=>a+Number(b||0),0) : '',
                        idx === 0 ? (c.port || '-') : '',
                        idx === 0 ? (c.etd || '-') : '',
                        idx === 0 ? (c.eta || '-') : '',
                        idx === 0 ? (c.freeTime || '-') : '',
                        idx === 0 ? (c.drayageDeliveryDate || '-') : '',
                        idx === 0 ? (c.drayageDeliveryTime || '-') : '',
                        idx === 0 ? (c.drayageDestination || '-') : '',
                        idx === 0 ? (c.drayageNotes || '') : '',
                        idx === 0 ? (c.containerSize || c.size || '-') : '',
                        idx === 0 ? (c.vessel || '-') : ''
                    ]);
                });
            }
        });

        const filename = `吉井電気_ドレージ手配_${ctx.getFormattedShortDate().replace(/\//g,'')}.xlsx`;
        exportToExcelSimple({
            title: `吉井電気 ドレージ手配 [仕入先: ${ctx.selectedVendorFilter || 'ALL'}]`,
            headers, rows, filename
        });
    };

    return (
        <div className="p-3 bg-white flex-grow flex flex-col h-full overflow-hidden text-xs">
            <div className="flex justify-between items-center mb-2 no-print flex-shrink-0">
                <div className="flex items-center gap-3">
                    <h2 className="text-base font-extrabold text-emerald-900 border-b-2 border-emerald-600 pb-0.5">
                        吉井電気 ドレージ手配 [仕入先: {ctx.selectedVendorFilter || 'ALL'}]
                    </h2>

                    <div className="flex items-center gap-1 bg-gray-50 p-0.5 rounded border text-xs">
                        <select value={rangeMode} onChange={e => setRangeMode(e.target.value)} className="font-bold border rounded px-1 py-0.5 bg-white">
                            <option value="year">年度指定</option>
                            <option value="custom">カスタム指定</option>
                        </select>

                        {rangeMode === 'year' ? (
                            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="font-bold border rounded px-1 py-0.5 bg-white text-emerald-800">
                                <option value={2025}>2025年度</option>
                                <option value={2026}>2026年度</option>
                                <option value={2027}>2027年度</option>
                            </select>
                        ) : (
                            <div className="flex items-center gap-1 font-bold">
                                <input type="month" value={customStartMonth} onChange={e => setCustomStartMonth(e.target.value)} className="border rounded px-1 bg-white"/>
                                <span>〜</span>
                                <input type="month" value={customEndMonth} onChange={e => setCustomEndMonth(e.target.value)} className="border rounded px-1 bg-white"/>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 font-bold">
                    <button onClick={() => setExportModal({ isOpen: true, type: 'excel' })} className="px-2 py-1 text-xs font-bold rounded bg-emerald-700 hover:bg-emerald-800 text-white shadow transition flex items-center gap-1">📊 Excel出力</button>
                    <button onClick={() => setExportModal({ isOpen: true, type: 'print' })} className="px-2 py-1 text-xs font-bold rounded bg-slate-700 hover:bg-slate-800 text-white shadow transition flex items-center gap-1">🖨 印刷</button>
                    <button onClick={ctx.handleStartTracking} className={`px-2 py-1 text-xs font-bold rounded shadow transition ${ctx.isChangeTrackingMode ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}>{ctx.isChangeTrackingMode ? '● 変更記録中' : '変更開始'}</button>
                    <button onClick={ctx.handleClearTracking} className="px-2 py-1 text-xs font-bold rounded bg-gray-600 hover:bg-gray-700 text-white shadow transition">変更クリア</button>
                </div>
            </div>

            <div className="table-container flex-grow border rounded shadow-inner overflow-x-auto overflow-y-auto">
                <table className="w-full text-center border-collapse text-[11px]">
                    <thead className="sticky top-0 z-30 bg-gray-200 font-bold">
                        <tr className="bg-gray-200 border-b">
                            <th className="p-1 border min-w-[65px]">管理番号</th>
                            <th className="p-1 border min-w-[70px]">進行状況</th>
                            <th className="p-1 border min-w-[90px]">コンテナNO.</th>
                            <th className="p-1 border min-w-[110px]">積載型式</th>
                            <th className="p-1 border min-w-[55px]">割振数</th>
                            <th className="p-1 border min-w-[65px] bg-emerald-100 font-extrabold text-emerald-900">総数量</th>
                            <th className="p-1 border min-w-[60px]">到着港</th>
                            <th className="p-1 border min-w-[70px]">ETD</th>
                            <th className="p-1 border min-w-[70px]">ETA</th>
                            <th className="p-1 border min-w-[75px]">フリータイム</th>
                            <th className="p-1 border min-w-[75px]">納品日</th>
                            <th className="p-1 border min-w-[65px]">時間</th>
                            <th className="p-1 border min-w-[140px]">納品先</th>
                            <th className="p-1 border min-w-[120px]">備考</th>
                            <th className="p-1 border min-w-[55px]">サイズ</th>
                            <th className="p-1 border min-w-[120px]">本船名</th>
                        </tr>
                    </thead>
                    <tbody>
                        {uniqueContainers.map((container, cIdx) => {
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

                            if (modelKeys.length === 0) {
                                return (
                                    <tr key={container.id || cIdx} className="hover:bg-emerald-50 border-b h-[24px]">
                                        <td className="border font-bold">{container.managementNo || '-'}</td>
                                        <td className="border">
                                            <DynamicSelect value={container.status || '手配中'} onChange={(val, cat, orig) => ctx.handleSelectChange(container.id, 'status', true, 'yoshii', true, '進行状況')(val, cat, orig)} category="statuses" options={ctx.masterData.common.statuses} isCommon className="w-full text-center border-none bg-transparent"/>
                                        </td>
                                        <td className="border">
                                            <LocalInput value={container.containerNo || ''} onChange={(v, orig) => ctx.updateContainer(container.id, { containerNo: v }, ctx.yoshiiAllocMonth, 'yoshii', 'コンテナNO')} className="w-full text-center font-mono border-none bg-transparent"/>
                                        </td>
                                        <td className="border text-gray-400 font-normal">-</td>
                                        <td className="border font-bold">0</td>
                                        <td className="border font-extrabold bg-emerald-50 text-emerald-900">0</td>
                                        <td className="border">{container.port || '-'}</td>
                                        <td className="border">{container.etd || '-'}</td>
                                        <td className="border">{container.eta || '-'}</td>
                                        <td className="border">
                                            <LocalInput type="date" value={container.freeTime || ''} onChange={(v, orig) => ctx.updateContainer(container.id, { freeTime: v }, ctx.yoshiiAllocMonth, 'yoshii', 'フリータイム')} className="w-full text-center border-none bg-transparent"/>
                                        </td>
                                        <td className="border">
                                            <LocalInput type="date" value={container.drayageDeliveryDate || ''} onChange={(v, orig) => ctx.updateContainer(container.id, { drayageDeliveryDate: v }, ctx.yoshiiAllocMonth, 'yoshii', '納品日')} className="w-full text-center border-none bg-transparent"/>
                                        </td>
                                        <td className="border">
                                            <LocalInput type="time" value={container.drayageDeliveryTime || ''} onChange={(v, orig) => ctx.updateContainer(container.id, { drayageDeliveryTime: v }, ctx.yoshiiAllocMonth, 'yoshii', '時間')} className="w-full text-center border-none bg-transparent"/>
                                        </td>
                                        <td className="border">
                                            <DynamicSelect value={container.drayageDestination || ''} onChange={(val, cat, orig) => ctx.handleSelectChange(container.id, 'drayageDestination', true, 'yoshii', false, '納品先')(val, cat, orig)} category="destinations" options={ctx.masterData.yoshii.destinations} className="w-full text-center border-none bg-transparent"/>
                                        </td>
                                        <td className="border">
                                            <LocalTextArea value={container.drayageNotes || ''} onChange={(v, orig) => ctx.updateContainer(container.id, { drayageNotes: v }, ctx.yoshiiAllocMonth, 'yoshii', '備考')}/>
                                        </td>
                                        <td className="border">{container.containerSize || container.size || '-'}</td>
                                        <td className="border">{container.vessel || '-'}</td>
                                    </tr>
                                );
                            }

                            return modelKeys.map((m, mIdx) => {
                                const qty = allocs[m] || 0;

                                return (
                                    <tr key={`${container.id || cIdx}-${m}`} className="hover:bg-emerald-50 border-b h-[24px]">
                                        {mIdx === 0 && (
                                            <>
                                                <td rowSpan={rowSpan} className="border font-bold bg-white align-middle">{container.managementNo || '-'}</td>
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">
                                                    <DynamicSelect value={container.status || '手配中'} onChange={(val, cat, orig) => ctx.handleSelectChange(container.id, 'status', true, 'yoshii', true, '進行状況')(val, cat, orig)} category="statuses" options={ctx.masterData.common.statuses} isCommon className="w-full text-center border-none bg-transparent"/>
                                                </td>
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">
                                                    <LocalInput value={container.containerNo || ''} onChange={(v, orig) => ctx.updateContainer(container.id, { containerNo: v }, ctx.yoshiiAllocMonth, 'yoshii', 'コンテナNO')} className="w-full text-center font-mono border-none bg-transparent"/>
                                                </td>
                                            </>
                                        )}

                                        <td className="border font-bold text-left pl-1">{m}</td>
                                        <td className="border text-right pr-1 font-bold text-emerald-800">{qty.toLocaleString()}</td>

                                        {mIdx === 0 && (
                                            <>
                                                <td rowSpan={rowSpan} className="border font-extrabold bg-emerald-100 text-emerald-900 text-right pr-1 align-middle">{totalQty.toLocaleString()}</td>
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">{container.port || '-'}</td>
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">{container.etd || '-'}</td>
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">{container.eta || '-'}</td>
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">
                                                    <LocalInput type="date" value={container.freeTime || ''} onChange={(v, orig) => ctx.updateContainer(container.id, { freeTime: v }, ctx.yoshiiAllocMonth, 'yoshii', 'フリータイム')} className="w-full text-center border-none bg-transparent"/>
                                                </td>
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">
                                                    <LocalInput type="date" value={container.drayageDeliveryDate || ''} onChange={(v, orig) => ctx.updateContainer(container.id, { drayageDeliveryDate: v }, ctx.yoshiiAllocMonth, 'yoshii', '納品日')} className="w-full text-center border-none bg-transparent"/>
                                                </td>
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">
                                                    <LocalInput type="time" value={container.drayageDeliveryTime || ''} onChange={(v, orig) => ctx.updateContainer(container.id, { drayageDeliveryTime: v }, ctx.yoshiiAllocMonth, 'yoshii', '時間')} className="w-full text-center border-none bg-transparent"/>
                                                </td>
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">
                                                    <DynamicSelect value={container.drayageDestination || ''} onChange={(val, cat, orig) => ctx.handleSelectChange(container.id, 'drayageDestination', true, 'yoshii', false, '納品先')(val, cat, orig)} category="destinations" options={ctx.masterData.yoshii.destinations} className="w-full text-center border-none bg-transparent"/>
                                                </td>
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">
                                                    <LocalTextArea value={container.drayageNotes || ''} onChange={(v, orig) => ctx.updateContainer(container.id, { drayageNotes: v }, ctx.yoshiiAllocMonth, 'yoshii', '備考')}/>
                                                </td>
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">{container.containerSize || container.size || '-'}</td>
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">{container.vessel || '-'}</td>
                                            </>
                                        )}
                                    </tr>
                                );
                            });
                        })}
                    </tbody>
                </table>
            </div>

            <ExportPrintModal isOpen={exportModal.isOpen} onClose={() => setExportModal({ isOpen: false, type: 'excel' })} screenName="ドレージ手配" currentMonthStr={ctx.currentMonthStr} defaultMode="year" onStartExport={handleExecuteExport} />
        </div>
    );
};