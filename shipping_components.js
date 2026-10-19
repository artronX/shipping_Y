// =========================================================
// shipping_components.js - 共通入力UIコンポーネント
// =========================================================

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

    const metaStr = originalMeta || `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}`;

    if (type === 'number') {
        extraClass = 'text-right ';
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
                    className={`cell-input text-center pr-6 ${className} ${changedClass}`} 
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
                    className={`cell-input text-center pr-5 ${className} ${changedClass}`} 
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
                className={className.includes('matrix-input') ? `${className} ${extraClass} ${changedClass}` : `cell-input ${extraClass} ${className} ${changedClass}`} 
                data-grid-id={dataGridId}
                placeholder={placeholder}
            />
        </div>
    );
};

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

    const metaStr = originalMeta || `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}`;

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
                className={`w-full text-xs px-1 border-none bg-transparent outline-none whitespace-normal break-all resize-y focus:bg-indigo-50 ${isCompact ? 'h-[22px] min-h-[22px] leading-[20px] py-0 overflow-hidden' : 'py-1 min-h-[36px]'} ${className} ${changedClass}`}
            />
        </div>
    );
};

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

    const metaStr = originalMeta || `${ctx.getFormattedShortDate()} ${ctx.operatorName || '未設定'}`;

    return (
        <div className={`w-full h-full ${tooltipClass}`} data-original-val={originalValue === "" ? "【消去】" : originalValue} data-original-meta={metaStr}>
            <select 
                ref={selectRef}
                value={val} onChange={handleChange} onFocus={handleFocus} onKeyDown={handleKeyDown} onMouseDown={preventRowDrag} data-grid-id={dataGridId}
                disabled={ctx.authUser && !ctx.authUser.canEdit}
                className={`cell-input text-center ${className} px-0 ${changedClass}`}
            >
                <option value=""></option>
                {(options || []).map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                <option value="__ADD_NEW__" className="font-bold text-blue-600">+ 新規追加</option>
            </select>
        </div>
    );
};