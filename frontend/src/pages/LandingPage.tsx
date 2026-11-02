import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import './LandingPage.css';

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const auth = useAuth();
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <div className="page">
        <title>Sierra – The easy way to manage customer data</title>
        <header className={`nav${menuOpen ? ' open' : ''}`} id="nav">
          <a className="logo" href="#" aria-label="Sierra home">
            <img src="/favicon-1.svg" alt="" width="28" height="27" />
            Sierra
          </a>
          <nav className="links" aria-label="Primary">
            <Link to={auth.user ? '/dashboard' : '/login'}>
              {auth.user ? 'My account' : 'Log in'}
            </Link>
            <a href="#solutions">Solutions</a>
            <a href="#pricing">Pricing</a>
            <a href="#help">Help</a>
            <a href="#contact">Contact</a>
          </nav>
          <Link className="btn btn-violet" to={auth.user ? '/dashboard' : '/signup'}>
            {auth.user ? 'My account' : 'Get Started'}
          </Link>
          <button
            className="menu"
            id="menu"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </header>

        <section className="hero" id="signup">
          <span className="pill">Built for global customers</span>
          <h1>
            The easy way to <mark>manage</mark> customer data
          </h1>
          <p className="lede">
            Accelerate your business with our solutions. Harness cutting-edge technology, and a team
            to drive growth.
          </p>
          <form
            className="signup"
            onSubmit={(event) => {
              event.preventDefault();
              const email = String(new FormData(event.currentTarget).get('email') ?? '').trim();
              void navigate(auth.user ? '/dashboard' : '/signup', { state: { email } });
            }}
          >
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="Email"
              aria-label="Email address"
              required
              maxLength={254}
            />
            <button className="btn btn-white" type="submit">
              Try for free
            </button>
          </form>
        </section>

        <div
          className="shot-wrap"
          role="img"
          aria-label="Sierra dashboard showing 1,509 total customers and a refund requests panel"
        >
          <div className="win">
            <div className="bar">
              <i style={{ background: '#ff5f57' }}></i>
              <i style={{ background: '#febc2e' }}></i>
              <i style={{ background: '#28c840' }}></i>
              <span className="url"></span>
            </div>
            <div className="app">
              <aside className="side">
                <div className="mark"></div>
                <a>Home</a>
                <a>Products</a>
                <a>Customers</a>
                <div className="sub">
                  <a className="on">Overview</a>
                  <a>Customer list</a>
                </div>
                <a>Shop</a>
                <a>Income</a>
                <a>Promote</a>
              </aside>
              <div className="main">
                <div className="top">
                  <div className="search">Search or type a command</div>
                  <div className="create">+ Create</div>
                </div>
                <div className="cols">
                  <div className="card">
                    <h4>Total customers</h4>
                    <div className="big">1,509 customers</div>
                    <span className="up">↑ 37.8%</span>
                    <span style={{ color: 'var(--card-muted)' }}>vs. Sep 8, 2021</span>
                    <svg className="chart" viewBox="0 0 300 110" aria-hidden="true">
                      <g stroke="#ecebf5">
                        <path d="M0 20h300M0 50h300M0 80h300" />
                      </g>
                      <path
                        d="M0 70C20 90 30 90 45 50S70 20 90 55s30 40 50 5 25-30 45 5 25 40 45 0 25-45 45-35 25 50 30 55"
                        fill="none"
                        stroke="#7c4dec"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    <div className="card">
                      <h4>Refund requests</h4>
                      <div className="alert">
                        You have <b>52 open refund requests</b> to action.
                      </div>
                      <div className="ghost">Review refund requests</div>
                    </div>
                    <div className="card">
                      <h4>Top device</h4>
                      <svg className="donut" viewBox="0 0 42 42" aria-hidden="true">
                        <circle
                          cx="21"
                          cy="21"
                          r="15.9"
                          fill="none"
                          stroke="#ecebf5"
                          strokeWidth="5"
                        />
                        <circle
                          cx="21"
                          cy="21"
                          r="15.9"
                          fill="none"
                          stroke="#7c4dec"
                          strokeWidth="5"
                          strokeDasharray="68 32"
                          transform="rotate(-90 21 21)"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="features" id="solutions">
          <span className="pill">eCommerce Analytics</span>
          <h2>
            A powerful <mark>easy-to-use</mark> platform
          </h2>
          <p className="lede">
            Discover the core pillars of our platform – quality scores, expert software support, and
            tailored management assistance.
          </p>
          <div className="feat">
            <div className="ic">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="4" y="4" width="16" height="16" rx="3" />
                <path d="M8 15l3-3 2 2 3-4" />
              </svg>
            </div>
            <div>
              <h3>Quality scores</h3>
              <p>
                Keep your strategic goals and planning in one place to improve every customer
                touchpoint.
              </p>
            </div>
          </div>
          <div className="feat">
            <div className="ic">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="8" />
                <path d="M12 8v4l3 2" />
              </svg>
            </div>
            <div>
              <h3>Expert software support</h3>
              <p>Get answers from a team that knows your data and responds when you need it.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
