/**
 * Address Autocomplete Component
 * Uses Google Places API proxy for address suggestions
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Search, X, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';

// Types
interface PlaceSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  types: string[];
}

interface AddressDetails {
  placeId: string;
  formattedAddress: string;
  street: string;
  barangay: string;
  city: string;
  province: string;
  zipCode: string;
  coordinates: { lat: number; lng: number };
}

interface AddressValidationResult {
  valid: boolean;
  normalized?: {
    street: string;
    barangay: string;
    city: string;
    province: string;
    zipCode: string;
    landmark?: string;
    fullAddress: string;
    coordinates?: { lat: number; lng: number };
  };
  suggestions?: string[];
  errors?: string[];
  confidence: number;
}

interface AddressAutocompleteProps {
  onAddressSelect: (address: AddressDetails | AddressValidationResult['normalized']) => void;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  label?: string;
  required?: boolean;
  showValidation?: boolean;
  manualEntryAllowed?: boolean;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Generate session token for Places API
function generateSessionToken(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function AddressAutocomplete({
  onAddressSelect,
  defaultValue = '',
  placeholder = 'Search for an address...',
  className,
  label,
  required = false,
  showValidation = true,
  manualEntryAllowed = true
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [sessionToken] = useState(generateSessionToken);
  const [validationResult, setValidationResult] = useState<AddressValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const debouncedInput = useDebounce(inputValue, 300);

  // Fetch suggestions from API
  const fetchSuggestions = useCallback(async (input: string) => {
    if (input.length < 3) {
      setSuggestions([]);
      setIsDropdownOpen(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/places/autocomplete?input=${encodeURIComponent(input)}&sessionToken=${sessionToken}`
      );
      const data = await response.json();

      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
        setIsDropdownOpen(true);
      } else {
        setSuggestions([]);
        if (manualEntryAllowed) {
          // Show option for manual entry
          setIsDropdownOpen(true);
        }
      }
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      setError('Failed to fetch address suggestions');
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [sessionToken, manualEntryAllowed]);

  // Fetch place details when a suggestion is selected
  const fetchPlaceDetails = async (placeId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/places/details?placeId=${encodeURIComponent(placeId)}&sessionToken=${sessionToken}`
      );
      const details: AddressDetails = await response.json();

      setInputValue(details.formattedAddress);
      setIsDropdownOpen(false);
      setSuggestions([]);
      onAddressSelect(details);
    } catch (err) {
      console.error('Error fetching place details:', err);
      setError('Failed to get address details');
    } finally {
      setIsLoading(false);
    }
  };

  // Validate manual address entry
  const validateManualAddress = async () => {
    if (!inputValue.trim()) return;

    setIsValidating(true);
    setError(null);

    try {
      // Parse the input into components (simple parsing)
      const parts = inputValue.split(',').map(p => p.trim());

      const response = await apiRequest('POST', '/api/addresses/validate', {
        street: parts[0] || '',
        barangay: parts[1] || '',
        city: parts[2] || parts[1] || '',
        province: 'Batangas',
        zipCode: ''
      });

      const result: AddressValidationResult = await response.json();
      setValidationResult(result);

      if (result.valid && result.normalized) {
        onAddressSelect(result.normalized);
      }
    } catch (err) {
      console.error('Error validating address:', err);
      setError('Failed to validate address');
    } finally {
      setIsValidating(false);
    }
  };

  // Trigger suggestion fetch when debounced input changes
  useEffect(() => {
    if (debouncedInput && !showManualEntry) {
      fetchSuggestions(debouncedInput);
    }
  }, [debouncedInput, fetchSuggestions, showManualEntry]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isDropdownOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          fetchPlaceDetails(suggestions[selectedIndex].placeId);
        } else if (manualEntryAllowed) {
          validateManualAddress();
        }
        break;
      case 'Escape':
        setIsDropdownOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: PlaceSuggestion) => {
    fetchPlaceDetails(suggestion.placeId);
  };

  // Clear input
  const handleClear = () => {
    setInputValue('');
    setSuggestions([]);
    setIsDropdownOpen(false);
    setValidationResult(null);
    setError(null);
    inputRef.current?.focus();
  };

  return (
    <div className={cn('relative w-full', className)}>
      {label && (
        <Label className="mb-2 block">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}

      <div className="relative">
        <div className="relative flex items-center">
          <MapPin className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={e => {
              setInputValue(e.target.value);
              setValidationResult(null);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0 || inputValue.length >= 3) {
                setIsDropdownOpen(true);
              }
            }}
            placeholder={placeholder}
            className={cn(
              'pl-10 pr-20',
              validationResult?.valid && 'border-green-500 focus-visible:ring-green-500',
              validationResult && !validationResult.valid && 'border-amber-500 focus-visible:ring-amber-500'
            )}
          />

          <div className="absolute right-2 flex items-center gap-1">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {inputValue && !isLoading && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={handleClear}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            {manualEntryAllowed && inputValue && !isLoading && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={validateManualAddress}
                disabled={isValidating}
              >
                {isValidating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Suggestions Dropdown */}
        {isDropdownOpen && (
          <div
            ref={dropdownRef}
            className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg"
          >
            {suggestions.length > 0 ? (
              <ul className="max-h-60 overflow-auto py-1">
                {suggestions.map((suggestion, index) => (
                  <li
                    key={suggestion.placeId}
                    className={cn(
                      'cursor-pointer px-3 py-2 hover:bg-accent transition-colors',
                      index === selectedIndex && 'bg-accent'
                    )}
                    onClick={() => handleSuggestionClick(suggestion)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {suggestion.mainText}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {suggestion.secondaryText}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              inputValue.length >= 3 && !isLoading && (
                <div className="p-3">
                  <p className="text-sm text-muted-foreground mb-2">
                    No suggestions found
                  </p>
                  {manualEntryAllowed && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setShowManualEntry(true);
                        setIsDropdownOpen(false);
                        validateManualAddress();
                      }}
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Use this address
                    </Button>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Validation Result */}
      {showValidation && validationResult && (
        <Card className={cn(
          'mt-2',
          validationResult.valid ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'
        )}>
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              {validationResult.valid ? (
                <Check className="h-5 w-5 text-green-600 shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                {validationResult.valid && validationResult.normalized && (
                  <>
                    <p className="text-sm font-medium text-green-800">
                      Address verified
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      {validationResult.normalized.fullAddress}
                    </p>
                  </>
                )}

                {!validationResult.valid && (
                  <>
                    <p className="text-sm font-medium text-amber-800">
                      Address needs verification
                    </p>
                    {validationResult.errors?.map((error, i) => (
                      <p key={i} className="text-xs text-amber-700 mt-1">
                        {error}
                      </p>
                    ))}
                  </>
                )}

                {validationResult.suggestions && validationResult.suggestions.length > 0 && (
                  <div className="mt-2">
                    {validationResult.suggestions.map((suggestion, i) => (
                      <Badge key={i} variant="outline" className="mr-1 mb-1 text-xs">
                        {suggestion}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="mt-2">
                  <Badge
                    variant={validationResult.confidence >= 70 ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    Confidence: {validationResult.confidence}%
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}

// Manual Address Form Component
interface ManualAddressFormProps {
  onSubmit: (address: {
    street: string;
    barangay: string;
    city: string;
    province: string;
    zipCode: string;
    landmark?: string;
  }) => void;
  cities?: string[];
  className?: string;
}

export function ManualAddressForm({
  onSubmit,
  cities = [],
  className
}: ManualAddressFormProps) {
  const [formData, setFormData] = useState({
    street: '',
    barangay: '',
    city: '',
    province: 'Batangas',
    zipCode: '',
    landmark: ''
  });
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<AddressValidationResult | null>(null);

  // Fetch cities on mount
  const [availableCities, setAvailableCities] = useState<string[]>(cities);
  const [zipCodes, setZipCodes] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await fetch('/api/addresses/cities');
        const data = await response.json();
        setAvailableCities(data.cities || []);
        setZipCodes(data.zipCodes || {});
      } catch (err) {
        console.error('Error fetching cities:', err);
      }
    };

    if (cities.length === 0) {
      fetchCities();
    }
  }, [cities]);

  // Auto-fill zip code when city changes
  useEffect(() => {
    if (formData.city && zipCodes[formData.city]) {
      setFormData(prev => ({ ...prev, zipCode: zipCodes[formData.city] }));
    }
  }, [formData.city, zipCodes]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setValidationResult(null);
  };

  const handleValidate = async () => {
    setIsValidating(true);

    try {
      const response = await apiRequest('POST', '/api/addresses/validate', formData);
      const result: AddressValidationResult = await response.json();
      setValidationResult(result);

      if (result.valid && result.normalized) {
        onSubmit({
          ...formData,
          ...result.normalized
        });
      }
    } catch (err) {
      console.error('Error validating address:', err);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="space-y-2">
        <Label htmlFor="street">Street Address *</Label>
        <Input
          id="street"
          value={formData.street}
          onChange={e => handleChange('street', e.target.value)}
          placeholder="e.g., 123 P. Burgos Street"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="barangay">Barangay</Label>
          <Input
            id="barangay"
            value={formData.barangay}
            onChange={e => handleChange('barangay', e.target.value)}
            placeholder="e.g., Poblacion"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">City/Municipality *</Label>
          <select
            id="city"
            value={formData.city}
            onChange={e => handleChange('city', e.target.value)}
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Select city...</option>
            {availableCities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="province">Province</Label>
          <Input
            id="province"
            value={formData.province}
            disabled
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="zipCode">Zip Code</Label>
          <Input
            id="zipCode"
            value={formData.zipCode}
            onChange={e => handleChange('zipCode', e.target.value)}
            placeholder="e.g., 4200"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="landmark">Landmark (optional)</Label>
        <Input
          id="landmark"
          value={formData.landmark}
          onChange={e => handleChange('landmark', e.target.value)}
          placeholder="e.g., Near SM City Batangas"
        />
      </div>

      {validationResult && (
        <Card className={cn(
          validationResult.valid ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'
        )}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              {validationResult.valid ? (
                <>
                  <Check className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-green-800">Address validated successfully</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <span className="text-sm text-amber-800">
                    {validationResult.errors?.[0] || 'Please check your address'}
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Button
        type="button"
        onClick={handleValidate}
        disabled={isValidating || !formData.street || !formData.city}
        className="w-full"
      >
        {isValidating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Validating...
          </>
        ) : (
          <>
            <Check className="h-4 w-4 mr-2" />
            Validate Address
          </>
        )}
      </Button>
    </div>
  );
}

export default AddressAutocomplete;
