// =========================================================
// shipping_views_plan.js - 計画・割振り画面モジュール (WebVer. 115 構文エラー完全解消版)
// =========================================================

const formatModelWithBreak = (m) => {
    if (!m) return '';
    const idx = String(m).indexOf('-');
    if (idx === -1) return m;
    return (
        <span>
            {m.substring(0, idx + 1)}
            <br />
            {m.substring(idx + 1)}
        </span>
    );
};

// 【型式編集モーダル】
const ModelEditModal = ({ isOpen, onClose, company }) => {
    const ctx = React.useContext(AppContext);
    const [models, setModels] = React.useState([]);

    React.useEffect(() => {
        if (isOpen && ctx.masterData && ctx.masterData[company]) {
            const currentModels = ctx.masterData[company].models || [];
            const currentDetails = ctx.masterData[company].modelDetails || {};
            
            const list = currentModels.map(m => {
                const dt = currentDetails[m] || {};
                return {
                    model: m,
                    productName: dt.productName || '',
                    janCode: dt.janCode || '',
                    vendorCode: dt.vendorCode || ''
                };
            });
            setModels(list);
        }
    }, [isOpen, ctx.masterData, company]);

    if (!isOpen) return null;

    const handleSave = async () => {
        const detailsObj = {};
        const modelsArr = [];

        models.forEach(item => {
            const m = item.model.trim();
            if (m) {
                modelsArr.push(m);
                detailsObj[m] = {
                    productName: item.productName,
                    janCode: item.janCode,
                    vendorCode: item.vendorCode
                };
            }
        });

        const newMaster = {
            ...ctx.masterData,
            [company]: {
                ...(ctx.masterData[company] || {}),
                models: modelsArr,
                modelDetails: detailsObj
            }
        };

        await firebase.firestore().collection('shipping_settings').doc('master_data_v5').set(newMaster, { merge: true });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl flex flex-col max-h-[85vh] text-xs">
                <h3 className="font-bold text-sm border-b pb-2 text-gray-800">✏ 型式一覧・基本情報の編集</h3>
                <div className="overflow-y-auto flex-grow my-4 border rounded p-2">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-100 font-bold sticky top-0">
                            <tr>
                                <th className="p-1 border">型式名</th>
                                <th className="p-1 border w-16 text-center">仕入先</th>
                                <th className="p-1 border">品名</th>
                                <th className="p-1 border">JANコード</th>
                            </tr>
                        </thead>
                        <tbody>
                            {models.map((item, idx) => (
                                <tr key={idx} className="border-b">
                                    <td className="p-1 border font-bold">{item.model}</td>
                                    <td className="p-1 border">
                                        <input type="text" value={item.vendorCode} onChange={e => {
                                            const newL = [...models];
                                            newL[idx].vendorCode = e.target.value;
                                            setModels(newL);
                                        }} className="w-full border p-0.5 text-center font-mono"/>
                                    </td>
                                    <td className="p-1 border">
                                        <input type="text" value={item.productName} onChange={e => {
                                            const newL = [...models];
                                            newL[idx].productName = e.target.value;
                                            setModels(newL);
                                        }} className="w-full border p-0.5"/>
                                    </td>
                                    <td className="p-1 border">
                                        <input type="text" value={item.janCode} onChange={e => {
                                            const newL = [...models];
                                            newL[idx].janCode = e.target.value;
                                            setModels(newL);
                                        }} className="w-full border p-0.5 font-mono"/>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-end gap-2 border-t pt-3">
                    <button onClick={onClose} className="bg-gray-200 text-gray-700 px-3 py-1 rounded font-bold">キャンセル</button>
                    <button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded font-bold shadow">保存する</button>
                </div>
            </div>
        </div>
    );
};

// 【計画画面ビュー】
const YoshiiPlanView = () => {
    const ctx = React.useContext(AppContext);
    const [exportModal, setExportModal] = React.useState({ isOpen: false, type: 'excel' });

    const handleExecuteExport = ({ mode, selectedYear: selYr, singleMonth: sgMo, startMonth: sMo, endMonth: eMo }) => {
        const targetVendor = ctx.selectedVendorFilter || 'ALL';
        if (exportModal.type === 'print') {
            setTimeout(() => window.print(), 300);
            return;
        }

        const headers = ['仕入先コード', '型式', '品名', 'JANコード', '合計', ...displayMonths.map(mo => mo.replace('-', '/')), '備考 / 出荷調整状況'];
        const rows = visibleModels.map(m => {
            const matchModelDetails = ctx.masterData.yoshii?.modelDetails?.[m] || {};
            const normTarget = normalizeModelCode(m);
            const matchPlanInfo = yoshiiPlans.find(p => normalizeModelCode(p.model) === normTarget && (p.productName || p.janCode || p.notes));
            
            const currentProdName = matchModelDetails.productName !== undefined ? matchModelDetails.productName : (matchPlanInfo?.productName || '');
            const currentJanCode = matchModelDetails.janCode !== undefined ? matchModelDetails.janCode : (matchPlanInfo?.janCode || '');
            const currentVendorCode = matchModelDetails.vendorCode !== undefined ? matchModelDetails.vendorCode : (matchPlanInfo?.vendorCode || '');
            const currentNotes = matchModelDetails.notes !== undefined ? matchModelDetails.notes : (matchPlanInfo?.notes || '');
            const rowTot = calculateRowTotal(m);

            const monthQtys = displayMonths.map(mo => {
                const qty = getPlanData(m, mo)?.quantity;
                return qty !== undefined && qty !== null && qty !== '' ? Number(qty) : '';
            });

            return [currentVendorCode, m, currentProdName, currentJanCode, rowTot, ...monthQtys, currentNotes];
        });

        const dateTag = mode === 'current' ? formatYYMM(ctx.currentMonthStr) : mode === 'year' ? `${selYr}年度` : mode === 'single' ? formatYYMM(sgMo) : `${formatYYMM(sMo)}_${formatYYMM(eMo)}`;
        const filename = `${targetVendor}_納品出荷計画_${dateTag}.xlsx`;

        exportToExcelSimple({
            title: `吉井電気 納品・出荷計画 [仕入先: ${targetVendor}] [期間: ${dateTag}]`,
            headers, rows, filename
        });
    };

    const [categoryFilter, setCategoryFilter] = React.useState('全体');
    const [selectedModelFilter, setSelectedModelFilter] = React.useState('ALL');
    const [showHistory, setShowHistory] = React.useState(false);

    const [rangeMode, setRangeMode] = React.useState('year');
    const [selectedYear, setSelectedYear] = React.useState(2026);
    const [customStartMonth, setCustomStartMonth] = React.useState('2026-04');
    const [customEndMonth, setCustomEndMonth] = React.useState('2027-03');

    const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
    const [newModel, setNewModel] = React.useState('');
    const [newProductName, setNewProductName] = React.useState('');
    const [newJanCode, setNewJanCode] = React.useState('');
    const [newVendorCode, setNewJanVendorCode] = React.useState('');

    const [draggedModel, setDraggedModel] = React.useState(null);
    const [dragOverModel, setDragOverModel] = React.useState(null);

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
                const yr = curr