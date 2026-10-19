// ==========================================
// 吉井電気 製品出荷管理システム (WebVer. 97)
// 主要画面ビューモジュール (shipping_views.js)
// ==========================================

// React Portal を利用したツールチップコンポーネント
const PortalTooltip = ({ text, targetRef }) => {
    const [coords, setCoords] = React.useState(null);

    React.useLayoutEffect(() => {
        if (targetRef && targetRef.current) {
            const rect = targetRef.current.getBoundingClientRect();
            setCoords({
                top: rect.top + window.scrollY - 30,
                left: rect.left + window.scrollX + rect.width / 2
            });
        }
    }, [targetRef]);

    if (!coords || !text) return null;

    return ReactDOM.createPortal(
        <div 
            style={{
                position: 'absolute',
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                transform: 'translateX(-50%)',
                backgroundColor: '#111827',
                color: '#f9fafb',
                padding: '4px 9px',
                borderRadius: '5px',
                fontSize: '11px',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                zIndex: 9999,
                boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
                pointerEvents: 'none'
            }}
        >
            {text}
        </div>,
        document.body
    );
};

// ソート用インジケータ生成関数（Babel構文エラー対策適用済み）
const getSortIndicator = (key, sortConfig) => {
    if (!sortConfig) return '';
    const idx = sortConfig.findIndex(s => s.key === key);
    if (idx === -1) return '';
    const dir = sortConfig[idx].direction === 'asc' ? '▲' : '▼';
    const numStr = sortConfig.length > 1 ? String(idx + 1) : '';
    return ' ' + dir + numStr;
};

// 共通フィルタ・ソートコントロール
const ScheduleFilterSortControl = ({ 
    filterMode, setFilterMode, 
    selectedYear, setSelectedYear, 
    singleMonth, setSingleMonth, 
    startMonth, setStartMonth, 
    endMonth, setEndMonth, 
    sortConfig, setSortConfig 
}) => {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 p-2 rounded border text-xs no-print mb-2 flex-shrink-0">
            <div className="flex items-center gap-3 flex-wrap">
                <span className="font-bold text-gray-700">📅 納入月表示切替:</span>
                <select 
                    value={filterMode} 
                    onChange={e => setFilterMode(e.target.value)} 
                    className="border p-1 rounded font-bold bg-white text-indigo-900"
                >
                    <option value="all">全体 (当月スクロール)</option>
                    <option value="current">当月のみ</option>
                    <option value="year">年度指定</option>
                    <option value="month">月指定</option>
                    <option value="range">範囲指定</option>
                </select>

                {filterMode === 'year' && (
                    <select 
                        value={selectedYear} 
                        onChange={e => setSelectedYear(Number(e.target.value))} 
                        className="border p-1 rounded font-bold bg-white text-indigo-900"
                    >
                        <option value={2025}>2025年度</option>
                        <option value={2026}>2026年度</option>
                        <option value={2027}>2027年度</option>
                    </select>
                )}

                {filterMode === 'month' && (
                    <input 
                        type="month" 
                        value={singleMonth} 
                        onChange={e => setSingleMonth(e.target.value)} 
                        className="border p-1 rounded font-bold bg-white" 
                    />
                )}

                {filterMode === 'range' && (
                    <div className="flex items-center gap-1 font-bold">
                        <input type="month" value={startMonth} onChange={e => setStartMonth(e.target.value)} className="border p-1 rounded bg-white" />
                        <span>〜</span>
                        <input type="month" value={endMonth} onChange={e => setEndMonth(e.target.value)} className="border p-1 rounded bg-white" />
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2">
                {sortConfig.length > 0 ? (
                    <div className="flex items-center gap-1 text-[11px] bg-indigo-50 border border-indigo-200 px-2 py-1 rounded text-indigo-800 font-bold">
                        <span>ソート:</span>
                        {sortConfig.map((s, idx) => (
                            <span key={s.key} className="bg-white border px-1.5 py-0.5 rounded shadow-sm">
                                {idx + 1}. {s.label}{s.direction === 'asc' ? '▲' : '▼'}
                            </span>
                        ))}
                        <button 
                            onClick={() => setSortConfig([])} 
                            className="ml-1 text-red-500 hover:text-red-700 font-bold" 
                            title="全ソート条件解除"
                        >
                            ✕
                        </button>
                    </div>
                ) : (
                    <span className="text-gray-400 text-[11px]">※[Shift+ヘッダークリック]で複数条件ソート</span>
                )}
            </div>
        </div>
    );
};

// ローカル入力コンポーネント (LocalInput)
const LocalInput = ({ value, onChange, onEnter, onTabOut, onFocusTrigger, type="text", className="", listId, dataGridId, onGridKeyDown, autoFocus, onAutoFocused, refDate, placeholder="", originalValue, originalMeta }) => {
    const ctx = React.useContext(AppContext);
    const [val, setVal] = React.useState(value !== undefined && value !== null ? String(value) : '');
    const [focused, setFocused] = React.useState(false);
    const [isEditing, setIsEditing] = React.useState(false);
    const inputRef = React.useRef(null);

    React.useEffect(() => { 
        if (!focused) setVal(value !== undefined && value !== null ? String(value) : ''); 
    }, [value, focused]);

    React.useEffect(() => {
        if (autoFocus && inputRef.current) {
            inputRef.current.focus({ preventScroll: true });
            if (inputRef.current.select) inputRef.current.select();
            inputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (onAutoFocused) onAutoFocused();
        }
    }, [autoFocus]);

    const handleBlur = () => { 
        setFocused(false);
        setIsEditing(false);
        const currentStr = value !== undefined && value !== null ? String(value) : '';
        if (val !== currentStr) {
            const origToPass = originalValue !== undefined && originalValue !== null ? originalValue : currentStr;
            onChange(val, origToPass); 
        }
    };
    
    const handleFocus = () => {
        setFocused(true);
        setIsEditing(false);
        if (onFocusTrigger) onFocusTrigger();
    };

    const handleChange = (e) => {
        const newV = e.target.value;
        setVal(newV);
        setIsEditing(true);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            if (onGridKeyDown) {
                e.preventDefault(); handleBlur(); onGridKeyDown(e);
            } else {
                handleBlur(); e.target.blur(); if (onEnter) onEnter();
            }
            return;
        }
        
        if (onGridKeyDown) {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault(); handleBlur(); onGridKeyDown(e);
                return;
            }
            if (!isEditing && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                e.preventDefault(); handleBlur(); onGridKeyDown(e);
                return;
            }
        }

        if (e.key === 'Tab' && !e.shiftKey) {
            handleBlur();
            if (onTabOut) { e.preventDefault(); e.target.blur(); onTabOut(); }
        }
    };

    const preventRowDrag = (e) => {
        e.stopPropagation();
    };
    
    let displayVal = val;
    let currentType = type;
    let extraClass = '';

    const hasOrig = originalValue !== undefined && originalValue !== null && String(originalValue) !== '';
    const isChanged = hasOrig && String(originalValue) !== String(val);
    const tooltipClass = isChanged ? 'has-original-tooltip' : '';
    const changedClass = (ctx.isChangeTrackingMode && isChanged) ? 'is-changed-cell' : '';

    const metaStr = originalMeta || `${ctx.getFormattedShortDate ? ctx.getFormattedShortDate() : ''} ${ctx.operatorName || '未設定'}`;

    if (type === 'number') {
        extraClass = 'text-right font-normal ';
        if (!focused && val !== '') {
            const num = Number(val);
            if (!isNaN(num)) { displayVal = num.toLocaleString(); currentType = 'text'; }
        }
    } else if (type === 'month') {
        const parsedRef = parseRefDateToYMD(refDate);
        let formattedMonth = displayVal;
        if (!focused && displayVal && displayVal.includes('-')) {
            const parts = displayVal.split('-');
            if (parts.length >= 2) formattedMonth = `${parts[0].slice(-2)}/${parts[1]}`;
        }

        return (
            <div className={`relative flex items-center justify-between w-full h-full group bg-transparent text-center min-w-[85px] ${changedClass} ${tooltipClass}`} data-original-val={originalValue === "" ? "【消去】" : originalValue} data-original-meta={metaStr} onMouseDown={preventRowDrag}>
                <input 
                    ref={inputRef}
                    type="text" 
                    value={formattedMonth} 
                    onChange={handleChange} 
                    onFocus={handleFocus} 
                    onBlur={handleBlur} 
                    onKeyDown={handleKeyDown} 
                    disabled={ctx.authUser && !ctx.authUser.canEdit}
                    className={`cell-input text-center font-normal pr-6 ${className} ${changedClass}`} 
                    data-grid-id={dataGridId}
                    placeholder={placeholder}
                />
                <div className="absolute right-1 w-5 h-full flex items-center justify-center flex-shrink-0 no-print opacity-40 group-hover:opacity-100 transition-all cursor-pointer">
                    <span className="text-[10px]">📅</span>
                    <input 
                        type="month" 
                        value={val.length >= 7 ? val.substring(0, 7) : (parsedRef ? parsedRef.substring(0, 7) : "")} 
                        disabled={ctx.authUser && !ctx.authUser.canEdit}
                        onChange={e => { 
                            const newVal = e.target.value;
                            setVal(newVal); 
                            onChange(newVal, val);
                        }} 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    />
                </div>
            </div>
        );
    } else if (type === 'qc-date' || type === 'date') {
        const isQc = type === 'qc-date';
        const parsedRef = parseRefDateToYMD(refDate);

        let formattedDate = displayVal;
        if (!focused && displayVal) {
            if (displayVal.includes('-')) {
                const parts = displayVal.split('-');
                if (parts.length === 3) formattedDate = `${parts[1]}/${parts[2]}`;
            } else if (displayVal.includes('/')) {
                const parts = displayVal.split('/');
                if (parts.length === 3) formattedDate = `${parts[1]}/${parts[2]}`;
            }
        }

        return (
            <div className={`relative flex items-center justify-between w-full h-full group bg-transparent text-center min-w-[68px] ${changedClass} ${tooltipClass}`} data-original-val={originalValue === "" ? "【消去】" : originalValue} data-original-meta={metaStr} onMouseDown={preventRowDrag}>
                <input 
                    ref={inputRef}
                    type="text" 
                    value={formattedDate ? formattedDate : (isQc ? '未定' : '')} 
                    onChange={handleChange} 
                    onFocus={handleFocus} 
                    onBlur={handleBlur} 
                    onKeyDown={handleKeyDown} 
                    disabled={ctx.authUser && !ctx.authUser.canEdit}
                    className={`cell-input text-center font-normal pr-5 ${className} ${changedClass}`} 
                    data-grid-id={dataGridId}
                    placeholder={placeholder}
                />
                <div className="absolute right-0.5 w-4 h-full flex items-center justify-center flex-shrink-0 no-print opacity-40 group-hover:opacity-100 transition-all cursor-pointer">
                    <span className="text-[9px]">📅</span>
                    <input 
                        type="date" 
                        value={val.includes('-') ? val : (parsedRef || "")} 
                        disabled={ctx.authUser && !ctx.authUser.canEdit}
                        onChange={e => { 
                            const newVal = e.target.value;
                            setVal(newVal); 
                            onChange(newVal, val);
                        }} 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    />
                </div>
            </div>
        );
    }

    return (
        <div className={`w-full h-full ${tooltipClass}`} data-original-val={originalValue === "" ? "【消去】" : originalValue} data-original-meta={metaStr}>
            <input 
                ref={inputRef} type={currentType} list={listId} value={displayVal} 
                onChange={handleChange} onFocus={handleFocus} onBlur={handleBlur} onKeyDown={handleKeyDown}
                onMouseDown={preventRowDrag}
                disabled={ctx.authUser && !ctx.authUser.canEdit}
                className={className.includes('matrix-input') ? `${className} ${extraClass} ${changedClass}` : `cell-input font-normal ${extraClass} ${className} ${changedClass}`} 
                data-grid-id={dataGridId}
                placeholder={placeholder}
            />
        </div>
    );
};

