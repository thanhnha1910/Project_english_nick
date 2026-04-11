import { Link } from 'react-router-dom';

export default function Home() {
    return (
        <div className="fade-in">
            {/* Hero Section */}
            <section className="hero">
                <h1 className="hero-title">Học Tiếng Anh Giao Tiếp</h1>
                <p className="hero-subtitle">
                    Luyện nghe, nói với audio thực tế. Cải thiện kỹ năng giao tiếp mỗi ngày.
                </p>
                <Link to="/stages" className="btn btn-primary">
                    Bắt đầu học ngay →
                </Link>
            </section>

            {/* Features */}
            <section className="features">
                <Link to="/stages" className="card feature-card">
                    <div className="feature-icon">📚</div>
                    <h3 className="feature-title">Học theo giai đoạn</h3>
                    <p className="feature-desc">
                        Audio được phân loại theo level. Từ cơ bản đến nâng cao, học tuần tự theo từng topic.
                    </p>
                </Link>

                <Link to="/random" className="card feature-card">
                    <div className="feature-icon">🔀</div>
                    <h3 className="feature-title">Luyện nghe Random</h3>
                    <p className="feature-desc">
                        Mix ngẫu nhiên các audio để test khả năng nghe. Ôn tập hiệu quả hơn.
                    </p>
                </Link>

                <Link to="/speaking" className="card feature-card">
                    <div className="feature-icon">🎙</div>
                    <h3 className="feature-title">Luyện nói</h3>
                    <p className="feature-desc">
                        Trả lời câu hỏi bằng giọng nói. Ghi âm và nghe lại để cải thiện.
                    </p>
                </Link>
            </section>

            {/* Quick Stats */}
            <section className="container text-center mb-8">
                <div className="card card-glass">
                    <div className="grid grid-3">
                        <div>
                            <h2 style={{ color: 'var(--primary)', marginBottom: 8 }}>🎧</h2>
                            <p className="text-muted">Nghe audio theo chủ đề</p>
                        </div>
                        <div>
                            <h2 style={{ color: 'var(--secondary)', marginBottom: 8 }}>📝</h2>
                            <p className="text-muted">Transcript + Shuffle ôn tập</p>
                        </div>
                        <div>
                            <h2 style={{ color: 'var(--accent)', marginBottom: 8 }}>🎤</h2>
                            <p className="text-muted">Ghi âm & luyện speaking</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
