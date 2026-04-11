import { NavLink } from 'react-router-dom';

export default function Navigation() {
    return (
        <nav className="nav">
            <div className="nav-content">
                <div className="nav-logo">🎧 English Learning</div>
                <div className="nav-links">
                    <NavLink
                        to="/"
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                        end
                    >
                        Trang chủ
                    </NavLink>
                    <NavLink
                        to="/stages"
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    >
                        Học theo giai đoạn
                    </NavLink>
                    <NavLink
                        to="/random"
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    >
                        Luyện nghe Random
                    </NavLink>
                    <NavLink
                        to="/picker"
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    >
                        Random Picker
                    </NavLink>
                    <NavLink
                        to="/speaking"
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    >
                        Luyện nói
                    </NavLink>
                    <NavLink
                        to="/import"
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    >
                        Import Audio
                    </NavLink>
                    <NavLink
                        to="/vocabulary"
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    >
                        Học từ vựng
                    </NavLink>
                    <NavLink
                        to="/paragraph-listening"
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    >
                        Nghe theo nguyên đoạn
                    </NavLink>
                </div>
            </div>
        </nav>
    );
}
