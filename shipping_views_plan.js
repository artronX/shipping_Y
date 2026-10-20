// =========================================================
// shipping_views_plan.js - 出荷計画・割振り画面モジュール
// ★ JSファイル固有バージョン: _js002 (割振り画面 & 計画編集機能 完全復元版)
// =========================================================

const JS_PLAN_VERSION = '_js002';

// 【1. 吉井電気 年間出荷計画ビュー】
const YoshiiPlanView = () => {
    const ctx = React.useContext(AppContext);
    const [exportModal, setExportModal] = React.useState({ isOpen: false, type: 'excel' });

    const baseAppVer = typeof SYSTEM_VERSION !== 'undefined' ? SYSTEM_VERSION : '';
    const displayVer = `${baseAppVer}${JS_PLAN_VERSION}`;

    const handleExecuteExport = ({ selectedYear }) => {
        if (exportModal.type === 'print') {
            setTimeout(() => window.print(), 300);
            return;
        }

        const headers = [
            '仕入先コード', '仕入先名', '型番', '品名', 
            '4月', '5月', '6月', '7月', '8月', '9月', 
            '10月', '11月', '12月', '1月', '2月', '3月', '年間合計'
        ];

        const rows = filteredPlans.map(p => {
            const m = p.months || {};
            const sum = Object.values(m).reduce((a, b) => a + (Number(b) || 0), 0);
            return [
                p.vendorCode || '', p.vendorName || '', p.model || '', p.productName || '',
                m['04'] || 0, m['05'] || 0, m['06'] || 0, m['07'] || 0, m['08'] || 0, m['09'] || 0,
                m['10'] || 0, m['11'] || 0, m['12'] || 0, m['01'] || 0, m['02'] || 0, m['03'] || 0,
                sum
            ];
        });

        const filename = `吉井電気_出荷計画表_${selectedYear}年度.xlsx`;
        exportToExcelSimple({
            title: `吉井電気 出荷計画表 [対象年度: ${selectedYear}年度]`,
            headers, rows, filename
        });
    };

    let filteredPlans = ctx.plans.filter(p => p.company === 'yoshii' || !p.company);
    if (ctx.selectedVendorFilter && ctx.selectedVendorFilter !== 'ALL') {
        filteredPlans = filteredPlans.filter(p => p.vendorCode === ctx.selectedVendorFilter || p.vendorName === ctx.selectedVendorFilter);
    }

    const canEdit = ctx.authUser && ctx.authUser.canEdit;

    const handleMonthChange = (planId, moKey, val, currentMonths = {}) => {
        if (!canEdit) return;
        const numVal = Number(val) || 0;
        const updatedMonths = { ...currentMonths, [moKey]: numVal };
        ctx.updatePlan(planId, { months: updatedMonths }, `計画_${moKey}月`);
    };

    return (
        <div className="p-3 bg-white flex-grow flex flex-col h-full overflow-hidden text-xs">
            {/* ヘッダーエリア */}
            <div className="flex justify-between items-center mb-2 no-print flex-shrink-0">
                <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-indigo-900">吉井電気 年間出荷計画表</h2>
                    <span className="bg-slate-700 text-slate-100 border border-slate-500 text-[10px] font-extrabold px-2 py-0.5 rounded font-mono shadow-sm">
                        {displayVer}
                    </span>
                </div>
                <div className="flex items-center gap-2 font-bold">
                    <button onClick={() => setExportModal({ isOpen: true, type: 'excel' })} className="px-2 py-1 text-xs font-bold rounded bg-emerald-700 hover:bg-emerald-800 text-white shadow transition flex items-center gap-1">📊 Excel出力</button>
                    <button onClick={() => setExportModal({ isOpen: true, type: 'print' })} className="px-2 py-1 text-xs font-bold rounded bg-slate-700 hover:bg-slate-800 text-white shadow transition flex items-center gap-1">🖨 印刷</button>
                </div>
            </div>

            {/* テーブルエリア */}
            <div className="table-container flex-grow border rounded shadow-inner overflow-x-auto overflow-y-auto" ref={ctx.tableContainerRef}>
                <table className="w-full text-center border-collapse text-[11px]">
                    <thead className="sticky top-0 z-30 bg-gray-200 font-bold">
                        <tr className="border-b">
                            <th className="p-1.5 border w-20">仕入先</th>
                            <th className="p-1.5 border w-32">型番</th>
                            <th className="p-1.5 border w-40">品名</th>
                            <th className="p-1 border w-14">4月</th>
                            <th className="p-1 border w-14">5月</th>
                            <th className="p-1 border w-14">6月</th>
                            <th className="p-1 border w-14">7月</th>
                            <th className="p-1 border w-14">8月</th>
                            <th className="p-1 border w-14">9月</th>
                            <th className="p-1 border w-14">10月</th>
                            <th className="p-1 border w-14">11月</th>
                            <th className="p-1 border w-14">12月</th>
                            <th className="p-1 border w-14">1月</th>
                            <th className="p-1 border w-14">2月</th>
                            <th className="p-1 border w-14">3月</th>
                            <th className="p-1.5 border w-20 bg-indigo-50 text-indigo-900">合計</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPlans.length === 0 ? (
                            <tr>
                                <td colSpan="16" className="p-6 text-center text-slate-400 font-bold">
                                    該当する計画データがありません。
                                </td>
                            </tr>
                        ) : (
                            filteredPlans.map((plan, idx) => {
                                const m = plan.months || {};
                                const rowTotal = ['04','05','06','07','08','09','10','11','12','01','02','03']
                                    .reduce((acc, k) => acc + (Number(m[k]) || 0), 0);

                                return (
                                    <tr key={plan.id || idx} className="border-b hover:bg-indigo-50/50 h-7">
                                        <td className="p-1 border font-bold text-indigo-900">{plan.vendorCode || plan.vendorName || '―'}</td>
                                        <td className="p-1 border font-bold text-slate-800 text-left pl-2">{plan.model || '―'}</td>
                                        <td className="p-1 border text-slate-600 text-left pl-2 truncate">{plan.productName || '―'}</td>
                                        
                                        {['04','05','06','07','08','09','10','11','12','01','02','03'].map(moKey => (
                                            <td key={moKey} className="p-0 border text-right font-mono font-bold">
                                                <LocalInput 
                                                    type="number"
                                                    value={m[moKey] !== undefined && m[moKey] !== null ? m[moKey] : ''}
                                                    onChange={(val) => handleMonthChange(plan.id, moKey, val, m)}
                                                    disabled={!canEdit}
                                                    className="w-full h-full text-right font-mono font-bold px-1 bg-transparent border-none outline-none focus:bg-amber-100"
                                                    placeholder="0"
                                                />
                                            </td>
                                        ))}

                                        <td className="p-1 border text-right pr-2 font-mono font-extrabold text-indigo-900 bg-indigo-50/60">
                                            {rowTotal.toLocaleString()}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <ExportPrintModal 
                isOpen={exportModal.isOpen} 
                onClose={() => setExportModal({ isOpen: false, type: 'excel' })} 
                screenName="年間出荷計画表" 
                currentMonthStr={ctx.currentMonthStr} 
                defaultMode="year" 
                onStartExport={handleExecuteExport} 
            />
        </div>
    );
};

// 【2. 吉井電気 割振り画面ビュー (欠落コンポーネント完全復元)】
const YoshiiAllocationView = () => {
    const ctx = React.useContext(AppContext);
    const [exportModal, setExportModal] = React.useState({ isOpen: false, type: 'excel' });

    const baseAppVer = typeof SYSTEM_VERSION !== 'undefined' ? SYSTEM_VERSION : '';
    const displayVer = `${baseAppVer}${JS_PLAN_VERSION}`;

    const canEdit = ctx.authUser && ctx.authUser.canEdit;

    // 対象月のコンテナ一覧（並び順順）
    let monthContainers = ctx.containers.filter(c => c.company === 'yoshii' && c.deliveryMonth === ctx.yoshiiAllocMonth);
    monthContainers.sort((a, b) => (a.allocNo || a.sortOrder || 0) - (b.allocNo || b.sortOrder || 0));

    // 型番マスター一覧
    let targetPlans = ctx.plans.filter(p => p.company === 'yoshii' || !p.company);
    if (ctx.selectedVendorFilter && ctx.selectedVendorFilter !== 'ALL') {
        targetPlans = targetPlans.filter(p => p.vendorCode === ctx.selectedVendorFilter || p.vendorName === ctx.selectedVendorFilter);
    }

    const handleAddContainer = async () => {
        if (!canEdit) return;
        const newNo = monthContainers.length + 1;
        await ctx.updateContainer(null, {
            company: 'yoshii',
            deliveryMonth: ctx.yoshiiAllocMonth,
            allocNo: newNo,
            sortOrder: newNo,
            managementNo: `C-${newNo}`,
            allocations: {},
            totalQuantity: 0,
            status: '未確定'
        }, ctx.yoshiiAllocMonth, 'yoshii', 'コンテナ追加');
    };

    const handleExecuteExport = ({ selectedYear }) => {
        if (exportModal.type === 'print') {
            setTimeout(() => window.print(), 300);
            return;
        }

        const headers = ['順序', '管理番号', '進行状況', 'コンテナNo.', '到着港', 'ETD', 'ETA', '合計数量'];
        targetPlans.forEach(p => headers.push(p.model));

        const rows = monthContainers.map(c => {
            const alloc = c.allocations || {};
            const r = [
                c.allocNo || '', c.managementNo || '', c.status || '', c.containerNo || '',
                c.port || '', c.etd || '', c.eta || '', c.totalQuantity || 0
            ];
            targetPlans.forEach(p => r.push(alloc[p.model] || 0));
            return r;
        });

        const filename = `吉井電気_割振表_${ctx.yoshiiAllocMonth}.xlsx`;
        exportToExcelSimple({
            title: `吉井電気 コンテナ割振表 [対象月: ${ctx.yoshiiAllocMonth}]`,
            headers, rows, filename
        });
    };

    return (
        <div className="p-3 bg-white flex-grow flex flex-col h-full overflow-hidden text-xs">
            {/* ヘッダーエリア */}
            <div className="flex justify-between items-center mb-2 no-print flex-shrink-0">
                <div className="flex items-center gap-3">
                    <h2 className="text-base font-bold text-indigo-900">吉井電気 コンテナ割振管理</h2>
                    <span className="bg-slate-700 text-slate-100 border border-slate-500 text-[10px] font-extrabold px-2 py-0.5 rounded font-mono shadow-sm">
                        {displayVer}
                    </span>
                    <div className="flex items-center gap-1 font-bold ml-4">
                        <label className="text-slate-600">対象月:</label>
                        <input 
                            type="month" 
                            value={ctx.yoshiiAllocMonth} 
                            onChange={e => ctx.setYoshiiAllocMonth(e.target.value)}
                            className="border rounded px-2 py-0.5 font-bold text-xs bg-slate-50"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 font-bold">
                    {canEdit && (
                        <button onClick={handleAddContainer} className="px-3 py-1 text-xs font-bold rounded bg-indigo-600 hover:bg-indigo-700 text-white shadow transition flex items-center gap-1">
                            ➕ コンテナ追加
                        </button>
                    )}
                    <button onClick={() => setExportModal({ isOpen: true, type: 'excel' })} className="px-2 py-1 text-xs font-bold rounded bg-emerald-700 hover:bg-emerald-800 text-white shadow transition flex items-center gap-1">📊 Excel出力</button>
                    <button onClick={() => setExportModal({ isOpen: true, type: 'print' })} className="px-2 py-1 text-xs font-bold rounded bg-slate-700 hover:bg-slate-800 text-white shadow transition flex items-center gap-1">🖨 印刷</button>
                </div>
            </div>

            {/* テーブルエリア */}
            <div className="table-container flex-grow border rounded shadow-inner overflow-x-auto overflow-y-auto" ref={ctx.tableContainerRef}>
                <table className="w-full text-center border-collapse text-[11px]">
                    <thead className="sticky top-0 z-30 bg-gray-200 font-bold">
                        <tr className="border-b">
                            <th className="p-1 border w-8">移動</th>
                            <th className="p-1 border w-10">No</th>
                            <th className="p-1 border w-24">管理番号</th>
                            <th className="p-1 border w-24">進行状況</th>
                            <th className="p-1 border w-28">コンテナNo</th>
                            <th className="p-1 border w-20">到着港</th>
                            <th className="p-1 border w-24">ETD</th>
                            <th className="p-1 border w-24">ETA</th>
                            <th className="p-1.5 border w-20 bg-emerald-100 text-emerald-900 font-extrabold">合計数量</th>
                            {targetPlans.map(p => (
                                <th key={p.id || p.model} className="p-1 border min-w-[90px] max-w-[120px] bg-slate-100 truncate" title={p.model}>
                                    {p.model}
                                </th>
                            ))}
                            <th className="p-1 border w-12 no-print">削除</th>
                        </tr>
                    </thead>
                    <tbody>
                        {monthContainers.length === 0 ? (
                            <tr>
                                <td colSpan={10 + targetPlans.length} className="p-6 text-center text-slate-400 font-bold">
                                    {ctx.yoshiiAllocMonth} の割振りコンテナデータはありません。「コンテナ追加」ボタンから作成してください。
                                </td>
                            </tr>
                        ) : (
                            monthContainers.map((c, idx) => {
                                const allocMap = c.allocations || {};
                                const isDragged = ctx.draggedRowId === c.id;
                                const isDragOver = ctx.dragOverRowId === c.id;

                                return (
                                    <tr 
                                        key={c.id || idx} 
                                        draggable={canEdit}
                                        onDragStart={(e) => ctx.handleDragStart(e, c.id)}
                                        onDragOver={(e) => ctx.handleDragOver(e, c.id)}
                                        onDragEnd={ctx.handleDragEnd}
                                        onDrop={(e) => ctx.handleDrop(e, c.id, monthContainers)}
                                        className={`border-b hover:bg-slate-50 h-8 transition ${isDragged ? 'opacity-40 bg-indigo-100' : ''} ${isDragOver ? 'border-t-2 border-t-indigo-600 bg-indigo-50' : ''}`}
                                    >
                                        <td className="p-1 border text-center text-slate-400 drag-handle cursor-grab active:cursor-grabbing font-bold">
                                            ☰
                                        </td>
                                        <td className="p-1 border font-mono font-bold text-slate-600 text-center">
                                            {idx + 1}
                                        </td>
                                        <td className="p-0.5 border">
                                            <LocalInput 
                                                value={c.managementNo || ''} 
                                                onChange={(val) => ctx.updateContainer(c.id, { managementNo: val }, ctx.yoshiiAllocMonth, 'yoshii', '管理番号')}
                                                disabled={!canEdit}
                                                className="w-full text-center font-bold border-none bg-transparent"
                                                placeholder="管理番号"
                                            />
                                        </td>
                                        <td className="p-0.5 border">
                                            <select 
                                                value={c.status || '未確定'}
                                                onChange={(e) => ctx.handleSelectChange(c.id, 'status', true, 'yoshii', true, '進行状況')(e.target.value)}
                                                disabled={!canEdit}
                                                className="w-full text-center border-none bg-transparent font-bold cursor-pointer"
                                            >
                                                {(ctx.masterData?.common?.statuses || []).map((st, i) => (
                                                    <option key={i} value={st}>{st}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="p-0.5 border">
                                            <LocalInput 
                                                value={c.containerNo || ''} 
                                                onChange={(val) => ctx.updateContainer(c.id, { containerNo: val }, ctx.yoshiiAllocMonth, 'yoshii', 'コンテナNo')}
                                                disabled={!canEdit}
                                                className="w-full text-center font-mono font-bold border-none bg-transparent"
                                                placeholder="コンテナNo"
                                            />
                                        </td>
                                        <td className="p-0.5 border">
                                            <select 
                                                value={c.port || ''}
                                                onChange={(e) => ctx.handleSelectChange(c.id, 'port', true, 'yoshii', true, '到着港')(e.target.value)}
                                                disabled={!canEdit}
                                                className="w-full text-center border-none bg-transparent font-bold cursor-pointer"
                                            >
                                                <option value="">未選択</option>
                                                {(ctx.masterData?.yoshii?.ports || []).map((pt, i) => (
                                                    <option key={i} value={pt}>{pt}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="p-0.5 border">
                                            <LocalInput 
                                                type="date"
                                                value={c.etd || ''} 
                                                onChange={(val) => ctx.updateContainer(c.id, { etd: val }, ctx.yoshiiAllocMonth, 'yoshii', 'ETD')}
                                                disabled={!canEdit}
                                                className="w-full text-center font-mono border-none bg-transparent text-[10px]"
                                            />
                                        </td>
                                        <td className="p-0.5 border">
                                            <LocalInput 
                                                type="date"
                                                value={c.eta || ''} 
                                                onChange={(val) => ctx.updateContainer(c.id, { eta: val }, ctx.yoshiiAllocMonth, 'yoshii', 'ETA')}
                                                disabled={!canEdit}
                                                className="w-full text-center font-mono border-none bg-transparent text-[10px]"
                                            />
                                        </td>
                                        <td className="p-1 border text-right pr-2 font-mono font-extrabold text-emerald-900 bg-emerald-50/70">
                                            {(c.totalQuantity || 0).toLocaleString()}
                                        </td>

                                        {/* 各型番の割振入力セル */}
                                        {targetPlans.map(p => {
                                            const qty = allocMap[p.model] !== undefined ? allocMap[p.model] : '';
                                            return (
                                                <td key={p.id || p.model} className="p-0 border font-mono">
                                                    <LocalInput 
                                                        type="number"
                                                        value={qty}
                                                        onChange={(val) => {
                                                            const num = Number(val) || 0;
                                                            const updatedAlloc = { ...allocMap, [p.model]: num };
                                                            const newTotal = Object.values(updatedAlloc).reduce((a, b) => a + (Number(b) || 0), 0);
                                                            ctx.updateContainer(c.id, { allocations: updatedAlloc, totalQuantity: newTotal }, ctx.yoshiiAllocMonth, 'yoshii', `割振_${p.model}`);
                                                        }}
                                                        disabled={!canEdit}
                                                        className="w-full h-full text-right font-mono font-bold px-1 bg-transparent border-none outline-none focus:bg-emerald-100 text-emerald-900"
                                                        placeholder="0"
                                                    />
                                                </td>
                                            );
                                        })}

                                        <td className="p-1 border text-center no-print">
                                            {canEdit && (
                                                <button 
                                                    onClick={() => {
                                                        if (confirm(`管理番号 "${c.managementNo || '未設定'}" を削除してよろしいですか？`)) {
                                                            ctx.deleteContainer(c.id);
                                                        }
                                                    }}
                                                    className="text-red-500 hover:text-red-700 font-bold px-1"
                                                    title="コンテナ削除"
                                                >
                                                    🗑
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <ExportPrintModal 
                isOpen={exportModal.isOpen} 
                onClose={() => setExportModal({ isOpen: false, type: 'excel' })} 
                screenName="コンテナ割振表" 
                currentMonthStr={ctx.currentMonthStr} 
                defaultMode="year" 
                onStartExport={handleExecuteExport} 
            />
        </div>
    );
};