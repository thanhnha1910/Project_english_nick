import { useState, useEffect, useRef, useCallback } from 'react';
import {
    importVocabulary, getVocabulary, deleteWord, updateWord,
    getStages, createStage, updateStage, deleteStage, reviewWordBatch, getDueWords, getVocabStats
} from '../services/api';

// ============ CONSTANTS ============
const STATES = { NEW: 0, LEARNING: 1, REVIEW: 2, RELEARNING: 3 };
const STATE_LABELS = { 0: 'New', 1: 'Learning', 2: 'Review', 3: 'Relearning' };
const STATE_COLORS = { 0: '#94A3B8', 1: '#3B82F6', 2: '#10B981', 3: '#F59E0B' };
const STATE_ICONS = { 0: '🆕', 1: '📖', 2: '✅', 3: '🔄' };

const RATING_CONFIG = [
    { value: 1, label: 'Again', color: '#EF4444', bg: 'rgba(239,68,68,0.15)', icon: '🔴', desc: 'Forgot' },
    { value: 2, label: 'Hard', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', icon: '🟠', desc: 'Struggled' },
    { value: 3, label: 'Good', color: '#10B981', bg: 'rgba(16,185,129,0.15)', icon: '🟢', desc: 'Recalled' },
    { value: 4, label: 'Easy', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)', icon: '🔵', desc: 'Instant' },
];

export default function Vocabulary() {
    // Nav state
    const [mode, setMode] = useState('dashboard');
    const [words, setWords] = useState([]);
    const [stages, setStages] = useState([]);
    const [selectedStage, setSelectedStage] = useState('');
    const [dueWords, setDueWords] = useState([]);
    const [stats, setStats] = useState(null);

    // Collection creation
    const [isCreatingStage, setIsCreatingStage] = useState(false);
    const [newStageName, setNewStageName] = useState('');

    // Import
    const [jsonInput, setJsonInput] = useState('');
    const [previewWords, setPreviewWords] = useState([]);
    const [importResult, setImportResult] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef(null);

    // Session
    const [sessionWords, setSessionWords] = useState([]);
    const [sessionIndex, setSessionIndex] = useState(0);
    const [sessionResults, setSessionResults] = useState([]);
    const [showSummary, setShowSummary] = useState(false);
    const [summaryData, setSummaryData] = useState(null);

    // Flashcard
    const [isFlipped, setIsFlipped] = useState(false);
    const [swipeOffset, setSwipeOffset] = useState(0);
    const [touchStartX, setTouchStartX] = useState(null);
    const [blankAnswer, setBlankAnswer] = useState('');
    const [blankResult, setBlankResult] = useState(null); // 'correct' | 'wrong' | null
    const blankInputRef = useRef(null);
    // Flashcard mode: 'word' = show word first, 'meaning' = show meaning first (guess the word)
    const [flashcardMode, setFlashcardMode] = useState('word');

    // Matching
    const [matchPairs, setMatchPairs] = useState([]);
    const [matchSelected, setMatchSelected] = useState(null);
    const [matchedIds, setMatchedIds] = useState(new Set());
    const [matchAttempts, setMatchAttempts] = useState(0);
    const [matchWordAttempts, setMatchWordAttempts] = useState({});
    const [matchStartTime, setMatchStartTime] = useState(null);
    const [matchComplete, setMatchComplete] = useState(false);

    // ============ DATA FETCHING ============
    useEffect(() => { fetchStages(); }, []);
    useEffect(() => { fetchWords(); fetchDueWords(); fetchStats(); }, [selectedStage]);

    const fetchStages = async () => {
        try {
            const res = await getStages('vocabulary');
            setStages(res.data);
            if (res.data.length > 0 && !selectedStage) {
                setSelectedStage(res.data[0].id);
            }
        } catch (err) { console.error(err); }
    };

    const fetchWords = async () => {
        try {
            const res = await getVocabulary(selectedStage || null);
            setWords(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchDueWords = async () => {
        try {
            const res = await getDueWords(selectedStage || null);
            setDueWords(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchStats = async () => {
        try {
            const res = await getVocabStats(selectedStage || null);
            setStats(res.data);
        } catch (err) { console.error(err); }
    };

    const handleCreateStage = async () => {
        if (!newStageName.trim()) return;
        try {
            const res = await createStage({ name: newStageName.trim(), type: 'vocabulary', description: 'Vocabulary Collection', order: 0 });
            setStages(prev => [...prev, res.data]);
            setSelectedStage(res.data.id);
            setNewStageName('');
            setIsCreatingStage(false);
        } catch (err) { alert('Failed: ' + err.message); }
    };

    const handleEditStage = async () => {
        if (!selectedStage) return;
        const currentStage = stages.find(s => s.id == selectedStage);
        if (!currentStage) return;
        const newName = prompt('Nhập tên mới cho bộ từ này:', currentStage.name);
        if (!newName || newName.trim() === currentStage.name) return;
        
        try {
            const res = await updateStage(selectedStage, { name: newName.trim(), type: 'vocabulary' });
            setStages(prev => prev.map(s => s.id == selectedStage ? res.data : s));
        } catch (err) { alert('Failed: ' + err.message); }
    };

    const handleDeleteStage = async () => {
        if (!selectedStage) return;
        const currentStage = stages.find(s => s.id == selectedStage);
        if (!confirm(`Bạn có chắc muốn xóa bộ từ "${currentStage?.name}" không? Toàn bộ từ vựng bên trong sẽ không bị xóa khỏi Data gốc, nhưng bộ này sẽ mất.`)) return;
        
        try {
            await deleteStage(selectedStage);
            setStages(prev => prev.filter(s => s.id != selectedStage));
            setSelectedStage('');
        } catch (err) { alert('Failed: ' + err.message); }
    };

    // ============ TTS ============
    const cleanTextForTTS = (text) => {
        // Strip emojis, icons, and non-alphanumeric symbols (keep letters, numbers, spaces, basic punctuation)
        return text.replace(/[\u{1F000}-\u{1FFFF}|\u{2600}-\u{27BF}|\u{FE00}-\u{FEFF}|\u{1F900}-\u{1F9FF}|\u{200D}|\u{20E3}|\u{E0020}-\u{E007F}|\u{2702}-\u{27B0}|\u{FE0F}]/gu, '').trim();
    };

    const getEnglishVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        // Priority: Google > Apple > Microsoft high-quality English voices
        const preferred = [
            'Google US English', 'Google UK English Female', 'Google UK English Male',
            'Samantha', 'Daniel', 'Karen', 'Moira', 'Tessa',
            'Microsoft Zira', 'Microsoft David', 'Microsoft Mark',
        ];
        for (const name of preferred) {
            const v = voices.find(v => v.name === name);
            if (v) return v;
        }
        // Fallback: any voice whose lang starts with 'en'
        return voices.find(v => v.lang.startsWith('en')) || null;
    };

    const speakWord = (text) => {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const cleaned = cleanTextForTTS(text);
        if (!cleaned) return;
        const u = new SpeechSynthesisUtterance(cleaned);
        u.lang = 'en-US';
        u.rate = 0.9;
        const voice = getEnglishVoice();
        if (voice) u.voice = voice;
        window.speechSynthesis.speak(u);
    };

    // ============ SESSION MANAGEMENT ============
    const startSession = (wordList, targetMode) => {
        const shuffled = [...wordList].sort(() => Math.random() - 0.5);
        setSessionWords(shuffled);
        setSessionIndex(0);
        setSessionResults([]);
        setShowSummary(false);
        setSummaryData(null);
        setIsFlipped(false);
        setBlankAnswer('');
        setBlankResult(null);
        setMode(targetMode);

        if (targetMode === 'matching') {
            initMatchingGame(shuffled.slice(0, 6));
        }
        // Auto-speak first word for flashcard mode
        if (targetMode === 'flashcards' && shuffled.length > 0) {
            setTimeout(() => speakWord(shuffled[0].text), 400);
        }
    };

    const startDueReview = () => {
        if (dueWords.length === 0) return;
        startSession(dueWords, 'flashcards');
    };

    const recordResult = (wordId, rating) => {
        setSessionResults(prev => [...prev, { word_id: wordId, rating }]);
    };

    const finishSession = async (results) => {
        if (results.length === 0) return;
        try {
            const res = await reviewWordBatch(results);
            setSummaryData(res.data);
            setShowSummary(true);
            fetchWords();
            fetchDueWords();
            fetchStats();
        } catch (err) {
            console.error('Review submit failed:', err);
            setShowSummary(true);
            setSummaryData({ results: [], summary: { mastered: 0, review: 0, learning: 0, relearning: 0, total: 0 } });
        }
    };

    // ============ JSON IMPORT ============
    const handleJsonParse = () => {
        try {
            let parsed = JSON.parse(jsonInput);
            if (!Array.isArray(parsed)) parsed = [parsed];
            const valid = parsed.filter(w => w.text && w.meaning).map((w, i) => ({
                id: Date.now() + i,
                text: w.text.trim(),
                meaning: w.meaning.trim(),
                example: (w.example || '').trim(),
            }));
            if (valid.length === 0) throw new Error('No valid words found');
            setPreviewWords(valid);
        } catch (err) {
            alert('Invalid JSON: ' + err.message);
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            setJsonInput(ev.target.result);
            try {
                let parsed = JSON.parse(ev.target.result);
                if (!Array.isArray(parsed)) parsed = [parsed];
                const valid = parsed.filter(w => w.text && w.meaning).map((w, i) => ({
                    id: Date.now() + i,
                    text: w.text.trim(),
                    meaning: w.meaning.trim(),
                    example: (w.example || '').trim(),
                }));
                setPreviewWords(valid);
            } catch (err) {
                alert('Invalid JSON file: ' + err.message);
            }
        };
        reader.readAsText(file);
    };

    const handleSaveImport = async () => {
        if (previewWords.length === 0) return;
        setIsImporting(true);
        try {
            const res = await importVocabulary(previewWords, selectedStage || null);
            setImportResult(res.data);
            setPreviewWords([]);
            setJsonInput('');
            fetchWords();
            fetchStats();
            setTimeout(() => setImportResult(null), 3000);
        } catch (err) {
            setImportResult({ error: err.message });
        } finally { setIsImporting(false); }
    };

    const removePreviewWord = (id) => {
        setPreviewWords(prev => prev.filter(w => w.id !== id));
    };

    // ============ FLASHCARD HANDLERS ============
    const handleFlashcardRate = (rating) => {
        const word = sessionWords[sessionIndex];
        recordResult(word.id, rating);
        const newResults = [...sessionResults, { word_id: word.id, rating }];

        if (sessionIndex >= sessionWords.length - 1) {
            finishSession(newResults);
        } else {
            const nextIndex = sessionIndex + 1;
            setSessionIndex(nextIndex);
            setIsFlipped(false);
            // Auto-speak the next word
            setTimeout(() => speakWord(sessionWords[nextIndex].text), 300);
        }
    };

    // ============ FILL-IN-BLANK HANDLERS ============
    const currentBlankWord = sessionWords[sessionIndex];
    const blankSentence = currentBlankWord?.example
        ? currentBlankWord.example.replace(new RegExp(currentBlankWord.text, 'gi'), '___')
        : null;

    const handleBlankSubmit = () => {
        if (!blankAnswer.trim() || !currentBlankWord) return;
        const isCorrect = blankAnswer.trim().toLowerCase() === currentBlankWord.text.toLowerCase();
        setBlankResult(isCorrect ? 'correct' : 'wrong');

        const rating = isCorrect ? 3 : 1; // Good or Again
        recordResult(currentBlankWord.id, rating);

        setTimeout(() => {
            const newResults = [...sessionResults, { word_id: currentBlankWord.id, rating }];
            if (sessionIndex >= sessionWords.length - 1) {
                finishSession(newResults);
            } else {
                setSessionIndex(prev => prev + 1);
                setBlankAnswer('');
                setBlankResult(null);
                blankInputRef.current?.focus();
            }
        }, 1200);
    };

    // ============ MATCHING GAME ============
    const initMatchingGame = (wordSet) => {
        const wordTiles = wordSet.map(w => ({ id: `w-${w.id}`, wordId: w.id, content: w.text, type: 'word' }));
        const meaningTiles = wordSet.map(w => ({ id: `m-${w.id}`, wordId: w.id, content: w.meaning, type: 'meaning' }));
        const all = [...wordTiles, ...meaningTiles].sort(() => Math.random() - 0.5);
        setMatchPairs(all);
        setMatchSelected(null);
        setMatchedIds(new Set());
        setMatchAttempts(0);
        setMatchWordAttempts({});
        setMatchStartTime(Date.now());
        setMatchComplete(false);
    };

    const handleMatchClick = (tile) => {
        if (matchedIds.has(tile.wordId) && matchedIds.has(`done-${tile.id}`)) return;
        if (matchedIds.has(tile.wordId)) return;

        if (!matchSelected) {
            setMatchSelected(tile);
            return;
        }

        if (matchSelected.id === tile.id) {
            setMatchSelected(null);
            return;
        }

        setMatchAttempts(prev => prev + 1);

        if (matchSelected.wordId === tile.wordId && matchSelected.type !== tile.type) {
            // Correct match
            const newMatched = new Set(matchedIds);
            newMatched.add(tile.wordId);
            setMatchedIds(newMatched);
            setMatchSelected(null);

            // Track attempts per word
            const wa = { ...matchWordAttempts };
            wa[tile.wordId] = (wa[tile.wordId] || 0) + 1;
            setMatchWordAttempts(wa);

            // Check if game done
            const totalPairs = matchPairs.filter(p => p.type === 'word').length;
            if (newMatched.size >= totalPairs) {
                setMatchComplete(true);
                // Submit results
                const results = matchPairs
                    .filter(p => p.type === 'word')
                    .map(p => {
                        const attempts = wa[p.wordId] || 1;
                        let rating = 4; // Easy
                        if (attempts === 2) rating = 3; // Good
                        else if (attempts >= 3) rating = 1; // Again
                        return { word_id: p.wordId, rating };
                    });
                finishSession(results);
            }
        } else {
            // Wrong match — flash red
            const wrongTile = tile;
            setMatchSelected(null);
            // Track failed attempt
            const wa = { ...matchWordAttempts };
            wa[tile.wordId] = (wa[tile.wordId] || 0) + 1;
            wa[matchSelected.wordId] = (wa[matchSelected.wordId] || 0) + 1;
            setMatchWordAttempts(wa);
        }
    };

    // ============ DELETE ============
    const handleDelete = async (id) => {
        if (!confirm('Delete this word?')) return;
        try { await deleteWord(id); fetchWords(); fetchStats(); } catch (err) { console.error(err); }
    };

    const handleDeleteAll = async () => {
        if (!confirm(`Bạn có chắc chắn muốn xóa TẤT CẢ ${words.length} thẻ trong bộ này?`)) return;
        try {
            await Promise.all(words.map(w => deleteWord(w.id)));
            fetchWords();
            fetchStats();
        } catch (err) {
            console.error(err);
            alert('Lỗi khi xóa!');
        }
    };

    // ============ FORMAT HELPERS ============
    const formatInterval = (days) => {
        if (days < 0.01) return 'now';
        if (days < 1/24) return `${Math.round(days * 24 * 60)}m`;
        if (days < 1) return `${Math.round(days * 24)}h`;
        if (days < 30) return `${Math.round(days)}d`;
        return `${Math.round(days / 30)}mo`;
    };

    const TABS = [
        { id: 'dashboard', icon: '📊', label: 'Dashboard' },
        { id: 'flashcards', icon: '🧠', label: 'Flashcards' },
        { id: 'fillin', icon: '✍️', label: 'Fill-in-Blank' },
        { id: 'matching', icon: '🔗', label: 'Matching' },
        { id: 'import', icon: '📥', label: 'Import' },
        { id: 'list', icon: '📚', label: 'All Words' },
    ];

    // ============ RENDER ============
    return (
        <div className="vm-container">
            {/* HEADER */}
            <header className="vm-header">
                <h1 className="vm-title">Vocab<span>Master</span></h1>
                <p className="vm-subtitle">FSRS-Powered Learning • Anki-style Scheduling</p>

                <div className="vm-collection-bar">
                    <div className="vm-collection-select">
                        <span className="vm-collection-label">COLLECTION</span>
                        <select value={selectedStage} onChange={e => setSelectedStage(e.target.value)}>
                            <option value="">All Words</option>
                            {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    {selectedStage && (
                        <>
                            <button className="vm-btn-circle" style={{ background: 'transparent', color: 'var(--text-muted)' }} onClick={handleEditStage} title="Rename Collection">✏️</button>
                            <button className="vm-btn-circle" style={{ background: 'transparent', color: 'var(--text-muted)' }} onClick={handleDeleteStage} title="Delete Collection">🗑️</button>
                        </>
                    )}
                    <button className="vm-btn-circle" onClick={() => { setIsCreatingStage(!isCreatingStage); setNewStageName(''); }} title="New Collection">+</button>

                    {isCreatingStage && (
                        <div className="vm-create-popup fade-in">
                            <h3>📅 New Collection</h3>
                            <div className="vm-create-row">
                                <input value={newStageName} onChange={e => setNewStageName(e.target.value)} placeholder="Tên bài học (VD: Bài 1)..." autoFocus />
                                <button className="vm-btn-primary" onClick={handleCreateStage}>Create</button>
                                <button className="vm-btn-ghost" onClick={() => setIsCreatingStage(false)}>✕</button>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* DUE BANNER */}
            {dueWords.length > 0 && mode !== 'flashcards' && (
                <div className="vm-due-banner" onClick={startDueReview}>
                    <span className="vm-due-pulse" />
                    <span>🔴 <strong>{dueWords.length}</strong> words due for review — they'll slip from memory!</span>
                    <button className="vm-btn-review">Start Review →</button>
                </div>
            )}

            {/* IMPORT FEEDBACK */}
            {importResult && (
                <div className={`vm-toast ${importResult.error ? 'error' : 'success'}`}>
                    {importResult.error ? `⚠️ ${importResult.error}` : `✅ Imported ${importResult.imported} words`}
                    <button onClick={() => setImportResult(null)}>✕</button>
                </div>
            )}

            {/* TABS */}
            <nav className="vm-tabs">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        className={`vm-tab ${mode === tab.id ? 'active' : ''}`}
                        onClick={() => {
                            const learningModes = ['flashcards', 'fillin', 'matching'];
                            if (learningModes.includes(tab.id) && words.length > 0) {
                                if (tab.id === 'fillin') {
                                    startSession(words, 'fillin');
                                } else if (tab.id === 'matching') {
                                    if (words.length < 4) {
                                        alert('Need at least 4 words for matching!');
                                        return;
                                    }
                                    startSession(words.slice(0, 6), 'matching');
                                } else {
                                    startSession(words, tab.id);
                                }
                            } else {
                                setMode(tab.id);
                            }
                        }}
                    >
                        <span>{tab.icon}</span>{tab.label}
                    </button>
                ))}
            </nav>

            {/* SESSION SUMMARY OVERLAY */}
            {showSummary && summaryData && (
                <div className="vm-overlay" onClick={() => setShowSummary(false)}>
                    <div className="vm-summary-card" onClick={e => e.stopPropagation()}>
                        <h2>🏆 Session Complete!</h2>

                        <div className="vm-summary-stats">
                            {summaryData.summary.mastered > 0 && (
                                <div className="vm-stat-pill mastered">
                                    <span>✅</span> Mastered: {summaryData.summary.mastered}
                                </div>
                            )}
                            {summaryData.summary.review > 0 && (
                                <div className="vm-stat-pill review">
                                    <span>🟡</span> Review: {summaryData.summary.review}
                                </div>
                            )}
                            {summaryData.summary.learning > 0 && (
                                <div className="vm-stat-pill learning">
                                    <span>🔵</span> Learning: {summaryData.summary.learning}
                                </div>
                            )}
                            {summaryData.summary.relearning > 0 && (
                                <div className="vm-stat-pill relearning">
                                    <span>🔴</span> Relearning: {summaryData.summary.relearning}
                                </div>
                            )}
                        </div>

                        <div className="vm-summary-list">
                            {summaryData.results.map(r => (
                                <div key={r.word_id} className="vm-summary-item">
                                    <span className="vm-summary-word">{r.text}</span>
                                    <span className="vm-state-badge" style={{ background: STATE_COLORS[r.new_state] }}>
                                        {STATE_LABELS[r.new_state]}
                                    </span>
                                    <span className="vm-summary-interval">
                                        Next: {formatInterval(r.interval_days)}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="vm-summary-actions">
                            <button className="vm-btn-primary" onClick={() => { setShowSummary(false); setMode('dashboard'); }}>
                                Back to Dashboard
                            </button>
                            <button className="vm-btn-secondary" onClick={() => { setShowSummary(false); startSession(words, mode); }}>
                                Practice Again
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============ DASHBOARD ============ */}
            {mode === 'dashboard' && (
                <div className="vm-dashboard fade-in">
                    {/* Stats Cards */}
                    <div className="vm-stats-grid">
                        <div className="vm-stat-card total">
                            <div className="vm-stat-number">{stats?.total || 0}</div>
                            <div className="vm-stat-label">Total Words</div>
                        </div>
                        <div className="vm-stat-card due" onClick={startDueReview} style={{ cursor: dueWords.length ? 'pointer' : 'default' }}>
                            <div className="vm-stat-number">{stats?.due_today || 0}</div>
                            <div className="vm-stat-label">Due Today</div>
                        </div>
                        <div className="vm-stat-card mature">
                            <div className="vm-stat-number">{stats?.mature || 0}</div>
                            <div className="vm-stat-label">Mastered</div>
                        </div>
                        <div className="vm-stat-card leeches">
                            <div className="vm-stat-number">{stats?.leeches || 0}</div>
                            <div className="vm-stat-label">Leeches</div>
                        </div>
                    </div>

                    {/* State Distribution */}
                    <div className="vm-distribution-card">
                        <h3>📈 Learning Progress</h3>
                        <div className="vm-dist-bar">
                            {stats && stats.total > 0 && (
                                <>
                                    {stats.new > 0 && <div className="vm-dist-seg new" style={{ flex: stats.new }} title={`New: ${stats.new}`} />}
                                    {stats.learning > 0 && <div className="vm-dist-seg learning" style={{ flex: stats.learning }} title={`Learning: ${stats.learning}`} />}
                                    {stats.review > 0 && <div className="vm-dist-seg review" style={{ flex: stats.review }} title={`Review: ${stats.review}`} />}
                                    {stats.relearning > 0 && <div className="vm-dist-seg relearning" style={{ flex: stats.relearning }} title={`Relearning: ${stats.relearning}`} />}
                                </>
                            )}
                        </div>
                        <div className="vm-dist-legend">
                            <span><i style={{ background: '#94A3B8' }} />New: {stats?.new || 0}</span>
                            <span><i style={{ background: '#3B82F6' }} />Learning: {stats?.learning || 0}</span>
                            <span><i style={{ background: '#10B981' }} />Review: {stats?.review || 0}</span>
                            <span><i style={{ background: '#F59E0B' }} />Relearning: {stats?.relearning || 0}</span>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="vm-quick-actions">
                        <h3>🚀 Start Learning</h3>
                        <div className="vm-action-grid">
                            {words.length > 0 ? (
                                <>
                                    <button className="vm-action-card" onClick={() => startSession(words, 'flashcards')}>
                                        <span className="vm-action-icon">🧠</span>
                                        <span className="vm-action-title">Flashcards</span>
                                        <span className="vm-action-desc">Flip & rate with FSRS</span>
                                    </button>
                                    <button className="vm-action-card" onClick={() => {
                                        startSession(words, 'fillin');
                                    }}>
                                        <span className="vm-action-icon">✍️</span>
                                        <span className="vm-action-title">Fill-in-Blank</span>
                                        <span className="vm-action-desc">Complete the sentence</span>
                                    </button>
                                    <button className="vm-action-card" onClick={() => {
                                        if (words.length < 4) { alert('Need at least 4 words for matching!'); return; }
                                        startSession(words.slice(0, 6), 'matching');
                                    }}>
                                        <span className="vm-action-icon">🔗</span>
                                        <span className="vm-action-title">Matching</span>
                                        <span className="vm-action-desc">Word ↔ Meaning pairs</span>
                                    </button>
                                </>
                            ) : (
                                <div className="vm-empty-state">
                                    <span>📭</span>
                                    <p>No words yet. <button className="vm-link" onClick={() => setMode('import')}>Import some →</button></p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ============ FLASHCARDS ============ */}
            {mode === 'flashcards' && !showSummary && (
                <div className="vm-flashcard-container fade-in">
                    {sessionWords.length > 0 && sessionIndex < sessionWords.length ? (
                        <>
                            {/* Mode Toggle */}
                            <div className="vm-mode-toggle">
                                <button
                                    className={`vm-mode-btn ${flashcardMode === 'word' ? 'active' : ''}`}
                                    onClick={() => setFlashcardMode('word')}
                                >
                                    <span className="vm-mode-label">EN → VI</span>
                                    <span className="vm-mode-desc">Xem từ, đoán nghĩa</span>
                                </button>
                                <button
                                    className={`vm-mode-btn ${flashcardMode === 'meaning' ? 'active' : ''}`}
                                    onClick={() => setFlashcardMode('meaning')}
                                >
                                    <span className="vm-mode-label">VI → EN</span>
                                    <span className="vm-mode-desc">Xem nghĩa, đoán từ</span>
                                </button>
                            </div>

                            <div className="vm-progress-bar">
                                <div className="vm-progress-fill" style={{ width: `${((sessionIndex) / sessionWords.length) * 100}%` }} />
                            </div>
                            <p className="vm-progress-text">{sessionIndex + 1} / {sessionWords.length}</p>

                            {/* Swipe Indicators */}
                            <div className="vm-swipe-indicators">
                                <span className={`vm-swipe-hint left ${swipeOffset < -30 ? 'active' : ''}`}>Again</span>
                                <span className={`vm-swipe-hint right ${swipeOffset > 30 ? 'active' : ''}`}>Good</span>
                            </div>

                            <div 
                                className="vm-card-wrapper" 
                                style={{ 
                                    transform: `translateX(${swipeOffset}px) rotate(${swipeOffset * 0.03}deg)`, 
                                    transition: touchStartX ? 'none' : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                    touchAction: 'pan-y',
                                    userSelect: 'none',
                                    WebkitUserSelect: 'none',
                                    willChange: 'transform',
                                    cursor: touchStartX ? 'grabbing' : 'grab'
                                }}
                                onPointerDown={(e) => {
                                    e.currentTarget.setPointerCapture(e.pointerId);
                                    setTouchStartX(e.clientX);
                                }}
                                onPointerMove={(e) => {
                                    if (touchStartX === null) return;
                                    setSwipeOffset(e.clientX - touchStartX);
                                }}
                                onPointerUp={(e) => {
                                    if (touchStartX === null) return;
                                    e.currentTarget.releasePointerCapture(e.pointerId);
                                    
                                    if (swipeOffset > 80) {
                                        handleFlashcardRate(3); // Swipe Right -> Good
                                    } else if (swipeOffset < -80) {
                                        handleFlashcardRate(1); // Swipe Left -> Again
                                    } else if (Math.abs(swipeOffset) < 10) {
                                        const next = !isFlipped;
                                        setIsFlipped(next);
                                        if (!next && flashcardMode === 'word') {
                                            speakWord(sessionWords[sessionIndex].text);
                                        }
                                    }
                                    
                                    setTouchStartX(null);
                                    setSwipeOffset(0);
                                }}
                            >
                                <div className={`vm-card ${isFlipped ? 'flipped' : ''}`}>
                                    {/* FRONT — adapts to mode */}
                                    <div className="vm-card-face vm-card-front">
                                        {flashcardMode === 'word' ? (
                                            <>
                                                <button className="vm-speak-btn" onClick={e => { e.stopPropagation(); speakWord(sessionWords[sessionIndex].text); }} aria-label="Listen">
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                                                </button>
                                                <div className="vm-card-word">{sessionWords[sessionIndex].text}</div>
                                                <div className="vm-card-hint">Tap to see meaning</div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="vm-card-mode-badge">Nghĩa</div>
                                                <div className="vm-card-meaning-front">{sessionWords[sessionIndex].meaning}</div>
                                                <div className="vm-card-hint">Tap to see the word</div>
                                            </>
                                        )}
                                    </div>
                                    {/* BACK — adapts to mode */}
                                    <div className="vm-card-face vm-card-back">
                                        {flashcardMode === 'word' ? (
                                            <>
                                                <div className="vm-card-meaning">{sessionWords[sessionIndex].meaning}</div>
                                                {sessionWords[sessionIndex].example && (
                                                    <div className="vm-card-example">"{sessionWords[sessionIndex].example}"</div>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <button className="vm-speak-btn vm-speak-btn-back" onClick={e => { e.stopPropagation(); speakWord(sessionWords[sessionIndex].text); }} aria-label="Listen">
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                                                </button>
                                                <div className="vm-card-word">{sessionWords[sessionIndex].text}</div>
                                                {sessionWords[sessionIndex].example && (
                                                    <div className="vm-card-example">"{sessionWords[sessionIndex].example}"</div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {isFlipped && (
                                <div className="vm-rating-bar fade-in">
                                    {RATING_CONFIG.map(r => (
                                        <button
                                            key={r.value}
                                            className="vm-rating-btn"
                                            style={{ '--rating-color': r.color, '--rating-bg': r.bg }}
                                            onClick={() => handleFlashcardRate(r.value)}
                                        >
                                            <span className="vm-rating-label">{r.label}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : sessionWords.length === 0 ? (
                        <div className="vm-empty-state">
                            <span>📭</span>
                            <p>No words to study. <button className="vm-link" onClick={() => setMode('import')}>Import some →</button></p>
                        </div>
                    ) : null}
                </div>
            )}

            {/* ============ FILL-IN-BLANK ============ */}
            {mode === 'fillin' && !showSummary && (
                <div className="vm-fillin-container fade-in">
                    {sessionWords.length > 0 && sessionIndex < sessionWords.length ? (
                        <>
                            <div className="vm-progress-bar">
                                <div className="vm-progress-fill" style={{ width: `${((sessionIndex) / sessionWords.length) * 100}%` }} />
                            </div>
                            <p className="vm-progress-text">{sessionIndex + 1} / {sessionWords.length}</p>

                            <div className="vm-fillin-card">
                                <div className="vm-fillin-meaning">
                                    <span className="vm-label-tag">Meaning</span>
                                    {currentBlankWord?.meaning}
                                </div>

                                {blankSentence ? (
                                    <div className="vm-fillin-sentence">
                                        {blankSentence.split('___').map((part, i, arr) => (
                                            <span key={i}>
                                                {part}
                                                {i < arr.length - 1 && (
                                                    <span className={`vm-blank-slot ${blankResult || ''}`}>
                                                        {blankResult === 'correct' ? currentBlankWord.text :
                                                         blankResult === 'wrong' ? currentBlankWord.text :
                                                         '______'}
                                                    </span>
                                                )}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="vm-fillin-sentence" style={{ opacity: 0.5 }}>
                                        No example sentence available. Type the word below.
                                    </div>
                                )}

                                <div className="vm-fillin-input-row">
                                    <input
                                        ref={blankInputRef}
                                        className={`vm-fillin-input ${blankResult || ''}`}
                                        value={blankAnswer}
                                        onChange={e => setBlankAnswer(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleBlankSubmit()}
                                        placeholder="Type the word..."
                                        disabled={blankResult !== null}
                                        autoFocus
                                    />
                                    <button className="vm-btn-primary" onClick={handleBlankSubmit} disabled={blankResult !== null || !blankAnswer.trim()}>
                                        Check
                                    </button>
                                </div>

                                {blankResult && (
                                    <div className={`vm-fillin-feedback ${blankResult}`}>
                                        {blankResult === 'correct' ? '✅ Correct!' : `❌ The answer is: ${currentBlankWord.text}`}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : sessionWords.length === 0 ? (
                        <div className="vm-empty-state">
                            <span>✍️</span>
                            <p>No words with examples. Add example sentences to your words first.</p>
                        </div>
                    ) : null}
                </div>
            )}

            {/* ============ MATCHING GAME ============ */}
            {mode === 'matching' && !showSummary && (
                <div className="vm-matching-container fade-in">
                    {matchPairs.length > 0 ? (
                        <>
                            <div className="vm-match-header">
                                <span>Attempts: <strong>{matchAttempts}</strong></span>
                                <span>Matched: <strong>{matchedIds.size}</strong> / {matchPairs.filter(p => p.type === 'word').length}</span>
                                {matchStartTime && (
                                    <span>Time: <MatchTimer startTime={matchStartTime} complete={matchComplete} /></span>
                                )}
                            </div>

                            <div className="vm-match-grid">
                                {matchPairs.map(tile => {
                                    const isMatched = matchedIds.has(tile.wordId);
                                    const isSelected = matchSelected?.id === tile.id;
                                    return (
                                        <button
                                            key={tile.id}
                                            className={`vm-match-tile ${tile.type} ${isMatched ? 'matched' : ''} ${isSelected ? 'selected' : ''}`}
                                            onClick={() => !isMatched && handleMatchClick(tile)}
                                            disabled={isMatched}
                                        >
                                            {tile.content}
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="vm-empty-state">
                            <span>🔗</span>
                            <p>Need at least 4 words for matching.</p>
                        </div>
                    )}
                </div>
            )}

            {/* ============ IMPORT ============ */}
            {mode === 'import' && (
                <div className="vm-import-container fade-in">
                    <div className="vm-import-grid">
                        {/* LEFT: Input */}
                        <div className="vm-import-input">
                            <div className="vm-card-header">
                                <h3>📥 JSON Import</h3>
                                <p>Paste JSON array or upload .json file</p>
                            </div>

                            <div className="vm-json-format">
                                <code>{`[{"text":"word","meaning":"nghĩa","example":"câu ví dụ"}]`}</code>
                            </div>

                            <textarea
                                className="vm-json-input"
                                value={jsonInput}
                                onChange={e => setJsonInput(e.target.value)}
                                placeholder={`[\n  {"text": "reluctant", "meaning": "miễn cưỡng", "example": "She was reluctant to leave."},\n  {"text": "ambiguous", "meaning": "mơ hồ", "example": "The instructions were ambiguous."}\n]`}
                                rows={10}
                            />

                            <div className="vm-import-actions">
                                <button className="vm-btn-primary" onClick={handleJsonParse} disabled={!jsonInput.trim()}>
                                    Parse JSON
                                </button>
                                <button className="vm-btn-secondary" onClick={() => fileInputRef.current?.click()}>
                                    📁 Upload .json
                                </button>
                                <input type="file" ref={fileInputRef} hidden accept=".json" onChange={handleFileUpload} />
                            </div>
                        </div>

                        {/* RIGHT: Preview */}
                        <div className="vm-import-preview">
                            <div className="vm-card-header">
                                <h3>Preview ({previewWords.length} words)</h3>
                            </div>

                            <div className="vm-preview-list">
                                {previewWords.length === 0 ? (
                                    <div className="vm-empty-state small">
                                        <span>🕸️</span>
                                        <p>Parse or upload JSON to preview</p>
                                    </div>
                                ) : (
                                    previewWords.map(w => (
                                        <div key={w.id} className="vm-preview-item">
                                            <div className="vm-preview-content">
                                                <strong>{w.text}</strong>
                                                <span>{w.meaning}</span>
                                                {w.example && <em>"{w.example}"</em>}
                                            </div>
                                            <button className="vm-btn-ghost" onClick={() => removePreviewWord(w.id)}>✕</button>
                                        </div>
                                    ))
                                )}
                            </div>

                            {previewWords.length > 0 && (
                                <button
                                    className="vm-btn-primary vm-full-width"
                                    onClick={handleSaveImport}
                                    disabled={isImporting}
                                >
                                    {isImporting ? 'Saving...' : `Save ${previewWords.length} Words`}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ============ ALL WORDS LIST ============ */}
            {mode === 'list' && (
                <div className="vm-list-container fade-in">
                    {words.length === 0 ? (
                        <div className="vm-empty-state">
                            <span>📭</span>
                            <p>No words in this collection.</p>
                        </div>
                    ) : (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                                <button className="vm-btn-secondary" style={{ borderColor: 'red', color: 'red' }} onClick={handleDeleteAll}>
                                    🗑️ Delete All {words.length} Words
                                </button>
                            </div>
                            <div className="vm-word-grid">
                                {words.map(word => (
                                    <div key={word.id} className="vm-word-card">
                                        <div className="vm-word-header">
                                            <h4>{word.text}</h4>
                                            <div className="vm-word-actions">
                                                <button onClick={() => speakWord(word.text)} title="Listen">🔊</button>
                                                <button onClick={() => handleDelete(word.id)} title="Delete">✕</button>
                                            </div>
                                        </div>
                                        <p className="vm-word-meaning">{word.meaning}</p>
                                        {word.example && <p className="vm-word-example">"{word.example}"</p>}
                                        <div className="vm-word-footer">
                                            <span className="vm-state-badge" style={{ background: STATE_COLORS[word.fsrs_state] }}>
                                                {STATE_ICONS[word.fsrs_state]} {STATE_LABELS[word.fsrs_state]}
                                            </span>
                                            {word.fsrs_reps > 0 && (
                                                <span className="vm-word-reps">{word.fsrs_reps} reviews</span>
                                            )}
                                            {word.fsrs_lapses > 0 && (
                                                <span className="vm-word-lapses">⚠ {word.fsrs_lapses} lapses</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

// ============ MATCH TIMER COMPONENT ============
function MatchTimer({ startTime, complete }) {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        if (complete) return;
        const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 100);
        return () => clearInterval(id);
    }, [startTime, complete]);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return <strong>{mins}:{secs.toString().padStart(2, '0')}</strong>;
}
