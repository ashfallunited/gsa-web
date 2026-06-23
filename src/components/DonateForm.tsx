'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, ChevronLeft, Check } from 'lucide-react'
import DonateShareCard from '@/components/DonateShareCard'
import { ORG_NAME } from '@/lib/constants'
import { COUNTRIES } from '@/lib/country-data'
import { formatPhoneForDollr } from '@/lib/phone-formatter'
import { getProviderInfo, getProviderDisplayName } from '@/lib/provider-mapper'

type Step = 'amount' | 'details' | 'payment' | 'review' | 'success'
type Frequency = 'once' | 'monthly'
type PaymentMethod = 'card' | 'mobile'

type FormState = {
  frequency: Frequency
  amountPreset: number | 'custom' | null
  customAmount: string
  firstName: string
  lastName: string
  email: string
  phone: string
  country: string
  message: string
  paymentMethod: PaymentMethod
  coverFees: boolean
  // Payment details
  cardNumber: string
  cardExpiry: string
  cardCVV: string
  mobilePhone: string
}

const PRESETS_USD = [25, 50, 100, 250, 500] as const

const IMPACT_TIERS = [
  { amount: '$25', label: 'Training kit for one youth player' },
  { amount: '$50', label: 'A week of meals for programme participants' },
  { amount: '$100', label: 'Educational materials for an entire cohort' },
  { amount: '$250+', label: 'Supports volunteers and community sessions' },
] as const

const STEPS: { id: Step; label: string }[] = [
  { id: 'amount', label: 'Amount' },
  { id: 'details', label: 'Details' },
  { id: 'payment', label: 'Payment' },
  { id: 'review', label: 'Confirm' },
]

const inputClass =
  'w-full border border-gray-200 bg-white px-4 py-3 text-sm text-[#0d0d0d] placeholder-gray-400 focus:outline-none focus:border-[#01255f] transition-colors'

const labelClass = 'block text-[10px] uppercase tracking-widest font-bold text-[#5a6478] mb-1.5'

