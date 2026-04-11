import { useState, useEffect } from 'react';
import { getStages, getAudiosByStage } from '../services/api';
import AudioPlayer from '../components/AudioPlayer';
import TranscriptViewer from '../components/TranscriptViewer';

export default function StageLearning() {
    const [stages, setStages] = useState([]);
    const [selectedStage, setSelectedStage] = useState(null);
    const [audios, setAudios] = useState([]);
    const [originalAudios, setOriginalAudios] = useState([]); // Keep original order
    const [selectedAudio, setSelectedAudio] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [autoPlayNext, setAutoPlayNext] = useState(true); // Toggle auto-play
    const [isShuffled, setIsShuffled] = useState(false); // Shuffle mode

    useEffect(() => {
        loadStages();
    }, []);

    const loadStages = async () => {
        try {
            const res = await getStages('mixed');
            setStages(res.data);
        } catch (err) {
            console.error('Error loading stages:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleStageSelect = async (stage) => {
        setSelectedStage(stage);
        setSelectedAudio(null);
        setCurrentIndex(0);
        setIsShuffled(false);
        try {
            const res = await getAudiosByStage(stage.id);
            setAudios(res.data);
            setOriginalAudios(res.data); // Store original order
            // Auto select first audio
            if (res.data.length > 0) {
                setSelectedAudio(res.data[0]);
                setCurrentIndex(0);
            }
        } catch (err) {
            console.error('Error loading audios:', err);
        }
    };

    const handleAudioSelect = (audio, index) => {
        setSelectedAudio(audio);
        setCurrentIndex(index);
    };

    const handleNext = () => {
        if (currentIndex < audios.length - 1) {
            const nextIndex = currentIndex + 1;
            setCurrentIndex(nextIndex);
            setSelectedAudio(audios[nextIndex]);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            const prevIndex = currentIndex - 1;
            setCurrentIndex(prevIndex);
            setSelectedAudio(audios[prevIndex]);
        }
    };

    const handleAudioEnded = () => {
        // Only auto play next if toggle is ON
        if (autoPlayNext) {
            handleNext();
        }
    };

    // Shuffle function
    const handleShuffle = () => {
        if (isShuffled) {
            // Restore original order
            setAudios(originalAudios);
            setIsShuffled(false);
            setCurrentIndex(0);
            if (originalAudios.length > 0) {
                setSelectedAudio(originalAudios[0]);
            }
        } else {
            // Shuffle
            const shuffled = [...audios].sort(() => Math.random() - 0.5);
            setAudios(shuffled);
            setIsShuffled(true);
            setCurrentIndex(0);
            if (shuffled.length > 0) {
                setSelectedAudio(shuffled[0]);
            }
        }
    };

    if (loading) {
        return (
            <div className="page text-center">
                <p className="text-muted">Đang tải...</p>
            </div>
        );
    }

    return (
        <div className="page fade-in">
            <div className="page-header">
                <h1 className="page-title">📚 Học theo giai đoạn</h1>
                <p className="page-subtitle">Chọn giai đoạn phù hợp với trình độ của bạn</p>
            </div>

            {!selectedStage ? (
                // Stage selection
                <div className="container">
                    {stages.length === 0 ? (
                        <div className="card text-center">
                            <p className="text-muted mb-4">Chưa có giai đoạn nào.</p>
                            <a href="/import" className="btn btn-primary">+ Thêm audio</a>
                        </div>
                    ) : (
                        <div className="grid grid-3">
                            {stages.map((stage, index) => (
                                <div
                                    key={stage.id}
                                    className="card stage-card"
                                    onClick={() => handleStageSelect(stage)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className="stage-number">{index + 1}</div>
                                    <h3 className="stage-title">{stage.name}</h3>
                                    <p className="stage-desc">{stage.description || 'Không có mô tả'}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                // Audio detail view - IMPROVED LAYOUT
                <div className="container">
                    <button
                        className="btn btn-secondary mb-4"
                        onClick={() => { setSelectedStage(null); setAudios([]); }}
                    >
                        ← Quay lại
                    </button>

                    {/* Header with navigation */}
                    <div className="card mb-4" style={{
                        background: 'var(--gradient-primary)',
                        padding: '20px 24px',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <div>
                                <h2 style={{ margin: 0, color: 'white' }}>
                                    {selectedStage.name}
                                    {isShuffled && <span style={{ fontSize: '0.8rem', marginLeft: 8, opacity: 0.8 }}>🔀 Random</span>}
                                </h2>
                                <p style={{ margin: '4px 0 0', opacity: 0.8, color: 'white' }}>
                                    {currentIndex + 1} / {audios.length} audio
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    className="btn btn-icon"
                                    onClick={handlePrev}
                                    disabled={currentIndex === 0}
                                    style={{
                                        background: 'rgba(255,255,255,0.2)',
                                        color: 'white',
                                        opacity: currentIndex === 0 ? 0.5 : 1
                                    }}
                                >
                                    ←
                                </button>
                                <button
                                    className="btn btn-icon"
                                    onClick={handleNext}
                                    disabled={currentIndex === audios.length - 1}
                                    style={{
                                        background: 'rgba(255,255,255,0.2)',
                                        color: 'white',
                                        opacity: currentIndex === audios.length - 1 ? 0.5 : 1
                                    }}
                                >
                                    →
                                </button>
                            </div>
                        </div>

                        {/* Controls row */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 16,
                            paddingTop: 12,
                            borderTop: '1px solid rgba(255,255,255,0.2)'
                        }}>
                            {/* Shuffle button */}
                            <button
                                onClick={handleShuffle}
                                style={{
                                    background: isShuffled ? 'white' : 'rgba(255,255,255,0.2)',
                                    color: isShuffled ? 'var(--primary)' : 'white',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: 20,
                                    cursor: 'pointer',
                                    fontWeight: 500,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}
                            >
                                🔀 {isShuffled ? 'Đang Random' : 'Random'}
                            </button>

                            {/* Auto-play toggle */}
                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                color: 'white',
                                cursor: 'pointer'
                            }}>
                                <input
                                    type="checkbox"
                                    checked={autoPlayNext}
                                    onChange={(e) => setAutoPlayNext(e.target.checked)}
                                    style={{
                                        width: 18,
                                        height: 18,
                                        accentColor: 'var(--accent)'
                                    }}
                                />
                                <span style={{ fontSize: '0.9rem' }}>Tự động chuyển bài</span>
                            </label>
                        </div>
                    </div>


                    <div className="stage-learning-layout">
                        {/* Audio list - SCROLLABLE SIDEBAR */}
                        <div className="card stage-audio-sidebar">
                            <div style={{
                                padding: '16px 20px',
                                borderBottom: '1px solid var(--bg-hover)',
                                background: 'var(--bg-dark)'
                            }}>
                                <h4 style={{ margin: 0 }}>📋 Audio ({audios.length})</h4>
                            </div>

                            <div style={{
                                flex: 1,
                                overflowY: 'auto',
                                padding: '8px'
                            }}>
                                {audios.length === 0 ? (
                                    <p className="text-muted" style={{ padding: 16 }}>Chưa có audio.</p>
                                ) : (
                                    audios.map((audio, index) => (
                                        <div
                                            key={audio.id}
                                            className={`audio-item ${selectedAudio?.id === audio.id ? 'active' : ''}`}
                                            onClick={() => handleAudioSelect(audio, index)}
                                            style={{
                                                padding: '12px 16px',
                                                marginBottom: 4,
                                                borderRadius: 8
                                            }}
                                        >
                                            <div style={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: '50%',
                                                background: selectedAudio?.id === audio.id
                                                    ? 'var(--gradient-primary)'
                                                    : 'var(--bg-hover)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.85rem',
                                                color: 'white',
                                                flexShrink: 0
                                            }}>
                                                {index + 1}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
                                                <div style={{
                                                    fontWeight: 500,
                                                    fontSize: '0.9rem',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis'
                                                }}>
                                                    {audio.title}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Player & Transcript - STICKY */}
                        <div style={{ position: 'sticky', top: 100 }}>
                            {selectedAudio ? (
                                <>
                                    <AudioPlayer
                                        audio={selectedAudio}
                                        onEnded={handleAudioEnded}
                                    />
                                    <TranscriptViewer
                                        audioId={selectedAudio.id}
                                        audioTitle={selectedAudio.title}
                                    />
                                </>
                            ) : (
                                <div className="card text-center">
                                    <p className="text-muted">Chọn một audio để phát</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )
            }
        </div >
    );
}
