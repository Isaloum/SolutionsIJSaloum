import { useState } from 'react'
// eslint-disable-next-line @typescript-eslint/no-unused-vars

const NAV_LINKS = ['Products', 'Services', 'Stack', 'Contact']

const PRODUCTS = [
  {
    emoji: '🎓',
    name: 'CertiPrepAI',
    tagline: 'AWS Certification Prep Platform',
    desc: 'Practice questions, timed mock exams, cheat sheets, and an AI Coach for all 12 AWS certifications. Tracks weak domains with a skill radar so you study smarter.',
    stack: ['React', 'TypeScript', 'AWS Amplify', 'Lambda', 'DynamoDB', 'Cognito', 'Stripe'],
    url: 'https://certiprepai.com',
    status: 'Live',
  },
  {
    emoji: '🧾',
    name: 'TaxFlowAI',
    tagline: 'AI-Powered Tax Document Management',
    desc: 'Upload, classify, and extract data from T4, RL-1, and T5 slips using GPT-4o. Built for Canadian accountants and their clients. Bilingual FR/EN.',
    stack: ['Next.js', 'NestJS', 'PostgreSQL', 'GPT-4o', 'AWS SES'],
    url: '#',
    status: 'Beta',
  },
  {
    emoji: '🚗',
    name: 'TaxSyncForDrivers',
    tagline: 'Canadian Tax Calculator for Rideshare Drivers',
    desc: 'Expense tracker and tax calculator for self-employed rideshare drivers. Covers all 10 provinces and 3 territories with 2026 CRA rates. 100% client-side.',
    stack: ['React', 'TypeScript', 'AWS Lambda', 'Serverless'],
    url: '#',
    status: 'Live',
  },
]

const SERVICES = [
  {
    icon: '☁️',
    title: 'Cloud Architecture',
    desc: 'Serverless-first architecture on AWS. Lambda, DynamoDB, Cognito, CloudFront, Amplify. Scalable from day one, cost-effective at every stage.',
  },
  {
    icon: '⚡',
    title: 'Full Stack Development',
    desc: 'End-to-end product development — React frontend, serverless backend, CI/CD pipeline, and production deployment. From idea to live product.',
  },
  {
    icon: '🤖',
    title: 'AI Integration',
    desc: 'Claude, GPT-4o, and AWS Bedrock integrations built into production applications. RAG pipelines, AI coaching, document extraction, and more.',
  },
  {
    icon: '💳',
    title: 'SaaS & Billing',
    desc: 'Stripe subscription management, prorated upgrades, webhook automation, and multi-tier access control. Production-grade billing from day one.',
  },
]

const STACK = [
  'React', 'TypeScript', 'Node.js', 'Next.js', 'NestJS',
  'AWS Lambda', 'DynamoDB', 'Cognito', 'Amplify', 'CloudFront',
  'S3', 'SES', 'EventBridge', 'API Gateway', 'Route 53',
  'Stripe', 'GPT-4o', 'Claude (Anthropic)', 'AWS Bedrock', 'PostgreSQL',
]

