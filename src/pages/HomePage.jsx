// ============================================================
//  HomePage.jsx — Public landing page for DTS Gym
//  Auto-sliding hero, gym info sections, Login/Sign Up buttons
// ============================================================
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { VITE_API_BASE_URL } from '../../index';

const API_BASE = VITE_API_BASE_URL?.replace(/\/+$/, '') || 'http://localhost:60748';

// ── Hero slides ───────────────────────────────────────────────
const SLIDES = [
  {
    url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1800&q=85',
    tag: 'State-of-the-Art Equipment',
    heading: 'FORGE YOUR\nBEST SELF',
    sub: 'World-class machines and equipment to push your limits further than you ever thought possible.',
  },
  {
    url: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=1800&q=85',
    tag: 'Expert Coaching',
    heading: 'TRAIN WITH\nCHAMPIONS',
    sub: 'Our certified trainers design personalised programs that deliver real, measurable results.',
  },
  {
    url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1800&q=85',
    tag: 'Community & Results',
    heading: 'JOIN A\nWINNING TEAM',
    sub: 'Be part of a motivated community that celebrates every milestone and keeps you accountable.',
  },
  {
    url: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=1800&q=85',
    tag: 'RFID Smart Access',
    heading: 'TECH-POWERED\nGYM EXPERIENCE',
    sub: 'Smart RFID check-in, digital tracking and real-time dashboards — fitness meets innovation.',
  },
];

// ── Stats ─────────────────────────────────────────────────────
const STATS = [
  { value: '500+', label: 'Active Members' },
  { value: '20+',  label: 'Expert Trainers' },
  { value: '50+',  label: 'Equipment Units' },
  { value: '5★',   label: 'Member Rating' },
];

// ── Features ──────────────────────────────────────────────────
const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="28" height="28">
        <path d="M6 4v16M18 4v16M2 9h4M18 9h4M2 15h4M18 15h4M6 9h12M6 15h12"/>
      </svg>
    ),
    title: 'Premium Equipment',
    desc: 'Over 50 units of professional-grade machines covering cardio, strength, and functional fitness.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="28" height="28">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
    title: 'Certified Trainers',
    desc: 'Hand-picked trainers with international certifications, dedicated to your personal progress.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="28" height="28">
        <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
      </svg>
    ),
    title: 'Smart RFID System',
    desc: 'Tap your RFID card to check in instantly. No queues, no hassle — your session starts the moment you arrive.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="28" height="28">
        <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
        <line x1="6" y1="15" x2="9" y2="15"/><line x1="12" y1="15" x2="15" y2="15"/>
      </svg>
    ),
    title: 'Flexible Plans',
    desc: 'Monthly, quarterly or annual memberships. Pay by card or cash with full payment history at your fingertips.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="28" height="28">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
    title: 'Schedule Management',
    desc: 'Book trainer sessions, view your programme calendar and track every workout from your member dashboard.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="28" height="28">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    title: 'Progress Tracking',
    desc: 'Real-time attendance logs, workout history and performance metrics to keep you motivated every day.',
  },
];

// ── Plans preview (fallback if API fails) ─────────────────────
const FALLBACK_PLANS = [
  {
    name: 'Starter',
    price: 'LKR 2,500',
    period: '/month',
    color: 'var(--gym-accent3)',
    perks: ['Full gym access', 'Locker room', 'RFID card included', 'Member dashboard'],
    highlight: false,
  },
  {
    name: 'Pro',
    price: 'LKR 4,500',
    period: '/month',
    color: 'var(--gym-accent)',
    perks: ['Everything in Starter', '2 trainer sessions/week', 'Personalised programme', 'Priority booking'],
    highlight: true,
  },
  {
    name: 'Elite',
    price: 'LKR 7,500',
    period: '/month',
    color: 'var(--gym-warning)',
    perks: ['Everything in Pro', 'Unlimited trainer access', 'Nutrition guidance', 'VIP check-in'],
    highlight: false,
  },
];

