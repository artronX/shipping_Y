// =========================================================
// shipping_views_plan.js - 計画・割振り画面モジュール
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
                return qty !== undefined && qty !== '' ? Number(qty) : 0;
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

    const visibleModels = allModels;

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
        if (newProductName.trim()) {
            await ctx.updateModelDetail('yoshii', targetModel, 'productName', newProductName.trim());
        }
        if (newJanCode.trim()) {
            await ctx.updateModelDetail('yoshii', targetModel, 'janCode', newJanCode.trim());
        }
        if (newVendorCode.trim()) {
            await ctx.updateModelDetail('yoshii', targetModel, 'vendorCode', newVendorCode.trim());
        }

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
        return visibleModels.reduce((sum, m) => sum + Number(getPlanData(m, month)?.quantity || 0), 0);
    };

    const totalGrandTotal = visibleModels.reduce((sum, m) => sum + calculateRowTotal(m), 0);
    const handleGridNav = ctx.createGridNav('y-matrix-plan', visibleModels.length - 1, displayMonths.length - 1);

    const startStr = `${displayMonths[0]?.split('-')[0]}年${displayMonths[0]?.split('-')[1]}月`;
    const endStr = `${displayMonths[displayMonths.length - 1]?.split('-')[0]}年${displayMonths[displayMonths.length - 1]?.split('-')[1]}月`;
    const dynamicTitle = `吉井電気（株）様向け 納品・出荷計画（${startStr}～${endStr}）`;

    const rowPaddingClass = 'py-0 px-0.5 h-[22px]';

    return (
        <div className="p-3 bg-white flex-grow flex flex-col h-full overflow-hidden">
            <div className="hidden print:block font-bold text-sm text-black mb-1 border-b pb-1 text-left w-full">
                {dynamicTitle} [仕入先: {ctx.selectedVendorFilter || 'ALL'}]
            </div>

            <div className="mb-2 flex-shrink-0 flex justify-between items-center no-print">
                <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold text-emerald-900 border-b-2 border-emerald-600 pb-0.5">
                        {dynamicTitle}
                    </h2>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold">
                    <label className="flex items-center gap-1 text-gray-700 cursor-pointer bg-gray-100 px-2 py-1 rounded border hover:bg-gray-200 transition">
                        <input type="checkbox" checked={showHistory} onChange={e => setShowHistory(e.target.checked)} className="w-3.5 h-3.5 text-emerald-600 rounded"/>
                        <span>変更履歴を表示</span>
                    </label>

                    <button onClick={() => setExportModal({ isOpen: true, type: 'excel' })} className="px-2 py-1 text-xs font-bold rounded bg-emerald-700 hover:bg-emerald-800 text-white shadow transition flex items-center gap-1">
                        📊 Excel出力
                    </button>
                    <button onClick={() => setExportModal({ isOpen: true, type: 'print' })} className="px-2 py-1 text-xs font-bold rounded bg-slate-700 hover:bg-slate-800 text-white shadow transition flex items-center gap-1">
                        🖨 印刷
                    </button>
                    <button onClick={ctx.handleStartTracking} className={`px-2 py-1 text-xs font-bold rounded shadow transition ${ctx.isChangeTrackingMode ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}>
                        {ctx.isChangeTrackingMode ? '● 変更記録中' : '変更開始'}
                    </button>
                    <button onClick={ctx.handleClearTracking} className="px-2 py-1 text-xs font-bold rounded bg-gray-600 hover:bg-gray-700 text-white shadow transition">
                        変更クリア
                    </button>
                </div>
            </div>

            <div className="flex justify-between items-center mb-2 no-print gap-2 flex-shrink-0 text-xs">
                <div className="flex items-center gap-2 font-bold">
                    <div className="flex bg-gray-100 p-0.5 rounded border gap-1">
                        {['全体', 'KS', 'ALC'].map(cat => (
                            <button key={cat} onClick={() => setCategoryFilter(cat)} className={`px-2 py-0.5 rounded text-xs transition ${categoryFilter === cat ? 'bg-emerald-600 text-white shadow' : 'text-gray-700 hover:bg-gray-200'}`}>
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-1 bg-gray-50 p-0.5 rounded border text-xs">
                        <select value={rangeMode} onChange={e => setRangeMode(e.target.value)} className="font-bold border rounded px-1 py-0.5 bg-white">
                            <option value="year">年度指定</option>
                            <option value="custom">カスタム指定</option>
                        </select>

                        {rangeMode === 'year' ? (
                            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="font-bold border rounded px-1 py-0.5 bg-white text-emerald-800">
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

                    <button onClick={() => setIsAddModalOpen(true)} disabled={ctx.authUser && !ctx.authUser.canEdit} className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white px-2.5 py-1 rounded text-xs font-bold shadow transition">
                        + 型式追加
                    </button>

                    <button onClick={() => setIsEditModalOpen(true)} disabled={ctx.authUser && !ctx.authUser.canEdit} className="bg-gray-700 hover:bg-gray-800 disabled:bg-gray-300 text-white px-2.5 py-1 rounded text-xs font-bold shadow transition flex items-center gap-1">
                        ✏ 型式編集
                    </button>
                </div>
            </div>

            {/* テーブル本体：「表示」列削除・型式ドロップダウン復元・納入月固定幅・品名JAN文字切れ防止 */}
            <div className="table-container flex-grow border rounded shadow-inner overflow-x-auto overflow-y-auto" ref={ctx.tableContainerRef}>
                <table className="w-full text-center border-collapse text-[11px]">
                    <thead className="sticky top-0 z-30 bg-gray-200 font-bold">
                        <tr>
                            <th className="p-0.5 border w-6 min-w-[24px] max-w-[24px] sticky left-0 bg-gray-200 z-40 text-[10px] no-print">順</th>
                            <th className="p-0.5 border w-[42px] min-w-[42px] max-w-[42px] sticky left-[24px] bg-gray-200 z-40 text-[10px] text-center align-middle">
                                <div className="relative flex items-center justify-center w-full h-full">
                                    <div className="flex items-center justify-center gap-0.5 w-full">
                                        <span className="font-bold text-gray-800 truncate">
                                            {ctx.selectedVendorFilter === 'ALL' ? '仕入先' : ctx.selectedVendorFilter}
                                        </span>
                                    </div>
                                </div>
                            </th>

                            {/* 復元：型式ドロップダウンフィルタ付きヘッダー */}
                            <th className="p-0.5 border min-w-[100px] sticky left-[66px] bg-gray-200 z-40 text-[11px] font-bold">
                                <div className="flex items-center justify-center gap-1">
                                    <span>型式</span>
                                </div>
                            </th>

                            {/* 文字切れ防止の十分な幅設定 */}
                            <th className="p-0.5 border min-w-[220px] text-[11px] font-bold">品名</th>
                            <th className="p-0.5 border w-[110px] min-w-[110px] max-w-[110px] text-[11px] font-bold">JANコード</th>
                            <th className="p-0.5 border w-[46px] min-w-[46px] max-w-[46px] bg-emerald-100 text-[11px] font-bold text-emerald-900">合計</th>

                            {/* 納入月の完全固定幅指定 (w-[42px] min-w-[42px] max-w-[42px]) */}
                            {displayMonths.map(mo => {
                                const yr = mo.split('-')[0].slice(-2);
                                const m = mo.split('-')[1];
                                return (
                                    <th key={mo} className="p-0.5 border w-[42px] min-w-[42px] max-w-[42px] text-[11px] font-bold bg-gray-200 text-center">
                                        {yr}/{m}
                                    </th>
                                );
                            })}
                            <th className="p-0.5 border min-w-[120px] text-[11px] font-bold bg-gray-200">備考 / 出荷調整状況</th>
                        </tr>

                        <tr className="bg-emerald-50 font-bold text-[11px] text-emerald-900 border-b-2 border-emerald-300">
                            <td className="p-0.5 border sticky left-0 bg-emerald-100 z-40 text-center no-print">-</td>
                            <td className="p-0.5 border sticky left-[24px] bg-emerald-100 z-40 text-center">-</td>
                            <td className="p-0.5 border sticky left-[66px] bg-emerald-100 z-40 text-center font-bold">月間合計</td>
                            <td className="p-0.5 border text-center">-</td>
                            <td className="p-0.5 border text-center">-</td>
                            <td className="p-0.5 border text-right pr-1 font-extrabold text-emerald-800 bg-emerald-200">{totalGrandTotal.toLocaleString()}</td>
                            {displayMonths.map(mo => {
                                const colTot = calculateColTotal(mo);
                                return (
                                    <td key={`tot-${mo}`} className="p-0.5 border text-right pr-0.5 font-bold text-[10px] w-[42px] min-w-[42px] max-w-[42px]">
                                        {colTot > 0 ? colTot.toLocaleString() : ''}
                                    </td>
                                );
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
                                <tr key={model} onDragOver={e => handleModelDragOver(e, model)} onDrop={e => handleModelDrop(e, model)} className={`hover:bg-emerald-50 border-b ${dragOverModel === model ? 'border-t-2 border-t-emerald-600 bg-emerald-100' : ''}`}>
                                    <td draggable onDragStart={e => handleModelDragStart(e, model)} className={`border text-xs sticky left-0 bg-white z-10 text-center drag-handle text-gray-400 hover:text-emerald-600 cursor-grab active:cursor-grabbing ${rowPaddingClass}`}>≡</td>
                                    <td className={`border text-[11px] text-center sticky left-[24px] bg-white z-10 w-[42px] min-w-[42px] max-w-[42px] ${rowPaddingClass}`}>
                                        <LocalInput value={currentVendorCode} originalValue={(matchModelDetails.originals || {}).vendorCode} originalMeta={(matchModelDetails.originalMetas || {}).vendorCode} onChange={(v, orig) => handleModelDetailChange(model, 'vendorCode', v)} className="w-full text-[11px] text-center font-mono border-none bg-transparent h-[20px] font-normal"/>
                                    </td>
                                    <td className={`border text-[11px] sticky left-[66px] bg-white z-10 text-left pl-1 font-normal min-w-[100px] ${rowPaddingClass}`}>{model}</td>
                                    <td className={`border text-[11px] text-left min-w-[220px] font-normal ${rowPaddingClass}`}>
                                        <LocalInput value={currentProdName} originalValue={(matchModelDetails.originals || {}).productName} originalMeta={(matchModelDetails.originalMetas || {}).productName} onChange={(v, orig) => handleModelDetailChange(model, 'productName', v)} listId="auto_yoshii_productNames" className="w-full text-[11px] text-left px-0.5 border-none bg-transparent h-[20px] font-normal"/>
                                    </td>
                                    <td className={`border text-[11px] text-center w-[110px] min-w-[110px] max-w-[110px] font-normal ${rowPaddingClass}`}>
                                        <LocalInput value={currentJanCode} originalValue={(matchModelDetails.originals || {}).janCode} originalMeta={(matchModelDetails.originalMetas || {}).janCode} onChange={(v, orig) => handleModelDetailChange(model, 'janCode', v)} className="w-full text-[11px] text-center font-mono border-none bg-transparent h-[20px] font-normal"/>
                                    </td>
                                    <td className={`border text-[11px] text-right pr-0.5 bg-emerald-50 text-emerald-800 font-medium w-[46px] min-w-[46px] max-w-[46px] ${rowPaddingClass}`}>{rowTot > 0 ? rowTot.toLocaleString() : '0'}</td>
                                    
                                    {displayMonths.map((mo, colIdx) => {
                                        const plan = getPlanData(model, mo);
                                        const currentQty = plan?.quantity || '';
                                        const historyList = plan?.qtyHistory || [];

                                        return (
                                            <td key={mo} className="matrix-td align-top p-0 w-[42px] min-w-[42px] max-w-[42px]">
                                                <LocalInput type="number" value={currentQty} originalValue={plan?.originalVal} originalMeta={plan?.originalMeta} onChange={(v, orig) => handleQuantityChange(model, mo, v, orig)} className="matrix-input text-right font-normal pr-0.5 text-[10px] h-[20px]" dataGridId={`y-matrix-plan-${rowIdx}-${colIdx}`} onGridKeyDown={handleGridNav}/>
                                                {showHistory && historyList.length > 0 && (
                                                    <div className="relative group/hist no-print">
                                                        <span className="absolute -top-4 right-0.5 text-[8px] bg-amber-100 text-amber-800 border border-amber-300 px-0.5 rounded cursor-pointer font-bold z-10 shadow-sm">📜{historyList.length}</span>
                                                        <div className="hidden group-hover/hist:block absolute right-0 top-0 mt-1 w-44 bg-slate-800 text-white p-2 rounded shadow-xl z-50 text-[10px] space-y-1 border border-slate-600">
                                                            <div className="font-bold border-b border-slate-600 pb-1 text-amber-300">履歴一覧 ({model} {mo})</div>
                                                            <div className="max-h-36 overflow-y-auto space-y-1">
                                                                {historyList.map((hist, hIdx) => (
                                                                    <div key={hIdx} className="flex justify-between items-center bg-slate-700 px-1.5 py-0.5 rounded font-normal">
                                                                        <span className="font-mono font-bold text-emerald-300">{hist.qty.toLocaleString()} 台</span>
                                                                        <div className="flex items-center gap-1">
                                                                            <span className="text-[9px] text-slate-300">{hist.date || ctx.getFormattedShortDate()}</span>
                                                                            <button onClick={() => handleDeleteHistory(plan.id, hIdx, model, mo)} disabled={ctx.authUser && !ctx.authUser.canEdit} className="text-red-400 hover:text-red-200 font-bold ml-1 text-xs">×</button>
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

                                    <td className={`border text-[11px] text-left min-w-[120px] font-normal ${rowPaddingClass}`}>
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
                    <form onSubmit={handleAddNewModelSubmit} className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md flex flex-col gap-4 text-xs">
                        <h3 className="font-bold text-sm border-b pb-2 text-emerald-800">+ 新規型式の追加</h3>
                        <div>
                            <label className="block font-bold mb-1">品番 (型式名) <span className="text-red-500">*</span></label>
                            <input type="text" required value={newModel} onChange={e => setNewModel(e.target.value)} placeholder="例: ALC-08SK" className="w-full border p-1.5 rounded text-xs font-normal"/>
                        </div>
                        <div>
                            <label className="block font-bold mb-1">仕入先コード (3桁)</label>
                            <input type="text" maxLength={3} value={newVendorCode} onChange={e => setNewJanVendorCode(e.target.value)} placeholder="例: 001" className="w-full border p-1.5 rounded font-mono text-center text-xs font-normal"/>
                        </div>
                        <div>
                            <label className="block font-bold mb-1">品名 (製品名)</label>
                            <input type="text" value={newProductName} onChange={e => setNewProductName(e.target.value)} placeholder="例: ｱﾋﾞﾃﾗｯックス LEDｼｰﾘﾝｸﾞ" className="w-full border p-1.5 rounded text-xs font-normal"/>
                        </div>
                        <div>
                            <label className="block font-bold mb-1">JANコード</label>
                            <input type="text" value={newJanCode} onChange={e => setNewJanCode(e.target.value)} placeholder="例: 4912345678901" className="w-full border p-1.5 rounded text-xs font-normal"/>
                        </div>
                        <div className="flex justify-end gap-2 border-t pt-3 mt-2">
                            <button type="button" onClick={() => setIsAddModalOpen(false)} className="bg-gray-200 text-gray-700 px-3 py-1 rounded font-bold">キャンセル</button>
                            <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded font-bold shadow">追加する</button>
                        </div>
                    </form>
                </div>
            )}

            <ModelEditModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} company="yoshii" />
            <ExportPrintModal isOpen={exportModal.isOpen} onClose={() => setExportModal({ isOpen: false, type: 'excel' })} screenName="納品・出荷計画" currentMonthStr={ctx.currentMonthStr} defaultMode="year" onStartExport={handleExecuteExport} />
        </div>
    );
};

// 【コンテナ割振り画面ビュー】
const YoshiiAllocationView = () => {
    const ctx = React.useContext(AppContext);
    const [exportModal, setExportModal] = React.useState({ isOpen: false, type: 'excel' });

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

    const [rowLimit, setRowLimit] = React.useState(29);
    const [focusTargetIdx, setFocusTargetIdx] = React.useState(null);
    const [deleteConfirmTarget, setDeleteConfirmTarget] = React.useState(null);

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
            if (normalizeModelCode(key) === normTarget && qty > 0) return qty;
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
    modelsSet.forEach(m => { modelTotals[m] = getDirectPlanQty(m, ctx.yoshiiAllocMonth); });

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
        const planQty = modelTotals[m] || 0;
        const hasAlloc = monthContainers.some(c => (Number(getContainerAllocationQty(c.allocations, m)) || 0) > 0);
        return planQty > 0 || hasAlloc;
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
        <div className="p-3 bg-white flex-grow flex flex-col h-full overflow-hidden">
            <div className="hidden print:block font-bold text-sm text-black mb-1.5 border-b pb-1 text-left w-full">
                吉井電気 コンテナ割振り [対象年月: {ctx.yoshiiAllocMonth}] [仕入先: {ctx.selectedVendorFilter || 'ALL'}]
            </div>
            <div className="flex justify-between items-center mb-2 no-print flex-shrink-0">
                <div className="flex gap-4 items-center bg-gray-50 p-1.5 rounded border">
                    <h2 className="text-base font-bold">吉井電気 コンテナ割振り</h2>
                    <label className="font-bold text-xs ml-2">対象年月:</label>
                    <input type="month" value={ctx.yoshiiAllocMonth} onChange={e => ctx.setYoshiiAllocMonth(e.target.value)} className="border p-0.5 rounded text-xs text-center font-bold" />
                    <label className="font-bold text-xs ml-2">コンテナ枠数:</label>
                    <div className="flex items-center gap-1">
                        <button onClick={() => { if (displayRows > monthContainers.length) setRowLimit(displayRows - 1); }} disabled={ctx.authUser && !ctx.authUser.canEdit} className="bg-gray-300 hover:bg-gray-400 disabled:opacity-30 w-6 h-6 rounded font-bold transition text-xs">-</button>
                        <span className="w-6 text-center font-bold text-xs">{displayRows}</span>
                        <button onClick={handleAddRow} disabled={ctx.authUser && !ctx.authUser.canEdit} className="bg-gray-300 hover:bg-gray-400 disabled:opacity-30 w-6 h-6 rounded font-bold transition text-xs">+</button>
                    </div>
                </div>

                <div className="flex items-center gap-2 font-bold">
                    <button onClick={() => setExportModal({ isOpen: true, type: 'excel' })} className="px-2 py-1 text-xs font-bold rounded bg-emerald-700 hover:bg-emerald-800 text-white shadow transition flex items-center gap-1">📊 Excel出力</button>
                    <button onClick={() => setExportModal({ isOpen: true, type: 'print' })} className="px-2 py-1 text-xs font-bold rounded bg-slate-700 hover:bg-slate-800 text-white shadow transition flex items-center gap-1">🖨 印刷</button>
                    <button onClick={ctx.handleStartTracking} className={`px-2 py-1 text-xs font-bold rounded shadow transition ${ctx.isChangeTrackingMode ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}>{ctx.isChangeTrackingMode ? '● 変更記録中' : '変更開始'}</button>
                    <button onClick={ctx.handleClearTracking} className="px-2 py-1 text-xs font-bold rounded bg-gray-600 hover:bg-gray-700 text-white shadow transition">変更クリア</button>
                </div>
            </div>

            {!ctx.yoshiiAllocMonth ? <p className="text-gray-500 text-xs">対象年月を選択してください。</p> : models.length === 0 ? <p className="text-gray-500 text-xs">この月（{ctx.yoshiiAllocMonth}）の計画データが存在しません。</p> : (
                <div className="table-container flex-grow border rounded shadow-inner overflow-x-auto overflow-y-auto" ref={ctx.tableContainerRef}>
                    <table className="alloc-print-table w-max text-center border-collapse text-[11px]">
                        <thead className="sticky top-0 z-30 bg-gray-200 shadow-sm font-bold">
                            <tr className="bg-gray-200">
                                <th className="p-0.5 border w-8 sticky left-0 top-0 bg-gray-200 z-40 text-[10px] no-print">移動</th>
                                <th className="p-0.5 border w-14 sticky left-[32px] top-0 bg-gray-200 z-40 text-[10px]">項目</th>
                                <th className="p-0.5 border w-[85px] min-w-[85px] sticky left-[88px] top-0 bg-gray-200 z-40 text-[10px]">管理番号</th>
                                <th className="p-0.5 border w-[65px] min-w-[65px] sticky left-[173px] top-0 bg-gray-200 z-40 text-[10px]">到着港</th>
                                {models.map(m => (
                                    <th key={m} className="p-0.5 border bg-emerald-100 text-[10px] leading-tight align-bottom model-hdr w-[62px] min-w-[62px] font-bold" title={m}>
                                        {formatModelWithBreak(m)}
                                    </th>
                                ))}
                                <th className="p-0.5 border w-10 bg-gray-200 no-print">削除</th>
                            </tr>
                            <tr className="bg-gray-50 font-bold text-[11px] text-gray-700 border-b">
                                <td className="p-0.5 border sticky left-0 bg-gray-50 z-40 text-center no-print">-</td>
                                <td className="p-0.5 border sticky left-[32px] bg-gray-50 z-40 text-center">計画数</td>
                                <td className="p-0.5 border sticky left-[88px] bg-gray-50 z-40 text-center text-gray-500 font-normal">(合計)</td>
                                <td className="p-0.5 border sticky left-[173px] bg-gray-50 z-40 text-right pr-1 font-extrabold text-emerald-900 bg-emerald-100/60">
                                    {models.reduce((sum, m) => sum + (Number(modelTotals[m]) || 0), 0).toLocaleString()}
                                </td>
                                {models.map(m => <td key={m} className="p-0.5 border font-bold text-right pr-1 text-[11px] w-[62px] min-w-[62px]">{Number(modelTotals[m]).toLocaleString()}</td>)}
                                <td className="p-0.5 border bg-gray-50 no-print"></td>
                            </tr>
                            <tr className="bg-gray-100 font-bold text-[11px] text-gray-800 border-b-2 border-gray-300">
                                <td className="p-0.5 border sticky left-0 bg-gray-100 z-40 text-center no-print">-</td>
                                <td className="p-0.5 border sticky left-[32px] bg-gray-100 z-40 text-center">残数</td>
                                <td className="p-0.5 border sticky left-[88px] bg-gray-100 z-40 text-center text-gray-500 font-normal">(合計)</td>
                                <td className="p-0.5 border sticky left-[173px] bg-gray-100 z-40 text-right pr-1 font-extrabold text-indigo-900 bg-indigo-100/60">
                                    {models.reduce((sum, m) => {
                                        const allocated = monthContainers.reduce((cSum, c) => cSum + (Number(getContainerAllocationQty(c.allocations, m)) || 0), 0);
                                        return sum + (modelTotals[m] - allocated);
                                    }, 0).toLocaleString()}
                                </td>
                                {models.map(m => {
                                    const allocated = monthContainers.reduce((sum, c) => sum + (Number(getContainerAllocationQty(c.allocations, m)) || 0), 0);
                                    const remain = modelTotals[m] - allocated;
                                    return <td key={m} className={`p-0.5 border font-bold text-right pr-1 text-[11px] w-[62px] min-w-[62px] ${remain < 0 ? 'text-red-600' : remain > 0 ? 'text-blue-600' : 'text-green-600'}`}>{remain.toLocaleString()}</td>;
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
                                        className={`hover:bg-emerald-50 ${ctx.dragOverRowId === container.id ? (ctx.dragDirection === 'top' ? 'drag-over-top' : 'drag-over-bottom') : ''} ${ctx.draggedRowId === container.id ? 'dragging-row' : ''}`}
                                    >
                                        <td draggable={!!container.id && (ctx.authUser ? ctx.authUser.canEdit : true)} onDragStart={(e) => ctx.handleDragStart(e, container.id, 'containers')} className="p-0.5 border bg-white sticky left-0 z-20 text-center drag-handle text-gray-400 hover:text-emerald-600 text-sm cursor-grab active:cursor-grabbing no-print font-normal">≡</td>
                                        <td className="p-0.5 border bg-white sticky left-[32px] z-20 text-[10px] font-normal whitespace-nowrap">コンテナ {idx + 1}</td>
                                        
                                        <td className="matrix-td px-0 sticky left-[88px] bg-white z-20">
                                            <LocalInput 
                                                value={container.managementNo} 
                                                originalValue={(container.originals || {}).managementNo}
                                                originalMeta={(container.originalMetas || {}).managementNo}
                                                onChange={(v, orig) => ctx.updateContainer(container.id, { managementNo: v, originals: { ...(container.originals || {}), managementNo: container.originals?.managementNo !== undefined ? container.originals.managementNo : orig }, originalMetas: { ...(container.originalMetas || {}), managementNo: container.originalMetas?.managementNo !== undefined ? container.originalMetas.managementNo : `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}` } }, ctx.yoshiiAllocMonth, 'yoshii', '管理番号')} 
                                                className="matrix-input text-center text-[11px] font-normal" 
                                                dataGridId={`y-alloc-${idx}-0`} 
                                                onGridKeyDown={handleGridNav} 
                                            />
                                        </td>

                                        <td className="matrix-td px-0 sticky left-[173px] bg-white z-20">
                                            <DynamicSelect 
                                                value={container.port} 
                                                originalValue={(container.originals || {}).port}
                                                originalMeta={(container.originalMetas || {}).port}
                                                onChange={(val, cat, orig) => ctx.handleSelectChange(container.id, 'port', true, 'yoshii', false, '到着港')(val, cat, orig)} 
                                                category="ports" 
                                                options={ctx.masterData.yoshii.ports} 
                                                dataGridId={`y-alloc-${idx}-1`} 
                                                onGridKeyDown={handleGridNav} 
                                                autoFocus={focusTargetIdx === idx}
                                                onAutoFocused={() => setFocusTargetIdx(null)}
                                                className="w-full h-full text-[11px] border-none bg-transparent outline-none text-center min-w-0 px-0 font-normal" 
                                            />
                                        </td>

                                        {models.map((m, mIdx) => {
                                            const cellValue = getContainerAllocationQty(container.allocations, m);
                                            return (
                                                <td key={m} className="matrix-td px-0.5 w-[62px] min-w-[62px]">
                                                    <LocalInput 
                                                        type="number" 
                                                        value={cellValue} 
                                                        originalValue={(container.originals?.allocations || {})[m]}
                                                        originalMeta={(container.originalMetas || {})[m]}
                                                        onChange={(v, orig) => handleAllocationValueChange(container, m, v, orig)} 
                                                        className="matrix-input text-emerald-800 pr-0.5 text-right text-[11px] font-normal" 
                                                        dataGridId={`y-alloc-${idx}-${mIdx + 2}`} 
                                                        onGridKeyDown={handleGridNav} 
                                                    />
                                                </td>
                                            );
                                        })}
                                        
                                        <td className="p-0.5 border text-center align-middle whitespace-nowrap relative no-print">
                                            <button tabIndex="-1" onClick={() => setDeleteConfirmTarget(deleteConfirmTarget === idx ? null : idx)} disabled={ctx.authUser && !ctx.authUser.canEdit} className="text-red-500 hover:text-red-700 disabled:opacity-30 font-bold text-base leading-none">×</button>
                                            {deleteConfirmTarget === idx && (
                                                <div className="absolute right-6 top-1/2 -translate-y-1/2 bg-white border border-red-300 shadow-lg rounded p-1.5 z-50 text-[10px] flex items-center gap-1 font-bold whitespace-nowrap">
                                                    <span className="text-red-700">削除しますか？</span>
                                                    <button onClick={() => handleExecuteDeleteRow(container.id, idx)} className="bg-red-600 hover:bg-red-700 text-white px-1.5 py-0.5 rounded text-[10px]">削除</button>
                                                    <button onClick={() => setDeleteConfirmTarget(null)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-1.5 py-0.5 rounded text-[10px]">消す</button>
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