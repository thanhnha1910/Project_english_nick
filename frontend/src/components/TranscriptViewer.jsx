import { useState, useEffect } from 'react';
import { getShuffledTranscript, getTranscript, analyzeSpeaking, pollAnalysisResult } from '../services/api';
import VoiceRecorder from './VoiceRecorder';

// Icons
const MicIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
);

const SparklesIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
    </svg>
);

// Score Circle Component
const ScoreCircle = ({ score }) => {
    const circumference = 2 * Math.PI * 26;
    const offset = circumference - (score / 100) * circumference;
    const scoreClass = score >= 70 ? 'excellent' : score >= 50 ? 'good' : 'needs-work';

    let color = score >= 70 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444';

    return (
        <div style={{ position: 'relative', width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="60" height="60" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="30" cy="30" r="26" fill="transparent" stroke="var(--bg-hover)" strokeWidth="6" />
                <circle
                    cx="30" cy="30" r="26"
                    fill="transparent"
                    stroke={color}
                    strokeWidth="6"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                />
            </svg>
            <div style={{
                position: 'absolute',
                fontSize: '1rem',
                fontWeight: 'bold',
                color: color
            }}>
                {score}
            </div>
        </div>
    );
};

export default function TranscriptViewer({ audioId, audioTitle }) {
    const [transcript, setTranscript] = useState(null);
    const [shuffledLines, setShuffledLines] = useState([]);
    const [isShuffled, setIsShuffled] = useState(false);
    const [loading, setLoading] = useState(false);
    const [userOrder, setUserOrder] = useState([]);
    const [showResult, setShowResult] = useState(false);
    const [hideText, setHideText] = useState(false);

    // Speaking state
    const [practicingLine, setPracticingLine] = useState(null); // index of the line being practiced
    const [recording, setRecording] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisResults, setAnalysisResults] = useState({}); // store results by line index
    const [error, setError] = useState(null);

    useEffect(() => {
        if (audioId) {
            loadTranscript();
        }
    }, [audioId]);

    const loadTranscript = async () => {
        try {
            setLoading(true);
            const res = await getTranscript(audioId);
            setTranscript(res.data.transcript);
            setIsShuffled(false);
            setUserOrder([]);
            setShowResult(false);

            // Reset practicing state
            setPracticingLine(null);
            setRecording(null);
            setAnalysisResults({});
            setError(null);
        } catch (err) {
            console.error('Error loading transcript:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleShuffle = async () => {
        try {
            setLoading(true);
            const res = await getShuffledTranscript(audioId);
            setShuffledLines(res.data.lines);
            setIsShuffled(true);
            setUserOrder([]);
            setShowResult(false);
            setPracticingLine(null);
        } catch (err) {
            console.error('Error shuffling transcript:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLineClick = (line) => {
        if (!showResult) {
            // Thêm vào thứ tự của user
            if (!userOrder.find(l => l.index === line.index)) {
                setUserOrder([...userOrder, line]);
            }
        }
    };

    const handleCheckOrder = () => {
        setShowResult(true);
    };

    const handleReset = () => {
        setUserOrder([]);
        setShowResult(false);
    };

    // Speaking handlers
    const handleStartPractice = (idx) => {
        setPracticingLine(idx === practicingLine ? null : idx);
        setRecording(null);
        setError(null);
    };

    const handleRecordingComplete = (blob) => {
        setRecording(blob);
    };

    const handleAnalyze = async (sentence, idx) => {
        if (!recording || !sentence) return;

        try {
            setAnalyzing(true);
            setError(null);

            // Context for AI: "Reference text: [sentence]"
            const referenceText = `Reference sentence: ${sentence}`;

            const startRes = await analyzeSpeaking(recording, referenceText, 'en');

            if (!startRes.data.success) {
                throw new Error('Failed to start analysis');
            }

            const result = await pollAnalysisResult(startRes.data.jobId);

            // Save result for this line
            setAnalysisResults(prev => ({
                ...prev,
                [idx]: result
            }));

            // Auto close recorder on success
            setPracticingLine(null);
            setRecording(null);

        } catch (err) {
            console.error('Error analyzing:', err);
            setError('Lỗi khi phân tích. Vui lòng thử lại.');
        } finally {
            setAnalyzing(false);
        }
    };

    if (loading) {
        return <div className="transcript text-center text-muted">Đang tải...</div>;
    }

    if (!transcript && !isShuffled) {
        return (
            <div className="transcript text-center">
                <p className="text-muted">Không có transcript</p>
            </div>
        );
    }

    const sentences = transcript ? transcript.split('.').filter(s => s.trim()) : [];

    return (
        <div className="transcript fade-in">
            <div className="flex justify-between items-center mb-4">
                <h4>{isShuffled ? '🔀 Sắp xếp câu đúng thứ tự' : '📝 Transcript & Luyện Nói'}</h4>
                <div className="flex gap-4">
                    {isShuffled ? (
                        <>
                            <button className="btn btn-secondary" onClick={handleReset}>
                                Làm lại
                            </button>
                            <button className="btn btn-accent" onClick={handleCheckOrder}>
                                Kiểm tra
                            </button>
                            <button className="btn btn-primary" onClick={loadTranscript}>
                                Xem bài học
                            </button>
                        </>
                    ) : (
                        <>
                            <button className="btn btn-secondary" onClick={() => setHideText(!hideText)}>
                                {hideText ? '👁️ Hiện chữ' : '🙈 Ẩn chữ'}
                            </button>
                            <button className="btn btn-primary" onClick={handleShuffle}>
                                🔀 Trộn để ôn tập
                            </button>
                        </>
                    )}
                </div>
            </div>

            {isShuffled ? (
                <>
                    {/* User's ordered list */}
                    {userOrder.length > 0 && (
                        <div className="mb-4">
                            <p className="text-muted mb-4">Thứ tự bạn chọn:</p>
                            {userOrder.map((line, idx) => (
                                <div
                                    key={`user-${idx}`}
                                    className={`transcript-line shuffled ${showResult ? (idx === line.original_index ? 'correct' : 'incorrect') : ''}`}
                                    style={{
                                        borderLeftColor: showResult
                                            ? (idx === line.original_index ? 'var(--accent)' : 'var(--secondary)')
                                            : 'var(--primary)'
                                    }}
                                >
                                    <span className="index">{idx + 1}</span>
                                    {line.text}.
                                    {showResult && (
                                        <span style={{ marginLeft: 8, fontSize: '0.85rem' }}>
                                            {idx === line.original_index ? ' ✅' : ` ❌ (đáp án: ${line.original_index + 1})`}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Shuffled lines to pick from */}
                    <p className="text-muted mb-4">Click vào câu theo thứ tự đúng:</p>
                    {shuffledLines
                        .filter(line => !userOrder.find(l => l.index === line.index))
                        .map((line) => (
                            <div
                                key={line.index}
                                className="transcript-line shuffled"
                                onClick={() => handleLineClick(line)}
                            >
                                {line.text}.
                            </div>
                        ))}
                </>
            ) : (
                // Original transcript with speaking practice
                <div className={hideText ? 'hide-text-mode' : ''}>
                    {sentences.map((sentence, idx) => (
                        <div key={idx} style={{ marginBottom: 16 }}>
                            <div className="transcript-line" style={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', flex: 1, minWidth: 200, alignItems: 'center' }}>
                                    <span className="index">{idx + 1}</span>
                                    <span className="sentence-text" style={{ flex: 1, transition: 'all 0.3s ease' }}>{sentence.trim()}.</span>
                                </div>

                                <button
                                    onClick={() => handleStartPractice(idx)}
                                    className="btn btn-secondary"
                                    style={{
                                        padding: '6px 12px',
                                        fontSize: '0.85rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        background: practicingLine === idx ? 'var(--primary)' : 'var(--bg-hover)',
                                        color: practicingLine === idx ? 'white' : 'var(--text)',
                                        borderColor: practicingLine === idx ? 'var(--primary)' : 'var(--border)'
                                    }}
                                >
                                    <MicIcon />
                                    {practicingLine === idx ? 'Đóng' : 'Luyện nói'}
                                </button>
                            </div>

                            {/* Speaking Practice Panel */}
                            {practicingLine === idx && (
                                <div className="card slide-up" style={{
                                    marginTop: 8,
                                    marginLeft: 40,
                                    padding: '16px 20px',
                                    background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.05), rgba(99, 102, 241, 0.05))',
                                    borderColor: 'var(--primary-light)'
                                }}>
                                    <h5 className="mb-4 text-center" style={{ color: 'var(--primary-light)' }}>
                                        🎤 Ghi âm câu nói trên để chấm điểm
                                    </h5>

                                    <VoiceRecorder onRecordingComplete={handleRecordingComplete} />

                                    {recording && !analyzing && (
                                        <div className="text-center mt-4 slide-up">
                                            <button
                                                className="btn"
                                                onClick={() => handleAnalyze(sentence.trim(), idx)}
                                                style={{
                                                    fontSize: '0.9rem',
                                                    padding: '10px 20px',
                                                    background: 'linear-gradient(135deg, #0D9488, #2DD4BF)',
                                                    color: 'white',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 8
                                                }}
                                            >
                                                <SparklesIcon />
                                                Chấm điểm phát âm
                                            </button>
                                        </div>
                                    )}

                                    {analyzing && (
                                        <div className="text-center mt-4">
                                            <div style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 12,
                                                padding: '12px 20px',
                                                background: 'var(--bg-dark)',
                                                borderRadius: 'var(--radius-md)'
                                            }}>
                                                <div style={{
                                                    width: 18,
                                                    height: 18,
                                                    border: '2px solid var(--bg-hover)',
                                                    borderTopColor: '#0D9488',
                                                    borderRadius: '50%',
                                                    animation: 'spin 1s linear infinite'
                                                }} />
                                                <span style={{ fontSize: '0.9rem' }}>Đang phân tích... (10-30s)</span>
                                            </div>
                                        </div>
                                    )}

                                    {error && (
                                        <div className="mt-4 text-center" style={{ color: '#EF4444', fontSize: '0.9rem' }}>
                                            {error}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Analysis Result Display */}
                            {analysisResults[idx] && (
                                <div className="card slide-up flex gap-4" style={{
                                    marginTop: 8,
                                    marginLeft: 40,
                                    padding: '16px 20px',
                                    background: 'var(--bg-dark)',
                                    alignItems: 'flex-start'
                                }}>
                                    <ScoreCircle score={analysisResults[idx].analysis?.overallScore || 0} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ marginBottom: 8 }}>
                                            <span className="text-muted" style={{ fontSize: '0.85rem' }}>Bạn đọc: </span>
                                            <span style={{ fontStyle: 'italic', fontWeight: 500 }}>"{analysisResults[idx].transcript}"</span>
                                        </div>
                                        {analysisResults[idx].analysis?.feedback && (
                                            <div style={{
                                                fontSize: '0.9rem',
                                                color: 'var(--text-dim)',
                                                background: 'var(--bg-card)',
                                                padding: '8px 12px',
                                                borderRadius: 6,
                                                lineHeight: 1.5,
                                                whiteSpace: 'pre-wrap'
                                            }}>
                                                <strong>AI Phản hồi:</strong><br />
                                                {analysisResults[idx].analysis.feedback}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        className="btn btn-secondary btn-icon"
                                        onClick={() => {
                                            const newResults = { ...analysisResults };
                                            delete newResults[idx];
                                            setAnalysisResults(newResults);
                                        }}
                                        title="Xóa kết quả"
                                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .hide-text-mode .sentence-text {
                    opacity: 0.1;
                    filter: blur(4px);
                    user-select: none;
                }

                .hide-text-mode .transcript-line:hover .sentence-text {
                    opacity: 1;
                    filter: blur(0);
                    user-select: auto;
                }
            `}</style>
        </div>
    );
}

