/**
 * Address Validation Service
 * Validates and normalizes Philippine addresses (focused on Batangas province)
 */

import { mapsService } from "../integrations/maps";

// Batangas province cities and municipalities
export const BATANGAS_CITIES = [
  'Batangas City', 'Lipa', 'Tanauan', 'Santo Tomas', 'Nasugbu',
  'Lemery', 'Taal', 'Balayan', 'Calaca', 'Calatagan',
  'Cuenca', 'Ibaan', 'Laurel', 'Lian', 'Lobo',
  'Mabini', 'Malvar', 'Mataas na Kahoy', 'Padre Garcia', 'Rosario',
  'San Jose', 'San Juan', 'San Luis', 'San Nicolas', 'San Pascual',
  'Santa Teresita', 'Taysan', 'Tingloy', 'Tuy', 'Agoncillo',
  'Alitagtag', 'Balete', 'Bauan'
] as const;

// Common barangay name normalizations
const BARANGAY_NORMALIZATIONS: Record<string, string> = {
  'pob.': 'Poblacion',
  'pob': 'Poblacion',
  'poblacion': 'Poblacion',
  'brgy.': 'Barangay',
  'brgy': 'Barangay',
  'barangay': 'Barangay',
  'sto.': 'Santo',
  'sto': 'Santo',
  'sta.': 'Santa',
  'sta': 'Santa',
  'sr.': 'Senior',
  'jr.': 'Junior',
  'st.': 'Street',
};

// City name normalizations
const CITY_NORMALIZATIONS: Record<string, string> = {
  'batangas': 'Batangas City',
  'batangas city': 'Batangas City',
  'lipa': 'Lipa',
  'lipa city': 'Lipa',
  'tanauan': 'Tanauan',
  'tanauan city': 'Tanauan',
  'sto. tomas': 'Santo Tomas',
  'sto tomas': 'Santo Tomas',
  'santo tomas': 'Santo Tomas',
  'nasugbu': 'Nasugbu',
  'lemery': 'Lemery',
  'taal': 'Taal',
  'balayan': 'Balayan',
  'san juan': 'San Juan',
  'rosario': 'Rosario',
  'bauan': 'Bauan',
  'mabini': 'Mabini',
  'calaca': 'Calaca',
  'calatagan': 'Calatagan',
  'lian': 'Lian',
  'tuy': 'Tuy',
  'laurel': 'Laurel',
  'agoncillo': 'Agoncillo',
  'alitagtag': 'Alitagtag',
  'cuenca': 'Cuenca',
  'ibaan': 'Ibaan',
  'lobo': 'Lobo',
  'malvar': 'Malvar',
  'mataas na kahoy': 'Mataas na Kahoy',
  'padre garcia': 'Padre Garcia',
  'san jose': 'San Jose',
  'san luis': 'San Luis',
  'san nicolas': 'San Nicolas',
  'san pascual': 'San Pascual',
  'santa teresita': 'Santa Teresita',
  'taysan': 'Taysan',
  'tingloy': 'Tingloy',
  'balete': 'Balete',
};

// Zip codes for Batangas cities
const BATANGAS_ZIP_CODES: Record<string, string> = {
  'Batangas City': '4200',
  'Lipa': '4217',
  'Tanauan': '4232',
  'Santo Tomas': '4234',
  'Nasugbu': '4231',
  'Lemery': '4209',
  'Taal': '4208',
  'Balayan': '4213',
  'San Juan': '4226',
  'Rosario': '4225',
  'Bauan': '4201',
  'Mabini': '4202',
  'Calaca': '4212',
  'Calatagan': '4215',
  'Lian': '4230',
  'Tuy': '4214',
  'Laurel': '4221',
  'Agoncillo': '4211',
  'Alitagtag': '4205',
  'Cuenca': '4222',
  'Ibaan': '4218',
  'Lobo': '4206',
  'Malvar': '4233',
  'Mataas na Kahoy': '4223',
  'Padre Garcia': '4224',
  'San Jose': '4227',
  'San Luis': '4210',
  'San Nicolas': '4207',
  'San Pascual': '4204',
  'Santa Teresita': '4216',
  'Taysan': '4228',
  'Tingloy': '4203',
  'Balete': '4219',
};

export interface AddressInput {
  street?: string;
  barangay?: string;
  city?: string;
  province?: string;
  zipCode?: string;
  landmark?: string;
}

export interface NormalizedAddress {
  street: string;
  barangay: string;
  city: string;
  province: string;
  zipCode: string;
  landmark?: string;
  fullAddress: string;
  coordinates?: { lat: number; lng: number };
}

