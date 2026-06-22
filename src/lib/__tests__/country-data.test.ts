import assert from 'assert'
import {
  COUNTRIES,
  getCountryName,
  getCountryFlag,
  type Country,
} from '../country-data'

function testCountriesArrayExists(): void {
  assert(Array.isArray(COUNTRIES), 'COUNTRIES should be an array')
  assert(COUNTRIES.length > 0, 'COUNTRIES should have at least one entry')
}

function testCountriesAreSorted(): void {
  const names = COUNTRIES.map((c) => c.name)
  const sortedNames = [...names].sort((a, b) => a.localeCompare(b))
  assert.deepStrictEqual(
    names,
    sortedNames,
    'COUNTRIES array should be sorted alphabetically by name'
  )
}

function testCountriesHaveValidStructure(): void {
  COUNTRIES.forEach((country, index) => {
    assert(
      typeof country.code === 'string',
      `Country[${index}].code should be a string`
    )
    assert(
      country.code.length === 2,
      `Country[${index}].code should be ISO 3166-1 alpha-2 (2 chars), got: ${country.code}`
    )
    assert(
      typeof country.name === 'string',
      `Country[${index}].name should be a string`
    )
    assert(
      country.name.length > 0,
      `Country[${index}].name should not be empty`
    )
    assert(
      typeof country.flag === 'string',
      `Country[${index}].flag should be a string`
    )
    assert(
      country.flag.length > 0,
      `Country[${index}].flag should not be empty`
    )
  })
}

function testCountriesHaveKnownValues(): void {
  const countryMap = new Map(COUNTRIES.map((c) => [c.code, c]))

  const expectedCountries = [
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
  ]

  expectedCountries.forEach(({ code, name, flag }) => {
    const country = countryMap.get(code)
    assert(country, `Country with code ${code} should exist`)
    assert.strictEqual(
      country!.name,
      name,
      `Country ${code} should have name "${name}"`
    )
    assert.strictEqual(
      country!.flag,
      flag,
      `Country ${code} should have flag "${flag}"`
    )
  })
}

function testGetCountryName(): void {
  assert.strictEqual(
    getCountryName('US'),
    'United States',
    'getCountryName should return correct name for valid code'
  )
  assert.strictEqual(
    getCountryName('INVALID'),
    'INVALID',
    'getCountryName should return code if country not found'
  )
  assert.strictEqual(
    getCountryName(''),
    '',
    'getCountryName should handle empty code'
  )
}

function testGetCountryFlag(): void {
  assert.strictEqual(
    getCountryFlag('US'),
    '🇺🇸',
    'getCountryFlag should return correct flag for valid code'
  )
  assert.strictEqual(
    getCountryFlag('LR'),
    '🇱🇷',
    'getCountryFlag should return correct flag for Liberia'
  )
  assert.strictEqual(
    getCountryFlag('INVALID'),
    '',
    'getCountryFlag should return empty string if country not found'
  )
  assert.strictEqual(
    getCountryFlag(''),
    '',
    'getCountryFlag should handle empty code'
  )
}

// Run all tests
console.log('Running country data tests...')

testCountriesArrayExists()
console.log('✓ COUNTRIES array exists and has entries')

testCountriesAreSorted()
console.log('✓ COUNTRIES array is sorted alphabetically')

testCountriesHaveValidStructure()
console.log('✓ All countries have valid structure with code, name, and flag')

testCountriesHaveKnownValues()
console.log('✓ All expected countries are present with correct values')

testGetCountryName()
console.log('✓ getCountryName function works correctly')

testGetCountryFlag()
console.log('✓ getCountryFlag function works correctly')

console.log('\nAll country data tests passed!')
