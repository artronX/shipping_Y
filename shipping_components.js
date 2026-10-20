// =========================================================
// 吉井電気 製品出荷管理システム
// 共通UIコンポーネントモジュール (shipping_components.js)
// ★ JSファイル固有バージョン: _js001
// =========================================================

// 1. ローカル状態を持つテキスト入力コンポーネント (フォーカス外れ対策)
const LocalInput = React.memo(({ value, onChange, className, type = "text", placeholder, disabled, dataGridId, onKeyDown }) => {
    const [localVal, setLocalVal] = React.useState(value !== undefined && value !== null ? value : '');

    React.useEffect(() => {
        setLocalVal(value !== undefined && value !== null ? value : '');
    }, [value]);

    const handleBlur = () => {
        if (localVal !== value) {
            onChange(localVal);
        }
    };

    return (
        <input
            type={type}
            value={localVal}
            onChange={(e) => setLocalVal(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={onKeyDown}
            data-grid-id={dataGridId}
            placeholder={placeholder}
            disabled={disabled}
            className={className}
        />
    );
});

// 2. ローカル状態を持つテキストエリアコンポーネント
const LocalTextArea = React.memo(({ value, onChange, className, placeholder, disabled, rows = 2 }) => {
    const [localVal, setLocalVal] = React.useState(value !== undefined && value !== null ? value : '');

    React.useEffect(() => {
        setLocalVal(value !== undefined && value !== null ? value : '');
    }, [value]);

    const handleBlur = () => {
        if (localVal !== value) {
            onChange(localVal);
        }
    };

    return (
        <textarea
            value={localVal}
            onChange={(e) => setLocalVal(e.target.value)}
            onBlur={handleBlur}
            rows={rows}
            placeholder={placeholder}
            disabled={disabled}
            className={className}
        />
    );
});

// 3. ドロップダウン & 新規直接入力ハイブリッドコンポーネント
const DynamicSelect = React.memo(({ value, onChange, options = [], onAddNew, className, placeholder = "選択...", disabled }) => {
    const [isCustom, setIsCustom] = React.useState(false);
    const [customVal, setCustomVal] = React.useState('');

    const handleSelectChange = (e) => {
        const val = e.target.value;
        if (val === '__ADD_NEW__') {
            setIsCustom(true);
            setCustomVal('');
        } else {
            setIsCustom(false);
            onChange(val);
        }
    };

    const handleCustomSubmit = () => {
        const trimmed = customVal.trim();
        if (trimmed) {
            if (onAddNew) onAddNew(trimmed);
            onChange(trimmed);
        }
        setIsCustom(false);
    };

    if (isCustom) {
        return (
            <div className="flex gap-1 items-center w-full">
                <input
                    type="text"
                    value={customVal}
                    onChange={(e) => setCustomVal(e.target.value)}
                    placeholder="新規入力..."
                    className="border rounded px-1.5 py-0.5 text-xs w-full bg-white font-bold"
                    autoFocus
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCustomSubmit();
                        if (e.key === 'Escape') setIsCustom(false);
                    }}
                />
                <button
                    type="button"
                    onClick={handleCustomSubmit}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] px-1.5 py-0.5 rounded font-bold"
                >
                    登録
                </button>
                <button
                    type="button"
                    onClick={() => setIsCustom(false)}
                    className="bg-gray-400 hover:bg-gray-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold"
                >
                    ✕
                </button>
            </div>
        );
    }

    return (
        <select
            value={value || ''}
            onChange={handleSelectChange}
            disabled={disabled}
            className={className || "w-full border rounded px-1 py-0.5 text-xs bg-white font-bold"}
        >
            <option value="">{placeholder}</option>
            {options.map((opt, i) => (
                <option key={i} value={opt}>{opt}</option>
            ))}
            {onAddNew && <option value="__ADD_NEW__" className="font-bold text-indigo-600">+ 【新規追加】</option>}
        </select>
    );
});

// 4. 型番マスター詳細編集モーダル
const ModelEditModal = ({ isOpen, onClose, company = 'yoshii', masterData, onSaveDetails }) => {
    if (!isOpen) return null;

    const companyMaster = masterData[company] || {};
    const models = companyMaster.models || [];
    const details = companyMaster.modelDetails || {};

    const handleDetailChange = (model, field, val) => {
        onSaveDetails(company, model, field, val);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col border border-slate-200 overflow-hidden text-xs">
                <div className="p-3 bg-slate-800 text-white flex justify-between items-center font-bold">
                    <h3>⚙ 型番マスター・入数・CS才数 設定 ({company === 'yoshii' ? '吉井電気' : '日立'})</h3>
                    <button onClick={onClose} className="text-lg font-bold hover:text-gray-300">×</button>
                </div>
                <div className="p-4 overflow-y-auto flex-grow space-y-3">
                    <table className="w-full text-xs border-collapse">
                        <thead className="bg-slate-100 sticky top-0 border-b font-bold text-slate-700">
                            <tr>
                                <th className="p-2 border text-left">型番</th>
                                <th className="p-2 border text-center w-32">ケース入数 (QTY)</th>
                                <th className="p-2 border text-center w-32">CS才数 (M3/才)</th>
                                <th className="p-2 border text-left">備考・製品名</th>
                            </tr>
                        </thead>
                        <tbody>
                            {models.map((m) => {
                                const d = details[m] || {};
                                return (
                                    <tr key={m} className="border-b hover:bg-slate-50">
                                        <td className="p-1.5 border font-mono font-bold text-slate-800">{m}</td>
                                        <td className="p-1.5 border text-center">
                                            <input
                                                type="number"
                                                value={d.caseQty || ''}
                                                onChange={(e) => handleDetailChange(m, 'caseQty', e.target.value)}
                                                placeholder="例: 10"
                                                className="w-full border rounded px-2 py-0.5 text-center font-mono"
                                            />
                                        </td>
                                        <td className="p-1.5 border text-center">
                                            <input
                                                type="number"
                                                step="0.001"
                                                value={d.cbm || ''}
                                                onChange={(e) => handleDetailChange(m, 'cbm', e.target.value)}
                                                placeholder="例: 0.045"
                                                className="w-full border rounded px-2 py-0.5 text-center font-mono"
                                            />
                                        </td>
                                        <td className="p-1.5 border">
                                            <input
                                                type="text"
                                                value={d.productName || ''}
                                                onChange={(e) => handleDetailChange(m, 'productName', e.target.value)}
                                                placeholder="製品名メモ"
                                                className="w-full border rounded px-2 py-0.5"
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="p-3 bg-slate-100 border-t flex justify-end">
                    <button onClick={onClose} className="bg-slate-700 hover:bg-slate-800 text-white px-5 py-1.5 rounded font-bold shadow transition">
                        閉じる
                    </button>
                </div>
            </div>
        </div>
    );
};