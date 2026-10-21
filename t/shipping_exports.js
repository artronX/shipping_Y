// ==========================================
// 吉井電気 製品出荷管理システム (WebVer. 97)
// Excel出力・印刷関係モジュール (shipping_exports.js)
// ==========================================

// 共通エクスポート・印刷設定モーダル (ExportPrintModal)
const ExportPrintModal = ({ isOpen, onClose, screenName, currentMonthStr, onStartExport, defaultMode = 'year' }) => {
    const [mode, setMode] = React.useState(defaultMode);
    const [selectedYear, setSelectedYear] = React.useState(2026);
    const [singleMonth, setSingleMonth] = React.useState(currentMonthStr || '2026-10');
    const [startMonth, setStartMonth] = React.useState('2026-04');
    const [endMonth, setEndMonth] = React.useState('2027-03');

    React.useEffect(() => {
        if (isOpen) {
            setMode(defaultMode);
            if (currentMonthStr) setSingleMonth(currentMonthStr);
        }
    }, [isOpen, defaultMode, currentMonthStr]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        onStartExport({
            mode,
            selectedYear: Number(selectedYear),
            singleMonth,
            startMonth,
            endMonth
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-slate-300 overflow-hidden flex flex-col">
                <div className="p-4 bg-emerald-800 text-white flex justify-between items-center">
                    <h3 className="font-bold text-sm flex items-center gap-2">
                        📊 出力・印刷の期間指定 ({screenName})
                    </h3>
                    <button onClick={onClose} className="text-xl font-bold hover:text-gray-300 leading-none">×</button>
                </div>

                <div className="p-5 space-y-4 text-xs font-bold text-slate-700">
                    <div>
                        <label className="block mb-1.5 text-gray-600">出力対象範囲の選択:</label>
                        <select 
                            value={mode} 
                            onChange={e => setMode(e.target.value)}
                            className="w-full border p-2 rounded text-sm bg-gray-50 text-emerald-900 font-bold focus:bg-white"
                        >
                            <option value="year">年度指定 (12ヶ月分)</option>
                            <option value="current">当月のみ ({currentMonthStr ? currentMonthStr.replace('-', '/') : ''})</option>
                            <option value="single">単月指定</option>
                            <option value="range">範囲指定 (開始月〜終了月)</option>
                        </select>
                    </div>

                    {mode === 'year' && (
                        <div className="bg-emerald-50 p-3 rounded border border-emerald-200">
                            <label className="block mb-1 text-emerald-900">対象年度:</label>
                            <select 
                                value={selectedYear} 
                                onChange={e => setSelectedYear(Number(e.target.value))}
                                className="w-full border p-1.5 rounded text-sm bg-white font-bold text-indigo-900"
                            >
                                <option value={2025}>2025年度 (2025/04 ～ 2026/03)</option>
                                <option value={2026}>2026年度 (2026/04 ～ 2027/03)</option>
                                <option value={2027}>2027年度 (2027/04 ～ 2028/03)</option>
                            </select>
                        </div>
                    )}

                    {mode === 'single' && (
                        <div className="bg-emerald-50 p-3 rounded border border-emerald-200">
                            <label className="block mb-1 text-emerald-900">対象月:</label>
                            <input 
                                type="month" 
                                value={singleMonth} 
                                onChange={e => setSingleMonth(e.target.value)}
                                className="w-full border p-1.5 rounded text-sm bg-white text-center font-bold"
                            />
                        </div>
                    )}

                    {mode === 'range' && (
                        <div className="bg-emerald-50 p-3 rounded border border-emerald-200 space-y-2">
                            <div>
                                <label className="block mb-0.5 text-emerald-900">開始月:</label>
                                <input 
                                    type="month" 
                                    value={startMonth} 
                                    onChange={e => setStartMonth(e.target.value)}
                                    className="w-full border p-1 rounded text-sm bg-white text-center font-bold"
                                />
                            </div>
                            <div>
                                <label className="block mb-0.5 text-emerald-900">終了月:</label>
                                <input 
                                    type="month" 
                                    value={endMonth} 
                                    onChange={e => setEndMonth(e.target.value)}
                                    className="w-full border p-1 rounded text-sm bg-white text-center font-bold"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-3 bg-gray-100 border-t flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-1.5 rounded text-xs font-bold bg-gray-200 hover:bg-gray-300 text-gray-700">
                        キャンセル
                    </button>
                    <button onClick={handleConfirm} className="px-5 py-1.5 rounded text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow">
                        実行する
                    </button>
                </div>
            </div>
        </div>
    );
};

// 汎用Excel出力関数 (exportToExcelSimple)
const exportToExcelSimple = ({ title, headers, rows, filename }) => {
    if (typeof ExcelJS === 'undefined') {
        alert("ExcelJS ライブラリが読み込まれていません。");
        return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');

    // タイトル行
    worksheet.addRow([title]);
    worksheet.mergeCells(1, 1, 1, headers.length);
    const titleCell = worksheet.getCell(1, 1);
    titleCell.font = { name: 'Meiryo', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F5132' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
    worksheet.getRow(1).height = 28;

    // 空白行
    worksheet.addRow([]);

    // ヘッダー行
    const headerRow = worksheet.addRow(headers);
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
        cell.font = { name: 'Meiryo', size: 9, bold: true, color: { argb: 'FF111827' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = {
            top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            bottom: { style: 'medium', color: { argb: 'FF9CA3AF' } },
            right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
        };
    });

    // データ行
    rows.forEach((rData) => {
        const row = worksheet.addRow(rData);
        row.height = 20;

        const isTotalRow = String(rData[2] || '').includes('月間合計') || String(rData[0] || '').includes('計画数') || String(rData[0] || '').includes('残数');

        row.eachCell((cell, colNumber) => {
            cell.font = { name: 'Meiryo', size: 9, bold: isTotalRow };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
            };

            if (isTotalRow) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
            }

            // 数値判定と右寄せ
            if (typeof cell.value === 'number') {
                cell.alignment = { vertical: 'middle', horizontal: 'right' };
                cell.numFmt = '#,##0';
            } else {
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            }
        });
    });

    // 列幅自動調整
    worksheet.columns.forEach((column) => {
        let maxLen = 10;
        column.eachCell({ includeEmpty: true }, (cell) => {
            const valStr = cell.value ? String(cell.value) : '';
            if (valStr.length > maxLen) maxLen = Math.min(valStr.length + 3, 35);
        });
        column.width = maxLen;
    });

    workbook.xlsx.writeBuffer().then((buffer) => {
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    });
};

// 高度Excel出力関数（結合・グループ化対応：出荷日程表＆ドレージ手配用）
const exportToExcelAdvanced = ({ title, headers, containerGroups, filename, isDrayage = false }) => {
    if (typeof ExcelJS === 'undefined') {
        alert("ExcelJS ライブラリが読み込まれていません。");
        return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');

    // タイトル行
    worksheet.addRow([title]);
    worksheet.mergeCells(1, 1, 1, headers.length);
    const titleCell = worksheet.getCell(1, 1);
    titleCell.font = { name: 'Meiryo', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F5132' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
    worksheet.getRow(1).height = 28;

    worksheet.addRow([]);

    // ヘッダー行
    const headerRow = worksheet.addRow(headers);
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
        cell.font = { name: 'Meiryo', size: 9, bold: true, color: { argb: 'FF111827' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = {
            top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            bottom: { style: 'medium', color: { argb: 'FF9CA3AF' } },
            right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
        };
    });

    let currentRowIdx = 4;

    containerGroups.forEach((group) => {
        const rowCount = group.rows.length;
        const startRow = currentRowIdx;

        group.rows.forEach((rData) => {
            const row = worksheet.addRow(rData);
            row.height = 20;

            row.eachCell((cell) => {
                cell.font = { name: 'Meiryo', size: 9, bold: false };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                    left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                    bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                    right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
                };

                if (typeof cell.value === 'number') {
                    cell.alignment = { vertical: 'middle', horizontal: 'right' };
                    cell.numFmt = '#,##0';
                } else {
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                }
            });
            currentRowIdx++;
        });

        // 複数型式コンテナのセル結合処理
        if (rowCount > 1 && group.mergeColIndices) {
            const endRow = startRow + rowCount - 1;
            group.mergeColIndices.forEach((colIdx) => {
                try {
                    worksheet.mergeCells(startRow, colIdx, endRow, colIdx);
                    const mergedCell = worksheet.getCell(startRow, colIdx);
                    mergedCell.alignment = { vertical: 'middle', horizontal: 'center' };
                } catch (e) { console.error("Excel merge error:", e); }
            });
        }
    });

    // 列幅自動調整
    worksheet.columns.forEach((column) => {
        let maxLen = 10;
        column.eachCell({ includeEmpty: true }, (cell) => {
            const valStr = cell.value ? String(cell.value) : '';
            if (valStr.length > maxLen) maxLen = Math.min(valStr.length + 3, 30);
        });
        column.width = maxLen;
    });

    workbook.xlsx.writeBuffer().then((buffer) => {
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    });
};