export interface AddressValidationResult {
  valid: boolean;
  normalized?: NormalizedAddress;
  suggestions?: string[];
  errors?: string[];
  confidence: number; // 0-100
}

export interface PlaceSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  types: string[];
}

export interface PlaceDetails {
  placeId: string;
  formattedAddress: string;
  street: string;
  barangay: string;
  city: string;
  province: string;
  zipCode: string;
  coordinates: { lat: number; lng: number };
}

class AddressService {
  private googleApiKey: string;

  constructor() {
    this.googleApiKey = process.env.GOOGLE_MAPS_API_KEY || '';
  }

  /**
   * Normalize a text string (lowercase, trim, remove extra spaces)
   */
  private normalizeText(text: string): string {
    return text.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  /**
   * Normalize city name to standard format
   */
  normalizeCity(city: string): string {
    const normalized = this.normalizeText(city);
    return CITY_NORMALIZATIONS[normalized] || city;
  }

  /**
   * Normalize barangay name
   */
  normalizeBarangay(barangay: string): string {
    let normalized = barangay;

    // Replace common abbreviations
    for (const [abbrev, full] of Object.entries(BARANGAY_NORMALIZATIONS)) {
      const regex = new RegExp(`\\b${abbrev}\\.?\\b`, 'gi');
      normalized = normalized.replace(regex, full);
    }

    // Capitalize first letter of each word
    normalized = normalized
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    return normalized;
  }

  /**
   * Normalize street address
   */
  normalizeStreet(street: string): string {
    let normalized = street;

    // Replace common abbreviations
    const streetAbbreviations: Record<string, string> = {
      'st.': 'Street',
      'st': 'Street',
      'ave.': 'Avenue',
      'ave': 'Avenue',
      'blvd.': 'Boulevard',
      'blvd': 'Boulevard',
      'rd.': 'Road',
      'rd': 'Road',
      'dr.': 'Drive',
      'dr': 'Drive',
      'ln.': 'Lane',
      'ln': 'Lane',
      'no.': 'Number',
      'blk.': 'Block',
      'blk': 'Block',
      'lot': 'Lot',
    };

    for (const [abbrev, full] of Object.entries(streetAbbreviations)) {
      const regex = new RegExp(`\\b${abbrev}\\.?\\b`, 'gi');
      normalized = normalized.replace(regex, full);
    }

    return normalized.trim();
  }

  /**
   * Get zip code for a city
   */
  getZipCode(city: string): string | null {
    const normalizedCity = this.normalizeCity(city);
    return BATANGAS_ZIP_CODES[normalizedCity] || null;
  }

  /**
   * Validate if city is in Batangas province
   */
  isValidBatangasCity(city: string): boolean {
    const normalizedCity = this.normalizeCity(city);
    return BATANGAS_CITIES.includes(normalizedCity as any);
  }

  /**
   * Validate and normalize a Philippine address
   */
  async validateAddress(input: AddressInput): Promise<AddressValidationResult> {
    const errors: string[] = [];
    const suggestions: string[] = [];
    let confidence = 100;

    // Validate required fields
    if (!input.city) {
      errors.push('City is required');
      confidence -= 30;
    }

    // Normalize city
    let normalizedCity = input.city ? this.normalizeCity(input.city) : '';

    // Check if city is in Batangas
    if (normalizedCity && !this.isValidBatangasCity(normalizedCity)) {
      // Try to find closest match
      const closestMatch = this.findClosestCityMatch(normalizedCity);
      if (closestMatch) {
        suggestions.push(`Did you mean "${closestMatch}"?`);
        confidence -= 20;
      } else {
        errors.push(`"${normalizedCity}" is not a valid city in Batangas province`);
        confidence -= 40;
      }
    }

    // Normalize barangay
    const normalizedBarangay = input.barangay ? this.normalizeBarangay(input.barangay) : '';
    if (!normalizedBarangay) {
      suggestions.push('Adding a barangay helps with accurate delivery');
      confidence -= 10;
    }

    // Normalize street
    const normalizedStreet = input.street ? this.normalizeStreet(input.street) : '';
    if (!normalizedStreet) {
      errors.push('Street address is required for delivery');
      confidence -= 30;
    }

    // Get or validate zip code
    let zipCode = input.zipCode || '';
    if (!zipCode && normalizedCity) {
      zipCode = this.getZipCode(normalizedCity) || '';
      if (zipCode) {
        suggestions.push(`Zip code auto-filled: ${zipCode}`);
      }
    }

    // Validate zip code format (Philippine: 4 digits)
    if (zipCode && !/^\d{4}$/.test(zipCode)) {
      errors.push('Invalid zip code format (should be 4 digits)');
      confidence -= 15;
    }

    // Ensure province is Batangas
    const province = 'Batangas';

    // Build full address
    const addressParts = [
      normalizedStreet,
      normalizedBarangay,
      normalizedCity,
      province
    ].filter(Boolean);

    const fullAddress = addressParts.join(', ');

    // Try to geocode the address
    let coordinates: { lat: number; lng: number } | undefined;
    if (fullAddress) {
      try {
        const geocoded = await mapsService.geocodeAddress(fullAddress);
        if (geocoded) {
          coordinates = { lat: geocoded.lat, lng: geocoded.lng };
        }
      } catch (error) {
        console.error('Geocoding failed:', error);
      }
    }

    // Ensure confidence doesn't go below 0
    confidence = Math.max(0, confidence);

    const valid = errors.length === 0 && confidence >= 50;

    const result: AddressValidationResult = {
      valid,
      confidence,
      errors: errors.length > 0 ? errors : undefined,
      suggestions: suggestions.length > 0 ? suggestions : undefined
    };

    if (valid || confidence >= 30) {
      result.normalized = {
        street: normalizedStreet,
        barangay: normalizedBarangay,
        city: normalizedCity,
        province,
        zipCode,
        landmark: input.landmark,
        fullAddress,
        coordinates
      };
    }

    return result;
  }

  /**
   * Find closest matching city name using simple string similarity
   */
  private findClosestCityMatch(input: string): string | null {
    const normalized = this.normalizeText(input);
    let bestMatch: string | null = null;
    let bestScore = 0;

    for (const city of BATANGAS_CITIES) {
      const cityLower = city.toLowerCase();

      // Check if input is contained in city name or vice versa
      if (cityLower.includes(normalized) || normalized.includes(cityLower)) {
        const score = Math.min(normalized.length, cityLower.length) / Math.max(normalized.length, cityLower.length);
        if (score > bestScore && score > 0.5) {
          bestScore = score;
          bestMatch = city;
        }
      }
    }

    return bestMatch;
  }

  /**
   * Places Autocomplete - uses OpenRouteService or Google Places
   */
  async getPlacesSuggestions(input: string, sessionToken?: string): Promise<PlaceSuggestion[]> {
    // Try OpenRouteService first (FREE)
    const orsKey = process.env.OPENROUTESERVICE_API_KEY;
    if (orsKey) {
      try {
        const params = new URLSearchParams({
          text: `${input}, Batangas, Philippines`,
          'boundary.country': 'PH',
          size: '5',
        });

        const response = await fetch(`https://api.openrouteservice.org/geocode/search?${params}`, {
          headers: {
            'Authorization': orsKey,
            'Accept': 'application/json',
          },
        });
        const data = await response.json();

        if (data.features && data.features.length > 0) {
          console.log('[AddressService] Using OpenRouteService for autocomplete');
          return data.features.map((feature: any, index: number) => ({
            placeId: `ors-${index}-${Date.now()}`,
            description: feature.properties.label,
            mainText: feature.properties.name || feature.properties.label.split(',')[0],
            secondaryText: feature.properties.region || feature.properties.country || 'Batangas, Philippines',
            types: [feature.properties.layer || 'address'],
            // Store coordinates for later use
            coordinates: {
              lat: feature.geometry.coordinates[1],
              lng: feature.geometry.coordinates[0]
            }
          }));
        }
      } catch (error) {
        console.error('[AddressService] OpenRouteService error:', error);
      }
    }

    // Fallback to Google Places API
    if (this.googleApiKey) {
      try {
        const params = new URLSearchParams({
          input,
          key: this.googleApiKey,
          components: 'country:ph',
          types: 'address',
          location: '13.7565,121.0583', // Batangas City center
          radius: '50000', // 50km radius
          strictbounds: 'true'
        });

        if (sessionToken) {
          params.append('sessiontoken', sessionToken);
        }

        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`
        );
        const data = await response.json();

        if (data.status !== 'OK') {
          console.warn('Places API returned:', data.status);
          return this.getMockSuggestions(input);
        }

        return data.predictions.map((prediction: any) => ({
          placeId: prediction.place_id,
          description: prediction.description,
          mainText: prediction.structured_formatting?.main_text || prediction.description,
          secondaryText: prediction.structured_formatting?.secondary_text || '',
          types: prediction.types || []
        }));
      } catch (error) {
        console.error('Places autocomplete error:', error);
      }
    }

    // Final fallback to mock suggestions
    return this.getMockSuggestions(input);
  }

  /**
   * Get place details from OpenRouteService or Google Places API
   */
  async getPlaceDetails(placeId: string, sessionToken?: string): Promise<PlaceDetails | null> {
    // Handle OpenRouteService place IDs (format: ors-{index}-{timestamp})
    // The coordinates are passed via query param or stored client-side
    if (placeId.startsWith('ors-')) {
      console.log('[AddressService] OpenRouteService placeId - coordinates should be provided');
      // For ORS, we need to get coordinates from the request
      // Return null to trigger client-side handling
      return null;
    }

    // Try Google Places API
    if (this.googleApiKey) {
      try {
        const params = new URLSearchParams({
          place_id: placeId,
          key: this.googleApiKey,
          fields: 'formatted_address,geometry,address_components'
        });

        if (sessionToken) {
          params.append('sessiontoken', sessionToken);
        }

        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?${params}`
        );
        const data = await response.json();

        if (data.status !== 'OK' || !data.result) {
          console.warn('Places details API returned:', data.status);
          return this.getMockPlaceDetails(placeId);
        }

        const result = data.result;
        const components = this.parseAddressComponents(result.address_components);

        return {
          placeId,
          formattedAddress: result.formatted_address,
          street: components.street,
          barangay: components.barangay,
          city: components.city,
          province: components.province,
          zipCode: components.zipCode,
          coordinates: {
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng
          }
        };
      } catch (error) {
        console.error('Places details error:', error);
      }
    }

    // Fallback to mock place details
    return this.getMockPlaceDetails(placeId);
  }

