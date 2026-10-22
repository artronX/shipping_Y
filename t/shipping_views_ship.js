// shipping_views_ship.js
// =========================================================
// shipping_views_ship.js - 出荷日程・ドレージ画面モジュール
// ★ WebVer. 123 対応 / _js034 補充部品＆積載型式数値のbold（太字）除去・標準ウェイト化調整版
// ★ 最上行ファイル名識別コメント保持 (// shipping_views_ship.js)
// ★ 1. 補充部品データ: 実データ構造(spareParts[m].outerBox/innerBox/label)に基づく完全読み書き
// ★ 2. スタイル調整: インラインstyle/クラス指定からfontWeight:'bold'を除去し、36px均等・12px等幅・標準ウェイト・中央寄せで描画
// ★ 3. 積載型式数値: 12px等幅・標準ウェイトへ調整し、文字のくっきり感を保持しつつ太さを標準化
// ★ 4. 月タイトル: <td> タグへ bg-emerald-100 text-emerald-900 を直接適用
// ★ 5. 納品時間: w-[66px] 幅で 時計アイコン・末尾数字の見切れを解消
// =========================================================

const JS_SHIP_VERSION = '_js034';

// 【ヘルパー: コンテナ内割振り製品総数量の動的自動計算】
const calculateContainerTotalQty = (allocationsObj) => {
    if (!allocationsObj || typeof allocationsObj !== 'object') return 0;
    return Object.values(allocationsObj).reduce((sum, qty) => {
        const num = Number(qty);
        return sum + (!isNaN(num) && num > 0 ? num : 0);
    }, 0);
};

