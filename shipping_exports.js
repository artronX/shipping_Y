// ==========================================
// 吉井電気 製品出荷管理システム (WebVer. 96)
// エクセル出力・印刷関係モジュール (shipping_exports.js)
// ==========================================

// 1. 簡易データ用 Excel出力関数 (計画・割振り用)
const exportToExcelSimple = ({ title, headers, rows, filename }) => {
    if (typeof ExcelJS === 'undefined') {
        alert("ExcelJSライブラリが読み込まれていません。");
        return;
    }
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('出荷管理データ');

    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D1FAE5' } };
    const fontBold = { name: 'MS PGothic', size: 9, bold: true };
    const fontNormal = { name: 'MS PGothic', size: 8.5, bold: false };
    const borderThin = {
        top: { style: 'thin', color: { argb: 'BFBFBF' } },
        left: { style: 'thin', color: { argb: 'BFBFBF' } },
        bottom: { style: 'thin', color: { argb: 'BFBFBF' } },
        right: { style: 'thin', color: { argb: 'BFBFBF' } }
    };

    // タイトル行
    const titleRow = worksheet.addRow(['', title]);
    titleRow.getCell(2).font = { name: 'MS PGothic', size: 11, bold: true };
    worksheet.addRow([]);

    // ヘッダー行
    const headerRowValues = ['', ...headers];
    const headerRow = worksheet.addRow(headerRowValues);
    headerRow.eachCell((cell, colNum) => {
        if (colNum >= 2) {
            cell.fill = headerFill;
            cell.font = fontBold;
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = borderThin;
        }
    });
    headerRow.height = 28;

    // データ行（数値セルのフォーマット補正）
    rows.forEach(r => {
        const sanitizedRow = r.map(v => (v === undefined || v === null) ? '' : String(v).startsWith('=') ? `'${v}` : v);
        const rowData = ['', ...sanitizedRow];
        const row = worksheet.addRow(rowData);
        row.eachCell((cell, colNum) => {
            if (colNum >= 2) {
                cell.font = fontNormal;
                cell.border = borderThin;
                
                if (typeof cell.value === 'number') {
                    cell.alignment = { vertical: 'middle', horizontal: 'right' };
                    cell.numFmt = '#,##0';
                } else {
                    cell.value = cell.value === undefined || cell.value === null ? '' : String(cell.value);
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                }
            }
        });
    });

    // 列幅自動調整
    worksheet.getColumn(1).width = 3;
    worksheet.getColumn(2).width = 10;
    worksheet.getColumn(3).width = 8;
    for (let i = 4; i <= headers.length + 1; i++) {
        worksheet.getColumn(i).width = 7.5;
    }

    workbook.xlsx.writeBuffer().then(buffer => {
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    });
};

