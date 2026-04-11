import { useState, useEffect, useCallback } from 'react';
import { getRandomQuestion, getStages, analyzeSpeaking, pollAnalysisResult } from '../services/api';
import VoiceRecorder from '../components/VoiceRecorder';

// SVG Icons
const HeadphonesIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
);

const MicIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
);

const SparklesIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
        <path d="M5 19l1 3 1-3 3-1-3-1-1-3-1 3-3 1 3 1z" />
        <path d="M18 14l.5 1.5L20 16l-1.5.5L18 18l-.5-1.5L16 16l1.5-.5L18 14z" />
    </svg>
);

const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <polyline points="20,6 9,17 4,12" />
    </svg>
);

const ArrowRightIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="9,18 15,12 9,6" />
    </svg>
);

// Score Circle Component
const ScoreCircle = ({ score }) => {
    const circumference = 2 * Math.PI * 52;
    const offset = circumference - (score / 100) * circumference;
    const scoreClass = score >= 70 ? 'excellent' : score >= 50 ? 'good' : 'needs-work';

    return (
        <div className="score-circle">
            <svg width="120" height="120">
                <defs>
                    <linearGradient id="gradient-excellent" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#10B981" />
                        <stop offset="100%" stopColor="#34D399" />
                    </linearGradient>
                    <linearGradient id="gradient-good" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#F59E0B" />
                        <stop offset="100%" stopColor="#FBBF24" />
                    </linearGradient>
                    <linearGradient id="gradient-needs-work" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#EF4444" />
                        <stop offset="100%" stopColor="#F87171" />
                    </linearGradient>
                </defs>
                <circle cx="60" cy="60" r="52" className="score-circle-bg" />
                <circle
                    cx="60" cy="60" r="52"
                    className={`score-circle-progress ${scoreClass}`}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                />
            </svg>
            <div className="score-value">
                <div className={`score-number ${scoreClass}`}>{score}</div>
                <div className="score-label">điểm</div>
            </div>
        </div>
    );
};

// Confetti Component
const Confetti = ({ show }) => {
    if (!show) return null;

    const colors = ['#10B981', '#6366F1', '#EC4899', '#F59E0B', '#2DD4BF'];
    const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 6
    }));

    return (
        <div className="confetti-container">
            {confettiPieces.map(piece => (
                <div
                    key={piece.id}
                    className="confetti"
                    style={{
                        left: `${piece.left}%`,
                        animationDelay: `${piece.delay}s`,
                        background: piece.color,
                        width: piece.size,
                        height: piece.size,
                        borderRadius: Math.random() > 0.5 ? '50%' : '2px'
                    }}
                />
            ))}
        </div>
    );
};

// Encouraging messages based on score
const getEncouragement = (score) => {
    if (score >= 90) return { emoji: '🏆', text: 'Xuất sắc! Câu trả lời rất thuyết phục!' };
    if (score >= 80) return { emoji: '🌟', text: 'Tuyệt vời! Bạn trả lời rất tự nhiên!' };
    if (score >= 70) return { emoji: '👏', text: 'Rất tốt! Cố gắng mở rộng câu trả lời thêm nhé!' };
    if (score >= 50) return { emoji: '💪', text: 'Khá tốt! Hãy chú ý ngữ pháp và phát âm hơn.' };
    return { emoji: '🎯', text: 'Đừng ngại sai! Cứ nói nhiều sẽ quen miệng thôi!' };
};

