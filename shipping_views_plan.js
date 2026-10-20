// =========================================================
// shipping_views_plan.js - 出荷計画・割振り画面モジュール
// ★ WebVer. 123 対応 / _js007 バージョン繰り上げ版
// ★ 勝手なfont-bold除去 (V94標準ウェイト font-mono 復元)
// ★ 管理番号の表示位置を全画面【中央揃え(text-center)】に統一
// ★ 割振り画面【当月(currentMonthStr)】初期表示の非同期上書き防止修復
// =========================================================

const JS_PLAN_VERSION = '_js007';

// 【型式編集・削除モーダル (V94完全移植)】
const ModelEditModal = ({ isOpen, onClose, company='yoshii' }) => {
    const ctx = React.useContext(AppContext);
    const [models, setModels] = React.useState([]);
    const [editingModel, setEditingModel] = React.useState(null);
    const [newModelName, setNewModelName] = React.useState('');
    const [deleteTarget, setDeleteTarget] = React.useState(null);

    React.useEffect(() => {
        if (isOpen) {
            const masterModels = ctx.masterData[company]?.models || [];
            const planModels = ctx.plans.filter(p => p.company === company && p.model).map(p => p.model);
            const mergedSet = new Set([...masterModels, ...planModels]);
            const modelOrders = ctx.masterData[company]?.modelOrder || {};
            const compiledModels = Array.from(mergedSet).sort((a, b) => {
                const orderA = modelOrders[a] !== undefined ? modelOrders[a] : 9999;
                const orderB = modelOrders[b] !== undefined ? modelOrders[b] : 9999;
                if (orderA !== orderB) return orderA - orderB;
                return a.localeCompare(b, 'ja');
            });
            setModels(compiledModels);
        }
    }, [isOpen, ctx.masterData, ctx.plans, company]);

    if (!isOpen) return null;

    const handleStartEdit = (m) => {
        setEditingModel(m);
        setNewModelName(m);
    };

    const handleSaveEdit = async () => {
        if (!newModelName.trim()) return alert("型式名を入力してください。");
        const targetOld = editingModel;
        const targetNew = newModelName.trim();

        if (targetOld === targetNew) {
            setEditingModel(null);
            return;
        }

        const currentMaster = ctx.masterData[company] || {};
        const updatedModels = Array.from(new Set([...(currentMaster.models || []).map(m => m === targetOld ? targetNew : m), targetNew]));
        const currentDetails = { ...(currentMaster.modelDetails || {}) };
        if (currentDetails[targetOld]) {
            currentDetails[targetNew] = currentDetails[targetOld];
            delete currentDetails[targetOld];
        }

        const newMaster = {
            ...ctx.masterData,
            [company]: { ...currentMaster, models: updatedModels, modelDetails: currentDetails }
        };

        await firebase.firestore().collection('shipping_settings').doc('master_data_v5').set(newMaster, { merge: true });

        const normOld = normalizeModelCode(targetOld);
        const matchingPlans = ctx.plans.filter(p => p.company === company && normalizeModelCode(p.model) === normOld);
        if (matchingPlans.length > 0) {
            const batch = firebase.firestore().batch();
            matchingPlans.forEach(p => {
                batch.update(firebase.firestore().collection('shipments').doc(p.id), { model: targetNew });
            });
            await batch.commit();
        }

        ctx.logOperation('型式マスタ', '修正', `型式名を [${targetOld}] から [${targetNew}] へ更新`);
        setEditingModel(null);
    };

    const promptDeleteConfirm = (modelToDelete) => {
        const normTarget = normalizeModelCode(modelToDelete);
        const matchingPlans = ctx.plans.filter(p => p.company === company && normalizeModelCode(p.model) === normTarget);
        const totalQty = matchingPlans.reduce((sum, p) => sum + Number(p.quantity || 0), 0);
        setDeleteTarget({ model: modelToDelete, totalQty });
    };

    const handleExecuteDeleteModel = async () => {
        if (!deleteTarget) return;
        const modelToDelete = deleteTarget.model;

        const currentMaster = ctx.masterData[company] || {};
        const updatedModels = (currentMaster.models || []).filter(m => m !== modelToDelete);
        const currentDetails = { ...(currentMaster.modelDetails || {}) };
        delete currentDetails[modelToDelete];

        const newMaster = {
            ...ctx.masterData,
            [company]: { ...currentMaster, models: updatedModels, modelDetails: currentDetails }
        };

        await firebase.firestore().collection('shipping_settings').doc('master_data_v5').set(newMaster, { merge: true });

        const normTarget = normalizeModelCode(modelToDelete);
        const matchingPlans = ctx.plans.filter(p => p.company === company && normalizeModelCode(p.model) === normTarget);
        if (matchingPlans.length > 0) {
            const batch = firebase.firestore().batch();
            matchingPlans.forEach(p => {
                batch.delete(firebase.firestore().collection('shipments').doc(p.id));
            });
            await batch.commit();
        }

        ctx.logOperation('型式マスタ', '削除', `型式 [${modelToDelete}] (計画数: ${deleteTarget.totalQty}) を削除`);
        setDeleteTarget(null);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-xl h-[75vh] flex flex-col relative">
                <div className="p-4 bg-emerald-700 text-white flex justify-between items-center rounded-t-lg">
                    <h3 className="font-bold text-base flex items-center gap-2">✏ 型式マスタの編集・削除 ({company === 'yoshii' ? '吉井電気' : '日立GLS'})</h3>
                    <button onClick={onClose} className="text-xl font-bold hover:text-gray-300">×</button>
                </div>
                <div className="p-4 overflow-y-auto flex-grow">
                    <table className="w-full text-xs border-collapse">
                        <thead className="bg-gray-100 sticky top-0">
                            <tr className="border-b text-left">
                                <th className="p-2 border">登録型式名</th>
                                <th className="p-2 border w-24 text-center">編集</th>
                                <th className="p-2 border w-20 text-center">削除</th>
                            </tr>
                        </thead>
                        <tbody>
                            {models.length === 0 ? (
                                <tr><td colSpan="3" className="p-4 text-center text-gray-500">登録型式はありません。</td></tr>
                            ) : (
                                models.map(m => (
                                    <tr key={m} className="border-b hover:bg-gray-50">
                                        <td className="p-2 border font-bold">
                                            {editingModel === m ? (
                                                <input 
                                                    type="text" 
                                                    value={newModelName} 
                                                    onChange={e => setNewModelName(e.target.value)} 
                                                    className="w-full border p-1 rounded font-bold text-sm bg-yellow-50"
                                                    autoFocus
                                                />
                                            ) : (
                                                m
                                            )}
                                        </td>
                                        <td className="p-2 border text-center">
                                            {editingModel === m ? (
                                                <button onClick={handleSaveEdit} className="bg-blue-600 text-white px-2 py-1 rounded font-bold hover:bg-blue-700">保存</button>
                                            ) : (
                                                <button onClick={() => handleStartEdit(m)} className="bg-gray-200 text-gray-800 px-2 py-1 rounded font-bold hover:bg-gray-300">✏ 修正</button>
                                            )}
                                        </td>
                                        <td className="p-2 border text-center">
                                            <button onClick={() => promptDeleteConfirm(m)} className="bg-red-500 text-white px-2 py-1 rounded font-bold hover:bg-red-600">削除</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-3 bg-gray-100 border-t flex justify-end">
                    <button onClick={onClose} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-1 rounded text-xs font-bold">閉じる</button>
                </div>

                {deleteTarget && (
                    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl border-2 border-red-500 max-w-md w-full p-6 space-y-4 text-center">
                            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">⚠️</div>
                            <h3 className="text-base font-bold text-slate-800 border-b pb-2">型式データの完全削除確認</h3>
                            <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-left space-y-2 text-xs">
                                <p className="font-bold text-slate-700">以下の型式および関連計画データを削除します。</p>
                                <div className="flex justify-between items-center bg-white p-2.5 rounded border border-red-300">
                                    <span className="text-gray-600 font-bold">対象型式名:</span>
                                    <span className="text-red-600 font-extrabold text-sm font-mono">{deleteTarget.model}</span>
                                </div>
                                <div className="flex justify-between items-center bg-white p-2.5 rounded border border-red-300">
                                    <span className="text-gray-600 font-bold">年間合計計画台数:</span>
                                    <span className="text-emerald-700 font-extrabold text-sm">{deleteTarget.totalQty.toLocaleString()} 台</span>
                                </div>
                            </div>
                            <p className="text-xs text-red-600 font-bold">※削除するとデータベースから計画数が消去されます。本当に実行しますか？</p>
                            <div className="flex justify-end gap-3 pt-2">
                                <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 font-bold text-xs text-gray-700">キャンセル</button>
                                <button onClick={handleExecuteDeleteModel} className="px-5 py-2 rounded bg-red-600 hover:bg-red-700 font-bold text-xs text-white shadow">本当に削除する</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// 【1. 吉井電気 納品・出荷計画ビュー (YoshiiPlanView)】
const YoshiiPlanView = () => {
    const ctx = React.useContext(AppContext);
    const [exportModal, setExportModal] = React.useState({ isOpen: false, type: 'excel' });

    const baseAppVer = typeof SYSTEM_VERSION !== 'undefined' ? SYSTEM_VERSION : '';
    const cmpVer = typeof JS_COMPONENTS_VERSION !== 'undefined' ? JS_COMPONENTS_VERSION : '';
    const displayVer = `${baseAppVer}${JS_PLAN_VERSION}${cmpVer}`;

    const handleExecuteExport = ({ mode, selectedYear: selYr, singleMonth: sgMo, startMonth: sMo, endMonth: eMo }) => {
        const targetVendor = ctx.selectedVendorFilter || 'ALL';
        
        if (exportModal.type === 'print') {
            setTimeout(() => window.print(), 300);
            return;
        }

        const headers = ['仕入先コード', '型式', '品名', 'JANコード', '合計', ...displayMonths.map(mo => mo.replace('-', '/')), '備考 / 出荷調整状況'];
        
        const monthTotals = displayMonths.map(mo => calculateColTotal(mo));
        const totalRow = ['-', '-', '月間合計', '-', totalGrandTotal, ...monthTotals, '-'];

        const dataRows = visibleModels.map(m => {
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
                return qty !== undefined && qty !== '' ? Number(qty) : 0;
            });

            return [currentVendorCode, m, currentProdName, currentJanCode, rowTot, ...monthQtys, currentNotes];
        });

        const dateTag = mode === 'current' ? formatYYMM(ctx.currentMonthStr) : mode === 'year' ? `${selYr}年度` : mode === 'single' ? formatYYMM(sgMo) : `${formatYYMM(sMo)}_${formatYYMM(eMo)}`;
        const filename = `${targetVendor}_納品出荷計画_${dateTag}.xlsx`;

        exportToExcelSimple({
            title: `吉井電気 納品・出荷計画 [仕入先: ${targetVendor}] [期間: ${dateTag}]`,
            headers, rows: [totalRow, ...dataRows], filename
        });
    };

    const [categoryFilter, setCategoryFilter] = React.useState('全体');
    const [showHistory, setShowHistory] = React.useState(false);
    const [onlyCheckedFilter, setOnlyCheckedFilter] = React.useState(false);

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

    const [checkedModels, setCheckedModels] = React.useState(() => {
        return ctx.masterData.yoshii?.checkedModels || {};
    });

    React.useEffect(() => {
        if (ctx.masterData.yoshii?.checkedModels) {
            setCheckedModels(ctx.masterData.yoshii.checkedModels);
        }
    }, [ctx.masterData.yoshii?.checkedModels]);

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
    const yoshiiPlans = ctx.plans.filter(p => p.company === 'yoshii');
    const modelOrders = ctx.masterData.yoshii?.modelOrder || {};

    let modelsSet = new Set(yoshiiPlans.filter(p => p.model).map(p => p.model));
    (ctx.masterData.yoshii.models || []).forEach(m => modelsSet.add(m));
    
    let allModels = Array.from(modelsSet).sort((a,b) => {
        const orderA = modelOrders[a] !== undefined ? modelOrders[a] : 9999;
        const orderB = modelOrders[b] !== undefined ? modelOrders[b] : 9999;
        if (orderA !== orderB) return orderA - orderB;
        return a.localeCompare(b, 'ja');
    });

    if (categoryFilter === 'KS') {
        allModels = allModels.filter(m => m.toUpperCase().includes('KS'));
    } else if (categoryFilter === 'ALC') {
        allModels = allModels.filter(m => m.toUpperCase().includes('ALC'));
    } else if (categoryFilter === '（Z)CCN' || categoryFilter === '(Z)CCN') {
        allModels = allModels.filter(m => m.toUpperCase().includes('CCN') || m.toUpperCase().includes('ZCCN'));
    } else if (categoryFilter === 'その他') {
        allModels = allModels.filter(m => {
            const u = m.toUpperCase();
            return !u.includes('KS') && !u.includes('ALC') && !u.includes('CCN') && !u.includes('ZCCN');
        });
    }

    if (ctx.selectedVendorFilter && ctx.selectedVendorFilter !== 'ALL') {
        allModels = allModels.filter(m => {
            const matchModelDetails = ctx.masterData.yoshii?.modelDetails?.[m] || {};
            const normTarget = normalizeModelCode(m);
            const matchPlanInfo = yoshiiPlans.find(p => normalizeModelCode(p.model) === normTarget && p.vendorCode);
            const vCode = matchModelDetails.vendorCode !== undefined ? matchModelDetails.vendorCode : (matchPlanInfo?.vendorCode || '');
            return vCode === ctx.selectedVendorFilter;
        });
    }

    const visibleModels = onlyCheckedFilter 
        ? allModels.filter(m => checkedModels[m] !== false) 
        : allModels;

    const handleModelDragStart = (e, model) => {
        setDraggedModel(model);
        e.dataTransfer.setData('text/plain', model);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleModelDragOver = (e, model) => {
        e.preventDefault();
        if (draggedModel && draggedModel !== model) {
            setDragOverModel(model);
        }
    };

    const handleModelDrop = async (e, targetModel) => {
        e.preventDefault();
        if (!draggedModel || draggedModel === targetModel) return;

        const currentList = [...allModels];
        const fromIdx = currentList.indexOf(draggedModel);
        const toIdx = currentList.indexOf(targetModel);

        if (fromIdx === -1 || toIdx === -1) return;

        currentList.splice(fromIdx, 1);
        currentList.splice(toIdx, 0, draggedModel);

        const updatedOrders = { ...modelOrders };
        currentList.forEach((m, idx) => {
            updatedOrders[m] = (idx + 1) * 10;
        });

        const newMaster = {
            ...ctx.masterData,
            yoshii: { ...ctx.masterData.yoshii, modelOrder: updatedOrders }
        };

        await firebase.firestore().collection('shipping_settings').doc('master_data_v5').set(newMaster, { merge: true });
        setDraggedModel(null);
        setDragOverModel(null);
    };

    const getPlanData = (model, month) => {
        const normTarget = normalizeModelCode(model);
        return yoshiiPlans.find(p => normalizeModelCode(p.model) === normTarget && p.deliveryMonth === month);
    };

    const handleModelDetailChange = async (model, field, value) => {
        if (field === 'vendorCode' && value && value.trim() !== '') {
            const cleanCode = value.trim().toUpperCase();
            const knownVendors = ctx.masterData.yoshii?.vendors || ['JP', 'GM', 'LDS', 'SLT', 'YO'];
            if (!knownVendors.includes(cleanCode)) {
                const confirmAdd = window.confirm(`未登録の仕入先コード 『${cleanCode}』 が入力されました。\n\n新しい仕入先として登録しますか？`);
                if (confirmAdd) {
                    const updatedVendors = Array.from(new Set([...knownVendors, cleanCode]));
                    const newMaster = {
                        ...ctx.masterData,
                        yoshii: { ...(ctx.masterData.yoshii || {}), vendors: updatedVendors }
                    };
                    await firebase.firestore().collection('shipping_settings').doc('master_data_v5').set(newMaster, { merge: true });
                    value = cleanCode;
                }
            } else {
                value = cleanCode;
            }
        }

        await ctx.updateModelDetail('yoshii', model, field, value);

        const normTarget = normalizeModelCode(model);
        const matchingPlans = yoshiiPlans.filter(p => normalizeModelCode(p.model) === normTarget);
        const batch = firebase.firestore().batch();
        matchingPlans.forEach(p => {
            batch.update(firebase.firestore().collection('shipments').doc(p.id), {
                [field]: value,
                updatedAt: new Date().toISOString()
            });
        });
        if (matchingPlans.length > 0) {
            await batch.commit();
        }
    };

    const handleAddNewModelSubmit = async (e) => {
        e.preventDefault();
        const targetModel = newModel.trim();
        if (!targetModel) return alert("型式名を入力してください。");

        const normalizedTarget = normalizeModelCode(targetModel);
        const isDuplicate = allModels.some(m => normalizeModelCode(m) === normalizedTarget);

        if (isDuplicate) {
            alert("入力された型式 (" + targetModel + ") は既に登録されています。");
            return;
        }

        await ctx.addMasterItem('yoshii', 'models', targetModel);
        if (newProductName.trim()) await ctx.updateModelDetail('yoshii', targetModel, 'productName', newProductName.trim());
        if (newJanCode.trim()) await ctx.updateModelDetail('yoshii', targetModel, 'janCode', newJanCode.trim());
        if (newVendorCode.trim()) await ctx.updateModelDetail('yoshii', targetModel, 'vendorCode', newVendorCode.trim());

        setNewModel(''); setNewProductName(''); setNewJanCode(''); setNewJanVendorCode('');
        setIsAddModalOpen(false);
    };

    const handleQuantityChange = async (model, month, newQtyStr, originalVal) => {
        const targetPlan = getPlanData(model, month);
        const newQty = newQtyStr === '' ? 0 : Number(newQtyStr);
        const todayYYMMDD = ctx.getFormattedShortDate();

        const matchModelDetails = ctx.masterData.yoshii?.modelDetails?.[model] || {};
        const normTarget = normalizeModelCode(model);
        const matchPlan = yoshiiPlans.find(p => normalizeModelCode(p.model) === normTarget && (p.productName || p.janCode));

        const currentProductName = matchModelDetails.productName !== undefined ? matchModelDetails.productName : (matchPlan?.productName || '');
        const currentJanCode = matchModelDetails.janCode !== undefined ? matchModelDetails.janCode : (matchPlan?.janCode || '');
        const currentVendorCode = matchModelDetails.vendorCode || '';

        const metaStr = `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}`;

        if (targetPlan) {
            const currentQty = Number(targetPlan.quantity || 0);
            if (currentQty === newQty) return;

            const prevHist = targetPlan.qtyHistory || [];
            const updatedHist = [{ qty: newQty, date: todayYYMMDD }, ...prevHist];

            await ctx.updatePlan(targetPlan.id, { 
                quantity: newQty, 
                qtyHistory: updatedHist,
                productName: currentProductName,
                janCode: currentJanCode,
                vendorCode: currentVendorCode,
                originalVal: originalVal !== undefined && originalVal !== '' ? (targetPlan.originalVal || originalVal) : targetPlan.originalVal,
                originalMeta: originalVal !== undefined && originalVal !== '' ? (targetPlan.originalMeta || metaStr) : targetPlan.originalMeta
            }, `型式 [${model}] ${month} 計画数`);
        } else {
            if (newQty === 0) return;
            await ctx.updatePlan(null, {
                company: 'yoshii',
                model: model,
                productName: currentProductName,
                janCode: currentJanCode,
                vendorCode: currentVendorCode,
                deliveryMonth: month,
                quantity: newQty,
                qtyHistory: [{ qty: newQty, date: todayYYMMDD }],
                originalVal: originalVal !== undefined && originalVal !== '' ? originalVal : undefined,
                originalMeta: originalVal !== undefined && originalVal !== '' ? metaStr : undefined
            }, `型式 [${model}] ${month} 計画数`);
        }
    };

    const handleDeleteHistory = async (planId, historyIdx, model, month) => {
        const targetPlan = yoshiiPlans.find(p => p.id === planId);
        if (!targetPlan || !targetPlan.qtyHistory) return;

        const newHist = [...targetPlan.qtyHistory];
        newHist.splice(historyIdx, 1);
        const latestQty = newHist.length > 0 ? newHist[0].qty : 0;

        await ctx.updatePlan(planId, { quantity: latestQty, qtyHistory: newHist }, `型式 [${model}] ${month} 履歴削除`);
    };

    const calculateRowTotal = (model) => {
        return displayMonths.reduce((sum, mo) => sum + Number(getPlanData(model, mo)?.quantity || 0), 0);
    };

    const calculateColTotal = (month) => {
        return visibleModels.reduce((sum, m) => {
            const p = getPlanData(m, month);
            const q = p ? Number(p.quantity) : 0;
            return sum + (isNaN(q) ? 0 : q);
        }, 0);
    };

    const totalGrandTotal = visibleModels.reduce((sum, m) => sum + calculateRowTotal(m), 0);
    const handleGridNav = ctx.createGridNav('y-matrix-plan', visibleModels.length - 1, displayMonths.length - 1);

    const startStr = `${displayMonths[0]?.split('-')[0]}年${displayMonths[0]?.split('-')[1]}月`;
    const endStr = `${displayMonths[displayMonths.length - 1]?.split('-')[0]}年${displayMonths[displayMonths.length - 1]?.split('-')[1]}月`;
    const dynamicTitle = `吉井電気（株）様向け 納品・出荷計画（${startStr}～${endStr}）`;

    return (
        <div className="p-4 bg-white flex-grow flex flex-col h-full">
            <div className="hidden print:block font-bold text-sm text-black mb-1 border-b pb-0.5 text-left w-full">
                {dynamicTitle} [仕入先: {ctx.selectedVendorFilter || 'ALL'}]
            </div>
            
            <div className="mb-1.5 flex-shrink-0 flex justify-between items-center no-print">
                <div className="flex items-center gap-2">
                    <span className="text-base md:text-lg font-extrabold text-emerald-900 border-b-2 border-emerald-600 pb-0.5">
                        {dynamicTitle}
                    </span>
                    <span className="bg-slate-700 text-slate-100 border border-slate-500 text-[10px] font-extrabold px-1.5 py-0.5 rounded font-mono shadow-sm">
                        {displayVer}
                    </span>
                </div>

                <div className="flex items-center gap-1.5 no-print">
                    <button onClick={() => setExportModal({ isOpen: true, type: 'excel' })} className="px-2 py-0.5 text-xs font-bold rounded bg-emerald-700 hover:bg-emerald-800 text-white shadow transition flex items-center gap-1">📊 Excel出力</button>
                    <button onClick={() => setExportModal({ isOpen: true, type: 'print' })} className="px-2 py-0.5 text-xs font-bold rounded bg-slate-700 hover:bg-slate-800 text-white shadow transition flex items-center gap-1">🖨 印刷</button>
                    <button onClick={ctx.handleStartTracking} className={`px-2 py-0.5 text-xs font-bold rounded shadow transition ${ctx.isChangeTrackingMode ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}>{ctx.isChangeTrackingMode ? '● 変更記録中' : '変更開始'}</button>
                    <button onClick={ctx.handleClearTracking} className="px-2 py-0.5 text-xs font-bold rounded bg-gray-600 hover:bg-gray-700 text-white shadow transition">変更クリア</button>
                </div>
            </div>

            <div className="flex flex-wrap justify-between items-center mb-2 no-print gap-2 flex-shrink-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-gray-700">カテゴリ:</span>
                        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="border rounded px-1.5 py-0.5 text-xs font-bold bg-white text-emerald-900 shadow-sm">
                            <option value="全体">全体 (全表示)</option>
                            <option value="ALC">ALC</option>
                            <option value="KS">KS</option>
                            <option value="（Z)CCN">（Z)CCN</option>
                            <option value="その他">その他</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-1.5 bg-gray-50 p-0.5 rounded border text-xs">
                        <select value={rangeMode} onChange={e => setRangeMode(e.target.value)} className="font-bold border rounded px-1 py-0.5 bg-white">
                            <option value="year">年度指定</option>
                            <option value="custom">カスタム指定</option>
                        </select>

                        {rangeMode === 'year' ? (
                            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="font-bold border rounded px-1.5 py-0.5 bg-white text-emerald-800">
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

                    <button onClick={() => setIsAddModalOpen(true)} disabled={ctx.authUser && !ctx.authUser.canEdit} className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white px-2.5 py-0.5 rounded text-xs font-bold shadow transition">+ 型式追加</button>
                    <button onClick={() => setIsEditModalOpen(true)} disabled={ctx.authUser && !ctx.authUser.canEdit} className="bg-gray-700 hover:bg-gray-800 disabled:bg-gray-300 text-white px-2 py-0.5 rounded text-xs font-bold shadow transition flex items-center gap-1">✏ 型式編集</button>
                </div>

                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-xs font-bold text-gray-700 cursor-pointer bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shadow-sm hover:bg-emerald-100 transition">
                        <input type="checkbox" checked={showHistory} onChange={e => setShowHistory(e.target.checked)} className="w-3 h-3 text-emerald-600 rounded" />
                        <span>変更履歴を表示</span>
                    </label>
                </div>
            </div>

            <div className="table-container flex-grow border rounded shadow-inner" ref={ctx.tableContainerRef}>
                <table className="alloc-print-table w-max text-center border-collapse">
                    <thead className="sticky top-0 z-30 bg-gray-200">
                        <tr className="table-row-compact">
                            <th className="p-0.5 border w-8 sticky left-0 bg-gray-200 z-40 text-xs no-print">順</th>
                            <th className="p-0.5 border w-[60px] min-w-[60px] sticky left-[32px] bg-gray-200 z-40 text-xs text-center align-middle">
                                <div className="relative flex items-center justify-center w-full h-full">
                                    <div className="flex items-center justify-center gap-0.5 w-full cursor-pointer hover:text-emerald-700">
                                        <span className="text-[11px] font-bold text-gray-800 truncate">{ctx.selectedVendorFilter === 'ALL' ? '仕入先' : ctx.selectedVendorFilter}</span>
                                        <span className="text-[9px] text-gray-500 no-print">▼</span>
                                        <select value={ctx.selectedVendorFilter} onChange={e => ctx.setSelectedVendorFilter(e.target.value)} className="no-print absolute inset-0 w-full h-full opacity-0 cursor-pointer text-xs font-bold" title="仕入先コードで絞り込み">
                                            <option value="ALL">全体 (全表示)</option>
                                            {Array.from(new Set(['JP', 'GM', 'LDS', 'SLT', 'YO', ...(ctx.masterData.yoshii?.vendors || [])])).map(v => (
                                                <option key={v} value={v}>{v}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </th>
                            <th className="p-0.5 border w-[110px] min-w-[110px] sticky left-[92px] bg-gray-200 z-40 text-xs">型式</th>
                            <th className="p-0.5 border min-w-[220px] text-xs whitespace-nowrap">品名</th>
                            <th className="p-0.5 border min-w-[95px] max-w-[100px] text-xs">JANコード</th>
                            <th className="p-0.5 border w-[65px] min-w-[65px] bg-emerald-100 text-xs font-bold text-emerald-900">合計</th>
                            {displayMonths.map(mo => {
                                const yr = mo.split('-')[0].slice(-2);
                                const m = mo.split('-')[1];
                                return <th key={mo} className="p-0.5 border w-[58px] min-w-[58px] max-w-[58px] text-xs font-bold bg-gray-200 text-center">{yr}/{m}</th>;
                            })}
                            <th className="p-0.5 border min-w-[180px] text-xs font-bold bg-gray-200">備考 / 出荷調整状況</th>
                        </tr>

                        <tr className="bg-emerald-50 text-xs text-emerald-900 border-b-2 border-emerald-300 table-row-compact">
                            <td className="p-0.5 border sticky left-0 bg-emerald-100 z-40 text-center no-print">-</td>
                            <td className="p-0.5 border sticky left-[32px] bg-emerald-100 z-40 text-center">-</td>
                            <td className="p-0.5 border sticky left-[92px] bg-emerald-100 z-40 text-center font-bold">月間合計</td>
                            <td className="p-0.5 border text-center">-</td>
                            <td className="p-0.5 border text-center">-</td>
                            <td className="p-0.5 border text-right pr-1 font-mono text-xs text-emerald-900 bg-emerald-200">{totalGrandTotal.toLocaleString()}</td>
                            {displayMonths.map(mo => {
                                const colTot = calculateColTotal(mo);
                                return <td key={`tot-${mo}`} className="p-0.5 border text-right pr-1 font-mono text-xs text-emerald-900 w-[58px] min-w-[58px]">{colTot > 0 ? colTot.toLocaleString() : '0'}</td>;
                            })}
                            <td className="p-0.5 border text-center">-</td>
                        </tr>
                    </thead>
                    <tbody>
                        {visibleModels.map((model, rowIdx) => {
                            const matchModelDetails = ctx.masterData.yoshii?.modelDetails?.[model] || {};
                            const normTarget = normalizeModelCode(model);
                            const matchPlanInfo = yoshiiPlans.find(p => normalizeModelCode(p.model) === normTarget && (p.productName || p.janCode || p.notes));
                            
                            const currentProdName = matchModelDetails.productName !== undefined ? matchModelDetails.productName : (matchPlanInfo?.productName || '');
                            const currentJanCode = matchModelDetails.janCode !== undefined ? matchModelDetails.janCode : (matchPlanInfo?.janCode || '');
                            const currentVendorCode = matchModelDetails.vendorCode !== undefined ? matchModelDetails.vendorCode : (matchPlanInfo?.vendorCode || '');
                            const currentNotes = matchModelDetails.notes !== undefined ? matchModelDetails.notes : (matchPlanInfo?.notes || '');
                            const rowTot = calculateRowTotal(model);

                            return (
                                <tr key={model} onDragOver={e => handleModelDragOver(e, model)} onDrop={e => handleModelDrop(e, model)} className={`hover:bg-emerald-50 border-b table-row-compact ${dragOverModel === model ? 'border-t-2 border-t-emerald-600 bg-emerald-100' : ''}`}>
                                    <td draggable onDragStart={e => handleModelDragStart(e, model)} className="border font-bold text-xs sticky left-0 bg-white z-10 text-center drag-handle text-gray-400 hover:text-emerald-600 cursor-grab active:cursor-grabbing p-0">≡</td>
                                    <td className="border text-xs text-center sticky left-[32px] bg-white z-10 w-[52px] min-w-[52px] p-0">
                                        <LocalInput value={currentVendorCode} originalValue={(matchModelDetails.originals || {}).vendorCode} originalMeta={(matchModelDetails.originalMetas || {}).vendorCode} onChange={(v, orig) => handleModelDetailChange(model, 'vendorCode', v)} className="w-full text-xs text-center font-mono input-compact"/>
                                    </td>
                                    <td className="border text-xs sticky left-[92px] bg-white z-10 text-left pl-2 p-0">{model}</td>
                                    <td className="border text-xs text-left min-w-[220px] whitespace-nowrap p-0">
                                        <LocalInput value={currentProdName} originalValue={(matchModelDetails.originals || {}).productName} originalMeta={(matchModelDetails.originalMetas || {}).productName} onChange={(v, orig) => handleModelDetailChange(model, 'productName', v)} listId="auto_yoshii_productNames" className="w-full text-xs text-left px-1 input-compact"/>
                                    </td>
                                    <td className="border text-xs text-center min-w-[95px] max-w-[100px] p-0">
                                        <LocalInput value={currentJanCode} originalValue={(matchModelDetails.originals || {}).janCode} originalMeta={(matchModelDetails.originalMetas || {}).janCode} onChange={(v, orig) => handleModelDetailChange(model, 'janCode', v)} className="w-full text-xs text-center font-mono input-compact"/>
                                    </td>
                                    <td className="border text-xs font-mono text-right pr-1 bg-emerald-50 text-emerald-900 p-0">{rowTot > 0 ? rowTot.toLocaleString() : '0'}</td>
                                    
                                    {displayMonths.map((mo, colIdx) => {
                                        const plan = getPlanData(model, mo);
                                        const currentQty = plan?.quantity || '';
                                        const historyList = plan?.qtyHistory || [];

                                        return (
                                            <td key={mo} className="matrix-td align-top p-0 w-[58px] min-w-[58px] table-row-compact">
                                                <LocalInput type="number" value={currentQty} originalValue={plan?.originalVal} originalMeta={plan?.originalMeta} onChange={(v, orig) => handleQuantityChange(model, mo, v, orig)} className="matrix-input text-right font-mono pr-1 text-xs input-compact" dataGridId={`y-matrix-plan-${rowIdx}-${colIdx}`} onGridKeyDown={handleGridNav} />
                                                {showHistory && historyList.length > 0 && (
                                                    <div className="relative group/hist no-print">
                                                        <span className="absolute -top-5 right-0.5 text-[9px] bg-amber-100 text-amber-800 border border-amber-300 px-1 rounded cursor-pointer font-bold z-10 shadow-sm">📜{historyList.length}</span>
                                                        <div className="hidden group-hover/hist:block absolute right-0 top-0 mt-1 w-44 bg-slate-800 text-white p-2 rounded shadow-xl z-50 text-[10px] space-y-1 border border-slate-600">
                                                            <div className="font-bold border-b border-slate-600 pb-1 text-amber-300">履歴一覧 ({model} {mo})</div>
                                                            <div className="max-h-36 overflow-y-auto space-y-1">
                                                                {historyList.map((hist, hIdx) => (
                                                                    <div key={hIdx} className="flex justify-between items-center bg-slate-700 px-1.5 py-0.5 rounded">
                                                                        <span className="font-mono text-emerald-300">{hist.qty.toLocaleString()} 台</span>
                                                                        <div className="flex items-center gap-1">
                                                                            <span className="text-[9px] text-slate-300">{hist.date || ctx.getFormattedShortDate()}</span>
                                                                            <button onClick={() => handleDeleteHistory(plan.id, hIdx, model, mo)} disabled={ctx.authUser && !ctx.authUser.canEdit} className="text-red-400 hover:text-red-200 font-bold ml-1 text-xs" title="この履歴を削除">×</button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}

                                    <td className="border text-xs text-left min-w-[180px] p-0">
                                        <LocalTextArea value={currentNotes} originalValue={(matchModelDetails.originals || {}).notes} originalMeta={(matchModelDetails.originalMetas || {}).notes} onChange={(v, orig) => handleModelDetailChange(model, 'notes', v)} isCompact={!showHistory}/>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <form onSubmit={handleAddNewModelSubmit} className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md flex flex-col gap-4">
                        <h3 className="font-bold text-base border-b pb-2 text-emerald-800">+ 新規型式の追加</h3>
                        <div>
                            <label className="block text-xs font-bold mb-1">品番 (型式名) <span className="text-red-500">*</span></label>
                            <input type="text" required value={newModel} onChange={e => setNewModel(e.target.value)} placeholder="例: ALC-08SK" className="w-full border p-1.5 rounded text-sm"/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1">仕入先コード (3桁)</label>
                            <input type="text" maxLength={3} value={newVendorCode} onChange={e => setNewJanVendorCode(e.target.value)} placeholder="例: 001" className="w-full border p-1.5 rounded text-sm font-mono text-center"/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1">品名 (製品名)</label>
                            <input type="text" value={newProductName} onChange={e => setNewProductName(e.target.value)} placeholder="例: ｱﾋﾞﾃﾗｯックス LEDｼｰﾘﾝｸﾞ" className="w-full border p-1.5 rounded text-sm"/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1">JANコード</label>
                            <input type="text" value={newJanCode} onChange={e => setNewJanCode(e.target.value)} placeholder="例: 4912345678901" className="w-full border p-1.5 rounded text-sm"/>
                        </div>
                        <div className="flex justify-end gap-2 border-t pt-3 mt-2">
                            <button type="button" onClick={() => setIsAddModalOpen(false)} className="bg-gray-200 text-gray-700 px-4 py-1.5 rounded text-xs font-bold">キャンセル</button>
                            <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded text-xs font-bold shadow">追加する</button>
                        </div>
                    </form>
                </div>
            )}

            <ModelEditModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} company="yoshii" />
            <ExportPrintModal isOpen={exportModal.isOpen} onClose={() => setExportModal({ isOpen: false, type: 'excel' })} screenName="納品・出荷計画" currentMonthStr={ctx.currentMonthStr} defaultMode="year" onStartExport={handleExecuteExport} />
        </div>
    );
};

// 【ヘルパー: 型式表示改行フォーマット】
const formatModelWithBreak = (m) => {
    if (!m) return '';
    const str = String(m);
    const idx = str.indexOf('-');
    if (idx !== -1) {
        return (
            <span>
                {str.substring(0, idx + 1)}
                <br />
                {str.substring(idx + 1)}
            </span>
        );
    }
    if (str.toUpperCase().startsWith('ALC') && str.length > 3) {
        return (
            <span>
                ALC
                <br />
                {str.substring(3)}
            </span>
        );
    }
    return str;
};

// 【2. 吉井電気 コンテナ割振りビュー (YoshiiAllocationView)】
const YoshiiAllocationView = () => {
    const ctx = React.useContext(AppContext);
    const [exportModal, setExportModal] = React.useState({ isOpen: false, type: 'excel' });

    const baseAppVer = typeof SYSTEM_VERSION !== 'undefined' ? SYSTEM_VERSION : '';
    const cmpVer = typeof JS_COMPONENTS_VERSION !== 'undefined' ? JS_COMPONENTS_VERSION : '';
    const displayVer = `${baseAppVer}${JS_PLAN_VERSION}${cmpVer}`;

    // ★ 修復: 初回データ受信時の非同期処理による「過去月(8月)への勝手な上書き」をブロックする構造
    const isInitRef = React.useRef(false);
    React.useEffect(() => {
        if (!isInitRef.current && ctx.currentMonthStr) {
            ctx.setYoshiiAllocMonth(ctx.currentMonthStr);
            isInitRef.current = true;
        }
    }, [ctx.currentMonthStr]);

    const handleExecuteExport = ({ mode, selectedYear: selYr, singleMonth: sgMo, startMonth: sMo, endMonth: eMo }) => {
        const targetVendor = ctx.selectedVendorFilter || 'ALL';
        
        if (exportModal.type === 'print') {
            setTimeout(() => window.print(), 300);
            return;
        }

        const excelModels = models.map(m => { const idx = String(m).indexOf('-'); return idx === -1 ? m : m.substring(0, idx + 1) + '\n' + m.substring(idx + 1); });
        const headers = ['管理番号', '到着港', ...excelModels];
        const planRow = ['計画数', '-', ...models.map(m => modelTotals[m] || 0)];
        const remainRow = ['残数', '-', ...models.map(m => {
            const allocated = monthContainers.reduce((sum, c) => {
                const q = getContainerAllocationQty(c.allocations, m);
                return sum + (Number(q) || 0);
            }, 0);
            return modelTotals[m] - allocated;
        })];

        const containerRows = Array.from({ length: displayRows }).map((_, idx) => {
            const c = monthContainers[idx] || {};
            const allocs = models.map(m => {
                const q = getContainerAllocationQty(c.allocations, m);
                return q !== '' ? Number(q) : '';
            });
            return [c.managementNo || '-', c.port || '-', ...allocs];
        });

        const rows = [planRow, remainRow, [], ...containerRows];
        const dateTag = formatYYMM(ctx.yoshiiAllocMonth);
        const filename = `${targetVendor}_コンテナ割振り_${dateTag}.xlsx`;

        exportToExcelSimple({
            title: `吉井電気 コンテナ割振り [対象年月: ${ctx.yoshiiAllocMonth}] [仕入先: ${targetVendor}]`,
            headers, rows, filename
        });
    };

    const [rowLimit, setRowLimit] = React.useState(3);
    const [focusTargetIdx, setFocusTargetIdx] = React.useState(null);
    const [deleteConfirmTarget, setDeleteConfirmTarget] = React.useState(null);

    const getNaturalMgmtKey = (c) => {
        if (c.allocNo !== undefined && c.allocNo !== null) return c.allocNo;
        if (c.sortOrder !== undefined && c.sortOrder !== null) return c.sortOrder;
        
        const mgmt = String(c.managementNo || '').trim();
        if (!mgmt || mgmt === '-') return 999999;

        const match = mgmt.match(/^([A-Za-z]+)(\d+)(?:-(\d+))?$/);
        if (match) {
            const prefix = match[1].toUpperCase();
            const num1 = parseInt(match[2], 10);
            const num2 = match[3] ? parseInt(match[3], 10) : 0;
            const prefixPriority = prefix === 'A' ? 0 : (prefix === 'YK' ? 1 : 2);
            return prefixPriority * 10000 + num1 * 10 + num2;
        }
        return 500000;
    };

    let rawMonthContainers = ctx.containers.filter(c => c.company === 'yoshii' && c.deliveryMonth === ctx.yoshiiAllocMonth);

    if (ctx.selectedVendorFilter && ctx.selectedVendorFilter !== 'ALL') {
        rawMonthContainers = rawMonthContainers.filter(c => {
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

    const monthContainers = rawMonthContainers.sort((a, b) => {
        const keyA = getNaturalMgmtKey(a);
        const keyB = getNaturalMgmtKey(b);
        if (keyA !== keyB) return keyA - keyB;
        return (a.createdAt || '').localeCompare(b.createdAt || '');
    });
    
    const getModelVendorCode = (m) => {
        const matchModelDetails = ctx.masterData.yoshii?.modelDetails?.[m] || {};
        const normTarget = normalizeModelCode(m);
        const matchPlanInfo = ctx.plans.find(p => normalizeModelCode(p.model) === normTarget && p.vendorCode);
        return matchModelDetails.vendorCode !== undefined ? matchModelDetails.vendorCode : (matchPlanInfo?.vendorCode || '');
    };

    const yoshiiPlans = ctx.plans.filter(p => p.company === 'yoshii');

    const getDirectPlanQty = (model, month) => {
        const normTarget = normalizeModelCode(model);
        const matchPlan = yoshiiPlans.find(p => normalizeModelCode(p.model) === normTarget && p.deliveryMonth === month);
        return matchPlan ? Number(matchPlan.quantity || 0) : 0;
    };

    const getContainerAllocationQty = (allocationsObj, masterModel) => {
        if (!allocationsObj) return '';
        const normTarget = normalizeModelCode(masterModel);
        for (const [key, qty] of Object.entries(allocationsObj)) {
            if (normalizeModelCode(key) === normTarget && qty > 0) {
                return qty;
            }
        }
        return '';
    };

    const modelsSet = new Set();
    yoshiiPlans.forEach(p => {
        if (p.model) {
            const vCode = getModelVendorCode(p.model);
            if (!ctx.selectedVendorFilter || ctx.selectedVendorFilter === 'ALL' || vCode === ctx.selectedVendorFilter) {
                modelsSet.add(p.model);
            }
        }
    });
    monthContainers.forEach(c => {
        Object.keys(c.allocations || {}).forEach(m => {
            if (c.allocations[m] > 0) {
                const vCode = getModelVendorCode(m);
                if (!ctx.selectedVendorFilter || ctx.selectedVendorFilter === 'ALL' || vCode === ctx.selectedVendorFilter) {
                    modelsSet.add(m);
                }
            }
        });
    });

    const modelTotals = {};
    modelsSet.forEach(m => {
        modelTotals[m] = getDirectPlanQty(m, ctx.yoshiiAllocMonth);
    });
    
    const modelOrders = ctx.masterData.yoshii?.modelOrder || {};
    let models = Array.from(modelsSet).sort((a, b) => {
        const orderA = modelOrders[a] !== undefined ? modelOrders[a] : 9999;
        const orderB = modelOrders[b] !== undefined ? modelOrders[b] : 9999;
        if (orderA !== orderB) return orderA - orderB;
        return a.localeCompare(b, 'ja');
    });

    if (ctx.selectedVendorFilter && ctx.selectedVendorFilter !== 'ALL') {
        models = models.filter(m => {
            const matchModelDetails = ctx.masterData.yoshii?.modelDetails?.[m] || {};
            const normTarget = normalizeModelCode(m);
            const matchPlanInfo = ctx.plans.find(p => normalizeModelCode(p.model) === normTarget && p.vendorCode);
            const vCode = matchModelDetails.vendorCode !== undefined ? matchModelDetails.vendorCode : (matchPlanInfo?.vendorCode || '');
            return vCode === ctx.selectedVendorFilter;
        });
    }

    models = models.filter(m => {
        const targetMonthPlanQty = Number(modelTotals[m]) || 0;
        const targetMonthAllocQty = monthContainers.reduce((sum, c) => {
            const q = getContainerAllocationQty(c.allocations, m);
            return sum + (Number(q) || 0);
        }, 0);
        return targetMonthPlanQty > 0 || targetMonthAllocQty > 0;
    });

    const handleAllocationValueChange = (container, masterModel, val, orig) => {
        const currentAllocs = container.allocations || {};
        const newQty = val === '' ? 0 : Number(val);
        const updatedAllocs = { ...currentAllocs, [masterModel]: newQty };

        const origAlloc = container.originals?.allocations || {};
        const metaAlloc = container.originalMetas?.allocations || {};

        const updatedOrigs = {
            ...(container.originals || {}),
            allocations: {
                ...origAlloc,
                [masterModel]: origAlloc[masterModel] !== undefined ? origAlloc[masterModel] : (orig || '')
            }
        };

        const updatedMetas = {
            ...(container.originalMetas || {}),
            allocations: {
                ...metaAlloc,
                [masterModel]: metaAlloc[masterModel] !== undefined ? metaAlloc[masterModel] : `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}`
            }
        };

        ctx.updateContainer(
            container.id, 
            { allocations: updatedAllocs, originals: updatedOrigs, originalMetas: updatedMetas }, 
            ctx.yoshiiAllocMonth, 
            'yoshii', 
            '型式 [' + masterModel + '] 数量'
        );
    };

    const displayRows = Math.max(monthContainers.length, rowLimit);
    const handleGridNav = ctx.createGridNav('y-alloc', displayRows - 1, models.length + 1);

    const getModelColWidth = (m) => {
        const len = (m || '').length;
        if (len <= 6) return 'w-[48px] min-w-[48px] max-w-[48px]';
        if (len <= 8) return 'w-[54px] min-w-[54px] max-w-[54px]';
        if (len <= 10) return 'w-[60px] min-w-[60px] max-w-[60px]';
        return 'w-[66px] min-w-[66px] max-w-[66px]';
    };

    const handleAddRow = () => {
        const nextIdx = displayRows;
        setRowLimit(displayRows + 1);
        setFocusTargetIdx(nextIdx);
    };

    const handleExecuteDeleteRow = async (containerId, index) => {
        if (containerId) {
            await ctx.deleteContainer(containerId, '吉井電気 コンテナ割振り');
        } else {
            setRowLimit(prev => Math.max(monthContainers.length, prev - 1));
        }
        setDeleteConfirmTarget(null);
    };

    return (
        <div className="p-4 bg-white flex-grow flex flex-col h-full">
            <div className="hidden print:block font-bold text-sm text-black mb-1 border-b pb-0.5 text-left w-full">
                吉井電気 コンテナ割振り [対象年月: {ctx.yoshiiAllocMonth}] [仕入先: {ctx.selectedVendorFilter || 'ALL'}]
            </div>
            
            <div className="flex justify-between items-center mb-2 no-print flex-shrink-0">
                <div className="flex gap-3 items-center bg-gray-50 p-1.5 rounded border">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold">吉井電気 コンテナ割振り</h2>
                        <span className="bg-slate-700 text-slate-100 border border-slate-500 text-[10px] font-extrabold px-1.5 py-0.5 rounded font-mono shadow-sm">
                            {displayVer}
                        </span>
                    </div>
                    <label className="font-bold text-sm ml-2">対象年月:</label>
                    <input type="month" value={ctx.yoshiiAllocMonth} onChange={e => ctx.setYoshiiAllocMonth(e.target.value)} className="border p-1 rounded text-sm text-center font-bold bg-white" />
                    <label className="font-bold text-sm ml-2">コンテナ枠数:</label>
                    <div className="flex items-center gap-1">
                        <button onClick={() => { if (displayRows > monthContainers.length) setRowLimit(displayRows - 1); }} disabled={ctx.authUser && !ctx.authUser.canEdit} className="bg-gray-300 hover:bg-gray-400 disabled:opacity-30 w-7 h-7 rounded font-bold transition">-</button>
                        <span className="w-6 text-center font-bold">{displayRows}</span>
                        <button onClick={handleAddRow} disabled={ctx.authUser && !ctx.authUser.canEdit} className="bg-gray-300 hover:bg-gray-400 disabled:opacity-30 w-7 h-7 rounded font-bold transition">+</button>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 no-print">
                    <button onClick={() => setExportModal({ isOpen: true, type: 'excel' })} className="px-2.5 py-1 text-xs font-bold rounded bg-emerald-700 hover:bg-emerald-800 text-white shadow transition flex items-center gap-1">📊 Excel出力</button>
                    <button onClick={() => setExportModal({ isOpen: true, type: 'print' })} className="px-2.5 py-1 text-xs font-bold rounded bg-slate-700 hover:bg-slate-800 text-white shadow transition flex items-center gap-1">🖨 印刷</button>
                    <button onClick={ctx.handleStartTracking} className={`px-2.5 py-1 text-xs font-bold rounded shadow transition ${ctx.isChangeTrackingMode ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}>{ctx.isChangeTrackingMode ? '● 変更記録中' : '変更開始'}</button>
                    <button onClick={ctx.handleClearTracking} className="px-2.5 py-1 text-xs font-bold rounded bg-gray-600 hover:bg-gray-700 text-white shadow transition">変更クリア</button>
                </div>
            </div>

            {!ctx.yoshiiAllocMonth ? <p className="text-gray-500">対象年月を選択してください。</p> : models.length === 0 ? <p className="text-gray-500">この月（{ctx.yoshiiAllocMonth}）の計画データが存在しません。</p> : (
                <div className="table-container flex-grow" ref={ctx.tableContainerRef}>
                    <table className="alloc-print-table w-max text-center border-collapse">
                        <thead className="sticky top-0 z-30 bg-gray-200 shadow-sm">
                            <tr className="bg-gray-200 table-row-compact">
                                <th className="p-0.5 border w-10 sticky left-0 top-0 bg-gray-200 z-40 text-xs no-print">移動</th>
                                <th className="p-0.5 border w-16 sticky left-10 top-0 bg-gray-200 z-40 text-xs">項目</th>
                                <th className="p-0.5 border w-[90px] min-w-[90px] sticky left-[104px] top-0 bg-gray-200 z-40 text-xs text-center">管理番号</th>
                                <th className="p-0.5 border w-[76px] min-w-[70px] sticky left-[194px] top-0 bg-gray-200 z-40 text-xs">到着港</th>
                                {models.map(m => <th key={m} className={`p-0.5 border bg-emerald-100 text-xs leading-tight align-bottom model-hdr ${getModelColWidth(m)}`} title={m}>{formatModelWithBreak(m)}</th>)}
                                <th className="p-0.5 border w-12 bg-gray-200 no-print">削除</th>
                            </tr>
                            <tr className="bg-gray-50 text-xs text-gray-700 border-b table-row-compact">
                                <td className="p-0.5 border sticky left-0 bg-gray-50 z-40 text-center no-print">-</td>
                                <td className="p-0.5 border sticky left-10 bg-gray-50 z-40 text-center">計画数</td>
                                <td className="p-0.5 border sticky left-[104px] bg-gray-50 z-40 text-center text-gray-500 font-normal">(合計)</td>
                                <td className="p-0.5 border sticky left-[194px] bg-gray-50 z-40 text-right pr-1 font-mono text-xs font-bold text-emerald-900 bg-emerald-100/60">
                                    {models.reduce((sum, m) => sum + (Number(modelTotals[m]) || 0), 0).toLocaleString()}
                                </td>
                                {models.map(m => <td key={m} className={`p-0.5 border font-mono text-xs text-right pr-1 ${getModelColWidth(m)} ${modelTotals[m] === 0 ? 'text-red-500' : ''}`}>{Number(modelTotals[m]).toLocaleString()}</td>)}
                                <td className="p-0.5 border bg-gray-50 no-print"></td>
                            </tr>
                            <tr className="bg-gray-100 text-xs text-gray-800 border-b-2 border-gray-300 table-row-compact">
                                <td className="p-0.5 border sticky left-0 bg-gray-100 z-40 text-center no-print">-</td>
                                <td className="p-0.5 border sticky left-10 bg-gray-100 z-40 text-center">残数</td>
                                <td className="p-0.5 border sticky left-[104px] bg-gray-100 z-40 text-center text-gray-500 font-normal">(合計)</td>
                                <td className="p-0.5 border sticky left-[194px] bg-gray-100 z-40 text-right pr-1 font-mono text-xs font-bold text-indigo-900 bg-indigo-100/60">
                                    {models.reduce((sum, m) => {
                                        const allocated = monthContainers.reduce((cSum, c) => cSum + (Number(getContainerAllocationQty(c.allocations, m)) || 0), 0);
                                        return sum + (modelTotals[m] - allocated);
                                    }, 0).toLocaleString()}
                                </td>
                                {models.map(m => {
                                    const allocated = monthContainers.reduce((sum, c) => {
                                        const q = getContainerAllocationQty(c.allocations, m);
                                        return sum + (Number(q) || 0);
                                    }, 0);
                                    const remain = modelTotals[m] - allocated;
                                    return <td key={m} className={`p-0.5 border font-mono text-xs text-right pr-1 ${getModelColWidth(m)} ${remain < 0 ? 'text-red-600' : remain > 0 ? 'text-blue-600' : 'text-green-600'}`}>{remain.toLocaleString()}</td>;
                                })}
                                <td className="p-0.5 border bg-gray-100 no-print"></td>
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: displayRows }).map((_, idx) => {
                                const container = monthContainers[idx] || {};
                                return (
                                    <tr 
                                        key={container.id || `new-${idx}`}
                                        onDragOver={(e) => ctx.handleDragOver(e, container.id)}
                                        onDrop={(e) => ctx.handleDrop(e, container.id, monthContainers)}
                                        onDragEnd={ctx.handleDragEnd}
                                        className={`hover:bg-emerald-50 table-row-compact ${ctx.dragOverRowId === container.id ? (ctx.dragDirection === 'top' ? 'drag-over-top' : 'drag-over-bottom') : ''} ${ctx.draggedRowId === container.id ? 'dragging-row' : ''}`}
                                    >
                                        <td draggable={!!container.id && (ctx.authUser ? ctx.authUser.canEdit : true)} onDragStart={(e) => ctx.handleDragStart(e, container.id, 'containers')} className="p-0.5 border bg-white sticky left-0 z-20 text-center drag-handle text-gray-400 hover:text-emerald-600 font-bold text-base cursor-grab active:cursor-grabbing no-print">≡</td>
                                        <td className="p-0.5 border bg-white sticky left-10 z-20 text-[11px] font-medium whitespace-nowrap">コンテナ {idx + 1}</td>
                                        
                                        {/* ★ 修復: 管理番号を全画面統一の【中央揃え(text-center)】に修正 */}
                                        <td className="matrix-td px-0 sticky left-[104px] bg-white z-20 table-row-compact">
                                            <LocalInput value={container.managementNo} originalValue={(container.originals || {}).managementNo} originalMeta={(container.originalMetas || {}).managementNo} onChange={(v, orig) => ctx.updateContainer(container.id, { managementNo: v, originals: { ...(container.originals || {}), managementNo: container.originals?.managementNo !== undefined ? container.originals.managementNo : orig }, originalMetas: { ...(container.originalMetas || {}), managementNo: container.originalMetas?.managementNo !== undefined ? container.originalMetas.managementNo : `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}` } }, ctx.yoshiiAllocMonth, 'yoshii', '管理番号')} className="matrix-input text-center text-xs font-bold input-compact" dataGridId={`y-alloc-${idx}-0`} onGridKeyDown={handleGridNav} />
                                        </td>

                                        <td className="matrix-td px-0 sticky left-[194px] bg-white z-20 table-row-compact">
                                            <DynamicSelect value={container.port} originalValue={(container.originals || {}).port} originalMeta={(container.originalMetas || {}).port} onChange={(val, cat, orig) => ctx.handleSelectChange(container.id, 'port', true, 'yoshii', false, '到着港')(val, cat, orig)} category="ports" options={ctx.masterData.yoshii.ports} dataGridId={`y-alloc-${idx}-1`} onGridKeyDown={handleGridNav} autoFocus={focusTargetIdx === idx} onAutoFocused={() => setFocusTargetIdx(null)} className="w-full text-xs border-none bg-transparent outline-none text-center min-w-0 px-0 input-compact" />
                                        </td>
                                        {models.map((m, mIdx) => {
                                            const cellValue = getContainerAllocationQty(container.allocations, m);
                                            return (
                                                /* ★ 修復: 勝手なfont-boldを除去した標準ウェイトの等幅フォント(font-mono / 12px) */
                                                <td key={m} className={`matrix-td px-0.5 ${getModelColWidth(m)} table-row-compact`}>
                                                    <LocalInput type="number" value={cellValue} originalValue={(container.originals?.allocations || {})[m]} originalMeta={(container.originalMetas?.allocations || {})[m]} onChange={(v, orig) => handleAllocationValueChange(container, m, v, orig)} className="matrix-input text-emerald-900 font-mono pr-1 text-right text-xs input-compact" dataGridId={`y-alloc-${idx}-${mIdx + 2}`} onGridKeyDown={handleGridNav} />
                                                </td>
                                            );
                                        })}
                                        
                                        <td className="p-0.5 border text-center align-middle whitespace-nowrap relative no-print">
                                            <button tabIndex="-1" onClick={() => setDeleteConfirmTarget(deleteConfirmTarget === idx ? null : idx)} disabled={ctx.authUser && !ctx.authUser.canEdit} className="text-red-500 hover:text-red-700 disabled:opacity-30 font-bold text-lg leading-none" title="削除">×</button>
                                            {deleteConfirmTarget === idx && (
                                                <div className="absolute right-8 top-1/2 -translate-y-1/2 bg-white border border-red-300 shadow-lg rounded p-2 z-50 text-xs flex items-center gap-2 font-bold whitespace-nowrap">
                                                    <span className="text-red-700">削除しますか？</span>
                                                    <button onClick={() => handleExecuteDeleteRow(container.id, idx)} className="bg-red-600 hover:bg-red-700 text-white px-2 py-0.5 rounded text-[11px]">削除</button>
                                                    <button onClick={() => setDeleteConfirmTarget(null)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-0.5 rounded text-[11px]">消す</button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        
            <ExportPrintModal isOpen={exportModal.isOpen} onClose={() => setExportModal({ isOpen: false, type: 'excel' })} screenName="コンテナ割振り" currentMonthStr={ctx.currentMonthStr} defaultMode="current" onStartExport={handleExecuteExport} />
        </div>
    );
};