import { useState, useEffect, useRef, useCallback } from 'react';
import { getRandomQuestion, getStages } from '../services/api';
import MultiSelect from '../components/MultiSelect';

// ── SVG Icons ──
const HeadphonesIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
);

const TimerIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2 2" />
        <path d="M5 3L2 6" />
        <path d="M22 6l-3-3" />
        <line x1="12" y1="1" x2="12" y2="3" />
    </svg>
);

const PlayIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <polygon points="5,3 19,12 5,21" />
    </svg>
);

const RefreshIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="23 4 23 10 17 10" />
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
);

const LightbulbIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }}>
        <path d="M9 18h6" />
        <path d="M10 22h4" />
        <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5C8.35 12.26 8.82 13.02 9 14" />
    </svg>
);

const CheckCircleIcon = () => (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
);

// ── Circular countdown ring (responsive) ──
const CountdownRing = ({ timeLeft, totalTime }) => {
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const progress = timeLeft / totalTime;
    const offset = circumference * (1 - progress);

    const urgencyColor = timeLeft <= 3 ? '#EF4444'
        : timeLeft <= 7 ? '#F59E0B'
        : '#10B981';

    return (
        <div className="qm-countdown-ring">
            <svg viewBox="0 0 160 160" className="qm-countdown-svg">
                <circle
                    cx="80" cy="80" r={radius}
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="8"
                />
                <circle
                    cx="80" cy="80" r={radius}
                    fill="none"
                    stroke={urgencyColor}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{
                        transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease',
                        transform: 'rotate(-90deg)',
                        transformOrigin: '80px 80px',
                        filter: `drop-shadow(0 0 8px ${urgencyColor}40)`
                    }}
                />
            </svg>
            <div className="qm-countdown-value">
                <span className="qm-countdown-number" style={{ color: urgencyColor }}>
                    {timeLeft}
                </span>
                <span className="qm-countdown-unit">giây</span>
            </div>
        </div>
    );
};