  /**
   * Parse Google address components into our format
   */
  private parseAddressComponents(components: any[]): {
    street: string;
    barangay: string;
    city: string;
    province: string;
    zipCode: string;
  } {
    const result = {
      street: '',
      barangay: '',
      city: '',
      province: '',
      zipCode: ''
    };

    const streetParts: string[] = [];

    for (const component of components) {
      const types = component.types || [];
      const name = component.long_name;

      if (types.includes('street_number')) {
        streetParts.unshift(name);
      } else if (types.includes('route')) {
        streetParts.push(name);
      } else if (types.includes('sublocality_level_1') || types.includes('neighborhood')) {
        result.barangay = name;
      } else if (types.includes('locality') || types.includes('administrative_area_level_3')) {
        result.city = this.normalizeCity(name);
      } else if (types.includes('administrative_area_level_2')) {
        result.province = name;
      } else if (types.includes('postal_code')) {
        result.zipCode = name;
      }
    }

    result.street = streetParts.join(' ');

    // Auto-fill zip code if not found
    if (!result.zipCode && result.city) {
      result.zipCode = this.getZipCode(result.city) || '';
    }

    return result;
  }

  /**
   * Mock suggestions for development
   */
  private getMockSuggestions(input: string): PlaceSuggestion[] {
    const mockAddresses = [
      { main: 'P. Burgos Street', secondary: 'Batangas City, Batangas' },
      { main: 'Rizal Avenue', secondary: 'Lipa City, Batangas' },
      { main: 'JP Laurel Highway', secondary: 'Tanauan City, Batangas' },
      { main: 'National Highway', secondary: 'Santo Tomas, Batangas' },
      { main: 'Poblacion', secondary: 'Nasugbu, Batangas' },
      { main: 'CM Recto Avenue', secondary: 'Batangas City, Batangas' },
      { main: 'Evangelista Street', secondary: 'Batangas City, Batangas' },
      { main: 'Kumintang Ilaya', secondary: 'Batangas City, Batangas' }
    ];

    const normalizedInput = this.normalizeText(input);

    return mockAddresses
      .filter(addr =>
        this.normalizeText(addr.main).includes(normalizedInput) ||
        this.normalizeText(addr.secondary).includes(normalizedInput)
      )
      .slice(0, 5)
      .map((addr, index) => ({
        placeId: `mock_${index}_${Date.now()}`,
        description: `${addr.main}, ${addr.secondary}`,
        mainText: addr.main,
        secondaryText: addr.secondary,
        types: ['street_address']
      }));
  }

  /**
   * Mock place details for development
   */
  private getMockPlaceDetails(placeId: string): PlaceDetails {
    const mockLocations: Record<string, PlaceDetails> = {
      default: {
        placeId,
        formattedAddress: 'P. Burgos Street, Batangas City, Batangas, Philippines',
        street: 'P. Burgos Street',
        barangay: 'Poblacion',
        city: 'Batangas City',
        province: 'Batangas',
        zipCode: '4200',
        coordinates: { lat: 13.7565, lng: 121.0583 }
      }
    };

    return mockLocations.default;
  }

  /**
   * Get all Batangas cities
   */
  getBatangasCities(): string[] {
    return [...BATANGAS_CITIES];
  }

  /**
   * Get zip codes map
   */
  getZipCodes(): Record<string, string> {
    return { ...BATANGAS_ZIP_CODES };
  }
}

export const addressService = new AddressService();
