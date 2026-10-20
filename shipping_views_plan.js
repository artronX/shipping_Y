// =========================================================
// shipping_views_plan.js - 出荷計画画面モジュール
// ★ JSファイル固有バージョン: _js001 (バージョン一元表示対応)
// =========================================================

const JS_PLAN_VERSION = '_js001';

// 【吉井電気 出荷計画ビュー】
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

    return (
        <div className="p-3 bg-white flex-grow flex flex-col h-full overflow-hidden text-xs">
            {/* ヘッダーエリア (タイトル & バッジ & ボタン群) */}
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
                                            <td key={moKey} className="p-0.5 border text-right pr-1 font-mono font-bold">
                                                {m[moKey] ? Number(m[moKey]).toLocaleString() : '0'}
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