// Color palette for dynamically loaded plans
const PLAN_COLORS = ['var(--gym-accent3)', 'var(--gym-accent)', 'var(--gym-warning)', '#b47fff', '#ff6b9d'];
const PLAN_COLOR_MAP = {
  silver: 'var(--gym-accent3)',
  gold: 'var(--gym-warning)',
  platinum: 'var(--gym-accent)',
  starter: 'var(--gym-accent3)',
  pro: 'var(--gym-accent)',
  elite: 'var(--gym-warning)',
  basic: 'var(--gym-accent3)',
  premium: '#b47fff',
};

function formatPlanPrice(price) {
  const num = parseFloat(price);
  if (isNaN(num)) return price;
  return `LKR ${num.toLocaleString()}`;
}

function getPlanColor(planType, index) {
  const key = (planType || '').toLowerCase();
  for (const [k, v] of Object.entries(PLAN_COLOR_MAP)) {
    if (key.includes(k)) return v;
  }
  return PLAN_COLORS[index % PLAN_COLORS.length];
}

function getDurationLabel(days) {
  const d = parseInt(days);
  if (isNaN(d)) return '';
  if (d <= 31) return '/month';
  if (d <= 93) return '/quarter';
  if (d <= 186) return '/6 months';
  if (d <= 366) return '/year';
  return `/${d} days`;
}