// ローカルテキストエリア (LocalTextArea)
const LocalTextArea = ({ value, onChange, isCompact=false, className="", originalValue, originalMeta }) => {
    const ctx = React.useContext(AppContext);
    const [val, setVal] = React.useState(value !== undefined && value !== null ? String(value) : '');
    const [focused, setFocused] = React.useState(false);

    React.useEffect(() => {
        if (!focused) setVal(value !== undefined && value !== null ? String(value) : '');
    }, [value, focused]);

    const handleBlur = () => {
        setFocused(false);
        if (val !== (value || '')) onChange(val, value);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            e.target.blur();
        }
    };

    const hasOrig = originalValue !== undefined && originalValue !== null && String(originalValue) !== '';
    const isChanged = hasOrig && String(originalValue) !== String(val);
    const tooltipClass = isChanged ? 'has-original-tooltip' : '';
    const changedClass = (ctx.isChangeTrackingMode && isChanged) ? 'is-changed-cell' : '';

    const metaStr = originalMeta || `${ctx.getFormattedShortDate ? ctx.getFormattedShortDate() : ''} ${ctx.operatorName || '未設定'}`;

    return (
        <div className={`w-full h-full ${tooltipClass}`} data-original-val={originalValue === "" ? "【消去】" : originalValue} data-original-meta={metaStr}>
            <textarea 
                value={val}
                onChange={e => setVal(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                rows={isCompact ? 1 : 2}
                disabled={ctx.authUser && !ctx.authUser.canEdit}
                className={`w-full text-xs font-normal px-1 border-none bg-transparent outline-none whitespace-normal break-all resize-y focus:bg-indigo-50 ${isCompact ? 'h-[22px] min-h-[22px] leading-[20px] py-0 overflow-hidden' : 'py-1 min-h-[36px]'} ${className} ${changedClass}`}
            />
        </div>
    );
};

// 動的プルダウン (DynamicSelect)
const DynamicSelect = ({ value, onChange, category, options, className="", dataGridId, onGridKeyDown, onFocusTrigger, autoDefaultValue, autoFocus, onAutoFocused, originalValue, originalMeta }) => {
    const ctx = React.useContext(AppContext);
    const [val, setVal] = React.useState(value || '');
    const selectRef = React.useRef(null);

    React.useEffect(() => { setVal(value || ''); }, [value]);

    React.useEffect(() => {
        if (autoFocus && selectRef.current) {
            selectRef.current.focus({ preventScroll: true });
            selectRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (onAutoFocused) onAutoFocused();
        }
    }, [autoFocus]);

    const handleFocus = (e) => {
        if (!val && autoDefaultValue) {
            setVal(autoDefaultValue);
            onChange(autoDefaultValue, category, '');
        }
        if (onFocusTrigger) onFocusTrigger(e);
    };

    const handleChange = (e) => {
        const newVal = e.target.value;
        const currentVal = value !== undefined && value !== null ? String(value) : '';
        const origToPass = originalValue !== undefined && originalValue !== null ? originalValue : currentVal;
        if (newVal === '__ADD_NEW__') { 
            onChange('__ADD_NEW__', category, origToPass); 
        } else { 
            setVal(newVal); onChange(newVal, category, origToPass); 
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.stopPropagation();
            return;
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            if (onGridKeyDown) onGridKeyDown(e);
            else e.target.blur();
            return;
        }
        if (onGridKeyDown && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
            e.preventDefault();
            onGridKeyDown(e);
        }
    };

    const preventRowDrag = (e) => {
        e.stopPropagation();
    };

    const hasOrig = originalValue !== undefined && originalValue !== null && String(originalValue) !== '';
    const isChanged = hasOrig && String(originalValue) !== String(val);
    const tooltipClass = isChanged ? 'has-original-tooltip' : '';
    const changedClass = (ctx.isChangeTrackingMode && isChanged) ? 'is-changed-cell' : '';

    const metaStr = originalMeta || `${ctx.getFormattedShortDate ? ctx.getFormattedShortDate() : ''} ${ctx.operatorName || '未設定'}`;

    return (
        <div className={`w-full h-full ${tooltipClass}`} data-original-val={originalValue === "" ? "【消去】" : originalValue} data-original-meta={metaStr}>
            <select 
                ref={selectRef}
                value={val} onChange={handleChange} onFocus={handleFocus} onKeyDown={handleKeyDown} onMouseDown={preventRowDrag} data-grid-id={dataGridId}
                disabled={ctx.authUser && !ctx.authUser.canEdit}
                className={`cell-input text-center font-normal ${className} px-0 ${changedClass}`}
            >
                <option value=""></option>
                {(options || []).map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                <option value="__ADD_NEW__" className="font-bold text-blue-600">+ 新規追加</option>
            </select>
        </div>
    );
};

// 型式マスタ編集モーダル
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

        await db.collection('shipping_settings').doc('master_data_v5').set(newMaster, { merge: true });

        const normOld = normalizeModelCode(targetOld);
        const matchingPlans = ctx.plans.filter(p => p.company === company && normalizeModelCode(p.model) === normOld);
        if (matchingPlans.length > 0) {
            const batch = db.batch();
            matchingPlans.forEach(p => {
                batch.update(db.collection('shipments').doc(p.id), { model: targetNew });
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

        await db.collection('shipping_settings').doc('master_data_v5').set(newMaster, { merge: true });

        const normTarget = normalizeModelCode(modelToDelete);
        const matchingPlans = ctx.plans.filter(p => p.company === company && normalizeModelCode(p.model) === normTarget);
        if (matchingPlans.length > 0) {
            const batch = db.batch();
            matchingPlans.forEach(p => {
                batch.delete(db.collection('shipments').doc(p.id));
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
                                <th className="p-2 border font-bold">登録型式名</th>
                                <th className="p-2 border w-24 text-center font-bold">編集</th>
                                <th className="p-2 border w-20 text-center font-bold">削除</th>
                            </tr>
                        </thead>
                        <tbody>
                            {models.length === 0 ? (
                                <tr><td colSpan="3" className="p-4 text-center text-gray-500 font-normal">登録型式はありません。</td></tr>
                            ) : (
                                models.map(m => (
                                    <tr key={m} className="border-b hover:bg-gray-50">
                                        <td className="p-2 border font-normal">
                                            {editingModel === m ? (
                                                <input 
                                                    type="text" 
                                                    value={newModelName} 
                                                    onChange={e => setNewModelName(e.target.value)} 
                                                    className="w-full border p-1 rounded text-sm font-bold bg-yellow-50"
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
                            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                                ⚠️
                            </div>
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
                                <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 font-bold text-xs text-gray-700">
                                    キャンセル
                                </button>
                                <button onClick={handleExecuteDeleteModel} className="px-5 py-2 rounded bg-red-600 hover:bg-red-700 font-bold text-xs text-white shadow">
                                    本当に削除する
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// 1. 納品・出荷計画画面 (YoshiiPlanView)
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
        
        const monthTotals = displayMonths.map(mo => calculateColTotal(mo));
        const totalRow = ['-', '月間合計', '-', '-', totalGrandTotal, ...monthTotals, '-'];

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

    const [categoryFilter, setCategoryFilter] = React.useState('全体 (全表示)');

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
    } else if (categoryFilter === '（Z)CCN' || categoryFilter === '(Z)CCN') {
        allModels = allModels.filter(m => {
            const u = m.toUpperCase();
            return u.includes('CCN') || u.includes('ZCCN');
        });
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

        await db.collection('shipping_settings').doc('master_data_v5').set(newMaster, { merge: true });
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
                const confirmAdd = window.confirm(`未登録の仕入先コード 『${cleanCode}』 が入力されました。\n\n新しい仕入先として登録しますか？\n・仕入先選択リストに自動追加されます。`);
                if (confirmAdd) {
                    const updatedVendors = Array.from(new Set([...knownVendors, cleanCode]));
                    const newMaster = {
                        ...ctx.masterData,
                        yoshii: { ...(ctx.masterData.yoshii || {}), vendors: updatedVendors }
                    };
                    await db.collection('shipping_settings').doc('master_data_v5').set(newMaster, { merge: true });
                    value = cleanCode;
                }
            } else {
                value = cleanCode;
            }
        }

        await ctx.updateModelDetail('yoshii', model, field, value);

        const normTarget = normalizeModelCode(model);
        const matchingPlans = yoshiiPlans.filter(p => normalizeModelCode(p.model) === normTarget);
        const batch = db.batch();
        matchingPlans.forEach(p => {
            batch.update(db.collection('shipments').doc(p.id), {
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

    const rowPaddingClass = 'py-0 px-0.5 h-[24px]';

    return (
        <div className="p-4 bg-white flex-grow flex flex-col h-full">
            <div className="hidden print:block font-bold text-sm text-black mb-1.5 border-b pb-1 text-left w-full">
                {dynamicTitle} [仕入先: {ctx.selectedVendorFilter || 'ALL'}]
            </div>

            <div className="mb-2 flex-shrink-0 flex justify-between items-center no-print">
                <div>
                    <h2 className="text-base md:text-lg font-extrabold text-emerald-900 border-b-2 border-emerald-600 pb-1">
                        {dynamicTitle}
                    </h2>
                </div>

                <div className="flex items-center gap-1.5 no-print">
                    <button 
                        onClick={() => setExportModal({ isOpen: true, type: 'excel' })}
                        className="px-2.5 py-1 text-xs font-bold rounded bg-emerald-700 hover:bg-emerald-800 text-white shadow transition flex items-center gap-1"
                    >
                        📊 Excel出力
                    </button>
                    <button 
                        onClick={() => setExportModal({ isOpen: true, type: 'print' })}
                        className="px-2.5 py-1 text-xs font-bold rounded bg-slate-700 hover:bg-slate-800 text-white shadow transition flex items-center gap-1"
                    >
                        🖨 印刷
                    </button>
                    <button 
                        onClick={ctx.handleStartTracking} 
                        className={`px-2.5 py-1 text-xs font-bold rounded shadow transition ${ctx.isChangeTrackingMode ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
                    >
                        {ctx.isChangeTrackingMode ? '● 変更記録中' : '変更開始'}
                    </button>
                    <button 
                        onClick={ctx.handleClearTracking} 
                        className="px-2.5 py-1 text-xs font-bold rounded bg-gray-600 hover:bg-gray-700 text-white shadow transition"
                    >
                        変更クリア
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap justify-between items-center mb-3 no-print gap-3 flex-shrink-0">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-gray-700">カテゴリ:</span>
                        <select 
                            value={categoryFilter} 
                            onChange={e => setCategoryFilter(e.target.value)}
                            className="border rounded px-2 py-1 text-xs font-bold bg-white text-emerald-900 border-gray-300 shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                        >
                            <option value="全体 (全表示)">全体 (全表示)</option>
                            <option value="ALC">ALC</option>
                            <option value="KS">KS</option>
                            <option value="(Z)CCN">(Z)CCN</option>
                            <option value="その他">その他</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2 bg-gray-50 p-1 rounded border text-xs">
                        <select 
                            value={rangeMode} 
                            onChange={e => setRangeMode(e.target.value)}
                            className="font-bold border rounded px-1 py-0.5 bg-white"
                        >
                            <option value="year">年度指定</option>
                            <option value="custom">カスタム指定</option>
                        </select>

                        {rangeMode === 'year' ? (
                            <select 
                                value={selectedYear} 
                                onChange={e => setSelectedYear(Number(e.target.value))}
                                className="font-bold border rounded px-2 py-0.5 bg-white text-emerald-800"
                            >
                                <option value={2025}>2025年度</option>
                                <option value={2026}>2026年度</option>
                                <option value={2027}>2027年度</option>
                            </select>
                        ) : (
                            <div className="flex items-center gap-1 font-bold">
                                <input 
                                    type="month" 
                                    value={customStartMonth} 
                                    onChange={e => setCustomStartMonth(e.target.value)} 
                                    className="border rounded px-1 bg-white"
                                />
                                <span>〜</span>
                                <input 
                                    type="month" 
                                    value={customEndMonth} 
                                    onChange={e => setCustomEndMonth(e.target.value)} 
                                    className="border rounded px-1 bg-white"
                                />
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        disabled={ctx.authUser && !ctx.authUser.canEdit}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white px-3 py-1 rounded text-xs font-bold shadow transition"
                    >
                        + 型式追加
                    </button>

                    <button 
                        onClick={() => setIsEditModalOpen(true)}
                        disabled={ctx.authUser && !ctx.authUser.canEdit}
                        className="bg-gray-700 hover:bg-gray-800 disabled:bg-gray-300 text-white px-2.5 py-1 rounded text-xs font-bold shadow transition flex items-center gap-1"
                    >
                        ✏ 型式編集
                    </button>
                </div>
            </div>

            <div className="table-container flex-grow border rounded shadow-inner" ref={ctx.tableContainerRef}>
                <table className="alloc-print-table w-max text-center border-collapse">
                    <thead className="sticky top-0 z-30 bg-gray-200">
                        <tr>
                            <th className="p-1 border w-8 sticky left-0 bg-gray-200 z-40 text-xs font-bold no-print">順</th>
                            <th className="p-1 border w-[60px] min-w-[60px] sticky left-[32px] bg-gray-200 z-40 text-xs text-center align-middle font-bold">
                                <div className="relative flex items-center justify-center w-full h-full">
                                    <div className="flex items-center justify-center gap-0.5 w-full cursor-pointer hover:text-emerald-700">
                                        <span className="text-[11px] font-bold text-gray-800 truncate">
                                            {ctx.selectedVendorFilter === 'ALL' ? '仕入先' : ctx.selectedVendorFilter}
                                        </span>
                                        <span className="text-[9px] text-gray-500 no-print">▼</span>
                                        <select 
                                            value={ctx.selectedVendorFilter} 
                                            onChange={e => ctx.setSelectedVendorFilter(e.target.value)}
                                            className="no-print absolute inset-0 w-full h-full opacity-0 cursor-pointer text-xs font-bold"
                                            title="仕入先コードで絞り込み"
                                        >
                                            <option value="ALL">全体 (全表示)</option>
                                            {Array.from(new Set(['JP', 'GM', 'LDS', 'SLT', 'YO', ...(ctx.masterData.yoshii?.vendors || [])])).map(v => (
                                                <option key={v} value={v}>{v}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </th>
                            <th className="p-1 border w-[110px] min-w-[110px] sticky left-[92px] bg-gray-200 z-40 text-xs font-bold">型式</th>
                            <th className="p-1 border min-w-[220px] text-xs font-bold whitespace-nowrap">品名</th>
                            <th className="p-1 border w-[95px] min-w-[95px] max-w-[95px] jan-col-print text-xs font-bold">JANコード</th>
                            <th className="p-1 border w-[65px] min-w-[65px] bg-emerald-100 text-xs font-bold text-emerald-900">合計</th>
                            {displayMonths.map(mo => {
                                const yr = mo.split('-')[0].slice(-2);
                                const m = mo.split('-')[1];
                                return (
                                    <th key={mo} className="p-1 border w-[54px] min-w-[54px] max-w-[54px] month-col-print text-xs font-bold bg-gray-200 text-center">
                                        {yr}/{m}
                                    </th>
                                );
                            })}
                            <th className="p-1 border min-w-[180px] text-xs font-bold bg-gray-200">備考 / 出荷調整状況</th>
                        </tr>

                        <tr className="bg-emerald-50 text-xs text-emerald-900 border-b-2 border-emerald-300">
                            <td className="p-1 border sticky left-0 bg-emerald-100 z-40 text-center no-print">-</td>
                            <td className="p-1 border sticky left-[32px] bg-emerald-100 z-40 text-center font-normal">-</td>
                            <td className="p-1 border sticky left-[92px] bg-emerald-100 z-40 text-center font-bold">月間合計</td>
                            <td className="p-1 border text-center font-normal">-</td>
                            <td className="p-1 border text-center jan-col-print font-normal">-</td>
                            <td className="p-1 border text-right pr-1 font-mono text-xs font-normal text-emerald-900 bg-emerald-200">{totalGrandTotal.toLocaleString()}</td>
                            {displayMonths.map(mo => {
                                const colTot = calculateColTotal(mo);
                                return (
                                    <td key={`tot-${mo}`} className="p-1 border text-right pr-1 font-mono text-xs font-normal text-emerald-900 w-[54px] min-w-[54px] month-col-print">
                                        {colTot > 0 ? colTot.toLocaleString() : '0'}
                                    </td>
                                );
                            })}
                            <td className="p-1 border text-center font-normal">-</td>
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
                                <tr 
                                    key={model} 
                                    onDragOver={e => handleModelDragOver(e, model)}
                                    onDrop={e => handleModelDrop(e, model)}
                                    className={`hover:bg-emerald-50 border-b ${dragOverModel === model ? 'border-t-2 border-t-emerald-600 bg-emerald-100' : ''}`}
                                >
                                    <td 
                                        draggable 
                                        onDragStart={e => handleModelDragStart(e, model)}
                                        className={`border font-bold text-xs sticky left-0 bg-white z-10 text-center drag-handle text-gray-400 hover:text-emerald-600 cursor-grab active:cursor-grabbing ${rowPaddingClass}`}
                                    >
                                        ≡
                                    </td>

                                    <td className={`border text-xs text-center sticky left-[32px] bg-white z-10 w-[52px] min-w-[52px] ${rowPaddingClass}`}>
                                        <LocalInput 
                                            value={currentVendorCode} 
                                            originalValue={(matchModelDetails.originals || {}).vendorCode}
                                            originalMeta={(matchModelDetails.originalMetas || {}).vendorCode}
                                            onChange={(v, orig) => handleModelDetailChange(model, 'vendorCode', v)}
                                            className="w-full text-xs text-center font-mono font-normal border-none bg-transparent h-[22px]"
                                        />
                                    </td>

                                    <td className={`border font-normal text-xs sticky left-[92px] bg-white z-10 text-left pl-2 ${rowPaddingClass}`}>{model}</td>
                                    
                                    <td className={`border text-xs text-left min-w-[220px] whitespace-nowrap ${rowPaddingClass}`}>
                                        <LocalInput 
                                            value={currentProdName} 
                                            originalValue={(matchModelDetails.originals || {}).productName}
                                            originalMeta={(matchModelDetails.originalMetas || {}).productName}
                                            onChange={(v, orig) => handleModelDetailChange(model, 'productName', v)}
                                            listId="auto_yoshii_productNames"
                                            className="w-full text-xs text-left font-normal px-1 border-none bg-transparent h-[22px]"
                                        />
                                    </td>

                                    <td className={`border text-xs text-center min-w-[95px] max-w-[95px] jan-col-print ${rowPaddingClass}`}>
                                        <LocalInput 
                                            value={currentJanCode} 
                                            originalValue={(matchModelDetails.originals || {}).janCode}
                                            originalMeta={(matchModelDetails.originalMetas || {}).janCode}
                                            onChange={(v, orig) => handleModelDetailChange(model, 'janCode', v)}
                                            className="w-full text-xs text-center font-mono font-normal border-none bg-transparent h-[22px]"
                                        />
                                    </td>

                                    <td className={`border text-xs font-mono font-normal text-right pr-1 bg-emerald-50 text-emerald-900 ${rowPaddingClass}`}>{rowTot > 0 ? rowTot.toLocaleString() : '0'}</td>
                                    
                                    {displayMonths.map((mo, colIdx) => {
                                        const plan = getPlanData(model, mo);
                                        const currentQty = plan?.quantity || '';

                                        return (
                                            <td key={mo} className="matrix-td align-top p-0 w-[54px] min-w-[54px] month-col-print">
                                                <LocalInput 
                                                    type="number" 
                                                    value={currentQty} 
                                                    originalValue={plan?.originalVal}
                                                    originalMeta={plan?.originalMeta}
                                                    onChange={(v, orig) => handleQuantityChange(model, mo, v, orig)} 
                                                    className="matrix-input text-right font-mono font-normal pr-1 text-xs h-[22px]" 
                                                    dataGridId={`y-matrix-plan-${rowIdx}-${colIdx}`} 
                                                    onGridKeyDown={handleGridNav} 
                                                />
                                            </td>
                                        );
                                    })}

                                    <td className={`border text-xs text-left min-w-[180px] ${rowPaddingClass}`}>
                                        <LocalTextArea 
                                            value={currentNotes} 
                                            originalValue={(matchModelDetails.originals || {}).notes}
                                            originalMeta={(matchModelDetails.originalMetas || {}).notes}
                                            onChange={(v, orig) => handleModelDetailChange(model, 'notes', v)}
                                            isCompact={true}
                                        />
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
                            <input 
                                type="text" 
                                required 
                                value={newModel} 
                                onChange={e => setNewModel(e.target.value)} 
                                placeholder="例: ALC-08SK" 
                                className="w-full border p-1.5 rounded text-sm font-normal"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1">仕入先コード (3桁)</label>
                            <input 
                                type="text" 
                                maxLength={3}
                                value={newVendorCode} 
                                onChange={e => setNewJanVendorCode(e.target.value)} 
                                placeholder="例: 001" 
                                className="w-full border p-1.5 rounded text-sm font-mono font-normal text-center"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1">品名 (製品名)</label>
                            <input 
                                type="text" 
                                value={newProductName} 
                                onChange={e => setNewProductName(e.target.value)} 
                                placeholder="例: ｱﾋﾞﾃﾗｯックス LEDｼｰﾘﾝｸﾞ" 
                                className="w-full border p-1.5 rounded text-sm font-normal"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1">JANコード</label>
                            <input 
                                type="text" 
                                value={newJanCode} 
                                onChange={e => setNewJanCode(e.target.value)} 
                                placeholder="例: 4912345678901" 
                                className="w-full border p-1.5 rounded text-sm font-normal"
                            />
                        </div>
                        <div className="flex justify-end gap-2 border-t pt-3 mt-2">
                            <button type="button" onClick={() => setIsAddModalOpen(false)} className="bg-gray-200 text-gray-700 px-4 py-1.5 rounded text-xs font-bold">キャンセル</button>
                            <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded text-xs font-bold shadow">追加する</button>
                        </div>
                    </form>
                </div>
            )}

            <ModelEditModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} company="yoshii" />
        
            <ExportPrintModal 
                isOpen={exportModal.isOpen} 
                onClose={() => setExportModal({ isOpen: false, type: 'excel' })} 
                screenName="納品・出荷計画" 
                currentMonthStr={ctx.currentMonthStr} 
                defaultMode="year"
                onStartExport={handleExecuteExport} 
            />
        </div>
    );
};

// 型式自動改行関数
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
    const upper = str.toUpperCase();
    if (upper.startsWith('ALC') && str.length > 3) {
        return (
            <span>
                ALC
                <br />
                {str.substring(3)}
            </span>
        );
    }
    if (upper.startsWith('CCN') && str.length > 3) {
        return (
            <span>
                CCN
                <br />
                {str.substring(3)}
            </span>
        );
    }
    if (upper.startsWith('KS') && str.length > 2) {
        return (
            <span>
                KS
                <br />
                {str.substring(2)}
            </span>
        );
    }
    return str;
};

// 2. コンテナ割振り画面 (YoshiiAllocationView)
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

    let rawMonthContainers = ctx.containers
        .filter(c => c.company === 'yoshii' && c.deliveryMonth === ctx.yoshiiAllocMonth);

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
        return 'w-[42px] min-w-[42px] max-w-[42px]';
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
            <div className="hidden print:block font-bold text-sm text-black mb-1.5 border-b pb-1 text-left w-full">
                吉井電気 コンテナ割振り [対象年月: {ctx.yoshiiAllocMonth}] [仕入先: {ctx.selectedVendorFilter || 'ALL'}]
            </div>
            <div className="flex justify-between items-center mb-3 no-print flex-shrink-0">
                <div className="flex gap-4 items-center bg-gray-50 p-2 rounded border">
                    <h2 className="text-lg font-bold">吉井電気 コンテナ割振り</h2>
                    <label className="font-bold text-sm ml-4">対象年月:</label>
                    <input type="month" value={ctx.yoshiiAllocMonth} onChange={e => ctx.setYoshiiAllocMonth(e.target.value)} className="border p-1 rounded text-sm text-center font-normal" />
                    <label className="font-bold text-sm ml-4">コンテナ枠数:</label>
                    <div className="flex items-center gap-1">
                        <button onClick={() => { if (displayRows > monthContainers.length) setRowLimit(displayRows - 1); }} disabled={ctx.authUser && !ctx.authUser.canEdit} className="bg-gray-300 hover:bg-gray-400 disabled:opacity-30 w-8 h-8 rounded font-bold transition">-</button>
                        <span className="w-8 text-center font-bold">{displayRows}</span>
                        <button onClick={handleAddRow} disabled={ctx.authUser && !ctx.authUser.canEdit} className="bg-gray-300 hover:bg-gray-400 disabled:opacity-30 w-8 h-8 rounded font-bold transition">+</button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 no-print">
                        <button 
                            onClick={() => setExportModal({ isOpen: true, type: 'excel' })}
                            className="px-2.5 py-1 text-xs font-bold rounded bg-emerald-700 hover:bg-emerald-800 text-white shadow transition flex items-center gap-1"
                        >
                            📊 Excel出力
                        </button>
                        <button 
                            onClick={() => setExportModal({ isOpen: true, type: 'print' })}
                            className="px-2.5 py-1 text-xs font-bold rounded bg-slate-700 hover:bg-slate-800 text-white shadow transition flex items-center gap-1"
                        >
                            🖨 印刷
                        </button>
                        <button 
                            onClick={ctx.handleStartTracking} 
                            className={`px-2.5 py-1 text-xs font-bold rounded shadow transition ${ctx.isChangeTrackingMode ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
                        >
                            {ctx.isChangeTrackingMode ? '● 変更記録中' : '変更開始'}
                        </button>
                        <button 
                            onClick={ctx.handleClearTracking} 
                            className="px-2.5 py-1 text-xs font-bold rounded bg-gray-600 hover:bg-gray-700 text-white shadow transition"
                        >
                            変更クリア
                        </button>
                    </div>
                </div>
            </div>

            {!ctx.yoshiiAllocMonth ? <p className="text-gray-500 font-normal">対象年月を選択してください。</p> : models.length === 0 ? <p className="text-gray-500 font-normal">この月（{ctx.yoshiiAllocMonth}）の計画データが存在しません。</p> : (
                <div className="table-container flex-grow" ref={ctx.tableContainerRef}>
                    <table className="alloc-print-table w-max text-center border-collapse">
                        <thead className="sticky top-0 z-30 bg-gray-200 shadow-sm">
                            <tr className="bg-gray-200">
                                <th className="p-1 border w-10 sticky left-0 top-0 bg-gray-200 z-40 text-xs font-bold no-print">移動</th>
                                <th className="p-1 border w-16 sticky left-10 top-0 bg-gray-200 z-40 text-xs font-bold">項目</th>
                                <th className="p-1 border w-[90px] min-w-[90px] sticky left-[104px] top-0 bg-gray-200 z-40 text-xs font-bold">管理番号</th>
                                <th className="p-1 border w-[76px] min-w-[70px] sticky left-[194px] top-0 bg-gray-200 z-40 text-xs font-bold">到着港</th>
                                {models.map(m => <th key={m} className={`p-1 border bg-emerald-100 text-xs leading-tight align-bottom model-hdr font-bold ${getModelColWidth(m)}`} title={m}>{formatModelWithBreak(m)}</th>)}
                                <th className="p-1 border w-12 bg-gray-200 font-bold no-print">削除</th>
                            </tr>
                            <tr className="bg-gray-50 text-xs text-gray-700 border-b">
                                <td className="p-1 border sticky left-0 bg-gray-50 z-40 text-center no-print">-</td>
                                <td className="p-1 border sticky left-10 bg-gray-50 z-40 text-center font-normal">計画数</td>
                                <td className="p-1 border sticky left-[104px] bg-gray-50 z-40 text-center text-gray-500 font-normal">(合計)</td>
                                <td className="p-1 border sticky left-[194px] bg-gray-50 z-40 text-right pr-1 font-mono text-xs font-normal text-emerald-900 bg-emerald-100/60">
                                    {models.reduce((sum, m) => sum + (Number(modelTotals[m]) || 0), 0).toLocaleString()}
                                </td>
                                {models.map(m => <td key={m} className={`p-1 border font-mono text-xs text-right pr-1 font-normal ${getModelColWidth(m)} ${modelTotals[m] === 0 ? 'text-red-500' : ''}`}>{Number(modelTotals[m]).toLocaleString()}</td>)}
                                <td className="p-1 border bg-gray-50 no-print"></td>
                            </tr>
                            <tr className="bg-gray-100 text-xs text-gray-800 border-b-2 border-gray-300">
                                <td className="p-1 border sticky left-0 bg-gray-100 z-40 text-center no-print">-</td>
                                <td className="p-1 border sticky left-10 bg-gray-100 z-40 text-center font-normal">残数</td>
                                <td className="p-1 border sticky left-[104px] bg-gray-100 z-40 text-center text-gray-500 font-normal">(合計)</td>
                                <td className="p-1 border sticky left-[194px] bg-gray-100 z-40 text-right pr-1 font-mono text-xs font-normal text-indigo-900 bg-indigo-100/60">
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
                                    return <td key={m} className={`p-1 border font-mono text-xs text-right pr-1 font-normal ${getModelColWidth(m)} ${remain < 0 ? 'text-red-600' : remain > 0 ? 'text-blue-600' : 'text-green-600'}`}>{remain.toLocaleString()}</td>;
                                })}
                                <td className="p-1 border bg-gray-100 no-print"></td>
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: displayRows }).map((_, idx) => {
                                const container = monthContainers[idx] || {};
                                return (
                                    <tr 
                                        key={container.id || `new-${idx}`}
                                        className="hover:bg-emerald-50"
                                    >
                                        <td 
                                            draggable={!!container.id && (ctx.authUser ? ctx.authUser.canEdit : true)} 
                                            className="p-1 border bg-white sticky left-0 z-20 text-center drag-handle text-gray-400 font-bold text-base cursor-grab no-print" 
                                        >≡</td>
                                        <td className="p-1 border bg-white sticky left-10 z-20 text-[11px] font-normal whitespace-nowrap">コンテナ {idx + 1}</td>
                                        
                                        <td className="matrix-td px-0 sticky left-[104px] bg-white z-20">
                                            <LocalInput 
                                                value={container.managementNo} 
                                                originalValue={(container.originals || {}).managementNo}
                                                originalMeta={(container.originalMetas || {}).managementNo}
                                                onChange={(v, orig) => ctx.updateContainer(container.id, { managementNo: v, originals: { ...(container.originals || {}), managementNo: container.originals?.managementNo !== undefined ? container.originals.managementNo : orig }, originalMetas: { ...(container.originalMetas || {}), managementNo: container.originalMetas?.managementNo !== undefined ? container.originalMetas.managementNo : `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}` } }, ctx.yoshiiAllocMonth, 'yoshii', '管理番号')} 
                                                className="matrix-input text-center text-xs font-normal" 
                                                dataGridId={`y-alloc-${idx}-0`} 
                                                onGridKeyDown={handleGridNav} 
                                            />
                                        </td>

                                        <td className="matrix-td px-0 sticky left-[194px] bg-white z-20">
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
                                                className="w-full h-full text-xs font-normal border-none bg-transparent outline-none text-center min-w-0 px-0" 
                                            />
                                        </td>
                                        {models.map((m, mIdx) => {
                                            const cellValue = getContainerAllocationQty(container.allocations, m);
                                            return (
                                                <td key={m} className={`matrix-td px-0.5 ${getModelColWidth(m)}`}>
                                                    <LocalInput 
                                                        type="number" 
                                                        value={cellValue} 
                                                        originalValue={(container.originals?.allocations || {})[m]}
                                                        originalMeta={(container.originalMetas?.allocations || {})[m]}
                                                        onChange={(v, orig) => handleAllocationValueChange(container, m, v, orig)} 
                                                        className="matrix-input text-emerald-800 font-normal pr-1 text-right font-mono text-xs" 
                                                        dataGridId={`y-alloc-${idx}-${mIdx + 2}`} 
                                                        onGridKeyDown={handleGridNav} 
                                                    />
                                                </td>
                                            );
                                        })}
                                        
                                        <td className="p-1 border text-center align-middle whitespace-nowrap relative no-print">
                                            <button 
                                                tabIndex="-1" 
                                                onClick={() => setDeleteConfirmTarget(deleteConfirmTarget === idx ? null : idx)} 
                                                disabled={ctx.authUser && !ctx.authUser.canEdit}
                                                className="text-red-500 hover:text-red-700 disabled:opacity-30 font-bold text-lg leading-none" 
                                                title="削除"
                                            >
                                                ×
                                            </button>

                                            {deleteConfirmTarget === idx && (
                                                <div className="absolute right-8 top-1/2 -translate-y-1/2 bg-white border border-red-300 shadow-lg rounded p-2 z-50 text-xs flex items-center gap-2 font-bold whitespace-nowrap">
                                                    <span className="text-red-700">削除しますか？</span>
                                                    <button 
                                                        onClick={() => handleExecuteDeleteRow(container.id, idx)}
                                                        className="bg-red-600 hover:bg-red-700 text-white px-2 py-0.5 rounded text-[11px]"
                                                    >
                                                        削除
                                                    </button>
                                                    <button 
                                                        onClick={() => setDeleteConfirmTarget(null)}
                                                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-0.5 rounded text-[11px]"
                                                    >
                                                        消す
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        
            <ExportPrintModal 
                isOpen={exportModal.isOpen} 
                onClose={() => setExportModal({ isOpen: false, type: 'excel' })} 
                screenName="コンテナ割振り" 
                currentMonthStr={ctx.currentMonthStr} 
                defaultMode="current"
                onStartExport={handleExecuteExport} 
            />
        </div>
    );
};

// 3. 出荷日程表画面 (YoshiiShipView)
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
            if (mode === 'range') {
                setStartMonth(sMo);
                setEndMonth(eMo);
            }
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

            containerGroups.push({
                rows: groupRows,
                mergeColIndices
            });
        });

        const dateTag = mode === 'current' ? formatYYMM(ctx.currentMonthStr) : mode === 'year' ? `${selYr}年度` : mode === 'single' ? formatYYMM(sgMo) : `${formatYYMM(sMo)}_${formatYYMM(eMo)}`;
        const filename = `${targetVendor}_出荷日程_${dateTag}.xlsx`;

        exportToExcelAdvanced({
            title: `吉井電気 出荷日程表 [仕入先: ${targetVendor}] [期間: ${dateTag}]`,
            headers, containerGroups, filename
        });
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
                if (currDir === 'asc') {
                    newConfig[existingIdx].direction = 'desc';
                } else {
                    newConfig.splice(existingIdx, 1);
                }
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
            [model]: {
                ...modelParts,
                [partKey]: value
            }
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
                    <button 
                        onClick={() => setExportModal({ isOpen: true, type: 'excel' })}
                        className="px-2.5 py-1 text-xs font-bold rounded bg-emerald-700 hover:bg-emerald-800 text-white shadow transition flex items-center gap-1"
                    >
                        📊 Excel出力
                    </button>
                    <button 
                        onClick={() => setExportModal({ isOpen: true, type: 'print' })}
                        className="px-2.5 py-1 text-xs font-bold rounded bg-slate-700 hover:bg-slate-800 text-white shadow transition flex items-center gap-1"
                    >
                        🖨 印刷
                    </button>
                    <button 
                        onClick={ctx.handleStartTracking} 
                        className={`px-2.5 py-1 text-xs font-bold rounded shadow transition ${ctx.isChangeTrackingMode ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
                    >
                        {ctx.isChangeTrackingMode ? '● 変更記録中' : '変更開始'}
                    </button>
                    <button 
                        onClick={ctx.handleClearTracking} 
                        className="px-2.5 py-1 text-xs font-bold rounded bg-gray-600 hover:bg-gray-700 text-white shadow transition"
                    >
                        変更クリア
                    </button>
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

            <div className="table-container flex-grow" ref={ctx.tableContainerRef}>
                <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-gray-100 border-b-2 sticky top-0 z-20">
                        <tr className="bg-gray-100 border-b">
                            <th rowSpan="2" className="p-1 w-[80px] border-r font-bold">管理番号</th>
                            <th rowSpan="2" className="p-1 w-[80px] border-r font-bold">進行状況</th>
                            <th rowSpan="2" onClick={e => handleSortClick('containerNo', 'コンテナNO.', e)} className="p-1 w-[110px] cursor-pointer hover:bg-emerald-100 text-emerald-900 border-r font-bold">
                                コンテナNO.{getSortIndicator('containerNo', sortConfig)}
                            </th>
                            <th rowSpan="2" className="p-1 w-[125px] min-w-[120px] border-r font-bold">積載型式</th>
                            
                            <th colSpan="3" className="p-1 bg-emerald-50 text-emerald-900 border-r text-center font-bold">
                                補充部品 (PCS)
                            </th>

                            <th rowSpan="2" className="p-1 w-[48px] min-w-[45px] border-r font-bold">割振数</th>
                            <th rowSpan="2" className="p-1 w-[48px] min-w-[45px] border-r font-bold">総数量</th>
                            <th rowSpan="2" onClick={e => handleSortClick('port', '到着港', e)} className="p-1 w-[70px] min-w-[65px] cursor-pointer hover:bg-emerald-100 text-emerald-900 border-r font-bold">
                                到着港{getSortIndicator('port', sortConfig)}
                            </th>
                            <th rowSpan="2" onClick={e => handleSortClick('etd', 'ETD', e)} className="p-1 w-[58px] min-w-[54px] cursor-pointer hover:bg-emerald-100 text-emerald-900 border-r font-bold">
                                ETD{getSortIndicator('etd', sortConfig)}
                            </th>
                            <th rowSpan="2" onClick={e => handleSortClick('eta', 'ETA', e)} className="p-1 w-[58px] min-w-[54px] cursor-pointer hover:bg-emerald-100 text-emerald-900 border-r font-bold">
                                ETA{getSortIndicator('eta', sortConfig)}
                            </th>
                            <th rowSpan="2" className="p-1 w-[62px] min-w-[58px] border-r font-bold">サイズ</th>
                            <th rowSpan="2" onClick={e => handleSortClick('vessel', '本船名', e)} className="p-1 w-[170px] min-w-[160px] cursor-pointer hover:bg-emerald-100 text-emerald-900 border-r font-bold">
                                本船名{getSortIndicator('vessel', sortConfig)}
                            </th>
                            <th rowSpan="2" className="p-1 min-w-[160px] notes-col font-bold">備考</th>
                        </tr>
                        <tr className="bg-emerald-50/70 text-emerald-800 text-[10px] font-bold border-b">
                            <th className="p-1 border-r text-center w-10 font-bold">外装箱</th>
                            <th className="p-1 border-r text-center w-10 font-bold">化粧箱</th>
                            <th className="p-1 border-r text-center w-10 font-bold">ラベル</th>
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
                                    <td className="p-0.5"><LocalInput value={item.managementNo} originalValue={(item.originals || {}).managementNo} originalMeta={(item.originalMetas || {}).managementNo} onChange={(v, orig) => ctx.updateContainer(item.id, { managementNo: v, originals: { ...(item.originals || {}), managementNo: item.originals?.managementNo !== undefined ? item.originals.managementNo : orig }, originalMetas: { ...(item.originalMetas || {}), managementNo: item.originalMetas?.managementNo !== undefined ? item.originalMetas.managementNo : `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}` } }, item.deliveryMonth, 'yoshii', '管理番号')} className="text-center font-normal" /></td>
                                    <td className={`p-0.5 ${['出港済', '出荷済み', '納品完了'].includes(item.status) ? 'bg-green-200 print-bg-green' : ''}`}><DynamicSelect value={item.status} originalValue={(item.originals || {}).status} originalMeta={(item.originalMetas || {}).status} onChange={(val, cat, orig) => ctx.handleSelectChange(item.id, 'status', true, 'yoshii', true, '進行状況')(val, cat, orig)} category="statuses" options={ctx.masterData.common.statuses} /></td>
                                    <td className="p-0.5"><LocalInput value={item.containerNo} originalValue={(item.originals || {}).containerNo} originalMeta={(item.originalMetas || {}).containerNo} onChange={(v, orig) => ctx.updateContainer(item.id, { containerNo: v, originals: { ...(item.originals || {}), containerNo: item.originals?.containerNo !== undefined ? item.originals.containerNo : orig }, originalMetas: { ...(item.originalMetas || {}), containerNo: item.originalMetas?.containerNo !== undefined ? item.originalMetas.containerNo : `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}` } }, item.deliveryMonth, 'yoshii', 'コンテナNO.')} className="text-center font-normal" /></td>
                                    
                                    <td className="p-0.5 readonly-cell text-center align-middle font-normal">
                                        {cModels.map(m => (
                                            <div key={m} className="h-5 flex items-center justify-center border-b last:border-b-0 border-gray-200 py-0 text-xs font-normal">{m}</div>
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
                                                        <input 
                                                            type="text" 
                                                            maxLength={2} 
                                                            value={parts.outerBox || ''} 
                                                            onChange={e => handlePartsChange(item.id, m, 'outerBox', e.target.value, parts.outerBox || '')}
                                                            disabled={ctx.authUser && !ctx.authUser.canEdit}
                                                            className={`spare-part-input font-normal ${ctx.isChangeTrackingMode && origVal !== undefined && String(origVal) !== String(parts.outerBox || '') ? 'is-changed-cell' : ''}`} 
                                                            placeholder="0"
                                                        />
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
                                                        <input 
                                                            type="text" 
                                                            maxLength={2} 
                                                            value={parts.innerBox || ''} 
                                                            onChange={e => handlePartsChange(item.id, m, 'innerBox', e.target.value, parts.innerBox || '')}
                                                            disabled={ctx.authUser && !ctx.authUser.canEdit}
                                                            className={`spare-part-input font-normal ${ctx.isChangeTrackingMode && origVal !== undefined && String(origVal) !== String(parts.innerBox || '') ? 'is-changed-cell' : ''}`} 
                                                            placeholder="0"
                                                        />
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
                                                        <input 
                                                            type="text" 
                                                            maxLength={2} 
                                                            value={parts.label || ''} 
                                                            onChange={e => handlePartsChange(item.id, m, 'label', e.target.value, parts.label || '')}
                                                            disabled={ctx.authUser && !ctx.authUser.canEdit}
                                                            className={`spare-part-input font-normal ${ctx.isChangeTrackingMode && origVal !== undefined && String(origVal) !== String(parts.label || '') ? 'is-changed-cell' : ''}`} 
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </td>

                                    <td className="p-0.5 bg-white text-right align-middle font-normal">
                                        {cModels.map(m => {
                                            const allocVal = item.allocations[m];
                                            const origAlloc = (item.originals?.allocations || {})[m];
                                            const metaAlloc = (item.originalMetas?.allocations || {})[m];
                                            return (
                                                <div key={m} className="h-5 flex items-center justify-end border-b last:border-b-0 border-gray-200 px-0 py-0">
                                                    <LocalInput 
                                                        type="number" 
                                                        value={allocVal !== undefined && allocVal !== null ? allocVal : ''} 
                                                        originalValue={origAlloc}
                                                        originalMeta={metaAlloc}
                                                        onChange={(v, orig) => {
                                                            const newQty = v === '' ? 0 : Number(v);
                                                            const currentAllocs = item.allocations || {};
                                                            const updatedAllocs = { ...currentAllocs, [m]: newQty };

                                                            const updatedOrigs = {
                                                                ...(item.originals || {}),
                                                                allocations: {
                                                                    ...(item.originals?.allocations || {})[m] !== undefined ? (item.originals.allocations) : {},
                                                                    [m]: (item.originals?.allocations || {})[m] !== undefined ? (item.originals.allocations)[m] : (orig || '')
                                                                }
                                                            };

                                                            const updatedMetas = {
                                                                ...(item.originalMetas || {}),
                                                                allocations: {
                                                                    ...(item.originalMetas?.allocations || {})[m] !== undefined ? (item.originalMetas.allocations) : {},
                                                                    [m]: (item.originalMetas?.allocations || {})[m] !== undefined ? (item.originalMetas.allocations)[m] : `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}`
                                                                }
                                                            };

                                                            ctx.updateContainer(item.id, { allocations: updatedAllocs, originals: updatedOrigs, originalMetas: updatedMetas }, item.deliveryMonth, 'yoshii', `型式 [${m}] 割振数`);
                                                        }}
                                                        className="text-right font-normal font-mono text-xs h-[20px] pr-1 border-none bg-transparent"
                                                    />
                                                </div>
                                            );
                                        })}
                                    </td>

                                    <td className="p-1 readonly-cell text-right font-normal font-mono">{totalQty.toLocaleString()}</td>
                                    <td className="p-0.5"><DynamicSelect value={item.port} originalValue={(item.originals || {}).port} originalMeta={(item.originalMetas || {}).port} onChange={(val, cat, orig) => ctx.handleSelectChange(item.id, 'port', true, 'yoshii', false, '到着港')(val, cat, orig)} category="ports" options={ctx.masterData.yoshii.ports} /></td>
                                    <td className="p-0.5"><LocalInput type="date" value={item.etd} originalValue={(item.originals || {}).etd} originalMeta={(item.originalMetas || {}).etd} onChange={(v, orig) => ctx.updateContainer(item.id, { etd: v, originals: { ...(item.originals || {}), etd: item.originals?.etd !== undefined ? item.originals.etd : orig }, originalMetas: { ...(item.originalMetas || {}), etd: item.originalMetas?.etd !== undefined ? item.originalMetas.etd : `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}` } }, item.deliveryMonth, 'yoshii', 'ETD')} /></td>
                                    <td className="p-0.5"><LocalInput type="date" value={item.eta} originalValue={(item.originals || {}).eta} originalMeta={(item.originalMetas || {}).eta} refDate={item.etd} onChange={(v, orig) => ctx.updateContainer(item.id, { eta: v, originals: { ...(item.originals || {}), eta: item.originals?.eta !== undefined ? item.originals.eta : orig }, originalMetas: { ...(item.originalMetas || {}), eta: item.originalMetas?.eta !== undefined ? item.originalMetas.eta : `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}` } }, item.deliveryMonth, 'yoshii', 'ETA')} /></td>
                                    <td className="p-0.5"><DynamicSelect value={item.containerSize} originalValue={(item.originals || {}).containerSize} originalMeta={(item.originalMetas || {}).containerSize} onChange={(val, cat, orig) => ctx.handleSelectChange(item.id, 'containerSize', true, 'yoshii', true, 'コンテナサイズ')(val, cat, orig)} category="containerSizes" options={ctx.masterData.common.containerSizes} autoDefaultValue="40HQ" /></td>
                                    
                                    <td className="p-0.5">
                                        <LocalInput 
                                            value={item.vessel} 
                                            originalValue={(item.originals || {}).vessel} 
                                            originalMeta={(item.originalMetas || {}).vessel} 
                                            onChange={(v, orig) => ctx.updateContainer(item.id, { vessel: v, originals: { ...(item.originals || {}), vessel: item.originals?.vessel !== undefined ? item.originals.vessel : orig }, originalMetas: { ...(item.originalMetas || {}), vessel: item.originalMetas?.vessel !== undefined ? item.originalMetas.vessel : `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}` } }, item.deliveryMonth, 'yoshii', '本船名')} 
                                            className="text-center font-normal text-xs" 
                                        />
                                    </td>
                                    
                                    <td className="p-0.5 notes-cell">
                                        <LocalTextArea 
                                            value={item.shipNotes} 
                                            originalValue={(item.originals || {}).shipNotes}
                                            originalMeta={(item.originalMetas || {}).shipNotes}
                                            onChange={(v, orig) => ctx.updateContainer(item.id, { shipNotes: v, originals: { ...(item.originals || {}), shipNotes: item.originals?.shipNotes !== undefined ? item.originals.shipNotes : orig }, originalMetas: { ...(item.originalMetas || {}), shipNotes: item.originalMetas?.shipNotes !== undefined ? item.originalMetas.shipNotes : `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}` } }, item.deliveryMonth, 'yoshii', '出荷日程 備考')} 
                                            isCompact={true}
                                            className="text-left text-xs font-normal whitespace-normal break-all"
                                        />
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            <ExportPrintModal 
                isOpen={exportModal.isOpen} 
                onClose={() => setExportModal({ isOpen: false, type: 'excel' })} 
                screenName="出荷日程表" 
                currentMonthStr={ctx.currentMonthStr} 
                defaultMode="current"
                onStartExport={handleExecuteExport} 
            />
        </div>
    );
};

// 4. ドレージ手配画面 (YoshiiDrayageView)
const YoshiiDrayageView = () => {
    const ctx = React.useContext(AppContext);
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
            if (mode === 'range') {
                setStartMonth(sMo);
                setEndMonth(eMo);
            }
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

            containerGroups.push({
                rows: groupRows,
                mergeColIndices
            });
        });

        const dateTag = mode === 'current' ? formatYYMM(ctx.currentMonthStr) : mode === 'year' ? `${selYr}年度` : mode === 'single' ? formatYYMM(sgMo) : `${formatYYMM(sMo)}_${formatYYMM(eMo)}`;
        const filename = `${targetVendor}_ドレージ_${dateTag}.xlsx`;

        exportToExcelAdvanced({
            title: `吉井電気 ドレージ手配 [仕入先: ${targetVendor}] [期間: ${dateTag}]`,
            headers, containerGroups, filename, isDrayage: true
        });
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
                if (currDir === 'asc') {
                    newConfig[existingIdx].direction = 'desc';
                } else {
                    newConfig.splice(existingIdx, 1);
                }
            } else {
                newConfig.push({ key, label, direction: 'asc' });
            }
        }
        setSortConfig(newConfig);
    };

    const groupedRows = [];
    let currentMonth = null;
    displayContainers.forEach(c => {
        const m = c.deliveryMonth || '未設定';
        if (m !== currentMonth) { groupedRows.push({ isDivider: true, monthLabel: m }); currentMonth = m; }
        groupedRows.push(c);
    });

    return(
        <div className="p-4 bg-white flex-grow flex flex-col h-full">
            <div className="hidden print:block font-bold text-sm text-black mb-1.5 border-b pb-1 text-left w-full">
                吉井電気 ドレージ手配 [仕入先: {ctx.selectedVendorFilter || 'ALL'}] [対象期間: {filterMode === 'current' ? `${ctx.currentMonthStr.replace('-', '/')}分` : filterMode === 'month' ? `${singleMonth.replace('-', '/')}分` : filterMode === 'year' ? `${selectedYear}年度` : `${startMonth.replace('-', '/')}〜${endMonth.replace('-', '/')}`}]
            </div>
            <div className="flex justify-between items-center mb-2 no-print flex-shrink-0">
                <h2 className="text-lg font-bold">吉井電気 ドレージ手配 {ctx.selectedVendorFilter && ctx.selectedVendorFilter !== 'ALL' ? ` [仕入先: ${ctx.selectedVendorFilter}]` : ''}</h2>

                <div className="flex items-center gap-1.5 no-print">
                    <button 
                        onClick={() => setExportModal({ isOpen: true, type: 'excel' })}
                        className="px-2.5 py-1 text-xs font-bold rounded bg-emerald-700 hover:bg-emerald-800 text-white shadow transition flex items-center gap-1"
                    >
                        📊 Excel出力
                    </button>
                    <button 
                        onClick={() => setExportModal({ isOpen: true, type: 'print' })}
                        className="px-2.5 py-1 text-xs font-bold rounded bg-slate-700 hover:bg-slate-800 text-white shadow transition flex items-center gap-1"
                    >
                        🖨 印刷
                    </button>
                    <button 
                        onClick={ctx.handleStartTracking} 
                        className={`px-2.5 py-1 text-xs font-bold rounded shadow transition ${ctx.isChangeTrackingMode ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
                    >
                        {ctx.isChangeTrackingMode ? '● 変更記録中' : '変更開始'}
                    </button>
                    <button 
                        onClick={ctx.handleClearTracking} 
                        className="px-2.5 py-1 text-xs font-bold rounded bg-gray-600 hover:bg-gray-700 text-white shadow transition"
                    >
                        変更クリア
                    </button>
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

            <div className="table-container flex-grow" ref={ctx.tableContainerRef}>
                <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-gray-100 border-b-2 sticky top-0 z-20">
                        <tr className="bg-gray-100 border-b">
                            <th rowSpan="2" className="p-1 w-[60px] border-r font-bold">管理番号</th>
                            <th rowSpan="2" className="p-1 w-[58px] border-r font-bold">進行状況</th>
                            <th rowSpan="2" onClick={e => handleSortClick('containerNo', 'コンテナNO.', e)} className="p-1 w-[98px] cursor-pointer hover:bg-emerald-100 text-emerald-900 border-r font-bold">
                                コンテナNO.{getSortIndicator('containerNo', sortConfig)}
                            </th>
                            <th rowSpan="2" className="p-1 w-[125px] min-w-[120px] border-r font-bold">積載型式</th>
                            <th colSpan="3" className="p-1 bg-emerald-50 text-emerald-900 border-r text-center font-bold">補充部品 (PCS)</th>
                            <th rowSpan="2" className="p-1 w-[48px] min-w-[45px] border-r font-bold">割振数</th>
                            <th rowSpan="2" className="p-1 w-[48px] min-w-[45px] border-r font-bold">総数量</th>
                            <th rowSpan="2" onClick={e => handleSortClick('port', '到着港', e)} className="p-1 w-[54px] min-w-[50px] cursor-pointer hover:bg-emerald-100 text-emerald-900 border-r font-bold">
                                到着港{getSortIndicator('port', sortConfig)}
                            </th>
                            <th rowSpan="2" onClick={e => handleSortClick('etd', 'ETD', e)} className="p-1 w-[54px] min-w-[50px] cursor-pointer hover:bg-emerald-100 text-emerald-900 border-r font-bold">
                                ETD{getSortIndicator('etd', sortConfig)}
                            </th>
                            <th rowSpan="2" onClick={e => handleSortClick('eta', 'ETA', e)} className="p-1 w-[54px] min-w-[50px] cursor-pointer hover:bg-emerald-100 text-emerald-900 border-r font-bold">
                                ETA{getSortIndicator('eta', sortConfig)}
                            </th>
                            <th rowSpan="2" className="p-1 w-[54px] min-w-[50px] border-r font-bold">フリータイム</th>
                            <th rowSpan="2" onClick={e => handleSortClick('drayageDeliveryDateCombo', '納品日時', e)} className="p-1 w-[82px] min-w-[78px] cursor-pointer hover:bg-emerald-100 text-emerald-900 border-r font-bold" colSpan="2">
                                納品日時{getSortIndicator('drayageDeliveryDateCombo', sortConfig)}
                            </th>
                            <th rowSpan="2" onClick={e => handleSortClick('drayageDestination', '納品先', e)} className="p-1 w-[190px] min-w-[180px] cursor-pointer hover:bg-emerald-100 text-emerald-900 border-r font-bold">
                                納品先{getSortIndicator('drayageDestination', sortConfig)}
                            </th>
                            <th rowSpan="2" className="p-1 w-[110px] min-w-[100px] notes-col border-r font-bold">備考</th>
                            <th rowSpan="2" className="p-1 w-[42px] min-w-[40px] border-r font-bold">サイズ</th>
                            <th rowSpan="2" className="p-1 w-[170px] min-w-[160px] font-bold">本船名</th>
                        </tr>
                        <tr className="bg-emerald-50/70 text-emerald-800 text-[10px] font-bold border-b">
                            <th className="p-1 border-r text-center w-10 font-bold">外装箱</th>
                            <th className="p-1 border-r text-center w-10 font-bold">化粧箱</th>
                            <th className="p-1 border-r text-center w-10 font-bold">ラベル</th>
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
                                    <td className="p-1 readonly-cell text-center font-normal">{item.managementNo || '-'}</td>
                                    <td className="p-1 readonly-cell text-center font-normal">{item.status || '-'}</td>
                                    <td className="p-1 bg-gray-50 font-normal text-center">{item.containerNo || '-'}</td>
                                    
                                    <td className="p-0.5 readonly-cell text-center align-middle font-normal">
                                        {cModels.map(m => (
                                            <div key={m} className="h-5 flex items-center justify-center border-b last:border-b-0 border-gray-200 py-0 text-xs font-normal">{m}</div>
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
                                                        <input 
                                                            type="text" 
                                                            maxLength={2} 
                                                            value={parts.outerBox || ''} 
                                                            onChange={e => handlePartsChange(item.id, m, 'outerBox', e.target.value, parts.outerBox || '')}
                                                            disabled={ctx.authUser && !ctx.authUser.canEdit}
                                                            className={`spare-part-input font-normal ${ctx.isChangeTrackingMode && origVal !== undefined && String(origVal) !== String(parts.outerBox || '') ? 'is-changed-cell' : ''}`} 
                                                            placeholder="0"
                                                        />
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
                                                        <input 
                                                            type="text" 
                                                            maxLength={2} 
                                                            value={parts.innerBox || ''} 
                                                            onChange={e => handlePartsChange(item.id, m, 'innerBox', e.target.value, parts.innerBox || '')}
                                                            disabled={ctx.authUser && !ctx.authUser.canEdit}
                                                            className={`spare-part-input font-normal ${ctx.isChangeTrackingMode && origVal !== undefined && String(origVal) !== String(parts.innerBox || '') ? 'is-changed-cell' : ''}`} 
                                                            placeholder="0"
                                                        />
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
                                                        <input 
                                                            type="text" 
                                                            maxLength={2} 
                                                            value={parts.label || ''} 
                                                            onChange={e => handlePartsChange(item.id, m, 'label', e.target.value, parts.label || '')}
                                                            disabled={ctx.authUser && !ctx.authUser.canEdit}
                                                            className={`spare-part-input font-normal ${ctx.isChangeTrackingMode && origVal !== undefined && String(origVal) !== String(parts.label || '') ? 'is-changed-cell' : ''}`} 
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </td>

                                    <td className="p-0.5 readonly-cell text-right align-middle font-normal font-mono">
                                        {cModels.map(m => (
                                            <div key={m} className="h-5 flex items-center justify-end border-b last:border-b-0 border-gray-200 px-1 py-0 text-xs font-normal text-gray-700">
                                                {Number(item.allocations[m] || 0).toLocaleString()}
                                            </div>
                                        ))}
                                    </td>
                                    <td className="p-1 readonly-cell text-right font-normal font-mono">{totalQty.toLocaleString()}</td>
                                    <td className="p-1 readonly-cell text-center font-normal">{item.port || '-'}</td>
                                    <td className="p-0.5"><LocalInput type="date" value={item.etd} originalValue={(item.originals || {}).etd} originalMeta={(item.originalMetas || {}).etd} onChange={(v, orig) => ctx.updateContainer(item.id, { etd: v, originals: { ...(item.originals || {}), etd: item.originals?.etd !== undefined ? item.originals.etd : orig }, originalMetas: { ...(item.originalMetas || {}), etd: item.originalMetas?.etd !== undefined ? item.originalMetas.etd : `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}` } }, item.deliveryMonth, 'yoshii', 'ETD')} /></td>
                                    <td className="p-0.5"><LocalInput type="date" value={item.eta} originalValue={(item.originals || {}).eta} originalMeta={(item.originalMetas || {}).eta} refDate={item.etd} onChange={(v, orig) => ctx.updateContainer(item.id, { eta: v, originals: { ...(item.originals || {}), eta: item.originals?.eta !== undefined ? item.originals.eta : orig }, originalMetas: { ...(item.originalMetas || {}), eta: item.originalMetas?.eta !== undefined ? item.originalMetas.eta : `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}` } }, item.deliveryMonth, 'yoshii', 'ETA')} /></td>
                                    <td className="p-0.5"><LocalInput type="date" value={item.freeTime} originalValue={(item.originals || {}).freeTime} originalMeta={(item.originalMetas || {}).freeTime} onChange={(v, orig) => ctx.updateContainer(item.id, { freeTime: v, originals: { ...(item.originals || {}), freeTime: item.originals?.freeTime !== undefined ? item.originals.freeTime : orig }, originalMetas: { ...(item.originalMetas || {}), freeTime: item.originalMetas?.freeTime !== undefined ? item.originalMetas.freeTime : `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}` } }, item.deliveryMonth, 'yoshii', 'フリータイム')} /></td>
                                    <td className="p-0.5"><LocalInput type="date" value={item.drayageDeliveryDate} originalValue={(item.originals || {}).drayageDeliveryDate} originalMeta={(item.originalMetas || {}).drayageDeliveryDate} refDate={item.freeTime || item.eta} onChange={(v, orig) => ctx.updateContainer(item.id, { drayageDeliveryDate: v, originals: { ...(item.originals || {}), drayageDeliveryDate: item.originals?.drayageDeliveryDate !== undefined ? item.originals.drayageDeliveryDate : orig }, originalMetas: { ...(item.originalMetas || {}), drayageDeliveryDate: item.originals?.drayageDeliveryDate !== undefined ? item.originals.drayageDeliveryDate : `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}` } }, item.deliveryMonth, 'yoshii', '納品日')} /></td>
                                    <td className="p-0.5"><LocalInput type="time" value={item.drayageDeliveryTime} originalValue={(item.originals || {}).drayageDeliveryTime} originalMeta={(item.originalMetas || {}).drayageDeliveryTime} onChange={(v, orig) => ctx.updateContainer(item.id, { drayageDeliveryTime: v, originals: { ...(item.originals || {}), drayageDeliveryTime: item.originals?.drayageDeliveryTime !== undefined ? item.originals.drayageDeliveryTime : orig }, originalMetas: { ...(item.originalMetas || {}), drayageDeliveryTime: item.originalMetas?.drayageDeliveryTime !== undefined ? item.originalMetas.drayageDeliveryTime : `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}` } }, item.deliveryMonth, 'yoshii', '納品時間')} className="text-center font-normal" /></td>
                                    <td className="p-0.5 w-[190px] min-w-[180px]"><DynamicSelect value={item.drayageDestination} originalValue={(item.originals || {}).drayageDestination} originalMeta={(item.originalMetas || {}).drayageDestination} onChange={(val, cat, orig) => ctx.handleSelectChange(item.id, 'drayageDestination', true, 'yoshii', false, '納品先')(val, cat, orig)} category="destinations" options={ctx.masterData.yoshii.destinations} className="text-xs font-normal w-full text-center" /></td>
                                    <td className="p-0.5 notes-cell">
                                        <LocalTextArea 
                                            value={item.drayageNotes} 
                                            originalValue={(item.originals || {}).drayageNotes}
                                            originalMeta={(item.originalMetas || {}).drayageNotes}
                                            onChange={(v, orig) => ctx.updateContainer(item.id, { drayageNotes: v, originals: { ...(item.originals || {}), drayageNotes: item.originals?.drayageNotes !== undefined ? item.originals.drayageNotes : orig }, originalMetas: { ...(item.originalMetas || {}), drayageNotes: item.originalMetas?.drayageNotes !== undefined ? item.originalMetas.drayageNotes : `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}` } }, item.deliveryMonth, 'yoshii', '備考')} 
                                            isCompact={true}
                                            className="text-left text-xs font-normal whitespace-normal break-all"
                                        />
                                    </td>
                                    <td className="p-1 readonly-cell text-center font-normal">{item.containerSize || '-'}</td>
                                    <td className="p-0.5 readonly-cell text-center font-normal text-xs">
                                        {item.vessel || '-'}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            <ExportPrintModal 
                isOpen={exportModal.isOpen} 
                onClose={() => setExportModal({ isOpen: false, type: 'excel' })} 
                screenName="ドレージ手配" 
                currentMonthStr={ctx.currentMonthStr} 
                defaultMode="current"
                onStartExport={handleExecuteExport} 
            />
        </div>
    );
};