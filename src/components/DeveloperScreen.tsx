import React, { useState } from 'react';
import { useAppSettings } from '../context/appSettingsContext';
import { getAppVersion, submitFeedback } from '../utils/feedbackFirestore';
import './DeveloperScreen.css';

interface DeveloperScreenProps {
  isOpen: boolean;
  onClose: () => void;
}

const SKILLS = [
  'React 19 + TypeScript', 'Capacitor (Android)', 'Vite', 'ESLint',
  'Tailwind CSS', 'Leaflet.js / TopoJSON', 'CSS Animations', 'REST APIs',
  'GeoJSON / Geofencing', 'JSON Data Engineering',
];

const SOCIAL_LINKS = [
  {
    icon: '🌐',
    label: 'Portfolio',
    handle: 'nivedh-cloud.github.io/my-profile',
    url: 'https://nivedh-cloud.github.io/my-profile/',
    color: '#6c63ff',
  },
  {
    icon: '📧',
    label: 'Email',
    handle: 'prabhath.jeevan@gmail.com',
    url: 'mailto:prabhath.jeevan@gmail.com',
    color: '#ea4335',
  },
];

const APP_VERSION = getAppVersion();

const APP_INFO = [
  { label: 'App Name',    value: 'Countrys & Geofences' },
  { label: 'Version',     value: APP_VERSION },
  { label: 'Platform',    value: 'Android (Capacitor 8)' },
  { label: 'Framework',   value: 'React 19 + TypeScript' },
  { label: 'Build Tool',  value: 'Vite 6' },
  { label: 'Map Engine',  value: 'Leaflet.js + TopoJSON' },
  { label: 'Data Files',  value: '251 countries (CIA Factbook)' },
  { label: 'License',     value: 'MIT' },
];

export const DeveloperScreen: React.FC<DeveloperScreenProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings } = useAppSettings();
  const [fbName, setFbName] = useState('');
  const [fbEmail, setFbEmail] = useState('');
  const [fbMessage, setFbMessage] = useState('');
  const [fbStatus, setFbStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  if (!isOpen) return null;

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbMessage.trim()) return;
    setFbStatus('sending');
    try {
      await submitFeedback({
        name: fbName || undefined,
        email: fbEmail || undefined,
        message: fbMessage,
      });
      setFbStatus('sent');
      setFbName(''); setFbEmail(''); setFbMessage('');
    } catch {
      setFbStatus('error');
    }
  };

  return (
    <div className="dev-backdrop" onClick={onClose}>
      <div className="dev-sheet" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="dev-header">
          <div className="dev-header-left">
            <span className="dev-header-icon">👨‍💻</span>
            <span className="dev-header-title">Developer Info</span>
          </div>
          <button className="dev-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="dev-body">
          {/* Profile */}
          <div className="dev-profile">
            <div className="dev-avatar">👨‍💻</div>
            <div className="dev-name">Jeevan</div>
            <div className="dev-title">Full-Stack Mobile Developer</div>
            <div className="dev-tagline">
              Building cross-platform apps with React &amp; Capacitor
            </div>
          </div>

          {/* Social Links */}
          <div className="dev-section-title">Connect</div>
          <div className="dev-social-list">
            {SOCIAL_LINKS.map(s => (
              <a
                key={s.label}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="dev-social-card"
                style={{ '--accent': s.color } as React.CSSProperties}
              >
                <span className="dev-social-icon">{s.icon}</span>
                <div className="dev-social-info">
                  <div className="dev-social-label">{s.label}</div>
                  <div className="dev-social-handle">{s.handle}</div>
                </div>
                <svg className="dev-social-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </a>
            ))}
          </div>

          {/* Skills */}
          <div className="dev-section-title">Skills Used</div>
          <div className="dev-skills">
            {SKILLS.map(s => (
              <span className="dev-skill-chip" key={s}>{s}</span>
            ))}
          </div>

          {/* App Info */}
          <div className="dev-section-title">App Details</div>
          <div className="dev-info-card">
            {APP_INFO.map(({ label, value }) => (
              <div className="dev-info-row" key={label}>
                <span className="dev-info-label">{label}</span>
                <span className="dev-info-value">{value}</span>
              </div>
            ))}
          </div>

          <div className="dev-section-title">QA · Ads</div>
          <button
            type="button"
            className="dev-feedback-btn dev-qa-premium-toggle"
            onClick={() =>
              settings.premiumAdFree
                ? updateSettings({ premiumAdFree: false, premiumSource: undefined })
                : updateSettings({ premiumAdFree: true, premiumSource: 'local' })
            }
          >
            Premium (ad-free): {settings.premiumAdFree ? 'ON — tap to show ads again' : 'OFF — tap to hide ads'}
          </button>

          {/* Feedback Form */}
          <div className="dev-section-title">Send Feedback</div>
          <form className="dev-feedback-form" onSubmit={handleFeedbackSubmit}>
            <input
              className="dev-feedback-input"
              type="text"
              placeholder="Name (optional)"
              value={fbName}
              onChange={e => setFbName(e.target.value)}
              autoComplete="name"
            />
            <input
              className="dev-feedback-input"
              type="email"
              placeholder="Email (optional)"
              value={fbEmail}
              onChange={e => setFbEmail(e.target.value)}
              autoComplete="email"
            />
            <textarea
              className="dev-feedback-textarea"
              placeholder="Your message or feedback…"
              value={fbMessage}
              onChange={e => setFbMessage(e.target.value)}
              rows={4}
              required
            />
            {fbStatus === 'sent' && (
              <div className="dev-feedback-success">✅ Thanks for your feedback!</div>
            )}
            {fbStatus === 'error' && (
              <div className="dev-feedback-error">
                ❌ Something went wrong. Try again.
              </div>
            )}
            <button
              className="dev-feedback-btn"
              type="submit"
              disabled={fbStatus === 'sending' || !fbMessage.trim()}
            >
              {fbStatus === 'sending' ? 'Sending…' : 'Send Feedback'}
            </button>
          </form>

          {/* Footer */}
          <div className="dev-footer">
            Made with ❤️ · April 2026
          </div>
        </div>
      </div>
    </div>
  );
};