export default function HomePage() {
  const navigate = useNavigate();
  const [current, setCurrent]   = useState(0);
  const [fading,  setFading]    = useState(false);
  const [navOpen, setNavOpen]   = useState(false);
  const [plans,   setPlans]     = useState([]);
  const [planPage, setPlanPage] = useState(0);
  const intervalRef = useRef(null);

  // Fetch real plans from API
  useEffect(() => {
    let cancelled = false;
    axios.get(`${API_BASE}/Plan/GetAllPlan`)
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.ResultSet || [];
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((p, i) => ({
            id: p.planId,
            name: p.planType || `Plan #${p.planId}`,
            price: formatPlanPrice(p.price),
            period: getDurationLabel(p.duration_days),
            color: getPlanColor(p.planType, i),
            duration: p.duration_days,
            perks: [
              'Full gym access',
              'RFID card included',
              'Member dashboard',
              `${p.duration_days} days validity`,
            ],
            highlight: i === Math.floor(data.length / 2), // Highlight middle plan
          }));
          setPlans(mapped);
        } else {
          setPlans(FALLBACK_PLANS);
        }
      })
      .catch(() => {
        if (!cancelled) setPlans(FALLBACK_PLANS);
      });
    return () => { cancelled = true; };
  }, []);

  // Auto-slide every 5 s
  const goTo = (idx) => {
    setFading(true);
    setTimeout(() => {
      setCurrent(idx);
      setFading(false);
    }, 400);
  };

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrent((c) => {
        const next = (c + 1) % SLIDES.length;
        goTo(next);
        return c; // goTo handles state
      });
    }, 5000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const slide = SLIDES[current];

  return (
    <div style={{ background: '#0a0a0c', color: '#f0f0f5', fontFamily: "'DM Sans', sans-serif", overflowX: 'hidden' }}>

      {/* ── NAVBAR ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 5vw', height: 68,
        background: 'rgba(10,10,12,0.88)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <svg viewBox="0 0 40 40" fill="none" width="32" height="32">
            <rect x="4"  y="15" width="6"  height="10" rx="2" fill="#e8ff47" opacity="0.9"/>
            <rect x="2"  y="13" width="4"  height="14" rx="2" fill="#e8ff47"/>
            <rect x="30" y="15" width="6"  height="10" rx="2" fill="#e8ff47" opacity="0.9"/>
            <rect x="34" y="13" width="4"  height="14" rx="2" fill="#e8ff47"/>
            <rect x="10" y="18" width="20" height="4"  rx="2" fill="#e8ff47" opacity="0.7"/>
          </svg>
          <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 26, letterSpacing: 4, color: '#e8ff47', lineHeight: 1 }}>DTS GYM</span>
        </div>

        {/* Desktop nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="home-desktop-links">
          {['Features', 'Plans', 'About'].map((item) => (
            <a key={item}
              href={`#${item.toLowerCase()}`}
              style={{ color: 'rgba(240,240,245,0.65)', fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'color .2s' }}
              onMouseEnter={(e) => e.target.style.color = '#f0f0f5'}
              onMouseLeave={(e) => e.target.style.color = 'rgba(240,240,245,0.65)'}
            >
              {item}
            </a>
          ))}
        </div>

        {/* Auth buttons */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '8px 20px', borderRadius: 8, border: '1px solid rgba(232,255,71,0.4)',
              background: 'transparent', color: '#e8ff47', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all .2s',
              letterSpacing: 0.3,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(232,255,71,0.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            Log In
          </button>
          <button
            onClick={() => navigate('/register')}
            style={{
              padding: '8px 22px', borderRadius: 8, border: 'none',
              background: '#e8ff47', color: '#0a0a0c', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all .2s',
              letterSpacing: 0.3,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#d4eb2a'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#e8ff47'; }}
          >
            Sign Up
          </button>
        </div>
      </nav>

      {/* ── HERO SLIDER ── */}
      <section style={{ position: 'relative', height: '100vh', minHeight: 600, overflow: 'hidden' }}>
        {/* Background image */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url('${slide.url}')`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          transition: 'opacity 0.4s ease',
          opacity: fading ? 0 : 1,
        }} />

        {/* Overlay gradient */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to right, rgba(10,10,12,0.92) 40%, rgba(10,10,12,0.5) 70%, rgba(10,10,12,0.2) 100%)',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(10,10,12,0.7) 0%, transparent 50%)',
        }} />

        {/* Content */}
        <div style={{
          position: 'relative', height: '100%',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '0 8vw', paddingTop: 68, maxWidth: 760,
          transition: 'opacity 0.4s ease', opacity: fading ? 0 : 1,
        }}>
          <div style={{
            display: 'inline-block', marginBottom: 18,
            padding: '5px 14px', borderRadius: 100,
            background: 'rgba(232,255,71,0.12)', border: '1px solid rgba(232,255,71,0.3)',
            color: '#e8ff47', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase',
          }}>
            {slide.tag}
          </div>
          <h1 style={{
            fontFamily: "'Bebas Neue', cursive",
            fontSize: 'clamp(52px, 8vw, 96px)',
            lineHeight: 0.95, letterSpacing: 2, color: '#f0f0f5',
            margin: '0 0 20px',
            whiteSpace: 'pre-line',
          }}>
            {slide.heading}
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(240,240,245,0.7)', lineHeight: 1.6, maxWidth: 500, marginBottom: 36 }}>
            {slide.sub}
          </p>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/register')}
              style={{
                padding: '14px 32px', borderRadius: 8, border: 'none',
                background: '#e8ff47', color: '#0a0a0c', fontSize: 16, fontWeight: 700,
                cursor: 'pointer', fontFamily: "'Bebas Neue', cursive", letterSpacing: 2,
              }}
            >
              JOIN NOW
            </button>
            <button
              onClick={() => navigate('/login')}
              style={{
                padding: '14px 32px', borderRadius: 8,
                border: '1px solid rgba(240,240,245,0.25)',
                background: 'rgba(240,240,245,0.05)', color: '#f0f0f5',
                fontSize: 16, fontWeight: 700, cursor: 'pointer',
                fontFamily: "'Bebas Neue', cursive", letterSpacing: 2, backdropFilter: 'blur(8px)',
              }}
            >
              MEMBER LOGIN
            </button>
          </div>
        </div>

        {/* Slide dots */}
        <div style={{
          position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: 10, zIndex: 10,
        }}>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              style={{
                width: i === current ? 28 : 8, height: 8, borderRadius: 4,
                border: 'none', cursor: 'pointer',
                background: i === current ? '#e8ff47' : 'rgba(240,240,245,0.3)',
                transition: 'all 0.35s ease', padding: 0,
              }}
            />
          ))}
        </div>

        {/* Slide arrows */}
        <button
          onClick={() => goTo((current - 1 + SLIDES.length) % SLIDES.length)}
          style={{
            position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)',
            width: 44, height: 44, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(10,10,12,0.5)', color: '#f0f0f5', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <button
          onClick={() => goTo((current + 1) % SLIDES.length)}
          style={{
            position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)',
            width: 44, height: 44, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(10,10,12,0.5)', color: '#f0f0f5', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </section>

      {/* ── STATS BAR ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(17,17,22,0.9)',
      }}>
        {STATS.map((s, i) => (
          <div key={i} style={{
            padding: '28px 0', textAlign: 'center',
            borderRight: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none',
          }}>
            <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 38, color: '#e8ff47', lineHeight: 1, letterSpacing: 2 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'rgba(240,240,245,0.45)', marginTop: 6, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── FEATURES ── */}
      <section id="features" style={{ padding: '96px 8vw' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ color: '#e8ff47', fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12 }}>WHAT WE OFFER</div>
          <h2 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 'clamp(36px, 5vw, 56px)', letterSpacing: 2, margin: 0 }}>EVERYTHING YOU NEED</h2>
          <p style={{ color: 'rgba(240,240,245,0.5)', fontSize: 15, marginTop: 14, maxWidth: 520, margin: '14px auto 0' }}>
            DTS Gym is built around a smart, tech-driven experience that goes beyond just lifting weights.
          </p>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20,
        }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{
              background: '#111116', border: '1px solid #1e1e28',
              borderRadius: 16, padding: '28px 24px',
              transition: 'border-color .2s, transform .2s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(232,255,71,0.3)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1e1e28'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ color: '#e8ff47', marginBottom: 14 }}>{f.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: 'rgba(240,240,245,0.5)', lineHeight: 1.65 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── GYM INFO / ABOUT ── */}
      <section id="about" style={{
        padding: '80px 8vw',
        background: '#111116',
        borderTop: '1px solid #1e1e28',
        borderBottom: '1px solid #1e1e28',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5vw', alignItems: 'center' }}>
          {/* Left — image */}
          <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', aspectRatio: '4/3' }}>
            <img
              src="https://images.unsplash.com/photo-1593079831268-3381b0db4a77?w=900&q=80"
              alt="DTS Gym interior"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            <div style={{
              position: 'absolute', bottom: 20, left: 20,
              background: 'rgba(10,10,12,0.85)', backdropFilter: 'blur(10px)',
              border: '1px solid rgba(232,255,71,0.25)', borderRadius: 12, padding: '12px 20px',
            }}>
              <div style={{ fontSize: 11, color: '#e8ff47', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>Established</div>
              <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 28, color: '#f0f0f5', letterSpacing: 3 }}>DTS GYM</div>
            </div>
          </div>

          {/* Right — text */}
          <div>
            <div style={{ color: '#e8ff47', fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 14 }}>ABOUT US</div>
            <h2 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 'clamp(32px, 4vw, 52px)', letterSpacing: 2, margin: '0 0 20px', lineHeight: 1 }}>
              MORE THAN<br/>A GYM
            </h2>
            <p style={{ color: 'rgba(240,240,245,0.6)', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
              DTS Gym is a premium fitness facility powered by smart technology. Our RFID-based access system, 
              digital member dashboards, and certified trainer network make us the most efficient and motivating 
              gym in the region.
            </p>
            <p style={{ color: 'rgba(240,240,245,0.6)', fontSize: 14, lineHeight: 1.8, marginBottom: 28 }}>
              Whether you're a beginner taking your first steps or an athlete chasing peak performance, 
              our facilities, trainers and community will help you get there — faster.
            </p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {[
                { icon: '🕐', label: 'Open 5 AM – 11 PM' },
                { icon: '📍', label: 'Colombo, Sri Lanka' },
                { icon: '📞', label: '+94 77 000 0000' },
              ].map((item) => (
                <div key={item.label} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: '#18181f', border: '1px solid #1e1e28',
                  borderRadius: 10, padding: '10px 16px', fontSize: 13,
                  color: 'rgba(240,240,245,0.7)',
                }}>
                  <span>{item.icon}</span> {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PLANS ── */}
      <section id="plans" style={{ padding: '96px 8vw' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ color: '#e8ff47', fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12 }}>MEMBERSHIP</div>
          <h2 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 'clamp(36px, 5vw, 56px)', letterSpacing: 2, margin: 0 }}>CHOOSE YOUR PLAN</h2>
          <p style={{ color: 'rgba(240,240,245,0.5)', fontSize: 15, marginTop: 14 }}>
            Flexible plans built for every goal and budget. No hidden fees.
          </p>
        </div>
        {(() => {
          const list = [...(plans.length > 0 ? plans : FALLBACK_PLANS)]
            .sort((a, b) => (parseInt(a.duration) || 0) - (parseInt(b.duration) || 0));
          const PER_VIEW = 3;
          const pageCount = Math.max(1, Math.ceil(list.length / PER_VIEW));
          const safePage = Math.min(planPage, pageCount - 1);
          const pages = [];
          for (let i = 0; i < list.length; i += PER_VIEW) pages.push(list.slice(i, i + PER_VIEW));

          const goPrev = () => setPlanPage((p) => (p - 1 + pageCount) % pageCount);
          const goNext = () => setPlanPage((p) => (p + 1) % pageCount);

          const ArrowBtn = ({ dir, onClick }) => (
            <button
              onClick={onClick}
              aria-label={dir === 'prev' ? 'Previous plans' : 'Next plans'}
              style={{
                flexShrink: 0, width: 44, height: 44, borderRadius: '50%',
                border: '1px solid rgba(232,255,71,0.3)', background: 'rgba(232,255,71,0.06)',
                color: '#e8ff47', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all .2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(232,255,71,0.16)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(232,255,71,0.06)'; }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                {dir === 'prev' ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
              </svg>
            </button>
          );

          return (
            <div style={{ maxWidth: 1040, margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {pageCount > 1 && <ArrowBtn dir="prev" onClick={goPrev} />}

                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{
                    display: 'flex',
                    transform: `translateX(-${safePage * 100}%)`,
                    transition: 'transform .45s cubic-bezier(.4,0,.2,1)',
                  }}>
                    {pages.map((page, pageIdx) => (
                      <div key={pageIdx} style={{
                        flex: '0 0 100%',
                        display: 'grid',
                        gridTemplateColumns: `repeat(${PER_VIEW}, 1fr)`,
                        gap: 20,
                      }}>
                        {page.map((plan) => (
                          <div key={plan.name || plan.id} style={{
                            background: plan.highlight ? 'rgba(232,255,71,0.05)' : '#111116',
                            border: `1px solid ${plan.highlight ? 'rgba(232,255,71,0.4)' : '#1e1e28'}`,
                            borderRadius: 20, padding: '32px 28px',
                            position: 'relative', overflow: 'hidden',
                          }}>
                            {plan.highlight && (
                              <div style={{
                                position: 'absolute', top: 16, right: 16,
                                background: '#e8ff47', color: '#0a0a0c',
                                fontSize: 10, fontWeight: 800, letterSpacing: 1.5,
                                padding: '4px 10px', borderRadius: 100, textTransform: 'uppercase',
                              }}>Most Popular</div>
                            )}
                            <div style={{ fontSize: 11, color: plan.color, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>{plan.name}</div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 24 }}>
                              <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 42, color: plan.color, letterSpacing: 1 }}>{plan.price}</span>
                              <span style={{ fontSize: 13, color: 'rgba(240,240,245,0.4)' }}>{plan.period}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                              {plan.perks.map((p) => (
                                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'rgba(240,240,245,0.7)' }}>
                                  <svg viewBox="0 0 24 24" fill="none" stroke={plan.color} strokeWidth="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
                                  {p}
                                </div>
                              ))}
                            </div>
                            <button
                              onClick={() => navigate('/register')}
                              style={{
                                width: '100%', padding: '12px 0', borderRadius: 8,
                                border: plan.highlight ? 'none' : `1px solid ${plan.color}40`,
                                background: plan.highlight ? '#e8ff47' : 'rgba(255,255,255,0.05)',
                                color: plan.highlight ? '#0a0a0c' : '#f0f0f5',
                                fontWeight: 700, fontSize: 14, cursor: 'pointer',
                                fontFamily: "'DM Sans', sans-serif", transition: 'all .2s',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                            >
                              Get Started
                            </button>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {pageCount > 1 && <ArrowBtn dir="next" onClick={goNext} />}
              </div>

              {/* Dot pagination */}
              {pageCount > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 32 }}>
                  {pages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPlanPage(i)}
                      aria-label={`Go to plan page ${i + 1}`}
                      style={{
                        width: safePage === i ? 22 : 9, height: 9, borderRadius: 5,
                        border: 'none', cursor: 'pointer', padding: 0,
                        background: safePage === i ? '#e8ff47' : 'rgba(240,240,245,0.25)',
                        transition: 'all .25s',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </section>

      {/* ── CTA BANNER ── */}
      <section style={{
        margin: '0 8vw 80px',
        borderRadius: 24,
        background: 'linear-gradient(135deg, rgba(232,255,71,0.12) 0%, rgba(71,200,255,0.08) 100%)',
        border: '1px solid rgba(232,255,71,0.2)',
        padding: '56px 8%', textAlign: 'center',
      }}>
        <h2 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 'clamp(32px, 5vw, 56px)', letterSpacing: 3, margin: '0 0 14px' }}>
          READY TO START?
        </h2>
        <p style={{ color: 'rgba(240,240,245,0.55)', fontSize: 15, marginBottom: 32, maxWidth: 480, margin: '0 auto 32px' }}>
          Create your free account today. Your first step towards a stronger you starts right here.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/register')}
            style={{
              padding: '14px 36px', borderRadius: 8, border: 'none',
              background: '#e8ff47', color: '#0a0a0c', fontSize: 15, fontWeight: 800,
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Create Free Account
          </button>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '14px 36px', borderRadius: 8,
              border: '1px solid rgba(240,240,245,0.2)',
              background: 'transparent', color: '#f0f0f5',
              fontSize: 15, fontWeight: 600, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Already a Member? Log In
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        borderTop: '1px solid #1e1e28', padding: '32px 8vw',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg viewBox="0 0 40 40" fill="none" width="22" height="22">
            <rect x="4"  y="15" width="6"  height="10" rx="2" fill="#e8ff47"/>
            <rect x="2"  y="13" width="4"  height="14" rx="2" fill="#e8ff47"/>
            <rect x="30" y="15" width="6"  height="10" rx="2" fill="#e8ff47"/>
            <rect x="34" y="13" width="4"  height="14" rx="2" fill="#e8ff47"/>
            <rect x="10" y="18" width="20" height="4"  rx="2" fill="#e8ff47" opacity="0.7"/>
          </svg>
          <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 18, letterSpacing: 3, color: '#e8ff47' }}>DTS GYM</span>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(240,240,245,0.35)' }}>
          © {new Date().getFullYear()} DTS Gym Management System. All rights reserved.
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @media (max-width: 700px) {
          .home-desktop-links { display: none !important; }
        }
        @media (max-width: 640px) {
          section[id="about"] > div { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}