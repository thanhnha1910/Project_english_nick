import { useState, useRef, useEffect } from 'react';

// Microphone SVG Icon
const MicrophoneIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
);

// Stop Icon
const StopIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
);

export default function VoiceRecorder({ onRecordingComplete }) {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioUrl, setAudioUrl] = useState(null);
    const [audioLevels, setAudioLevels] = useState(Array(12).fill(8));
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);
    const analyserRef = useRef(null);
    const animationRef = useRef(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Setup audio analyser for level meter
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyserRef.current = analyser;

            // Start visualizing audio levels
            visualizeAudio();

            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
                if (onRecordingComplete) {
                    onRecordingComplete(blob);
                }
                stream.getTracks().forEach(track => track.stop());

                // Stop audio visualization
                if (animationRef.current) {
                    cancelAnimationFrame(animationRef.current);
                }
                setAudioLevels(Array(12).fill(8));
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingTime(0);
            setAudioUrl(null);

            // Timer
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error('Error accessing microphone:', err);
            alert('Không thể truy cập microphone. Vui lòng cấp quyền.');
        }
    };

    const visualizeAudio = () => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

        const updateLevels = () => {
            analyserRef.current.getByteFrequencyData(dataArray);

            // Sample 12 frequency bands
            const levels = [];
            const step = Math.floor(dataArray.length / 12);
            for (let i = 0; i < 12; i++) {
                const value = dataArray[i * step];
                // Map 0-255 to 8-40 (min-max height)
                const height = Math.max(8, (value / 255) * 40);
                levels.push(height);
            }
            setAudioLevels(levels);

            animationRef.current = requestAnimationFrame(updateLevels);
        };

        updateLevels();
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerRef.current);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleReset = () => {
        setAudioUrl(null);
        setRecordingTime(0);
        chunksRef.current = [];
        if (onRecordingComplete) {
            onRecordingComplete(null);
        }
    };

    return (
        <div style={{ textAlign: 'center', padding: '30px 20px' }}>
            {/* Large Recording Button */}
            <button
                className={`record-btn-large ${isRecording ? 'recording' : ''}`}
                onClick={isRecording ? stopRecording : startRecording}
                title={isRecording ? 'Nhấn để dừng' : 'Nhấn để ghi âm'}
            >
                <span className="pulse-ring"></span>
                <span className="pulse-ring" style={{ animationDelay: '0.5s' }}></span>
                {isRecording ? <StopIcon /> : <MicrophoneIcon />}
            </button>

            {/* Timer Display */}
            <div className={`recording-timer ${isRecording ? 'active' : ''}`}>
                {formatTime(recordingTime)}
            </div>

            {/* Status Text */}
            <div className="recording-status">
                <span className={`dot ${isRecording ? 'recording' : audioUrl ? 'done' : ''}`}></span>
                {isRecording ? (
                    <span>Đang ghi âm...</span>
                ) : audioUrl ? (
                    <span style={{ color: 'var(--accent)' }}>Đã ghi âm xong!</span>
                ) : (
                    <span>Nhấn nút để bắt đầu ghi âm</span>
                )}
            </div>

            {/* Audio Level Meter */}
            <div className="audio-level-meter">
                {audioLevels.map((height, index) => (
                    <div
                        key={index}
                        className={`audio-level-bar ${!isRecording ? 'inactive' : ''}`}
                        style={{ height: isRecording ? `${height}px` : '8px' }}
                    />
                ))}
            </div>

            {/* Playback and Actions */}
            {audioUrl && (
                <div className="mt-8 fade-in">
                    <audio
                        controls
                        src={audioUrl}
                        style={{
                            width: '100%',
                            marginBottom: 16,
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--bg-dark)'
                        }}
                    />
                    <button className="btn btn-secondary" onClick={handleReset}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 4v6h6" />
                            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                        </svg>
                        Ghi âm lại
                    </button>
                </div>
            )}
        </div>
    );
}
