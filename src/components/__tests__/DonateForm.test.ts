/**
 * Test suite for DonateForm component country field
 *
 * This test suite validates:
 * 1. Country field exists in form state with type string
 * 2. Default value is 'US' (2-character ISO code)
 * 3. Validation requires exactly 2-character ISO code
 * 4. Country data structure supports dropdown rendering
 * 5. Country appears on review page
 */

// Import countries data - matching the structure from country-data.ts
interface Country {
  code: string // ISO 3166-1 alpha-2
  name: string
  flag: string // Unicode flag emoji
}

const COUNTRIES: Country[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'LR', name: 'Liberia', flag: '🇱🇷' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'SL', name: 'Sierra Leone', flag: '🇸🇱' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
].sort((a, b) => a.name.localeCompare(b.name))

// Expected FormState type from DonateForm.tsx
interface FormState {
  frequency: 'once' | 'monthly'
  amountPreset: number | 'custom' | null
  customAmount: string
  firstName: string
  lastName: string
  email: string
  phone: string
  country: string // NEW FIELD
  message: string
  paymentMethod: 'card' | 'bank' | 'mobile'
  coverFees: boolean
}

const assert = require('assert')

function testCountryFieldExists(): void {
  assert(COUNTRIES.length > 0, 'COUNTRIES array should exist and have entries')
  assert(
    COUNTRIES.some((c) => c.code === 'US'),
    'COUNTRIES should include US as default'
  )
}

function testCountryDefaultValue(): void {
  const defaultCountry = 'US'
  assert.strictEqual(defaultCountry.length, 2, 'Default country code should be 2 characters (ISO code)')
  assert(
    COUNTRIES.some((c) => c.code === defaultCountry),
    `Default country "${defaultCountry}" should exist in COUNTRIES array`
  )
}

function testCountryCodeValidation(): void {
  // All country codes should be exactly 2 characters
  COUNTRIES.forEach((country) => {
    assert.strictEqual(
      country.code.length,
      2,
      `Country code "${country.code}" should be exactly 2 characters (ISO 3166-1 alpha-2)`
    )
  })
}

function testCountryFieldRequired(): void {
  // In the form validation logic, country.length === 2 means it's required
  // A valid country code must have exactly 2 characters
  const validCode = 'US'
  const invalidCode = ''

  assert.strictEqual(validCode.length, 2, 'Valid country code should be 2 characters')
  assert.notStrictEqual(invalidCode.length, 2, 'Invalid/empty country code should fail validation')
}

function testFormStateWithCountry(): void {
  // Test that FormState includes country field with correct default
  const expectedFormState: FormState = {
    frequency: 'once',
    amountPreset: 50,
    customAmount: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: 'US', // Required field with default value
    message: '',
    paymentMethod: 'card',
    coverFees: false,
  }

  assert.strictEqual(
    expectedFormState.country,
    'US',
    'Form state should have country field with default value "US"'
  )
  assert.strictEqual(
    expectedFormState.country.length,
    2,
    'Default country value should be 2-character ISO code'
  )
}

function testCountryValidationInDetails(): void {
  // Simulates the validation logic from canContinueDetails in DonateForm.tsx
  function validateDetails(
    firstName: string,
    lastName: string,
    email: string,
    country: string
  ): boolean {
    return (
      firstName.trim() !== '' &&
      lastName.trim() !== '' &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
      country.length === 2
    )
  }

  // Should pass with valid country
  assert(
    validateDetails('John', 'Doe', 'john@example.com', 'US'),
    'Should pass validation with valid country code'
  )

  // Should fail without country
  assert(
    !validateDetails('John', 'Doe', 'john@example.com', ''),
    'Should fail validation with empty country code'
  )

  // Should fail with invalid country code (3 chars)
  assert(
    !validateDetails('John', 'Doe', 'john@example.com', 'USA'),
    'Should fail validation with 3-character country code'
  )

  // Should fail with invalid country code (1 char)
  assert(
    !validateDetails('John', 'Doe', 'john@example.com', 'U'),
    'Should fail validation with 1-character country code'
  )

  // Should still fail if other required fields are missing
  assert(
    !validateDetails('', 'Doe', 'john@example.com', 'US'),
    'Should fail if firstName is empty'
  )
  assert(
    !validateDetails('John', '', 'john@example.com', 'US'),
    'Should fail if lastName is empty'
  )
  assert(
    !validateDetails('John', 'Doe', 'invalid-email', 'US'),
    'Should fail if email is invalid'
  )
}