export default function App() {
  const [formSent, setFormSent] = useState(false)

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", color: '#0f172a', background: '#fff', minHeight: '100vh' }}>

      {/* NAVBAR */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #e2e8f0', padding: '0 2rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '68px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src="/logo.png" alt="Solutions IJ Saloum" style={{ height: '42px', width: 'auto' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', letterSpacing: '-0.02em' }}>Solutions IJ Saloum</span>
          </div>
          {/* Desktop nav */}
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            {NAV_LINKS.map(l => (
              <button key={l} onClick={() => scrollTo(l.toLowerCase())} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, color: '#475569', padding: '0.25rem 0' }}>
                {l}
              </button>
            ))}
            <button onClick={() => scrollTo('contact')} style={{ background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.5rem 1.25rem', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
              Get in Touch
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderBottom: '1px solid #e2e8f0', padding: '6rem 2rem 5rem' }}>
        <div style={{ maxWidth: '820px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', background: '#dbeafe', color: '#1e40af', fontSize: '0.78rem', fontWeight: 700, padding: '0.35rem 1rem', borderRadius: '999px', marginBottom: '1.5rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Cloud Architecture · AI Development · SaaS
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)', fontWeight: 900, lineHeight: 1.15, letterSpacing: '-0.03em', color: '#0f172a', marginBottom: '1.25rem' }}>
            We build AI-powered products<br />on AWS serverless infrastructure
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#475569', lineHeight: 1.7, marginBottom: '2.5rem', maxWidth: '600px', margin: '0 auto 2.5rem' }}>
            From architecture to deployment — we design, build, and ship production-ready SaaS products with modern cloud technology and AI at the core.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => scrollTo('products')} style={{ background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.85rem 2rem', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
              View Our Products →
            </button>
            <button onClick={() => scrollTo('contact')} style={{ background: '#fff', color: '#1e3a5f', border: '2px solid #1e3a5f', borderRadius: '10px', padding: '0.85rem 2rem', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
              Work With Us
            </button>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section style={{ background: '#1e3a5f', padding: '2rem' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', textAlign: 'center' }}>
          {[
            { n: '3+', label: 'Live Products' },
            { n: '3,910+', label: 'Questions in CertiPrepAI' },
            { n: '12', label: 'AWS Certs Covered' },
            { n: '100%', label: 'Serverless Infrastructure' },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#fff' }}>{s.n}</div>
              <div style={{ fontSize: '0.82rem', color: '#93c5fd', fontWeight: 600, marginTop: '0.25rem' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PRODUCTS */}
      <section id="products" style={{ padding: '5rem 2rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.75rem' }}>Our Products</h2>
            <p style={{ color: '#64748b', fontSize: '1rem' }}>Production-ready SaaS applications built from the ground up</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {PRODUCTS.map(p => (
              <div key={p.name} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.75rem' }}>{p.emoji}</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>{p.name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>{p.tagline}</div>
                    </div>
                  </div>
                  <span style={{ background: p.status === 'Live' ? '#dcfce7' : '#fef9c3', color: p.status === 'Live' ? '#16a34a' : '#854d0e', fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.65rem', borderRadius: '999px' }}>
                    {p.status}
                  </span>
                </div>
                <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.65, marginBottom: '1.25rem', flex: 1 }}>{p.desc}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.25rem' }}>
                  {p.stack.map(t => (
                    <span key={t} style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.72rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: '6px' }}>{t}</span>
                  ))}
                </div>
                {p.url !== '#' && (
                  <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', background: '#1e3a5f', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: '0.85rem', padding: '0.6rem 1.25rem', borderRadius: '8px', textAlign: 'center' }}>
                    Visit {p.name} →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '5rem 2rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.75rem' }}>What We Do</h2>
            <p style={{ color: '#64748b', fontSize: '1rem' }}>End-to-end development for founders and businesses ready to build</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
            {SERVICES.map(s => (
              <div key={s.title} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.75rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{s.icon}</div>
                <h3 style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', marginBottom: '0.5rem' }}>{s.title}</h3>
                <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.65 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TECH STACK */}
      <section id="stack" style={{ padding: '5rem 2rem' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.75rem' }}>Our Tech Stack</h2>
          <p style={{ color: '#64748b', fontSize: '1rem', marginBottom: '2.5rem' }}>Technologies we use in production every day</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', justifyContent: 'center' }}>
            {STACK.map(t => (
              <span key={t} style={{ background: '#f1f5f9', color: '#1e3a5f', fontSize: '0.85rem', fontWeight: 700, padding: '0.45rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '5rem 2rem' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.75rem' }}>Get in Touch</h2>
          <p style={{ color: '#64748b', fontSize: '1rem', marginBottom: '2.5rem' }}>Have a project in mind? We'd love to hear about it.</p>
          {formSent ? (
            <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: '12px', padding: '2rem', color: '#166534', fontWeight: 700 }}>
              ✅ Message sent. We'll get back to you shortly.
            </div>
          ) : (
            <form onSubmit={e => { e.preventDefault(); setFormSent(true) }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <input required placeholder="First name" style={inputStyle} />
                <input required placeholder="Last name" style={inputStyle} />
              </div>
              <input required type="email" placeholder="Email address" style={inputStyle} />
              <input placeholder="Company (optional)" style={inputStyle} />
              <textarea required placeholder="Tell us about your project..." rows={5} style={{ ...inputStyle, resize: 'vertical' }} />
              <button type="submit" style={{ background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.9rem', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
                Send Message →
              </button>
              <p style={{ textAlign: 'center', fontSize: '0.82rem', color: '#94a3b8' }}>
                Or email us directly at <a href="mailto:support@solutionij.com" style={{ color: '#1e3a5f', fontWeight: 700 }}>support@solutionij.com</a>
              </p>
            </form>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#0f172a', color: '#94a3b8', padding: '2.5rem 2rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ fontWeight: 800, color: '#fff', fontSize: '1rem', marginBottom: '0.5rem' }}>Solutions IJ Saloum</div>
          <div style={{ fontSize: '0.82rem', marginBottom: '1rem' }}>Cloud Architecture · AI Development · SaaS</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', fontSize: '0.82rem', flexWrap: 'wrap' }}>
            <a href="https://certiprepai.com" style={{ color: '#60a5fa', textDecoration: 'none' }}>CertiPrepAI</a>
            <span>·</span>
            <a href="mailto:support@solutionij.com" style={{ color: '#60a5fa', textDecoration: 'none' }}>support@solutionij.com</a>
            <span>·</span>
            <span>Laval, Quebec, Canada</span>
          </div>
          <div style={{ marginTop: '1.5rem', fontSize: '0.78rem', color: '#475569' }}>
            © {new Date().getFullYear()} Solutions IJ Saloum. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  fontSize: '0.9rem',
  outline: 'none',
  background: '#fff',
  color: '#0f172a',
  width: '100%',
  boxSizing: 'border-box',
}