// 【1. 吉井電気 出荷日程表ビュー (YoshiiShipView)】
const YoshiiShipView = () => {
    const ctx = React.useContext(AppContext);
    const [exportModal, setExportModal] = React.useState({ isOpen: false, type: 'excel' });

    const baseAppVer = typeof SYSTEM_VERSION !== 'undefined' ? SYSTEM_VERSION : '';
    const cmpVer = typeof JS_COMPONENTS_VERSION !== 'undefined' ? JS_COMPONENTS_VERSION : '';
    const displayVer = `${baseAppVer}${JS_SHIP_VERSION}${cmpVer}`;

    const [displayMode, setDisplayMode] = React.useState('year');
    const [selectedYear, setSelectedYear] = React.useState(2026);
    const [selectedSingleMonth, setSelectedSingleMonth] = React.useState(ctx.currentMonthStr || '2026-10');
    const [rangeStartMonth, setRangeStartMonth] = React.useState('2026-04');
    const [rangeEndMonth, setRangeEndMonth] = React.useState('2027-03');

    const isInitialScrolledRef = React.useRef(false);

    React.useLayoutEffect(() => {
        if (ctx.tableContainerRef.current) {
            if (ctx.shipScrollPosRef.current !== null) {
                ctx.tableContainerRef.current.scrollTop = ctx.shipScrollPosRef.current;
            } else if (!isInitialScrolledRef.current && ctx.currentMonthStr) {
                setTimeout(() => {
                    const container = ctx.tableContainerRef.current;
                    const targetHeader = document.getElementById(`ship-month-hdr-${ctx.currentMonthStr}`);
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
        ctx.shipScrollPosRef.current = e.target.scrollTop;
    };

    let rawContainers = [...ctx.containers].filter(c => c.company === 'yoshii');

    if (displayMode === 'current') {
        rawContainers = rawContainers.filter(c => c.deliveryMonth === ctx.currentMonthStr);
    } else if (displayMode === 'year') {
        const startYM = `${selectedYear}-04`;
        const endYM = `${selectedYear + 1}-03`;
        rawContainers = rawContainers.filter(c => c.deliveryMonth >= startYM && c.deliveryMonth <= endYM);
    } else if (displayMode === 'month') {
        rawContainers = rawContainers.filter(c => c.deliveryMonth === selectedSingleMonth);
    } else if (displayMode === 'range') {
        rawContainers = rawContainers.filter(c => c.deliveryMonth >= rangeStartMonth && c.deliveryMonth <= rangeEndMonth);
    }

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

    const groupedMap = {};
    rawContainers.forEach((c, index) => {
        const mo = c.deliveryMonth || '未設定';
        if (!groupedMap[mo]) groupedMap[mo] = [];
        const containerWithSort = { ...c, _sortKey: c.sortOrder !== undefined ? c.sortOrder : index };
        groupedMap[mo].push(containerWithSort);
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

        const headers = ['納品月', '管理番号', '進行状況', 'コンテナNO.', '積載型式', '割振数', '外装箱', '個装箱', 'ラベル', '到着港', 'ETD', 'ETA', 'フリータイム', '納品日', '時間', '納品先', '備考', 'サイズ', '本船名'];
        
        const rows = [];
        sortedMonths.forEach(mo => {
            groupedMap[mo].forEach(c => {
                const totalQty = calculateContainerTotalQty(c.allocations);
                const modelsStr = Object.entries(c.allocations || {})
                    .filter(([_, q]) => Number(q) > 0)
                    .map(([m, q]) => `${m} (${q})`)
                    .join(' / ');

                rows.push([
                    mo, c.managementNo || '-', c.status || '-', c.containerNo || '-', modelsStr || '-',
                    totalQty, c.spareOuter || '0', c.spareInner || '0', c.spareLabel || '0',
                    c.port || '-', c.etd || '-', c.eta || '-',
                    c.freetime || '-', c.deliveryDate || '-', c.deliveryTime || '-',
                    c.destination || '-', c.notes || '-', c.containerSize || '-', c.vesselName || '-'
                ]);
            });
        });

        const filename = `吉井電気_出荷日程表_${formatYYMM(ctx.currentMonthStr)}.xlsx`;

        exportToExcelSimple({
            title: `吉井電気 出荷日程表 [仕入先: ${ctx.selectedVendorFilter || 'ALL'}]`,
            headers, rows, filename
        });
    };

    return (
        <div className="p-4 bg-white flex-grow flex flex-col h-full">
            <div className="hidden print:block font-bold text-sm text-black mb-1 border-b pb-0.5 text-left w-full">
                吉井電気 出荷日程表 [仕入先: {ctx.selectedVendorFilter || 'ALL'}]
            </div>

            <div className="flex justify-between items-center mb-2 no-print flex-shrink-0">
                <div className="flex gap-3 items-center bg-gray-50 p-1.5 rounded border">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold">吉井電気 出荷日程表</h2>
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
                                <option value={2025}>2025年度</option>
                                <option value={2026}>2026年度</option>
                                <option value={2027}>2027年度</option>
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
                <table className="alloc-print-table w-full text-center border-collapse">
                    <thead className="sticky top-0 z-30 bg-gray-200 shadow-sm">
                        <tr className="table-row-compact">
                            <th className="p-0.5 border w-[75px] text-xs text-center align-middle">管理番号</th>
                            <th className="p-0.5 border w-[70px] text-xs align-middle">進行状況</th>
                            <th className="p-0.5 border w-[105px] text-xs align-middle">コンテナNO.</th>
                            <th className="p-0.5 border min-w-[130px] text-xs align-middle">積載型式</th>
                            <th className="p-0.5 border w-[65px] text-xs align-middle">割振数</th>
                            <th className="p-0.5 border w-[125px] bg-emerald-50 text-[10px] text-emerald-900 align-middle">
                                補充部品 (PCS)<br/>
                                <span className="inline-block w-[36px] text-center">外装箱</span>
                                <span className="inline-block w-[36px] text-center">個装箱</span>
                                <span className="inline-block w-[36px] text-center">ラベル</span>
                            </th>
                            <th className="p-0.5 border w-[70px] text-xs align-middle">到着港</th>
                            <th className="p-0.5 border w-[80px] text-xs align-middle">ETD</th>
                            <th className="p-0.5 border w-[80px] text-xs align-middle">ETA</th>
                            <th className="p-0.5 border w-[80px] text-xs align-middle">フリータイム</th>
                            <th className="p-0.5 border w-[175px] bg-emerald-50 text-xs text-emerald-900 align-middle">
                                納品日時<br/>
                                <span className="inline-block w-[85px] text-center">納品日</span>
                                <span className="inline-block w-[80px] text-center">時間</span>
                            </th>
                            <th className="p-0.5 border w-[170px] text-xs align-middle">納品先</th>
                            <th className="p-0.5 border min-w-[150px] text-xs align-middle">備考</th>
                            <th className="p-0.5 border w-[55px] text-xs align-middle">サイズ</th>
                            <th className="p-0.5 border w-[90px] text-xs align-middle">本船名</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedMonths.length === 0 ? (
                            <tr><td colSpan="15" className="p-4 text-center text-gray-500 font-bold">該当する条件のデータが存在しません。</td></tr>
                        ) : (
                            sortedMonths.map(mo => {
                                const containersInMonth = groupedMap[mo] || [];
                                const handleGridNav = ctx.createGridNav(`y-ship-${mo}`, containersInMonth.length - 1, 14);

                                return (
                                    <React.Fragment key={mo}>
                                        <tr id={`ship-month-hdr-${mo}`}>
                                            <td colSpan="15" className="bg-emerald-100 text-emerald-900 font-bold text-xs px-2 py-1 text-left border-y border-emerald-300">
                                                ■ {mo.replace('-', '年')}月 納品分 {mo === ctx.currentMonthStr && <span className="ml-2 bg-emerald-700 text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm">★当月</span>}
                                            </td>
                                        </tr>
                                        {containersInMonth.map((container, idx) => {
                                            const totalQty = calculateContainerTotalQty(container.allocations);
                                            const activeAllocEntries = Object.entries(container.allocations || {}).filter(([_, q]) => Number(q) > 0);

                                            const origTime = (container.originals || {}).deliveryTime;
                                            const currTime = container.deliveryTime || '';
                                            const isTimeChanged = origTime !== undefined && origTime !== null && (
                                                (origTime !== '' && currTime === '') || 
                                                (origTime !== '' && currTime !== '' && origTime !== currTime) || 
                                                (origTime === '' && currTime !== '' && (container.originalMetas || {}).deliveryTime)
                                            );

                                            return (
                                                <tr key={container.id || `ship-${mo}-${idx}`} className="hover:bg-emerald-50/60 table-row-compact">
                                                    <td className="p-0.5 border text-center align-middle">
                                                        <LocalInput value={container.managementNo} originalValue={(container.originals || {}).managementNo} originalMeta={(container.originalMetas || {}).managementNo} onChange={(v, orig) => ctx.updateContainer(container.id, { managementNo: v, originals: { ...(container.originals || {}), managementNo: container.originals?.managementNo !== undefined ? container.originals.managementNo : orig }, originalMetas: { ...(container.originalMetas || {}), managementNo: container.originalMetas?.managementNo !== undefined ? container.originalMetas.managementNo : `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}` } }, mo, 'yoshii', '管理番号')} className="text-center text-xs font-bold" dataGridId={`y-ship-${mo}-${idx}-0`} onGridKeyDown={handleGridNav} />
                                                    </td>

                                                    <td className="p-0.5 border text-center align-middle">
                                                        <DynamicSelect value={container.status} originalValue={(container.originals || {}).status} originalMeta={(container.originalMetas || {}).status} onChange={(val, cat, orig) => ctx.handleSelectChange(container.id, 'status', true, 'common', false, '進行状況')(val, cat, orig)} category="statuses" options={ctx.masterData.common.statuses} dataGridId={`y-ship-${mo}-${idx}-1`} onGridKeyDown={handleGridNav} className="w-full text-xs border-none bg-transparent outline-none text-center px-0" />
                                                    </td>

                                                    <td className="p-0.5 border text-center align-middle">
                                                        <LocalInput value={container.containerNo} originalValue={(container.originals || {}).containerNo} originalMeta={(container.originalMetas || {}).containerNo} onChange={(v, orig) => ctx.updateContainer(container.id, { containerNo: v }, mo, 'yoshii', 'コンテナNO.')} className="text-center text-xs font-mono" dataGridId={`y-ship-${mo}-${idx}-2`} onGridKeyDown={handleGridNav} />
                                                    </td>

                                                    {/* ★ 積載型式: 右側の数値表示を 12px / font-mono / font-normal (標準ウェイト) へ調整 */}
                                                    <td className="border text-xs text-left px-1 py-0.5 bg-gray-50/50 align-middle">
                                                        {activeAllocEntries.length === 0 ? (
                                                            <span className="text-gray-400 text-[10px] italic">未割当</span>
                                                        ) : (
                                                            <div className="space-y-0.5">
                                                                {activeAllocEntries.map(([m, q]) => (
                                                                    <div key={m} className="flex justify-between items-center text-xs h-[20px]">
                                                                        <span className="font-bold text-gray-800">{m}</span>
                                                                        <span className="font-mono text-emerald-800 font-normal ml-1">{Number(q).toLocaleString()}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td className="border font-mono text-xs text-right pr-1 bg-emerald-50/50 text-emerald-900 font-bold align-middle">{totalQty > 0 ? totalQty.toLocaleString() : '0'}</td>

                                                    {/* ★ 補充部品: fontWeight:'normal' (標準ウェイト) に変更し bold 除去 */}
                                                    <td className="border text-center px-0 py-0.5 bg-emerald-50/30 align-middle">
                                                        {activeAllocEntries.length === 0 ? (
                                                            <div className="flex justify-center items-center gap-0.5 h-[20px]">
                                                                <span className="text-[10px] text-gray-300">-</span>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-0.5">
                                                                {activeAllocEntries.map(([m, _]) => {
                                                                    const sparePartsObj = container.spareParts || {};
                                                                    const modelSpare = sparePartsObj[m] || {};

                                                                    const outerVal = modelSpare.outerBox !== undefined ? modelSpare.outerBox : (container.spareOuter !== undefined ? container.spareOuter : '');
                                                                    const innerVal = modelSpare.innerBox !== undefined ? modelSpare.innerBox : (container.spareInner !== undefined ? container.spareInner : '');
                                                                    const labelVal = modelSpare.label !== undefined ? modelSpare.label : (container.spareLabel !== undefined ? container.spareLabel : '');

                                                                    const updateSpareField = (fieldKey, val) => {
                                                                        const updatedSpareParts = { ...(container.spareParts || {}) };
                                                                        if (!updatedSpareParts[m]) updatedSpareParts[m] = { outerBox: '', innerBox: '', label: '' };
                                                                        
                                                                        updatedSpareParts[m] = {
                                                                            ...updatedSpareParts[m],
                                                                            [fieldKey]: val
                                                                        };

                                                                        const updatePayload = {
                                                                            spareParts: updatedSpareParts
                                                                        };
                                                                        if (fieldKey === 'outerBox') updatePayload.spareOuter = val;
                                                                        if (fieldKey === 'innerBox') updatePayload.spareInner = val;
                                                                        if (fieldKey === 'label') updatePayload.spareLabel = val;

                                                                        ctx.updateContainer(container.id, updatePayload, mo, 'yoshii', `${m} 補充部品(${fieldKey})`);
                                                                    };

                                                                    const spareInputStyle = {
                                                                        width: '36px',
                                                                        height: '20px',
                                                                        fontSize: '12px',
                                                                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                                                        fontWeight: 'normal',
                                                                        textAlign: 'center',
                                                                        border: 'none',
                                                                        background: 'transparent',
                                                                        outline: 'none'
                                                                    };

                                                                    return (
                                                                        <div key={m} className="flex justify-center items-center gap-0.5 h-[20px]">
                                                                            <input 
                                                                                type="text" 
                                                                                value={outerVal} 
                                                                                onChange={e => updateSpareField('outerBox', e.target.value)} 
                                                                                style={spareInputStyle} 
                                                                                placeholder="0"
                                                                            />
                                                                            <input 
                                                                                type="text" 
                                                                                value={innerVal} 
                                                                                onChange={e => updateSpareField('innerBox', e.target.value)} 
                                                                                style={spareInputStyle} 
                                                                                placeholder="0"
                                                                            />
                                                                            <input 
                                                                                type="text" 
                                                                                value={labelVal} 
                                                                                onChange={e => updateSpareField('label', e.target.value)} 
                                                                                style={spareInputStyle} 
                                                                                placeholder="0"
                                                                            />
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td className="p-0.5 border text-center align-middle">
                                                        <DynamicSelect value={container.port} originalValue={(container.originals || {}).port} originalMeta={(container.originalMetas || {}).port} onChange={(val, cat, orig) => ctx.handleSelectChange(container.id, 'port', true, 'yoshii', false, '到着港')(val, cat, orig)} category="ports" options={ctx.masterData.yoshii.ports} dataGridId={`y-ship-${mo}-${idx}-3`} onGridKeyDown={handleGridNav} className="w-full text-xs border-none bg-transparent outline-none text-center px-0" />
                                                    </td>

                                                    <td className="p-0.5 border text-center align-middle">
                                                        <LocalInput type="qc-date" value={container.etd} originalValue={(container.originals || {}).etd} originalMeta={(container.originalMetas || {}).etd} onChange={(v, orig) => ctx.updateContainer(container.id, { etd: v }, mo, 'yoshii', 'ETD')} refDate={mo} className="text-left pl-2 text-xs" dataGridId={`y-ship-${mo}-${idx}-4`} onGridKeyDown={handleGridNav} />
                                                    </td>

                                                    <td className="p-0.5 border text-center align-middle">
                                                        <LocalInput type="qc-date" value={container.eta} originalValue={(container.originals || {}).eta} originalMeta={(container.originalMetas || {}).eta} onChange={(v, orig) => ctx.updateContainer(container.id, { eta: v }, mo, 'yoshii', 'ETA')} refDate={mo} className="text-left pl-2 text-xs" dataGridId={`y-ship-${mo}-${idx}-5`} onGridKeyDown={handleGridNav} />
                                                    </td>

                                                    <td className="p-0.5 border text-center align-middle">
                                                        <LocalInput type="qc-date" value={container.freetime} originalValue={(container.originals || {}).freetime} originalMeta={(container.originalMetas || {}).freetime} onChange={(v, orig) => ctx.updateContainer(container.id, { freetime: v }, mo, 'yoshii', 'フリータイム')} refDate={mo} className="text-left pl-2 text-xs" dataGridId={`y-ship-${mo}-${idx}-6`} onGridKeyDown={handleGridNav} />
                                                    </td>

                                                    <td className="border text-center px-1 py-0.5 bg-emerald-50/30 align-middle">
                                                        <div className="flex items-center justify-between gap-0.5 w-full">
                                                            <div className="w-[85px] flex-shrink-0">
                                                                <LocalInput 
                                                                    type="qc-date" 
                                                                    value={container.deliveryDate} 
                                                                    originalValue={(container.originals || {}).deliveryDate} 
                                                                    originalMeta={(container.originalMetas || {}).deliveryDate} 
                                                                    onChange={(v, orig) => ctx.updateContainer(container.id, { deliveryDate: v, originals: { ...(container.originals || {}), deliveryDate: container.originals?.deliveryDate !== undefined ? container.originals.deliveryDate : orig }, originalMetas: { ...(container.originalMetas || {}), deliveryDate: container.originalMetas?.deliveryDate !== undefined ? container.originalMetas.deliveryDate : `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}` } }, mo, 'yoshii', '納品日')} 
                                                                    refDate={mo} 
                                                                    className="text-left pl-2 text-xs font-bold" 
                                                                    dataGridId={`y-ship-${mo}-${idx}-7`} 
                                                                    onGridKeyDown={handleGridNav} 
                                                                />
                                                            </div>
                                                            <div className={`w-[80px] flex-shrink-0 flex items-center gap-0.5 relative ${isTimeChanged ? 'qc-change-dot' : ''}`} title={isTimeChanged ? `変更前: ${(container.originals || {}).deliveryTime || '未設定'} (${(container.originalMetas || {}).deliveryTime || ''})` : ''}>
                                                                <input 
                                                                    type="time" 
                                                                    value={container.deliveryTime || ''} 
                                                                    onChange={e => {
                                                                        const val = e.target.value;
                                                                        const prevValue = container.deliveryTime || '';
                                                                        const orig = container.originals?.deliveryTime !== undefined ? container.originals.deliveryTime : prevValue;
                                                                        ctx.updateContainer(container.id, { deliveryTime: val, originals: { ...(container.originals || {}), deliveryTime: orig }, originalMetas: { ...(container.originalMetas || {}), deliveryTime: container.originalMetas?.deliveryTime || `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}` } }, mo, 'yoshii', '納品時間');
                                                                    }} 
                                                                    className="border rounded px-0.5 py-0 text-[10px] font-bold bg-white text-center w-[66px] h-[22px] cursor-pointer outline-none focus:ring-1 focus:ring-indigo-500"
                                                                />
                                                                {container.deliveryTime ? (
                                                                    <button 
                                                                        type="button" 
                                                                        onClick={() => {
                                                                            const prevValue = container.deliveryTime || '';
                                                                            const orig = container.originals?.deliveryTime !== undefined ? container.originals.deliveryTime : prevValue;
                                                                            ctx.updateContainer(container.id, { deliveryTime: '', originals: { ...(container.originals || {}), deliveryTime: orig }, originalMetas: { ...(container.originalMetas || {}), deliveryTime: container.originalMetas?.deliveryTime || `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}` } }, mo, 'yoshii', '納品時間 (削除)');
                                                                        }} 
                                                                        className="w-3.5 h-3.5 flex items-center justify-center text-[9px] font-bold text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded transition" 
                                                                        title="時刻をクリア"
                                                                    >
                                                                        ✕
                                                                    </button>
                                                                ) : <div className="w-3.5"></div>}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="p-0.5 border text-center align-middle whitespace-normal break-words">
                                                        <DynamicSelect value={container.destination} originalValue={(container.originals || {}).destination} originalMeta={(container.originalMetas || {}).destination} onChange={(val, cat, orig) => ctx.handleSelectChange(container.id, 'destination', true, 'yoshii', false, '納品先')(val, cat, orig)} category="destinations" options={ctx.masterData.yoshii.destinations} dataGridId={`y-ship-${mo}-${idx}-8`} onGridKeyDown={handleGridNav} className="w-full text-xs border-none bg-transparent outline-none text-center px-0 h-auto whitespace-normal break-words" />
                                                    </td>

                                                    <td className="p-0.5 border text-center align-middle whitespace-normal break-words">
                                                        <LocalTextArea value={container.notes} originalValue={(container.originals || {}).notes} originalMeta={(container.originalMetas || {}).notes} onChange={(v, orig) => ctx.updateContainer(container.id, { notes: v }, mo, 'yoshii', '備考')} isCompact={true} className="h-auto whitespace-pre-wrap break-words"/>
                                                    </td>

                                                    <td className="p-0.5 border text-center align-middle">
                                                        <DynamicSelect value={container.containerSize} originalValue={(container.originals || {}).containerSize} originalMeta={(container.originalMetas || {}).containerSize} onChange={(val, cat, orig) => ctx.handleSelectChange(container.id, 'containerSize', true, 'common', false, 'サイズ')(val, cat, orig)} category="containerSizes" options={ctx.masterData.common.containerSizes} dataGridId={`y-ship-${mo}-${idx}-9`} onGridKeyDown={handleGridNav} className="w-full text-xs border-none bg-transparent outline-none text-center px-0" />
                                                    </td>

                                                    <td className="p-0.5 border text-center align-middle">
                                                        <LocalInput value={container.vesselName} originalValue={(container.originals || {}).vesselName} originalMeta={(container.originalMetas || {}).originalMetas?.vesselName} onChange={(v, orig) => ctx.updateContainer(container.id, { vesselName: v }, mo, 'yoshii', '本船名')} className="text-center text-xs" dataGridId={`y-ship-${mo}-${idx}-10`} onGridKeyDown={handleGridNav} />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <ExportPrintModal isOpen={exportModal.isOpen} onClose={() => setExportModal({ isOpen: false, type: 'excel' })} screenName="出荷日程表" currentMonthStr={ctx.currentMonthStr} defaultMode="year" onStartExport={handleExecuteExport} />
        </div>
    );
};

// 【2. 吉井電気 ドレージ手配ビュー (YoshiiDrayageView)】
const YoshiiDrayageView = () => {
    const ctx = React.useContext(AppContext);
    const [exportModal, setExportModal] = React.useState({ isOpen: false, type: 'excel' });

    const baseAppVer = typeof SYSTEM_VERSION !== 'undefined' ? SYSTEM_VERSION : '';
    const cmpVer = typeof JS_COMPONENTS_VERSION !== 'undefined' ? JS_COMPONENTS_VERSION : '';
    const displayVer = `${baseAppVer}${JS_SHIP_VERSION}${cmpVer}`;

    const [displayMode, setDisplayMode] = React.useState('year');
    const [selectedYear, setSelectedYear] = React.useState(2026);
    const [selectedSingleMonth, setSelectedSingleMonth] = React.useState(ctx.currentMonthStr || '2026-10');
    const [rangeStartMonth, setRangeStartMonth] = React.useState('2026-04');
    const [rangeEndMonth, setRangeEndMonth] = React.useState('2027-03');

    const isInitialScrolledRef = React.useRef(false);

    React.useLayoutEffect(() => {
        if (ctx.tableContainerRef.current) {
            if (ctx.drayScrollPosRef.current !== null) {
                ctx.tableContainerRef.current.scrollTop = ctx.drayScrollPosRef.current;
            } else if (!isInitialScrolledRef.current && ctx.currentMonthStr) {
                setTimeout(() => {
                    const container = ctx.tableContainerRef.current;
                    const targetHeader = document.getElementById(`dray-month-hdr-${ctx.currentMonthStr}`);
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
        ctx.drayScrollPosRef.current = e.target.scrollTop;
    };

    let rawContainers = [...ctx.containers].filter(c => c.company === 'yoshii');

    if (displayMode === 'current') {
        rawContainers = rawContainers.filter(c => c.deliveryMonth === ctx.currentMonthStr);
    } else if (displayMode === 'year') {
        const startYM = `${selectedYear}-04`;
        const endYM = `${selectedYear + 1}-03`;
        rawContainers = rawContainers.filter(c => c.deliveryMonth >= startYM && c.deliveryMonth <= endYM);
    } else if (displayMode === 'month') {
        rawContainers = rawContainers.filter(c => c.deliveryMonth === selectedSingleMonth);
    } else if (displayMode === 'range') {
        rawContainers = rawContainers.filter(c => c.deliveryMonth >= rangeStartMonth && c.deliveryMonth <= rangeEndMonth);
    }

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

    const groupedMap = {};
    rawContainers.forEach((c, index) => {
        const mo = c.deliveryMonth || '未設定';
        if (!groupedMap[mo]) groupedMap[mo] = [];
        const containerWithSort = { ...c, _sortKey: c.sortOrder !== undefined ? c.sortOrder : index };
        groupedMap[mo].push(containerWithSort);
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

        const headers = ['納品月', '管理番号', '進行状況', 'コンテナNO.', '積載型式', '割振数', '外装箱', '個装箱', 'ラベル', '到着港', 'ETD', 'ETA', 'フリータイム', '納品日', '時間', '納品先', '備考', 'サイズ', '本船名'];
        
        const rows = [];
        sortedMonths.forEach(mo => {
            groupedMap[mo].forEach(c => {
                const totalQty = calculateContainerTotalQty(c.allocations);
                const modelsStr = Object.entries(c.allocations || {})
                    .filter(([_, q]) => Number(q) > 0)
                    .map(([m, q]) => `${m} (${q})`)
                    .join(' / ');

                rows.push([
                    mo, c.managementNo || '-', c.status || '-', c.containerNo || '-', modelsStr || '-',
                    totalQty, c.spareOuter || '0', c.spareInner || '0', c.spareLabel || '0',
                    c.port || '-', c.etd || '-', c.eta || '-',
                    c.freetime || '-', c.deliveryDate || '-', c.deliveryTime || '-',
                    c.destination || '-', c.notes || '-', c.containerSize || '-', c.vesselName || '-'
                ]);
            });
        });

        const filename = `吉井電気_ドレージ手配_${formatYYMM(ctx.currentMonthStr)}.xlsx`;

        exportToExcelSimple({
            title: `吉井電気 ドレージ手配 [仕入先: ${ctx.selectedVendorFilter || 'ALL'}]`,
            headers, rows, filename
        });
    };

    const isReadOnlyUser = ctx.authUser && !ctx.authUser.canEdit;

    return (
        <div className="p-4 bg-white flex-grow flex flex-col h-full">
            <div className="hidden print:block font-bold text-sm text-black mb-1 border-b pb-0.5 text-left w-full">
                吉井電気 ドレージ手配 [仕入先: {ctx.selectedVendorFilter || 'ALL'}]
            </div>

            <div className="flex justify-between items-center mb-2 no-print flex-shrink-0">
                <div className="flex gap-3 items-center bg-gray-50 p-1.5 rounded border">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold">吉井電気 ドレージ手配</h2>
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
                                <option value={2025}>2025年度</option>
                                <option value={2026}>2026年度</option>
                                <option value={2027}>2027年度</option>
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
                <table className="alloc-print-table w-full text-center border-collapse">
                    <thead className="sticky top-0 z-30 bg-gray-200 shadow-sm">
                        <tr className="table-row-compact">
                            <th className="p-0.5 border w-[75px] text-xs text-center align-middle">管理番号</th>
                            <th className="p-0.5 border w-[70px] text-xs align-middle">進行状況</th>
                            <th className="p-0.5 border w-[105px] text-xs align-middle">コンテナNO.</th>
                            <th className="p-0.5 border min-w-[130px] text-xs align-middle">積載型式</th>
                            <th className="p-0.5 border w-[65px] text-xs align-middle">割振数</th>
                            <th className="p-0.5 border w-[125px] bg-emerald-50 text-[10px] text-emerald-900 align-middle">
                                補充部品 (PCS)<br/>
                                <span className="inline-block w-[36px] text-center">外装箱</span>
                                <span className="inline-block w-[36px] text-center">個装箱</span>
                                <span className="inline-block w-[36px] text-center">ラベル</span>
                            </th>
                            <th className="p-0.5 border w-[70px] text-xs align-middle">到着港</th>
                            <th className="p-0.5 border w-[80px] text-xs align-middle">ETD</th>
                            <th className="p-0.5 border w-[80px] text-xs align-middle">ETA</th>
                            <th className="p-0.5 border w-[80px] text-xs align-middle">フリータイム</th>
                            <th className="p-0.5 border w-[175px] bg-emerald-50 text-xs text-emerald-900 align-middle">
                                納品日時<br/>
                                <span className="inline-block w-[85px] text-center">納品日</span>
                                <span className="inline-block w-[80px] text-center">時間</span>
                            </th>
                            <th className="p-0.5 border w-[170px] text-xs align-middle">納品先</th>
                            <th className="p-0.5 border min-w-[150px] text-xs align-middle">備考</th>
                            <th className="p-0.5 border w-[55px] text-xs align-middle">サイズ</th>
                            <th className="p-0.5 border w-[90px] text-xs align-middle">本船名</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedMonths.length === 0 ? (
                            <tr><td colSpan="15" className="p-4 text-center text-gray-500 font-bold">データが存在しません。</td></tr>
                        ) : (
                            sortedMonths.map(mo => {
                                const containersInMonth = groupedMap[mo] || [];
                                const handleGridNav = ctx.createGridNav(`y-dray-${mo}`, containersInMonth.length - 1, 14);

                                return (
                                    <React.Fragment key={mo}>
                                        <tr id={`dray-month-hdr-${mo}`}>
                                            <td colSpan="15" className="bg-emerald-100 text-emerald-900 font-bold text-xs px-2 py-1 text-left border-y border-emerald-300">
                                                ■ {mo.replace('-', '年')}月 納品分 {mo === ctx.currentMonthStr && <span className="ml-2 bg-emerald-700 text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm">★当月</span>}
                                            </td>
                                        </tr>
                                        {containersInMonth.map((container, idx) => {
                                            const totalQty = calculateContainerTotalQty(container.allocations);
                                            const activeAllocEntries = Object.entries(container.allocations || {}).filter(([_, q]) => Number(q) > 0);

                                            const origTime = (container.originals || {}).deliveryTime;
                                            const currTime = container.deliveryTime || '';
                                            const isTimeChanged = origTime !== undefined && origTime !== null && (
                                                (origTime !== '' && currTime === '') || 
                                                (origTime !== '' && currTime !== '' && origTime !== currTime) || 
                                                (origTime === '' && currTime !== '' && (container.originalMetas || {}).deliveryTime)
                                            );

                                            return (
                                                <tr key={container.id || `dray-${mo}-${idx}`} className="hover:bg-emerald-50/60 border-b table-row-compact">
                                                    <td className="p-0.5 border text-center align-middle readonly-cell bg-gray-100">
                                                        <LocalInput value={container.managementNo} readOnly={true} className="text-center text-xs font-bold readonly-cell bg-gray-100 cursor-not-allowed" dataGridId={`y-dray-${mo}-${idx}-0`} onGridKeyDown={handleGridNav} />
                                                    </td>

                                                    <td className="p-0.5 border text-center align-middle readonly-cell bg-gray-100">
                                                        <DynamicSelect value={container.status} disabled={true} category="statuses" options={ctx.masterData.common.statuses} dataGridId={`y-dray-${mo}-${idx}-1`} onGridKeyDown={handleGridNav} className="w-full text-xs border-none bg-transparent outline-none text-center px-0 readonly-cell bg-gray-100 cursor-not-allowed" />
                                                    </td>

                                                    <td className="p-0.5 border text-center align-middle readonly-cell bg-gray-100">
                                                        <LocalInput value={container.containerNo} readOnly={true} className="text-center text-xs font-mono readonly-cell bg-gray-100 cursor-not-allowed" dataGridId={`y-dray-${mo}-${idx}-2`} onGridKeyDown={handleGridNav} />
                                                    </td>

                                                    {/* ★ 積載型式 (ドレージ): 右側の数値表示を 12px / font-mono / font-normal (標準ウェイト) へ調整 */}
                                                    <td className="border text-xs text-left px-1 py-0.5 align-middle readonly-cell bg-gray-100">
                                                        {activeAllocEntries.length === 0 ? (
                                                            <span className="text-gray-400 text-[10px] italic">未割当</span>
                                                        ) : (
                                                            <div className="space-y-0.5">
                                                                {activeAllocEntries.map(([m, q]) => (
                                                                    <div key={m} className="flex justify-between items-center text-xs h-[20px]">
                                                                        <span className="font-bold text-gray-700">{m}</span>
                                                                        <span className="font-mono text-slate-700 font-normal ml-1">{Number(q).toLocaleString()}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td className="border font-mono text-xs text-right pr-1 bg-gray-100 readonly-cell align-middle text-gray-700">{totalQty > 0 ? totalQty.toLocaleString() : '0'}</td>

                                                    {/* ★ 補充部品 (ドレージ): fontWeight:'normal' (標準ウェイト) に変更し bold 除去 */}
                                                    <td className="border text-center px-0 py-0.5 align-middle readonly-cell bg-gray-100">
                                                        {activeAllocEntries.length === 0 ? (
                                                            <div className="flex justify-center items-center gap-0.5 h-[20px]">
                                                                <span className="text-[10px] text-gray-400">-</span>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-0.5">
                                                                {activeAllocEntries.map(([m, _]) => {
                                                                    const sparePartsObj = container.spareParts || {};
                                                                    const modelSpare = sparePartsObj[m] || {};

                                                                    const outerVal = modelSpare.outerBox !== undefined ? modelSpare.outerBox : (container.spareOuter !== undefined ? container.spareOuter : '');
                                                                    const innerVal = modelSpare.innerBox !== undefined ? modelSpare.innerBox : (container.spareInner !== undefined ? container.spareInner : '');
                                                                    const labelVal = modelSpare.label !== undefined ? modelSpare.label : (container.spareLabel !== undefined ? container.spareLabel : '');

                                                                    const spareInputStyleReadOnly = {
                                                                        width: '36px',
                                                                        height: '20px',
                                                                        fontSize: '12px',
                                                                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                                                        fontWeight: 'normal',
                                                                        textAlign: 'center',
                                                                        border: 'none',
                                                                        background: 'transparent',
                                                                        outline: 'none',
                                                                        color: '#374151'
                                                                    };

                                                                    return (
                                                                        <div key={m} className="flex justify-center items-center gap-0.5 h-[20px]">
                                                                            <input 
                                                                                type="text" 
                                                                                value={outerVal} 
                                                                                disabled={true} 
                                                                                style={spareInputStyleReadOnly} 
                                                                                placeholder="0"
                                                                            />
                                                                            <input 
                                                                                type="text" 
                                                                                value={innerVal} 
                                                                                disabled={true} 
                                                                                style={spareInputStyleReadOnly} 
                                                                                placeholder="0"
                                                                            />
                                                                            <input 
                                                                                type="text" 
                                                                                value={labelVal} 
                                                                                disabled={true} 
                                                                                style={spareInputStyleReadOnly} 
                                                                                placeholder="0"
                                                                            />
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td className="p-0.5 border text-center align-middle readonly-cell bg-gray-100">
                                                        <DynamicSelect value={container.port} disabled={true} category="ports" options={ctx.masterData.yoshii.ports} dataGridId={`y-dray-${mo}-${idx}-3`} onGridKeyDown={handleGridNav} className="w-full text-xs border-none bg-transparent outline-none text-center px-0 readonly-cell bg-gray-100 cursor-not-allowed" />
                                                    </td>

                                                    <td className="p-0.5 border text-center align-middle readonly-cell bg-gray-100">
                                                        <LocalInput type="qc-date" value={container.etd} readOnly={true} refDate={mo} className="text-left pl-2 text-xs readonly-cell bg-gray-100 cursor-not-allowed" dataGridId={`y-dray-${mo}-${idx}-4`} onGridKeyDown={handleGridNav} />
                                                    </td>

                                                    <td className="p-0.5 border text-center align-middle readonly-cell bg-gray-100">
                                                        <LocalInput type="qc-date" value={container.eta} readOnly={true} refDate={mo} className="text-left pl-2 text-xs readonly-cell bg-gray-100 cursor-not-allowed" dataGridId={`y-dray-${mo}-${idx}-5`} onGridKeyDown={handleGridNav} />
                                                    </td>

                                                    <td className="p-0.5 border text-center align-middle readonly-cell bg-gray-100">
                                                        <LocalInput type="qc-date" value={container.freetime} readOnly={true} refDate={mo} className="text-left pl-2 text-xs readonly-cell bg-gray-100 cursor-not-allowed" dataGridId={`y-dray-${mo}-${idx}-6`} onGridKeyDown={handleGridNav} />
                                                    </td>

                                                    <td className={`border text-center px-1 py-0.5 align-middle ${isReadOnlyUser ? 'readonly-cell bg-gray-100' : 'bg-emerald-50/30'}`}>
                                                        <div className="flex items-center justify-between gap-0.5 w-full">
                                                            <div className="w-[85px] flex-shrink-0">
                                                                <LocalInput 
                                                                    type="qc-date" 
                                                                    value={container.deliveryDate} 
                                                                    originalValue={(container.originals || {}).deliveryDate} 
                                                                    originalMeta={(container.originalMetas || {}).deliveryDate} 
                                                                    onChange={(v, orig) => ctx.updateContainer(container.id, { deliveryDate: v, originals: { ...(container.originals || {}), deliveryDate: container.originals?.deliveryDate !== undefined ? container.originals.deliveryDate : orig }, originalMetas: { ...(container.originalMetas || {}), deliveryDate: container.originalMetas?.deliveryDate !== undefined ? container.originalMetas.deliveryDate : `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}` } }, mo, 'yoshii', '納品日')} 
                                                                    refDate={mo} 
                                                                    className={`text-left pl-2 text-xs font-bold ${isReadOnlyUser ? 'readonly-cell bg-gray-100' : ''}`} 
                                                                    dataGridId={`y-dray-${mo}-${idx}-7`} 
                                                                    onGridKeyDown={handleGridNav} 
                                                                />
                                                            </div>
                                                            <div className={`w-[80px] flex-shrink-0 flex items-center gap-0.5 relative ${isTimeChanged ? 'qc-change-dot' : ''}`} title={isTimeChanged ? `変更前: ${(container.originals || {}).deliveryTime || '未設定'} (${(container.originalMetas || {}).deliveryTime || ''})` : ''}>
                                                                <input 
                                                                    type="time" 
                                                                    value={container.deliveryTime || ''} 
                                                                    onChange={e => {
                                                                        const val = e.target.value;
                                                                        const prevValue = container.deliveryTime || '';
                                                                        const orig = container.originals?.deliveryTime !== undefined ? container.originals.deliveryTime : prevValue;
                                                                        ctx.updateContainer(container.id, { deliveryTime: val, originals: { ...(container.originals || {}), deliveryTime: orig }, originalMetas: { ...(container.originalMetas || {}), deliveryTime: container.originalMetas?.deliveryTime || `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}` } }, mo, 'yoshii', '納品時間');
                                                                    }} 
                                                                    className={`border rounded px-0.5 py-0 text-[10px] font-bold text-center w-[66px] h-[22px] outline-none focus:ring-1 focus:ring-indigo-500 ${isReadOnlyUser ? 'readonly-cell bg-gray-100 cursor-not-allowed' : 'bg-white cursor-pointer'}`}
                                                                    disabled={isReadOnlyUser}
                                                                />
                                                                {container.deliveryTime && !isReadOnlyUser ? (
                                                                    <button 
                                                                        type="button" 
                                                                        onClick={() => {
                                                                            const prevValue = container.deliveryTime || '';
                                                                            const orig = container.originals?.deliveryTime !== undefined ? container.originals.deliveryTime : prevValue;
                                                                            ctx.updateContainer(container.id, { deliveryTime: '', originals: { ...(container.originals || {}), deliveryTime: orig }, originalMetas: { ...(container.originalMetas || {}), deliveryTime: container.originalMetas?.deliveryTime || `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}` } }, mo, 'yoshii', '納品時間 (削除)');
                                                                        }} 
                                                                        className="w-3.5 h-3.5 flex items-center justify-center text-[9px] font-bold text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded transition" 
                                                                        title="時刻をクリア"
                                                                    >
                                                                        ✕
                                                                    </button>
                                                                ) : <div className="w-3.5"></div>}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className={`p-0.5 border text-center align-middle whitespace-normal break-words ${isReadOnlyUser ? 'readonly-cell bg-gray-100' : ''}`}>
                                                        <DynamicSelect value={container.destination} originalValue={(container.originals || {}).destination} originalMeta={(container.originalMetas || {}).destination} onChange={(val, cat, orig) => ctx.handleSelectChange(container.id, 'destination', true, 'yoshii', false, '納品先')(val, cat, orig)} category="destinations" options={ctx.masterData.yoshii.destinations} dataGridId={`y-dray-${mo}-${idx}-8`} onGridKeyDown={handleGridNav} className={`w-full text-xs border-none bg-transparent outline-none text-center px-0 h-auto whitespace-normal break-words ${isReadOnlyUser ? 'readonly-cell bg-gray-100' : ''}`} />
                                                    </td>

                                                    <td className={`p-0.5 border text-center align-middle whitespace-normal break-words ${isReadOnlyUser ? 'readonly-cell bg-gray-100' : ''}`}>
                                                        <LocalTextArea value={container.notes} originalValue={(container.originals || {}).notes} originalMeta={(container.originalMetas || {}).notes} onChange={(v, orig) => ctx.updateContainer(container.id, { notes: v }, mo, 'yoshii', '備考')} isCompact={true} className={`h-auto whitespace-pre-wrap break-words ${isReadOnlyUser ? 'readonly-cell bg-gray-100' : ''}`}/>
                                                    </td>

                                                    <td className="p-0.5 border text-center align-middle readonly-cell bg-gray-100">
                                                        <DynamicSelect value={container.containerSize} disabled={true} category="containerSizes" options={ctx.masterData.common.containerSizes} dataGridId={`y-dray-${mo}-${idx}-9`} onGridKeyDown={handleGridNav} className="w-full text-xs border-none bg-transparent outline-none text-center px-0 readonly-cell bg-gray-100 cursor-not-allowed" />
                                                    </td>

                                                    <td className="p-0.5 border text-center align-middle readonly-cell bg-gray-100">
                                                        <LocalInput value={container.managementNo} readOnly={true} className="text-center text-xs readonly-cell bg-gray-100 cursor-not-allowed" dataGridId={`y-dray-${mo}-${idx}-10`} onGridKeyDown={handleGridNav} />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <ExportPrintModal isOpen={exportModal.isOpen} onClose={() => setExportModal({ isOpen: false, type: 'excel' })} screenName="ドレージ手配" currentMonthStr={ctx.currentMonthStr} defaultMode="year" onStartExport={handleExecuteExport} />
        </div>
    );
};