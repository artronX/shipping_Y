// =========================================================
// shipping_components.js - 共通UIコンポーネントモジュール
// ★ クラス優先適用構造改修版 (保守性重視・外側CSS貫通)
// ★ JSファイル固有バージョン: _cmp001
// =========================================================

const JS_COMPONENTS_VERSION = '_cmp001';

// 【1. ローカル入力コンポーネント (LocalInput)】
const LocalInput = ({ 
    value, onChange, onEnter, onTabOut, onFocusTrigger, 
    type="text", className="", listId, dataGridId, onGridKeyDown, 
    autoFocus, onAutoFocused, refDate, placeholder="", 
    originalValue, originalMeta 
}) => {
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
                    className={`${className.includes('input-compact') ? className : `cell-input \${className}`} text-center pr-6 ${changedClass}`} 
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
                    className={`${className.includes('input-compact') ? className : `cell-input \${className}`} text-center pr-5 ${changedClass}`} 
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

    const finalInputClass = className.includes('input-compact')
        ? `${className} ${extraClass} ${changedClass}`
        : className.includes('matrix-input')
            ? `${className} ${extraClass} ${changedClass}`
            : `cell-input ${extraClass} ${className} ${changedClass}`;

    return (
        <div className={`w-full h-full ${tooltipClass}`} data-original-val={originalValue === "" ? "【消去】" : originalValue} data-original-meta={metaStr}>
            <input 
                ref={inputRef} type={currentType} list={listId} value={displayVal} 
                onChange={handleChange} onFocus={handleFocus} onBlur={handleBlur} onKeyDown={handleKeyDown}
                onMouseDown={preventRowDrag}
                disabled={ctx.authUser && !ctx.authUser.canEdit}
                className={finalInputClass} 
                data-grid-id={dataGridId}
                placeholder={placeholder}
            />
        </div>
    );
};

// 【2. ローカルテキストエリアコンポーネント (LocalTextArea)】
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

    const finalAreaClass = isCompact 
        ? `w-full text-xs px-1 border-none bg-transparent outline-none whitespace-normal break-all resize-y focus:bg-indigo-50 h-[18px] min-h-[18px] leading-[18px] py-0 overflow-hidden ${className} ${changedClass}`
        : `w-full text-xs px-1 border-none bg-transparent outline-none whitespace-normal break-all resize-y focus:bg-indigo-50 py-1 min-h-[36px] ${className} ${changedClass}`;

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
                className={finalAreaClass}
            />
        </div>
    );
};

// 【3. 動的セレクトボックスコンポーネント (DynamicSelect)】
const DynamicSelect = ({ 
    value, onChange, category, options, className="", 
    dataGridId, onGridKeyDown, onFocusTrigger, autoDefaultValue, 
    autoFocus, onAutoFocused, originalValue, originalMeta 
}) => {
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

    const finalSelectClass = className.includes('input-compact')
        ? `text-center ${className} px-0 ${changedClass}`
        : `cell-input text-center ${className} px-0 ${changedClass}`;

    return (
        <div className={`w-full h-full ${tooltipClass}`} data-original-val={originalValue === "" ? "【消去】" : originalValue} data-original-meta={metaStr}>
            <select 
                ref={selectRef}
                value={val} onChange={handleChange} onFocus={handleFocus} onKeyDown={handleKeyDown} onMouseDown={preventRowDrag} data-grid-id={dataGridId}
                disabled={ctx.authUser && !ctx.authUser.canEdit}
                className={finalSelectClass}
            >
                <option value=""></option>
                {(options || []).map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                <option value="__ADD_NEW__" className="font-bold text-blue-600">+ 新規追加</option>
            </select>
        </div>
    );
};