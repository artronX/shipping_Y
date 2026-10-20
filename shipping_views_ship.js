// =========================================================
// 吉井電気 製品出荷管理システム
// 出荷日程画面モジュール (shipping_views_ship.js)
// ★ JSファイル固有バージョン: _js001
// =========================================================

// 1. フィルター・ソート制御コンポーネント (未定義エラー防止ガード付)
const ScheduleFilterSortControl = ({ 
    searchQuery, setSearchQuery, 
    statusFilter, setStatusFilter, 
    sortField, setSortField, 
    sortOrder, setSortOrder, 
    statuses = [] 
}) => {
    return (
        <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-2 rounded-lg border border-slate-200 text-xs font-bold no-print mb-2">
            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded px-2 py-1 shadow-sm">
                <span className="text-slate-500">🔍</span>
                <input
                    type="text"
                    value={searchQuery || ''}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="型番・PO・コンテナ検索..."
                    className="outline-none bg-transparent text-xs w-36 font-bold"
                />
                {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 font-bold ml-1">✕</button>
                )}
            </div>

            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded px-2 py-1 shadow-sm">
                <span className="text-slate-500">📌 ステータス:</span>
                <select
                    value={statusFilter || 'ALL'}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="outline-none bg-transparent text-xs font-bold cursor-pointer"
                >
                    <option value="ALL">すべて表示</option>
                    {statuses.map((st, i) => (
                        <option key={i} value={st}>{st}</option>
                    ))}
                </select>
            </div>

            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded px-2 py-1 shadow-sm">
                <span className="text-slate-500">⇅ ソート:</span>
                <select
                    value={sortField || 'etd'}
                    onChange={(e) => setSortField(e.target.value)}
                    className="outline-none bg-transparent text-xs font-bold cursor-pointer"
                >
                    <option value="etd">ETD (出港日)</option>
                    <option value="eta">ETA (入港日)</option>
                    <option value="deliveryDate">納入日</option>
                    <option value="model">型番</option>
                    <option value="po">PO番号</option>
                </select>
                <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-1.5 py-0.5 rounded font-mono text-xs font-extrabold ml-1"
                >
                    {sortOrder === 'asc' ? '▲ 昇順' : '▼ 降順'}
                </button>
            </div>
        </div>
    );
};

