'use client'

import { useState } from 'react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import {
  SELECT_ALL_HINT,
  VOLUNTEER_AVAILABILITY_OPTIONS,
  VOLUNTEER_SKILLS_OPTIONS,
} from '@/lib/inquiry-options'

type InquiryType = 'volunteer' | 'partnership'

type FormState = {
  inquiryType: InquiryType
  firstName: string
  lastName: string
  email: string
  phone: string
  organization: string
  message: string
  availability: string
  skills: string[]
  experience: string
  partnershipType: string
  proposedCollaboration: string
  website: string
}

const inputClass =
  'w-full border border-gray-200 bg-white px-4 py-3 text-sm text-[#0d0d0d] placeholder-gray-400 focus:outline-none focus:border-[#01255f] transition-colors'

const labelClass = 'block text-[10px] uppercase tracking-widest font-bold text-[#5a6478] mb-1.5'

export default function GetInvolvedPage() {
  const [form, setForm] = useState<FormState>({
    inquiryType: 'volunteer',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    organization: '',
    message: '',
    availability: '',
    skills: [],
    experience: '',
    partnershipType: '',
    proposedCollaboration: '',
    website: '',
  })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const set =
    (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [field]: e.target.value }))
    }

  const setMulti = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(e.target.selectedOptions, (option) => option.value)
    setForm((f) => ({ ...f, skills: selected }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Something went wrong. Please try again.')
        setStatus('error')
        return
      }
      setStatus('success')
    } catch {
      setStatus('error')
      setErrorMsg('Something went wrong. Please try again.')
    }
  }

  const isVolunteer = form.inquiryType === 'volunteer'

  return (
    <>
      <Navbar />
      <main className="pt-16 lg:pt-[70px]">
        <div className="bg-[#01255f] py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-10">
            <span className="label-light">Join Us</span>
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mt-4 mb-4"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Get Involved
            </h1>
            <p className="text-white/60 text-sm sm:text-base max-w-2xl">
              Volunteer your time or explore a partnership with Asfall United. Tell us how you would like to
              contribute — we review every submission personally.
            </p>
          </div>
        </div>

        <div className="bg-[#f5f7fc] py-14 sm:py-20">
          <div className="max-w-2xl mx-auto px-5 sm:px-6">
            {status === 'success' ? (
              <div className="bg-white border border-gray-100 p-10 text-center">
                <div className="w-12 h-12 bg-[#01255f] flex items-center justify-center mx-auto mb-4">
                  <svg className="w-5 h-5 text-[#fee11b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-bold text-[#01255f] mb-2">Thank you</p>
                <p className="text-sm text-[#5a6478]">We have received your inquiry and will respond shortly.</p>
                <button
                  type="button"
                  onClick={() => setStatus('idle')}
                  className="mt-6 text-xs text-[#5a6478] underline"
                >
                  Submit another inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="bg-white border border-gray-100 p-6 sm:p-10 space-y-5">
                <div>
                  <label htmlFor="inquiry-type" className={labelClass}>
                    Inquiry type *
                  </label>
                  <select
                    id="inquiry-type"
                    required
                    value={form.inquiryType}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, inquiryType: e.target.value as InquiryType }))
                    }
                    className={inputClass}
                  >
                    <option value="volunteer">Volunteer</option>
                    <option value="partnership">Partnership</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>First name *</label>
                    <input required value={form.firstName} onChange={set('firstName')} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Last name *</label>
                    <input required value={form.lastName} onChange={set('lastName')} className={inputClass} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Email *</label>
                  <input type="email" required value={form.email} onChange={set('email')} className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Phone</label>
                  <input type="tel" value={form.phone} onChange={set('phone')} className={inputClass} />
                </div>

                {!isVolunteer && (
                  <>
                    <div>
                      <label className={labelClass}>Organisation *</label>
                      <input
                        required
                        value={form.organization}
                        onChange={set('organization')}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Partnership type *</label>
                      <select
                        required
                        value={form.partnershipType}
                        onChange={set('partnershipType')}
                        className={inputClass}
                      >
                        <option value="">Select…</option>
                        <option value="Corporate sponsorship">Corporate sponsorship</option>
                        <option value="NGO / INGO collaboration">NGO / INGO collaboration</option>
                        <option value="In-kind support">In-kind support</option>
                        <option value="Programme funding">Programme funding</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Website</label>
                      <input type="url" value={form.website} onChange={set('website')} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Proposed collaboration</label>
                      <textarea
                        rows={3}
                        value={form.proposedCollaboration}
                        onChange={set('proposedCollaboration')}
                        className={`${inputClass} resize-none`}
                        placeholder="How would you like to work with Asfall United?"
                      />
                    </div>
                  </>
                )}

                {isVolunteer && (
                  <>
                    <div>
                      <label htmlFor="availability" className={labelClass}>
                        Availability *
                      </label>
                      <select
                        id="availability"
                        required
                        value={form.availability}
                        onChange={set('availability')}
                        className={inputClass}
                      >
                        <option value="">Select…</option>
                        {VOLUNTEER_AVAILABILITY_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="skills" className={labelClass}>
                        Skills & interests
                      </label>
                      <p className="text-xs text-[#5a6478] mb-2">{SELECT_ALL_HINT}</p>
                      <select
                        id="skills"
                        multiple
                        value={form.skills}
                        onChange={setMulti}
                        className={`${inputClass} min-h-[10.5rem] py-2`}
                      >
                        {VOLUNTEER_SKILLS_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      {form.skills.length > 0 && (
                        <p className="text-xs text-[#01255f] mt-2 font-medium">
                          Selected: {form.skills.join(' · ')}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className={labelClass}>Relevant experience</label>
                      <textarea
                        rows={3}
                        value={form.experience}
                        onChange={set('experience')}
                        className={`${inputClass} resize-none`}
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className={labelClass}>Message *</label>
                  <textarea
                    required
                    rows={4}
                    value={form.message}
                    onChange={set('message')}
                    className={`${inputClass} resize-none`}
                    placeholder={
                      isVolunteer
                        ? 'Why do you want to volunteer with Asfall United?'
                        : 'Tell us about your organisation and goals'
                    }
                  />
                </div>

                {status === 'error' && <p className="text-red-500 text-sm">{errorMsg}</p>}

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full bg-[#01255f] hover:bg-[#011840] disabled:opacity-60 text-white py-3.5 text-sm font-bold tracking-wide"
                >
                  {status === 'loading' ? 'Submitting…' : 'Submit inquiry'}
                </button>

                <p className="text-xs text-[#5a6478] text-center">
                  For general questions, use our{' '}
                  <a href="/#contact" className="text-[#01255f] font-bold hover:underline">
                    contact form
                  </a>
                  .
                </p>
              </form>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
