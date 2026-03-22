import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Sword, RotateCcw, Trash2, ListOrdered, ChevronRight, AlertCircle, Users, Trophy, ChevronDown, ChevronUp, Info, HelpCircle, LayoutList, History, AlertTriangle, X, Plus, Minus, Download, Upload } from 'lucide-react';

// --- 定数定義 ---
const ITEM_GROUPS = [
  {
    name: '武器・防具',
    color: 'border-orange-900/50 bg-orange-950/40 text-orange-400',
    items: [
      { id: 'weapon', name: '武器', short: '武' },
      { id: 'head', name: '頭防具', short: '頭' },
      { id: 'body', name: '胴防具', short: '胴' },
      { id: 'hands', name: '手防具', short: '手' },
      { id: 'legs', name: '脚防具', short: '脚' },
      { id: 'feet', name: '足防具', short: '足' },
    ]
  },
  {
    name: 'アクセサリー',
    color: 'border-cyan-900/50 bg-cyan-950/40 text-cyan-400',
    items: [
      { id: 'ear', name: '耳飾り', short: '耳' },
      { id: 'neck', name: '首飾り', short: '首' },
      { id: 'wrist', name: '腕輪', short: '腕' },
      { id: 'ring1', name: '指輪1', short: '指1' },
      { id: 'ring2', name: '指輪2', short: '指2' },
    ]
  },
  {
    name: '強化素材',
    color: 'border-purple-900/50 bg-purple-950/40 text-purple-400',
    items: [
      { id: 'coating', name: '硬化薬', short: '硬化' },
      { id: 'twine', name: '繊維', short: '繊維' },
      { id: 'solvent', name: '武器薬', short: '武薬' },
      { id: 'tome', name: 'トームストーン', short: '石' },
    ]
  }
];

const ITEM_TYPES = ITEM_GROUPS.flatMap(g => g.items);

const JOBS = [
  { group: 'タンク', color: 'text-blue-400 bg-blue-900/30 border border-blue-800/50', jobs: ['ナイト', 'ガンブレ', '戦士', '暗黒騎士'] },
  { group: 'ヒーラー', color: 'text-green-400 bg-green-900/30 border border-green-800/50', jobs: ['白魔道士', '占星術師', '学者', '賢者'] },
  { group: 'メレー', color: 'text-red-400 bg-red-900/30 border border-red-800/50', jobs: ['侍', 'モンク', '竜騎士', 'リーパー', '忍者', 'ヴァイパー'] },
  { group: 'レンジ', color: 'text-red-400 bg-red-900/30 border border-red-800/50', jobs: ['踊り子', '詩人', '機工士'] },
  { group: 'キャスター', color: 'text-red-400 bg-red-900/30 border border-red-800/50', jobs: ['黒魔道士', '赤魔道士', '召喚士', 'ピクトマンサー'] },
];

const getJobStyle = (jobName) => {
  for (const group of JOBS) {
    if (group.jobs.includes(jobName)) return group.color;
  }
  return 'text-zinc-400 bg-zinc-800 border border-zinc-700';
};

const getTextColor = (jobName) => {
  for (const group of JOBS) {
    if (group.jobs.includes(jobName)) return group.color.split(' ')[0];
  }
  return 'text-zinc-300';
};

const DEFAULT_MEMBERS = Array.from({ length: 8 }, (_, i) => ({
  id: `member-${i}`,
  name: `メンバー ${i + 1}`,
  job: '',
  wants: ITEM_TYPES.reduce((acc, item) => ({ ...acc, [item.id]: false }), {}),
  gets: ITEM_TYPES.reduce((acc, item) => ({ ...acc, [item.id]: 0 }), {}),
}));

const STORAGE_KEY = 'ff14LootDataLocal_Manager';

