'use client'

import { useState } from 'react'
import { ORG_EMAIL, ORG_INSTAGRAM, ORG_INSTAGRAM_HANDLE } from '@/lib/constants'

type FormState = { firstName: string; lastName: string; phone: string; email: string; message: string }
type Status = 'idle' | 'loading' | 'success' | 'error'

const inputClass =
  'w-full border border-gray-200 bg-white px-4 py-3 text-sm text-[#0d0d0d] placeholder-gray-400 focus:outline-none focus:border-[#01255f] transition-colors'

export default function Contact() {
  const [form, setForm] = useState<FormState>({ firstName: '', lastName: '', phone: '', email: '', message: '' })
  const [newsletter, setNewsletter] = useState('')
  const [formStatus, setFormStatus] = useState<Status>('idle')
  const [nlStatus, setNlStatus] = useState<Status>('idle')

  const set = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormStatus('loading')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setFormStatus(res.ok ? 'success' : 'error')
      if (res.ok) setForm({ firstName: '', lastName: '', phone: '', email: '', message: '' })
    } catch { setFormStatus('error') }
  }

  const submitNl = async (e: React.FormEvent) => {
    e.preventDefault()
    setNlStatus('loading')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletter }),
      })
      setNlStatus(res.ok ? 'success' : 'error')
      if (res.ok) setNewsletter('')
    } catch { setNlStatus('error') }
  }

  return (
    <section id="contact" className="py-16 sm:py-24 lg:py-32 bg-[#f5f7fc]">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-10">

        <div className="mb-10 sm:mb-14">
          <span className="label">Get In Touch</span>
          <h2
            className="heading-underline text-2xl sm:text-3xl lg:text-[2.4rem] font-bold text-[#01255f] leading-tight"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Contact Us
          </h2>
          <p className="mt-5 text-[#5a6478] text-sm sm:text-base max-w-xl">
            For general enquiries use this form. To volunteer or explore a partnership, visit our{' '}
            <a href="/get-involved" className="text-[#01255f] font-semibold hover:underline">
              Get Involved
            </a>{' '}
            page.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">

          <div className="bg-white border border-gray-100 p-6 sm:p-8 lg:p-10">
            <h3
              className="font-bold text-[#01255f] text-base sm:text-lg mb-5 sm:mb-6"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Send a Message
            </h3>
            {formStatus === 'success' ? (
              <div className="py-10 sm:py-12 text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#01255f] flex items-center justify-center mx-auto mb-4">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#fee11b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-bold text-[#01255f] mb-1 text-sm sm:text-base">Message received</p>
                <p className="text-xs sm:text-sm text-[#5a6478]">We will be in touch shortly.</p>
                <button onClick={() => setFormStatus('idle')} className="mt-4 text-xs text-[#5a6478] underline">
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={submitForm} className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-[10px] sm:text-[11px] uppercase tracking-widest font-bold text-[#5a6478] mb-1.5">First Name *</label>
                    <input type="text" name="firstName" required value={form.firstName} onChange={set} className={inputClass} placeholder="Marcus" />
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-[11px] uppercase tracking-widest font-bold text-[#5a6478] mb-1.5">Last Name *</label>
                    <input type="text" name="lastName" required value={form.lastName} onChange={set} className={inputClass} placeholder="Kamara" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] sm:text-[11px] uppercase tracking-widest font-bold text-[#5a6478] mb-1.5">Phone</label>
                  <input type="tel" name="phone" value={form.phone} onChange={set} className={inputClass} placeholder="+231 77 000 0000" />
                </div>
                <div>
                  <label className="block text-[10px] sm:text-[11px] uppercase tracking-widest font-bold text-[#5a6478] mb-1.5">Email *</label>
                  <input type="email" name="email" required value={form.email} onChange={set} className={inputClass} placeholder="you@example.com" />
                </div>
                <div>
                  <label className="block text-[10px] sm:text-[11px] uppercase tracking-widest font-bold text-[#5a6478] mb-1.5">Message *</label>
                  <textarea name="message" required rows={4} value={form.message} onChange={set} className={`${inputClass} resize-none`} placeholder="Tell us how you would like to get involved..." />
                </div>
                {formStatus === 'error' && (
                  <p className="text-red-500 text-xs sm:text-sm">Something went wrong. Please try again.</p>
                )}
                <button
                  type="submit"
                  disabled={formStatus === 'loading'}
                  className="w-full bg-[#01255f] hover:bg-[#011840] active:scale-95 disabled:opacity-60 text-white py-3.5 text-sm font-bold tracking-wide transition-all"
                >
                  {formStatus === 'loading' ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            )}
          </div>

          <div className="space-y-4 sm:space-y-6">
            <div className="bg-[#01255f] p-6 sm:p-8 text-white">
              <h3
                className="font-bold text-sm sm:text-base mb-5 sm:mb-6"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Direct Contact
              </h3>
              <dl className="space-y-4 sm:space-y-5">
                {[
                  { label: 'Email', value: ORG_EMAIL, href: `mailto:${ORG_EMAIL}` },
                  { label: 'Location', value: 'Monrovia, Liberia', href: null },
                  { label: 'Instagram', value: ORG_INSTAGRAM_HANDLE, href: ORG_INSTAGRAM },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="grid grid-cols-[minmax(5.75rem,auto)_1fr] gap-x-4 gap-y-1 items-baseline"
                  >
                    <dt className="text-[10px] uppercase tracking-[0.12em] font-bold text-[#fee11b] whitespace-nowrap">
                      {item.label}
                    </dt>
                    <dd className="min-w-0 m-0">
                      {item.href ? (
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white/80 hover:text-white text-xs sm:text-sm transition-colors break-all"
                        >
                          {item.value}
                        </a>
                      ) : (
                        <span className="text-white/80 text-xs sm:text-sm">{item.value}</span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="bg-white border border-gray-100 p-6 sm:p-8">
              <h3
                className="font-bold text-[#01255f] text-sm sm:text-base mb-2"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Stay Updated
              </h3>
              <p className="text-xs sm:text-sm text-[#5a6478] mb-4 sm:mb-5">
                Subscribe for programme updates, stories from Monrovia, and impact reports.
              </p>
              {nlStatus === 'success' ? (
                <p className="text-sm font-semibold text-[#01255f]">Subscribed. Thank you.</p>
              ) : (
                <form onSubmit={submitNl} className="flex gap-0">
                  <input
                    type="email"
                    required
                    value={newsletter}
                    onChange={(e) => setNewsletter(e.target.value)}
                    className={`${inputClass} flex-1 min-w-0`}
                    placeholder="your@email.com"
                  />
                  <button
                    type="submit"
                    disabled={nlStatus === 'loading'}
                    className="bg-[#fee11b] hover:bg-[#e5ca10] active:scale-95 disabled:opacity-60 text-[#01255f] px-4 sm:px-5 text-xs sm:text-sm font-bold tracking-wide transition-all flex-shrink-0"
                  >
                    {nlStatus === 'loading' ? '...' : 'Join'}
                  </button>
                </form>
              )}

              <div className="mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-gray-100">
                <p className="text-[11px] text-[#5a6478] mb-3">Support our work directly</p>
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
                  <a
                    href="/donate"
                    className="inline-flex items-center justify-center min-h-11 px-6 py-2.5 text-xs sm:text-sm font-bold tracking-wide bg-[#01255f] hover:bg-[#011840] text-white transition-colors"
                  >
                    Donate
                  </a>
                  <a
                    href="/get-involved"
                    className="inline-flex items-center justify-center min-h-11 px-6 py-2.5 text-xs sm:text-sm font-bold tracking-wide border-2 border-[#01255f] text-[#01255f] hover:bg-[#01255f] hover:text-white transition-colors whitespace-nowrap"
                  >
                    Volunteer or partner
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