export default function SpeakingPractice() {
    const [stages, setStages] = useState([]);
    const [selectedStage, setSelectedStage] = useState('');
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [recording, setRecording] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [error, setError] = useState(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const [isSpeakingQuestion, setIsSpeakingQuestion] = useState(false);
    const [showQuestion, setShowQuestion] = useState(false);

    // Current step: 1 = Listen Question, 2 = Answer, 3 = Analyze
    const getCurrentStep = () => {
        if (analysisResult) return 3;
        if (recording || (currentQuestion && !isSpeakingQuestion)) return 2;
        if (currentQuestion) return 1;
        return 0;
    };

    useEffect(() => {
        loadStages();
    }, []);

    const loadStages = async () => {
        try {
            const res = await getStages();
            setStages(res.data);
        } catch (err) {
            console.error('Error loading stages:', err);
        }
    };

    const speakQuestion = (text) => {
        if (!window.speechSynthesis) return;

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9; // Slightly slower for clarity

        utterance.onstart = () => setIsSpeakingQuestion(true);
        utterance.onend = () => setIsSpeakingQuestion(false);
        utterance.onerror = () => setIsSpeakingQuestion(false);

        window.speechSynthesis.speak(utterance);
    };

    const handleGetQuestion = async () => {
        try {
            setError(null);
            const res = await getRandomQuestion(selectedStage || null);
            if (res.data) {
                setCurrentQuestion(res.data);
                setRecording(null);
                setAnalysisResult(null);
                setShowConfetti(false);
                setShowQuestion(false);

                // Auto speak the question
                speakQuestion(res.data.question_text);
            } else {
                alert('Không tìm thấy câu hỏi nào.');
            }
        } catch (err) {
            console.error('Error getting question:', err);
            setCurrentQuestion(null);
            if (err.response?.status === 404) {
                setError('Chưa có câu hỏi nào trong chủ đề này. Vui lòng chọn chủ đề khác.');
            } else {
                setError('Không thể tải câu hỏi. Vui lòng thử lại sau.');
            }
        }
    };

    const handleRecordingComplete = (blob) => {
        setRecording(blob);
        setAnalysisResult(null);
    };

    const handleAnalyze = async () => {
        if (!recording || !currentQuestion) return;

        try {
            setAnalyzing(true);
            setError(null);

            // Context for AI: "Question: [question text]"
            const referenceText = `Question: ${currentQuestion.question_text}`;

            const startRes = await analyzeSpeaking(recording, referenceText, 'en');

            if (!startRes.data.success) {
                throw new Error('Failed to start analysis');
            }

            const result = await pollAnalysisResult(startRes.data.jobId);
            setAnalysisResult(result);

            // Show confetti for high scores
            if (result.analysis?.overallScore >= 80) {
                setShowConfetti(true);
                setTimeout(() => setShowConfetti(false), 3000);
            }

        } catch (err) {
            console.error('Error analyzing:', err);
            setError('Lỗi khi phân tích. Vui lòng thử lại.');
        } finally {
            setAnalyzing(false);
        }
    };

    const currentStep = getCurrentStep();

    return (
        <div className="page fade-in">
            <Confetti show={showConfetti} />

            {/* Header */}
            <div className="page-header">
                <h1 className="page-title" style={{
                    background: 'linear-gradient(135deg, #6366F1, #EC4899)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                }}>
                    Luyện nói (Q&A)
                </h1>
                <p className="page-subtitle">Nghe câu hỏi → Trả lời → AI chấm điểm</p>
            </div>

            <div className="container" style={{ maxWidth: 900 }}>
                {/* Step Progress Indicator */}
                <div className="speaking-steps">
                    <div className={`speaking-step ${currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : ''}`}>
                        <span className="speaking-step-number">
                            {currentStep > 1 ? <CheckIcon /> : '1'}
                        </span>
                        <span className="speaking-step-label">Nghe Hỏi</span>
                    </div>
                    <span className="speaking-step-arrow"><ArrowRightIcon /></span>
                    <div className={`speaking-step ${currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : ''}`}>
                        <span className="speaking-step-number">
                            {currentStep > 2 ? <CheckIcon /> : '2'}
                        </span>
                        <span className="speaking-step-label">Trả Lời</span>
                    </div>
                    <span className="speaking-step-arrow"><ArrowRightIcon /></span>
                    <div className={`speaking-step ${currentStep === 3 ? 'active' : ''}`}>
                        <span className="speaking-step-number">3</span>
                        <span className="speaking-step-label">Feedback</span>
                    </div>
                </div>

                {/* Stage Filter */}
                <div className="speaking-card">
                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 200 }}>
                            <label className="text-muted" style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                                Chọn chủ đề:
                            </label>
                            <select
                                value={selectedStage}
                                onChange={(e) => setSelectedStage(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '14px 18px',
                                    background: 'var(--bg-dark)',
                                    border: '2px solid var(--bg-hover)',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--text)',
                                    fontSize: '1rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <option value="">Tất cả chủ đề</option>
                                {stages.map(stage => (
                                    <option key={stage.id} value={stage.id}>{stage.name}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={handleGetQuestion}
                            disabled={isSpeakingQuestion}
                            style={{
                                padding: '14px 24px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                opacity: isSpeakingQuestion ? 0.7 : 1
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Câu hỏi mới
                        </button>
                    </div>
                </div>

                {/* Step 1: Question Display */}
                {currentQuestion && (
                    <div className="speaking-card slide-up">
                        <div
                            className="speaking-card-header"
                            style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}
                            onClick={() => setShowQuestion(!showQuestion)}
                            title="Nhấn để hiện/ẩn câu hỏi"
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div className="speaking-card-icon listen">
                                    <HeadphonesIcon />
                                </div>
                                <span className="speaking-card-title" style={{ margin: 0 }}>Bước 1: Nghe câu hỏi</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {!showQuestion && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            speakQuestion(currentQuestion.question_text);
                                        }}
                                        style={{
                                            background: isSpeakingQuestion ? 'var(--primary)' : 'rgba(99, 102, 241, 0.1)',
                                            color: isSpeakingQuestion ? 'white' : 'var(--primary)',
                                            border: 'none',
                                            padding: '8px 16px',
                                            borderRadius: '50px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            fontSize: '0.9rem',
                                            fontWeight: 500,
                                            transition: 'all 0.2s',
                                            opacity: 0.9
                                        }}
                                        title="Nghe lại câu hỏi"
                                    >
                                        <span className={isSpeakingQuestion ? 'animate-pulse' : ''}>🔊</span>
                                        {isSpeakingQuestion ? 'Đang đọc' : 'Nghe lại'}
                                    </button>
                                )}
                                <div style={{
                                    transform: showQuestion ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.3s ease',
                                    color: 'var(--text)',
                                    opacity: 0.7,
                                    display: 'flex'
                                }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {showQuestion && (
                            <div style={{ textAlign: 'center', padding: '20px 0', borderTop: '1px solid var(--bg-hover)' }}>
                                <h2 style={{
                                    fontSize: '1.8rem',
                                    fontWeight: 'bold',
                                    background: 'linear-gradient(90deg, #fff, #cbd5e1)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    marginBottom: '24px',
                                    lineHeight: 1.4
                                }}>
                                    {currentQuestion.question_text}
                                </h2>

                                <button
                                    onClick={() => speakQuestion(currentQuestion.question_text)}
                                    style={{
                                        background: isSpeakingQuestion ? 'var(--primary)' : 'var(--bg-hover)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '12px 24px',
                                        borderRadius: '50px',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        fontSize: '1rem',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {isSpeakingQuestion ? (
                                        <>
                                            <span className="animate-pulse">🔊</span> Đang đọc...
                                        </>
                                    ) : (
                                        <>
                                            <span>🔊</span> Nghe lại
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 2: Answer Recorder */}
                {currentQuestion && (
                    <div className="speaking-card slide-up" style={{ animationDelay: '0.1s' }}>
                        <div className="speaking-card-header">
                            <div className="speaking-card-icon speak">
                                <MicIcon />
                            </div>
                            <span className="speaking-card-title">Bước 2: Trả lời câu hỏi</span>
                        </div>

                        <div className="text-center mb-6">
                            <p className="text-muted" style={{ fontStyle: 'italic' }}>
                                Bấm ghi âm và trả lời câu hỏi trên. Hãy nói tự nhiên và đầy đủ câu nhất có thể.
                            </p>
                        </div>

                        <VoiceRecorder onRecordingComplete={handleRecordingComplete} />

                        {recording && !analyzing && !analysisResult && (
                            <div className="text-center mt-8 slide-up">
                                <button
                                    className="btn"
                                    onClick={handleAnalyze}
                                    style={{
                                        fontSize: '1.1rem',
                                        padding: '16px 32px',
                                        background: 'linear-gradient(135deg, #0D9488, #2DD4BF)',
                                        color: 'white',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 10
                                    }}
                                >
                                    <SparklesIcon />
                                    Chấm điểm câu trả lời
                                </button>
                            </div>
                        )}

                        {analyzing && (
                            <div className="text-center mt-8">
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: '20px 32px',
                                    background: 'var(--bg-dark)',
                                    borderRadius: 'var(--radius-lg)'
                                }}>
                                    <div style={{
                                        width: 24,
                                        height: 24,
                                        border: '3px solid var(--bg-hover)',
                                        borderTopColor: '#0D9488',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite'
                                    }} />
                                    <span>Đang phân tích câu trả lời... (10-30s)</span>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="mt-8 slide-up" style={{
                                padding: 16,
                                background: 'rgba(239, 68, 68, 0.1)',
                                borderRadius: 'var(--radius-md)',
                                borderLeft: '4px solid #EF4444',
                                color: '#EF4444',
                                textAlign: 'center'
                            }}>
                                {error}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 3: Analysis Result */}
                {analysisResult && (
                    <div className="speaking-card slide-up" style={{
                        background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.05), rgba(99, 102, 241, 0.05))',
                        borderColor: '#0D9488'
                    }}>
                        <div className="speaking-card-header">
                            <div className="speaking-card-icon analyze">
                                <SparklesIcon />
                            </div>
                            <span className="speaking-card-title">Bước 3: Kết quả & Góp ý</span>
                        </div>

                        {/* Score Circle */}
                        {analysisResult.analysis?.overallScore > 0 && (
                            <ScoreCircle score={analysisResult.analysis.overallScore} />
                        )}

                        {/* What you said */}
                        {analysisResult.transcript && (
                            <div className="feedback-section" style={{ marginTop: 20 }}>
                                <div className="feedback-section-title">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                    </svg>
                                    Bạn đã trả lời:
                                </div>
                                <div className="feedback-section-content" style={{ fontStyle: 'italic' }}>
                                    "{analysisResult.transcript}"
                                </div>
                            </div>
                        )}

                        {/* Sample Answer if available */}
                        {currentQuestion?.sample_answer && (
                            <div className="feedback-section" style={{ marginTop: 20, borderColor: 'var(--primary)' }}>
                                <div className="feedback-section-title" style={{ color: 'var(--primary-light)' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14,2 14,8 20,8" />
                                        <line x1="16" y1="13" x2="8" y2="13" />
                                        <line x1="16" y1="17" x2="8" y2="17" />
                                    </svg>
                                    Câu trả lời mẫu:
                                </div>
                                <div className="feedback-section-content">
                                    {currentQuestion.sample_answer}
                                </div>
                            </div>
                        )}

                        {/* Metrics */}
                        {analysisResult.metrics && (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: 12,
                                marginTop: 20
                            }}>
                                <div style={{
                                    background: 'var(--bg-dark)',
                                    padding: 16,
                                    borderRadius: 'var(--radius-md)',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                                        {analysisResult.metrics.duration}s
                                    </div>
                                    <div className="text-muted" style={{ fontSize: '0.85rem' }}>Thời lượng</div>
                                </div>
                                <div style={{
                                    background: 'var(--bg-dark)',
                                    padding: 16,
                                    borderRadius: 'var(--radius-md)',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                                        {analysisResult.metrics.wordCount}
                                    </div>
                                    <div className="text-muted" style={{ fontSize: '0.85rem' }}>Số từ</div>
                                </div>
                                <div style={{
                                    background: 'var(--bg-dark)',
                                    padding: 16,
                                    borderRadius: 'var(--radius-md)',
                                    textAlign: 'center'
                                }}>
                                    <div style={{
                                        fontSize: '1.5rem',
                                        fontWeight: 700,
                                        color: analysisResult.metrics.speakingRate >= 100
                                            ? '#10B981' : '#F59E0B'
                                    }}>
                                        {analysisResult.metrics.speakingRate}
                                    </div>
                                    <div className="text-muted" style={{ fontSize: '0.85rem' }}>Từ/phút</div>
                                </div>
                            </div>
                        )}

                        {/* AI Feedback */}
                        {analysisResult.analysis?.feedback && (
                            <div className="feedback-section" style={{ marginTop: 20 }}>
                                <div className="feedback-section-title">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                                        <line x1="12" y1="17" x2="12.01" y2="17" />
                                    </svg>
                                    Cố vấn AI:
                                </div>
                                <div className="feedback-section-content" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                                    {analysisResult.analysis.feedback}
                                </div>
                            </div>
                        )}

                        {/* Encouragement */}
                        {analysisResult.analysis?.overallScore > 0 && (
                            <div className="encouragement">
                                <div className="encouragement-emoji">
                                    {getEncouragement(analysisResult.analysis.overallScore).emoji}
                                </div>
                                <div className="encouragement-text">
                                    {getEncouragement(analysisResult.analysis.overallScore).text}
                                </div>
                            </div>
                        )}

                        {/* Next Action */}
                        <div className="text-center mt-8">
                            <button
                                className="btn btn-primary"
                                onClick={handleGetQuestion}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                            >
                                Câu hỏi tiếp theo
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                    <polyline points="12,5 19,12 12,19" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