// 2. セル結合対応 Excel出力関数 (出荷日程表・ドレージ用)
const exportToExcelAdvanced = ({ title, headers, containerGroups, filename, isDrayage = false }) => {
    if (typeof ExcelJS === 'undefined') {
        alert("ExcelJSライブラリが読み込まれていません。");
        return;
    }
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('出荷管理データ');

    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2EFDA' } };
    const fontBold = { name: 'MS PGothic', size: 9, bold: true };
    const fontNormal = { name: 'MS PGothic', size: 8.5, bold: false };
    const borderThin = {
        top: { style: 'thin', color: { argb: 'BFBFBF' } },
        left: { style: 'thin', color: { argb: 'BFBFBF' } },
        bottom: { style: 'thin', color: { argb: 'BFBFBF' } },
        right: { style: 'thin', color: { argb: 'BFBFBF' } }
    };

    // タイトル行
    const titleRow = worksheet.addRow(['', title]);
    titleRow.getCell(2).font = { name: 'MS PGothic', size: 11, bold: true };
    worksheet.addRow([]);

    // ヘッダー行
    const headerRowValues = ['', ...headers];
    const headerRow = worksheet.addRow(headerRowValues);
    headerRow.eachCell((cell, colNum) => {
        if (colNum >= 2) {
            cell.fill = headerFill;
            cell.font = fontBold;
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = borderThin;
        }
    });

    let currentRowIdx = 4;

    // グループごとの行出力および同一コンテナのセル結合処理
    containerGroups.forEach(grp => {
        const groupRowCount = grp.rows.length;
        const startRow = currentRowIdx;
        const endRow = startRow + groupRowCount - 1;

        grp.rows.forEach(r => {
            const sanitizedRow = r.map(v => (v === undefined || v === null) ? '' : String(v).startsWith('=') ? `'${v}` : v);
            const rowData = ['', ...sanitizedRow];
            const row = worksheet.addRow(rowData);
            row.eachCell((cell, colNum) => {
                if (colNum >= 2) {
                    cell.font = fontNormal;
                    cell.border = borderThin;
                    
                    if (typeof cell.value === 'number') {
                        cell.alignment = { vertical: 'middle', horizontal: 'right' };
                        cell.numFmt = '#,##0';
                    } else {
                        cell.value = cell.value === undefined || cell.value === null ? '' : String(cell.value);
                        cell.alignment = { vertical: 'middle', horizontal: 'center' };
                    }
                }
            });
            currentRowIdx++;
        });

        // 複数型式積載時のセル結合
        if (groupRowCount > 1) {
            grp.mergeColIndices.forEach(colIdx => {
                const excelColNum = colIdx + 1;
                worksheet.mergeCells(startRow, excelColNum, endRow, excelColNum);
            });
        }
    });

    // 列幅の指定
    if (isDrayage) {
        worksheet.getColumn(1).width = 3;
        worksheet.getColumn(2).width = 10;
        worksheet.getColumn(3).width = 10;
        worksheet.getColumn(4).width = 15;
        worksheet.getColumn(5).width = 20;
        worksheet.getColumn(6).width = 6;
        worksheet.getColumn(7).width = 6;
        worksheet.getColumn(8).width = 6;
        worksheet.getColumn(9).width = 11;
        worksheet.getColumn(10).width = 11;
        worksheet.getColumn(11).width = 8;
        worksheet.getColumn(12).width = 12;
        worksheet.getColumn(13).width = 12;
        worksheet.getColumn(14).width = 11;
        worksheet.getColumn(15).width = 12;
        worksheet.getColumn(16).width = 10;
        worksheet.getColumn(17).width = 22;
        worksheet.getColumn(18).width = 16;
        worksheet.getColumn(19).width = 9;
        worksheet.getColumn(20).width = 18;
    } else {
        worksheet.getColumn(1).width = 3;
        worksheet.getColumn(2).width = 10;
        worksheet.getColumn(3).width = 10;
        worksheet.getColumn(4).width = 15;
        worksheet.getColumn(5).width = 20;
        worksheet.getColumn(6).width = 6;
        worksheet.getColumn(7).width = 6;
        worksheet.getColumn(8).width = 6;
        worksheet.getColumn(9).width = 11;
        worksheet.getColumn(10).width = 11;
        worksheet.getColumn(11).width = 8;
        worksheet.getColumn(12).width = 12;
        worksheet.getColumn(13).width = 12;
        worksheet.getColumn(14).width = 9;
        worksheet.getColumn(15).width = 18;
        worksheet.getColumn(16).width = 16;
    }

    workbook.xlsx.writeBuffer().then(buffer => {
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    });
};

