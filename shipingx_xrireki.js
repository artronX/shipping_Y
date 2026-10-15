// ==========================================
// 吉井電気 製品出荷管理システム (WebVer. 96)
// 操作・接続ログ管理モジュール (shipping_logs.js)
// ==========================================

const LogViewModal = ({ isOpen, onClose, logs, sessions }) => {
    const [activeTab, setActiveTab] = React.useState('data_logs');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col border border-slate-300 overflow-hidden">
                <div className="p-4 bg-indigo-900 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <h3 className="font-bold text-base flex items-center gap-2">⚙ システム管理ログ・接続履歴</h3>
                        <span className="bg-amber-400 text-slate-900 text-[10px] font-extrabold px-2 py-0.5 rounded font-mono">
                            {typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'WebVer. 96'}
                        </span>
                    </div>
                    <button onClick={onClose} className="text-2xl font-bold hover:text-gray-300 leading-none">×</button>
                </div>

                <div className="flex bg-slate-100 border-b px-4 pt-2 gap-2 text-xs font-bold">
                    <button 
                        onClick={() => setActiveTab('data_logs')}
                        className={`px-4 py-2 rounded-t-lg transition flex items-center gap-1.5 ${activeTab === 'data_logs' ? 'bg-white border-t-2 border-indigo-600 text-indigo-900 shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
                    >
                        📝 データ操作履歴 ({logs.length})
                    </button>
                    <button 
                        onClick={() => setActiveTab('access_logs')}
                        className={`px-4 py-2 rounded-t-lg transition flex items-center gap-1.5 ${activeTab === 'access_logs' ? 'bg-white border-t-2 border-indigo-600 text-indigo-900 shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
                    >
                        🔑 ログイン・接続時間履歴 ({(sessions || []).length})
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-grow bg-white">
                    {activeTab === 'data_logs' ? (
                        <table className="w-full text-xs border-collapse">
                            <thead className="bg-slate-100 sticky top-0 shadow-sm">
                                <tr className="border-b text-left text-slate-700">
                                    <th className="p-2 border">日時</th>
                                    <th className="p-2 border">作業者</th>
                                    <th className="p-2 border">対象シート</th>
                                    <th className="p-2 border">操作種別</th>
                                    <th className="p-2 border">詳細内容</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.length === 0 ? (
                                    <tr><td colSpan="5" className="p-4 text-center text-gray-500 font-bold">データ操作ログはまだありません。</td></tr>
                                ) : (
                                    logs.map(log => (
                                        <tr key={log.id} className="border-b hover:bg-slate-50">
                                            <td className="p-2 border whitespace-nowrap text-slate-600 font-mono">{log.timestamp}</td>
                                            <td className="p-2 border font-bold text-indigo-950 whitespace-nowrap">{log.operator || '未設定'}</td>
                                            <td className="p-2 border whitespace-nowrap font-bold text-slate-700">{log.sheetName}</td>
                                            <td className="p-2 border whitespace-nowrap">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.action === '追加' ? 'bg-blue-100 text-blue-800' : log.action === '削除' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="p-2 border leading-relaxed text-slate-800">{log.detail}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-xs border-collapse">
                            <thead className="bg-slate-100 sticky top-0 shadow-sm">
                                <tr className="border-b text-left text-slate-700 text-[11px]">
                                    <th className="p-1.5 border">作業者名</th>
                                    <th className="p-1.5 border">権限・グループ</th>
                                    <th className="p-1.5 border">アプリVer</th>
                                    <th className="p-1.5 border">IPアドレス</th>
                                    <th className="p-1.5 border">接続元地域</th>
                                    <th className="p-1.5 border">端末・環境</th>
                                    <th className="p-1.5 border">ログイン日時</th>
                                    <th className="p-1.5 border">最終操作日時</th>
                                    <th className="p-1.5 border text-center min-w-[130px]">接続状況</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(!sessions || sessions.length === 0) ? (
                                    <tr><td colSpan="9" className="p-4 text-center text-gray-500 font-bold">接続履歴はまだありません。</td></tr>
                                ) : (
                                    sessions.map(s => (
                                        <tr key={s.id} className="border-b hover:bg-slate-50 text-[11px]">
                                            <td className="p-1.5 border font-bold text-indigo-950 whitespace-nowrap">{s.operator || '未設定'}</td>
                                            <td className="p-1.5 border whitespace-nowrap text-slate-600 font-bold">{s.roleLabel ? s.roleLabel.replace('東亜全体 (全画面編集)', '東亜全体').replace('閲覧専用', '東亜閲覧') : '一般'}</td>
                                            <td className="p-1.5 border whitespace-nowrap font-mono font-bold text-amber-700 bg-amber-50 text-center">{s.appVersion || 'ー'}</td>
                                            <td className="p-1.5 border whitespace-nowrap font-mono text-blue-700 font-bold">{s.ipAddress || '―'}</td>
                                            <td className="p-1.5 border whitespace-nowrap text-slate-700 font-bold">{s.ipLocation || '―'}</td>
                                            <td className="p-1.5 border whitespace-nowrap text-slate-600 font-mono">{s.deviceInfo || '―'}</td>
                                            <td className="p-1.5 border whitespace-nowrap font-mono text-emerald-800 font-bold">{s.loginTimeStr}</td>
                                            <td className="p-1.5 border whitespace-nowrap font-mono text-slate-600">{s.logoutTimeStr || '― (操作中)'}</td>
                                            <td className="p-1.5 border text-center whitespace-nowrap font-mono font-bold">
                                                {(() => {
                                                    let finalLogout = s.logoutTimeStr;
                                                    if (!finalLogout && s.createdAt) {
                                                        const createdDate = new Date(s.createdAt);
                                                        const nowDate = new Date();
                                                        const diffMinutes = (nowDate.getTime() - createdDate.getTime()) / (1000 * 60);
                                                        if (createdDate.toDateString() !== nowDate.toDateString() || diffMinutes >= 15) {
                                                            finalLogout = "23:59強制切断";
                                                        }
                                                    }
                                                    return finalLogout ? (
                                                        <span className="bg-gray-100 text-gray-700 px-2 py-0