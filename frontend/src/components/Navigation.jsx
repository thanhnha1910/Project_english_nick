import { NavLink } from 'react-router-dom';
import { useState } from 'react';

export default function Navigation() {
    const [isOpen, setIsOpen] = useState(false);

    const toggleMenu = () => {
        setIsOpen(!isOpen);
    };

    const closeMenu = () => {
        setIsOpen(false);
    };

    return (
        <nav className="nav">
            <div className="nav-content">
                <div className="nav-logo">🎧 VocabMaster</div>
                
                {/* Hamburger Icon */}
                <button className="mobile-menu-btn" onClick={toggleMenu} aria-label="Toggle Navigation">
                    <span className={`hamburger ${isOpen ? 'active' : ''}`}></span>
                </button>

                <div className={`nav-links ${isOpen ? 'open' : ''}`}>
                    <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end onClick={closeMenu}>
                        Trang chủ
                    </NavLink>
                    <NavLink to="/stages" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMenu}>
                        Học theo giai đoạn
                    </NavLink>
                    <NavLink to="/random" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMenu}>
                        Luyện nghe Random
                    </NavLink>
                    <NavLink to="/picker" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMenu}>
                        Random Picker
                    </NavLink>
                    <NavLink to="/speaking" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMenu}>
                        Luyện nói
                    </NavLink>
                    <NavLink to="/import" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMenu}>
                        Import Audio
                    </NavLink>
                    <NavLink to="/vocabulary" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMenu}>
                        Học từ vựng
                    </NavLink>
                    <NavLink to="/paragraph-listening" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMenu}>
                        Nguyên đoạn
                    </NavLink>
                </div>
                
                {/* Backdrop for mobile */}
                {isOpen && <div className="nav-backdrop" onClick={closeMenu}></div>}
            </div>
        </nav>
    );
}
