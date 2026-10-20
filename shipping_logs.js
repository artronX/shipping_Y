// ==========================================
// 吉井電気 製品出荷管理システム (WebVer. 115)
// 操作・接続ログ管理モジュール (shipping_logs.js 完全修復版)
// ==========================================

const LogViewModal = ({ isOpen, onClose, logs, sessions }) => {
    const [activeTab, setActiveTab] = React.useState('data_logs');

    if (!isOpen) return null;

    const currentAppVer = typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'WebVer. 115';
    const todayStr = new Date().toLocaleDateString('ja-JP');

    // 1. 権限表記の極小短縮化（「東亜全体」「GM専用」等に短縮して横幅カット）
    const formatRoleLabel = (role) => {
        if (!role) return '一般';
        if (role.includes('東亜全体')) return '東亜全体';
        if (role.includes('LDS')) return 'LDS専用';
        if (role.includes('GM')) return 'GM専用';
        if (role.includes('SLT')) return 'SLT専用';
        return role.replace(/\(.*\)/, '').trim();
    };

    // 2. 最終操作日時から「時刻のみ (HH:mm:ss)」を抽出
    const formatTimeOnly = (timeStr) => {
        if (!timeStr || timeStr === '―') return '―';
        let cleanTime = timeStr.includes('(') ? timeStr.split('(')[0].trim() : timeStr;
        const parts = cleanTime.split(' ');
        return parts.length > 1 ? parts[1] : cleanTime;
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col border border-slate-300 overflow-hidden text-xs">
                {/* ヘッダー */}
                <div className="p-3 bg-indigo-900 text-white flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <h3 className="font-bold text-sm flex items-center gap-2">⚙ システム管理ログ・接続履歴</h3>
                        <span className="bg-amber-400 text-slate-900 text-[10px] font-extrabold px-2 py-0.5 rounded font-mono">
                            {currentAppVer}
                        </span>
                    </div>
                    <button onClick={onClose} className="text-2xl font-bold hover:text-gray-300 leading-none">×</button>
                </div>

                {/* タブ切替ボタン */}
                <div className="flex bg-slate-100 border-b px-4 pt-2 gap-2 text-xs font-bold flex-shrink-0">
                    <button 
                        onClick={() => setActiveTab('data_logs')}
                        className={`px-4 py-2 rounded-t-lg transition flex items-center gap-1.5 ${activeTab === 'data_logs' ? 'bg-white border-t-2 border-indigo-600 text-indigo-900 shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
                    >
                        📝 データ操作履歴 ({logs ? logs.length : 0})
                    </button>
                    <button 
                        onClick={() => setActiveTab('access_logs')}
                        className={`px-4 py-2 rounded-t-lg transition flex items-center gap-1.5 ${activeTab === 'access_logs' ? 'bg-white border-t-2 border-indigo-600 text-indigo-900 shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
                    >
                        🔑 ログイン・接続時間履歴 ({(sessions || []).length})
                    </button>
                </div>

                {/* コンテンツエリア（横スクロール排除・table-fixed構造） */}
                <div className="p-3 overflow-y-auto flex-grow bg-white">
                    {activeTab === 'data_logs' ? (
                        <table className="w-full text-xs border-collapse table-fixed">
                            <thead className="bg-slate-100 sticky top-0 shadow-sm font-bold text-slate-700">
                                <tr className="border-b text-center">
                                    <th className="p-1.5 border w-[130px]">日時</th>
                                    <th className="p-1.5 border w-[90px]">作業者</th>
                                    <th className="p-1.5 border w-[120px]">対象シート</th>
                                    <th className="p-1.5 border w-[75px]">操作種別</th>
                                    <th className="p-1.5 border text-left pl-2">詳細内容</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(!logs || logs.length === 0) ? (
                                    <tr><td colSpan="5" className="p-4 text-center text-gray-500 font-bold">データ操作ログはまだありません。</td></tr>
                                ) : (
                                    logs.map(log => (
                                        <tr key={log.id} className="border-b hover:bg-slate-50">
                                            <td className="p-1.5 border text-center font-mono text-[11px] text-slate-600">{log.timestamp}</td>
                                            <td className="p-1.5 border text-center font-bold text-indigo-950 truncate">{log.operator || '未設定'}</td>
                                            <td className="p-1.5 border text-center font-bold text-slate-700 truncate">{log.sheetName}</td>
                                            <td className="p-1.5 border text-center">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.action === '追加' ? 'bg-blue-100 text-blue-800' : log.action === '削除' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="p-1.5 border text-left pl-2 leading-relaxed text-slate-800 truncate">{log.detail}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-xs border-collapse table-fixed">
                            <thead className="bg-slate-100 sticky top-0 shadow-sm font-bold text-slate-700">
                                <tr className="border-b text-center text-[11px]">
                                    <th className="p-1.5 border w-[75px]">作業者名</th>
                                    <th className="p-1.5 border w-[75px]">権限</th>
                                    <th className="p-1.5 border w-[70px]">Ver</th>
                                    <th className="p-1.5 border w-[90px]">IP</th>
                                    <th className="p-1.5 border w-[90px]">地域</th>
                                    <th className="p-1.5 border w-[110px]">端末</th>
                                    <th className="p-1.5 border w-[120px]">ログイン日時</th>
                                    <th className="p-1.5 border w-[65px]">最終操作</th>
                                    <th className="p-1.5 border w-[100px]">状況</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(!sessions || sessions.length === 0) ? (
                                    <tr><td colSpan="9" className="p-4 text-center text-gray-500 font-bold">接続履歴はまだありません。</td></tr>
                                ) : (
                                    sessions.map(s => {
                                        const loginDatePart = s.loginTimeStr ? s.loginTimeStr.split(' ')[0] : '';
                                        const isPastDay = loginDatePart && loginDatePart !== todayStr;
                                        
                                        // 3. 切断状況の判定・「状況」列の新設および23:59強制切断の自動補正
                                        let finalStatusText = '';
                                        let statusBadgeClass = '';

                                        if (s.logoutTimeStr) {
                                            if (s.logoutTimeStr.includes('23:59')) {
                                                finalStatusText = '23:59強制切断';
                                                statusBadgeClass = 'bg-slate-200 text-slate-700 border-slate-400';
                                            } else if (s.logoutTimeStr.includes('15分')) {
                                                finalStatusText = '15分無操作切断';
                                                statusBadgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
                                            } else {
                                                finalStatusText = '切断済';
                                                statusBadgeClass = 'bg-gray-100 text-gray-700 border-gray-300';
                                            }
                                        } else if (isPastDay) {
                                            // 前日以前で未切断のセッションは描画時に「23:59強制切断」へ補正
                                            finalStatusText = '23:59強制切断';
                                            statusBadgeClass = 'bg-slate-200 text-slate-700 border-slate-400';
                                        } else {
                                            finalStatusText = '● 接続中';
                                            statusBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 animate-pulse';
                                        }

                                        return (
                                            <tr key={s.id} className="border-b hover:bg-slate-50 text-[11px] h-[24px]">
                                                <td className="p-1 border font-bold text-indigo-950 text-center truncate">{s.operator || '未設定'}</td>
                                                <td className="p-1 border text-center text-slate-600 truncate">{formatRoleLabel(s.roleLabel)}</td>
                                                <td className="p-1 border font-mono font-bold text-amber-700 bg-amber-50/50 text-center text-[10px] truncate">{s.appVersion || currentAppVer}</td>
                                                <td className="p-1 border font-mono text-blue-700 text-center truncate">{s.ipAddress || '―'}</td>
                                                <td className="p-1 border text-center text-slate-700 truncate">{s.ipLocation || '―'}</td>
                                                <td className="p-1 border text-center text-slate-600 font-mono text-[10px] truncate">{s.deviceInfo || '―'}</td>
                                                <td className="p-1 border text-center font-mono text-emerald-800 text-[10px] truncate">{s.loginTimeStr}</td>
                                                <td className="p-1 border text-center font-mono font-bold text-slate-800">{formatTimeOnly(s.logoutTimeStr || s.lastActiveStr)}</td>
                                                <td className="p-1 border text-center">
                                                    <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border ${statusBadgeClass}`}>
                                                        {finalStatusText}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* フッター */}
                <div className="p-2.5 bg-slate-100 border-t flex justify-end flex-shrink-0">
                    <button onClick={onClose} className="bg-slate-700 hover:bg-slate-800 text-white px-5 py-1 rounded-lg text-xs font-bold shadow transition">閉じる</button>
                </div>
            </div>
        </div>
    );
};