import { useState, useEffect } from 'react';
import { getStages, createStage, updateStage, deleteStage, getAudiosByStage, reorderStages, bulkUpdateTranscripts } from '../services/api';
import BulkImporter from '../components/BulkImporter';
import api from '../services/api';

export default function AdminImport() {
    const [stages, setStages] = useState([]);
    const [showNewStage, setShowNewStage] = useState(false);
    const [newStageName, setNewStageName] = useState('');
    const [newStageDesc, setNewStageDesc] = useState('');
    const [newStageType, setNewStageType] = useState('mixed');
    const [creating, setCreating] = useState(false);

    // Edit Stage state
    const [editingStage, setEditingStage] = useState(null);
    const [editStageName, setEditStageName] = useState('');
    const [editStageDesc, setEditStageDesc] = useState('');
    const [editStageType, setEditStageType] = useState('mixed');
    const [updatingStage, setUpdatingStage] = useState(false);

    // Audio management
    const [selectedStageAudios, setSelectedStageAudios] = useState(null);
    const [stageAudios, setStageAudios] = useState([]);
    const [editingAudio, setEditingAudio] = useState(null);
    const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
    const [deletingAll, setDeletingAll] = useState(false);
    const [editTranscript, setEditTranscript] = useState('');

    // Bulk Transcript Update for existing stage
    const [showBulkTranscript, setShowBulkTranscript] = useState(false);
    const [bulkTranscriptText, setBulkTranscriptText] = useState('');
    const [parsedBulkTranscripts, setParsedBulkTranscripts] = useState([]);
    const [updatingBulkTranscripts, setUpdatingBulkTranscripts] = useState(false);

    // Drag and drop state
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);

    // Auto-parse bulk transcripts
    useEffect(() => {
        if (!bulkTranscriptText.trim()) {
            setParsedBulkTranscripts([]);
            return;
        }

        let parts = bulkTranscriptText
            .split(/(?:\n\s*\n|---)/)
            .map(t => t.trim())
            .filter(t => t.length > 0);

        // Fallback: If it only parsed 1 part but there are multiple lines (e.g. user pasted a numbered list),
        // we can try splitting by single newlines if that matches the audio count better,
        // or just split by newlines if the parts count is 1 and it contains newlines.
        if (parts.length === 1 && bulkTranscriptText.includes('\n') && stageAudios?.length > 1) {
            const singleLineParts = bulkTranscriptText.split('\n').map(t => t.trim()).filter(t => t.length > 0);
            if (singleLineParts.length > 1) {
                parts = singleLineParts;
            }
        }

        setParsedBulkTranscripts(parts);
    }, [bulkTranscriptText, stageAudios]);

    const handleUpdateBulkTranscripts = async () => {
        if (!selectedStageAudios || parsedBulkTranscripts.length === 0) return;

        try {
            setUpdatingBulkTranscripts(true);
            await bulkUpdateTranscripts(selectedStageAudios.id, parsedBulkTranscripts);

            // Tải lại danh sách audio
            await handleViewStageAudios(selectedStageAudios);

            // Đóng panel
            setBulkTranscriptText('');
            setShowBulkTranscript(false);
            alert(`Đã cập nhật thành công ${parsedBulkTranscripts.length} đoạn transcript.`);
        } catch (err) {
            console.error('Error updating bulk transcripts:', err);
            alert('Có lỗi xảy ra khi cập nhật transcript hàng loạt.');
        } finally {
            setUpdatingBulkTranscripts(false);
        }
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

    const handleCreateStage = async () => {
        if (!newStageName.trim()) return;
        try {
            setCreating(true);
            await createStage({
                name: newStageName,
                description: newStageDesc,
                type: newStageType,
                order: stages.length
            });
            setNewStageName('');
            setNewStageDesc('');
            setNewStageType('mixed');
            setShowNewStage(false);
            loadStages();
        } catch (err) {
            console.error('Error creating stage:', err);
        } finally {
            setCreating(false);
        }
    };

    const handleEditStage = (stage) => {
        setEditingStage(stage);
        setEditStageName(stage.name);
        setEditStageDesc(stage.description || '');
        setEditStageType(stage.type || 'mixed');
    };

    const handleUpdateStage = async () => {
        if (!editStageName.trim() || !editingStage) return;
        try {
            setUpdatingStage(true);
            await updateStage(editingStage.id, {
                name: editStageName,
                description: editStageDesc,
                order: editingStage.order,
                type: editStageType
            });
            setEditingStage(null);
            loadStages();
        } catch (err) {
            console.error('Error updating stage:', err);
            alert('Có lỗi xảy ra khi cập nhật giai đoạn.');
        } finally {
            setUpdatingStage(false);
        }
    };

    const handleDeleteStage = async (stage) => {
        if (!confirm(`Bạn có chắc muốn xóa giai đoạn "${stage.name}"? Hành động này có thể không thực hiện được nếu giai đoạn đang chứa dữ liệu.`)) return;
        try {
            await deleteStage(stage.id);
            if (selectedStageAudios?.id === stage.id) {
                setSelectedStageAudios(null);
            }
            loadStages();
        } catch (err) {
            console.error('Error deleting stage:', err);
            if (err.response?.status === 500 || err.response?.status === 400) {
                alert('Không thể xóa giai đoạn. Giai đoạn này đang chứa dữ liệu (audio, câu hỏi, từ vựng...). Vui lòng xóa dữ liệu bên trong trước.');
            } else {
                alert('Có lỗi xảy ra khi xóa giai đoạn.');
            }
        }
    };

    const handleViewStageAudios = async (stage) => {
        setSelectedStageAudios(stage);
        try {
            const res = await getAudiosByStage(stage.id);
            setStageAudios(res.data);
        } catch (err) {
            console.error('Error loading audios:', err);
        }
    };

    const handleDeleteAudio = async (audioId) => {
        if (!confirm('Bạn có chắc muốn xóa audio này?')) return;
        try {
            await api.delete(`/audios/${audioId}`);
            setStageAudios(stageAudios.filter(a => a.id !== audioId));
        } catch (err) {
            console.error('Error deleting audio:', err);
        }
    };

    const handleEditTranscript = (audio) => {
        setEditingAudio(audio);
        setEditTranscript(audio.transcript || '');
    };

    const handleSaveTranscript = async () => {
        if (!editingAudio) return;
        try {
            await api.put(`/audios/${editingAudio.id}/transcript?transcript=${encodeURIComponent(editTranscript)}`);
            setStageAudios(stageAudios.map(a =>
                a.id === editingAudio.id ? { ...a, transcript: editTranscript } : a
            ));
            setEditingAudio(null);
        } catch (err) {
            console.error('Error saving transcript:', err);
        }
    };

    // Drag and drop handlers for stages
    const handleDragStart = (e, index) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        if (draggedIndex !== index) {
            setDragOverIndex(index);
        }
    };

    const handleDragEnd = async () => {
        if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
            const newStages = [...stages];
            const [draggedItem] = newStages.splice(draggedIndex, 1);
            newStages.splice(dragOverIndex, 0, draggedItem);
            setStages(newStages);

            // Save order to backend
            try {
                const ids = newStages.map(s => s.id);
                await reorderStages(ids);
            } catch (err) {
                console.error('Error saving order:', err);
            }
        }
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    return (
        <div className="page fade-in">
            <div className="page-header">
                <h1 className="page-title">📤 Import Audio</h1>
                <p className="page-subtitle">Quản lý audio và transcript</p>
            </div>

            <div className="container" style={{ maxWidth: 900 }}>
                {/* Stage Management */}
                <div className="card mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h3>📁 Quản lý giai đoạn</h3>
                        <button
                            className="btn btn-primary"
                            onClick={() => setShowNewStage(!showNewStage)}
                        >
                            {showNewStage ? '✕ Hủy' : '+ Thêm giai đoạn'}
                        </button>
                    </div>

                    {showNewStage && (
                        <div className="card slide-up mb-4" style={{ background: 'var(--bg-dark)' }}>
                            <div className="mb-4">
                                <label className="text-muted" style={{ display: 'block', marginBottom: 8 }}>
                                    Tên giai đoạn:
                                </label>
                                <input
                                    type="text"
                                    value={newStageName}
                                    onChange={(e) => setNewStageName(e.target.value)}
                                    placeholder="Ví dụ: Beginner, Intermediate..."
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        background: 'var(--bg-card)',
                                        border: '1px solid var(--bg-hover)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'var(--text)',
                                        fontSize: '1rem'
                                    }}
                                />
                            </div>
                            <div className="mb-4">
                                <label className="text-muted" style={{ display: 'block', marginBottom: 8 }}>
                                    Mô tả (tùy chọn):
                                </label>
                                <textarea
                                    value={newStageDesc}
                                    onChange={(e) => setNewStageDesc(e.target.value)}
                                    placeholder="Mô tả ngắn về giai đoạn..."
                                    rows={2}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        background: 'var(--bg-card)',
                                        border: '1px solid var(--bg-hover)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'var(--text)',
                                        fontSize: '1rem',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>
                            <div className="mb-4">
                                <label className="text-muted" style={{ display: 'block', marginBottom: 8 }}>
                                    Loại bài học:
                                </label>
                                <select
                                    value={newStageType}
                                    onChange={(e) => setNewStageType(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        background: 'var(--bg-card)',
                                        border: '1px solid var(--bg-hover)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'var(--text)',
                                        fontSize: '1rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="mixed">Câu ngắn / Hỗn hợp (Học theo giai đoạn)</option>
                                    <option value="paragraph">Nguyên đoạn (Nghe theo nguyên đoạn)</option>
                                </select>
                            </div>
                            <button
                                className="btn btn-accent"
                                onClick={handleCreateStage}
                                disabled={creating || !newStageName.trim()}
                            >
                                {creating ? '⏳ Đang tạo...' : '✓ Tạo giai đoạn'}
                            </button>
                        </div>
                    )}

                    {/* Existing stages with manage button */}
                    {stages.length > 0 ? (
                        <div className="audio-list">
                            {stages.map((stage, index) => (
                                <div
                                    key={stage.id}
                                    className="audio-item"
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDragEnd={handleDragEnd}
                                    style={{
                                        cursor: 'grab',
                                        opacity: draggedIndex === index ? 0.5 : 1,
                                        background: dragOverIndex === index ? 'var(--bg-hover)' : undefined,
                                        borderLeft: dragOverIndex === index ? '3px solid var(--primary)' : undefined,
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <div style={{
                                        marginRight: 8,
                                        color: 'var(--text-dim)',
                                        cursor: 'grab'
                                    }}>
                                        ⋮⋮
                                    </div>
                                    <div className="stage-number" style={{
                                        width: 36, height: 36, lineHeight: '36px', fontSize: '0.9rem'
                                    }}>
                                        {index + 1}
                                    </div>
                                    <div className="audio-item-info" style={{ flex: 1 }}>
                                        <div className="audio-item-title flex items-center gap-2">
                                            {stage.name}
                                            <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 12, background: stage.type === 'paragraph' ? 'var(--accent)' : 'var(--bg-hover)', color: stage.type === 'paragraph' ? 'white' : 'var(--text-muted)' }}>
                                                {stage.type === 'paragraph' ? 'Nguyên đoạn' : 'Hỗn hợp'}
                                            </span>
                                        </div>
                                        <div className="audio-item-duration">{stage.description || 'Không có mô tả'}</div>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => handleViewStageAudios(stage)}
                                            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                                        >
                                            📋 Quản lý
                                        </button>
                                        <button
                                            onClick={() => handleEditStage(stage)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                padding: '8px',
                                                cursor: 'pointer',
                                                fontSize: '1rem',
                                                opacity: 0.7
                                            }}
                                            title="Sửa giai đoạn"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => handleDeleteStage(stage)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                padding: '8px',
                                                cursor: 'pointer',
                                                fontSize: '1rem',
                                                opacity: 0.7,
                                                color: 'var(--secondary)'
                                            }}
                                            title="Xóa giai đoạn"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted">Chưa có giai đoạn nào. Tạo giai đoạn mới để bắt đầu.</p>
                    )}
                </div>

                {/* Audio Management for selected stage */}
                {selectedStageAudios && (
                    <div className="card mb-8 slide-up">
                        <div className="flex justify-between items-center mb-4">
                            <h3>🎵 Audio trong "{selectedStageAudios.name}" ({stageAudios.length})</h3>
                            <div className="flex gap-4">
                                {stageAudios.length > 0 && (
                                    <>
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => setShowBulkTranscript(!showBulkTranscript)}
                                            style={{
                                                padding: '8px 16px',
                                            }}
                                        >
                                            {showBulkTranscript ? '✕ Hủy thêm nhanh' : '📝 Thêm nhanh Transcript'}
                                        </button>
                                        <button
                                            className="btn"
                                            onClick={() => setShowDeleteAllModal(true)}
                                            style={{
                                                padding: '8px 16px',
                                                background: 'var(--secondary)',
                                                color: 'white'
                                            }}
                                        >
                                            🗑️ Xóa tất cả
                                        </button>
                                    </>
                                )}
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setSelectedStageAudios(null);
                                        setShowBulkTranscript(false);
                                    }}
                                    style={{ padding: '8px 16px' }}
                                >
                                    ✕ Đóng
                                </button>
                            </div>
                        </div>

                        {showBulkTranscript && (
                            <div className="card slide-up mb-6" style={{ background: 'var(--bg-dark)' }}>
                                <div className="mb-4">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <label className="text-muted">
                                            Dán Transcript hàng loạt cho <strong>{stageAudios.length}</strong> audio:
                                        </label>
                                        <span style={{
                                            fontSize: '0.85rem',
                                            color: parsedBulkTranscripts.length > 0
                                                ? (parsedBulkTranscripts.length === stageAudios.length ? 'var(--accent)' : 'var(--secondary)')
                                                : 'var(--text-muted)'
                                        }}>
                                            Đã nhận diện: {parsedBulkTranscripts.length} đoạn / {stageAudios.length} audio
                                        </span>
                                    </div>
                                    <textarea
                                        value={bulkTranscriptText}
                                        onChange={(e) => setBulkTranscriptText(e.target.value)}
                                        placeholder="Dán toàn bộ transcript vào đây. Ngăn cách transcript của mỗi audio bằng 1 dòng trống hoặc dấu '---'..."
                                        rows={8}
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

                                {parsedBulkTranscripts.length > 0 && parsedBulkTranscripts.length !== stageAudios.length && (
                                    <div className="mb-4 p-4" style={{ background: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, color: 'var(--secondary)', fontSize: '0.9rem' }}>
                                        ⚠️ LƯU Ý: Bạn có {stageAudios.length} audio nhưng chỉ dán {parsedBulkTranscripts.length} đoạn transcript. Các audio thiếu sẽ giữ nguyên hoặc không có transcript.
                                    </div>
                                )}

                                <button
                                    className="btn btn-primary"
                                    onClick={handleUpdateBulkTranscripts}
                                    disabled={updatingBulkTranscripts || !bulkTranscriptText.trim()}
                                    style={{ width: '100%' }}
                                >
                                    {updatingBulkTranscripts ? '⏳ Đang cập nhật...' : `✓ Cập nhật ${parsedBulkTranscripts.length} transcript`}
                                </button>
                            </div>
                        )}

                        {stageAudios.length === 0 ? (
                            <p className="text-muted">Chưa có audio trong giai đoạn này.</p>
                        ) : (
                            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--bg-hover)' }}>
                                            <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-muted)' }}>#</th>
                                            <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-muted)' }}>Tên</th>
                                            <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-muted)' }}>Transcript</th>
                                            <th style={{ padding: '12px', textAlign: 'right', color: 'var(--text-muted)' }}>Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stageAudios.map((audio, index) => (
                                            <tr key={audio.id} style={{ borderBottom: '1px solid var(--bg-hover)' }}>
                                                <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{index + 1}</td>
                                                <td style={{ padding: '12px' }}>{audio.title}</td>
                                                <td style={{ padding: '12px' }}>
                                                    {audio.transcript ? (
                                                        <span style={{ color: 'var(--accent)' }}>✓ Có</span>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-dim)' }}>Chưa có</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '12px', textAlign: 'right' }}>
                                                    <button
                                                        onClick={() => handleEditTranscript(audio)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: 'var(--primary)',
                                                            cursor: 'pointer',
                                                            marginRight: 12
                                                        }}
                                                    >
                                                        ✏️ Sửa
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteAudio(audio.id)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: 'var(--secondary)',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        🗑️ Xóa
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Edit Transcript Modal */}
                {editingAudio && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }}>
                        <div className="card slide-up" style={{ width: 600, maxHeight: '80vh', overflow: 'auto' }}>
                            <h3 className="mb-4">✏️ Sửa transcript: {editingAudio.title}</h3>
                            <textarea
                                value={editTranscript}
                                onChange={(e) => setEditTranscript(e.target.value)}
                                placeholder="Nhập transcript cho audio..."
                                rows={10}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    background: 'var(--bg-dark)',
                                    border: '1px solid var(--bg-hover)',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--text)',
                                    fontSize: '1rem',
                                    resize: 'vertical',
                                    marginBottom: 16
                                }}
                            />
                            <div className="flex gap-4">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setEditingAudio(null)}
                                >
                                    Hủy
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleSaveTranscript}
                                >
                                    💾 Lưu transcript
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Stage Modal */}
                {editingStage && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }}>
                        <div className="card slide-up" style={{ width: 500, background: 'var(--bg-dark)' }}>
                            <h3 className="mb-4">✏️ Sửa giai đoạn</h3>
                            <div className="mb-4">
                                <label className="text-muted" style={{ display: 'block', marginBottom: 8 }}>
                                    Tên giai đoạn:
                                </label>
                                <input
                                    type="text"
                                    value={editStageName}
                                    onChange={(e) => setEditStageName(e.target.value)}
                                    placeholder="Tên giai đoạn..."
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        background: 'var(--bg-card)',
                                        border: '1px solid var(--bg-hover)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'var(--text)',
                                        fontSize: '1rem'
                                    }}
                                />
                            </div>
                            <div className="mb-4">
                                <label className="text-muted" style={{ display: 'block', marginBottom: 8 }}>
                                    Mô tả:
                                </label>
                                <textarea
                                    value={editStageDesc}
                                    onChange={(e) => setEditStageDesc(e.target.value)}
                                    placeholder="Mô tả..."
                                    rows={3}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        background: 'var(--bg-card)',
                                        border: '1px solid var(--bg-hover)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'var(--text)',
                                        fontSize: '1rem',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>
                            <div className="mb-4">
                                <label className="text-muted" style={{ display: 'block', marginBottom: 8 }}>
                                    Loại bài học:
                                </label>
                                <select
                                    value={editStageType}
                                    onChange={(e) => setEditStageType(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        background: 'var(--bg-card)',
                                        border: '1px solid var(--bg-hover)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'var(--text)',
                                        fontSize: '1rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="mixed">Câu ngắn / Hỗn hợp (Học theo giai đoạn)</option>
                                    <option value="paragraph">Nguyên đoạn (Nghe theo nguyên đoạn)</option>
                                </select>
                            </div>
                            <div className="flex gap-4 justify-end">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setEditingStage(null)}
                                >
                                    Hủy
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleUpdateStage}
                                    disabled={updatingStage || !editStageName.trim()}
                                >
                                    {updatingStage ? '⏳ Đang lưu...' : '💾 Lưu thay đổi'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Bulk Importer */}
                <div className="card">
                    <h3 className="mb-8">📤 Import Audio mới</h3>
                    <BulkImporter
                        stages={stages}
                        initialStageId={selectedStageAudios?.id || ''}
                        onImportComplete={() => {
                            loadStages();
                            if (selectedStageAudios) {
                                handleViewStageAudios(selectedStageAudios);
                            }
                        }}
                    />
                </div>

                {/* Delete All Modal */}
                {showDeleteAllModal && selectedStageAudios && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }}>
                        <div className="card slide-up" style={{
                            width: 450,
                            textAlign: 'center',
                            border: '2px solid var(--secondary)'
                        }}>
                            <div style={{
                                fontSize: '3rem',
                                marginBottom: 16
                            }}>
                                ⚠️
                            </div>
                            <h2 style={{ marginBottom: 16, color: 'var(--secondary)' }}>
                                Xóa tất cả audio?
                            </h2>
                            <p style={{ marginBottom: 8, color: 'var(--text-muted)' }}>
                                Bạn sắp xóa <strong style={{ color: 'var(--text)' }}>{stageAudios.length} audio</strong> trong:
                            </p>
                            <p style={{
                                marginBottom: 24,
                                color: 'var(--primary)',
                                fontWeight: 600,
                                fontSize: '1.1rem'
                            }}>
                                "{selectedStageAudios.name}"
                            </p>
                            <p style={{
                                marginBottom: 24,
                                color: 'var(--secondary)',
                                fontSize: '0.9rem'
                            }}>
                                ⚠️ Hành động này KHÔNG THỂ hoàn tác!
                            </p>
                            <div className="flex gap-4" style={{ justifyContent: 'center' }}>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setShowDeleteAllModal(false)}
                                    style={{ padding: '12px 24px' }}
                                >
                                    Hủy
                                </button>
                                <button
                                    className="btn"
                                    disabled={deletingAll}
                                    onClick={async () => {
                                        setDeletingAll(true);
                                        try {
                                            for (const audio of stageAudios) {
                                                await api.delete(`/audios/${audio.id}`);
                                            }
                                            setStageAudios([]);
                                            setShowDeleteAllModal(false);
                                        } catch (err) {
                                            console.error('Error deleting all:', err);
                                        } finally {
                                            setDeletingAll(false);
                                        }
                                    }}
                                    style={{
                                        padding: '12px 24px',
                                        background: 'var(--secondary)',
                                        color: 'white'
                                    }}
                                >
                                    {deletingAll ? '⏳ Đang xóa...' : '🗑️ XÓA TẤT CẢ'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
