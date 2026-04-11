import { useState, useEffect } from 'react';
import { getRandomAudios, getStages } from '../services/api';
import AudioPlayer from '../components/AudioPlayer';
import TranscriptViewer from '../components/TranscriptViewer';
import MultiSelect from '../components/MultiSelect';
export default function RandomPractice() {
    const [stages, setStages] = useState([]);
    const [selectedStages, setSelectedStages] = useState([]);
    const [audioQueue, setAudioQueue] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [count, setCount] = useState(10);
    const [isPlaying, setIsPlaying] = useState(false);
    const [completed, setCompleted] = useState(0);

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

    const handleMix = async () => {
        try {
            const finalCount = (count === '' || count < 1) ? 10 : count;
            const res = await getRandomAudios(finalCount, selectedStages);
            setAudioQueue(res.data);
            setCurrentIndex(0);
            setCompleted(0);
            setIsPlaying(true);
        } catch (err) {
            console.error('Error getting random audios:', err);
        }
    };

    const handleAudioEnded = () => {
        setCompleted(prev => prev + 1);
        if (currentIndex < audioQueue.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            setIsPlaying(false);
        }
    };

    const handleNext = () => {
        if (currentIndex < audioQueue.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setCompleted(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setCompleted(prev => prev - 1);
        }
    };

    const currentAudio = audioQueue[currentIndex];
    const progress = audioQueue.length > 0 ? ((completed) / audioQueue.length) * 100 : 0;

    return (
        <div className="page fade-in">
            <div className="page-header">
                <h1 className="page-title">🔀 Luyện nghe Random</h1>
                <p className="page-subtitle">Mix audio ngẫu nhiên để test khả năng nghe</p>
            </div>

            <div className="container">
                {/* Controls */}
                <div className="card mb-8">
                    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 200 }}>
                            <label className="text-muted" style={{ display: 'block', marginBottom: 8 }}>
                                Số lượng audio:
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="50"
                                value={count}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '') {
                                        setCount(''); // Allow clearing
                                    } else {
                                        setCount(parseInt(val));
                                    }
                                }}
                                onBlur={() => {
                                    if (count === '' || count < 1) setCount(1);
                                    else if (count > 50) setCount(50);
                                }}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    background: 'var(--bg-dark)',
                                    border: '1px solid var(--bg-hover)',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--text)',
                                    fontSize: '1rem' // Standard font size
                                }}
                            />
                        </div>

                        <div style={{ flex: 1, minWidth: 200 }}>
                            <label className="text-muted" style={{ display: 'block', marginBottom: 8 }}>
                                Lọc theo giai đoạn:
                            </label>
                            <MultiSelect
                                options={stages.map(s => ({ value: s.id, label: s.name }))}
                                selected={selectedStages}
                                onChange={setSelectedStages}
                                placeholder="Tất cả giai đoạn"
                            />
                        </div>

                        <button className="btn btn-primary" onClick={handleMix}>
                            🔀 Mix Random
                        </button>
                    </div>
                </div>

                {/* Progress */}
                {audioQueue.length > 0 && (
                    <div className="card mb-8">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-muted">Tiến độ</span>
                            <span style={{ color: 'var(--accent)' }}>
                                {completed}/{audioQueue.length} audio
                            </span>
                        </div>
                        <div className="progress-bar" style={{ height: 8 }}>
                            <div className="progress-fill" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                )}

                {/* Player */}
                {currentAudio ? (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-muted">
                                Audio {currentIndex + 1} / {audioQueue.length}
                            </span>
                            <div className="flex gap-4">
                                <button
                                    className="btn btn-secondary"
                                    onClick={handlePrev}
                                    disabled={currentIndex === 0}
                                >
                                    ← Trước
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={handleNext}
                                    disabled={currentIndex === audioQueue.length - 1}
                                >
                                    Sau →
                                </button>
                            </div>
                        </div>

                        <AudioPlayer
                            audio={currentAudio}
                            onEnded={handleAudioEnded}
                        />

                        <TranscriptViewer
                            audioId={currentAudio.id}
                            audioTitle={currentAudio.title}
                        />
                    </div>
                ) : (
                    <div className="card text-center">
                        <p className="text-muted">
                            Nhấn "Mix Random" để bắt đầu luyện nghe
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
