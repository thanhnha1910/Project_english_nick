import { useState, useRef, useEffect } from 'react';
import { bulkImportAudios } from '../services/api';

export default function BulkImporter({ stages, onImportComplete, initialStageId = '' }) {
    const [files, setFiles] = useState([]);
    const [selectedStage, setSelectedStage] = useState(initialStageId);
    const [transcriptsText, setTranscriptsText] = useState('');
    const [parsedTranscripts, setParsedTranscripts] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);
    const inputRef = useRef(null);

    // Sync initial stage if it changes
    useEffect(() => {
        setSelectedStage(initialStageId || '');
    }, [initialStageId]);

    // Auto-parse transcripts when text changes
    useEffect(() => {
        if (!transcriptsText.trim()) {
            setParsedTranscripts([]);
            return;
        }

        // Split by 2 or more newlines, or by '---'
        let parts = transcriptsText
            .split(/(?:\n\s*\n|---)/)
            .map(t => t.trim())
            .filter(t => t.length > 0);

        // Fallback: If it only parsed 1 part but there are multiple files,
        // we can try splitting by single newlines if that matches the audio count better.
        if (parts.length === 1 && transcriptsText.includes('\n') && files.length > 1) {
            const singleLineParts = transcriptsText.split('\n').map(t => t.trim()).filter(t => t.length > 0);
            if (singleLineParts.length > 1) {
                parts = singleLineParts;
            }
        }

        setParsedTranscripts(parts);
    }, [transcriptsText, files]);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);

        const droppedFiles = Array.from(e.dataTransfer.files).filter(
            file => file.type.startsWith('audio/') ||
                file.name.match(/\.(mp3|wav|m4a|ogg|webm)$/i)
        );

        setFiles(prev => [...prev, ...droppedFiles]);
    };

    const handleFileSelect = (e) => {
        const selectedFiles = Array.from(e.target.files);
        setFiles(prev => [...prev, ...selectedFiles]);
    };

    const handleRemoveFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        if (files.length === 0) return;

        try {
            setUploading(true);
            const res = await bulkImportAudios(files, selectedStage || null, parsedTranscripts);
            setResult(res.data);
            setFiles([]);
            setTranscriptsText('');
            if (onImportComplete) onImportComplete();
        } catch (err) {
            console.error('Error uploading:', err);
            setResult({
                imported: 0,
                failed: files.length,
                errors: ['Upload failed: ' + err.message]
            });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fade-in">
            {/* Stage selector */}
            <div className="mb-8">
                <label className="text-muted" style={{ display: 'block', marginBottom: 8 }}>
                    Chọn giai đoạn (tùy chọn):
                </label>
                <select
                    value={selectedStage}
                    onChange={(e) => setSelectedStage(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--bg-hover)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text)',
                        fontSize: '1rem'
                    }}
                >
                    <option value="">-- Bắt buộc chọn một giai đoạn --</option>
                    {stages.map(stage => (
                        <option key={stage.id} value={stage.id}>{stage.name}</option>
                    ))}
                </select>
            </div>

            {/* Transcript Input */}
            <div className="mb-8">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label className="text-muted">
                        Dán Transcript hàng loạt (tùy chọn):
                    </label>
                    <span style={{
                        fontSize: '0.85rem',
                        color: parsedTranscripts.length > 0
                            ? (parsedTranscripts.length === files.length && files.length > 0 ? 'var(--accent)' : 'var(--secondary)')
                            : 'var(--text-muted)'
                    }}>
                        Đã nhận diện: {parsedTranscripts.length} đoạn {files.length > 0 && `/ ${files.length} audio`}
                    </span>
                </div>
                <textarea
                    value={transcriptsText}
                    onChange={(e) => setTranscriptsText(e.target.value)}
                    placeholder="Dán toàn bộ transcript vào đây. Ngăn cách transcript của mỗi audio bằng 1 dòng trống hoặc dấu '---'..."
                    rows={6}
                    style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--bg-hover)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text)',
                        fontSize: '1rem',
                        resize: 'vertical',
                        fontFamily: 'monospace'
                    }}
                />
            </div>

            {/* Drop zone */}
            <div
                className={`drop-zone ${isDragging ? 'active' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
            >
                <div className="drop-zone-icon">📁</div>
                <p className="drop-zone-text">
                    <strong>Kéo thả file audio</strong> hoặc click để chọn
                </p>
                <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: 8 }}>
                    Hỗ trợ: MP3, WAV, M4A, OGG, WEBM
                </p>
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept="audio/*"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                />
            </div>

            {/* File list */}
            {files.length > 0 && (
                <div className="mt-8">
                    <h4 className="mb-4">📋 Files đã chọn ({files.length})</h4>
                    <div className="audio-list">
                        {files.map((file, index) => (
                            <div key={index} className="audio-item">
                                <div className="audio-item-icon">🎵</div>
                                <div className="audio-item-info">
                                    <div className="audio-item-title">{file.name}</div>
                                    <div className="audio-item-duration flex gap-2 items-center" style={{ marginTop: 4 }}>
                                        <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                        {index < parsedTranscripts.length ? (
                                            <span style={{ color: 'var(--accent)', fontSize: '0.8rem', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: 4 }}>
                                                ✓ Có transcript
                                            </span>
                                        ) : (
                                            <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                                                - Trống
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => handleRemoveFile(index)}
                                    style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>

                    {files.length > 0 && parsedTranscripts.length > 0 && files.length !== parsedTranscripts.length && (
                        <div className="mt-4 p-4" style={{ background: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, color: 'var(--secondary)', fontSize: '0.9rem' }}>
                            ⚠️ LƯU Ý: Số lượng file audio ({files.length}) không khớp với số đoạn transcript ({parsedTranscripts.length}). Các file không có transcript tương ứng sẽ bị để trống.
                        </div>
                    )}

                    <button
                        className="btn btn-primary mt-8"
                        onClick={handleUpload}
                        disabled={uploading || !selectedStage}
                        style={{ width: '100%' }}
                    >
                        {uploading ? '⏳ Đang upload...' : `📤 Upload ${files.length} files`}
                    </button>
                </div>
            )}

            {/* Result */}
            {result && (
                <div className="card mt-8 slide-up" style={{
                    borderColor: result.failed > 0 ? 'var(--secondary)' : 'var(--accent)'
                }}>
                    <h4 style={{ color: result.failed > 0 ? 'var(--secondary)' : 'var(--accent)' }}>
                        {result.failed > 0 ? '⚠️ Upload hoàn tất với lỗi' : '✅ Upload thành công!'}
                    </h4>
                    <p className="mt-4">
                        <span style={{ color: 'var(--accent)' }}>✓ {result.imported} files</span> đã import
                        {result.failed > 0 && (
                            <span style={{ color: 'var(--secondary)', marginLeft: 16 }}>
                                ✗ {result.failed} files thất bại
                            </span>
                        )}
                    </p>
                    {result.errors?.length > 0 && (
                        <ul className="mt-4 text-muted" style={{ fontSize: '0.85rem' }}>
                            {result.errors.map((err, i) => (
                                <li key={i}>{err}</li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
