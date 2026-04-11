import { useState, useRef, useEffect } from 'react';

// Play Icon
const PlayIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor">
        <polygon points="5,3 19,12 5,21" />
    </svg>
);

// Pause Icon
const PauseIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="4" width="4" height="16" rx="1" />
        <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
);

// Replay Icon
const ReplayIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 4v6h6" />
        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
);

// Volume Icon
const VolumeIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
);

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5];

export default function AudioPlayer({ audio, onEnded }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const audioRef = useRef(null);

    useEffect(() => {
        if (audio && audioRef.current) {
            audioRef.current.src = `http://localhost:8000/${audio.file_path}`;
            audioRef.current.load();
            setIsPlaying(false);
            setCurrentTime(0);
        }
    }, [audio]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = playbackSpeed;
        }
    }, [playbackSpeed]);

    const togglePlay = () => {
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleTimeUpdate = () => {
        setCurrentTime(audioRef.current.currentTime);
    };

    const handleLoadedMetadata = () => {
        setDuration(audioRef.current.duration);
    };

    const handleSeek = (e) => {
        const rect = e.target.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const newTime = percent * duration;
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const handleReplay = () => {
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
        audioRef.current.play();
        setIsPlaying(true);
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        if (onEnded) onEnded();
    };

    const formatTime = (time) => {
        if (isNaN(time)) return '0:00';
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    if (!audio) {
        return (
            <div className="speaking-empty-state">
                <div className="speaking-empty-icon">🎧</div>
                <p className="speaking-empty-text">
                    Nhấn "Audio ngẫu nhiên" để bắt đầu luyện nói
                </p>
            </div>
        );
    }

    return (
        <div className="fade-in" style={{ padding: '8px 0' }}>
            <audio
                ref={audioRef}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleEnded}
            />

            {/* Audio Info */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                marginBottom: 24
            }}>
                <div style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    background: 'linear-gradient(135deg, #6366F1, #818CF8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    flexShrink: 0
                }}>
                    <VolumeIcon />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{
                        margin: 0,
                        marginBottom: 4,
                        fontSize: '1.1rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}>
                        {audio.title}
                    </h3>
                    {audio.stage && (
                        <span className="text-muted" style={{ fontSize: '0.9rem' }}>
                            {audio.stage.name}
                        </span>
                    )}
                </div>
            </div>

            {/* Progress Bar */}
            <div style={{ marginBottom: 20 }}>
                <div
                    className="progress-bar"
                    onClick={handleSeek}
                    style={{ height: 8, borderRadius: 4, cursor: 'pointer' }}
                >
                    <div
                        className="progress-fill"
                        style={{
                            width: `${progress}%`,
                            borderRadius: 4,
                            transition: 'width 0.1s linear'
                        }}
                    />
                </div>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 8,
                    fontSize: '0.85rem',
                    color: 'var(--text-muted)'
                }}>
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            {/* Controls */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16
            }}>
                {/* Replay Button */}
                <button
                    onClick={handleReplay}
                    className="btn btn-secondary btn-icon"
                    style={{ width: 44, height: 44 }}
                    title="Nghe lại từ đầu"
                >
                    <ReplayIcon />
                </button>

                {/* Play/Pause Button */}
                <button
                    className="play-btn"
                    onClick={togglePlay}
                    style={{ width: 64, height: 64, fontSize: '1.5rem' }}
                >
                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                </button>

                {/* Speed Control */}
                <div className="speed-control">
                    {SPEED_OPTIONS.map(speed => (
                        <button
                            key={speed}
                            className={`speed-btn ${playbackSpeed === speed ? 'active' : ''}`}
                            onClick={() => setPlaybackSpeed(speed)}
                        >
                            {speed}x
                        </button>
                    ))}
                </div>
            </div>

            {/* Keyboard Hints */}
            <div style={{
                textAlign: 'center',
                marginTop: 16,
                fontSize: '0.8rem',
                color: 'var(--text-dim)'
            }}>
                <span style={{
                    padding: '4px 8px',
                    background: 'var(--bg-hover)',
                    borderRadius: 4,
                    marginRight: 8
                }}>
                    Space
                </span>
                để phát/dừng
            </div>
        </div>
    );
}
