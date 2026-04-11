import axios from 'axios';

// Auto-detect: production (same origin) vs local dev (separate backend)
export const isDev = window.location.port === '5173';
export const STATIC_BASE_URL = isDev
    ? `http://${window.location.hostname}:8000`
    : window.location.origin;

export const API_BASE_URL = `${STATIC_BASE_URL}/api`;

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// ============ STAGES ============
export const getStages = (type = null) => {
    const params = type ? { type } : {};
    return api.get('/stages', { params });
};
export const getStage = (id) => api.get(`/stages/${id}`);
export const createStage = (data) => api.post('/stages', data);
export const updateStage = (id, data) => api.put(`/stages/${id}`, data);
export const deleteStage = (id) => api.delete(`/stages/${id}`);
export const reorderStages = (stageIds) => api.put('/stages/reorder', stageIds);

// ============ AUDIOS ============
export const getAudios = () => api.get('/audios');
export const getAudiosByStage = (stageId) => api.get(`/audios/stage/${stageId}`);
export const getRandomAudios = (count = 10, stageIds = []) => {
    const params = new URLSearchParams();
    params.append('count', count);

    // Ensure stageIds is an array
    const ids = Array.isArray(stageIds) ? stageIds : (stageIds ? [stageIds] : []);

    if (ids.length > 0) {
        ids.forEach(id => params.append('stage_ids', id));
    }
    return api.get('/audios/random', { params });
};
export const getAudio = (id) => api.get(`/audios/${id}`);
export const getTranscript = (id) => api.get(`/audios/${id}/transcript`);
export const getShuffledTranscript = (id) => api.get(`/audios/${id}/transcript/shuffle`);

// Upload single audio
export const uploadAudio = (formData) => {
    return api.post('/audios', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

// Bulk import audios
export const bulkImportAudios = (files, stageId = null, transcripts = null) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    if (stageId) formData.append('stage_id', stageId);
    if (transcripts && Array.isArray(transcripts) && transcripts.length > 0) {
        formData.append('transcripts', JSON.stringify(transcripts));
    }

    return api.post('/audios/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

// Bulk update transcripts for existing audios
export const bulkUpdateTranscripts = (stageId, transcripts) => {
    return api.post('/audios/bulk-update-transcripts', {
        stage_id: stageId,
        transcripts: transcripts
    });
};

// ============ SPEAKING ============
export const getQuestions = (stageId = null) => {
    const params = stageId ? { stage_id: stageId } : {};
    return api.get('/speaking/questions', { params });
};
export const getRandomQuestion = (stageId = null) => {
    const params = stageId ? { stage_id: stageId } : {};
    return api.get('/speaking/questions/random', { params });
};
export const submitRecording = (questionId, audioBlob) => {
    const formData = new FormData();
    formData.append('question_id', questionId);
    formData.append('file', audioBlob, 'recording.webm');

    return api.post('/speaking/submit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

// ============ SPEAKING ANALYSIS (n8n) ============
export const analyzeSpeaking = (audioBlob, referenceText = '', language = 'en') => {
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    if (referenceText) formData.append('reference_text', referenceText);
    formData.append('language', language);

    return api.post('/speaking/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

export const getAnalysisStatus = (jobId) => {
    return api.get(`/speaking/analyze/status/${jobId}`);
};

// Polling helper - tự động poll cho đến khi hoàn thành
export const pollAnalysisResult = async (jobId, maxAttempts = 60, intervalMs = 2000) => {
    let notFoundCount = 0;

    for (let i = 0; i < maxAttempts; i++) {
        try {
            const res = await getAnalysisStatus(jobId);

            if (res.data.status === 'completed') {
                return res.data.result;
            }

            if (res.data.status === 'not_found') {
                // n8n có thể chưa lưu staticData nếu job đang chạy
                // Coi như đang processing và tiếp tục chờ
                notFoundCount++;
                console.log(`Job ${jobId} not found (attempt ${i + 1}), waiting...`);
            }

            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, intervalMs));
        } catch (err) {
            console.warn('Error polling status:', err);
            // Ignore temporary network errors
            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
    }
    throw new Error('Analysis timeout. Vui lòng thử lại sau.');
};

// ============ VOCABULARY ============
export const importVocabulary = (words, stageId = null) => {
    // words format: [{ text, meaning, example, stage_id }]
    const payload = {
        words: words.map(w => ({ ...w, stage_id: stageId }))
    };
    return api.post('/vocabulary/import', payload);
};

export const getVocabulary = (stageId = null) => {
    const params = stageId ? { stage_id: stageId } : {};
    return api.get('/vocabulary', { params });
};

export const deleteWord = (id) => api.delete(`/vocabulary/${id}`);

export const updateWord = (id, data) => api.put(`/vocabulary/${id}`, data);

// Batch translate multiple texts
export const translateBatch = async (texts) => {
    const results = await Promise.all(
        texts.map(text => translateText(text).catch(() => ({ data: { translated: '' } })))
    );
    return results.map(r => r.data?.translated || '');
};

export const extractFromImage = (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/vocabulary/extract-from-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

export const translateText = (text) => api.post('/vocabulary/translate', { text });

// ============ FSRS / Spaced Repetition ============
export const reviewWordBatch = (reviews) =>
    api.post('/vocabulary/review', { reviews });

export const getDueWords = (stageId = null) => {
    const params = stageId ? { stage_id: stageId } : {};
    return api.get('/vocabulary/due', { params });
};

export const getVocabStats = (stageId = null) => {
    const params = stageId ? { stage_id: stageId } : {};
    return api.get('/vocabulary/stats', { params });
};

export default api;
