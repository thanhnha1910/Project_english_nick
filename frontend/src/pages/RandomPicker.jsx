import { useState, useEffect, useRef, useCallback } from 'react';

const DEFAULT_SENTENCES = `You don't have to wear a suit to the event, but you might want to wear a pair of nice __________ and a conservative tie.
Life is always very __________ when you're trying to work and go to school at the same time.
I was a __________ back in high school, and I didn't have any friends.
Meeting new people is sometimes __________ if you don't know what to say and do.
It is becoming increasingly difficult to __________ in the field of language teaching.
Do you have any __________ starting next month?
Sometimes we just have to __________ many new experiences before we understand the language and culture.
I decided to rent a __________ apartment so I wouldn't have to buy so many things.
How much do you pay for __________ each month?
Do you have any __________ in your backpack for a couple more books?
Last night, I was walking home from work when it began __________. Unfortunately, I didn't have my umbrella with me.
Wow. Your suitcase is already full of shirts and shoes. What are you going to do with the __________ of your clothing?
You'd better start __________ your bags tonight so we don't have to rush out the door tomorrow.
Could you __________ some white socks from the store on your way home from work?
I'm thinking about __________ in computer science next year.
How long is your __________ to work every day?
Everyone was shocked when my brother came to the barbecue __________ in a white tuxedo. Then, we realized he came to propose to his girlfriend.
I sometimes rent a tuxedo for __________. I don't want to buy one that I will only wear once every few years.
Ashley __________ a very fun party last Friday.
We are going to hold the class __________ on September first.
James asked many girls out on dates, but they all __________.
She always makes decisions __________, so you never know what she's planning.
It __________ to ask teachers to wear a nice shirt and tie to work.
Why didn't Amanda __________ during high school?
I didn't have the __________ to ask Jessica out on a date.
Have you __________ the date of the reunion?
Who __________ buying the food and drinks for the reunion?
Since my parents had no money, I had no choice but to __________.
What is your __________?
My new job schedule has really __________ for me.
I have to __________ two hours each day to get to work.`;