export default function QuestionMaking() {
    const [stages, setStages] = useState([]);
    const [selectedStage, setSelectedStage] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [error, setError] = useState(null);
    const [questionsCompleted, setQuestionsCompleted] = useState(0);
    const [showScript, setShowScript] = useState(false);

    // Timer state
    const TIMER_DURATION = 15;
    const [timerState, setTimerState] = useState('idle'); // idle | running | done
    const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
    const timerRef = useRef(null);

    // Step tracking: 0 = nothing, 1 = listen, 2 = practice
    const [step, setStep] = useState(0);

    useEffect(() => {
        loadStages();
        if (window.speechSynthesis) {
            window.speechSynthesis.getVoices();
        }
    }, []);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            window.speechSynthesis?.cancel();
        };
    }, []);

    const loadStages = async () => {
        try {
            const res = await getStages();
            setStages(res.data);
        } catch (err) {
            console.error('Error loading stages:', err);
        }
    };

    const getEnglishVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        const preferred = [
            'Google US English', 'Google UK English Female', 'Google UK English Male',
            'Samantha', 'Daniel', 'Karen', 'Moira', 'Tessa',
            'Microsoft Zira', 'Microsoft David', 'Microsoft Mark',
        ];
        for (const name of preferred) {
            const v = voices.find(v => v.name === name);
            if (v) return v;
        }
        return voices.find(v => v.lang.startsWith('en')) || null;
    };

    const speakQuestion = useCallback((text) => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.85;
        const voice = getEnglishVoice();
        if (voice) utterance.voice = voice;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
            setIsSpeaking(false);
            startTimer();
        };
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    }, []);

    const startTimer = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);

        setTimeLeft(TIMER_DURATION);
        setTimerState('running');
        setStep(2);

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                    setTimerState('done');
                    playDing();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, []);

    const playDing = () => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.8);
        } catch (e) { /* silent */ }
    };

    const handleGetQuestion = async () => {
        try {
            setError(null);
            if (timerRef.current) clearInterval(timerRef.current);
            setTimerState('idle');
            setTimeLeft(TIMER_DURATION);

            const res = await getRandomQuestion(selectedStage);
            if (res.data) {
                setCurrentQuestion(res.data);
                setStep(1);
                setShowScript(false);
                setTimeout(() => speakQuestion(res.data.question_text), 300);
            } else {
                alert('Không tìm thấy câu hỏi nào.');
            }
        } catch (err) {
            console.error('Error getting question:', err);
            setCurrentQuestion(null);
            if (err.response?.status === 404) {
                setError('Chưa có câu hỏi nào trong chủ đề này.');
            } else {
                setError('Không thể tải câu hỏi. Vui lòng thử lại sau.');
            }
        }
    };

    const handleNextQuestion = () => {
        setQuestionsCompleted(prev => prev + 1);
        handleGetQuestion();
    };

    const handleReplayQuestion = () => {
        if (currentQuestion) {
            if (timerRef.current) clearInterval(timerRef.current);
            setTimerState('idle');
            setTimeLeft(TIMER_DURATION);
            setStep(1);
            speakQuestion(currentQuestion.question_text);
        }
    };

    return (
        <div className="page fade-in qm-page">

            {/* Header */}
            <div className="page-header qm-header">
                <h1 className="page-title qm-title">
                    Đặt câu hỏi
                </h1>
                <p className="page-subtitle qm-subtitle">Nghe câu mẫu → Đặt câu hỏi tương tự trong {TIMER_DURATION}s</p>

                {questionsCompleted > 0 && (
                    <div className="qm-session-badge">
                        🔥 Đã luyện: {questionsCompleted} câu
                    </div>
                )}
            </div>

            <div className="container qm-container">

                {/* Stage Filter */}
                <div className="speaking-card qm-filter-card">
                    <div className="qm-filter-row">
                        <div className="qm-filter-select-wrap">
                            <label className="text-muted qm-label">Chọn chủ đề:</label>
                            <MultiSelect 
                                options={stages.map(stage => ({ label: stage.name, value: stage.id }))}
                                selected={selectedStage}
                                onChange={setSelectedStage}
                                placeholder="Tất cả chủ đề"
                            />
                        </div>
                        <button
                            className="btn btn-primary qm-new-btn"
                            onClick={handleGetQuestion}
                            disabled={isSpeaking}
                            style={{ opacity: isSpeaking ? 0.7 : 1 }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Câu hỏi mới
                        </button>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="speaking-card slide-up qm-error-card">
                        <p className="qm-error-text">{error}</p>
                    </div>
                )}

                {/* Step 1: Listen */}
                {currentQuestion && (
                    <div className="speaking-card slide-up qm-listen-card">
                        <div className="speaking-card-header">
                            <div className="speaking-card-icon listen">
                                <HeadphonesIcon />
                            </div>
                            <span className="speaking-card-title">Bước 1: Nghe câu mẫu</span>
                        </div>

                        <div className="qm-question-display">
                            {!showScript ? (
                                <div style={{ marginBottom: 14 }}>
                                    <button 
                                        onClick={() => setShowScript(true)}
                                        className="btn qm-btn-secondary"
                                        style={{ fontSize: '0.9rem', padding: '8px 16px', borderRadius: 50 }}
                                    >
                                        👁 Hiện câu hỏi (Script)
                                    </button>
                                </div>
                            ) : (
                                <h2 className="qm-question-text">
                                    "{currentQuestion.question_text}"
                                </h2>
                            )}

                            <button
                                onClick={() => speakQuestion(currentQuestion.question_text)}
                                disabled={isSpeaking}
                                className="qm-listen-btn"
                                data-speaking={isSpeaking}
                            >
                                {isSpeaking ? (
                                    <><span className="animate-pulse">🔊</span> Đang đọc...</>
                                ) : (
                                    <><PlayIcon /> Nghe lại</>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Timer + Practice */}
                {currentQuestion && (step === 2 || timerState !== 'idle') && (
                    <div className="speaking-card slide-up qm-timer-card" style={{ animationDelay: '0.1s' }}>
                        <div className="speaking-card-header">
                            <div className="speaking-card-icon" style={{
                                background: timerState === 'running'
                                    ? 'linear-gradient(135deg, #F59E0B, #EF4444)'
                                    : timerState === 'done'
                                    ? 'linear-gradient(135deg, #10B981, #34D399)'
                                    : 'linear-gradient(135deg, #6366F1, #818CF8)'
                            }}>
                                <TimerIcon />
                            </div>
                            <span className="speaking-card-title">Bước 2: Đặt câu hỏi</span>
                        </div>

                        {/* Instructions */}
                        <div className="qm-instruction-box">
                            <LightbulbIcon />
                            <div>
                                <p className="qm-instruction-title">Hướng dẫn</p>
                                <p className="qm-instruction-text">
                                    Đặt nhiều câu hỏi tương tự nhất có thể trong {TIMER_DURATION}s — thay đổi động từ, danh từ, trạng từ.
                                </p>
                            </div>
                        </div>

                        {/* Timer display */}
                        <div className="qm-timer-area">
                            {timerState === 'running' && (
                                <div className="slide-up">
                                    <CountdownRing timeLeft={timeLeft} totalTime={TIMER_DURATION} />

                                    {/* Hint */}
                                    <div className="qm-hint-box">
                                        <p className="qm-hint-label">💡 Gợi ý</p>
                                        <p className="qm-hint-text">
                                            {getHintFromQuestion(currentQuestion.question_text)}
                                        </p>
                                    </div>

                                    {/* Pulse indicator */}
                                    <div className="qm-pulse-indicator">
                                        <span className="qm-pulse-dot" />
                                        Hãy nói to câu hỏi của bạn!
                                    </div>
                                </div>
                            )}

                            {timerState === 'done' && (
                                <div className="slide-up qm-done-area">
                                    <div style={{ color: '#10B981', marginBottom: 12 }}>
                                        <CheckCircleIcon />
                                    </div>
                                    <h3 className="qm-done-title">Hết giờ! 🎉</h3>
                                    <p className="qm-done-text">Tốt lắm! Hãy tiếp tục với câu tiếp theo.</p>

                                    <div className="qm-done-actions">
                                        <button onClick={handleReplayQuestion} className="btn qm-btn-secondary">
                                            <RefreshIcon />
                                            Thử lại
                                        </button>
                                        <button onClick={handleNextQuestion} className="btn qm-btn-next">
                                            Câu tiếp
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <line x1="5" y1="12" x2="19" y2="12" />
                                                <polyline points="12,5 19,12 12,19" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {timerState === 'idle' && step === 2 && (
                                <p className="qm-waiting-text">
                                    Đồng hồ sẽ bắt đầu sau khi nghe xong câu mẫu...
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Empty state */}
                {!currentQuestion && !error && (
                    <div className="speaking-card qm-empty-state">
                        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎯</div>
                        <h3 className="qm-empty-title">Luyện đặt câu hỏi</h3>
                        <p className="qm-empty-desc">
                            Chọn chủ đề và bấm <strong>"Câu hỏi mới"</strong> để bắt đầu.
                            Bạn sẽ nghe câu mẫu, sau đó có {TIMER_DURATION}s để đặt câu tương tự.
                        </p>
                    </div>
                )}
            </div>

            <style>{`
                /* ========== QM – Base ========== */
                .qm-page { padding-bottom: 40px; }
                
                .qm-title {
                    background: linear-gradient(135deg, #F59E0B, #EF4444);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
                
                .qm-container { max-width: 800px; }

                .qm-session-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    margin-top: 10px;
                    padding: 5px 14px;
                    background: rgba(245, 158, 11, 0.12);
                    border-radius: 50px;
                    font-size: 0.82rem;
                    color: #F59E0B;
                    font-weight: 600;
                }

                /* ── Filter Card ── */
                .qm-filter-row {
                    display: flex;
                    gap: 12px;
                    align-items: flex-end;
                    flex-wrap: wrap;
                }
                .qm-filter-select-wrap {
                    flex: 1;
                    min-width: 0;
                }
                .qm-label {
                    display: block;
                    margin-bottom: 6px;
                    font-weight: 500;
                    font-size: 0.9rem;
                }
                .qm-select {
                    width: 100%;
                    padding: 12px 14px;
                    background: var(--bg-dark);
                    border: 2px solid var(--bg-hover);
                    border-radius: var(--radius-md);
                    color: var(--text);
                    font-size: 0.95rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    -webkit-appearance: none;
                }
                .qm-new-btn {
                    padding: 12px 20px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    background: linear-gradient(135deg, #F59E0B, #EF4444) !important;
                    white-space: nowrap;
                    font-size: 0.9rem;
                    flex-shrink: 0;
                }

                /* ── Error ── */
                .qm-error-card {
                    border-left: 4px solid #EF4444;
                    background: rgba(239, 68, 68, 0.08);
                }
                .qm-error-text {
                    color: #EF4444;
                    margin: 0;
                    text-align: center;
                    font-size: 0.9rem;
                }

                /* ── Question Display ── */
                .qm-question-display {
                    text-align: center;
                    padding: 16px 0 8px;
                }
                .qm-question-text {
                    font-size: 1.4rem;
                    font-weight: 700;
                    background: linear-gradient(90deg, #fff, #cbd5e1);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    line-height: 1.5;
                    margin-bottom: 14px;
                    word-break: break-word;
                }
                .qm-listen-btn {
                    background: var(--bg-hover);
                    color: white;
                    border: none;
                    padding: 10px 22px;
                    border-radius: 50px;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    font-size: 0.9rem;
                    font-weight: 500;
                    transition: all 0.3s ease;
                }
                .qm-listen-btn[data-speaking="true"] {
                    background: linear-gradient(135deg, #6366F1, #818CF8);
                    cursor: default;
                }

                /* ── Instruction Box ── */
                .qm-instruction-box {
                    background: rgba(245, 158, 11, 0.06);
                    border: 1px solid rgba(245, 158, 11, 0.15);
                    border-radius: var(--radius-md);
                    padding: 12px 14px;
                    margin-bottom: 20px;
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                }
                .qm-instruction-title {
                    margin: 0 0 3px;
                    font-size: 0.85rem;
                    color: #F59E0B;
                    font-weight: 600;
                }
                .qm-instruction-text {
                    margin: 0;
                    font-size: 0.8rem;
                    color: var(--text-muted);
                    line-height: 1.55;
                }

                /* ── Timer Area ── */
                .qm-timer-area {
                    text-align: center;
                    padding: 8px 0 12px;
                }

                /* ── Countdown Ring ── */
                .qm-countdown-ring {
                    position: relative;
                    width: 160px;
                    height: 160px;
                    margin: 0 auto;
                }
                .qm-countdown-svg {
                    width: 100%;
                    height: 100%;
                }
                .qm-countdown-value {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    text-align: center;
                }
                .qm-countdown-number {
                    font-size: 2.6rem;
                    font-weight: 800;
                    font-variant-numeric: tabular-nums;
                    line-height: 1;
                    display: block;
                    transition: color 0.5s ease;
                }
                .qm-countdown-unit {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-top: 4px;
                    display: block;
                }

                /* ── Hint Box ── */
                .qm-hint-box {
                    margin-top: 16px;
                    padding: 12px 14px;
                    background: var(--bg-dark);
                    border-radius: var(--radius-md);
                    text-align: left;
                }
                .qm-hint-label {
                    margin: 0 0 6px;
                    font-size: 0.75rem;
                    color: var(--text-dim);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    font-weight: 600;
                }
                .qm-hint-text {
                    margin: 0;
                    font-size: 0.85rem;
                    color: var(--text-muted);
                    font-style: italic;
                    line-height: 1.55;
                    word-break: break-word;
                }

                /* ── Pulse ── */
                .qm-pulse-indicator {
                    margin-top: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 7px;
                    color: var(--text-muted);
                    font-size: 0.85rem;
                }
                .qm-pulse-dot {
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;
                    background: #F59E0B;
                    display: inline-block;
                    animation: blink 1s infinite;
                }

                /* ── Done State ── */
                .qm-done-area { padding: 16px 0; }
                .qm-done-title {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: #10B981;
                    margin-bottom: 6px;
                }
                .qm-done-text {
                    color: var(--text-muted);
                    margin-bottom: 20px;
                    font-size: 0.9rem;
                }
                .qm-done-actions {
                    display: flex;
                    gap: 10px;
                    justify-content: center;
                    flex-wrap: wrap;
                }
                .qm-btn-secondary {
                    padding: 10px 18px;
                    background: var(--bg-hover);
                    color: var(--text);
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.9rem;
                }
                .qm-btn-next {
                    padding: 10px 18px;
                    background: linear-gradient(135deg, #F59E0B, #EF4444);
                    color: white;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.9rem;
                }

                /* ── Waiting ── */
                .qm-waiting-text {
                    color: var(--text-muted);
                    font-style: italic;
                    font-size: 0.9rem;
                }

                /* ── Empty State ── */
                .qm-empty-state {
                    text-align: center;
                    padding: 48px 16px;
                }
                .qm-empty-title {
                    color: var(--text);
                    margin-bottom: 6px;
                    font-size: 1.1rem;
                }
                .qm-empty-desc {
                    color: var(--text-muted);
                    max-width: 380px;
                    margin: 0 auto;
                    line-height: 1.6;
                    font-size: 0.88rem;
                }

                /* ── Animations ── */
                .animate-pulse {
                    animation: pulse-opacity 1.5s ease-in-out infinite;
                }
                @keyframes pulse-opacity {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }


                /* ========================================= */
                /* ========== MOBILE RESPONSIVE ============ */
                /* ========================================= */

                @media (max-width: 640px) {
                    .qm-page { padding-bottom: 24px; }
                    
                    .qm-header { padding: 16px 12px 12px; }
                    .qm-subtitle { font-size: 0.82rem; }

                    .qm-container { padding: 0 8px; }

                    /* Stack filter vertically */
                    .qm-filter-row {
                        flex-direction: column;
                        gap: 10px;
                        align-items: stretch;
                    }
                    .qm-filter-select-wrap { min-width: 0; }
                    .qm-select { padding: 11px 12px; font-size: 0.9rem; }
                    .qm-new-btn {
                        width: 100%;
                        justify-content: center;
                        padding: 12px 16px;
                    }

                    /* Cards: tighter padding */
                    .qm-filter-card,
                    .qm-listen-card,
                    .qm-timer-card,
                    .qm-empty-state {
                        padding: 16px 14px;
                        border-radius: 14px;
                        margin-bottom: 14px;
                    }

                    /* Question text smaller */
                    .qm-question-text { font-size: 1.15rem; }
                    .qm-listen-btn { padding: 9px 18px; font-size: 0.85rem; }

                    /* Timer ring smaller */
                    .qm-countdown-ring {
                        width: 130px;
                        height: 130px;
                    }
                    .qm-countdown-number { font-size: 2.2rem; }
                    .qm-countdown-unit { font-size: 0.7rem; }

                    /* Hint/Instruction */
                    .qm-instruction-box { padding: 10px 12px; gap: 8px; }
                    .qm-instruction-text { font-size: 0.78rem; }
                    .qm-hint-box { padding: 10px 12px; }
                    .qm-hint-text { font-size: 0.8rem; }
                    .qm-pulse-indicator { font-size: 0.8rem; }

                    /* Done buttons */
                    .qm-done-actions { gap: 8px; }
                    .qm-btn-secondary,
                    .qm-btn-next {
                        padding: 10px 14px;
                        font-size: 0.85rem;
                        flex: 1;
                        justify-content: center;
                    }

                    /* Empty state */
                    .qm-empty-state { padding: 36px 14px; }
                    .qm-empty-desc { font-size: 0.82rem; }
                    
                    /* Speaking card header */
                    .qm-timer-card .speaking-card-title,
                    .qm-listen-card .speaking-card-title {
                        font-size: 0.95rem;
                    }
                }

                /* Extra small (iPhone SE, etc) */
                @media (max-width: 375px) {
                    .qm-question-text { font-size: 1.05rem; }
                    .qm-countdown-ring { width: 110px; height: 110px; }
                    .qm-countdown-number { font-size: 1.9rem; }
                    .qm-btn-secondary,
                    .qm-btn-next {
                        padding: 9px 12px;
                        font-size: 0.8rem;
                    }
                    .qm-done-title { font-size: 1.1rem; }
                }
            `}</style>
        </div>
    );
}

// ── Helper: generate a hint based on the question pattern ──
function getHintFromQuestion(questionText) {
    if (!questionText) return 'Thay đổi chủ ngữ, động từ hoặc tân ngữ...';

    const q = questionText.toLowerCase().trim();

    if (q.startsWith('do you usually')) {
        return `"Do you usually _____ every day?" — thay bằng: eat breakfast, watch TV, read books...`;
    }
    if (q.startsWith('do you')) {
        return `"Do you _____ ?" — thay bằng: like music, play sports, have a pet...`;
    }
    if (q.startsWith('have you ever')) {
        return `"Have you ever _____ ?" — thay bằng: traveled abroad, cooked dinner...`;
    }
    if (q.startsWith('what do you')) {
        return `"What do you _____ ?" — thay bằng: usually eat, like to do, think about...`;
    }
    if (q.startsWith('how often')) {
        return `"How often do you _____ ?" — thay bằng: exercise, go shopping...`;
    }
    if (q.startsWith('where')) {
        return `"Where do you _____ ?" — thay bằng: live, work, study...`;
    }
    if (q.startsWith('when')) {
        return `"When do you _____ ?" — thay bằng: wake up, go to bed...`;
    }
    if (q.startsWith('can you')) {
        return `"Can you _____ ?" — thay bằng: swim, cook, play guitar...`;
    }
    if (q.startsWith('would you')) {
        return `"Would you like to _____ ?" — thay bằng: travel, learn cooking...`;
    }

    return `Giữ cấu trúc câu hỏi, chỉ thay đổi từ vựng: động từ, danh từ, trạng từ...`;
}