// 3. 出力・印刷設定モーダルコンポーネント
const ExportPrintModal = ({ isOpen, onClose, screenName, currentMonthStr, onStartExport, defaultMode = 'year' }) => {
    const [mode, setMode] = React.useState(defaultMode);
    const currentYearNum = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = React.useState(currentYearNum);
    const [singleMonth, setSingleMonth] = React.useState(currentMonthStr);
    const [startMonth, setStartMonth] = React.useState(currentMonthStr);
    const [endMonth, setEndMonth] = React.useState(currentMonthStr);

    if (!isOpen) return null;

    const dynamicYears = [];
    for (let i = -1; i <= 3; i++) {
        dynamicYears.push(currentYearNum + i);
    }

    const handleConfirm = () => {
        onStartExport({ mode, selectedYear, singleMonth, startMonth, endMonth });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="font-bold text-base text-slate-800">⚙ 出力・印刷設定 ({screenName})</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-lg">×</button>
                </div>

                <div className="space-y-3 text-xs">
                    <div>
                        <label className="block font-bold text-gray-700 mb-1">📅 対象期間の指定</label>
                        <div className="flex flex-col gap-2 bg-gray-50 p-2.5 rounded border">
                            <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="exportMode" 
                                    value="current" 
                                    checked={mode === 'current'} 
                                    onChange={() => setMode('current')}
                                    className="text-indigo-600"
                                />
                                <span>当月のみ ({currentMonthStr.replace('-', '/')})</span>
                            </label>

                            <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="exportMode" 
                                    value="year" 
                                    checked={mode === 'year'} 
                                    onChange={() => setMode('year')}
                                    className="text-indigo-600"
                                />
                                <span>年度指定</span>
                            </label>

                            <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="exportMode" 
                                    value="single" 
                                    checked={mode === 'single'} 
                                    onChange={() => setMode('single')}
                                    className="text-indigo-600"
                                />
                                <span>指定月のみ</span>
                            </label>

                            <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="exportMode" 
                                    value="range" 
                                    checked={mode === 'range'} 
                                    onChange={() => setMode('range')}
                                    className="text-indigo-600"
                                />
                                <span>範囲指定</span>
                            </label>
                        </div>
                    </div>

                    {mode === 'year' && (
                        <div className="bg-indigo-50/60 border border-indigo-100 p-2.5 rounded space-y-2">
                            <label className="block font-bold text-indigo-900">対象年度:</label>
                            <select 
                                value={selectedYear} 
                                onChange={e => setSelectedYear(Number(e.target.value))} 
                                className="border p-1 rounded bg-white text-xs font-bold w-full text-indigo-900"
                            >
                                {dynamicYears.map(yr => (
                                    <option key={yr} value={yr}>{yr}年度 ({yr}/04 〜 {yr+1}/03)</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {mode === 'single' && (
                        <div className="bg-indigo-50/60 border border-indigo-100 p-2.5 rounded space-y-2">
                            <label className="block font-bold text-indigo-900">対象年月:</label>
                            <input 
                                type="month" 
                                value={singleMonth} 
                                onChange={e => setSingleMonth(e.target.value)} 
                                className="border p-1 rounded bg-white text-xs font-bold w-full"
                            />
                        </div>
                    )}

                    {mode === 'range' && (
                        <div className="bg-indigo-50/60 border border-indigo-100 p-2.5 rounded space-y-2">
                            <label className="block font-bold text-indigo-900">出力年月範囲:</label>
                            <div className="flex items-center gap-2 font-bold">
                                <input 
                                    type="month" 
                                    value={startMonth} 
                                    onChange={e => setStartMonth(e.target.value)} 
                                    className="border p-1 rounded bg-white text-xs"
                                />
                                <span>〜</span>
                                <input 
                                    type="month" 
                                    value={endMonth} 
                                    onChange={e => setEndMonth(e.target.value)} 
                                    className="border p-1 rounded bg-white text-xs"
                                />
                            </div>
                        </div>
                    )}

                    <div className="text-[11px] text-gray-500 bg-amber-50 p-2 rounded border border-amber-200">
                        💡 現在ヘッダーで選択中の仕入先コードに完全連動して出力されます。
                    </div>
                </div>

                <div className="flex justify-end gap-2 border-t pt-3">
                    <button onClick={onClose} className="px-3 py-1.5 rounded bg-gray-200 hover:bg-gray-300 font-bold text-xs text-gray-700">
                        キャンセル
                    </button>
                    <button onClick={handleConfirm} className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 font-bold text-xs text-white shadow">
                        出力開始
                    </button>
                </div>
            </div>
        </div>
    );
};