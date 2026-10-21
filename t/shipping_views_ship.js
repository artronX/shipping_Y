// shipping_views_ship.js
// =========================================================
// shipping_views_ship.js - 出荷日程・ドレージ画面モジュール
// ★ WebVer. 123 対応 / _js011 バージョン繰り上げ版
// ★ 最上行ファイル名識別コメント復元
// ★ ドレージ画面 編集不可セル(割振数/総数量/閲覧時セル)のグレー背景(readonly-cell)復元
// ★ 納品日カレンダー選択時(08/30等)の空欄化不具合＆アイコン・文字被りを完全修復
// ★ 納品先・備考セルの折り返し表示(文字切れ防止)対応
// ★ 管理番号・到着港・総数量など全単一行セルの【上下中央揃え(vertical-align: middle)】統一
// ★ フリータイム列のテキスト専用化(カレンダーピッカー排除)
// =========================================================

const JS_SHIP_VERSION = '_js011';

// 【ヘルパー: コンテナ内割振り総数量の動的自動計算】
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

    // ★ V94正統仕様: 納入月表示切替コントロールステート
    const [displayMode, setDisplayMode] = React.useState('year'); // 'all', 'current', 'year', 'month', 'range'
    const [selectedYear, setSelectedYear] = React.useState(2026);
    const [selectedSingleMonth, setSelectedSingleMonth] = React.useState(ctx.currentMonthStr || '2026-10');
    const [rangeStartMonth, setRangeStartMonth] = React.useState('2026-04');
    const [rangeEndMonth, setRangeEndMonth] = React.useState('2027-03');

    const [focusTargetIdx, setFocusTargetIdx] = React.useState(null);
    const [deleteConfirmTarget, setDeleteConfirmTarget] = React.useState(null);

    // ★ スクロール位置の保持・当月区分ヘッダーの「先頭ピタリ表示」補正
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

    // 全コンテナの取得とフィルタリング
    let rawContainers = ctx.containers.filter(c => c.company === 'yoshii');

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

    const getNaturalMgmtKey = (c) => {
        if (c.allocNo !== undefined && c.allocNo !== null) return c.allocNo;
        if (c.sortOrder !== undefined && c.sortOrder !== null) return c.sortOrder;
        const mgmt = String(c.managementNo || '').trim();
        if (!mgmt || mgmt === '-') return 999999;
        const match = mgmt.match(/^([A-Za-z]+)(\d+)(?:-(\d+))?\$/);
        if (match) {
            const prefix = match[1].toUpperCase();
            const num1 = parseInt(match[2], 10);
            const num2 = match[3] ? parseInt(match[3], 10) : 0;
            const prefixPriority = prefix === 'A' ? 0 : (prefix === 'YK' ? 1 : 2);
            return prefixPriority * 10000 + num1 * 10 + num2;
        }
        return 500000;
    };

    const groupedMap = {};
    rawContainers.forEach(c => {
        const mo = c.deliveryMonth || '未設定';
        if (!groupedMap[mo]) groupedMap[mo] = [];
        groupedMap[mo].push(c);
    });

    Object.keys(groupedMap).forEach(mo => {
        groupedMap[mo].sort((a, b) => {
            const keyA = getNaturalMgmtKey(a);
            const keyB = getNaturalMgmtKey(b);
            if (keyA !== keyB) return keyA - keyB;
            return (a.createdAt || '').localeCompare(b.createdAt || '');
        });
    });

    const sortedMonths = Object.keys(groupedMap).sort();

    const handleExecuteExport = () => {
        if (exportModal.type === 'print') {
            setTimeout(() => window.print(), 300);
            return;
        }

        const headers = ['納品月', '管理番号', '進行状況', 'コンテナNO.', '積載型式', '外装箱', '化粧箱', 'ラベル', '割振数', '総数量', '到着港', 'ETD', 'ETA', 'フリータイム', '納品日', '時間', '納品先', '備考', 'サイズ', '本船名'];
        
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
                    c.spareOuter || '0', c.spareInner || '0', c.spareLabel || '0',
                    totalQty, totalQty, c.port || '-', c.etd || '-', c.eta || '-',
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

    const handleExecuteDeleteRow = async (containerId) => {
        if (containerId) {
            await ctx.deleteContainer(containerId, '吉井電気 出荷日程表');
        }
        setDeleteConfirmTarget(null);
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

                    {/* ★ V94完全移植: 納入月表示切替 コントロールバー */}
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

            <div className="table-container flex-grow border rounded shadow-inner" ref={ctx.tableContainerRef} onScroll={handleScroll}>
                <table className="alloc-print-table w-max text-center border-collapse">
                    <thead className="sticky top-0 z-30 bg-gray-200 shadow-sm">
                        <tr className="table-row-compact">
                            <th className="p-0.5 border w-10 text-xs no-print">移動</th>
                            <th className="p-0.5 border w-[80px] min-w-[80px] text-xs text-center">管理番号</th>
                            <th className="p-0.5 border w-[75px] min-w-[75px] text-xs">進行状況</th>
                            <th className="p-0.5 border w-[110px] min-w-[110px] text-xs">コンテナNO.</th>
                            <th className="p-0.5 border min-w-[130px] text-xs">積載型式</th>
                            <th className="p-0.5 border w-[85px] min-w-[85px] bg-emerald-50 text-[10px] text-emerald-900">
                                補充部品 (PCS)<br/>
                                <span className="inline-block w-6 text-center">外装箱</span>
                                <span className="inline-block w-6 text-center">化粧箱</span>
                                <span className="inline-block w-6 text-center">ラベル</span>
                            </th>
                            <th className="p-0.5 border w-[65px] min-w-[65px] text-xs">割振数</th>
                            <th className="p-0.5 border w-[65px] min-w-[65px] text-xs bg-emerald-100 font-bold text-emerald-900">総数量</th>
                            <th className="p-0.5 border w-[75px] min-w-[75px] text-xs">到着港</th>
                            <th className="p-0.5 border w-[70px] min-w-[70px] text-xs">ETD</th>
                            <th className="p-0.5 border w-[70px] min-w-[70px] text-xs">ETA</th>
                            <th className="p-0.5 border w-[85px] min-w-[85px] text-xs">フリータイム</th>
                            <th className="p-0.5 border w-[155px] min-w-[155px] bg-emerald-50 text-xs text-emerald-900">
                                納品日時<br/>
                                <span className="inline-block w-16 text-center">納品日</span>
                                <span className="inline-block w-16 text-center">時間</span>
                            </th>
                            <th className="p-0.5 border w-[155px] min-w-[155px] text-xs">納品先</th>
                            <th className="p-0.5 border min-w-[160px] text-xs">備考</th>
                            <th className="p-0.5 border w-[65px] min-w-[65px] text-xs">サイズ</th>
                            <th className="p-0.5 border w-[100px] min-w-[100px] text-xs">本船名</th>
                            <th className="p-0.5 border w-10 text-xs no-print">削除</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedMonths.length === 0 ? (
                            <tr><td colSpan="18" className="p-4 text-center text-gray-500 font-bold">該当する条件のデータが存在しません。</td></tr>
                        ) : (
                            sortedMonths.map(mo => {
                                const containersInMonth = groupedMap[mo] || [];
                                const handleGridNav = ctx.createGridNav(`y-ship-${mo}`, containersInMonth.length - 1, 15);

                                return (
                                    <React.Fragment key={mo}>
                                        <tr id={`ship-month-hdr-${mo}`} className="month-divider">
                                            <td colSpan="18" className="bg-slate-200 font-bold text-slate-800 text-xs px-2 py-1 text-left">
                                                ■ {mo.replace('-', '年')}月 納品分 {mo === ctx.currentMonthStr && <span className="ml-2 bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded">★当月</span>}
                                            </td>
                                        </tr>
                                        {containersInMonth.map((container, idx) => {
                                            const totalQty = calculateContainerTotalQty(container.allocations);
                                            const activeAllocEntries = Object.entries(container.allocations || {}).filter(([_, q]) => Number(q) > 0);

                                            return (
                                                <tr 
                                                    key={container.id || `ship-${mo}-${idx}`}
                                                    onDragOver={(e) => ctx.handleDragOver(e, container.id)}
                                                    onDrop={(e) => ctx.handleDrop(e, container.id, containersInMonth)}
                                                    onDragEnd={ctx.handleDragEnd}
                                                    className={`hover:bg-emerald-50 table-row-compact ${ctx.dragOverRowId === container.id ? (ctx.dragDirection === 'top' ? 'drag-over-top' : 'drag-over-bottom') : ''} ${ctx.draggedRowId === container.id ? 'dragging-row' : ''}`}
                                                >
                                                    <td draggable={!!container.id && (ctx.authUser ? ctx.authUser.canEdit : true)} onDragStart={(e) => ctx.handleDragStart(e, container.id)} className="p-0.5 border bg-white text-center align-middle drag-handle text-gray-400 hover:text-emerald-600 font-bold text-sm cursor-grab active:cursor-grabbing no-print">≡</td>
                                                    
                                                    {/* 管理番号: 上下中央揃え & 中央配置 */}
                                                    <td className="matrix-td px-0 align-middle">
                                                        <LocalInput value={container.managementNo} originalValue={(container.originals || {}).managementNo} originalMeta={(container.originalMetas || {}).managementNo} onChange={(v, orig) => ctx.updateContainer(container.id, { managementNo: v, originals: { ...(container.originals || {}), managementNo: container.originals?.managementNo !== undefined ? container.originals.managementNo : orig }, originalMetas: { ...(container.originalMetas || {}), managementNo: container.originalMetas?.managementNo !== undefined ? container.originalMetas.managementNo : `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}` } }, mo, 'yoshii', '管理番号')} className="matrix-input text-center text-xs font-bold input-compact" dataGridId={`y-ship-${mo}-${idx}-0`} onGridKeyDown={handleGridNav} />
                                                    </td>

                                                    <td className="matrix-td px-0 align-middle">
                                                        <DynamicSelect value={container.status} originalValue={(container.originals || {}).status} originalMeta={(container.originalMetas || {}).status} onChange={(val, cat, orig) => ctx.handleSelectChange(container.id, 'status', true, 'common', false, '進行状況')(val, cat, orig)} category="statuses" options={ctx.masterData.common.statuses} dataGridId={`y-ship-${mo}-${idx}-1`} onGridKeyDown={handleGridNav} className="w-full text-xs border-none bg-transparent outline-none text-center px-0 input-compact" />
                                                    </td>

                                                    <td className="matrix-td px-0 align-middle">
                                                        <LocalInput value={container.containerNo} originalValue={(container.originals || {}).containerNo} originalMeta={(container.originalMetas || {}).containerNo} onChange={(v, orig) => ctx.updateContainer(container.id, { containerNo: v }, mo, 'yoshii', 'コンテナNO.')} className="matrix-input text-center text-xs font-mono input-compact" dataGridId={`y-ship-${mo}-${idx}-2`} onGridKeyDown={handleGridNav} />
                                                    </td>

                                                    <td className="border text-xs text-left px-1 py-0.5 bg-gray-50/50 align-middle">
                                                        {activeAllocEntries.length === 0 ? (
                                                            <span className="text-gray-400 text-[10px] italic">未割当</span>
                                                        ) : (
                                                            <div className="space-y-0.5">
                                                                {activeAllocEntries.map(([m, q]) => (
                                                                    <div key={m} className="flex justify-between items-center text-[11px]">
                                                                        <span className="font-bold text-gray-800">{m}</span>
                                                                        <span className="font-mono text-emerald-800 font-bold ml-1">{Number(q).toLocaleString()}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td className="border text-center px-0 py-0.5 bg-emerald-50/30 align-middle">
                                                        <div className="flex justify-center items-center gap-0.5">
                                                            <input type="number" value={container.spareOuter || ''} onChange={e => ctx.updateContainer(container.id, { spareOuter: e.target.value }, mo, 'yoshii', '外装箱')} className="spare-part-input" placeholder="0"/>
                                                            <input type="number" value={container.spareInner || ''} onChange={e => ctx.updateContainer(container.id, { spareInner: e.target.value }, mo, 'yoshii', '化粧箱')} className="spare-part-input" placeholder="0"/>
                                                            <input type="number" value={container.spareLabel || ''} onChange={e => ctx.updateContainer(container.id, { spareLabel: e.target.value }, mo, 'yoshii', 'ラベル')} className="spare-part-input" placeholder="0"/>
                                                        </div>
                                                    </td>

                                                    {/* 割振数: グレー背景 (readonly-cell) & 上下中央揃え */}
                                                    <td className="border font-mono text-xs text-right pr-1 bg-gray-100 readonly-cell align-middle">{totalQty > 0 ? totalQty.toLocaleString() : '0'}</td>
                                                    
                                                    {/* 総数量: 薄緑背景 & 上下中央揃え (動的自動計算) */}
                                                    <td className="border font-mono text-xs text-right pr-1 bg-emerald-100 text-emerald-900 font-bold align-middle">{totalQty > 0 ? totalQty.toLocaleString() : '0'}</td>

                                                    <td className="matrix-td px-0 align-middle">
                                                        <DynamicSelect value={container.port} originalValue={(container.originals || {}).port} originalMeta={(container.originalMetas || {}).port} onChange={(val, cat, orig) => ctx.handleSelectChange(container.id, 'port', true, 'yoshii', false, '到着港')(val, cat, orig)} category="ports" options={ctx.masterData.yoshii.ports} dataGridId={`y-ship-${mo}-${idx}-3`} onGridKeyDown={handleGridNav} className="w-full text-xs border-none bg-transparent outline-none text-center px-0 input-compact" />
                                                    </td>

                                                    <td className="matrix-td px-0 align-middle">
                                                        <LocalInput type="qc-date" value={container.etd} originalValue={(container.originals || {}).etd} originalMeta={(container.originalMetas || {}).etd} onChange={(v, orig) => ctx.updateContainer(container.id, { etd: v }, mo, 'yoshii', 'ETD')} refDate={mo} className="matrix-input text-center text-xs input-compact" dataGridId={`y-ship-${mo}-${idx}-4`} onGridKeyDown={handleGridNav} />
                                                    </td>

                                                    <td className="matrix-td px-0 align-middle">
                                                        <LocalInput type="qc-date" value={container.eta} originalValue={(container.originals || {}).eta} originalMeta={(container.originalMetas || {}).eta} onChange={(v, orig) => ctx.updateContainer(container.id, { eta: v }, mo, 'yoshii', 'ETA')} refDate={mo} className="matrix-input text-center text-xs input-compact" dataGridId={`y-ship-${mo}-${idx}-5`} onGridKeyDown={handleGridNav} />
                                                    </td>

                                                    {/* フリータイム: カレンダー排除、純粋テキスト入力 */}
                                                    <td className="matrix-td px-0 align-middle">
                                                        <LocalInput type="text" value={container.freetime} originalValue={(container.originals || {}).freetime} originalMeta={(container.originalMetas || {}).freetime} onChange={(v, orig) => ctx.updateContainer(container.id, { freetime: v }, mo, 'yoshii', 'フリータイム')} className="matrix-input text-center text-xs input-compact" dataGridId={`y-ship-${mo}-${idx}-6`} onGridKeyDown={handleGridNav} />
                                                    </td>

                                                    {/* 納品日時セル (日付左配置・時間選択ピッカー正常化 & 文字被り解消) */}
                                                    <td className="border text-center px-0.5 py-0.5 bg-emerald-50/30 align-middle">
                                                        <div className="flex items-center justify-between gap-1 w-full">
                                                            <div className="w-[68px] flex-shrink-0">
                                                                <LocalInput type="qc-date" value={container.deliveryDate} originalValue={(container.originals || {}).deliveryDate} originalMeta={(container.originalMetas || {}).deliveryDate} onChange={(v, orig) => ctx.updateContainer(container.id, { deliveryDate: v }, mo, 'yoshii', '納品日')} refDate={mo} className="text-center text-xs input-compact font-bold" dataGridId={`y-ship-${mo}-${idx}-7`} onGridKeyDown={handleGridNav} />
                                                            </div>
                                                            <div className="w-[72px] flex-shrink-0 relative flex items-center">
                                                                <input 
                                                                    type="time" 
                                                                    value={container.deliveryTime || ''} 
                                                                    onChange={e => ctx.updateContainer(container.id, { deliveryTime: e.target.value }, mo, 'yoshii', '納品時間')} 
                                                                    className="border rounded px-1 py-0 text-[11px] font-bold bg-white text-center w-full h-[20px] cursor-pointer outline-none focus:ring-1 focus:ring-indigo-500"
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* 納品先: 文字列長時の折り返し表示対応 & 上下中央揃え */}
                                                    <td className="matrix-td px-0 align-middle whitespace-normal word-break-all">
                                                        <DynamicSelect value={container.destination} originalValue={(container.originals || {}).destination} originalMeta={(container.originalMetas || {}).destination} onChange={(val, cat, orig) => ctx.handleSelectChange(container.id, 'destination', true, 'yoshii', false, '納品先')(val, cat, orig)} category="destinations" options={ctx.masterData.yoshii.destinations} dataGridId={`y-ship-${mo}-${idx}-8`} onGridKeyDown={handleGridNav} className="w-full text-xs border-none bg-transparent outline-none text-center px-0 h-auto whitespace-normal" />
                                                    </td>

                                                    {/* 備考: 折り返し表示対応 */}
                                                    <td className="matrix-td px-0 align-middle whitespace-normal word-break-all">
                                                        <LocalTextArea value={container.notes} originalValue={(container.originals || {}).notes} originalMeta={(container.originalMetas || {}).notes} onChange={(v, orig) => ctx.updateContainer(container.id, { notes: v }, mo, 'yoshii', '備考')} isCompact={true} className="input-compact h-auto whitespace-normal"/>
                                                    </td>

                                                    <td className="matrix-td px-0 align-middle">
                                                        <DynamicSelect value={container.containerSize} originalValue={(container.originals || {}).containerSize} originalMeta={(container.originalMetas || {}).containerSize} onChange={(val, cat, orig) => ctx.handleSelectChange(container.id, 'containerSize', true, 'common', false, 'サイズ')(val, cat, orig)} category="containerSizes" options={ctx.masterData.common.containerSizes} dataGridId={`y-ship-${mo}-${idx}-9`} onGridKeyDown={handleGridNav} className="w-full text-xs border-none bg-transparent outline-none text-center px-0 input-compact" />
                                                    </td>

                                                    <td className="matrix-td px-0 align-middle">
                                                        <LocalInput value={container.vesselName} originalValue={(container.originals || {}).vesselName} originalMeta={(container.originalMetas || {}).originalMetas?.vesselName} onChange={(v, orig) => ctx.updateContainer(container.id, { vesselName: v }, mo, 'yoshii', '本船名')} className="matrix-input text-center text-xs input-compact" dataGridId={`y-ship-${mo}-${idx}-10`} onGridKeyDown={handleGridNav} />
                                                    </td>

                                                    <td className="p-0.5 border text-center align-middle whitespace-nowrap relative no-print">
                                                        <button tabIndex="-1" onClick={() => setDeleteConfirmTarget(deleteConfirmTarget === idx ? null : idx)} disabled={ctx.authUser && !ctx.authUser.canEdit} className="text-red-500 hover:text-red-700 disabled:opacity-30 font-bold text-lg leading-none" title="削除">×</button>
                                                        {deleteConfirmTarget === idx && (
                                                            <div className="absolute right-8 top-1/2 -translate-y-1/2 bg-white border border-red-300 shadow-lg rounded p-2 z-50 text-xs flex items-center gap-2 font-bold whitespace-nowrap">
                                                                <span className="text-red-700">削除しますか？</span>
                                                                <button onClick={() => handleExecuteDeleteRow(container.id)} className="bg-red-600 hover:bg-red-700 text-white px-2 py-0.5 rounded text-[11px]">削除</button>
                                                                <button onClick={() => setDeleteConfirmTarget(null)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-0.5 rounded text-[11px]">消す</button>
                                                            </div>
                                                        )}
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

    // ★ V94完全移植: 納入月表示切替 コントロールステート
    const [displayMode, setDisplayMode] = React.useState('year'); // 'all', 'current', 'year', 'month', 'range'
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

    let rawContainers = ctx.containers.filter(c => c.company === 'yoshii');

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
    rawContainers.forEach(c => {
        const mo = c.deliveryMonth || '未設定';
        if (!groupedMap[mo]) groupedMap[mo] = [];
        groupedMap[mo].push(c);
    });

    const sortedMonths = Object.keys(groupedMap).sort();

    const handleExecuteExport = () => {
        if (exportModal.type === 'print') {
            setTimeout(() => window.print(), 300);
            return;
        }

        const headers = ['納品月', '管理番号', '進行状況', 'コンテナNO.', '積載型式', '外装箱', '化粧箱', 'ラベル', '割振数', '総数量', '到着港', 'ETD', 'ETA', 'フリータイム', '納品日', '時間', '納品先', '備考', 'サイズ', '本船名'];
        
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
                    c.spareOuter || '0', c.spareInner || '0', c.spareLabel || '0',
                    totalQty, totalQty, c.port || '-', c.etd || '-', c.eta || '-',
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
                吉井電気 ドレージ手配 [仕入先: \${ctx.selectedVendorFilter || 'ALL'}]
            </div>

            <div className="flex justify-between items-center mb-2 no-print flex-shrink-0">
                <div className="flex gap-3 items-center bg-gray-50 p-1.5 rounded border">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold">吉井電気 ドレージ手配</h2>
                        <span className="bg-slate-700 text-slate-100 border border-slate-500 text-[10px] font-extrabold px-1.5 py-0.5 rounded font-mono shadow-sm">
                            {displayVer}
                        </span>
                    </div>

                    {/* ★ V94完全移植: ドレージ画面 納入月表示切替 コントロールバー */}
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

            <div className="table-container flex-grow border rounded shadow-inner" ref={ctx.tableContainerRef} onScroll={handleScroll}>
                <table className="alloc-print-table w-max text-center border-collapse">
                    <thead className="sticky top-0 z-30 bg-gray-200 shadow-sm">
                        <tr className="table-row-compact">
                            <th className="p-0.5 border w-[80px] min-w-[80px] text-xs text-center">管理番号</th>
                            <th className="p-0.5 border w-[75px] min-w-[75px] text-xs">進行状況</th>
                            <th className="p-0.5 border w-[110px] min-w-[110px] text-xs">コンテナNO.</th>
                            <th className="p-0.5 border min-w-[130px] text-xs">積載型式</th>
                            <th className="p-0.5 border w-[85px] min-w-[85px] bg-emerald-50 text-[10px] text-emerald-900">
                                補充部品 (PCS)<br/>
                                <span className="inline-block w-6 text-center">外装箱</span>
                                <span className="inline-block w-6 text-center">化粧箱</span>
                                <span className="inline-block w-6 text-center">ラベル</span>
                            </th>
                            <th className="p-0.5 border w-[65px] min-w-[65px] text-xs">割振数</th>
                            <th className="p-0.5 border w-[65px] min-w-[65px] text-xs bg-emerald-100 font-bold text-emerald-900">総数量</th>
                            <th className="p-0.5 border w-[75px] min-w-[75px] text-xs">到着港</th>
                            <th className="p-0.5 border w-[70px] min-w-[70px] text-xs">ETD</th>
                            <th className="p-0.5 border w-[70px] min-w-[70px] text-xs">ETA</th>
                            <th className="p-0.5 border w-[85px] min-w-[85px] text-xs">フリータイム</th>
                            <th className="p-0.5 border w-[155px] min-w-[155px] bg-emerald-50 text-xs text-emerald-900">
                                納品日時<br/>
                                <span className="inline-block w-16 text-center">納品日</span>
                                <span className="inline-block w-16 text-center">時間</span>
                            </th>
                            <th className="p-0.5 border w-[155px] min-w-[155px] text-xs">納品先</th>
                            <th className="p-0.5 border min-w-[160px] text-xs">備考</th>
                            <th className="p-0.5 border w-[65px] min-w-[65px] text-xs">サイズ</th>
                            <th className="p-0.5 border w-[100px] min-w-[100px] text-xs">本船名</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedMonths.length === 0 ? (
                            <tr><td colSpan="16" className="p-4 text-center text-gray-500">データが存在しません。</td></tr>
                        ) : (
                            sortedMonths.map(mo => {
                                const containersInMonth = groupedMap[mo] || [];
                                const handleGridNav = ctx.createGridNav(`y-dray-${mo}`, containersInMonth.length - 1, 15);

                                return (
                                    <React.Fragment key={mo}>
                                        <tr id={`dray-month-hdr-${mo}`} className="month-divider">
                                            <td colSpan="16" className="bg-slate-200 font-bold text-slate-800 text-xs px-2 py-1 text-left">
                                                ■ {mo.replace('-', '年')}月 納品分 {mo === ctx.currentMonthStr && <span className="ml-2 bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded">★当月</span>}
                                            </td>
                                        </tr>
                                        {containersInMonth.map((container, idx) => {
                                            const totalQty = calculateContainerTotalQty(container.allocations);
                                            const activeAllocEntries = Object.entries(container.allocations || {}).filter(([_, q]) => Number(q) > 0);

                                            return (
                                                <tr key={container.id || `dray-${mo}-${idx}`} className="hover:bg-emerald-50 border-b table-row-compact">
                                                    {/* 管理番号: 上下中央揃え */}
                                                    <td className={`matrix-td px-0 align-middle ${isReadOnlyUser ? 'readonly-cell bg-gray-100' : ''}`}>
                                                        <LocalInput value={container.managementNo} originalValue={(container.originals || {}).managementNo} originalMeta={(container.originalMetas || {}).managementNo} onChange={(v, orig) => ctx.updateContainer(container.id, { managementNo: v }, mo, 'yoshii', '管理番号')} className={`matrix-input text-center text-xs font-bold input-compact ${isReadOnlyUser ? 'readonly-cell bg-gray-100' : ''}`} dataGridId={`y-dray-${mo}-${idx}-0`} onGridKeyDown={handleGridNav} />
                                                    </td>

                                                    <td className={`matrix-td px-0 align-middle ${isReadOnlyUser ? 'readonly-cell bg-gray-100' : ''}`}>
                                                        <DynamicSelect value={container.status} originalValue={(container.originals || {}).status} originalMeta={(container.originalMetas || {}).status} onChange={(val, cat, orig) => ctx.handleSelectChange(container.id, 'status', true, 'common', false, '進行状況')(val, cat, orig)} category="statuses" options={ctx.masterData.common.statuses} dataGridId={`y-dray-${mo}-${idx}-1`} onGridKeyDown={handleGridNav} className={`w-full text-xs border-none bg-transparent outline-none text-center px-0 input-compact ${isReadOnlyUser ? 'readonly-cell bg-gray-100' : ''}`} />
                                                    </td>

                                                    <td className={`matrix-td px-0 align-middle ${isReadOnlyUser ? 'readonly-cell bg-gray-100' : ''}`}>
                                                        <LocalInput value={container.containerNo} originalValue={(container.originals || {}).containerNo} originalMeta={(container.originalMetas || {}).containerNo} onChange={(v, orig) => ctx.updateContainer(container.id, { containerNo: v }, mo, 'yoshii', 'コンテナNO.')} className={`matrix-input text-center text-xs font-mono input-compact ${isReadOnlyUser ? 'readonly-cell bg-gray-100' : ''}`} dataGridId={`y-dray-${mo}-${idx}-2`} onGridKeyDown={handleGridNav} />
                                                    </td>

                                                    <td className={`border text-xs text-left px-1 py-0.5 align-middle ${isReadOnlyUser ? 'readonly-cell bg-gray-100' : 'bg-gray-50/50'}`}>
                                                        {activeAllocEntries.length === 0 ? (
                                                            <span className="text-gray-400 text-[10px] italic">未割当</span>
                                                        ) : (
                                                            <div className="space-y-0.5">
                                                                {activeAllocEntries.map(([m, q]) => (
                                                                    <div key={m} className="flex justify-between items-center text-[11px]">
                                                                        <span className="font-bold text-gray-800">{m}</span>
                                                                        <span className="font-mono text-emerald-800 font-bold ml-1">{Number(q).toLocaleString()}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td className={`border text-center px-0 py-0.5 align-middle ${isReadOnlyUser ? 'readonly-cell bg-gray-100' : 'bg-emerald-50/30'}`}>
                                                        <div className="flex justify-center items-center gap-0.5">
                                                            <input type="number" value={container.spareOuter || ''} onChange={e => ctx.updateContainer(container.id, { spareOuter: e.target.value }, mo, 'yoshii', '外装箱')} className="spare-part-input" placeholder="0" disabled={isReadOnlyUser}/>
                                                            <input type="number" value={container.spareInner || ''} onChange={e => ctx.updateContainer(container.id, { spareInner: e.target.value }, mo, 'yoshii', '化粧箱')} className="spare-part-input" placeholder="0" disabled={isReadOnlyUser}/>
                                                            <input type="number" value={container.spareLabel || ''} onChange={e => ctx.updateContainer(container.id, { spareLabel: e.target.value }, mo, 'yoshii', 'ラベル')} className="spare-part-input" placeholder="0" disabled={isReadOnlyUser}/>
                                                        </div>
                                                    </td>

                                                    {/* ★ 割振数: 編集不可グレー背景 (readonly-cell) */}
                                                    <td className="border font-mono text-xs text-right pr-1 bg-gray-100 readonly-cell align-middle text-gray-700">{totalQty > 0 ? totalQty.toLocaleString() : '0'}</td>
                                                    
                                                    {/* ★ 総数量: 薄緑背景 (編集不可) */}
                                                    <td className="border font-mono text-xs text-right pr-1 bg-emerald-100 text-emerald-900 font-bold align-middle">{totalQty > 0 ? totalQty.toLocaleString() : '0'}</td>

                                                    <td className={`matrix-td px-0 align-middle ${isReadOnlyUser ? 'readonly-cell bg-gray-100' : ''}`}>
                                                        <DynamicSelect value={container.port} originalValue={(container.originals || {}).port} originalMeta={(container.originalMetas || {}).port} onChange={(val, cat, orig) => ctx.handleSelectChange(container.id, 'port', true, 'yoshii', false, '到着港')(val, cat, orig)} category="ports" options={ctx.masterData.yoshii.ports} dataGridId={`y-dray-${mo}-${idx}-3`} onGridKeyDown={handleGridNav} className={`w-full text-xs border-none bg-transparent outline-none text-center px-0 input-compact ${isReadOnlyUser ? 'readonly-cell bg-gray-100' : ''}`} />
                                                    </td>

                                                    <td className={`matrix-td px-0 align-middle ${isReadOnlyUser ? 'readonly-cell bg-gray-100' : ''}`}>
                                                        <LocalInput type="qc-date" value={container.etd} originalValue={(container.originals || {}).etd} originalMeta={(container.originalMetas || {}).etd} onChange={(v, orig) => ctx.updateContainer(container.id, { etd: v }, mo, 'yoshii', 'ETD')} refDate={mo} className={`matrix-input text-center text-xs input-compact ${isReadOnlyUser ? 'readonly-cell bg-gray-100' : ''}`} dataGridId={`y-dray-${mo}-${idx}-4`} onGridKeyDown={handleGridNav} />
                                                    </td>

                                                    <td className={`matrix-td px-0 align-middle ${isReadOnlyUser ? 'readonly-cell bg-gray-100' : ''}`}>
                                                        <LocalInput type="qc-date" value={container.eta} originalValue={(container.originals || {}).eta} originalMeta={(container.originalMetas || {}).eta} onChange={(v, orig) => ctx.updateContainer(container.id, { eta: v }, mo, 'yoshii', 'ETA')} refDate={mo} className={`matrix-input text-center text-xs input-compact ${isReadOnlyUser ? 'readonly-cell bg-gray-100' : ''}`} dataGridId={`y-dray-${mo}-${idx}-5`} onGridKeyDown={handleGridNav} />
                                                    </td>

                                                    {/* フリータイム: カレンダー排除、純粋テキスト */}
                                                    <td className={`matrix-td px-0 align-middle ${isReadOnlyUser ? 'readonly-cell bg-gray-100' : ''}`}>
                                                        <LocalInput type="text" value={container.freetime} originalValue={(container.originals || {}).freetime} originalMeta={(container.originalMetas || {}).freetime} onChange={(v, orig) => ctx.updateContainer(container.id, { freetime: v }, mo, 'yoshii', 'フリータイム')} className={`matrix-input text-center text-xs input-compact ${isReadOnlyUser ? 'readonly-cell bg-gray-100' : ''}`} dataGridId={`y-dray-${mo}-${idx}-6`} onGridKeyDown={handleGridNav} />
                                                    </td>

                                                    {/* 納品日時 */}
                                                    <td className={`border text-center px-0.5 py-0.5 align-middle ${isReadOnlyUser ? 'readonly-cell bg-gray-100' : 'bg-emerald-50/30'}`}>
                                                        <div className="flex items-center justify-between gap-1 w-full">
                                                            <div className="w-[68px] flex-shrink-0">
                                                                <LocalInput type="qc-date" value={container.deliveryDate} originalValue={(container.originals || {}).deliveryDate} originalMeta={(container.originalMetas || {}).deliveryDate} onChange={(v, orig) => ctx.updateContainer(container.id, { deliveryDate: v }, mo, 'yoshii', '納品日')} refDate={mo} className={`text-center text-xs input-compact font-bold ${isReadOnlyUser ? 'readonly-cell bg-gray-100' : ''}`} dataGridId={`y-dray-${mo}-${idx}-7`} onGridKeyDown={handleGridNav} />
                                                            </div>
                                                            <div className="w-[72px] flex-shrink-0 relative flex items-center">
                                                                <input 
                                                                    type="time" 
                                                                    value={container.deliveryTime || ''} 
                                                                    onChange={e => ctx.updateContainer(container.id, { deliveryTime: e.target.value }, mo, 'yoshii', '納品時間')} 
                                                                    className={`border rounded px-1 py-0 text-[11px] font-bold text-center w-full h-[20px] outline-none focus:ring-1 focus:ring-indigo-500 ${isReadOnlyUser ? 'readonly-cell bg-gray-100 cursor-not-allowed' : 'bg-white cursor-pointer'}`}
                                                                    disabled={isReadOnlyUser}
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* 納品先: 折り返し表示対応 */}
                                                    <td className={`matrix-td px-0 align-middle whitespace-normal word-break-all ${isReadOnlyUser ? 'readonly-cell bg-gray-100' : ''}`}>
                                                        <DynamicSelect value={container.destination} originalValue={(container.originals || {}).destination} originalMeta={(container.originalMetas || {}).destination} onChange={(val, cat, orig) => ctx.handleSelectChange(container.id, 'destination', true, 'yoshii', false, '納品先')(val, cat, orig)} category="destinations" options={ctx.masterData.yoshii.destinations} dataGridId={`y-dray-${mo}-${idx}-8`} onGridKeyDown={handleGridNav} className={`w-full text-xs border-none bg-transparent outline-none text-center px-0 h-auto whitespace-normal ${isReadOnlyUser ? 'readonly-cell bg-gray-100' : ''}`} />
                                                    </td>

                                                    {/* 備考: 折り返し表示対応 */}
                                                    <td className={`matrix-td px-0 align-middle whitespace-normal word-break-all ${isReadOnlyUser ? 'readonly-cell bg-gray-100' : ''}`}>
                                                        <LocalTextArea value={container.notes} originalValue={(container.originals || {}).notes} originalMeta={(container.originalMetas || {}).notes} onChange={(v, orig) => ctx.updateContainer(container.id, { notes: v }, mo, 'yoshii', '備考')} isCompact={true} className={`input-compact h-auto whitespace-normal ${isReadOnlyUser ? 'readonly-cell bg-gray-100' : ''}`}/>
                                                    </td>

                                                    <td className={`matrix-td px-0 align-middle ${isReadOnlyUser ? 'readonly-cell bg-gray-100' : ''}`}>
                                                        <DynamicSelect value={container.containerSize} originalValue={(container.originals || {}).containerSize} originalMeta={(container.originalMetas || {}).containerSize} onChange={(val, cat, orig) => ctx.handleSelectChange(container.id, 'containerSize', true, 'common', false, 'サイズ')(val, cat, orig)} category="containerSizes" options={ctx.masterData.common.containerSizes} dataGridId={`y-dray-${mo}-${idx}-9`} onGridKeyDown={handleGridNav} className={`w-full text-xs border-none bg-transparent outline-none text-center px-0 input-compact ${isReadOnlyUser ? 'readonly-cell bg-gray-100' : ''}`} />
                                                    </td>

                                                    <td className={`matrix-td px-0 align-middle ${isReadOnlyUser ? 'readonly-cell bg-gray-100' : ''}`}>
                                                        <LocalInput value={container.vesselName} originalValue={(container.originals || {}).vesselName} originalMeta={(container.originalMetas || {}).originalMetas?.vesselName} onChange={(v, orig) => ctx.updateContainer(container.id, { vesselName: v }, mo, 'yoshii', '本船名')} className={`matrix-input text-center text-xs input-compact ${isReadOnlyUser ? 'readonly-cell bg-gray-100' : ''}`} dataGridId={`y-dray-${mo}-${idx}-10`} onGridKeyDown={handleGridNav} />
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