export default function RandomPicker() {
    // Check local storage for saved lists first
    const getSavedLists = () => {
        try {
            const saved = localStorage.getItem('randomPickerLists');
            return saved ? JSON.parse(saved) : { "Mẫu câu mặc định": DEFAULT_SENTENCES };
        } catch (e) {
            return { "Mẫu câu mặc định": DEFAULT_SENTENCES };
        }
    };

    const [savedLists, setSavedLists] = useState(getSavedLists());
    const [currentListName, setCurrentListName] = useState("Mẫu câu mặc định");
    const [inputList, setInputList] = useState(getSavedLists()["Mẫu câu mặc định"] || DEFAULT_SENTENCES);

    // Save modal state
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [newListName, setNewListName] = useState('');
    const [items, setItems] = useState([]);
    const [currentItem, setCurrentItem] = useState(null);

    // Timer state
    const [minutesInput, setMinutesInput] = useState(5);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [isSessionActive, setIsSessionActive] = useState(false);

    // Stats
    const [pickCount, setPickCount] = useState(0);

    const timerRef = useRef(null);

    // Update items when input changes
    useEffect(() => {
        const lines = inputList.split('\n').filter(line => line.trim() !== '');
        setItems(lines);
    }, [inputList]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => clearInterval(timerRef.current);
    }, []);

    const startSession = () => {
        if (items.length === 0) {
            alert("Vui lòng nhập danh sách trước khi bắt đầu.");
            return;
        }
        setIsSessionActive(true);
        setIsRunning(true);
        setTimeLeft(minutesInput * 60);
        setPickCount(0);
        pickRandom();

        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    setIsRunning(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const stopSession = () => {
        clearInterval(timerRef.current);
        setIsRunning(false);
        setIsSessionActive(false);
        setTimeLeft(0);
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const pickRandom = useCallback(() => {
        if (items.length === 0) return;
        const randomIndex = Math.floor(Math.random() * items.length);
        setCurrentItem(items[randomIndex]);
        if (isRunning) {
            setPickCount(prev => prev + 1);
        } else if (!isSessionActive) {
            // allows preview picking without starting session
            setPickCount(prev => prev + 1);
        }
    }, [items, isRunning, isSessionActive]);

    const saveCurrentList = () => {
        if (!newListName.trim()) {
            alert("Vui lòng nhập tên danh sách!");
            return;
        }
        const updatedLists = { ...savedLists, [newListName.trim()]: inputList };
        setSavedLists(updatedLists);
        localStorage.setItem('randomPickerLists', JSON.stringify(updatedLists));
        setCurrentListName(newListName.trim());
        setNewListName('');
        setShowSaveModal(false);
    };

    const loadList = (name) => {
        if (savedLists[name]) {
            setInputList(savedLists[name]);
            setCurrentListName(name);
        }
    };

    const deleteList = (name) => {
        if (name === "Mẫu câu mặc định") {
            alert("Không thể xóa danh sách mặc định.");
            return;
        }
        if (confirm(`Bạn có chắc muốn xóa bộ "${name}"?`)) {
            const updated = { ...savedLists };
            delete updated[name];
            setSavedLists(updated);
            localStorage.setItem('randomPickerLists', JSON.stringify(updated));
            if (currentListName === name) {
                loadList("Mẫu câu mặc định");
            }
        }
    };

    return (
        <div className="page fade-in" style={{ display: 'flex', gap: '24px', height: 'calc(100vh - 100px)' }}>
            {/* Sidebar / Settings */}
            <div className="card" style={{ width: '320px', display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto', borderRight: '1px solid var(--bg-hover)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <div style={{ fontSize: '2rem' }}>⚙️</div>
                    <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Cài đặt</h2>
                </div>

                <div className="mb-4" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ marginBottom: '16px' }}>
                        <label className="text-muted" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                            Bộ sưu tập lưu trữ:
                        </label>
                        <select
                            value={currentListName}
                            onChange={(e) => loadList(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                background: 'var(--bg-card)',
                                border: '1px solid var(--bg-hover)',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--text)',
                                fontSize: '0.95rem'
                            }}
                        >
                            {Object.keys(savedLists).map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label className="text-muted" style={{ fontWeight: '500' }}>
                            Danh sách mục ({items.length}):
                        </label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => setInputList('')} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '0.8rem' }}>Dọn dẹp</button>
                            <button onClick={() => setShowSaveModal(true)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem' }}>💾 Lưu bộ mới</button>
                            {currentListName !== "Mẫu câu mặc định" && (
                                <button onClick={() => deleteList(currentListName)} style={{ background: 'none', border: 'none', color: 'var(--secondary)', cursor: 'pointer', fontSize: '0.8rem' }}>🗑 Xóa bộ này</button>
                            )}
                        </div>
                    </div>
                    <textarea
                        value={inputList}
                        onChange={(e) => setInputList(e.target.value)}
                        placeholder="Nhập danh sách, mỗi mục 1 dòng..."
                        style={{
                            width: '100%',
                            flex: 1,
                            minHeight: '200px',
                            padding: '16px',
                            background: 'var(--bg-dark)',
                            border: '1px solid var(--bg-hover)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--text)',
                            fontSize: '1rem',
                            resize: 'none',
                            fontFamily: 'monospace',
                            lineHeight: '1.5'
                        }}
                    />
                </div>

                <div className="mb-6">
                    <label className="text-muted" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                        Thời gian tập trung (phút):
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                            type="number"
                            min="1"
                            max="120"
                            value={minutesInput}
                            onChange={(e) => setMinutesInput(parseInt(e.target.value) || 1)}
                            disabled={isRunning}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                background: 'var(--bg-dark)',
                                border: '1px solid var(--bg-hover)',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--text)',
                                fontSize: '1.2rem',
                                fontWeight: 'bold',
                                textAlign: 'center'
                            }}
                        />
                        <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>Phút</span>
                    </div>
                </div>

                {!isSessionActive ? (
                    <button
                        className="btn btn-primary"
                        onClick={startSession}
                        style={{
                            width: '100%',
                            padding: '16px',
                            fontSize: '1.2rem',
                            fontWeight: 'bold',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '8px',
                            borderRadius: 'var(--radius-md)'
                        }}
                    >
                        ▶️ Bắt đầu (Start)
                    </button>
                ) : (
                    <button
                        className="btn btn-secondary"
                        onClick={stopSession}
                        style={{
                            width: '100%',
                            padding: '16px',
                            fontSize: '1.2rem',
                            fontWeight: 'bold',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '8px',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--secondary)'
                        }}
                    >
                        ⏹️ Dừng (Stop)
                    </button>
                )}

            </div>

            {/* Main Display Area */}
            <div className="card" style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                background: 'var(--bg-dark)',
                border: '2px dashed var(--bg-hover)'
            }}>

                {/* Stats / Timer Header */}
                <div style={{ position: 'absolute', top: '32px', left: '32px', right: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{
                        background: 'var(--bg-card)',
                        padding: '12px 24px',
                        borderRadius: '30px',
                        border: '1px solid var(--bg-hover)'
                    }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Số bốc/chọn: </span>
                        <strong style={{ color: 'var(--primary)', fontSize: '1.5rem' }}>{pickCount}</strong>
                    </div>

                    {isSessionActive && (
                        <div style={{
                            fontSize: '3.5rem',
                            fontWeight: 'bold',
                            fontFamily: 'monospace',
                            color: timeLeft <= 10 ? 'var(--secondary)' : 'var(--accent)',
                            textShadow: timeLeft <= 10 ? '0 0 20px rgba(244, 63, 94, 0.5)' : 'none',
                            transition: 'all 0.3s ease',
                            background: 'var(--bg-card)',
                            padding: '8px 24px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--bg-hover)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            ⏳ {formatTime(timeLeft)}
                        </div>
                    )}
                </div>

                {/* Main Content */}
                <div style={{
                    textAlign: 'center',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '100%',
                    padding: '40px'
                }}>
                    {isSessionActive && timeLeft === 0 ? (
                        <div className="slide-up" style={{
                            fontSize: '4rem',
                            fontWeight: 'bold',
                            color: 'var(--secondary)',
                            textShadow: '0 0 30px rgba(244, 63, 94, 0.5)'
                        }}>
                            ⏰ HẾT GIỜ!
                        </div>
                    ) : currentItem ? (
                        <div key={pickCount} className="slide-up" style={{
                            fontSize: currentItem.length > 100 ? '2.2rem' : currentItem.length > 50 ? '3.2rem' : '4.5rem',
                            fontWeight: 'bold',
                            color: 'var(--text)',
                            textAlign: 'center',
                            wordBreak: 'break-word',
                            maxWidth: '90%',
                            textShadow: '0 4px 30px rgba(0,0,0,0.6)',
                            lineHeight: '1.4'
                        }}>
                            {currentItem}
                        </div>
                    ) : (
                        <div style={{ fontSize: '1.5rem', color: 'var(--text-dim)', textAlign: 'center', maxWidth: '500px', lineHeight: '1.6' }}>
                            <div style={{ fontSize: '4rem', marginBottom: '20px', opacity: 0.5 }}>🎯</div>
                            Chưa có mục nào được chọn.<br />Nhấn <strong>Bắt đầu</strong> hoặc <strong>Chọn thử</strong> để bốc ngẫu nhiên.
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div style={{ position: 'absolute', bottom: '40px', display: 'flex', gap: '20px' }}>
                    <button
                        className="btn btn-primary"
                        onClick={pickRandom}
                        disabled={(!isSessionActive && items.length === 0) || (isSessionActive && timeLeft === 0)}
                        style={{
                            padding: '20px 60px',
                            fontSize: '1.8rem',
                            fontWeight: 'bold',
                            borderRadius: '50px',
                            boxShadow: '0 10px 30px rgba(99, 102, 241, 0.4)',
                            transition: 'all 0.2s',
                            transform: ((isSessionActive && timeLeft === 0)) ? 'scale(0.95)' : 'scale(1)',
                            opacity: ((isSessionActive && timeLeft === 0) || (items.length === 0 && !isSessionActive)) ? 0.5 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}
                    >
                        🎲 RERUN
                    </button>
                    {!isSessionActive && items.length > 0 && currentItem === null && (
                        <button
                            className="btn btn-accent"
                            onClick={pickRandom}
                            style={{
                                padding: '20px 40px',
                                fontSize: '1.5rem',
                                borderRadius: '50px',
                            }}
                        >
                            Chọn Thử
                        </button>
                    )}
                </div>
            </div>

            {/* Save Modal */}
            {showSaveModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="card slide-up" style={{ width: 400, background: 'var(--bg-dark)' }}>
                        <h3 className="mb-4">💾 Lưu bộ sưu tập mới</h3>
                        <div className="mb-4">
                            <label className="text-muted" style={{ display: 'block', marginBottom: '8px' }}>
                                Tên danh sách gợi nhớ (VD: Câu hỏi Part 1, Từ vựng Unit 5...):
                            </label>
                            <input
                                type="text"
                                value={newListName}
                                onChange={(e) => setNewListName(e.target.value)}
                                placeholder="Nhập tên danh sách..."
                                autoFocus
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--bg-hover)',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--text)',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>
                        <div className="flex gap-4 justify-end">
                            <button
                                className="btn btn-secondary"
                                onClick={() => {
                                    setShowSaveModal(false);
                                    setNewListName('');
                                }}
                            >
                                Hủy
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={saveCurrentList}
                                disabled={!newListName.trim()}
                            >
                                Lưu lại
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
