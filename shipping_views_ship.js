// =========================================================
// shipping_views_ship.js - 出荷日程・ドレージ手配画面モジュール
// =========================================================

const getSortIndicator = (key, sortConfig) => {
    if (!sortConfig) return '';
    const idx = sortConfig.findIndex(s => s.key === key);
    if (idx === -1) return '';
    const dir = sortConfig[idx].direction === 'asc' ? '▲' : '▼';
    const numStr = sortConfig.length > 1 ? String(idx + 1) : '';
    return ' ' + dir + numStr;
};

// 【出荷日程画面ビュー】
const YoshiiShipView = () => {
    const ctx = React.useContext(AppContext);
    const [exportModal, setExportModal] = React.useState({ isOpen: false, type: 'excel' });

    const handleExecuteExport = ({ mode, selectedYear: selYr, singleMonth: sgMo, startMonth: sMo, endMonth: eMo }) => {
        const targetVendor = ctx.selectedVendorFilter || 'ALL';
        
        let targetContainers = yoshiiContainers.filter(item => {
            const mo = item.deliveryMonth || '';
            if (mode === 'current') return mo === ctx.currentMonthStr;
            if (mode === 'year') {
                if (!mo) return false;
                const y = Number(mo.split('-')[0]);
                const m = Number(mo.split('-')[1]);
                if (m >= 4) return y === selYr;
                return y === selYr + 1;
            }
            if (mode === 'single') return mo === sgMo;
            return mo >= sMo && mo <= eMo;
        });

        if (exportModal.type === 'print') {
            setFilterMode(mode === 'current' ? 'current' : mode === 'single' ? 'month' : 'range');
            if (mode === 'single') setSingleMonth(sgMo);
            if (mode === 'range') { setStartMonth(sMo); setEndMonth(eMo); }
            setTimeout(() => window.print(), 300);
            return;
        }

        const headers = ['管理番号', '進行状況', 'コンテナNO.', '積載型式', '外装箱', '化粧箱', 'ラベル', '割振数', '総数量', '到着港', 'ETD', 'ETA', 'サイズ', '本船名', '備考'];
        const containerGroups = [];

        targetContainers.forEach(item => {
            let cModels = Object.keys(item.allocations || {})
                .filter(m => item.allocations[m] > 0)
                .sort((a, b) => (modelOrders[a] || 9999) - (modelOrders[b] || 9999));

            if (targetVendor !== 'ALL') {
                cModels = cModels.filter(m => {
                    const matchModelDetails = ctx.masterData.yoshii?.modelDetails?.[m] || {};
                    const normTarget = normalizeModelCode(m);
                    const matchPlanInfo = ctx.plans.find(p => normalizeModelCode(p.model) === normTarget && p.vendorCode);
                    const vCode = matchModelDetails.vendorCode !== undefined ? matchModelDetails.vendorCode : (matchPlanInfo?.vendorCode || '');
                    return vCode === targetVendor;
                });
            }

            if (cModels.length === 0) return;
            const totalQty = cModels.reduce((sum, m) => sum + item.allocations[m], 0);

            const groupRows = cModels.map((m, mIdx) => {
                const parts = (item.spareParts || {})[m] || {};
                return [
                    item.managementNo || '-',
                    item.status || '-',
                    item.containerNo || '-',
                    m,
                    parts.outerBox || 0,
                    parts.innerBox || 0,
                    parts.label || 0,
                    item.allocations[m] || 0,
                    totalQty,
                    item.port || '-',
                    item.etd || '-',
                    item.eta || '-',
                    item.containerSize || '-',
                    item.vessel || '-',
                    item.shipNotes || '-'
                ];
            });

            const mergeColIndices = [1, 2, 3, 9, 10, 11, 12, 13, 14, 15];

            containerGroups.push({ rows: groupRows, mergeColIndices });
        });

        const dateTag = mode === 'current' ? formatYYMM(ctx.currentMonthStr) : mode === 'year' ? `${selYr}年度` : mode === 'single' ? formatYYMM(sgMo) : `${formatYYMM(sMo)}_${formatYYMM(eMo)}`;
        const filename = `${targetVendor}_出荷日程_${dateTag}.xlsx`;

        exportToExcelAdvanced({ title: `吉井電気 出荷日程表 [仕入先: ${targetVendor}] [期間: ${dateTag}]`, headers, containerGroups, filename });
    };

    const [filterMode, setFilterMode] = React.useState('year');
    const [selectedYear, setSelectedYear] = React.useState(2026);
    const [singleMonth, setSingleMonth] = React.useState(ctx.currentMonthStr);
    const [startMonth, setStartMonth] = React.useState('2026-04');
    const [endMonth, setEndMonth] = React.useState('2027-03');
    const [sortConfig, setSortConfig] = React.useState([]);

    const yoshiiContainers = ctx.containers.filter(c => c.company === 'yoshii');
    const modelOrders = ctx.masterData.yoshii?.modelOrder || {};

    let displayContainers = yoshiiContainers.filter(item => {
        const mo = item.deliveryMonth || '';
        if (filterMode === 'current') return mo === ctx.currentMonthStr;
        if (filterMode === 'year') {
            if (!mo) return false;
            const y = Number(mo.split('-')[0]);
            const m = Number(mo.split('-')[1]);
            if (m >= 4) return y === selectedYear;
            return y === selectedYear + 1;
        }
        if (filterMode === 'month') return mo === singleMonth;
        if (filterMode === 'range') return mo >= startMonth && mo <= endMonth;
        return true;
    });

    if (sortConfig.length > 0) {
        displayContainers.sort((a, b) => {
            for (const s of sortConfig) {
                let valA = a[s.key] || '';
                let valB = b[s.key] || '';
                if (s.key === 'drayageDeliveryDateCombo') {
                    valA = (a.drayageDeliveryDate || '') + (a.drayageDeliveryTime || '');
                    valB = (b.drayageDeliveryDate || '') + (b.drayageDeliveryTime || '');
                }
                if (valA !== valB) {
                    const cmp = String(valA).localeCompare(String(valB), 'ja', { numeric: true });
                    return s.direction === 'asc' ? cmp : -cmp;
                }
            }
            const orderA = a.allocNo !== undefined ? a.allocNo : (a.sortOrder !== undefined ? a.sortOrder : 999999);
            const orderB = b.allocNo !== undefined ? b.allocNo : (b.sortOrder !== undefined ? b.sortOrder : 999999);
            return orderA - orderB;
        });
    } else {
        displayContainers.sort((a, b) => {
            const mA = a.deliveryMonth || '9999-99';
            const mB = b.deliveryMonth || '9999-99';
            if (mA !== mB) return mA.localeCompare(mB);

            const orderA = a.allocNo !== undefined ? a.allocNo : (a.sortOrder !== undefined ? a.sortOrder : 999999);
            const orderB = b.allocNo !== undefined ? b.allocNo : (b.sortOrder !== undefined ? b.sortOrder : 999999);
            return orderA - orderB;
        });
    }

    React.useEffect(() => {
        const container = ctx.tableContainerRef.current;
        if (!container) return;

        if (ctx.shipScrollPosRef.current !== null) {
            container.scrollTop = ctx.shipScrollPosRef.current;
        } else if (filterMode === 'year' || filterMode === 'all') {
            setTimeout(() => {
                const currentMonthRow = container.querySelector(`tr[data-month="${ctx.currentMonthStr}"]`);
                const thead = container.querySelector('thead');
                if (currentMonthRow && container) {
                    const headerHeight = thead ? thead.offsetHeight : 0;
                    container.scrollTop = Math.max(0, currentMonthRow.offsetTop - headerHeight);
                }
            }, 300);
        }

        const handleScroll = () => { if (container) ctx.shipScrollPosRef.current = container.scrollTop; };
        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [filterMode, ctx.currentMonthStr]);

    const handleSortClick = (key, label, e) => {
        const isShift = e.shiftKey;
        let newConfig = [...sortConfig];
        const existingIdx = newConfig.findIndex(s => s.key === key);

        if (!isShift) {
            if (existingIdx >= 0) {
                const currDir = newConfig[existingIdx].direction;
                newConfig = currDir === 'asc' ? [{ key, label, direction: 'desc' }] : [];
            } else {
                newConfig = [{ key, label, direction: 'asc' }];
            }
        } else {
            if (existingIdx >= 0) {
                const currDir = newConfig[existingIdx].direction;
                if (currDir === 'asc') { newConfig[existingIdx].direction = 'desc'; } else { newConfig.splice(existingIdx, 1); }
            } else {
                newConfig.push({ key, label, direction: 'asc' });
            }
        }
        setSortConfig(newConfig);
    };

    const handlePartsChange = (containerId, model, partKey, value, originalVal) => {
        const targetContainer = yoshiiContainers.find(c => c.id === containerId);
        if (!targetContainer) return;
        
        const currentParts = targetContainer.spareParts || {};
        const modelParts = currentParts[model] || {};
        
        const updatedParts = {
            ...currentParts,
            [model]: { ...modelParts, [partKey]: value }
        };

        const currentOrigParts = targetContainer.originals?.spareParts || {};
        const modelOrigParts = currentOrigParts[model] || {};
        const updatedOrigParts = {
            ...currentOrigParts,
            [model]: {
                ...modelOrigParts,
                [partKey]: modelOrigParts[partKey] !== undefined ? modelOrigParts[partKey] : (originalVal || '')
            }
        };

        const currentMetaParts = targetContainer.originalMetas?.spareParts || {};
        const modelMetaParts = currentMetaParts[model] || {};
        const updatedMetaParts = {
            ...currentMetaParts,
            [model]: {
                ...modelMetaParts,
                [partKey]: modelMetaParts[partKey] !== undefined ? modelMetaParts[partKey] : `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}`
            }
        };
        
        ctx.updateContainer(containerId, { spareParts: updatedParts, originals: { ...(targetContainer.originals || {}), spareParts: updatedOrigParts }, originalMetas: { ...(targetContainer.originalMetas || {}), spareParts: updatedMetaParts } }, targetContainer.deliveryMonth, 'yoshii', `補充部品 [${model}-${partKey}]`);
    };

    const groupedRows = [];
    let currentMonth = null;
    displayContainers.forEach(c => {
        const m = c.deliveryMonth || '未設定';
        if (m !== currentMonth) { groupedRows.push({ isDivider: true, monthLabel: m }); currentMonth = m; }
        groupedRows.push(c);
    });

    return (
        <div className="p-4 bg-white flex-grow flex flex-col h-full">
            <div className="hidden print:block font-bold text-sm text-black mb-1.5 border-b pb-1 text-left w-full">
                吉井電気 出荷日程表 [仕入先: {ctx.selectedVendorFilter || 'ALL'}] [対象期間: {filterMode === 'current' ? `${ctx.currentMonthStr.replace('-', '/')}分` : filterMode === 'month' ? `${singleMonth.replace('-', '/')}分` : filterMode === 'year' ? `${selectedYear}年度` : `${startMonth.replace('-', '/')}〜${endMonth.replace('-', '/')}`}]
            </div>
            <div className="flex justify-between items-center mb-2 no-print flex-shrink-0">
                <h2 className="text-lg font-bold">吉井電気 出荷日程表 {ctx.selectedVendorFilter && ctx.selectedVendorFilter !== 'ALL' ? ` [仕入先: ${ctx.selectedVendorFilter}]` : ''}</h2>

                <div className="flex items-center gap-1.5 no-print">
                    <button onClick={() => setExportModal({ isOpen: true, type: 'excel' })} className="px-2.5 py-1 text-xs font-bold rounded bg-emerald-700 hover:bg-emerald-800 text-white shadow transition flex items-center gap-1">📊 Excel出力</button>
                    <button onClick={() => setExportModal({ isOpen: true, type: 'print' })} className="px-2.5 py-1 text-xs font-bold rounded bg-slate-700 hover:bg-slate-800 text-white shadow transition flex items-center gap-1">🖨 印刷</button>
                    <button onClick={ctx.handleStartTracking} className={`px-2.5 py-1 text-xs font-bold rounded shadow transition ${ctx.isChangeTrackingMode ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}>{ctx.isChangeTrackingMode ? '● 変更記録中' : '変更開始'}</button>
                    <button onClick={ctx.handleClearTracking} className="px-2.5 py-1 text-xs font-bold rounded bg-gray-600 hover:bg-gray-700 text-white shadow transition">変更クリア</button>
                </div>
            </div>

            <ScheduleFilterSortControl filterMode={filterMode} setFilterMode={setFilterMode} selectedYear={selectedYear} setSelectedYear={setSelectedYear} singleMonth={singleMonth} setSingleMonth={setSingleMonth} startMonth={startMonth} setStartMonth={setStartMonth} endMonth={endMonth} setEndMonth={setEndMonth} sortConfig={sortConfig} setSortConfig={setSortConfig}/>

            <div className="table-container flex-grow" ref={ctx.tableContainerRef}>
                <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-gray-100 border-b-2 sticky top-0 z-20">
                        <tr className="bg-gray-100 border-b">
                            <th rowSpan="2" className="p-1 w-[80px] border-r">管理番号</th>
                            <th rowSpan="2" className="p-1 w-[80px] border-r">進行状況</th>
                            <th rowSpan="2" onClick={e => handleSortClick('containerNo', 'コンテナNO.', e)} className="p-1 w-[110px] cursor-pointer hover:bg-emerald-100 text-emerald-900 border-r">
                                コンテナNO.{getSortIndicator('containerNo', sortConfig)}
                            </th>
                            <th rowSpan="2" className="p-1 w-[125px] min-w-[120px] border-r">積載型式</th>
                            <th colSpan="3" className="p-1 bg-emerald-50 text-emerald-900 border-r text-center font-bold">補充部品 (PCS)</th>
                            <th rowSpan="2" className="p-1 w-[48px] min-w-[45px] border-r">割振数</th>
                            <th rowSpan="2" className="p-1 w-[48px] min-w-[45px] border-r">総数量</th>
                            <th rowSpan="2" onClick={e => handleSortClick('port', '到着港', e)} className="p-1 w-[70px] min-w-[65px] cursor-pointer hover:bg-emerald-100 text-emerald-900 border-r">
                                到着港{getSortIndicator('port', sortConfig)}
                            </th>
                            <th rowSpan="2" onClick={e => handleSortClick('etd', 'ETD', e)} className="p-1 w-[58px] min-w-[54px] cursor-pointer hover:bg-emerald-100 text-emerald-900 border-r">
                                ETD{getSortIndicator('etd', sortConfig)}
                            </th>
                            <th rowSpan="2" onClick={e => handleSortClick('eta', 'ETA', e)} className="p-1 w-[58px] min-w-[54px] cursor-pointer hover:bg-emerald-100 text-emerald-900 border-r">
                                ETA{getSortIndicator('eta', sortConfig)}
                            </th>
                            <th rowSpan="2" className="p-1 w-[62px] min-w-[58px] border-r">サイズ</th>
                            <th rowSpan="2" onClick={e => handleSortClick('vessel', '本船名', e)} className="p-1 w-[170px] min-w-[160px] cursor-pointer hover:bg-emerald-100 text-emerald-900 border-r">
                                本船名{getSortIndicator('vessel', sortConfig)}
                            </th>
                            <th rowSpan="2" className="p-1 min-w-[160px] notes-col">備考</th>
                        </tr>
                        <tr className="bg-emerald-50/70 text-emerald-800 text-[10px] font-bold border-b">
                            <th className="p-1 border-r text-center w-10">外装箱</th>
                            <th className="p-1 border-r text-center w-10">化粧箱</th>
                            <th className="p-1 border-r text-center w-10">ラベル</th>
                        </tr>
                    </thead>
                    <tbody>
                        {groupedRows.map((row, idx) => {
                            if (row.isDivider) {
                                const label = row.monthLabel === '未設定' ? '納品月 未設定' : `■ ${row.monthLabel.split('-')[0]}年${row.monthLabel.split('-')[1]}月 納品分`;
                                return <tr key={`div-${idx}`} className="month-divider" data-month={row.monthLabel}><td colSpan={100}>{label}</td></tr>;
                            }

                            const item = row;
                            let cModels = Object.keys(item.allocations || {})
                                .filter(m => item.allocations[m] > 0)
                                .sort((a, b) => {
                                    const orderA = modelOrders[a] !== undefined ? modelOrders[a] : 9999;
                                    const orderB = modelOrders[b] !== undefined ? modelOrders[b] : 9999;
                                    if (orderA !== orderB) return orderA - orderB;
                                    return a.localeCompare(b, 'ja');
                                });

                            if (ctx.selectedVendorFilter && ctx.selectedVendorFilter !== 'ALL') {
                                cModels = cModels.filter(m => {
                                    const matchModelDetails = ctx.masterData.yoshii?.modelDetails?.[m] || {};
                                    const normTarget = normalizeModelCode(m);
                                    const matchPlanInfo = ctx.plans.find(p => normalizeModelCode(p.model) === normTarget && p.vendorCode);
                                    const vCode = matchModelDetails.vendorCode !== undefined ? matchModelDetails.vendorCode : (matchPlanInfo?.vendorCode || '');
                                    return vCode === ctx.selectedVendorFilter;
                                });
                            }

                            if (cModels.length === 0) return null;
                            const totalQty = cModels.reduce((sum, m) => sum + item.allocations[m], 0);

                            return (
                                <tr key={item.id} className="border-b hover:bg-emerald-50" data-month={item.deliveryMonth || '未設定'}>
                                    <td className="p-0.5"><LocalInput value={item.managementNo} originalValue={(item.originals || {}).managementNo} originalMeta={(item.originalMetas || {}).managementNo} onChange={(v, orig) => ctx.updateContainer(item.id, { managementNo: v, originals: { ...(item.originals || {}), managementNo: item.originals?.managementNo !== undefined ? item.originals.managementNo : orig }, originalMetas: { ...(item.originalMetas || {}), managementNo: item.originalMetas?.managementNo !== undefined ? item.originalMetas.managementNo : `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}` } }, item.deliveryMonth, 'yoshii', '管理番号')} className="text-center font-bold" /></td>
                                    <td className={`p-0.5 ${['出港済', '出荷済み', '納品完了'].includes(item.status) ? 'bg-green-200 print-bg-green' : ''}`}><DynamicSelect value={item.status} originalValue={(item.originals || {}).status} originalMeta={(item.originalMetas || {}).status} onChange={(val, cat, orig) => ctx.handleSelectChange(item.id, 'status', true, 'yoshii', true, '進行状況')(val, cat, orig)} category="statuses" options={ctx.masterData.common.statuses} /></td>
                                    <td className="p-0.5"><LocalInput value={item.containerNo} originalValue={(item.originals || {}).containerNo} originalMeta={(item.originalMetas || {}).containerNo} onChange={(v, orig) => ctx.updateContainer(item.id, { containerNo: v, originals: { ...(item.originals || {}), containerNo: item.originals?.containerNo !== undefined ? item.originals.containerNo : orig }, originalMetas: { ...(item.originalMetas || {}), containerNo: item.originalMetas?.containerNo !== undefined ? item.originalMetas.containerNo : `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}` } }, item.deliveryMonth, 'yoshii', 'コンテナNO.')} className="text-center font-bold" /></td>
                                    
                                    <td className="p-0.5 readonly-cell text-center align-middle font-bold">
                                        {cModels.map(m => (
                                            <div key={m} className="h-5 flex items-center justify-center border-b last:border-b-0 border-gray-200 py-0 text-xs">{m}</div>
                                        ))}
                                    </td>

                                    <td className="p-0.5 bg-emerald-50/20 text-center align-middle">
                                        {cModels.map(m => {
                                            const parts = (item.spareParts || {})[m] || {};
                                            const origParts = (item.originals?.spareParts || {})[m] || {};
                                            const metaParts = (item.originalMetas?.spareParts || {})[m] || {};
                                            const origVal = origParts.outerBox;
                                            const metaStr = metaParts.outerBox || `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}`;

                                            return (
                                                <div key={m} className="h-5 flex items-center justify-center border-b last:border-b-0 border-gray-200 py-0">
                                                    <div className={`relative ${origVal !== undefined ? 'has-original-tooltip' : ''}`} data-original-val={origVal} data-original-meta={metaStr}>
                                                        <input type="text" maxLength={2} value={parts.outerBox || ''} onChange={e => handlePartsChange(item.id, m, 'outerBox', e.target.value, parts.outerBox || '')} disabled={ctx.authUser && !ctx.authUser.canEdit} className={`spare-part-input ${ctx.isChangeTrackingMode && origVal !== undefined && String(origVal) !== String(parts.outerBox || '') ? 'is-changed-cell' : ''}`} placeholder="0"/>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </td>
                                    <td className="p-0.5 bg-emerald-50/20 text-center align-middle">
                                        {cModels.map(m => {
                                            const parts = (item.spareParts || {})[m] || {};
                                            const origParts = (item.originals?.spareParts || {})[m] || {};
                                            const metaParts = (item.originalMetas?.spareParts || {})[m] || {};
                                            const origVal = origParts.innerBox;
                                            const metaStr = metaParts.innerBox || `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}`;

                                            return (
                                                <div key={m} className="h-5 flex items-center justify-center border-b last:border-b-0 border-gray-200 py-0">
                                                    <div className={`relative ${origVal !== undefined ? 'has-original-tooltip' : ''}`} data-original-val={origVal} data-original-meta={metaStr}>
                                                        <input type="text" maxLength={2} value={parts.innerBox || ''} onChange={e => handlePartsChange(item.id, m, 'innerBox', e.target.value, parts.innerBox || '')} disabled={ctx.authUser && !ctx.authUser.canEdit} className={`spare-part-input ${ctx.isChangeTrackingMode && origVal !== undefined && String(origVal) !== String(parts.innerBox || '') ? 'is-changed-cell' : ''}`} placeholder="0"/>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </td>
                                    <td className="p-0.5 bg-emerald-50/20 text-center align-middle">
                                        {cModels.map(m => {
                                            const parts = (item.spareParts || {})[m] || {};
                                            const origParts = (item.originals?.spareParts || {})[m] || {};
                                            const metaParts = (item.originalMetas?.spareParts || {})[m] || {};
                                            const origVal = origParts.label;
                                            const metaStr = metaParts.label || `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}`;

                                            return (
                                                <div key={m} className="h-5 flex items-center justify-center border-b last:border-b-0 border-gray-200 py-0">
                                                    <div className={`relative ${origVal !== undefined ? 'has-original-tooltip' : ''}`} data-original-val={origVal} data-original-meta={metaStr}>
                                                        <input type="text" maxLength={2} value={parts.label || ''} onChange={e => handlePartsChange(item.id, m, 'label', e.target.value, parts.label || '')} disabled={ctx.authUser && !ctx.authUser.canEdit} className={`spare-part-input ${ctx.isChangeTrackingMode && origVal !== undefined && String(origVal) !== String(parts.label || '') ? 'is-changed-cell' : ''}`} placeholder="0"/>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </td>

                                    <td className="p-0.5 bg-white text-right align-middle">
                                        {cModels.map(m => {
                                            const allocVal = item.allocations[m];
                                            const origAlloc = (item.originals?.allocations || {})[m];
                                            const metaAlloc = (item.originalMetas?.allocations || {})[m];
                                            return (
                                                <div key={m} className="h-5 flex items-center justify-end border-b last:border-b-0 border-gray-200 px-0 py-0">
                                                    <LocalInput type="number" value={allocVal !== undefined && allocVal !== null ? allocVal : ''} originalValue={origAlloc} originalMeta={metaAlloc} onChange={(v, orig) => {
                                                        const newQty = v === '' ? 0 : Number(v);
                                                        const currentAllocs = item.allocations || {};
                                                        const updatedAllocs = { ...currentAllocs, [m]: newQty };

                                                        const updatedOrigs = {
                                                            ...(item.originals || {}),
                                                            allocations: {
                                                                ...(item.originals?.allocations || {}),
                                                                [m]: (item.originals?.allocations || {})[m] !== undefined ? (item.originals.allocations)[m] : (orig || '')
                                                            }
                                                        };

                                                        const updatedMetas = {
                                                            ...(item.originalMetas || {}),
                                                            allocations: {
                                                                ...(item.originalMetas?.allocations || {}),
                                                                [m]: (item.originalMetas?.allocations || {})[m] !== undefined ? (item.originalMetas.allocations)[m] : `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}`
                                                            }
                                                        };

                                                        ctx.updateContainer(item.id, { allocations: updatedAllocs, originals: updatedOrigs, originalMetas: updatedMetas }, item.deliveryMonth, 'yoshii', `型式 [${m}] 割振数`);
                                                    }} className="text-right font-bold font-mono text-xs h-[20px] pr-1 border-none bg-transparent"/>
                                                </div>
                                            );
                                        })}
                                    </td>

                                    <td className="p-1 readonly-cell text-right font-bold">{totalQty.toLocaleString()}</td>
                                    <td className="p-0.5"><DynamicSelect value={item.port} originalValue={(item.originals || {}).port} originalMeta={(item.originalMetas || {}).port} onChange={(val, cat, orig) => ctx.handleSelectChange(item.id, 'port', true, 'yoshii', false, '到着港')(val, cat, orig)} category="ports" options={ctx.masterData.yoshii.ports} /></td>
                                    <td className="p-0.5"><LocalInput type="date" value={item.etd} originalValue={(item.originals || {}).etd} originalMeta={(item.originalMetas || {}).etd} onChange={(v, orig) => ctx.updateContainer(item.id, { etd: v, originals: { ...(item.originals || {}), etd: item.originals?.etd !== undefined ? item.originals.etd : orig }, originalMetas: { ...(item.originalMetas || {}), etd: item.originalMetas?.etd !== undefined ? item.originalMetas.etd : `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}` } }, item.deliveryMonth, 'yoshii', 'ETD')} /></td>
                                    <td className="p-0.5"><LocalInput type="date" value={item.eta} originalValue={(item.originals || {}).eta} originalMeta={(item.originalMetas || {}).eta} refDate={item.etd} onChange={(v, orig) => ctx.updateContainer(item.id, { eta: v, originals: { ...(item.originals || {}), eta: item.originals?.eta !== undefined ? item.originals.eta : orig }, originalMetas: { ...(item.originalMetas || {}), eta: item.originalMetas?.eta !== undefined ? item.originalMetas.eta : `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}` } }, item.deliveryMonth, 'yoshii', 'ETA')} /></td>
                                    <td className="p-0.5"><DynamicSelect value={item.containerSize} originalValue={(item.originals || {}).containerSize} originalMeta={(item.originalMetas || {}).containerSize} onChange={(val, cat, orig) => ctx.handleSelectChange(item.id, 'containerSize', true, 'yoshii', true, 'コンテナサイズ')(val, cat, orig)} category="containerSizes" options={ctx.masterData.common.containerSizes} autoDefaultValue="40HQ" /></td>
                                    
                                    <td className="p-0.5">
                                        <LocalInput value={item.vessel} originalValue={(item.originals || {}).vessel} originalMeta={(item.originalMetas || {}).vessel} onChange={(v, orig) => ctx.updateContainer(item.id, { vessel: v, originals: { ...(item.originals || {}), vessel: item.originals?.vessel !== undefined ? item.originals.vessel : orig }, originalMetas: { ...(item.originalMetas || {}), vessel: item.originalMetas?.vessel !== undefined ? item.originalMetas.vessel : `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}` } }, item.deliveryMonth, 'yoshii', '本船名')} className="text-center font-medium text-xs"/>
                                    </td>
                                    
                                    <td className="p-0.5 notes-cell">
                                        <LocalTextArea value={item.shipNotes} originalValue={(item.originals || {}).shipNotes} originalMeta={(item.originalMetas || {}).shipNotes} onChange={(v, orig) => ctx.updateContainer(item.id, { shipNotes: v, originals: { ...(item.originals || {}), shipNotes: item.originals?.shipNotes !== undefined ? item.originals.shipNotes : orig }, originalMetas: { ...(item.originalMetas || {}), shipNotes: item.originals?.shipNotes !== undefined ? item.originals.shipNotes : `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}` } }, item.deliveryMonth, 'yoshii', '出荷日程 備考')} isCompact={true} className="text-left text-xs whitespace-normal break-all"/>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            <ExportPrintModal isOpen={exportModal.isOpen} onClose={() => setExportModal({ isOpen: false, type: 'excel' })} screenName="出荷日程表" currentMonthStr={ctx.currentMonthStr} defaultMode="current" onStartExport={handleExecuteExport} />
        </div>
    );
};

// 【ドレージ手配画面ビュー】
const YoshiiDrayageView = () => {
    const ctx = React.useContext(AppContext);
    const [exportModal, setExportModal] = React.useState({ isOpen: false, type: 'excel' });

    const handleExecuteExport = ({ mode, selectedYear: selYr, singleMonth: sgMo, startMonth: sMo, endMonth: eMo }) => {
        const targetVendor = ctx.selectedVendorFilter || 'YO';
        
        let targetContainers = yoshiiContainers.filter(item => {
            const mo = item.deliveryMonth || '';
            if (mode === 'current') return mo === ctx.currentMonthStr;
            if (mode === 'year') {
                if (!mo) return false;
                const y = Number(mo.split('-')[0]);
                const m = Number(mo.split('-')[1]);
                if (m >= 4) return y === selYr;
                return y === selYr + 1;
            }
            if (mode === 'single') return mo === sgMo;
            return mo >= sMo && mo <= eMo;
        });

        if (exportModal.type === 'print') {
            setFilterMode(mode === 'current' ? 'current' : mode === 'single' ? 'month' : 'range');
            if (mode === 'single') setSingleMonth(sgMo);
            if (mode === 'range') { setStartMonth(sMo); setEndMonth(eMo); }
            setTimeout(() => window.print(), 300);
            return;
        }

        const headers = ['管理番号', '進行状況', 'コンテナNO.', '積載型式', '外装箱', '化粧箱', 'ラベル', '割振数', '総数量', '到着港', 'ETD', 'ETA', 'フリータイム', '納品日', '納品時間', '納品先', '備考', 'コンテナサイズ', '本船名'];
        const containerGroups = [];

        targetContainers.forEach(item => {
            let cModels = Object.keys(item.allocations || {})
                .filter(m => item.allocations[m] > 0)
                .sort((a, b) => (modelOrders[a] || 9999) - (modelOrders[b] || 9999));

            if (cModels.length === 0) return;
            const totalQty = cModels.reduce((sum, m) => sum + item.allocations[m], 0);

            const groupRows = cModels.map((m, mIdx) => {
                const parts = (item.spareParts || {})[m] || {};
                return [
                    item.managementNo || '-',
                    item.status || '-',
                    item.containerNo || '-',
                    m,
                    parts.outerBox || 0,
                    parts.innerBox || 0,
                    parts.label || 0,
                    item.allocations[m] || 0,
                    totalQty,
                    item.port || '-',
                    item.etd || '-',
                    item.eta || '-',
                    item.freeTime || '-',
                    item.drayageDeliveryDate || '-',
                    item.drayageDeliveryTime || '-',
                    item.drayageDestination || '-',
                    item.drayageNotes || '-',
                    item.containerSize || '-',
                    item.vessel || '-'
                ];
            });

            const mergeColIndices = [1, 2, 3, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

            containerGroups.push({ rows: groupRows, mergeColIndices });
        });

        const dateTag = mode === 'current' ? formatYYMM(ctx.currentMonthStr) : mode === 'year' ? `${selYr}年度` : mode === 'single' ? formatYYMM(sgMo) : `${formatYYMM(sMo)}_${formatYYMM(eMo)}`;
        const filename = `${targetVendor}_ドレージ_${dateTag}.xlsx`;

        exportToExcelAdvanced({ title: `吉井電気 ドレージ手配 [仕入先: ${targetVendor}] [期間: ${dateTag}]`, headers, containerGroups, filename, isDrayage: true });
    };

    const [filterMode, setFilterMode] = React.useState('year');
    const [selectedYear, setSelectedYear] = React.useState(2026);
    const [singleMonth, setSingleMonth] = React.useState(ctx.currentMonthStr);
    const [startMonth, setStartMonth] = React.useState('2026-04');
    const [endMonth, setEndMonth] = React.useState('2027-03');
    const [sortConfig, setSortConfig] = React.useState([]);

    const yoshiiContainers = ctx.containers.filter(c => c.company === 'yoshii');
    const modelOrders = ctx.masterData.yoshii?.modelOrder || {};

    let displayContainers = yoshiiContainers.filter(item => {
        const mo = item.deliveryMonth || '';
        if (filterMode === 'current') return mo === ctx.currentMonthStr;
        if (filterMode === 'year') {
            if (!mo) return false;
            const y = Number(mo.split('-')[0]);
            const m = Number(mo.split('-')[1]);
            if (m >= 4) return y === selectedYear;
            return y === selectedYear + 1;
        }
        if (filterMode === 'month') return mo === singleMonth;
        if (filterMode === 'range') return mo >= startMonth && mo <= endMonth;
        return true;
    });

    if (sortConfig.length > 0) {
        displayContainers.sort((a, b) => {
            for (const s of sortConfig) {
                let valA = a[s.key] || '';
                let valB = b[s.key] || '';
                if (s.key === 'drayageDeliveryDateCombo') {
                    valA = (a.drayageDeliveryDate || '') + (a.drayageDeliveryTime || '');
                    valB = (b.drayageDeliveryDate || '') + (b.drayageDeliveryTime || '');
                }
                if (valA !== valB) {
                    const cmp = String(valA).localeCompare(String(valB), 'ja', { numeric: true });
                    return s.direction === 'asc' ? cmp : -cmp;
                }
            }
            const orderA = a.allocNo !== undefined ? a.allocNo : (a.sortOrder !== undefined ? a.sortOrder : 999999);
            const orderB = b.allocNo !== undefined ? b.allocNo : (b.sortOrder !== undefined ? b.sortOrder : 999999);
            return orderA - orderB;
        });
    } else {
        displayContainers.sort((a, b) => {
            const mA = a.deliveryMonth || '9999-99';
            const mB = b.deliveryMonth || '9999-99';
            if (mA !== mB) return mA.localeCompare(mB);

            const orderA = a.allocNo !== undefined ? a.allocNo : (a.sortOrder !== undefined ? a.sortOrder : 999999);
            const orderB = b.allocNo !== undefined ? b.allocNo : (b.sortOrder !== undefined ? b.sortOrder : 999999);
            return orderA - orderB;
        });
    }

    React.useEffect(() => {
        const container = ctx.tableContainerRef.current;
        if (!container) return;

        if (ctx.drayScrollPosRef.current !== null) {
            container.scrollTop = ctx.drayScrollPosRef.current;
        } else if (filterMode === 'year' || filterMode === 'all') {
            setTimeout(() => {
                const currentMonthRow = container.querySelector(`tr[data-month="${ctx.currentMonthStr}"]`);
                const thead = container.querySelector('thead');
                if (currentMonthRow && container) {
                    const headerHeight = thead ? thead.offsetHeight : 0;
                    container.scrollTop = Math.max(0, currentMonthRow.offsetTop - headerHeight);
                }
            }, 300);
        }

        const handleScroll = () => { if (container) ctx.drayScrollPosRef.current = container.scrollTop; };
        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [filterMode, ctx.currentMonthStr]);

    const handleSortClick = (key, label, e) => {
        const isShift = e.shiftKey;
        let newConfig = [...sortConfig];
        const existingIdx = newConfig.findIndex(s => s.key === key);

        if (!isShift) {
            if (existingIdx >= 0) {
                const currDir = newConfig[existingIdx].direction;
                newConfig = currDir === 'asc' ? [{ key, label, direction: 'desc' }] : [];
            } else {
                newConfig = [{ key, label, direction: 'asc' }];
            }
        } else {
            if (existingIdx >= 0) {
                const currDir = newConfig[existingIdx].direction;
                if (currDir === 'asc') { newConfig[existingIdx].direction = 'desc'; } else { newConfig.splice(existingIdx, 1); }
            } else {
                newConfig.push({ key, label, direction: 'asc' });
            }
        }
        setSortConfig(newConfig);
    };

    const handlePartsChange = (containerId, model, partKey, value, originalVal) => {
        const targetContainer = yoshiiContainers.find(c => c.id === containerId);
        if (!targetContainer) return;
        
        const currentParts = targetContainer.spareParts || {};
        const modelParts = currentParts[model] || {};
        const updatedParts = { ...currentParts, [model]: { ...modelParts, [partKey]: value } };

        const currentOrigParts = targetContainer.originals?.spareParts || {};
        const modelOrigParts = currentOrigParts[model] || {};
        const updatedOrigParts = {
            ...currentOrigParts,
            [model]: {
                ...modelOrigParts,
                [partKey]: modelOrigParts[partKey] !== undefined ? modelOrigParts[partKey] : (originalVal || '')
            }
        };

        const currentMetaParts = targetContainer.originalMetas?.spareParts || {};
        const modelMetaParts = currentMetaParts[model] || {};
        const updatedMetaParts = {
            ...currentMetaParts,
            [model]: {
                ...modelMetaParts,
                [partKey]: modelMetaParts[partKey] !== undefined ? modelMetaParts[partKey] : `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}`
            }
        };
        
        ctx.updateContainer(containerId, { spareParts: updatedParts, originals: { ...(targetContainer.originals || {}), spareParts: updatedOrigParts }, originalMetas: { ...(targetContainer.originalMetas || {}), spareParts: updatedMetaParts } }, targetContainer.deliveryMonth, 'yoshii', `補充部品 [${model}-${partKey}]`);
    };

    const groupedRows = [];
    let currentMonth = null;
    displayContainers.forEach(c => {
        const m = c.deliveryMonth || '未設定';
        if (m !== currentMonth) { groupedRows.push({ isDivider: true, monthLabel: m }); currentMonth = m; }
        groupedRows.push(c);
    });

    return (
        <div className="p-4 bg-white flex-grow flex flex-col h-full">
            <div className="hidden print:block font-bold text-sm text-black mb-1.5 border-b pb-1 text-left w-full">
                吉井電気 ドレージ手配 [仕入先: {ctx.selectedVendorFilter || 'ALL'}] [対象期間: {filterMode === 'current' ? `${ctx.currentMonthStr.replace('-', '/')}分` : filterMode === 'month' ? `${singleMonth.replace('-', '/')}分` : filterMode === 'year' ? `${selectedYear}年度` : `${startMonth.replace('-', '/')}〜${endMonth.replace('-', '/')}`}]
            </div>
            <div className="flex justify-between items-center mb-2 no-print flex-shrink-0">
                <h2 className="text-lg font-bold">吉井電気 ドレージ手配 {ctx.selectedVendorFilter && ctx.selectedVendorFilter !== 'ALL' ? ` [仕入先: ${ctx.selectedVendorFilter}]` : ''}</h2>

                <div className="flex items-center gap-1.5 no-print">
                    <button onClick={() => setExportModal({ isOpen: true, type: 'excel' })} className="px-2.5 py-1 text-xs font-bold rounded bg-emerald-700 hover:bg-emerald-800 text-white shadow transition flex items-center gap-1">📊 Excel出力</button>
                    <button onClick={() => setExportModal({ isOpen: true, type: 'print' })} className="px-2.5 py-1 text-xs font-bold rounded bg-slate-700 hover:bg-slate-800 text-white shadow transition flex items-center gap-1">🖨 印刷</button>
                    <button onClick={ctx.handleStartTracking} className={`px-2.5 py-1 text-xs font-bold rounded shadow transition ${ctx.isChangeTrackingMode ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}>{ctx.isChangeTrackingMode ? '● 変更記録中' : '変更開始'}</button>
                    <button onClick={ctx.handleClearTracking} className="px-2.5 py-1 text-xs font-bold rounded bg-gray-600 hover:bg-gray-700 text-white shadow transition">変更クリア</button>
                </div>
            </div>

            <ScheduleFilterSortControl filterMode={filterMode} setFilterMode={setFilterMode} selectedYear={selectedYear} setSelectedYear={setSelectedYear} singleMonth={singleMonth} setSingleMonth={setSingleMonth} startMonth={startMonth} setStartMonth={setStartMonth} endMonth={endMonth} setEndMonth={setEndMonth} sortConfig={sortConfig} setSortConfig={setSortConfig}/>

            <div className="table-container flex-grow" ref={ctx.tableContainerRef}>
                <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-gray-100 border-b-2 sticky top-0 z-20">
                        <tr className="bg-gray-100 border-b">
                            <th rowSpan="2" className="p-1 w-[60px] border-r">管理番号</th>
                            <th rowSpan="2" className="p-1 w-[58px] border-r">進行状況</th>
                            <th rowSpan="2" onClick={e => handleSortClick('containerNo', 'コンテナNO.', e)} className="p-1 w-[98px] cursor-pointer hover:bg-emerald-100 text-emerald-900 border-r">
                                コンテナNO.{getSortIndicator('containerNo', sortConfig)}
                            </th>
                            <th rowSpan="2" className="p-1 w-[125px] min-w-[120px] border-r">積載型式</th>
                            <th colSpan="3" className="p-1 bg-emerald-50 text-emerald-900 border-r text-center font-bold">補充部品 (PCS)</th>
                            <th rowSpan="2" className="p-1 w-[48px] min-w-[45px] border-r">割振数</th>
                            <th rowSpan="2" className="p-1 w-[48px] min-w-[45px] border-r">総数量</th>
                            <th rowSpan="2" onClick={e => handleSortClick('port', '到着港', e)} className="p-1 w-[54px] min-w-[50px] cursor-pointer hover:bg-emerald-100 text-emerald-900 border-r">
                                到着港{getSortIndicator('port', sortConfig)}
                            </th>
                            <th rowSpan="2" onClick={e => handleSortClick('etd', 'ETD', e)} className="p-1 w-[54px] min-w-[50px] cursor-pointer hover:bg-emerald-100 text-emerald-900 border-r">
                                ETD{getSortIndicator('etd', sortConfig)}
                            </th>
                            <th rowSpan="2" onClick={e => handleSortClick('eta', 'ETA', e)} className="p-1 w-[54px] min-w-[50px] cursor-pointer hover:bg-emerald-100 text-emerald-900 border-r">
                                ETA{getSortIndicator('eta', sortConfig)}
                            </th>
                            <th rowSpan="2" className="p-1 w-[54px] min-w-[50px] border-r">フリータイム</th>
                            <th rowSpan="2" onClick={e => handleSortClick('drayageDeliveryDateCombo', '納品日時', e)} className="p-1 w-[82px] min-w-[78px] cursor-pointer hover:bg-emerald-100 text-emerald-900 border-r" colSpan="2">
                                納品日時{getSortIndicator('drayageDeliveryDateCombo', sortConfig)}
                            </th>
                            <th rowSpan="2" onClick={e => handleSortClick('drayageDestination', '納品先', e)} className="p-1 w-[190px] min-w-[180px] cursor-pointer hover:bg-emerald-100 text-emerald-900 border-r">
                                納品先{getSortIndicator('drayageDestination', sortConfig)}
                            </th>
                            <th rowSpan="2" className="p-1 w-[110px] min-w-[100px] notes-col border-r">備考</th>
                            <th rowSpan="2" className="p-1 w-[42px] min-w-[40px] border-r">サイズ</th>
                            <th rowSpan="2" className="p-1 w-[170px] min-w-[160px]">本船名</th>
                        </tr>
                        <tr className="bg-emerald-50/70 text-emerald-800 text-[10px] font-bold border-b">
                            <th className="p-1 border-r text-center w-10">外装箱</th>
                            <th className="p-1 border-r text-center w-10">化粧箱</th>
                            <th className="p-1 border-r text-center w-10">ラベル</th>
                        </tr>
                    </thead>
                    <tbody>
                        {groupedRows.map((row, idx) => {
                            if (row.isDivider) {
                                const label = row.monthLabel === '未設定' ? '納品月 未設定' : `■ ${row.monthLabel.split('-')[0]}年${row.monthLabel.split('-')[1]}月 納品分`;
                                return <tr key={`div-${idx}`} className="month-divider" data-month={row.monthLabel}><td colSpan={100}>{label}</td></tr>;
                            }

                            const item = row;
                            let cModels = Object.keys(item.allocations || {})
                                .filter(m => item.allocations[m] > 0)
                                .sort((a, b) => {
                                    const orderA = modelOrders[a] !== undefined ? modelOrders[a] : 9999;
                                    const orderB = modelOrders[b] !== undefined ? modelOrders[b] : 9999;
                                    if (orderA !== orderB) return orderA - orderB;
                                    return a.localeCompare(b, 'ja');
                                });

                            if (cModels.length === 0) return null;
                            const totalQty = cModels.reduce((sum, m) => sum + item.allocations[m], 0);

                            return (
                                <tr key={item.id} className={`border-b hover:bg-emerald-50 ${['出港済', '出荷済み', '納品完了'].includes(item.status) ? 'bg-green-50' : ''}`} data-month={item.deliveryMonth || '未設定'}>
                                    <td className="p-1 readonly-cell text-center font-bold">{item.managementNo || '-'}</td>
                                    <td className="p-1 readonly-cell text-center">{item.status || '-'}</td>
                                    <td className="p-1 bg-gray-50 font-bold text-center">{item.containerNo || '-'}</td>
                                    
                                    <td className="p-0.5 readonly-cell text-center align-middle font-bold">
                                        {cModels.map(m => (
                                            <div key={m} className="h-5 flex items-center justify-center border-b last:border-b-0 border-gray-200 py-0 text-xs">{m}</div>
                                        ))}
                                    </td>

                                    <td className="p-0.5 bg-emerald-50/20 text-center align-middle">
                                        {cModels.map(m => {
                                            const parts = (item.spareParts || {})[m] || {};
                                            const origParts = (item.originals?.spareParts || {})[m] || {};
                                            const metaParts = (item.originalMetas || {}).spareParts || {};
                                            const origVal = origParts.outerBox;
                                            const metaStr = (metaParts[m] || {}).outerBox || `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}`;

                                            return (
                                                <div key={m} className="h-5 flex items-center justify-center border-b last:border-b-0 border-gray-200 py-0">
                                                    <div className={`relative ${origVal !== undefined ? 'has-original-tooltip' : ''}`} data-original-val={origVal} data-original-meta={metaStr}>
                                                        <input type="text" maxLength={2} value={parts.outerBox || ''} onChange={e => handlePartsChange(item.id, m, 'outerBox', e.target.value, parts.outerBox || '')} disabled={ctx.authUser && !ctx.authUser.canEdit} className={`spare-part-input ${ctx.isChangeTrackingMode && origVal !== undefined && String(origVal) !== String(parts.outerBox || '') ? 'is-changed-cell' : ''}`} placeholder="0"/>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </td>
                                    <td className="p-0.5 bg-emerald-50/20 text-center align-middle">
                                        {cModels.map(m => {
                                            const parts = (item.spareParts || {})[m] || {};
                                            const origParts = (item.originals?.spareParts || {})[m] || {};
                                            const metaParts = (item.originalMetas || {}).spareParts || {};
                                            const origVal = origParts.innerBox;
                                            const metaStr = (metaParts[m] || {}).innerBox || `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}`;

                                            return (
                                                <div key={m} className="h-5 flex items-center justify-center border-b last:border-b-0 border-gray-200 py-0">
                                                    <div className={`relative ${origVal !== undefined ? 'has-original-tooltip' : ''}`} data-original-val={origVal} data-original-meta={metaStr}>
                                                        <input type="text" maxLength={2} value={parts.innerBox || ''} onChange={e => handlePartsChange(item.id, m, 'innerBox', e.target.value, parts.innerBox || '')} disabled={ctx.authUser && !ctx.authUser.canEdit} className={`spare-part-input ${ctx.isChangeTrackingMode && origVal !== undefined && String(origVal) !== String(parts.innerBox || '') ? 'is-changed-cell' : ''}`} placeholder="0"/>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </td>
                                    <td className="p-0.5 bg-emerald-50/20 text-center align-middle">
                                        {cModels.map(m => {
                                            const parts = (item.spareParts || {})[m] || {};
                                            const origParts = (item.originals?.spareParts || {})[m] || {};
                                            const metaParts = (item.originalMetas || {}).spareParts || {};
                                            const origVal = origParts.label;
                                            const metaStr = (metaParts[m] || {}).label || `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}`;

                                            return (
                                                <div key={m} className="h-5 flex items-center justify-center border-b last:border-b-0 border-gray-200 py-0">
                                                    <div className={`relative ${origVal !== undefined ? 'has-original-tooltip' : ''}`} data-original-val={origVal} data-original-meta={metaStr}>
                                                        <input type="text" maxLength={2} value={parts.label || ''} onChange={e => handlePartsChange(item.id, m, 'label', e.target.value, parts.label || '')} disabled={ctx.authUser && !ctx.authUser.canEdit} className={`spare-part-input ${ctx.isChangeTrackingMode && origVal !== undefined && String(origVal) !== String(parts.label || '') ? 'is-changed-cell' : ''}`} placeholder="0"/>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </td>

                                    <td className="p-0.5 readonly-cell text-right align-middle font-mono">
                                        {cModels.map(m => (
                                            <div key={m} className="h-5 flex items-center justify-end border-b last:border-b-0 border-gray-200 px-1 py-0 text-xs font-bold text-gray-700">
                                                {Number(item.allocations[m] || 0).toLocaleString()}
                                            </div>
                                        ))}
                                    </td>
                                    <td className="p-1 readonly-cell text-right font-bold">{totalQty.toLocaleString()}</td>
                                    <td className="p-1 readonly-cell text-center">{item.port || '-'}</td>
                                    <td className="p-0.5"><LocalInput type="date" value={item.etd} originalValue={(item.originals || {}).etd} originalMeta={(item.originalMetas || {}).etd} onChange={(v, orig) => ctx.updateContainer(item.id, { etd: v, originals: { ...(item.originals || {}), etd: item.originals?.etd !== undefined ? item.originals.etd : orig }, originalMetas: { ...(item.originalMetas || {}), etd: item.originalMetas?.etd !== undefined ? item.originalMetas.etd : `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}` } }, item.deliveryMonth, 'yoshii', 'ETD')} /></td>
                                    <td className="p-0.5"><LocalInput type="date" value={item.eta} originalValue={(item.originals || {}).eta} originalMeta={(item.originalMetas || {}).eta} refDate={item.etd} onChange={(v, orig) => ctx.updateContainer(item.id, { eta: v, originals: { ...(item.originals || {}), eta: item.originals?.eta !== undefined ? item.originals.eta : orig }, originalMetas: { ...(item.originalMetas || {}), eta: item.originalMetas?.eta !== undefined ? item.originalMetas.eta : `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}` } }, item.deliveryMonth, 'yoshii', 'ETA')} /></td>
                                    <td className="p-0.5"><LocalInput type="date" value={item.freeTime} originalValue={(item.originals || {}).freeTime} originalMeta={(item.originalMetas || {}).freeTime} onChange={(v, orig) => ctx.updateContainer(item.id, { freeTime: v, originals: { ...(item.originals || {}), freeTime: item.originals?.freeTime !== undefined ? item.originals.freeTime : orig }, originalMetas: { ...(item.originalMetas || {}), freeTime: item.originalMetas?.freeTime !== undefined ? item.originalMetas.freeTime : `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}` } }, item.deliveryMonth, 'yoshii', 'フリータイム')} /></td>
                                    <td className="p-0.5"><LocalInput type="date" value={item.drayageDeliveryDate} originalValue={(item.originals || {}).drayageDeliveryDate} originalMeta={(item.originalMetas || {}).drayageDeliveryDate} refDate={item.freeTime || item.eta} onChange={(v, orig) => ctx.updateContainer(item.id, { drayageDeliveryDate: v, originals: { ...(item.originals || {}), drayageDeliveryDate: item.originals?.drayageDeliveryDate !== undefined ? item.originals.drayageDeliveryDate : orig }, originalMetas: { ...(item.originalMetas || {}), drayageDeliveryDate: item.originalMetas?.drayageDeliveryDate !== undefined ? item.originalMetas.drayageDeliveryDate : `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}` } }, item.deliveryMonth, 'yoshii', '納品日')} /></td>
                                    <td className="p-0.5"><LocalInput type="time" value={item.drayageDeliveryTime} originalValue={(item.originals || {}).drayageDeliveryTime} originalMeta={(item.originalMetas || {}).drayageDeliveryTime} onChange={(v, orig) => ctx.updateContainer(item.id, { drayageDeliveryTime: v, originals: { ...(item.originals || {}), drayageDeliveryTime: item.originals?.drayageDeliveryTime !== undefined ? item.originals.drayageDeliveryTime : orig }, originalMetas: { ...(item.originalMetas || {}), drayageDeliveryTime: item.originals?.drayageDeliveryTime !== undefined ? item.originals.drayageDeliveryTime : `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}` } }, item.deliveryMonth, 'yoshii', '納品時間')} className="text-center" /></td>
                                    <td className="p-0.5 w-[190px] min-w-[180px]"><DynamicSelect value={item.drayageDestination} originalValue={(item.originals || {}).drayageDestination} originalMeta={(item.originalMetas || {}).drayageDestination} onChange={(val, cat, orig) => ctx.handleSelectChange(item.id, 'drayageDestination', true, 'yoshii', false, '納品先')(val, cat, orig)} category="destinations" options={ctx.masterData.yoshii.destinations} className="text-xs font-bold w-full text-center" /></td>
                                    <td className="p-0.5 notes-cell">
                                        <LocalTextArea value={item.drayageNotes} originalValue={(item.originals || {}).drayageNotes} originalMeta={(item.originalMetas || {}).drayageNotes} onChange={(v, orig) => ctx.updateContainer(item.id, { drayageNotes: v, originals: { ...(item.originals || {}), drayageNotes: item.originals?.drayageNotes !== undefined ? item.originals.drayageNotes : orig }, originalMetas: { ...(item.originalMetas || {}), drayageNotes: item.originals?.drayageNotes !== undefined ? item.originals.drayageNotes : `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}` } }, item.deliveryMonth, 'yoshii', '備考')} isCompact={true} className="text-left text-xs whitespace-normal break-all"/>
                                    </td>
                                    <td className="p-1 readonly-cell text-center">{item.containerSize || '-'}</td>
                                    <td className="p-0.5 readonly-cell text-center font-bold text-xs">{item.vessel || '-'}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            <ExportPrintModal isOpen={exportModal.isOpen} onClose={() => setExportModal({ isOpen: false, type: 'excel' })} screenName="ドレージ手配" currentMonthStr={ctx.currentMonthStr} defaultMode="current" onStartExport={handleExecuteExport} />
        </div>
    );
};