import { useState, useRef, useEffect } from 'react';

export default function MultiSelect({ options, selected, onChange, placeholder = "Chọn..." }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleToggle = (value) => {
        const newSelected = selected.includes(value)
            ? selected.filter(item => item !== value)
            : [...selected, value];
        onChange(newSelected);
    };

    const handleSelectAll = () => {
        if (selected.length === options.length) {
            onChange([]);
        } else {
            onChange(options.map(opt => opt.value));
        }
    };

    // Calculate display text
    let displayText = placeholder;
    if (selected.length > 0) {
        if (selected.length === options.length) {
            displayText = "Tất cả giai đoạn";
        } else {
            displayText = `${selected.length} đã chọn`;
        }
    }

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'var(--bg-dark)',
                    border: '1px solid var(--bg-hover)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text)',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    userSelect: 'none'
                }}
            >
                <span style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: selected.length === 0 ? 'var(--text-muted)' : 'var(--text)'
                }}>
                    {displayText}
                </span>
                <span style={{ fontSize: '0.8em', opacity: 0.7 }}>▼</span>
            </div>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: 4,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    zIndex: 1000,
                    maxHeight: '300px',
                    overflowY: 'auto',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0
                }}>
                    <div
                        onClick={handleSelectAll}
                        style={{
                            padding: '10px 16px',
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            background: selected.length === options.length ? 'rgba(255,255,255,0.05)' : 'transparent',
                            color: 'var(--accent)',
                            fontWeight: 500
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = selected.length === options.length ? 'rgba(255,255,255,0.05)' : 'transparent'}
                    >
                        <div style={{
                            width: 18,
                            height: 18,
                            border: '2px solid var(--accent)',
                            borderRadius: 4,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: selected.length === options.length ? 'var(--accent)' : 'transparent'
                        }}>
                            {selected.length === options.length && (
                                <span style={{ color: 'white', fontSize: 12 }}>✓</span>
                            )}
                        </div>
                        Chọn tất cả
                    </div>

                    {options.map(option => {
                        const isSelected = selected.includes(option.value);
                        return (
                            <div
                                key={option.value}
                                onClick={() => handleToggle(option.value)}
                                style={{
                                    padding: '10px 16px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    background: isSelected ? 'rgba(255,255,255,0.05)' : 'transparent',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = isSelected ? 'rgba(255,255,255,0.05)' : 'transparent'}
                            >
                                <div style={{
                                    width: 18,
                                    height: 18,
                                    border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--text-muted)'}`,
                                    borderRadius: 4,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: isSelected ? 'var(--accent)' : 'transparent'
                                }}>
                                    {isSelected && (
                                        <span style={{ color: 'white', fontSize: 12 }}>✓</span>
                                    )}
                                </div>
                                <span style={{ color: isSelected ? 'var(--text)' : 'var(--text-muted)' }}>
                                    {option.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