// 2. 出荷日程画面コンポーネント本体
const YoshiiShipView = () => {
    const { 
        containers, updateContainer, masterData, authUser, 
        selectedVendorFilter, shipScrollPosRef, logOperation, createGridNav 
    } = useContext(AppContext);

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [sortField, setSortField] = useState('etd');
    const [sortOrder, setSortOrder] = useState('asc');

    const statuses = masterData?.common?.statuses || ["未確定", "生産中", "検査待", "出港済", "出荷済み", "納品完了"];

    // フィルタリング & ソート処理
    const filteredContainers = React.useMemo(() => {
        if (!Array.isArray(containers)) return [];

        let list = containers.filter(c => c && c.company === 'yoshii');

        // ベンダー権限フィルター
        if (selectedVendorFilter && selectedVendorFilter !== 'ALL') {
            list = list.filter(c => String(c.vendor || '').toUpperCase() === String(selectedVendorFilter).toUpperCase());
        }

        // キーワード検索
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(c => 
                String(c.model || '').toLowerCase().includes(q) ||
                String(c.po || '').toLowerCase().includes(q) ||
                String(c.containerNo || '').toLowerCase().includes(q) ||
                String(c.vendor || '').toLowerCase().includes(q) ||
                String(c.destination || '').toLowerCase().includes(q)
            );
        }

        // ステータスフィルター
        if (statusFilter !== 'ALL') {
            list = list.filter(c => c.status === statusFilter);
        }

        // ソート
        return list.sort((a, b) => {
            let valA = a[sortField] || '';
            let valB = b[sortField] || '';
            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }, [containers, selectedVendorFilter, searchQuery, statusFilter, sortField, sortOrder]);

    // スクロール位置の維持
    const containerRef = useRef(null);
    useEffect(() => {
        if (containerRef.current && shipScrollPosRef && shipScrollPosRef.current) {
            containerRef.current.scrollTop = shipScrollPosRef.current;
        }
    }, []);

    const handleScroll = (e) => {
        if (shipScrollPosRef) {
            shipScrollPosRef.current = e.target.scrollTop;
        }
    };

    const handleCellChange = (id, field, value, origVal) => {
        if (authUser && !authUser.canEdit) return;
        updateContainer(id, { [field]: value });
        if (origVal !== undefined && origVal !== value) {
            logOperation('出荷日程', '更新', `${field} を変更 (${origVal} ➔ ${value})`);
        }
    };

    return (
        <div className="p-3 flex flex-col h-full bg-slate-50 text-xs">
            {/* フィルター・ソートバー */}
            <ScheduleFilterSortControl
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                sortField={sortField}
                setSortField={setSortField}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
                statuses={statuses}
            />

            {/* テーブルコンテナ */}
            <div 
                ref={containerRef}
                onScroll={handleScroll}
                className="table-container flex-grow bg-white border border-slate-300 rounded-lg shadow-inner overflow-auto"
            >
                <table className="w-full text-xs border-collapse">
                    <thead className="bg-slate-200 sticky top-0 z-10 shadow-sm font-bold text-slate-700">
                        <tr className="border-b text-center">
                            <th className="p-2 border w-12">No</th>
                            <th className="p-2 border w-24">仕入先</th>
                            <th className="p-2 border w-32">PO番号</th>
                            <th className="p-2 border w-36">型番</th>
                            <th className="p-2 border w-20">数量</th>
                            <th className="p-2 border w-24">ETD (出港)</th>
                            <th className="p-2 border w-24">ETA (入港)</th>
                            <th className="p-2 border w-28">コンテナNo</th>
                            <th className="p-2 border w-32">納入先</th>
                            <th className="p-2 border w-24">納入日</th>
                            <th className="p-2 border w-24">状況</th>
                            <th className="p-2 border">備考</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredContainers.length === 0 ? (
                            <tr>
                                <td colSpan="12" className="p-6 text-center text-slate-400 font-bold">
                                    該当する出荷日程データがありません。
                                </td>
                            </tr>
                        ) : (
                            filteredContainers.map((item, idx) => {
                                const canEdit = authUser && authUser.canEdit;
                                return (
                                    <tr key={item.id || idx} className="border-b hover:bg-slate-50 h-8">
                                        <td className="p-1 border text-center font-mono font-bold text-slate-500">{idx + 1}</td>
                                        <td className="p-1 border text-center font-bold text-indigo-900">{item.vendor || '―'}</td>
                                        <td className="p-1 border font-mono font-bold">{item.po || '―'}</td>
                                        <td className="p-1 border font-bold text-slate-800">{item.model || '―'}</td>
                                        <td className="p-1 border text-right font-mono font-bold pr-2">{item.qty || 0}</td>
                                        
                                        {/* ETD */}
                                        <td className="p-1 border text-center">
                                            <LocalInput
                                                value={item.etd || ''}
                                                onChange={(val) => handleCellChange(item.id, 'etd', val, item.etd)}
                                                disabled={!canEdit}
                                                className="w-full text-center font-mono border-none bg-transparent text-xs"
                                                placeholder="YYYY-MM-DD"
                                            />
                                        </td>

                                        {/* ETA */}
                                        <td className="p-1 border text-center">
                                            <LocalInput
                                                value={item.eta || ''}
                                                onChange={(val) => handleCellChange(item.id, 'eta', val, item.eta)}
                                                disabled={!canEdit}
                                                className="w-full text-center font-mono border-none bg-transparent text-xs"
                                                placeholder="YYYY-MM-DD"
                                            />
                                        </td>

                                        {/* コンテナNo */}
                                        <td className="p-1 border">
                                            <LocalInput
                                                value={item.containerNo || ''}
                                                onChange={(val) => handleCellChange(item.id, 'containerNo', val, item.containerNo)}
                                                disabled={!canEdit}
                                                className="w-full font-mono font-bold border-none bg-transparent text-xs"
                                                placeholder="コンテナNo"
                                            />
                                        </td>

                                        {/* 納入先 */}
                                        <td className="p-1 border">
                                            <LocalInput
                                                value={item.destination || ''}
                                                onChange={(val) => handleCellChange(item.id, 'destination', val, item.destination)}
                                                disabled={!canEdit}
                                                className="w-full font-bold border-none bg-transparent text-xs"
                                                placeholder="納入先"
                                            />
                                        </td>

                                        {/* 納入日 */}
                                        <td className="p-1 border text-center">
                                            <LocalInput
                                                value={item.deliveryDate || ''}
                                                onChange={(val) => handleCellChange(item.id, 'deliveryDate', val, item.deliveryDate)}
                                                disabled={!canEdit}
                                                className="w-full text-center font-mono border-none bg-transparent text-xs"
                                                placeholder="YYYY-MM-DD"
                                            />
                                        </td>

                                        {/* ステータス */}
                                        <td className="p-1 border text-center">
                                            <select
                                                value={item.status || '未確定'}
                                                onChange={(e) => handleCellChange(item.id, 'status', e.target.value, item.status)}
                                                disabled={!canEdit}
                                                className="w-full border-none bg-transparent text-xs font-bold cursor-pointer text-center"
                                            >
                                                {statuses.map((st, i) => (
                                                    <option key={i} value={st}>{st}</option>
                                                ))}
                                            </select>
                                        </td>

                                        {/* 備考 */}
                                        <td className="p-1 border">
                                            <LocalInput
                                                value={item.remarks || ''}
                                                onChange={(val) => handleCellChange(item.id, 'remarks', val, item.remarks)}
                                                disabled={!canEdit}
                                                className="w-full border-none bg-transparent text-xs"
                                                placeholder="備考..."
                                            />
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};