// =========================================================
// shipping_views_ship.js - 出荷日程・ドレージ画面モジュール (WebVer. 115 列構造完全修復版)
// =========================================================

// 【出荷日程表ビュー】
const YoshiiShipView = () => {
    const ctx = React.useContext(AppContext);
    const [exportModal, setExportModal] = React.useState({ isOpen: false, type: 'excel' });

    const [filterMode, setFilterMode] = React.useState('all');
    const [selectedYear, setSelectedYear] = React.useState(2026);
    const [singleMonth, setSingleMonth] = React.useState('2026-10');
    const [startMonth, setStartMonth] = React.useState('2026-04');
    const [endMonth, setEndMonth] = React.useState('2027-03');
    const [sortConfig, setSortConfig] = React.useState([]);

    const handleExecuteExport = ({ mode, selectedYear: selYr, singleMonth: sgMo, startMonth: sMo, endMonth: eMo }) => {
        const targetVendor = ctx.selectedVendorFilter || 'ALL';
        if (exportModal.type === 'print') {
            setTimeout(() => window.print(), 300);
            return;
        }

        const headers = [
            '管理番号', '進行状況', 'コンテナNO.', '積載型式',
            '補充部品_外装箱', '補充部品_化粧箱', '補充部品_ラベル',
            '割振数', '総数量', '到着港', 'ETD', 'ETA', 'サイズ', '本船名', '備考'
        ];

        const rows = [];
        groupedContainers.forEach(grp => {
            rows.push([`■ ${grp.label}`]);
            grp.items.forEach(c => {
                const allocMap = c.allocations || {};
                const models = Object.keys(allocMap).filter(m => allocMap[m] > 0);
                const firstModel = models[0] || '';

                rows.push([
                    c.managementNo || '', c.status || '', c.containerNo || '', firstModel,
                    c.sparePart1 || '', c.sparePart2 || '', c.sparePart3 || '',
                    allocMap[firstModel] || '', c.totalQuantity || '', c.port || '',
                    c.etd || '', c.eta || '', c.containerSize || '', c.vesselName || '', c.notes || ''
                ]);

                for (let i = 1; i < models.length; i++) {
                    const m = models[i];
                    rows.push([
                        '', '', '', m,
                        '', '', '',
                        allocMap[m] || '', '', '',
                        '', '', '', '', ''
                    ]);
                }
            });
        });

        const dateTag = mode === 'current' ? formatYYMM(ctx.currentMonthStr) : mode === 'year' ? `${selYr}年度` : mode === 'single' ? formatYYMM(sgMo) : `${formatYYMM(sMo)}_${formatYYMM(eMo)}`;
        const filename = `${targetVendor}_出荷日程表_${dateTag}.xlsx`;

        exportToExcelSimple({
            title: `吉井電気 出荷日程表 [仕入先: ${targetVendor}] [期間: ${dateTag}]`,
            headers, rows, filename
        });
    };

    let rawContainers = ctx.containers.filter(c => c.company === 'yoshii');

    if (ctx.selectedVendorFilter && ctx.selectedVendorFilter !== 'ALL') {
        rawContainers = rawContainers.filter(c => {
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

    if (filterMode === 'current') {
        rawContainers = rawContainers.filter(c => c.deliveryMonth === ctx.currentMonthStr);
    } else if (filterMode === 'year') {
        rawContainers = rawContainers.filter(c => {
            if (!c.deliveryMonth) return false;
            const yr = Number(c.deliveryMonth.split('-')[0]);
            const mo = Number(c.deliveryMonth.split('-')[1]);
            const fiscalYr = mo >= 4 ? yr : yr - 1;
            return fiscalYr === selectedYear;
        });
    } else if (filterMode === 'month') {
        rawContainers = rawContainers.filter(c => c.deliveryMonth === singleMonth);
    } else if (filterMode === 'range') {
        rawContainers = rawContainers.filter(c => c.deliveryMonth >= startMonth && c.deliveryMonth <= endMonth);
    }

    const groupsMap = {};
    rawContainers.forEach(c => {
        const mo = c.deliveryMonth || '未設定';
        if (!groupsMap[mo]) groupsMap[mo] = [];
        groupsMap[mo].push(c);
    });

    const sortedMonths = Object.keys(groupsMap).sort();
    const groupedContainers = sortedMonths.map(mo => {
        const parts = mo.split('-');
        const label = parts.length === 2 ? `${parts[0]}年${parts[1]}月 納品分` : mo;
        return { monthKey: mo, label, items: groupsMap[mo] };
    });

    return (
        <div className="p-3 bg-white flex-grow flex flex-col h-full overflow-hidden">
            <div className="hidden print:block font-bold text-sm text-black mb-1 border-b pb-1 text-left w-full">
                吉井電気 出荷日程表 [仕入先: {ctx.selectedVendorFilter || 'ALL'}]
            </div>

            <div className="flex justify-between items-center mb-2 no-print flex-shrink-0">
                <h2 className="text-base font-bold text-emerald-900">吉井電気 出荷日程表 [仕入先: {ctx.selectedVendorFilter || 'ALL'}]</h2>
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
                    <thead className="sticky top-0 z-30 bg-gray-200 font-bold">
                        <tr>
                            <th className="p-1 border min-w-[70px]">管理番号</th>
                            <th className="p-1 border min-w-[70px]">進行状況</th>
                            <th className="p-1 border min-w-[90px]">コンテナNO.</th>
                            <th className="p-1 border min-w-[110px]">積載型式</th>
                            <th className="p-0.5 border min-w-[100px] bg-emerald-50 text-emerald-900" colSpan={3}>補充部品 (PCS)</th>
                            <th className="p-1 border min-w-[60px]">割振数</th>
                            <th className="p-1 border min-w-[65px]">総数量</th>
                            <th className="p-1 border min-w-[65px]">到着港</th>
                            <th className="p-1 border min-w-[75px]">ETD</th>
                            <th className="p-1 border min-w-[75px]">ETA</th>
                            <th className="p-1 border min-w-[60px]">サイズ</th>
                            <th className="p-1 border min-w-[110px]">本船名</th>
                            <th className="p-1 border min-w-[150px]">備考</th>
                        </tr>
                        <tr className="bg-gray-100 text-[10px]">
                            <td className="p-0.5 border" colSpan={4}>補充部品 内訳詳細 →</td>
                            <td className="p-0.5 border text-emerald-800 font-bold bg-emerald-50">外装箱</td>
                            <td className="p-0.5 border text-emerald-800 font-bold bg-emerald-50">化粧箱</td>
                            <td className="p-0.5 border text-emerald-800 font-bold bg-emerald-50">ラベル</td>
                            <td className="p-0.5 border" colSpan={8}></td>
                        </tr>
                    </thead>
                    <tbody>
                        {groupedContainers.map(grp => (
                            <React.Fragment key={grp.monthKey}>
                                <tr className="month-divider">
                                    <td colSpan={15} className="font-bold text-left bg-gray-200 px-2 py-1 text-xs">
                                        ■ {grp.label}
                                    </td>
                                </tr>
                                {grp.items.map(c => {
                                    const allocMap = c.allocations || {};
                                    const activeModels = Object.keys(allocMap).filter(m => allocMap[m] > 0);
                                    const rowSpan = Math.max(1, activeModels.length);
                                    const firstModel = activeModels[0] || '';

                                    return (
                                        <React.Fragment key={c.id}>
                                            <tr className="hover:bg-emerald-50 border-b">
                                                <td rowSpan={rowSpan} className="p-0.5 border align-middle bg-white font-bold">
                                                    <LocalInput value={c.managementNo || ''} originalValue={c.originals?.managementNo} originalMeta={c.originalMetas?.managementNo} onChange={(v, orig) => ctx.updateContainer(c.id, { managementNo: v }, c.deliveryMonth, 'yoshii', '管理番号')} className="text-center font-bold"/>
                                                </td>
                                                <td rowSpan={rowSpan} className="p-0.5 border align-middle bg-white">
                                                    <DynamicSelect value={c.status || ''} originalValue={c.originals?.status} originalMeta={c.originalMetas?.status} onChange={(v, cat, orig) => ctx.handleSelectChange(c.id, 'status', true, 'yoshii', true, '進行状況')(v, cat, orig)} category="statuses" options={ctx.masterData.common.statuses}/>
                                                </td>
                                                <td rowSpan={rowSpan} className="p-0.5 border align-middle bg-white font-mono">
                                                    <LocalInput value={c.containerNo || ''} originalValue={c.originals?.containerNo} originalMeta={c.originalMetas?.containerNo} onChange={(v, orig) => ctx.updateContainer(c.id, { containerNo: v }, c.deliveryMonth, 'yoshii', 'コンテナNO.')} className="text-center font-mono"/>
                                                </td>

                                                <td className="p-0.5 border text-left font-bold pl-1 bg-white">
                                                    {firstModel}
                                                </td>

                                                <td rowSpan={rowSpan} className="p-0.5 border align-middle bg-white">
                                                    <input type="text" value={c.sparePart1 || ''} onChange={e => ctx.updateContainer(c.id, { sparePart1: e.target.value }, c.deliveryMonth, 'yoshii', '補充部品 外装箱')} className="spare-part-input"/>
                                                </td>
                                                <td rowSpan={rowSpan} className="p-0.5 border align-middle bg-white">
                                                    <input type="text" value={c.sparePart2 || ''} onChange={e => ctx.updateContainer(c.id, { sparePart2: e.target.value }, c.deliveryMonth, 'yoshii', '補充部品 化粧箱')} className="spare-part-input"/>
                                                </td>
                                                <td rowSpan={rowSpan} className="p-0.5 border align-middle bg-white">
                                                    <input type="text" value={c.sparePart3 || ''} onChange={e => ctx.updateContainer(c.id, { sparePart3: e.target.value }, c.deliveryMonth, 'yoshii', '補充部品 ラベル')} className="spare-part-input"/>
                                                </td>

                                                <td className="p-0.5 border text-right pr-1 font-bold text-emerald-800 bg-white">
                                                    <LocalInput type="number" value={allocMap[firstModel] || ''} originalValue={(c.originals?.allocations || {})[firstModel]} originalMeta={(c.originalMetas?.allocations || {})[firstModel]} onChange={(v, orig) => {
                                                        const updated = { ...(c.allocations || {}), [firstModel]: Number(v) || 0 };
                                                        ctx.updateContainer(c.id, { allocations: updated }, c.deliveryMonth, 'yoshii', '割振数');
                                                    }} className="text-right font-bold text-emerald-800"/>
                                                </td>

                                                <td rowSpan={rowSpan} className="p-0.5 border align-middle text-right pr-1 font-extrabold text-gray-800 readonly-cell">
                                                    {c.totalQuantity ? Number(c.totalQuantity).toLocaleString() : '0'}
                                                </td>

                                                <td rowSpan={rowSpan} className="p-0.5 border align-middle bg-white">
                                                    <DynamicSelect value={c.port || ''} originalValue={c.originals?.port} originalMeta={c.originalMetas?.port} onChange={(v, cat, orig) => ctx.handleSelectChange(c.id, 'port', true, 'yoshii', true, '到着港')(v, cat, orig)} category="ports" options={ctx.masterData.yoshii.ports}/>
                                                </td>
                                                <td rowSpan={rowSpan} className="p-0.5 border align-middle bg-white">
                                                    <LocalInput type="date" value={c.etd || ''} originalValue={c.originals?.etd} originalMeta={c.originalMetas?.etd} onChange={(v, orig) => ctx.updateContainer(c.id, { etd: v }, c.deliveryMonth, 'yoshii', 'ETD')}/>
                                                </td>
                                                <td rowSpan={rowSpan} className="p-0.5 border align-middle bg-white">
                                                    <LocalInput type="date" value={c.eta || ''} originalValue={c.originals?.eta} originalMeta={c.originalMetas?.eta} onChange={(v, orig) => ctx.updateContainer(c.id, { eta: v }, c.deliveryMonth, 'yoshii', 'ETA')}/>
                                                </td>
                                                <td rowSpan={rowSpan} className="p-0.5 border align-middle bg-white">
                                                    <DynamicSelect value={c.containerSize || ''} originalValue={c.originals?.containerSize} originalMeta={c.originalMetas?.containerSize} onChange={(v, cat, orig) => ctx.handleSelectChange(c.id, 'containerSize', true, 'yoshii', true, 'サイズ')(v, cat, orig)} category="containerSizes" options={ctx.masterData.common.containerSizes}/>
                                                </td>
                                                <td rowSpan={rowSpan} className="p-0.5 border align-middle bg-white">
                                                    <LocalInput value={c.vesselName || ''} originalValue={c.originals?.vesselName} originalMeta={c.originalMetas?.vesselName} onChange={(v, orig) => ctx.updateContainer(c.id, { vesselName: v }, c.deliveryMonth, 'yoshii', '本船名')}/>
                                                </td>
                                                <td rowSpan={rowSpan} className="p-0.5 border align-middle bg-white text-left">
                                                    <LocalTextArea value={c.notes || ''} originalValue={c.originals?.notes} originalMeta={c.originalMetas?.notes} onChange={(v, orig) => ctx.updateContainer(c.id, { notes: v }, c.deliveryMonth, 'yoshii', '備考')}/>
                                                </td>
                                            </tr>

                                            {activeModels.slice(1).map(m => (
                                                <tr key={m} className="hover:bg-emerald-50 border-b">
                                                    <td className="p-0.5 border text-left font-bold pl-1 bg-white">{m}</td>
                                                    <td className="p-0.5 border text-right pr-1 font-bold text-emerald-800 bg-white">
                                                        <LocalInput type="number" value={allocMap[m] || ''} originalValue={(c.originals?.allocations || {})[m]} originalMeta={(c.originalMetas?.allocations || {})[m]} onChange={(v, orig) => {
                                                            const updated = { ...(c.allocations || {}), [m]: Number(v) || 0 };
                                                            ctx.updateContainer(c.id, { allocations: updated }, c.deliveryMonth, 'yoshii', '割振数');
                                                        }} className="text-right font-bold text-emerald-800"/>
                                                    </td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            <ExportPrintModal isOpen={exportModal.isOpen} onClose={() => setExportModal({ isOpen: false, type: 'excel' })} screenName="出荷日程表" currentMonthStr={ctx.currentMonthStr} defaultMode="year" onStartExport={handleExecuteExport} />
        </div>
    );
};

// 【ドレージ手配画面ビュー - 列数完全一致・構造整合版】
const YoshiiDrayageView = () => {
    const ctx = React.useContext(AppContext);
    const [exportModal, setExportModal] = React.useState({ isOpen: false, type: 'excel' });

    const [filterMode, setFilterMode] = React.useState('all');
    const [selectedYear, setSelectedYear] = React.useState(2026);
    const [singleMonth, setSingleMonth] = React.useState('2026-10');
    const [startMonth, setStartMonth] = React.useState('2026-04');
    const [endMonth, setEndMonth] = React.useState('2027-03');
    const [sortConfig, setSortConfig] = React.useState([]);

    const handleExecuteExport = ({ mode, selectedYear: selYr, singleMonth: sgMo, startMonth: sMo, endMonth: eMo }) => {
        const targetVendor = ctx.selectedVendorFilter || 'ALL';
        if (exportModal.type === 'print') {
            setTimeout(() => window.print(), 300);
            return;
        }

        const headers = [
            '管理番号', '進行状況', 'コンテナNO.', '積載型式',
            '補充部品_外装箱', '補充部品_化粧箱', '補充部品_ラベル',
            '割振数', '総数量', '到着港', 'ETD', 'ETA', 'フリータイム',
            '納品日', '納品時間', '納品先', '備考', 'サイズ', '本船名'
        ];

        const rows = [];
        groupedContainers.forEach(grp => {
            rows.push([`■ ${grp.label}`]);
            grp.items.forEach(c => {
                const allocMap = c.allocations || {};
                const models = Object.keys(allocMap).filter(m => allocMap[m] > 0);
                const firstModel = models[0] || '';

                rows.push([
                    c.managementNo || '', c.status || '', c.containerNo || '', firstModel,
                    c.sparePart1 || '', c.sparePart2 || '', c.sparePart3 || '',
                    allocMap[firstModel] || '', c.totalQuantity || '', c.port || '',
                    c.etd || '', c.eta || '', c.freeTime || '',
                    c.deliveryDate || '', c.deliveryTime || '', c.destination || '', c.notes || '',
                    c.containerSize || '', c.vesselName || ''
                ]);

                for (let i = 1; i < models.length; i++) {
                    const m = models[i];
                    rows.push([
                        '', '', '', m,
                        '', '', '',
                        allocMap[m] || '', '', '',
                        '', '', '',
                        '', '', '', '', '', ''
                    ]);
                }
            });
        });

        const dateTag = mode === 'current' ? formatYYMM(ctx.currentMonthStr) : mode === 'year' ? `${selYr}年度` : mode === 'single' ? formatYYMM(sgMo) : `${formatYYMM(sMo)}_${formatYYMM(eMo)}`;
        const filename = `${targetVendor}_ドレージ手配_${dateTag}.xlsx`;

        exportToExcelSimple({
            title: `吉井電気 ドレージ手配 [仕入先: ${targetVendor}] [期間: ${dateTag}]`,
            headers, rows, filename
        });
    };

    let rawContainers = ctx.containers.filter(c => c.company === 'yoshii');

    if (ctx.selectedVendorFilter && ctx.selectedVendorFilter !== 'ALL') {
        rawContainers = rawContainers.filter(c => {
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

    if (filterMode === 'current') {
        rawContainers = rawContainers.filter(c => c.deliveryMonth === ctx.currentMonthStr);
    } else if (filterMode === 'year') {
        rawContainers = rawContainers.filter(c => {
            if (!c.deliveryMonth) return false;
            const yr = Number(c.deliveryMonth.split('-')[0]);
            const mo = Number(c.deliveryMonth.split('-')[1]);
            const fiscalYr = mo >= 4 ? yr : yr - 1;
            return fiscalYr === selectedYear;
        });
    } else if (filterMode === 'month') {
        rawContainers = rawContainers.filter(c => c.deliveryMonth === singleMonth);
    } else if (filterMode === 'range') {
        rawContainers = rawContainers.filter(c => c.deliveryMonth >= startMonth && c.deliveryMonth <= endMonth);
    }

    const groupsMap = {};
    rawContainers.forEach(c => {
        const mo = c.deliveryMonth || '未設定';
        if (!groupsMap[mo]) groupsMap[mo] = [];
        groupsMap[mo].push(c);
    });

    const sortedMonths = Object.keys(groupsMap).sort();
    const groupedContainers = sortedMonths.map(mo => {
        const parts = mo.split('-');
        const label = parts.length === 2 ? `${parts[0]}年${parts[1]}月 納品分` : mo;
        return { monthKey: mo, label, items: groupsMap[mo] };
    });

    return (
        <div className="p-3 bg-white flex-grow flex flex-col h-full overflow-hidden">
            <div className="hidden print:block font-bold text-sm text-black mb-1 border-b pb-1 text-left w-full">
                吉井電気 ドレージ手配 [仕入先: {ctx.selectedVendorFilter || 'ALL'}]
            </div>

            <div className="flex justify-between items-center mb-2 no-print flex-shrink-0">
                <h2 className="text-base font-bold text-emerald-900">吉井電気 ドレージ手配 [仕入先: {ctx.selectedVendorFilter || 'ALL'}]</h2>
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
                    <thead className="sticky top-0 z-30 bg-gray-200 font-bold">
                        {/* 1行目ヘッダー：19項目（rowSpan={2}で単独項目を縦に結合） */}
                        <tr>
                            <th className="p-1 border min-w-[70px]" rowSpan={2}>管理番号</th>
                            <th className="p-1 border min-w-[70px]" rowSpan={2}>進行状況</th>
                            <th className="p-1 border min-w-[90px]" rowSpan={2}>コンテナNO.</th>
                            <th className="p-1 border min-w-[110px]" rowSpan={2}>積載型式</th>
                            <th className="p-0.5 border min-w-[100px] bg-emerald-50 text-emerald-900" colSpan={3}>補充部品 (PCS)</th>
                            <th className="p-1 border min-w-[60px]" rowSpan={2}>割振数</th>
                            <th className="p-1 border min-w-[65px]" rowSpan={2}>総数量</th>
                            <th className="p-1 border min-w-[65px]" rowSpan={2}>到着港</th>
                            <th className="p-1 border min-w-[75px]" rowSpan={2}>ETD</th>
                            <th className="p-1 border min-w-[75px]" rowSpan={2}>ETA</th>
                            <th className="p-1 border min-w-[70px]" rowSpan={2}>フリータイム</th>
                            <th className="p-0.5 border min-w-[140px] bg-emerald-50 text-emerald-900" colSpan={2}>納品日時</th>
                            <th className="p-1 border min-w-[130px]" rowSpan={2}>納品先</th>
                            <th className="p-1 border min-w-[140px]" rowSpan={2}>備考</th>
                            <th className="p-1 border min-w-[60px]" rowSpan={2}>サイズ</th>
                            <th className="p-1 border min-w-[110px]" rowSpan={2}>本船名</th>
                        </tr>
                        {/* 2行目サブヘッダー：結合されているグループ下のみサブ項目を配置 */}
                        <tr className="bg-gray-100 text-[10px]">
                            <th className="p-0.5 border text-emerald-800 font-bold bg-emerald-50">外装箱</th>
                            <th className="p-0.5 border text-emerald-800 font-bold bg-emerald-50">化粧箱</th>
                            <th className="p-0.5 border text-emerald-800 font-bold bg-emerald-50">ラベル</th>
                            <th className="p-0.5 border text-emerald-800 font-bold bg-emerald-50">納品日</th>
                            <th className="p-0.5 border text-emerald-800 font-bold bg-emerald-50">時間</th>
                        </tr>
                    </thead>
                    <tbody>
                        {groupedContainers.map(grp => (
                            <React.Fragment key={grp.monthKey}>
                                <tr className="month-divider">
                                    <td colSpan={19} className="font-bold text-left bg-gray-200 px-2 py-1 text-xs">
                                        ■ {grp.label}
                                    </td>
                                </tr>
                                {grp.items.map(c => {
                                    const allocMap = c.allocations || {};
                                    const activeModels = Object.keys(allocMap).filter(m => allocMap[m] > 0);
                                    const rowSpan = Math.max(1, activeModels.length);
                                    const firstModel = activeModels[0] || '';

                                    return (
                                        <React.Fragment key={c.id}>
                                            <tr className="hover:bg-emerald-50 border-b">
                                                <td rowSpan={rowSpan} className="p-0.5 border align-middle font-bold readonly-cell">{c.managementNo || '-'}</td>
                                                <td rowSpan={rowSpan} className="p-0.5 border align-middle readonly-cell">{c.status || '-'}</td>
                                                <td rowSpan={rowSpan} className="p-0.5 border align-middle font-mono readonly-cell">{c.containerNo || '-'}</td>
                                                <td className="p-0.5 border text-left font-bold pl-1 readonly-cell">{firstModel || '-'}</td>
                                                <td rowSpan={rowSpan} className="p-0.5 border align-middle readonly-cell">{c.sparePart1 || '0'}</td>
                                                <td rowSpan={rowSpan} className="p-0.5 border align-middle readonly-cell">{c.sparePart2 || '0'}</td>
                                                <td rowSpan={rowSpan} className="p-0.5 border align-middle readonly-cell">{c.sparePart3 || '0'}</td>
                                                <td className="p-0.5 border text-right pr-1 font-bold text-gray-800 readonly-cell">{allocMap[firstModel] ? Number(allocMap[firstModel]).toLocaleString() : '0'}</td>
                                                <td rowSpan={rowSpan} className="p-0.5 border align-middle text-right pr-1 font-extrabold text-gray-800 readonly-cell">{c.totalQuantity ? Number(c.totalQuantity).toLocaleString() : '0'}</td>
                                                <td rowSpan={rowSpan} className="p-0.5 border align-middle readonly-cell">{c.port || '-'}</td>
                                                <td rowSpan={rowSpan} className="p-0.5 border align-middle readonly-cell">{c.etd || '-'}</td>
                                                <td rowSpan={rowSpan} className="p-0.5 border align-middle readonly-cell">{c.eta || '-'}</td>

                                                {/* フリータイム（白背景・編集可） */}
                                                <td rowSpan={rowSpan} className="p-0.5 border align-middle bg-white">
                                                    <LocalInput value={c.freeTime || ''} originalValue={c.originals?.freeTime} originalMeta={c.originalMetas?.freeTime} onChange={(v, orig) => ctx.updateContainer(c.id, { freeTime: v }, c.deliveryMonth, 'yoshii', 'フリータイム')}/>
                                                </td>

                                                {/* 納品日・納品時間（白背景・編集可） */}
                                                <td rowSpan={rowSpan} className="p-0.5 border align-middle bg-white">
                                                    <LocalInput type="date" value={c.deliveryDate || ''} originalValue={c.originals?.deliveryDate} originalMeta={c.originalMetas?.deliveryDate} onChange={(v, orig) => ctx.updateContainer(c.id, { deliveryDate: v }, c.deliveryMonth, 'yoshii', '納品日')}/>
                                                </td>
                                                <td rowSpan={rowSpan} className="p-0.5 border align-middle bg-white">
                                                    <input type="time" value={c.deliveryTime || ''} onChange={e => ctx.updateContainer(c.id, { deliveryTime: e.target.value }, c.deliveryMonth, 'yoshii', '納品時間')} className="cell-input text-center"/>
                                                </td>

                                                {/* 納品先・備考（白背景・編集可） */}
                                                <td rowSpan={rowSpan} className="p-0.5 border align-middle bg-white">
                                                    <DynamicSelect value={c.destination || ''} originalValue={c.originals?.destination} originalMeta={c.originalMetas?.destination} onChange={(v, cat, orig) => ctx.handleSelectChange(c.id, 'destination', true, 'yoshii', true, '納品先')(v, cat, orig)} category="destinations" options={ctx.masterData.yoshii.destinations}/>
                                                </td>
                                                <td rowSpan={rowSpan} className="p-0.5 border align-middle bg-white text-left">
                                                    <LocalTextArea value={c.notes || ''} originalValue={c.originals?.notes} originalMeta={c.originalMetas?.notes} onChange={(v, orig) => ctx.updateContainer(c.id, { notes: v }, c.deliveryMonth, 'yoshii', '備考')}/>
                                                </td>

                                                {/* サイズ・本船名（グレー背景 readonly-cell・完全編集不可） */}
                                                <td rowSpan={rowSpan} className="p-0.5 border align-middle readonly-cell">{c.containerSize || '-'}</td>
                                                <td rowSpan={rowSpan} className="p-0.5 border align-middle readonly-cell">{c.vesselName || '-'}</td>
                                            </tr>

                                            {activeModels.slice(1).map(m => (
                                                <tr key={m} className="hover:bg-emerald-50 border-b">
                                                    <td className="p-0.5 border text-left font-bold pl-1 readonly-cell">{m}</td>
                                                    <td className="p-0.5 border text-right pr-1 font-bold text-gray-800 readonly-cell">{allocMap[m] ? Number(allocMap[m]).toLocaleString() : '0'}</td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            <ExportPrintModal isOpen={exportModal.isOpen} onClose={() => setExportModal({ isOpen: false, type: 'excel' })} screenName="ドレージ手配" currentMonthStr={ctx.currentMonthStr} defaultMode="year" onStartExport={handleExecuteExport} />
        </div>
    );
};