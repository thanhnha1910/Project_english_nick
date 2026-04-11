import { useState, useEffect } from 'react';
import { getStages, getAudiosByStage } from '../services/api';
import AudioPlayer from '../components/AudioPlayer';
import TranscriptViewer from '../components/TranscriptViewer';

export default function ParagraphListening() {
    const [stages, setStages] = useState([]);
    const [selectedStage, setSelectedStage] = useState(null);
    const [audios, setAudios] = useState([]);
    const [selectedAudio, setSelectedAudio] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStages();
    }, []);

    const loadStages = async () => {
        try {
            const res = await getStages('paragraph');
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
        try {
            const res = await getAudiosByStage(stage.id);
            setAudios(res.data);
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
                <h1 className="page-title">🎧 Nghe theo nguyên đoạn</h1>
                <p className="page-subtitle">Chế độ luyện nghe đặc biệt: focus nguyên đoạn</p>
            </div>

            {!selectedStage ? (
                <div className="container">
                    {stages.length === 0 ? (
                        <div className="card text-center">
                            <p className="text-muted mb-4">Chưa có giai đoạn nào.</p>
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
                <div className="container">
                    <button
                        className="btn btn-secondary mb-4"
                        onClick={() => { setSelectedStage(null); setAudios([]); }}
                    >
                        ← Quay lại
                    </button>

                    <div className="card mb-4" style={{
                        background: 'var(--gradient-primary)',
                        padding: '20px 24px',
                    }}>
                        <h2 style={{ margin: 0, color: 'white' }}>
                            {selectedStage.name} - Nghe Nguyên Đoạn
                        </h2>
                    </div>

                    <div className="stage-learning-layout">
                        {/* Audio list */}
                        <div className="card stage-audio-sidebar">
                            <div style={{
                                padding: '16px 20px',
                                borderBottom: '1px solid var(--bg-hover)',
                                background: 'var(--bg-dark)'
                            }}>
                                <h4 style={{ margin: 0 }}>📋 Danh sách đoạn ({audios.length})</h4>
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
                                                borderRadius: 8,
                                                cursor: 'pointer'
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

                        {/* Player Area focused on paragraph listening */}
                        <div className="stage-player-container">
                            {selectedAudio ? (
                                <>
                                    <AudioPlayer
                                        audio={selectedAudio}
                                    />
                                    {/* For paragraph listening we can just show transcript without breaking it down if needed, but we start with standard TranscriptViewer */}
                                    <div style={{ marginTop: 24 }}>
                                        <TranscriptViewer
                                            audioId={selectedAudio.id}
                                            audioTitle={selectedAudio.title}
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="card text-center">
                                    <p className="text-muted">Chọn đoạn hội thoại để nghe</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
