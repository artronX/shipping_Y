// =========================================================
// shipping_views_ship.js - 出荷日程・ドレージ画面モジュール (WebVer. 114 業務フロー・スクロール完全修復版)
// =========================================================

// 【出荷日程画面ビュー】
const YoshiiShipView = () => {
    const ctx = React.useContext(AppContext);
    const [exportModal, setExportModal] = React.useState({ isOpen: false, type: 'excel' });

    const [filterMode, setFilterMode] = React.useState('all');
    const [selectedYear, setSelectedYear] = React.useState(2026);
    const [singleMonth, setSingleMonth] = React.useState(ctx.currentMonthStr);
    const [startMonth, setStartMonth] = React.useState('2026-04');
    const [endMonth, setEndMonth] = React.useState('2027-03');
    const [sortConfig, setSortConfig] = React.useState([]);

    const generateMonths = () => {
        const months = [];
        if (filterMode === 'year') {
            for (let i = 0; i < 12; i++) {
                const mo = (i + 3) % 12 + 1;
                const yr = (i + 3) >= 12 ? Number(selectedYear) + 1 : Number(selectedYear);
                months.push(`${yr}-${String(mo).padStart(2, '0')}`);
            }
        } else if (filterMode === 'month') {
            months.push(singleMonth);
        } else if (filterMode === 'range') {
            let curr = new Date(`${startMonth}-01`);
            const end = new Date(`${endMonth}-01`);
            while (curr <= end && months.length < 36) {
                const yr = curr.getFullYear();
                const mo = String(curr.getMonth() + 1).padStart(2, '0');
                months.push(`${yr}-${mo}`);
                curr.setMonth(curr.getMonth() + 1);
            }
        } else {
            const currentYr = new Date().getFullYear();
            for (let yr = currentYr - 1; yr <= currentYr + 1; yr++) {
                for (let mo = 1; mo <= 12; mo++) {
                    months.push(`${yr}-${String(mo).padStart(2, '0')}`);
                }
            }
        }
        return months;
    };

    const targetMonths = generateMonths();

    let yoshiiContainers = ctx.containers.filter(c => c.company === 'yoshii' && targetMonths.includes(c.deliveryMonth));

    if (ctx.selectedVendorFilter && ctx.selectedVendorFilter !== 'ALL') {
        yoshiiContainers = yoshiiContainers.filter(c => {
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
    yoshiiContainers.forEach(c => {
        if (c.id && !uniqueContainersMap.has(c.id)) {
            uniqueContainersMap.set(c.id, c);
        }
    });
    let displayContainers = Array.from(uniqueContainersMap.values());

    displayContainers.sort((a, b) => {
        const mA = a.deliveryMonth || '9999-99';
        const mB = b.deliveryMonth || '9999-99';
        if (mA !== mB) return mA.localeCompare(mB);

        const orderA = a.allocNo !== undefined ? a.allocNo : (a.sortOrder !== undefined ? a.sortOrder : 999999);
        const orderB = b.allocNo !== undefined ? b.allocNo : (b.sortOrder !== undefined ? b.sortOrder : 999999);
        return orderA - orderB;
    });

    const groupedRows = [];
    let currentMonth = null;
    displayContainers.forEach(c => {
        const m = c.deliveryMonth || '未設定';
        if (m !== currentMonth) {
            groupedRows.push({ isDivider: true, monthLabel: m });
            currentMonth = m;
        }
        groupedRows.push(c);
    });

    // 他画面移動後のスクロール位置保持・復元 & 初回ロード時当月移動の厳格制御
    React.useEffect(() => {
        const container = ctx.tableContainerRef.current;
        if (!container) return;

        // 過去のスクロール記憶があれば復元、無ければ初回のみ当月（2026-10）へスクロール
        if (ctx.shipScrollPosRef.current !== null && ctx.shipScrollPosRef.current > 0) {
            container.scrollTop = ctx.shipScrollPosRef.current;
        } else if (filterMode === 'all') {
            const timer = setTimeout(() => {
                const targetEl = container.querySelector(`[data-month="${ctx.currentMonthStr}"]`);
                if (targetEl) {
                    targetEl.scrollIntoView({ behavior: 'auto', block: 'start' });
                    ctx.shipScrollPosRef.current = container.scrollTop;
                }
            }, 100);
            return () => clearTimeout(timer);
        }

        const handleScroll = () => {
            if (container) {
                ctx.shipScrollPosRef.current = container.scrollTop;
            }
        };

        container.addEventListener('scroll', handleScroll);
        return () => {
            if (container) {
                ctx.shipScrollPosRef.current = container.scrollTop;
                container.removeEventListener('scroll', handleScroll);
            }
        };
    }, [filterMode, ctx.currentMonthStr, displayContainers.length]);

    const handleExecuteExport = () => {
        if (exportModal.type === 'print') {
            setTimeout(() => window.print(), 300);
            return;
        }

        const headers = ['管理番号', '進行状況', 'コンテナNO.', '積載型式', '外装箱', '化粧箱', 'ラベル', '割振数', '総数量', '到着港', 'ETD', 'ETA', 'サイズ', '本船名', '備考'];
        const rows = [];

        displayContainers.forEach(c => {
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
                <h2 className="text-base font-extrabold text-emerald-900 border-b-2 border-emerald-600 pb-0.5">
                    吉井電気 出荷日程表 [仕入先: {ctx.selectedVendorFilter || 'ALL'}]
                </h2>

                <div className="flex items-center gap-2 font-bold">
                    <button onClick={() => setExportModal({ isOpen: true, type: 'excel' })} className="px-2 py-1 text-xs font-bold rounded bg-emerald-700 hover:bg-emerald-800 text-white shadow transition flex items-center gap-1">📊 Excel出力</button>
                    <button onClick={() => setExportModal({ isOpen: true, type: 'print' })} className="px-2 py-1 text-xs font-bold rounded bg-slate-700 hover:bg-slate-800 text-white shadow transition flex items-center gap-1">🖨 印刷</button>
                    <button onClick={ctx.handleStartTracking} className={`px-2 py-1 text-xs font-bold rounded shadow transition ${ctx.isChangeTrackingMode ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}>{ctx.isChangeTrackingMode ? '● 変更記録中' : '変更開始'}</button>
                    <button onClick={ctx.handleClearTracking} className="px-2 py-1 text-xs font-bold rounded bg-gray-600 hover:bg-gray-700 text-white shadow transition">変更クリア</button>
                </div>
            </div>

            <ScheduleFilterSortControl 
                filterMode={filterMode} setFilterMode={setFilterMode}
                selectedYear={selectedYear} setSelectedYear={setSelectedYear}
                singleMonth={singleMonth} setSingleMonth={setSingleMonth}
                startMonth={startMonth} setStartMonth={setStartMonth}
                endMonth={endMonth} setEndMonth={setEndMonth}
                sortConfig={sortConfig} setSortConfig={setSortConfig}
            />

            <div className="table-container flex-grow border rounded shadow-inner overflow-x-auto overflow-y-auto" ref={ctx.tableContainerRef}>
                <table className="w-full text-center border-collapse text-[11px]">
                    <thead className="sticky top-0 z-30 bg-gray-200 font-bold shadow-sm">
                        <tr className="bg-gray-200 border-b">
                            <th className="p-1 border w-[70px] min-w-[70px] max-w-[70px]">管理番号</th>
                            <th className="p-1 border w-[80px] min-w-[80px] max-w-[80px]">進行状況</th>
                            <th className="p-1 border w-[100px] min-w-[100px] max-w-[100px]">コンテナNO.</th>
                            <th className="p-1 border w-[110px] min-w-[110px]">積載型式</th>
                            <th className="p-1 border bg-emerald-50 text-emerald-900" colSpan={3}>補充部品 (PCS)</th>
                            <th className="p-1 border w-[60px] min-w-[60px] max-w-[60px]">割振数</th>
                            <th className="p-1 border w-[65px] min-w-[65px] max-w-[65px] bg-emerald-100 font-extrabold text-emerald-900">総数量</th>
                            <th className="p-1 border w-[65px] min-w-[65px] max-w-[65px]">到着港</th>
                            <th className="p-1 border w-[75px] min-w-[75px] max-w-[75px]">ETD</th>
                            <th className="p-1 border w-[75px] min-w-[75px] max-w-[75px]">ETA</th>
                            <th className="p-1 border w-[65px] min-w-[65px] max-w-[65px]">サイズ</th>
                            <th className="p-1 border w-[140px] min-w-[140px]">本船名</th>
                            <th className="p-1 border min-w-[120px]">備考</th>
                        </tr>
                        <tr className="bg-emerald-50 text-[10px] font-bold border-b">
                            <td colSpan={4} className="border text-center bg-gray-100">補充部品 内訳詳細 →</td>
                            <td className="border w-[40px] min-w-[40px] max-w-[40px] text-emerald-800">外装箱</td>
                            <td className="border w-[40px] min-w-[40px] max-w-[40px] text-emerald-800">化粧箱</td>
                            <td className="border w-[40px] min-w-[40px] max-w-[40px] text-emerald-800">ラベル</td>
                            <td colSpan={8} className="border bg-gray-100"></td>
                        </tr>
                    </thead>
                    <tbody>
                        {groupedRows.map((row, idx) => {
                            if (row.isDivider) {
                                const label = row.monthLabel === '未設定' ? '納品月 未設定' : `■ ${row.monthLabel.split('-')[0]}年${row.monthLabel.split('-')[1]}月 納品分`;
                                return (
                                    <tr key={`div-${idx}`} className="month-divider" data-month={row.monthLabel}>
                                        <td colSpan={15} className="bg-gray-200 font-bold text-left px-3 py-1.5 text-gray-800 border-y-2 border-gray-400 text-xs">
                                            {label}
                                        </td>
                                    </tr>
                                );
                            }

                            const container = row;
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
                                    <tr key={container.id || idx} className="hover:bg-gray-50 border-b h-[24px]">
                                        {/* 出荷日程：固定表示項目（グレー背景） */}
                                        <td className="border font-bold readonly-cell">{container.managementNo || '-'}</td>
                                        <td className="border readonly-cell">
                                            <DynamicSelect value={container.status || '手配中'} originalValue={(container.originals || {}).status} originalMeta={(container.originalMetas || {}).status} onChange={(val, cat, orig) => ctx.handleSelectChange(container.id, 'status', true, 'yoshii', true, '進行状況')(val, cat, orig)} category="statuses" options={ctx.masterData.common.statuses} isCommon className="w-full text-center border-none bg-transparent"/>
                                        </td>

                                        {/* 出荷日程：編集可能項目（白背景） */}
                                        <td className="border bg-white">
                                            <LocalInput value={container.containerNo || ''} originalValue={(container.originals || {}).containerNo} originalMeta={(container.originalMetas || {}).containerNo} onChange={(v, orig) => ctx.updateContainer(container.id, { containerNo: v }, container.deliveryMonth, 'yoshii', 'コンテナNO')} className="w-full text-center font-mono border-none bg-transparent"/>
                                        </td>
                                        <td className="border text-gray-400 font-normal bg-white">-</td>
                                        <td className="border text-gray-400 bg-white">0</td>
                                        <td className="border text-gray-400 bg-white">0</td>
                                        <td className="border text-gray-400 bg-white">0</td>

                                        {/* 割振数・総数量（固定表示） */}
                                        <td className="border font-bold readonly-cell">0</td>
                                        <td className="border font-extrabold bg-emerald-100 text-emerald-900 font-mono">0</td>

                                        {/* 出荷日程：海外便手配調整のため編集可能（白背景） */}
                                        <td className="border bg-white">
                                            <DynamicSelect value={container.port || ''} originalValue={(container.originals || {}).port} originalMeta={(container.originalMetas || {}).port} onChange={(val, cat, orig) => ctx.handleSelectChange(container.id, 'port', true, 'yoshii', false, '到着港')(val, cat, orig)} category="ports" options={ctx.masterData.yoshii.ports} className="w-full text-center border-none bg-transparent"/>
                                        </td>
                                        <td className="border bg-white">
                                            <LocalInput type="date" value={container.etd || ''} originalValue={(container.originals || {}).etd} originalMeta={(container.originalMetas || {}).etd} onChange={(v, orig) => ctx.updateContainer(container.id, { etd: v }, container.deliveryMonth, 'yoshii', 'ETD')} className="w-full text-center border-none bg-transparent"/>
                                        </td>
                                        <td className="border bg-white">
                                            <LocalInput type="date" value={container.eta || ''} originalValue={(container.originals || {}).eta} originalMeta={(container.originalMetas || {}).eta} onChange={(v, orig) => ctx.updateContainer(container.id, { eta: v }, container.deliveryMonth, 'yoshii', 'ETA')} className="w-full text-center border-none bg-transparent"/>
                                        </td>
                                        <td className="border bg-white">
                                            <DynamicSelect value={container.containerSize || container.size || ''} originalValue={(container.originals || {}).containerSize} originalMeta={(container.originalMetas || {}).containerSize} onChange={(val, cat, orig) => ctx.handleSelectChange(container.id, 'containerSize', true, 'yoshii', true, 'サイズ')(val, cat, orig)} category="containerSizes" options={ctx.masterData.common.containerSizes} isCommon className="w-full text-center border-none bg-transparent"/>
                                        </td>
                                        <td className="border bg-white">
                                            <LocalInput value={container.vessel || ''} originalValue={(container.originals || {}).vessel} originalMeta={(container.originalMetas || {}).vessel} onChange={(v, orig) => ctx.updateContainer(container.id, { vessel: v }, container.deliveryMonth, 'yoshii', '本船名')} className="w-full text-center border-none bg-transparent"/>
                                        </td>
                                        <td className="border bg-white">
                                            <LocalTextArea value={container.shipNotes || ''} originalValue={(container.originals || {}).shipNotes} originalMeta={(container.originalMetas || {}).shipNotes} onChange={(v, orig) => ctx.updateContainer(container.id, { shipNotes: v }, container.deliveryMonth, 'yoshii', '備考')}/>
                                        </td>
                                    </tr>
                                );
                            }

                            return modelKeys.map((m, mIdx) => {
                                const qty = allocs[m] || 0;
                                const parts = container.spareParts?.[m] || {};

                                return (
                                    <tr key={`${container.id || idx}-${m}`} className="hover:bg-gray-50 border-b h-[24px]">
                                        {mIdx === 0 && (
                                            <>
                                                <td rowSpan={rowSpan} className="border font-bold readonly-cell align-middle">{container.managementNo || '-'}</td>
                                                <td rowSpan={rowSpan} className="border readonly-cell align-middle">
                                                    <DynamicSelect value={container.status || '手配中'} originalValue={(container.originals || {}).status} originalMeta={(container.originalMetas || {}).status} onChange={(val, cat, orig) => ctx.handleSelectChange(container.id, 'status', true, 'yoshii', true, '進行状況')(val, cat, orig)} category="statuses" options={ctx.masterData.common.statuses} isCommon className="w-full text-center border-none bg-transparent"/>
                                                </td>
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">
                                                    <LocalInput value={container.containerNo || ''} originalValue={(container.originals || {}).containerNo} originalMeta={(container.originalMetas || {}).containerNo} onChange={(v, orig) => ctx.updateContainer(container.id, { containerNo: v }, container.deliveryMonth, 'yoshii', 'コンテナNO')} className="w-full text-center font-mono border-none bg-transparent"/>
                                                </td>
                                            </>
                                        )}

                                        <td className="border font-bold text-left pl-1 bg-white">{m}</td>
                                        <td className="border w-[40px] min-w-[40px] max-w-[40px] bg-white">
                                            <LocalInput type="number" value={parts.outerBox !== undefined ? parts.outerBox : ''} onChange={(v) => {
                                                const newParts = { ...(container.spareParts || {}), [m]: { ...(container.spareParts?.[m] || {}), outerBox: v === '' ? 0 : Number(v) } };
                                                ctx.updateContainer(container.id, { spareParts: newParts }, container.deliveryMonth, 'yoshii', `型式 [${m}] 外装箱`);
                                            }} className="w-full text-right pr-1 border-none bg-transparent font-normal"/>
                                        </td>
                                        <td className="border w-[40px] min-w-[40px] max-w-[40px] bg-white">
                                            <LocalInput type="number" value={parts.innerBox !== undefined ? parts.innerBox : ''} onChange={(v) => {
                                                const newParts = { ...(container.spareParts || {}), [m]: { ...(container.spareParts?.[m] || {}), innerBox: v === '' ? 0 : Number(v) } };
                                                ctx.updateContainer(container.id, { spareParts: newParts }, container.deliveryMonth, 'yoshii', `型式 [${m}] 化粧箱`);
                                            }} className="w-full text-right pr-1 border-none bg-transparent font-normal"/>
                                        </td>
                                        <td className="border w-[40px] min-w-[40px] max-w-[40px] bg-white">
                                            <LocalInput type="number" value={parts.label !== undefined ? parts.label : ''} onChange={(v) => {
                                                const newParts = { ...(container.spareParts || {}), [m]: { ...(container.spareParts?.[m] || {}), label: v === '' ? 0 : Number(v) } };
                                                ctx.updateContainer(container.id, { spareParts: newParts }, container.deliveryMonth, 'yoshii', `型式 [${m}] ラベル`);
                                            }} className="w-full text-right pr-1 border-none bg-transparent font-normal"/>
                                        </td>
                                        <td className="border text-right pr-1 font-bold text-emerald-800 font-mono bg-white">{qty.toLocaleString()}</td>

                                        {mIdx === 0 && (
                                            <>
                                                <td rowSpan={rowSpan} className="border font-extrabold bg-emerald-100 text-emerald-900 text-right pr-1 align-middle font-mono">{totalQty.toLocaleString()}</td>
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">
                                                    <DynamicSelect value={container.port || ''} originalValue={(container.originals || {}).port} originalMeta={(container.originalMetas || {}).port} onChange={(val, cat, orig) => ctx.handleSelectChange(container.id, 'port', true, 'yoshii', false, '到着港')(val, cat, orig)} category="ports" options={ctx.masterData.yoshii.ports} className="w-full text-center border-none bg-transparent"/>
                                                </td>
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">
                                                    <LocalInput type="date" value={container.etd || ''} originalValue={(container.originals || {}).etd} originalMeta={(container.originalMetas || {}).etd} onChange={(v, orig) => ctx.updateContainer(container.id, { etd: v }, container.deliveryMonth, 'yoshii', 'ETD')} className="w-full text-center border-none bg-transparent"/>
                                                </td>
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">
                                                    <LocalInput type="date" value={container.eta || ''} originalValue={(container.originals || {}).eta} originalMeta={(container.originalMetas || {}).eta} onChange={(v, orig) => ctx.updateContainer(container.id, { eta: v }, container.deliveryMonth, 'yoshii', 'ETA')} className="w-full text-center border-none bg-transparent"/>
                                                </td>
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">
                                                    <DynamicSelect value={container.containerSize || container.size || ''} originalValue={(container.originals || {}).containerSize} originalMeta={(container.originalMetas || {}).containerSize} onChange={(val, cat, orig) => ctx.handleSelectChange(container.id, 'containerSize', true, 'yoshii', true, 'サイズ')(val, cat, orig)} category="containerSizes" options={ctx.masterData.common.containerSizes} isCommon className="w-full text-center border-none bg-transparent"/>
                                                </td>
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">
                                                    <LocalInput value={container.vessel || ''} originalValue={(container.originals || {}).vessel} originalMeta={(container.originalMetas || {}).vessel} onChange={(v, orig) => ctx.updateContainer(container.id, { vessel: v }, container.deliveryMonth, 'yoshii', '本船名')} className="w-full text-center border-none bg-transparent"/>
                                                </td>
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">
                                                    <LocalTextArea value={container.shipNotes || ''} originalValue={(container.originals || {}).shipNotes} originalMeta={(container.originalMetas || {}).shipNotes} onChange={(v, orig) => ctx.updateContainer(container.id, { shipNotes: v }, container.deliveryMonth, 'yoshii', '備考')}/>
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

// 【ドレージ手配画面ビュー - 業務フロー依存ロック・永続スクロール完全復元版】
const YoshiiDrayageView = () => {
    const ctx = React.useContext(AppContext);
    const [exportModal, setExportModal] = React.useState({ isOpen: false, type: 'excel' });

    const [filterMode, setFilterMode] = React.useState('all');
    const [selectedYear, setSelectedYear] = React.useState(2026);
    const [singleMonth, setSingleMonth] = React.useState(ctx.currentMonthStr);
    const [startMonth, setStartMonth] = React.useState('2026-04');
    const [endMonth, setEndMonth] = React.useState('2027-03');
    const [sortConfig, setSortConfig] = React.useState([]);

    const generateMonths = () => {
        const months = [];
        if (filterMode === 'year') {
            for (let i = 0; i < 12; i++) {
                const mo = (i + 3) % 12 + 1;
                const yr = (i + 3) >= 12 ? Number(selectedYear) + 1 : Number(selectedYear);
                months.push(`${yr}-${String(mo).padStart(2, '0')}`);
            }
        } else if (filterMode === 'month') {
            months.push(singleMonth);
        } else if (filterMode === 'range') {
            let curr = new Date(`${startMonth}-01`);
            const end = new Date(`${endMonth}-01`);
            while (curr <= end && months.length < 36) {
                const yr = curr.getFullYear();
                const mo = String(curr.getMonth() + 1).padStart(2, '0');
                months.push(`${yr}-${mo}`);
                curr.setMonth(curr.getMonth() + 1);
            }
        } else {
            const currentYr = new Date().getFullYear();
            for (let yr = currentYr - 1; yr <= currentYr + 1; yr++) {
                for (let mo = 1; mo <= 12; mo++) {
                    months.push(`${yr}-${String(mo).padStart(2, '0')}`);
                }
            }
        }
        return months;
    };

    const targetMonths = generateMonths();

    let yoshiiContainers = ctx.containers.filter(c => c.company === 'yoshii' && targetMonths.includes(c.deliveryMonth));

    if (ctx.selectedVendorFilter && ctx.selectedVendorFilter !== 'ALL') {
        yoshiiContainers = yoshiiContainers.filter(c => {
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
    yoshiiContainers.forEach(c => {
        if (c.id && !uniqueContainersMap.has(c.id)) {
            uniqueContainersMap.set(c.id, c);
        }
    });
    let displayContainers = Array.from(uniqueContainersMap.values());

    displayContainers.sort((a, b) => {
        const mA = a.deliveryMonth || '9999-99';
        const mB = b.deliveryMonth || '9999-99';
        if (mA !== mB) return mA.localeCompare(mB);

        const orderA = a.allocNo !== undefined ? a.allocNo : (a.sortOrder !== undefined ? a.sortOrder : 999999);
        const orderB = b.allocNo !== undefined ? b.allocNo : (b.sortOrder !== undefined ? b.sortOrder : 999999);
        return orderA - orderB;
    });

    const groupedRows = [];
    let currentMonth = null;
    displayContainers.forEach(c => {
        const m = c.deliveryMonth || '未設定';
        if (m !== currentMonth) {
            groupedRows.push({ isDivider: true, monthLabel: m });
            currentMonth = m;
        }
        groupedRows.push(c);
    });

    // 他画面移動後のスクロール位置保持・復元 & 初回ロード時当月移動の厳格制御
    React.useEffect(() => {
        const container = ctx.tableContainerRef.current;
        if (!container) return;

        // 過去のスクロール記憶があれば復元、無ければ初回のみ当月（2026-10）へスクロール
        if (ctx.drayScrollPosRef.current !== null && ctx.drayScrollPosRef.current > 0) {
            container.scrollTop = ctx.drayScrollPosRef.current;
        } else if (filterMode === 'all') {
            const timer = setTimeout(() => {
                const targetEl = container.querySelector(`[data-month="${ctx.currentMonthStr}"]`);
                if (targetEl) {
                    targetEl.scrollIntoView({ behavior: 'auto', block: 'start' });
                    ctx.drayScrollPosRef.current = container.scrollTop;
                }
            }, 100);
            return () => clearTimeout(timer);
        }

        const handleScroll = () => {
            if (container) {
                ctx.drayScrollPosRef.current = container.scrollTop;
            }
        };

        container.addEventListener('scroll', handleScroll);
        return () => {
            if (container) {
                ctx.drayScrollPosRef.current = container.scrollTop;
                container.removeEventListener('scroll', handleScroll);
            }
        };
    }, [filterMode, ctx.currentMonthStr, displayContainers.length]);

    const handleExecuteExport = () => {
        if (exportModal.type === 'print') {
            setTimeout(() => window.print(), 300);
            return;
        }

        const headers = ['管理番号', '進行状況', 'コンテナNO.', '積載型式', '外装箱', '化粧箱', 'ラベル', '割振数', '総数量', '到着港', 'ETD', 'ETA', 'フリータイム', '納品日', '納品時間', '納品先', '備考', 'コンテナサイズ', '本船名'];
        const rows = [];

        displayContainers.forEach(c => {
            const allocs = c.allocations || {};
            const allocModels = Object.keys(allocs).filter(m => allocs[m] > 0);

            if (allocModels.length === 0) {
                rows.push([c.managementNo || '-', c.status || '手配中', c.containerNo || '-', '-', 0, 0, 0, 0, 0, c.port || '-', c.etd || '-', c.eta || '-', c.freeTime || '-', c.drayageDeliveryDate || '-', c.drayageDeliveryTime || '-', c.drayageDestination || '-', c.drayageNotes || '', c.containerSize || c.size || '-', c.vessel || '-']);
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
                <h2 className="text-base font-extrabold text-emerald-900 border-b-2 border-emerald-600 pb-0.5">
                    吉井電気 ドレージ手配 [仕入先: {ctx.selectedVendorFilter || 'ALL'}]
                </h2>

                <div className="flex items-center gap-2 font-bold">
                    <button onClick={() => setExportModal({ isOpen: true, type: 'excel' })} className="px-2 py-1 text-xs font-bold rounded bg-emerald-700 hover:bg-emerald-800 text-white shadow transition flex items-center gap-1">📊 Excel出力</button>
                    <button onClick={() => setExportModal({ isOpen: true, type: 'print' })} className="px-2 py-1 text-xs font-bold rounded bg-slate-700 hover:bg-slate-800 text-white shadow transition flex items-center gap-1">🖨 印刷</button>
                    <button onClick={ctx.handleStartTracking} className={`px-2 py-1 text-xs font-bold rounded shadow transition ${ctx.isChangeTrackingMode ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}>{ctx.isChangeTrackingMode ? '● 変更記録中' : '変更開始'}</button>
                    <button onClick={ctx.handleClearTracking} className="px-2 py-1 text-xs font-bold rounded bg-gray-600 hover:bg-gray-700 text-white shadow transition">変更クリア</button>
                </div>
            </div>

            <ScheduleFilterSortControl 
                filterMode={filterMode} setFilterMode={setFilterMode}
                selectedYear={selectedYear} setSelectedYear={setSelectedYear}
                singleMonth={singleMonth} setSingleMonth={setSingleMonth}
                startMonth={startMonth} setStartMonth={setStartMonth}
                endMonth={endMonth} setEndMonth={setEndMonth}
                sortConfig={sortConfig} setSortConfig={setSortConfig}
            />

            <div className="table-container flex-grow border rounded shadow-inner overflow-x-auto overflow-y-auto" ref={ctx.tableContainerRef}>
                <table className="w-full text-center border-collapse text-[11px]">
                    <thead className="sticky top-0 z-30 bg-gray-200 font-bold shadow-sm">
                        <tr className="bg-gray-200 border-b">
                            <th className="p-1 border w-[65px] min-w-[65px] max-w-[65px]">管理番号</th>
                            <th className="p-1 border w-[70px] min-w-[70px] max-w-[70px]">進行状況</th>
                            <th className="p-1 border w-[90px] min-w-[90px] max-w-[90px]">コンテナNO.</th>
                            <th className="p-1 border w-[110px] min-w-[110px]">積載型式</th>
                            <th className="p-1 border bg-emerald-50 text-emerald-900" colSpan={3}>補充部品 (PCS)</th>
                            <th className="p-1 border w-[55px] min-w-[55px] max-w-[55px]">割振数</th>
                            <th className="p-1 border w-[65px] min-w-[65px] max-w-[65px] bg-emerald-100 font-extrabold text-emerald-900">総数量</th>
                            <th className="p-1 border w-[60px] min-w-[60px] max-w-[60px]">到着港</th>
                            <th className="p-1 border w-[70px] min-w-[70px] max-w-[70px]">ETD</th>
                            <th className="p-1 border w-[70px] min-w-[70px] max-w-[70px]">ETA</th>
                            <th className="p-1 border w-[75px] min-w-[75px] max-w-[75px]">フリータイム</th>
                            <th className="p-1 border bg-emerald-100/70 text-emerald-900" colSpan={2}>納品日時</th>
                            <th className="p-1 border w-[140px] min-w-[140px]">納品先</th>
                            <th className="p-1 border min-w-[120px]">備考</th>
                            <th className="p-1 border w-[55px] min-w-[55px] max-w-[55px]">サイズ</th>
                            <th className="p-1 border w-[120px] min-w-[120px]">本船名</th>
                        </tr>
                        <tr className="bg-emerald-50 text-[10px] font-bold border-b">
                            <td colSpan={4} className="border text-center bg-gray-100">補充部品 内訳詳細 →</td>
                            <td className="border w-[40px] min-w-[40px] max-w-[40px] text-emerald-800">外装箱</td>
                            <td className="border w-[40px] min-w-[40px] max-w-[40px] text-emerald-800">化粧箱</td>
                            <td className="border w-[40px] min-w-[40px] max-w-[40px] text-emerald-800">ラベル</td>
                            <td colSpan={5} className="border bg-gray-100"></td>
                            <td className="border w-[75px] min-w-[75px] max-w-[75px] text-emerald-900 bg-emerald-100/70">納品日</td>
                            <td className="border w-[65px] min-w-[65px] max-w-[65px] text-emerald-900 bg-emerald-100/70">時間</td>
                            <td colSpan={4} className="border bg-gray-100"></td>
                        </tr>
                    </thead>
                    <tbody>
                        {groupedRows.map((row, idx) => {
                            if (row.isDivider) {
                                const label = row.monthLabel === '未設定' ? '納品月 未設定' : `■ ${row.monthLabel.split('-')[0]}年${row.monthLabel.split('-')[1]}月 納品分`;
                                return (
                                    <tr key={`div-${idx}`} className="month-divider" data-month={row.monthLabel}>
                                        <td colSpan={19} className="bg-gray-200 font-bold text-left px-3 py-1.5 text-gray-800 border-y-2 border-gray-400 text-xs">
                                            {label}
                                        </td>
                                    </tr>
                                );
                            }

                            const container = row;
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
                                    <tr key={container.id || idx} className="hover:bg-gray-50 border-b h-[24px]">
                                        {/* ドレージ：固定表示項目（グレー背景） */}
                                        <td className="border font-bold readonly-cell">{container.managementNo || '-'}</td>
                                        <td className="border readonly-cell">
                                            <DynamicSelect value={container.status || '手配中'} originalValue={(container.originals || {}).status} originalMeta={(container.originalMetas || {}).status} onChange={(val, cat, orig) => ctx.handleSelectChange(container.id, 'status', true, 'yoshii', true, '進行状況')(val, cat, orig)} category="statuses" options={ctx.masterData.common.statuses} isCommon className="w-full text-center border-none bg-transparent"/>
                                        </td>

                                        {/* ドレージ：編集可能項目（白背景） */}
                                        <td className="border bg-white">
                                            <LocalInput value={container.containerNo || ''} originalValue={(container.originals || {}).containerNo} originalMeta={(container.originalMetas || {}).containerNo} onChange={(v, orig) => ctx.updateContainer(container.id, { containerNo: v }, container.deliveryMonth, 'yoshii', 'コンテナNO')} className="w-full text-center font-mono border-none bg-transparent"/>
                                        </td>
                                        <td className="border text-gray-400 font-normal bg-white">-</td>
                                        <td className="border text-gray-400 bg-white">0</td>
                                        <td className="border text-gray-400 bg-white">0</td>
                                        <td className="border text-gray-400 bg-white">0</td>

                                        {/* 割振数・総数量（固定表示） */}
                                        <td className="border font-bold readonly-cell">0</td>
                                        <td className="border font-extrabold bg-emerald-100 text-emerald-900 font-mono">0</td>

                                        {/* ドレージ：本船確定済みのため完全編集不可・閲覧専用（グレー背景） */}
                                        <td className="border readonly-cell">{container.port || '-'}</td>
                                        <td className="border readonly-cell">{container.etd || '-'}</td>
                                        <td className="border readonly-cell">{container.eta || '-'}</td>

                                        {/* ドレージ：国内陸送手配の編集可能項目（白背景） */}
                                        <td className="border bg-white">
                                            <LocalInput type="date" value={container.freeTime || ''} originalValue={(container.originals || {}).freeTime} originalMeta={(container.originalMetas || {}).freeTime} onChange={(v, orig) => ctx.updateContainer(container.id, { freeTime: v }, container.deliveryMonth, 'yoshii', 'フリータイム')} className="w-full text-center border-none bg-transparent"/>
                                        </td>
                                        <td className="border bg-white">
                                            <LocalInput type="date" value={container.drayageDeliveryDate || ''} originalValue={(container.originals || {}).drayageDeliveryDate} originalMeta={(container.originalMetas || {}).drayageDeliveryDate} onChange={(v, orig) => ctx.updateContainer(container.id, { drayageDeliveryDate: v }, container.deliveryMonth, 'yoshii', '納品日')} className="w-full text-center border-none bg-transparent"/>
                                        </td>
                                        <td className="border bg-white">
                                            <LocalInput type="time" value={container.drayageDeliveryTime || ''} originalValue={(container.originals || {}).drayageDeliveryTime} originalMeta={(container.originalMetas || {}).drayageDeliveryTime} onChange={(v, orig) => ctx.updateContainer(container.id, { drayageDeliveryTime: v }, container.deliveryMonth, 'yoshii', '時間')} className="w-full text-center border-none bg-transparent"/>
                                        </td>
                                        <td className="border bg-white">
                                            <DynamicSelect value={container.drayageDestination || ''} originalValue={(container.originals || {}).drayageDestination} originalMeta={(container.originalMetas || {}).drayageDestination} onChange={(val, cat, orig) => ctx.handleSelectChange(container.id, 'drayageDestination', true, 'yoshii', false, '納品先')(val, cat, orig)} category="destinations" options={ctx.masterData.yoshii.destinations} className="w-full text-center border-none bg-transparent"/>
                                        </td>
                                        <td className="border bg-white">
                                            <LocalTextArea value={container.drayageNotes || ''} originalValue={(container.originals || {}).drayageNotes} originalMeta={(container.originalMetas || {}).drayageNotes} onChange={(v, orig) => ctx.updateContainer(container.id, { drayageNotes: v }, container.deliveryMonth, 'yoshii', '備考')}/>
                                        </td>

                                        {/* ドレージ：本船確定済みのため完全編集不可・閲覧専用（グレー背景） */}
                                        <td className="border readonly-cell">{container.containerSize || container.size || '-'}</td>
                                        <td className="border readonly-cell">{container.vessel || '-'}</td>
                                    </tr>
                                );
                            }

                            return modelKeys.map((m, mIdx) => {
                                const qty = allocs[m] || 0;
                                const parts = container.spareParts?.[m] || {};

                                return (
                                    <tr key={`${container.id || idx}-${m}`} className="hover:bg-gray-50 border-b h-[24px]">
                                        {mIdx === 0 && (
                                            <>
                                                <td rowSpan={rowSpan} className="border font-bold readonly-cell align-middle">{container.managementNo || '-'}</td>
                                                <td rowSpan={rowSpan} className="border readonly-cell align-middle">
                                                    <DynamicSelect value={container.status || '手配中'} originalValue={(container.originals || {}).status} originalMeta={(container.originalMetas || {}).status} onChange={(val, cat, orig) => ctx.handleSelectChange(container.id, 'status', true, 'yoshii', true, '進行状況')(val, cat, orig)} category="statuses" options={ctx.masterData.common.statuses} isCommon className="w-full text-center border-none bg-transparent"/>
                                                </td>
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">
                                                    <LocalInput value={container.containerNo || ''} originalValue={(container.originals || {}).containerNo} originalMeta={(container.originalMetas || {}).containerNo} onChange={(v, orig) => ctx.updateContainer(container.id, { containerNo: v }, container.deliveryMonth, 'yoshii', 'コンテナNO')} className="w-full text-center font-mono border-none bg-transparent"/>
                                                </td>
                                            </>
                                        )}

                                        <td className="border font-bold text-left pl-1 bg-white">{m}</td>
                                        <td className="border w-[40px] min-w-[40px] max-w-[40px] bg-white">
                                            <LocalInput type="number" value={parts.outerBox !== undefined ? parts.outerBox : ''} onChange={(v) => {
                                                const newParts = { ...(container.spareParts || {}), [m]: { ...(container.spareParts?.[m] || {}), outerBox: v === '' ? 0 : Number(v) } };
                                                ctx.updateContainer(container.id, { spareParts: newParts }, container.deliveryMonth, 'yoshii', `型式 [${m}] 外装箱`);
                                            }} className="w-full text-right pr-1 border-none bg-transparent font-normal"/>
                                        </td>
                                        <td className="border w-[40px] min-w-[40px] max-w-[40px] bg-white">
                                            <LocalInput type="number" value={parts.innerBox !== undefined ? parts.innerBox : ''} onChange={(v) => {
                                                const newParts = { ...(container.spareParts || {}), [m]: { ...(container.spareParts?.[m] || {}), innerBox: v === '' ? 0 : Number(v) } };
                                                ctx.updateContainer(container.id, { spareParts: newParts }, container.deliveryMonth, 'yoshii', `型式 [${m}] 化粧箱`);
                                            }} className="w-full text-right pr-1 border-none bg-transparent font-normal"/>
                                        </td>
                                        <td className="border w-[40px] min-w-[40px] max-w-[40px] bg-white">
                                            <LocalInput type="number" value={parts.label !== undefined ? parts.label : ''} onChange={(v) => {
                                                const newParts = { ...(container.spareParts || {}), [m]: { ...(container.spareParts?.[m] || {}), label: v === '' ? 0 : Number(v) } };
                                                ctx.updateContainer(container.id, { spareParts: newParts }, container.deliveryMonth, 'yoshii', `型式 [${m}] ラベル`);
                                            }} className="w-full text-right pr-1 border-none bg-transparent font-normal"/>
                                        </td>
                                        <td className="border text-right pr-1 font-bold text-emerald-800 font-mono bg-white">{qty.toLocaleString()}</td>

                                        {mIdx === 0 && (
                                            <>
                                                <td rowSpan={rowSpan} className="border font-extrabold bg-emerald-100 text-emerald-900 text-right pr-1 align-middle font-mono">{totalQty.toLocaleString()}</td>
                                                
                                                {/* ドレージ：本船確定済みのため完全編集不可・閲覧専用（グレー背景） */}
                                                <td rowSpan={rowSpan} className="border readonly-cell align-middle">{container.port || '-'}</td>
                                                <td rowSpan={rowSpan} className="border readonly-cell align-middle">{container.etd || '-'}</td>
                                                <td rowSpan={rowSpan} className="border readonly-cell align-middle">{container.eta || '-'}</td>

                                                {/* ドレージ：国内陸送手配の編集可能項目（白背景） */}
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">
                                                    <LocalInput type="date" value={container.freeTime || ''} originalValue={(container.originals || {}).freeTime} originalMeta={(container.originalMetas || {}).freeTime} onChange={(v, orig) => ctx.updateContainer(container.id, { freeTime: v }, container.deliveryMonth, 'yoshii', 'フリータイム')} className="w-full text-center border-none bg-transparent"/>
                                                </td>
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">
                                                    <LocalInput type="date" value={container.drayageDeliveryDate || ''} originalValue={(container.originals || {}).drayageDeliveryDate} originalMeta={(container.originalMetas || {}).drayageDeliveryDate} onChange={(v, orig) => ctx.updateContainer(container.id, { drayageDeliveryDate: v }, container.deliveryMonth, 'yoshii', '納品日')} className="w-full text-center border-none bg-transparent"/>
                                                </td>
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">
                                                    <LocalInput type="time" value={container.drayageDeliveryTime || ''} originalValue={(container.originals || {}).drayageDeliveryTime} originalMeta={(container.originalMetas || {}).drayageDeliveryTime} onChange={(v, orig) => ctx.updateContainer(container.id, { drayageDeliveryTime: v }, container.deliveryMonth, 'yoshii', '時間')} className="w-full text-center border-none bg-transparent"/>
                                                </td>
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">
                                                    <DynamicSelect value={container.drayageDestination || ''} originalValue={(container.originals || {}).drayageDestination} originalMeta={(container.originalMetas || {}).drayageDestination} onChange={(val, cat, orig) => ctx.handleSelectChange(container.id, 'drayageDestination', true, 'yoshii', false, '納品先')(val, cat, orig)} category="destinations" options={ctx.masterData.yoshii.destinations} className="w-full text-center border-none bg-transparent"/>
                                                </td>
                                                <td rowSpan={rowSpan} className="border bg-white align-middle">
                                                    <LocalTextArea value={container.drayageNotes || ''} originalValue={(container.originals || {}).drayageNotes} originalMeta={(container.originalMetas || {}).drayageNotes} onChange={(v, orig) => ctx.updateContainer(container.id, { drayageNotes: v }, container.deliveryMonth, 'yoshii', '備考')}/>
                                                </td>

                                                {/* ドレージ：本船確定済みのため完全編集不可・閲覧専用（グレー背景） */}
                                                <td rowSpan={rowSpan} className="border readonly-cell align-middle">{container.containerSize || container.size || '-'}</td>
                                                <td rowSpan={rowSpan} className="border readonly-cell align-middle">{container.vessel || '-'}</td>
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