function formatUsd(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export default function DonateForm() {
  const [step, setStep] = useState<Step>('amount')
  const [referenceId, setReferenceId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [isDetectingProvider, setIsDetectingProvider] = useState(false)
  const [detectedProvider, setDetectedProvider] = useState<string>('')
  const [countrySearchOpen, setCountrySearchOpen] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const countryDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setCountrySearchOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const [form, setForm] = useState<FormState>({
    frequency: 'once',
    amountPreset: 50,
    customAmount: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: 'US',
    message: '',
    paymentMethod: 'card',
    coverFees: false,
    cardNumber: '',
    cardExpiry: '',
    cardCVV: '',
    mobilePhone: '',
  })

  const amountUsd = useMemo(() => {
    if (form.amountPreset === 'custom') {
      const n = parseFloat(form.customAmount)
      return Number.isFinite(n) && n > 0 ? n : 0
    }
    return form.amountPreset ?? 0
  }, [form.amountPreset, form.customAmount])

  const feeEstimate = form.coverFees ? Math.round(amountUsd * 0.029 * 100) / 100 : 0
  const totalUsd = amountUsd + feeEstimate

  const stepIndex = STEPS.findIndex((s) => s.id === step)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const canContinueAmount = amountUsd >= 1
  const canContinueDetails =
    form.firstName.trim() &&
    form.lastName.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) &&
    form.country.length === 2

  const canContinuePayment = form.paymentMethod === 'card'
    ? form.cardNumber.replace(/\s/g, '').length >= 13 && form.cardExpiry && form.cardCVV.length >= 3
    : form.mobilePhone.trim().length >= 10

  const detectMobileProvider = async (phone: string) => {
    if (phone.length < 10) return

    setIsDetectingProvider(true)
    try {
      const formattedPhone = formatPhoneForDollr(phone)
      const response = await fetch(`/api/donations/detect-provider?phone=${encodeURIComponent(formattedPhone)}`)
      const data = await response.json()
      if (data.provider) {
        setDetectedProvider(data.provider)
      }
    } catch (error) {
      console.error('Failed to detect provider:', error)
    } finally {
      setIsDetectingProvider(false)
    }
  }

  const goNext = () => {
    if (step === 'amount' && canContinueAmount) setStep('details')
    else if (step === 'details' && canContinueDetails) setStep('payment')
    else if (step === 'payment' && canContinuePayment) setStep('review')
  }

  const goBack = () => {
    if (step === 'details') setStep('amount')
    else if (step === 'payment') setStep('details')
    else if (step === 'review') setStep('payment')
  }

  const completeDonation = async () => {
    setIsSubmitting(true)
    setSubmitError('')

    try {
      const response = await fetch('/api/donations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          country: form.country,
          message: form.message || null,
          amountUsd: amountUsd,
          paymentMethod: form.paymentMethod,
          coverFees: form.coverFees,
          // Payment details
          cardNumber: form.paymentMethod === 'card' ? form.cardNumber : undefined,
          cardExpiry: form.paymentMethod === 'card' ? form.cardExpiry : undefined,
          cardCVV: form.paymentMethod === 'card' ? form.cardCVV : undefined,
          mobilePhone: form.paymentMethod === 'mobile' ? formatPhoneForDollr(form.mobilePhone) : undefined,
          detectedProvider: form.paymentMethod === 'mobile' ? detectedProvider : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setSubmitError(data.error || 'Failed to create donation')
        setIsSubmitting(false)
        return
      }

      // For card payments (HOSTED mode), redirect to Dollr payment page
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl
        return
      }

      // For mobile money (DIRECT mode), show success screen
      setReferenceId(data.donationId)
      setStep('success')
    } catch (error) {
      setSubmitError('Network error. Please try again.')
      setIsSubmitting(false)
    }
  }

  if (step === 'success') {
    return (
      <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8 px-0 sm:px-0">
        <div className="bg-white border border-gray-100 p-6 sm:p-10 lg:p-12 text-center">
          <div className="w-14 h-14 bg-[#01255f] flex items-center justify-center mx-auto mb-6">
            <Check className="w-7 h-7 text-[#fee11b]" strokeWidth={2.5} />
          </div>
          <h2
            className="text-2xl font-bold text-[#01255f] mb-2"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Thank you, {form.firstName}
          </h2>
          <p className="text-sm text-[#5a6478] leading-relaxed mb-6">
            Your donation of <strong className="text-[#01255f]">{formatUsd(totalUsd)}</strong> has been initiated.
            {form.paymentMethod === 'card' && (
              <> You'll be redirected to complete your card payment securely.</>
            )}
            {form.paymentMethod === 'mobile' && (
              <> You'll receive instructions to complete your payment via MTN or Orange Money.</>
            )}
          </p>
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#5a6478] mb-1">Reference</p>
          <p className="text-lg font-mono font-bold text-[#01255f] mb-8">{referenceId}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center w-full max-w-sm mx-auto sm:max-w-none">
            <Link
              href="/"
              className="bg-[#01255f] hover:bg-[#011840] text-white px-6 py-3 text-sm font-bold tracking-wide"
            >
              Back to home
            </Link>
            <button
              type="button"
              onClick={() => {
                setStep('amount')
                setForm({
                  frequency: 'once',
                  amountPreset: 50,
                  customAmount: '',
                  firstName: '',
                  lastName: '',
                  email: '',
                  phone: '',
                  country: 'US',
                  message: '',
                  paymentMethod: 'card',
                  coverFees: false,
                  cardNumber: '',
                  cardExpiry: '',
                  cardCVV: '',
                  mobilePhone: '',
                })
              }}
              className="border border-[#01255f] text-[#01255f] px-6 py-3 text-sm font-bold tracking-wide hover:bg-[#f5f7fc]"
            >
              Make another gift
            </button>
          </div>
        </div>

        <DonateShareCard
          variant="completed"
          options={{
            firstName: form.firstName,
            amountFormatted: formatUsd(totalUsd),
          }}
        />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(300px,22rem)] gap-6 sm:gap-8 lg:gap-10 items-start">
      <div className="bg-white border border-gray-100 min-w-0">
        {/* Progress */}
        <div className="border-b border-gray-100 px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
            <div className="flex items-center justify-between gap-1 sm:gap-2">
              {STEPS.map((s, i) => (
                <div key={s.id} className="flex-1 flex flex-col items-center gap-1 sm:gap-1.5 min-w-0">
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                      i < stepIndex
                        ? 'bg-[#01255f] text-[#fee11b]'
                        : i === stepIndex
                          ? 'bg-[#fee11b] text-[#01255f]'
                          : 'bg-gray-100 text-[#5a6478]'
                    }`}
                  >
                    {i < stepIndex ? <Check className="w-4 h-4" /> : i + 1}
                  </div>
                  <span
                    className={`text-[8px] sm:text-[9px] uppercase tracking-wide sm:tracking-wider font-bold text-center leading-tight px-0.5 max-[380px]:hidden sm:block ${
                      i === stepIndex ? 'text-[#01255f]' : 'text-gray-400'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

        <div className="p-4 sm:p-6 lg:p-8">
          {/* Step: Amount */}
          {step === 'amount' && (
            <div className="space-y-8">
              <div>
                <h2
                  className="text-xl font-bold text-[#01255f] mb-1"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Choose your gift
                </h2>
                <p className="text-sm text-[#5a6478]">All amounts in USD. Every dollar supports our youth programmes.</p>
              </div>

              <div className="flex gap-2 p-1 bg-[#f5f7fc] border border-gray-100">
                <button
                  type="button"
                  onClick={() => set('frequency', 'once')}
                  className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors ${
                    form.frequency === 'once' ? 'bg-[#01255f] text-white' : 'text-[#5a6478] hover:text-[#01255f]'
                  }`}
                >
                  One-time
                </button>
                <button
                  type="button"
                  disabled
                  title="Monthly giving coming soon"
                  className="flex-1 py-2.5 text-xs font-bold uppercase tracking-widest text-gray-400 relative"
                >
                  Monthly
                  <span className="absolute -top-2 right-1 text-[8px] bg-gray-200 text-gray-600 px-1.5 py-0.5 font-bold">
                    Soon
                  </span>
                </button>
              </div>

              <div className="grid grid-cols-2 min-[400px]:grid-cols-3 sm:grid-cols-5 gap-2">
                {PRESETS_USD.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      set('amountPreset', amt)
                      set('customAmount', '')
                    }}
                    className={`py-4 text-sm font-bold transition-all border ${
                      form.amountPreset === amt
                        ? 'bg-[#01255f] text-white border-[#01255f]'
                        : 'bg-white text-[#01255f] border-gray-200 hover:border-[#01255f]'
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
              </div>

              <div>
                <label className={labelClass}>Custom amount (USD)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5a6478] font-bold text-sm">$</span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    placeholder="Enter amount"
                    value={form.customAmount}
                    onChange={(e) => {
                      set('customAmount', e.target.value)
                      set('amountPreset', 'custom')
                    }}
                    onFocus={() => set('amountPreset', 'custom')}
                    className={`${inputClass} pl-8`}
                  />
                </div>
                {form.amountPreset === 'custom' && amountUsd > 0 && amountUsd < 1 && (
                  <p className="text-red-500 text-xs mt-1">Minimum donation is $1</p>
                )}
              </div>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={form.coverFees}
                  onChange={(e) => set('coverFees', e.target.checked)}
                  className="mt-1 accent-[#01255f]"
                />
                <span className="text-sm text-[#5a6478] group-hover:text-[#01255f] transition-colors">
                  Add {formatUsd(feeEstimate || amountUsd * 0.029)} to cover processing fees (optional)
                </span>
              </label>

              <button
                type="button"
                disabled={!canContinueAmount}
                onClick={goNext}
                className="w-full bg-[#fee11b] hover:bg-[#e5ca10] disabled:opacity-40 disabled:cursor-not-allowed text-[#01255f] py-4 text-sm font-bold tracking-wide transition-colors"
              >
                Continue · {amountUsd > 0 ? formatUsd(totalUsd) : 'Select amount'}
              </button>
            </div>
          )}

          {/* Step: Details */}
          {step === 'details' && (
            <div className="space-y-6">
              <div>
                <h2
                  className="text-xl font-bold text-[#01255f] mb-1"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Your details
                </h2>
                <p className="text-sm text-[#5a6478]">We will send a confirmation to your email.</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>First name *</label>
                  <input
                    required
                    value={form.firstName}
                    onChange={(e) => set('firstName', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Last name *</label>
                  <input
                    required
                    value={form.lastName}
                    onChange={(e) => set('lastName', e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Email *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Phone (optional)</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="+231 …"
                  className={inputClass}
                />
              </div>

              <div className="relative" ref={countryDropdownRef}>
                <label className={labelClass}>Country *</label>
                <input
                  type="text"
                  placeholder="Search countries..."
                  value={countrySearchOpen ? countrySearch : (COUNTRIES.find((c) => c.code === form.country)?.name || '')}
                  onChange={(e) => {
                    setCountrySearch(e.target.value)
                    setCountrySearchOpen(true)
                  }}
                  onFocus={() => setCountrySearchOpen(true)}
                  className={`${inputClass} cursor-pointer`}
                />
                {countrySearchOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 max-h-48 overflow-y-auto">
                    {COUNTRIES.filter(
                      (country) =>
                        country.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
                        country.code.toLowerCase().includes(countrySearch.toLowerCase())
                    ).map((country) => (
                      <button
                        key={country.code}
                        type="button"
                        onClick={() => {
                          set('country', country.code)
                          setCountrySearchOpen(false)
                          setCountrySearch('')
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-[#01255f]/5 border-b border-gray-100 last:border-b-0 text-sm transition-colors"
                      >
                        <span className="mr-2">{country.flag}</span>
                        <span className="text-[#01255f]">{country.name}</span>
                        <span className="text-[#5a6478] text-xs ml-2">({country.code})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className={labelClass}>Dedication or message (optional)</label>
                <textarea
                  rows={3}
                  value={form.message}
                  onChange={(e) => set('message', e.target.value)}
                  placeholder="In honour of… or a note to our team"
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={goBack}
                  className="flex items-center justify-center gap-1 px-4 py-3 text-sm font-bold text-[#5a6478] hover:text-[#01255f] sm:justify-start"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="button"
                  disabled={!canContinueDetails}
                  onClick={goNext}
                  className="flex-1 bg-[#01255f] hover:bg-[#011840] disabled:opacity-40 text-white py-3.5 text-sm font-bold tracking-wide"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step: Payment method */}
          {step === 'payment' && (
            <div className="space-y-6">
              <div>
                <h2
                  className="text-xl font-bold text-[#01255f] mb-1"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  How would you like to pay?
                </h2>
                <p className="text-sm text-[#5a6478]">How would you like to pay?</p>
              </div>

              <div>
                <select
                  required
                  value={form.paymentMethod}
                  onChange={(e) => set('paymentMethod', e.target.value as PaymentMethod)}
                  className={inputClass}
                >
                  <option value="">Select payment method...</option>
                  <option value="card">Card (Credit/Debit)</option>
                  <option value="mobile">Mobile Money (MTN, Orange)</option>
                </select>
              </div>

              {form.paymentMethod === 'card' && (
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Card Number</label>
                    <input
                      type="text"
                      placeholder="4242 4242 4242 4242"
                      value={form.cardNumber}
                      onChange={(e) => set('cardNumber', e.target.value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim())}
                      className={inputClass}
                      maxLength={19}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Expiry (MM/YY)</label>
                      <input
                        type="text"
                        placeholder="12/25"
                        value={form.cardExpiry}
                        onChange={(e) => {
                          let val = e.target.value.replace(/\D/g, '')
                          if (val.length >= 2) val = val.slice(0, 2) + '/' + val.slice(2, 4)
                          set('cardExpiry', val)
                        }}
                        className={inputClass}
                        maxLength={5}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>CVV</label>
                      <input
                        type="text"
                        placeholder="123"
                        value={form.cardCVV}
                        onChange={(e) => set('cardCVV', e.target.value.replace(/\D/g, ''))}
                        className={inputClass}
                        maxLength={4}
                      />
                    </div>
                  </div>
                </div>
              )}

              {form.paymentMethod === 'mobile' && (
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Mobile Money Number</label>
                    <input
                      type="tel"
                      placeholder="+231 77 123 4567"
                      value={form.mobilePhone}
                      onChange={(e) => {
                        const phone = e.target.value
                        set('mobilePhone', phone)
                        if (phone.length >= 10) {
                          detectMobileProvider(phone)
                        }
                      }}
                      className={inputClass}
                    />
                  </div>
                  {isDetectingProvider && (
                    <p className="text-xs text-[#5a6478]">Detecting provider...</p>
                  )}
                  {detectedProvider && getProviderInfo(detectedProvider) && (
                    <div className="bg-white border border-gray-200 rounded p-4 flex items-center gap-4">
                      <Image
                        src={getProviderInfo(detectedProvider)!.logo}
                        alt={getProviderDisplayName(detectedProvider)}
                        width={60}
                        height={60}
                        className="h-12 w-12 object-contain"
                      />
                      <div>
                        <p className="text-xs text-[#5a6478] uppercase tracking-widest font-bold mb-1">Payment Provider</p>
                        <p className="text-sm font-bold text-[#01255f]">{getProviderDisplayName(detectedProvider)}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={goBack}
                  className="flex items-center justify-center gap-1 px-4 py-3 text-sm font-bold text-[#5a6478] hover:text-[#01255f] sm:justify-start"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={form.paymentMethod === 'mobile' && !detectedProvider}
                  className="flex-1 bg-[#01255f] hover:bg-[#011840] disabled:opacity-50 disabled:cursor-not-allowed text-white py-3.5 text-sm font-bold tracking-wide"
                >
                  {isDetectingProvider ? 'Detecting provider...' : 'Review donation'}
                </button>
              </div>
            </div>
          )}

          {/* Step: Review */}
          {step === 'review' && (
            <div className="space-y-6">
              <div>
                <h2
                  className="text-xl font-bold text-[#01255f] mb-1"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Review your gift
                </h2>
                <p className="text-sm text-[#5a6478]">Confirm everything looks correct before completing.</p>
              </div>

              <div className="border border-gray-200 divide-y divide-gray-100">
                <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center px-4 sm:px-5 py-4 text-sm">
                  <span className="text-[#5a6478]">Amount</span>
                  <span className="font-bold text-[#01255f] tabular-nums">{formatUsd(amountUsd)}</span>
                </div>
                {feeEstimate > 0 && (
                  <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center px-4 sm:px-5 py-4 text-sm">
                    <span className="text-[#5a6478]">Processing fee coverage</span>
                    <span className="font-bold text-[#01255f] tabular-nums">{formatUsd(feeEstimate)}</span>
                  </div>
                )}
                <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center px-4 sm:px-5 py-4 text-sm bg-[#f5f7fc]">
                  <span className="font-bold text-[#01255f]">Total</span>
                  <span className="font-bold text-[#01255f] text-lg tabular-nums">{formatUsd(totalUsd)}</span>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center px-4 sm:px-5 py-4 text-sm">
                  <span className="text-[#5a6478]">Frequency</span>
                  <span className="text-[#01255f] capitalize">{form.frequency}</span>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center px-4 sm:px-5 py-4 text-sm">
                  <span className="text-[#5a6478]">Payment Method</span>
                  <span className="text-[#01255f] font-medium">
                    {form.paymentMethod === 'card' ? 'Card' : 'Mobile money'}
                  </span>
                </div>
                {form.paymentMethod === 'card' && form.cardNumber && (
                  <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center px-4 sm:px-5 py-4 text-sm">
                    <span className="text-[#5a6478]">Card</span>
                    <span className="text-[#01255f] font-medium">•••• •••• •••• {form.cardNumber.slice(-4)}</span>
                  </div>
                )}
                {form.paymentMethod === 'mobile' && (
                  <>
                    {detectedProvider && getProviderInfo(detectedProvider) && (
                      <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center px-4 sm:px-5 py-4 text-sm">
                        <span className="text-[#5a6478]">Provider</span>
                        <div className="flex items-center gap-2">
                          <Image
                            src={getProviderInfo(detectedProvider)!.logo}
                            alt={getProviderDisplayName(detectedProvider)}
                            width={24}
                            height={24}
                            className="h-5 w-5 object-contain"
                          />
                          <span className="text-[#01255f] font-medium">{getProviderDisplayName(detectedProvider)}</span>
                        </div>
                      </div>
                    )}
                    {form.mobilePhone && (
                      <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center px-4 sm:px-5 py-4 text-sm">
                        <span className="text-[#5a6478]">Phone Number</span>
                        <span className="text-[#01255f] font-medium">{form.mobilePhone}</span>
                      </div>
                    )}
                  </>
                )}
                <div className="px-4 sm:px-5 py-4 text-sm">
                  <span className="text-[#5a6478] block mb-1">Donor</span>
                  <span className="text-[#01255f] font-medium">
                    {form.firstName} {form.lastName}
                  </span>
                  <br />
                  <span className="text-[#5a6478]">{form.email}</span>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center px-4 sm:px-5 py-4 text-sm">
                  <span className="text-[#5a6478]">Country</span>
                  <span className="text-[#01255f] font-medium">
                    {COUNTRIES.find((c) => c.code === form.country)?.flag}{' '}
                    {COUNTRIES.find((c) => c.code === form.country)?.name || form.country}
                  </span>
                </div>
                {form.message && (
                  <div className="px-4 sm:px-5 py-4 text-sm">
                    <span className="text-[#5a6478] block mb-1">Message</span>
                    <span className="text-[#01255f]">{form.message}</span>
                  </div>
                )}
              </div>

              {submitError && (
                <div className="bg-red-50 border border-red-200 p-4 rounded text-sm text-red-700">
                  {submitError}
                </div>
              )}

              <p className="text-xs text-[#5a6478] leading-relaxed">
                By completing this donation, you agree that {ORG_NAME} may contact you about your gift.
              </p>

              <div className="flex flex-col-reverse sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-1 px-4 py-3 text-sm font-bold text-[#5a6478] hover:text-[#01255f] disabled:opacity-50 disabled:cursor-not-allowed sm:justify-start"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="button"
                  onClick={completeDonation}
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#fee11b] hover:bg-[#e5ca10] disabled:opacity-50 disabled:cursor-not-allowed text-[#01255f] py-4 text-sm font-bold tracking-wide"
                >
                  <Heart className="w-4 h-4 shrink-0" fill="currentColor" />
                  {isSubmitting ? 'Processing...' : 'Complete donation'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <aside className="space-y-4 sm:space-y-6 min-w-0 lg:sticky lg:top-24">
        <div className="bg-[#01255f] text-white p-5 sm:p-6 lg:p-8">
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#fee11b] mb-4 sm:mb-5">Your impact</p>
          <ul className="space-y-4 sm:space-y-5">
            {IMPACT_TIERS.map(({ amount, label }) => (
              <li
                key={amount}
                className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-0.5 items-start"
              >
                <span className="text-[#fee11b] font-bold text-base sm:text-lg tabular-nums whitespace-nowrap leading-none pt-0.5">
                  {amount}
                </span>
                <span className="text-sm sm:text-base text-white/85 leading-snug">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        <DonateShareCard variant="invite" className="!p-4 sm:!p-6" />
      </aside>
    </div>
  )
}
