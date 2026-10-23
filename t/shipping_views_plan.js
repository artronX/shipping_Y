// shipping_views_plan.js
// =========================================================
// shipping_views_plan.js - 計画・手配画面モジュール
// ★ WebVer. 123 対応 / _js040 計画画面「入数」項目の新設
// ★ 最上行ファイル名識別コメント保持 (// shipping_views_plan.js)
// ★ 1. 「入数(qtyPerCarton)」列を追加（型式の右、幅45px）。
// ★ 2. レイアウト維持のため、仕入先(-20px)と備考(-25px)の幅を調整し横スクロールなしを維持。
// =========================================================

const JS_PLAN_VERSION = '_js040';

// 【吉井電気 計画画面ビュー (YoshiiPlanView)】
const YoshiiPlanView = () => {
    const ctx = React.useContext(AppContext);
    const [exportModal, setExportModal] = React.useState({ isOpen: false, type: 'excel' });

    const baseAppVer = typeof SYSTEM_VERSION !== 'undefined' ? SYSTEM_VERSION : '';
    const cmpVer = typeof JS_COMPONENTS_VERSION !== 'undefined' ? JS_COMPONENTS_VERSION : '';
    const displayVer = `${baseAppVer}${JS_PLAN_VERSION}${cmpVer}`;

    const [displayMode, setDisplayMode] = React.useState('year');
    const [selectedYear, setSelectedYear] = React.useState(() => {
        if (!ctx.currentMonthStr) return new Date().getFullYear();
        const parts = ctx.currentMonthStr.split('-');
        if (parts.length !== 2) return new Date().getFullYear();
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        return month <= 3 ? year - 1 : year;
    });
    const [selectedSingleMonth, setSelectedSingleMonth] = React.useState(ctx.currentMonthStr || '2026-10');
    const [rangeStartMonth, setRangeStartMonth] = React.useState('2026-04');
    const [rangeEndMonth, setRangeEndMonth] = React.useState('2027-03');

    const isInitialScrolledRef = React.useRef(false);

    React.useLayoutEffect(() => {
        if (ctx.tableContainerRef.current) {
            if (ctx.planScrollPosRef.current !== null && ctx.planScrollPosRef.current > 0) {
                ctx.tableContainerRef.current.scrollTop = ctx.planScrollPosRef.current;
            } else if (!isInitialScrolledRef.current && ctx.currentMonthStr) {
                setTimeout(() => {
                    const container = ctx.tableContainerRef.current;
                    const targetHeader = document.getElementById(`plan-month-hdr-${ctx.currentMonthStr}`);
                    if (container && targetHeader) {
                        const headerOffset = 28;
                        container.scrollTop = targetHeader.offsetTop - headerOffset;
                        isInitialScrolledRef.current = true;
                    }
                }, 150);
            }
        }
    }, [ctx.currentMonthStr, displayMode, selectedYear, selectedSingleMonth]);

    const handleScroll = (e) => {
        ctx.planScrollPosRef.current = e.target.scrollTop;
    };

    let rawPlans = [...ctx.plans].filter(p => p.company === 'yoshii');

    if (displayMode === 'current') {
        rawPlans = rawPlans.filter(p => p.deliveryMonth === ctx.currentMonthStr);
    } else if (displayMode === 'year') {
        const startYM = `${selectedYear}-04`;
        const endYM = `${selectedYear + 1}-03`;
        rawPlans = rawPlans.filter(p => p.deliveryMonth >= startYM && p.deliveryMonth <= endYM);
    } else if (displayMode === 'month') {
        rawPlans = rawPlans.filter(p => p.deliveryMonth === selectedSingleMonth);
    } else if (displayMode === 'range') {
        rawPlans = rawPlans.filter(p => p.deliveryMonth >= rangeStartMonth && p.deliveryMonth <= rangeEndMonth);
    }

    if (ctx.selectedVendorFilter && ctx.selectedVendorFilter !== 'ALL') {
        rawPlans = rawPlans.filter(p => {
            const matchModelDetails = ctx.masterData.yoshii?.modelDetails?.[p.model] || {};
            const vCode = matchModelDetails.vendorCode !== undefined ? matchModelDetails.vendorCode : (p.vendorCode || '');
            return vCode === ctx.selectedVendorFilter;
        });
    }

    const groupedMap = {};
    rawPlans.forEach((p, index) => {
        const mo = p.deliveryMonth || '未設定';
        if (!groupedMap[mo]) groupedMap[mo] = [];
        groupedMap[mo].push({ ...p, _sortKey: p.sortOrder !== undefined ? p.sortOrder : index });
    });

    Object.keys(groupedMap).forEach(mo => {
        groupedMap[mo].sort((a, b) => a._sortKey - b._sortKey);
    });

    const sortedMonths = Object.keys(groupedMap).sort();

    const handleExecuteExport = () => {
        if (exportModal.type === 'print') {
            setTimeout(() => window.print(), 300);
            return;
        }

        const headers = ['納品月', '区分', '状況', '型式', '入数', '計画数', '手配数', 'コンテナ', 'ETD', 'ETA', '仕入先', '備考'];
        const rows = [];
        sortedMonths.forEach(mo => {
            groupedMap[mo].forEach(p => {
                rows.push([
                    mo, p.category || '-', p.status || '-', p.model || '-', p.qtyPerCarton || '-', p.planQty || '0', p.orderQty || '0',
                    p.containerSize || '-', p.etd || '-', p.eta || '-', p.vendorCode || '-', p.notes || '-'
                ]);
            });
        });

        const filename = `吉井電気_計画手配_${formatYYMM(ctx.currentMonthStr)}.xlsx`;
        exportToExcelSimple({
            title: `吉井電気 計画・手配 [仕入先: ${ctx.selectedVendorFilter || 'ALL'}]`,
            headers, rows, filename
        });
    };

    const handleAddRow = (month) => {
        const plansInMonth = groupedMap[month] || [];
        const nextSortOrder = plansInMonth.length > 0 ? Math.max(...plansInMonth.map(p => p.sortOrder || 0)) + 1 : 0;
        
        ctx.addPlan({
            company: 'yoshii',
            deliveryMonth: month,
            category: '計画',
            status: '未手配',
            model: '',
            qtyPerCarton: '',
            planQty: 0,
            orderQty: 0,
            containerSize: '40HQ',
            vendorCode: '',
            notes: '',
            sortOrder: nextSortOrder
        }, 'yoshii');
    };

    return (
        <div className="p-4 bg-white flex-grow flex flex-col h-full">
            <div className="hidden print:block font-bold text-sm text-black mb-1 border-b pb-0.5 text-left w-full">
                吉井電気 計画・手配 [仕入先: {ctx.selectedVendorFilter || 'ALL'}]
            </div>

            <div className="flex justify-between items-center mb-2 no-print flex-shrink-0">
                <div className="flex gap-3 items-center bg-gray-50 p-1.5 rounded border">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold">吉井電気 計画・手配</h2>
                        <span className="bg-slate-700 text-slate-100 border border-slate-500 text-[10px] font-extrabold px-1.5 py-0.5 rounded font-mono shadow-sm">
                            {displayVer}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 ml-2">
                        <label className="font-bold text-xs text-gray-700">📅 納入月表示切替:</label>
                        <select 
                            value={displayMode} 
                            onChange={e => setDisplayMode(e.target.value)} 
                            className="border p-1 rounded text-xs font-bold bg-white"
                        >
                            <option value="all">全体 (当月スクロール)</option>
                            <option value="current">当月のみ</option>
                            <option value="year">年度指定</option>
                            <option value="month">月指定</option>
                            <option value="range">範囲指定</option>
                        </select>

                        {displayMode === 'year' && (
                            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="border p-1 rounded text-xs font-bold bg-white text-indigo-900">
                                <option value={selectedYear - 1}>{selectedYear - 1}年度</option>
                                <option value={selectedYear}>{selectedYear}年度</option>
                                <option value={selectedYear + 1}>{selectedYear + 1}年度</option>
                                <option value={selectedYear + 2}>{selectedYear + 2}年度</option>
                            </select>
                        )}

                        {displayMode === 'month' && (
                            <input type="month" value={selectedSingleMonth} onChange={e => setSelectedSingleMonth(e.target.value)} className="border p-1 rounded text-xs text-center font-bold bg-white"/>
                        )}

                        {displayMode === 'range' && (
                            <div className="flex items-center gap-1 font-bold text-xs">
                                <input type="month" value={rangeStartMonth} onChange={e => setRangeStartMonth(e.target.value)} className="border p-1 rounded text-xs text-center bg-white"/>
                                <span>〜</span>
                                <input type="month" value={rangeEndMonth} onChange={e => setRangeEndMonth(e.target.value)} className="border p-1 rounded text-xs text-center bg-white"/>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1.5 no-print">
                    <button onClick={() => setExportModal({ isOpen: true, type: 'excel' })} className="px-2.5 py-1 text-xs font-bold rounded bg-emerald-700 hover:bg-emerald-800 text-white shadow transition flex items-center gap-1">📊 Excel出力</button>
                    <button onClick={() => setExportModal({ isOpen: true, type: 'print' })} className="px-2.5 py-1 text-xs font-bold rounded bg-slate-700 hover:bg-slate-800 text-white shadow transition flex items-center gap-1">🖨 印刷</button>
                    <button onClick={ctx.handleStartTracking} className={`px-2.5 py-1 text-xs font-bold rounded shadow transition ${ctx.isChangeTrackingMode ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}>{ctx.isChangeTrackingMode ? '● 変更記録中' : '変更開始'}</button>
                    <button onClick={ctx.handleClearTracking} className="px-2.5 py-1 text-xs font-bold rounded bg-gray-600 hover:bg-gray-700 text-white shadow transition">変更クリア</button>
                </div>
            </div>

            <div className="table-container flex-grow border rounded shadow-inner overflow-x-auto" ref={ctx.tableContainerRef} onScroll={handleScroll}>
                <table className="alloc-print-table w-full text-center border-collapse min-w-max">
                    <thead className="sticky top-0 z-30 bg-gray-200 shadow-sm">
                        <tr className="table-row-compact">
                            <th className="p-0.5 border w-[30px] no-print"></th>
                            <th className="p-0.5 border w-[70px] text-xs align-middle">区分</th>
                            <th className="p-0.5 border w-[80px] text-xs align-middle">状況</th>
                            <th className="p-0.5 border min-w-[130px] text-xs align-middle">型式</th>
                            <th className="p-0.5 border w-[45px] text-xs align-middle">入数</th>
                            <th className="p-0.5 border w-[75px] text-xs align-middle bg-blue-50 text-blue-900">計画数</th>
                            <th className="p-0.5 border w-[75px] text-xs align-middle bg-emerald-50 text-emerald-900">手配数</th>
                            <th className="p-0.5 border w-[60px] text-xs align-middle">コンテナ</th>
                            <th className="p-0.5 border w-[80px] text-xs align-middle">ETD</th>
                            <th className="p-0.5 border w-[80px] text-xs align-middle">ETA</th>
                            <th className="p-0.5 border w-[90px] text-xs align-middle">仕入先</th>
                            <th className="p-0.5 border min-w-[150px] text-xs align-middle">備考</th>
                            <th className="p-0.5 border w-[40px] no-print"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedMonths.length === 0 ? (
                            <tr><td colSpan="13" className="p-4 text-center text-gray-500 font-bold">該当する条件のデータが存在しません。</td></tr>
                        ) : (
                            sortedMonths.map(mo => {
                                const plansInMonth = groupedMap[mo] || [];
                                const handleGridNav = ctx.createGridNav(`y-plan-${mo}`, plansInMonth.length - 1, 11);

                                return (
                                    <React.Fragment key={mo}>
                                        <tr id={`plan-month-hdr-${mo}`}>
                                            <td colSpan="13" className="bg-blue-100 text-blue-900 font-bold text-xs px-2 py-1 text-left border-y border-blue-300">
                                                ■ {mo.replace('-', '年')}月 納品分 {mo === ctx.currentMonthStr && <span className="ml-2 bg-blue-700 text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm">★当月</span>}
                                            </td>
                                        </tr>
                                        {plansInMonth.map((plan, idx) => {
                                            return (
                                                <tr key={plan.id} className="hover:bg-blue-50/50 table-row-compact group">
                                                    <td className="p-0.5 border text-center align-middle no-print">
                                                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => ctx.movePlanSortOrder(plan.id, 'up', mo, 'yoshii')} className="p-0.5 text-gray-400 hover:text-indigo-600 rounded hover:bg-indigo-50" title="上へ" disabled={idx === 0}>▲</button>
                                                            <button onClick={() => ctx.movePlanSortOrder(plan.id, 'down', mo, 'yoshii')} className="p-0.5 text-gray-400 hover:text-indigo-600 rounded hover:bg-indigo-50" title="下へ" disabled={idx === plansInMonth.length - 1}>▼</button>
                                                        </div>
                                                    </td>
                                                    <td className="p-0.5 border text-center align-middle">
                                                        <DynamicSelect value={plan.category} originalValue={(plan.originals || {}).category} originalMeta={(plan.originalMetas || {}).category} onChange={(val, cat, orig) => ctx.handleSelectChange(plan.id, 'category', false, 'yoshii', false, '区分')(val, cat, orig)} category="categories" options={ctx.masterData.yoshii.categories} dataGridId={`y-plan-${mo}-${idx}-0`} onGridKeyDown={handleGridNav} className="w-full text-xs border-none bg-transparent outline-none text-center px-0 font-bold text-gray-700" />
                                                    </td>
                                                    <td className="p-0.5 border text-center align-middle">
                                                        <DynamicSelect value={plan.status} originalValue={(plan.originals || {}).status} originalMeta={(plan.originalMetas || {}).status} onChange={(val, cat, orig) => ctx.handleSelectChange(plan.id, 'status', false, 'common', false, '状況')(val, cat, orig)} category="statuses" options={ctx.masterData.common.statuses} dataGridId={`y-plan-${mo}-${idx}-1`} onGridKeyDown={handleGridNav} className="w-full text-xs border-none bg-transparent outline-none text-center px-0" />
                                                    </td>
                                                    <td className="p-0.5 border text-center align-middle">
                                                        <DynamicSelect value={plan.model} originalValue={(plan.originals || {}).model} originalMeta={(plan.originalMetas || {}).model} onChange={(val, cat, orig) => ctx.handleSelectChange(plan.id, 'model', false, 'yoshii', false, '型式')(val, cat, orig)} category="models" options={ctx.masterData.yoshii.models} dataGridId={`y-plan-${mo}-${idx}-2`} onGridKeyDown={handleGridNav} className="w-full text-xs border-none bg-transparent outline-none text-left px-1 font-bold text-gray-800" />
                                                    </td>
                                                    {/* ★ 新設: 入数(qtyPerCarton) */}
                                                    <td className="p-0.5 border text-center align-middle bg-gray-50/50">
                                                        <LocalInput type="number" value={plan.qtyPerCarton} originalValue={(plan.originals || {}).qtyPerCarton} originalMeta={(plan.originalMetas || {}).qtyPerCarton} onChange={(v, orig) => ctx.updatePlan(plan.id, { qtyPerCarton: v }, mo, 'yoshii', '入数')} className="text-center text-xs font-mono text-gray-700" dataGridId={`y-plan-${mo}-${idx}-3`} onGridKeyDown={handleGridNav} placeholder="-" />
                                                    </td>
                                                    <td className="p-0.5 border text-center align-middle bg-blue-50/30">
                                                        <LocalInput type="number" value={plan.planQty} originalValue={(plan.originals || {}).planQty} originalMeta={(plan.originalMetas || {}).planQty} onChange={(v, orig) => ctx.updatePlan(plan.id, { planQty: Number(v) || 0 }, mo, 'yoshii', '計画数')} className="text-right text-xs font-mono font-bold text-blue-900 pr-1" dataGridId={`y-plan-${mo}-${idx}-4`} onGridKeyDown={handleGridNav} />
                                                    </td>
                                                    <td className="p-0.5 border text-center align-middle bg-emerald-50/30">
                                                        <LocalInput type="number" value={plan.orderQty} originalValue={(plan.originals || {}).orderQty} originalMeta={(plan.originalMetas || {}).orderQty} onChange={(v, orig) => ctx.updatePlan(plan.id, { orderQty: Number(v) || 0 }, mo, 'yoshii', '手配数')} className="text-right text-xs font-mono font-bold text-emerald-900 pr-1" dataGridId={`y-plan-${mo}-${idx}-5`} onGridKeyDown={handleGridNav} />
                                                    </td>
                                                    <td className="p-0.5 border text-center align-middle">
                                                        <DynamicSelect value={plan.containerSize} originalValue={(plan.originals || {}).containerSize} originalMeta={(plan.originalMetas || {}).containerSize} onChange={(val, cat, orig) => ctx.handleSelectChange(plan.id, 'containerSize', false, 'common', false, 'コンテナ')(val, cat, orig)} category="containerSizes" options={ctx.masterData.common.containerSizes} dataGridId={`y-plan-${mo}-${idx}-6`} onGridKeyDown={handleGridNav} className="w-full text-xs border-none bg-transparent outline-none text-center px-0 text-gray-600" />
                                                    </td>
                                                    <td className="p-0.5 border text-center align-middle">
                                                        <LocalInput type="qc-date" value={plan.etd} originalValue={(plan.originals || {}).etd} originalMeta={(plan.originalMetas || {}).etd} onChange={(v, orig) => ctx.updatePlan(plan.id, { etd: v }, mo, 'yoshii', 'ETD')} refDate={mo} className="text-left pl-2 text-xs" dataGridId={`y-plan-${mo}-${idx}-7`} onGridKeyDown={handleGridNav} />
                                                    </td>
                                                    <td className="p-0.5 border text-center align-middle">
                                                        <LocalInput type="qc-date" value={plan.eta} originalValue={(plan.originals || {}).eta} originalMeta={(plan.originalMetas || {}).eta} onChange={(v, orig) => ctx.updatePlan(plan.id, { eta: v }, mo, 'yoshii', 'ETA')} refDate={mo} className="text-left pl-2 text-xs" dataGridId={`y-plan-${mo}-${idx}-8`} onGridKeyDown={handleGridNav} />
                                                    </td>
                                                    <td className="p-0.5 border text-center align-middle whitespace-normal break-words">
                                                        <DynamicSelect value={plan.vendorCode} originalValue={(plan.originals || {}).vendorCode} originalMeta={(plan.originalMetas || {}).vendorCode} onChange={(val, cat, orig) => ctx.handleSelectChange(plan.id, 'vendorCode', false, 'yoshii', false, '仕入先')(val, cat, orig)} category="vendors" options={ctx.masterData.yoshii.vendors} dataGridId={`y-plan-${mo}-${idx}-9`} onGridKeyDown={handleGridNav} className="w-full text-xs border-none bg-transparent outline-none text-center px-0 h-auto whitespace-normal break-words" />
                                                    </td>
                                                    <td className="p-0.5 border text-center align-middle whitespace-normal break-words">
                                                        <LocalTextArea value={plan.notes} originalValue={(plan.originals || {}).notes} originalMeta={(plan.originalMetas || {}).notes} onChange={(v, orig) => ctx.updatePlan(plan.id, { notes: v }, mo, 'yoshii', '備考')} isCompact={true} className="h-auto whitespace-pre-wrap break-words"/>
                                                    </td>
                                                    <td className="p-0.5 border text-center align-middle no-print">
                                                        <button onClick={() => ctx.deletePlan(plan.id, 'yoshii')} className="text-gray-400 hover:text-red-600 px-1 py-0.5 rounded hover:bg-red-50 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity" title="削除">✕</button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        <tr className="no-print border-b-2 border-blue-200">
                                            <td colSpan="13" className="p-1 text-center bg-gray-50">
                                                <button onClick={() => handleAddRow(mo)} className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-100 px-3 py-1 rounded transition w-full flex items-center justify-center gap-1">
                                                    <span>＋</span> この月に行を追加
                                                </button>
                                            </td>
                                        </tr>
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <ExportPrintModal isOpen={exportModal.isOpen} onClose={() => setExportModal({ isOpen: false, type: 'excel' })} screenName="計画・手配" currentMonthStr={ctx.currentMonthStr} defaultMode="year" onStartExport={handleExecuteExport} />
        </div>
    );
};