export default function App() {
  const [members, setMembers] = useState(DEFAULT_MEMBERS);
  const [history, setHistory] = useState([]);
  const [contentCycle, setContentCycle] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', onConfirm: null, isDangerous: false });

  // --- LocalStorage 読み込み (初回のみ) ---
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        const savedMembers = parsedData.members || [];
        const loadedMembers = savedMembers.map((m, index) => {
          const defaultMember = DEFAULT_MEMBERS[index] || DEFAULT_MEMBERS[0];
          return {
            ...m,
            id: m?.id || defaultMember.id,
            wants: { ...defaultMember.wants, ...(m?.wants || {}) },
            gets: { ...defaultMember.gets, ...(m?.gets || {}) },
          };
        });
        while (loadedMembers.length < 8) {
           loadedMembers.push(DEFAULT_MEMBERS[loadedMembers.length]);
        }
        setMembers(loadedMembers);
        setHistory(Array.isArray(parsedData.history) ? parsedData.history : []);
        setContentCycle(typeof parsedData.contentCycle === 'number' ? parsedData.contentCycle : 1);
      } catch (e) {
        console.error("ローカルデータの読み込みに失敗しました", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // --- データ更新関数 (LocalStorageへ保存) ---
  const updateData = useCallback((newMembers, newHistory, newCycle) => {
    setMembers(newMembers);
    if (newHistory !== undefined) setHistory(newHistory);
    if (newCycle !== undefined) setContentCycle(newCycle);

    // 変更をブラウザに保存
    setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
        members: newMembers, 
        history: newHistory !== undefined ? newHistory : history,
        contentCycle: newCycle !== undefined ? newCycle : contentCycle
      }));
    }, 0);
  }, [history, contentCycle]);

  // --- バックアップ機能 ---
  const handleExport = useCallback(() => {
    const data = { members, history, contentCycle };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ff14_loot_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [members, history, contentCycle]);

  const handleImport = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.members) {
          updateData(data.members, data.history || [], data.contentCycle || 1);
          alert('バックアップデータを読み込みました。');
        } else {
          alert('ファイルの形式が正しくありません。');
        }
      } catch (err) {
        alert('ファイルの読み込みに失敗しました。');
      }
    };
    reader.readAsText(file);
    e.target.value = null; // リセット
  }, [updateData]);

  // --- 優先権の動的算出 ---
  const priorityMap = useMemo(() => {
    return ITEM_TYPES.reduce((acc, item) => {
      const wanters = members.filter(m => m.wants?.[item.id]);
      const minGets = wanters.length > 0 ? Math.min(...wanters.map(m => m.gets?.[item.id] ?? 0)) : 0;
      const hasPriorityIds = new Set(wanters.filter(m => (m.gets?.[item.id] ?? 0) === minGets).map(m => m.id));
      acc[item.id] = { minGets, hasPriorityIds, wanters };
      return acc;
    }, {});
  }, [members]);

  const rankingData = useMemo(() => {
    return [...members].map(m => {
      const totalGets = Object.values(m.gets || {}).reduce((sum, val) => sum + (val || 0), 0);
      return { ...m, totalGets };
    }).sort((a, b) => b.totalGets - a.totalGets);
  }, [members]);

  const requestConfirm = useCallback((title, message, onConfirm, isDangerous = false) => {
    setModalConfig({ isOpen: true, title, message, onConfirm, isDangerous });
  }, []);
  
  const closeModal = useCallback(() => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleMemberChange = useCallback((id, field, value) => {
    const newMembers = members.map(m => m.id === id ? { ...m, [field]: value } : m);
    updateData(newMembers);
  }, [members, updateData]);

  const handleWantToggle = useCallback((memberId, itemId) => {
    const newMembers = members.map(m => {
      if (m.id === memberId) {
        return { ...m, wants: { ...m.wants, [itemId]: !m.wants?.[itemId] } };
      }
      return m;
    });
    updateData(newMembers);
  }, [members, updateData]);

  const handleGetItem = useCallback((memberId, itemId, amount) => {
    const newMembers = members.map(m => {
      if (m.id === memberId) {
        const currentGets = m.gets?.[itemId] ?? 0;
        const newGets = Math.max(0, currentGets + amount);
        return { ...m, gets: { ...m.gets, [itemId]: newGets } };
      }
      return m;
    });
    updateData(newMembers);
  }, [members, updateData]);

  const handleDistribute = useCallback((memberId, itemId) => {
    const newMembers = members.map(m => {
      if (m.id === memberId) {
        const newGets = Math.max(0, (m.gets?.[itemId] ?? 0) + 1);
        return { ...m, gets: { ...m.gets, [itemId]: newGets } };
      }
      return m;
    });
    
    const newHistoryItem = {
      id: Date.now().toString(),
      memberId,
      itemId,
      cycle: contentCycle,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const newHistory = [newHistoryItem, ...(history || [])];
    
    updateData(newMembers, newHistory);
  }, [members, history, contentCycle, updateData]);

  const handleDeleteHistory = useCallback((historyId) => {
    requestConfirm('履歴の削除', 'この履歴レコードを削除しますか？\n※取得数は自動では元に戻りません。表から手動で減らしてください。', () => {
      const newHistory = (history || []).filter(h => h.id !== historyId);
      updateData(members, newHistory);
    });
  }, [history, members, requestConfirm, updateData]);

  const handleChangeCycle = useCallback((amount) => {
    const newCycle = Math.max(1, contentCycle + amount);
    updateData(members, history, newCycle);
  }, [contentCycle, members, history, updateData]);

  const handleResetData = useCallback(() => {
    requestConfirm('全データの初期化', 'すべてのメンバー情報、取得状況、履歴を完全に初期化します。よろしいですか？', () => {
      updateData(DEFAULT_MEMBERS, [], 1);
    }, true);
  }, [requestConfirm, updateData]);

  const handleResetGets = useCallback(() => {
    requestConfirm('取得状況と履歴のリセット', '全員の「取得数」を0にし、履歴をクリアしますか？\n（名前やジョブ、希望の設定はそのまま残ります）', () => {
      const newMembers = members.map(m => ({
        ...m,
        gets: ITEM_TYPES.reduce((acc, item) => ({ ...acc, [item.id]: 0 }), {})
      }));
      updateData(newMembers, [], contentCycle);
    }, true);
  }, [members, contentCycle, requestConfirm, updateData]);

  if (!isLoaded) return null;

  const sharedProps = {
    members, handleMemberChange, handleWantToggle, handleGetItem, handleDistribute, handleDeleteHistory, rankingData, priorityMap, history, contentCycle
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans selection:bg-yellow-900/50 flex flex-col relative">
      
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-sm w-full overflow-hidden">
            <div className={`p-4 border-b flex items-center gap-2 ${modalConfig.isDangerous ? 'border-red-900/50 bg-red-950/30 text-red-400' : 'border-zinc-800 bg-zinc-950/50 text-zinc-200'}`}>
              {modalConfig.isDangerous ? <AlertTriangle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
              <h3 className="font-bold text-lg">{modalConfig.title}</h3>
            </div>
            <div className="p-5 text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {modalConfig.message}
            </div>
            <div className="p-4 bg-zinc-950/50 border-t border-zinc-800 flex justify-end gap-3">
              <button 
                onClick={closeModal}
                className="px-4 py-2 rounded-lg text-sm font-bold text-zinc-400 hover:bg-zinc-800 transition-colors"
              >
                キャンセル
              </button>
              <button 
                onClick={() => {
                  if (modalConfig.onConfirm) modalConfig.onConfirm();
                  closeModal();
                }}
                className={`px-5 py-2 rounded-lg text-sm font-bold transition-transform active:scale-95 shadow-md ${
                  modalConfig.isDangerous 
                    ? 'bg-red-600 hover:bg-red-500 text-white' 
                    : 'bg-yellow-600 hover:bg-yellow-500 text-zinc-950'
                }`}
              >
                実行する
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-zinc-900/80 border-b border-zinc-800 sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <Sword className="text-yellow-500 w-6 h-6" />
            <div>
              <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-yellow-500 via-yellow-300 to-yellow-600 bg-clip-text text-transparent leading-tight flex items-center gap-2">
                FF14 Loot Manager
                <span className="bg-zinc-800 text-zinc-400 text-[10px] px-1.5 py-0.5 rounded border border-zinc-700 font-normal tracking-wider">LOCAL</span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-zinc-500">現在の周回数:</span>
                <div className="flex items-center bg-zinc-950 rounded border border-zinc-800 overflow-hidden shadow-inner">
                  <button onClick={() => handleChangeCycle(-1)} disabled={contentCycle <= 1} className="w-6 h-5 flex items-center justify-center text-zinc-500 hover:bg-zinc-800 disabled:opacity-30"><Minus className="w-3 h-3"/></button>
                  <span className="text-xs font-bold w-12 text-center text-yellow-400 bg-zinc-900/50 py-0.5">{contentCycle} 周目</span>
                  <button onClick={() => handleChangeCycle(1)} className="w-6 h-5 flex items-center justify-center text-zinc-400 hover:bg-zinc-800"><Plus className="w-3 h-3"/></button>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto mt-2 sm:mt-0 justify-end">
            <label className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-xs sm:text-sm transition-colors text-zinc-300 hover:text-white cursor-pointer" title="バックアップデータを読み込む">
              <Upload className="w-3.5 h-3.5" /> <span className="hidden sm:inline">読込</span>
              <input type="file" accept=".json" className="hidden" onChange={handleImport} />
            </label>
            <button onClick={handleExport} className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-xs sm:text-sm transition-colors text-zinc-300 hover:text-white" title="現在のデータをPCに保存する">
              <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">保存</span>
            </button>
            <div className="w-px h-8 bg-zinc-800 hidden sm:block mx-1"></div>
            <button onClick={handleResetGets} className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-xs sm:text-sm transition-colors text-zinc-300 hover:text-white">
              <RotateCcw className="w-3.5 h-3.5" /> <span className="hidden sm:inline">取得・履歴</span>リセット
            </button>
            <button onClick={handleResetData} className="flex items-center gap-1 px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-900/50 rounded text-xs sm:text-sm transition-colors text-red-400 hover:text-red-300">
              <Trash2 className="w-3.5 h-3.5" /> 初期化
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-2 sm:p-4 max-w-7xl mx-auto w-full">
        <div className="block lg:hidden h-full">
          <MobileView {...sharedProps} />
        </div>
        <div className="hidden lg:block h-full">
          <DesktopView {...sharedProps} />
        </div>
      </main>
    </div>
  );
}

// ==========================================
// 共通コンポーネント群
// ==========================================

const DistributePanel = React.memo(({ members, handleDistribute, priorityMap }) => {
  const [dropItem, setDropItem] = useState(ITEM_TYPES[0].id);
  const [looterId, setLooterId] = useState('');

  const onConfirm = () => {
    if (!looterId) {
      alert('取得したメンバーを選択してください。');
      return;
    }
    handleDistribute(looterId, dropItem);
    setLooterId('');
  };

  const priorityData = priorityMap[dropItem] || { hasPriorityIds: new Set() };

  return (
    <div className="bg-zinc-900 border border-yellow-700/50 p-5 rounded-xl shadow-lg relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-yellow-500"></div>
      <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2 mb-4">
        <Sword className="w-5 h-5 text-yellow-500" />
        ドロップ品を分配する
      </h2>
      <div className="flex flex-col sm:flex-row items-end gap-4">
        <div className="w-full sm:flex-1">
          <label className="block text-xs text-zinc-400 mb-1.5 font-medium">1. ドロップした部位</label>
          <div className="relative">
            <select 
              value={dropItem} 
              onChange={(e) => setDropItem(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 text-zinc-200 rounded-lg p-3 appearance-none focus:border-yellow-500 focus:outline-none font-bold cursor-pointer"
            >
              {ITEM_GROUPS.map(group => (
                <optgroup key={group.name} label={group.name} className="bg-zinc-900 text-zinc-500">
                  {group.items.map(item => (
                    <option key={item.id} value={item.id} className="text-zinc-200">{item.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          </div>
        </div>
        <div className="w-full sm:flex-1">
          <label className="block text-xs text-zinc-400 mb-1.5 font-medium">2. 取得したメンバー</label>
          <div className="relative">
            <select 
              value={looterId} 
              onChange={(e) => setLooterId(e.target.value)}
              className={`w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 appearance-none focus:border-yellow-500 focus:outline-none font-bold cursor-pointer ${looterId ? getTextColor(members.find(m=>m.id===looterId)?.job) : 'text-zinc-200'}`}
            >
              <option value="" className="text-zinc-500 font-normal">メンバーを選択...</option>
              {members.map(m => {
                 const isWanted = m.wants?.[dropItem];
                 const hasPriority = priorityData.hasPriorityIds.has(m.id);
                 let suffix = "";
                 
                 if(isWanted && hasPriority) suffix = " ★候補 (優先)";
                 else if(isWanted) suffix = ` ☆後回し (取得済:${m.gets?.[dropItem] ?? 0})`;
                 
                 return (
                   <option key={m.id} value={m.id} className={`${getTextColor(m.job)} font-bold`}>
                     {m.name || '未設定'} {suffix}
                   </option>
                 )
              })}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          </div>
        </div>
        <button 
          onClick={onConfirm}
          className="w-full sm:w-auto bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-zinc-950 font-black px-8 py-3 rounded-lg transition-transform active:scale-95 shadow-md disabled:opacity-50 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-600 cursor-pointer disabled:cursor-not-allowed"
          disabled={!looterId}
        >
          分配確定
        </button>
      </div>
    </div>
  );
});

const HistoryPanel = React.memo(({ history, members, handleDeleteHistory }) => {
  const groupedHistory = useMemo(() => {
    return (history || []).reduce((acc, curr) => {
      const cycle = curr.cycle ?? 1;
      if (!acc[cycle]) acc[cycle] = [];
      acc[cycle].push(curr);
      return acc;
    }, {});
  }, [history]);

  const sortedCycles = Object.keys(groupedHistory).sort((a, b) => b - a);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-xl flex flex-col max-h-[500px]">
      <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-2 shrink-0">
        <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
          <History className="w-5 h-5 text-yellow-500" />
          分配履歴 (ログ)
        </h2>
        <span className="text-xs text-zinc-500">直近の記録</span>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
        {sortedCycles.length === 0 ? (
          <div className="text-center text-zinc-600 text-sm py-6 border border-zinc-800 border-dashed rounded-lg">
            履歴はありません
          </div>
        ) : (
          sortedCycles.map(cycle => (
            <div key={cycle} className="space-y-2">
              <h3 className="text-xs font-bold text-yellow-600/80 bg-yellow-950/20 px-2 py-1 rounded inline-block">
                {cycle} 周目
              </h3>
              <ul className="space-y-2 pl-1 border-l-2 border-zinc-800 ml-1">
                {groupedHistory[cycle].map((log) => {
                  const member = members.find(m => m.id === log.memberId);
                  const item = ITEM_TYPES.find(i => i.id === log.itemId);
                  if (!member || !item) return null;

                  return (
                    <li key={log.id} className="relative flex items-center justify-between bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/80 group">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-zinc-600 shrink-0">{log.timestamp}</span>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm ${getTextColor(member.job)} truncate max-w-[120px]`}>{member.name}</span>
                          <span className="text-xs text-zinc-500">が</span>
                          <span className="text-sm font-bold text-yellow-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-700">{item.name}</span>
                          <span className="text-xs text-zinc-500">を取得</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteHistory(log.id)}
                        className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 p-1 transition-all"
                        title="この履歴を削除"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

const RankingPanel = React.memo(({ rankingData }) => {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-xl">
      <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-yellow-500" />
        総取得数ランキング
      </h2>
      <ul className="space-y-3">
        {rankingData.map((m, idx) => {
          const lootedItems = ITEM_TYPES.filter(item => (m.gets?.[item.id] ?? 0) > 0).map(item => ({
            ...item,
            count: m.gets[item.id]
          }));

          return (
            <li key={m.id} className="flex flex-col gap-2 bg-zinc-950/50 border border-zinc-800/50 p-3 rounded-lg hover:bg-zinc-800/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`font-black w-6 text-center text-lg ${idx === 0 ? 'text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]' : idx === 1 ? 'text-zinc-300' : idx === 2 ? 'text-orange-400' : 'text-zinc-600'}`}>
                    {idx + 1}
                  </span>
                  <div>
                    <div className={`font-bold text-sm ${getTextColor(m.job)}`}>{m.name || '未設定'}</div>
                    <div className="mt-0.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${getJobStyle(m.job)}`}>{m.job || '未設定'}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-zinc-900 border border-zinc-700 text-yellow-500 px-3 py-1.5 rounded-lg text-sm font-bold shadow-inner">
                  {m.totalGets} 個
                </div>
              </div>
              {lootedItems.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1 pl-9">
                  {lootedItems.map(item => (
                    <span key={item.id} className="text-[10px] bg-zinc-900 border border-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm">
                      {item.short} <span className="text-yellow-500 font-bold">{item.count}</span>
                    </span>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
});

const LootSummaryTable = React.memo(({ members }) => {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden mt-6">
      <div className="p-4 border-b border-zinc-800 bg-zinc-950/50">
        <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
          <LayoutList className="w-5 h-5 text-yellow-500" />
          取得状況一覧表 (閲覧用)
        </h2>
        <p className="text-xs text-zinc-500 mt-1">誰がどの部位を取得済みか、全体のバランスを一覧で確認できます。</p>
      </div>
      <div className="overflow-x-auto pb-2">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-zinc-950 text-zinc-400 text-xs tracking-wider border-b border-zinc-800">
              <th className="p-3 font-medium w-40 sticky left-0 bg-zinc-950 z-20 border-r border-zinc-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]" rowSpan={2}>
                メンバー
              </th>
              {ITEM_GROUPS.map(group => (
                <th key={group.name} colSpan={group.items.length} className={`p-1.5 font-bold text-center border-r border-zinc-800/80 ${group.color}`}>
                  {group.name}
                </th>
              ))}
            </tr>
            <tr className="bg-zinc-950 text-zinc-400 text-[10px] tracking-wider border-b border-zinc-800">
              {ITEM_GROUPS.flatMap(group => group.items.map(item => (
                <th key={item.id} className="p-2 font-medium text-center min-w-[40px] border-r border-zinc-800/50">
                  <span className="text-zinc-300">{item.short}</span>
                </th>
              )))}
            </tr>
          </thead>
          <tbody className="text-sm">
            {members.map(member => (
              <tr key={member.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                <td className="p-2 align-middle sticky left-0 bg-zinc-900 z-10 border-r border-zinc-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">
                   <div className="flex items-center gap-2">
                     <span className={`font-bold text-sm ${getTextColor(member.job)} truncate max-w-[100px]`}>{member.name || '未設定'}</span>
                     <span className={`text-[10px] px-1 py-0.5 rounded ${getJobStyle(member.job)} shrink-0`}>{member.job || '未'}</span>
                   </div>
                </td>
                {ITEM_TYPES.map(item => {
                  const gets = member.gets?.[item.id] ?? 0;
                  return (
                    <td key={item.id} className="p-1 border-r border-zinc-800/30 text-center align-middle">
                      {gets > 0 ? (
                        <span className="inline-block w-6 h-6 leading-6 text-xs font-black text-yellow-950 bg-yellow-500 rounded-sm shadow-[0_0_5px_rgba(234,179,8,0.5)]">
                          {gets}
                        </span>
                      ) : (
                        <span className="text-zinc-700 text-xs">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

function HelpPanel() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl text-sm text-zinc-300 shadow-md">
      <h3 className="font-bold text-yellow-500 mb-3 flex items-center gap-2 text-base">
        <Info className="w-5 h-5" />
        ロット管理ツールの使い方
      </h3>
      <ol className="space-y-3 list-decimal list-inside pl-1">
        <li>
          <strong className="text-zinc-100">管理について：</strong>
          入力したデータはすべて、今開いている**このブラウザ内**にのみ保存されます。固定活動時は画面共有等でメンバーに見せながら操作してください。
        </li>
        <li>
          <strong className="text-zinc-100">希望の設定：</strong>
          「設定」で名前とジョブを選び、各自が欲しい部位の<span className="bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded text-xs mx-1 font-bold">希望</span>ボタンを押してONにします。
        </li>
        <li>
          <strong className="text-zinc-100">優先権の自動管理：</strong>
          <strong className="text-yellow-400 mx-1">部位ごとに独立して</strong>優先権が管理されます。希望者のうち「その部位の取得数が一番少ない人」が自動的に優先（候補）としてハイライトされます。
        </li>
        <li>
          <strong className="text-zinc-100">データのバックアップ：</strong>
          右上の「保存」ボタンから、現在のデータをPCにファイルとして保存できます。「読込」ボタンでそのファイルを読み込めば、いつでも復元可能です。
        </li>
      </ol>
    </div>
  );
}

// ==========================================
// PC用ビュー
// ==========================================
function DesktopView({ members, handleMemberChange, handleWantToggle, handleGetItem, handleDistribute, handleDeleteHistory, rankingData, priorityMap, history, contentCycle }) {
  const [selectedQueueItem, setSelectedQueueItem] = useState(ITEM_TYPES[0].id);

  const priorityData = priorityMap[selectedQueueItem] || { minGets: 0, hasPriorityIds: new Set() };
  const queueMembers = members.filter(m => m.wants?.[selectedQueueItem]);
  const highPriorityQueue = queueMembers.filter(m => priorityData.hasPriorityIds.has(m.id));
  const lowPriorityQueue = queueMembers.filter(m => !priorityData.hasPriorityIds.has(m.id));

  return (
    <div className="grid grid-cols-4 gap-6 h-full">
      <div className="col-span-1 flex flex-col gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-xl">
          <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-2">
            <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <ListOrdered className="w-5 h-5 text-yellow-500" />
              希望者リスト
            </h2>
          </div>
          
          <select 
            className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-lg p-2.5 text-sm focus:border-yellow-600 focus:outline-none mb-4 cursor-pointer"
            value={selectedQueueItem}
            onChange={(e) => setSelectedQueueItem(e.target.value)}
          >
            {ITEM_GROUPS.map(group => (
              <optgroup key={group.name} label={group.name} className="bg-zinc-900 text-zinc-500">
                {group.items.map(item => (
                  <option key={item.id} value={item.id} className="text-zinc-200">{item.name}</option>
                ))}
              </optgroup>
            ))}
          </select>

          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold text-yellow-500 mb-2 flex items-center gap-1">
                <ChevronRight className="w-4 h-4" /> 取得候補 (優先権あり)
              </h3>
              {highPriorityQueue.length > 0 ? (
                <ul className="space-y-1.5">
                  {highPriorityQueue.map(m => (
                    <li key={m.id} className="bg-yellow-950/30 border border-yellow-900/50 px-3 py-2 rounded-lg text-sm flex justify-between items-center text-yellow-200 shadow-sm">
                      <span className={`font-medium ${getTextColor(m.job)}`}>{m.name || '未設定'}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${getJobStyle(m.job)}`}>{m.job || '未設定'}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-600 px-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> 候補者なし</p>
              )}
            </div>

            <div>
              <h3 className="text-xs font-bold text-zinc-500 mb-2 flex items-center gap-1">
                <ChevronRight className="w-4 h-4" /> 後回し (取得済)
              </h3>
              {lowPriorityQueue.length > 0 ? (
                <ul className="space-y-1.5">
                  {lowPriorityQueue.map(m => (
                    <li key={m.id} className="bg-zinc-950/50 border border-zinc-800/50 px-3 py-2 rounded-lg text-sm flex justify-between items-center text-zinc-500">
                      <span className={`${getTextColor(m.job)} opacity-70`}>{m.name || '未設定'}</span>
                      <div className="flex gap-2 items-center">
                        <span className="text-[10px] text-zinc-600">取得:{m.gets?.[selectedQueueItem] ?? 0}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded opacity-50 ${getJobStyle(m.job)}`}>{m.job || '未設定'}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-700 px-2">なし</p>
              )}
            </div>
          </div>
        </div>
        
        <HistoryPanel history={history} members={members} handleDeleteHistory={handleDeleteHistory} />
      </div>

      <div className="col-span-3 flex flex-col gap-6">
        
        <div className="flex gap-6 items-stretch">
          <div className="flex-1">
            <DistributePanel members={members} handleDistribute={handleDistribute} priorityMap={priorityMap} />
          </div>
          <div className="flex-1 hidden xl:block">
            <HelpPanel />
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-zinc-800 bg-zinc-950/50">
            <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-yellow-500" />
              メンバー設定・操作テーブル
            </h2>
          </div>
          <div className="overflow-x-auto flex-1 pb-4">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-zinc-950 text-zinc-400 text-xs tracking-wider border-b border-zinc-800">
                  <th className="p-4 font-medium w-48 sticky left-0 bg-zinc-950 z-20 border-r border-zinc-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]" rowSpan={2}>
                    メンバー設定
                  </th>
                  {ITEM_GROUPS.map(group => (
                    <th key={group.name} colSpan={group.items.length} className={`p-1.5 font-bold text-center border-r border-zinc-800/80 ${group.color}`}>
                      {group.name}
                    </th>
                  ))}
                </tr>
                <tr className="bg-zinc-950 text-zinc-400 text-[10px] tracking-wider border-b border-zinc-800">
                  {ITEM_GROUPS.flatMap(group => group.items.map(item => (
                    <th key={item.id} className="p-2 font-medium text-center min-w-[70px] border-r border-zinc-800/50">
                      <div className="flex flex-col items-center">
                        <span className="text-zinc-300">{item.short}</span>
                      </div>
                    </th>
                  )))}
                </tr>
              </thead>
              <tbody className="text-sm">
                {members.map(member => (
                  <tr key={member.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors group">
                    <td className="p-3 align-top sticky left-0 bg-zinc-900 group-hover:bg-zinc-800/80 z-10 border-r border-zinc-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] transition-colors">
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-col gap-1.5">
                          <input
                            type="text"
                            value={member.name}
                            onChange={(e) => handleMemberChange(member.id, 'name', e.target.value)}
                            placeholder="名前"
                            className={`bg-zinc-950 border border-zinc-700 rounded-md px-2 py-1.5 text-sm w-full focus:border-yellow-600 focus:outline-none transition-colors font-bold ${getTextColor(member.job)}`}
                          />
                          <select
                            value={member.job}
                            onChange={(e) => handleMemberChange(member.id, 'job', e.target.value)}
                            className={`bg-zinc-950 rounded-md px-2 py-1.5 text-xs w-full focus:border-yellow-600 focus:outline-none transition-colors font-bold cursor-pointer ${getJobStyle(member.job)}`}
                          >
                            <option value="" className="text-zinc-400 bg-zinc-900">未設定</option>
                            {JOBS.map(group => (
                              <optgroup key={group.group} label={group.group} className="text-zinc-500 bg-zinc-900">
                                {group.jobs.map(job => (
                                  <option key={job} value={job} className={group.color.split(' ')[0]}>{job}</option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </div>
                      </div>
                    </td>
                    {ITEM_TYPES.map(item => {
                      const isWanted = member.wants?.[item.id] ?? false;
                      const gets = member.gets?.[item.id] ?? 0;
                      const isHighlight = isWanted && priorityMap[item.id]?.hasPriorityIds?.has(member.id);

                      return (
                        <td key={item.id} className={`p-1.5 border-r border-zinc-800/30 align-top transition-colors relative ${
                          isHighlight ? 'bg-yellow-900/10' : ''
                        }`}>
                          {isHighlight && (
                            <div className="absolute inset-0 border-[1.5px] border-yellow-600/30 pointer-events-none rounded-sm"></div>
                          )}
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="flex items-center justify-between w-full bg-zinc-950 rounded border border-zinc-800 overflow-hidden shadow-inner p-0.5">
                              <button
                                onClick={() => handleGetItem(member.id, item.id, -1)}
                                className="w-5 h-6 flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors disabled:opacity-30 disabled:hover:bg-transparent text-xs"
                                disabled={gets === 0}
                                title="取得数を減らす"
                              >
                                -
                              </button>
                              <span className={`text-xs font-bold ${gets > 0 ? 'text-yellow-400' : 'text-zinc-600'}`}>
                                {gets}
                              </span>
                              <button
                                onClick={() => handleGetItem(member.id, item.id, 1)}
                                className="w-5 h-6 flex items-center justify-center text-zinc-400 hover:text-yellow-400 hover:bg-zinc-800 transition-colors text-xs"
                                title="手動で取得数を増やす（履歴には残りません）"
                              >
                                +
                              </button>
                            </div>
                            <button
                              onClick={() => handleWantToggle(member.id, item.id)}
                              className={`w-full py-1 rounded text-[10px] font-bold border transition-all ${
                                isWanted 
                                  ? 'bg-yellow-500 text-zinc-950 border-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.2)]' 
                                  : 'bg-zinc-900 text-zinc-500 border-zinc-700 hover:border-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              希望 {isWanted && '★'}
                            </button>
                            {isHighlight && (
                              <span className="text-[9px] text-yellow-400 font-bold bg-yellow-950/80 px-1 py-0.5 rounded-sm absolute -bottom-1 border border-yellow-700/50 shadow-sm leading-none">
                                候補
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <LootSummaryTable members={members} />
          <RankingPanel rankingData={rankingData} />
        </div>
        
      </div>
    </div>
  );
}

// ==========================================
// スマホ用ビュー (タブ切り替え)
// ==========================================
function MobileView({ members, handleMemberChange, handleWantToggle, handleGetItem, handleDistribute, handleDeleteHistory, rankingData, priorityMap, history }) {
  const [activeTab, setActiveTab] = useState('distribute');
  const [expandedMemberId, setExpandedMemberId] = useState(null);

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800 shadow-sm shrink-0 overflow-x-auto snap-x">
        <button 
          onClick={() => setActiveTab('distribute')}
          className={`flex-1 min-w-[65px] snap-center py-2 text-xs font-bold rounded-md flex justify-center items-center gap-1 transition-colors ${activeTab === 'distribute' ? 'bg-yellow-500/10 text-yellow-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <ListOrdered className="w-4 h-4" /> 分配
        </button>
        <button 
          onClick={() => setActiveTab('members')}
          className={`flex-1 min-w-[65px] snap-center py-2 text-xs font-bold rounded-md flex justify-center items-center gap-1 transition-colors ${activeTab === 'members' ? 'bg-yellow-500/10 text-yellow-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <Users className="w-4 h-4" /> 設定
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex-1 min-w-[65px] snap-center py-2 text-xs font-bold rounded-md flex justify-center items-center gap-1 transition-colors ${activeTab === 'history' ? 'bg-yellow-500/10 text-yellow-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <History className="w-4 h-4" /> 履歴
        </button>
        <button 
          onClick={() => setActiveTab('summary')}
          className={`flex-1 min-w-[65px] snap-center py-2 text-xs font-bold rounded-md flex justify-center items-center gap-1 transition-colors ${activeTab === 'summary' ? 'bg-yellow-500/10 text-yellow-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <LayoutList className="w-4 h-4" /> 集計
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        {activeTab === 'distribute' && (
          <DistributePanel members={members} handleDistribute={handleDistribute} priorityMap={priorityMap} />
        )}

        {activeTab === 'members' && (
          <div className="space-y-3">
            <div className="text-xs text-zinc-500 px-1 mb-2">
              タップして各メンバーの希望部位・取得状況を編集します。
            </div>
            {members.map(member => {
              const isExpanded = expandedMemberId === member.id;
              const wantedCount = Object.values(member.wants || {}).filter(Boolean).length;
              const totalGets = Object.values(member.gets || {}).reduce((a, b) => a + (b || 0), 0);

              return (
                <div key={member.id} className={`bg-zinc-900 border rounded-xl overflow-hidden transition-colors ${isExpanded ? 'border-yellow-600/50 shadow-md' : 'border-zinc-800'}`}>
                  <div 
                    className="p-3 flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedMemberId(isExpanded ? null : member.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-bold text-base ${getTextColor(member.job)}`}>{member.name || '未設定'}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${getJobStyle(member.job)}`}>{member.job || '未設定'}</span>
                      </div>
                      <div className="flex gap-3 text-[10px] text-zinc-500">
                        <span>希望設定: <b className="text-yellow-500">{wantedCount}箇所</b></span>
                        <span>総取得: <b className="text-zinc-300">{totalGets}個</b></span>
                      </div>
                    </div>
                    <div className="text-zinc-500">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-3 pt-0 border-t border-zinc-800/50 bg-zinc-950/30">
                      <div className="flex flex-col gap-2 my-3">
                        <input
                          type="text"
                          value={member.name}
                          onChange={(e) => handleMemberChange(member.id, 'name', e.target.value)}
                          placeholder="名前"
                          className={`w-full bg-zinc-950 border border-zinc-700 rounded-md px-2 py-2 text-sm font-bold focus:border-yellow-500 ${getTextColor(member.job)}`}
                        />
                        <select
                          value={member.job}
                          onChange={(e) => handleMemberChange(member.id, 'job', e.target.value)}
                          className={`w-full bg-zinc-950 rounded-md px-2 py-2 text-sm font-bold focus:border-yellow-500 cursor-pointer ${getJobStyle(member.job)}`}
                        >
                          <option value="" className="text-zinc-400 bg-zinc-900">未設定</option>
                          {JOBS.map(group => (
                            <optgroup key={group.group} label={group.group} className="text-zinc-500 bg-zinc-900">
                              {group.jobs.map(job => (
                                <option key={job} value={job} className={group.color.split(' ')[0]}>{job}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-4 mt-4">
                        {ITEM_GROUPS.map(group => (
                          <div key={group.name} className="border border-zinc-800/80 rounded-xl overflow-hidden shadow-sm">
                            <div className={`text-xs font-bold px-3 py-1.5 ${group.color}`}>
                              {group.name}
                            </div>
                            <div className="grid grid-cols-2 gap-2 p-2 bg-zinc-900/50">
                              {group.items.map(item => {
                                const isWanted = member.wants?.[item.id] ?? false;
                                const gets = member.gets?.[item.id] ?? 0;
                                return (
                                  <div key={item.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 flex flex-col gap-2 relative">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-medium text-zinc-300">{item.name}</span>
                                      <button
                                        onClick={() => handleWantToggle(member.id, item.id)}
                                        className={`text-[10px] font-bold px-2 py-1 rounded transition-colors z-10 ${isWanted ? 'bg-yellow-500 text-zinc-950 shadow-[0_0_8px_rgba(234,179,8,0.3)]' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'}`}
                                      >
                                        希望 {isWanted && '★'}
                                      </button>
                                    </div>
                                    
                                    <div className="flex items-center justify-between bg-zinc-900 rounded border border-zinc-800">
                                      <button onClick={() => handleGetItem(member.id, item.id, -1)} disabled={gets === 0} className="w-7 h-7 flex items-center justify-center text-zinc-500 disabled:opacity-30">-</button>
                                      <span className={`text-sm w-4 text-center font-bold ${gets > 0 ? 'text-zinc-200' : 'text-zinc-600'}`}>{gets}</span>
                                      <button onClick={() => handleGetItem(member.id, item.id, 1)} className="w-7 h-7 flex items-center justify-center text-yellow-500">+</button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        {activeTab === 'history' && (
          <HistoryPanel history={history} members={members} handleDeleteHistory={handleDeleteHistory} />
        )}

        {activeTab === 'summary' && (
          <div className="flex flex-col gap-6">
            <RankingPanel rankingData={rankingData} />
            <LootSummaryTable members={members} />
          </div>
        )}

        {activeTab === 'help' && (
          <HelpPanel />
        )}

      </div>
    </div>
  );
}