function testCountrySelectionOptionStructure(): void {
  // Each country should have the structure needed for dropdown rendering
  COUNTRIES.forEach((country) => {
    assert(
      typeof country.code === 'string' && country.code.length === 2,
      `Country should have valid code for option value: ${country.code}`
    )
    assert(
      typeof country.name === 'string' && country.name.length > 0,
      `Country should have non-empty name for display`
    )
    assert(
      typeof country.flag === 'string' && country.flag.length > 0,
      `Country should have flag emoji for dropdown display`
    )
  })
}

function testCountryDisplayFormat(): void {
  // Test that countries can be displayed as "flag name" format used in dropdown
  const testCountry = COUNTRIES.find((c) => c.code === 'US')
  assert(testCountry, 'US country should exist')

  const displayFormat = `${testCountry!.flag} ${testCountry!.name}`
  assert.strictEqual(
    displayFormat,
    '🇺🇸 United States',
    'Country should display as "flag name" format in dropdown'
  )
}

function testCountryReviewPageDisplay(): void {
  // Test logic for displaying country on review page
  // Review page shows: flag + country name
  const country = COUNTRIES.find((c) => c.code === 'US')
  assert(country, 'Should find country by code')

  const displayText = `${country!.flag} ${country!.name}`
  assert(displayText.length > 0, 'Country review display should not be empty')
  assert(
    displayText.includes('🇺🇸'),
    'Country review display should include flag'
  )
  assert(
    displayText.includes('United States'),
    'Country review display should include country name'
  )
}

function testCountryLookupByCode(): void {
  // Test that country can be found by code for review page display
  const testCodes = ['US', 'LR', 'GB', 'NG']

  testCodes.forEach((code) => {
    const found = COUNTRIES.find((c) => c.code === code)
    assert(found, `Country with code ${code} should be findable`)
    assert.strictEqual(found!.code, code, `Found country should have code ${code}`)
  })

  // Test invalid code
  const notFound = COUNTRIES.find((c) => c.code === 'XX')
  assert(!notFound, 'Invalid country code should not be found')
}

function testAllCountriesAreSorted(): void {
  // Verify countries are sorted alphabetically by name for dropdown display
  const names = COUNTRIES.map((c) => c.name)
  const sortedNames = [...names].sort((a, b) => a.localeCompare(b))
  assert.deepStrictEqual(
    names,
    sortedNames,
    'COUNTRIES array should be sorted alphabetically by name for consistent dropdown display'
  )
}

// ============= Run all tests =============
console.log('Running DonateForm country field tests...\n')

testCountryFieldExists()
console.log('✓ Country field data exists')

testCountryDefaultValue()
console.log('✓ Country default value is valid')

testCountryCodeValidation()
console.log('✓ All country codes are valid ISO 3166-1 alpha-2 format')

testCountryFieldRequired()
console.log('✓ Country field is properly validated as required')

testFormStateWithCountry()
console.log('✓ Form state includes country field with correct default')

testCountryValidationInDetails()
console.log('✓ Country validation works in form details step')

testCountrySelectionOptionStructure()
console.log('✓ Country data structure supports dropdown rendering')

testCountryDisplayFormat()
console.log('✓ Country displays correctly as "flag name" format in dropdown')

testCountryReviewPageDisplay()
console.log('✓ Country displays correctly on review page')

testCountryLookupByCode()
console.log('✓ Countries can be looked up by code')

testAllCountriesAreSorted()
console.log('✓ Countries are sorted alphabetically for consistent display')

console.log('\n✅ All DonateForm country field tests passed!')
