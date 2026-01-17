/**
 * Google Maps API Key Test
 *
 * Tests various Google Maps APIs to verify the API key is valid and has proper permissions.
 * Run with: npx tsx server/tests/google-maps.test.ts
 */

// Colors for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  log(title, colors.bold + colors.cyan);
  console.log('='.repeat(60));
}

function logResult(name: string, passed: boolean, details?: string) {
  const status = passed
    ? `${colors.green}✓ PASS${colors.reset}`
    : `${colors.red}✗ FAIL${colors.reset}`;
  console.log(`  ${status} ${name}`);
  if (details) {
    console.log(`       ${colors.yellow}${details}${colors.reset}`);
  }
}

// Test results tracking
const results: { name: string; passed: boolean; details?: string }[] = [];

function recordResult(name: string, passed: boolean, details?: string) {
  results.push({ name, passed, details });
  logResult(name, passed, details);
}

// API Key to test
const API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyD8_UZe99lwmvVbgVtbXLOD5BcQEsJz0-g';

// Test location (Batangas City, Philippines - relevant for BTS Delivery)
const TEST_LOCATION = {
  address: 'Batangas City, Batangas, Philippines',
  lat: 13.7565,
  lng: 121.0583,
};

const TEST_DESTINATION = {
  address: 'Lipa City, Batangas, Philippines',
  lat: 13.9411,
  lng: 121.1632,
};

// ============================================================================
// Test 1: Geocoding API
// ============================================================================
async function testGeocodingAPI() {
  logSection('Test 1: Geocoding API');

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(TEST_LOCATION.address)}&key=${API_KEY}`;

  try {
    log(`  Testing address: ${TEST_LOCATION.address}`, colors.blue);

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK') {
      const result = data.results[0];
      const location = result.geometry.location;

      recordResult(
        'Geocoding API',
        true,
        `Coordinates: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
      );

      log(`       Formatted: ${result.formatted_address}`, colors.yellow);
      return true;
    } else if (data.status === 'REQUEST_DENIED') {
      recordResult('Geocoding API', false, `Denied: ${data.error_message || 'API not enabled'}`);
      return false;
    } else {
      recordResult('Geocoding API', false, `Status: ${data.status}`);
      return false;
    }
  } catch (error: any) {
    recordResult('Geocoding API', false, error.message);
    return false;
  }
}

// ============================================================================
// Test 2: Reverse Geocoding API
// ============================================================================
async function testReverseGeocodingAPI() {
  logSection('Test 2: Reverse Geocoding API');

  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${TEST_LOCATION.lat},${TEST_LOCATION.lng}&key=${API_KEY}`;

  try {
    log(`  Testing coordinates: ${TEST_LOCATION.lat}, ${TEST_LOCATION.lng}`, colors.blue);

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK') {
      const result = data.results[0];

      recordResult(
        'Reverse Geocoding API',
        true,
        `Address: ${result.formatted_address.substring(0, 50)}...`
      );
      return true;
    } else if (data.status === 'REQUEST_DENIED') {
      recordResult('Reverse Geocoding API', false, `Denied: ${data.error_message || 'API not enabled'}`);
      return false;
    } else {
      recordResult('Reverse Geocoding API', false, `Status: ${data.status}`);
      return false;
    }
  } catch (error: any) {
    recordResult('Reverse Geocoding API', false, error.message);
    return false;
  }
}

// ============================================================================
// Test 3: Distance Matrix API
// ============================================================================
async function testDistanceMatrixAPI() {
  logSection('Test 3: Distance Matrix API');

  const origins = `${TEST_LOCATION.lat},${TEST_LOCATION.lng}`;
  const destinations = `${TEST_DESTINATION.lat},${TEST_DESTINATION.lng}`;
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${destinations}&key=${API_KEY}`;

  try {
    log(`  From: ${TEST_LOCATION.address}`, colors.blue);
    log(`  To: ${TEST_DESTINATION.address}`, colors.blue);

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK') {
      const element = data.rows[0]?.elements[0];

      if (element?.status === 'OK') {
        recordResult(
          'Distance Matrix API',
          true,
          `Distance: ${element.distance.text}, Duration: ${element.duration.text}`
        );
        return true;
      } else {
        recordResult('Distance Matrix API', false, `Element status: ${element?.status}`);
        return false;
      }
    } else if (data.status === 'REQUEST_DENIED') {
      recordResult('Distance Matrix API', false, `Denied: ${data.error_message || 'API not enabled'}`);
      return false;
    } else {
      recordResult('Distance Matrix API', false, `Status: ${data.status}`);
      return false;
    }
  } catch (error: any) {
    recordResult('Distance Matrix API', false, error.message);
    return false;
  }
}

// ============================================================================
// Test 4: Directions API
// ============================================================================
async function testDirectionsAPI() {
  logSection('Test 4: Directions API');

  const origin = `${TEST_LOCATION.lat},${TEST_LOCATION.lng}`;
  const destination = `${TEST_DESTINATION.lat},${TEST_DESTINATION.lng}`;
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${API_KEY}`;

  try {
    log(`  Route: Batangas City → Lipa City`, colors.blue);

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK') {
      const route = data.routes[0];
      const leg = route.legs[0];

      recordResult(
        'Directions API',
        true,
        `Distance: ${leg.distance.text}, Duration: ${leg.duration.text}`
      );

      log(`       Steps: ${leg.steps.length} navigation steps`, colors.yellow);
      return true;
    } else if (data.status === 'REQUEST_DENIED') {
      recordResult('Directions API', false, `Denied: ${data.error_message || 'API not enabled'}`);
      return false;
    } else {
      recordResult('Directions API', false, `Status: ${data.status}`);
      return false;
    }
  } catch (error: any) {
    recordResult('Directions API', false, error.message);
    return false;
  }
}

// ============================================================================
// Test 5: Places API (Nearby Search)
// ============================================================================
async function testPlacesNearbyAPI() {
  logSection('Test 5: Places API (Nearby Search)');

  const location = `${TEST_LOCATION.lat},${TEST_LOCATION.lng}`;
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&radius=1000&type=restaurant&key=${API_KEY}`;

  try {
    log(`  Searching restaurants near Batangas City`, colors.blue);

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK') {
      const count = data.results.length;
      const firstPlace = data.results[0];

      recordResult(
        'Places Nearby API',
        true,
        `Found ${count} restaurants nearby`
      );

      if (firstPlace) {
        log(`       Example: ${firstPlace.name}`, colors.yellow);
        log(`       Rating: ${firstPlace.rating || 'N/A'} ⭐`, colors.yellow);
      }
      return true;
    } else if (data.status === 'REQUEST_DENIED') {
      recordResult('Places Nearby API', false, `Denied: ${data.error_message || 'API not enabled'}`);
      return false;
    } else if (data.status === 'ZERO_RESULTS') {
      recordResult('Places Nearby API', true, 'API works but no results found');
      return true;
    } else {
      recordResult('Places Nearby API', false, `Status: ${data.status}`);
      return false;
    }
  } catch (error: any) {
    recordResult('Places Nearby API', false, error.message);
    return false;
  }
}

// ============================================================================
// Test 6: Places Autocomplete API
// ============================================================================
async function testPlacesAutocompleteAPI() {
  logSection('Test 6: Places Autocomplete API');

  const input = 'SM City Batangas';
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&components=country:ph&key=${API_KEY}`;

  try {
    log(`  Search query: "${input}"`, colors.blue);

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK') {
      const predictions = data.predictions;

      recordResult(
        'Places Autocomplete API',
        true,
        `Found ${predictions.length} suggestions`
      );

      if (predictions[0]) {
        log(`       Top result: ${predictions[0].description}`, colors.yellow);
      }
      return true;
    } else if (data.status === 'REQUEST_DENIED') {
      recordResult('Places Autocomplete API', false, `Denied: ${data.error_message || 'API not enabled'}`);
      return false;
    } else if (data.status === 'ZERO_RESULTS') {
      recordResult('Places Autocomplete API', true, 'API works but no results found');
      return true;
    } else {
      recordResult('Places Autocomplete API', false, `Status: ${data.status}`);
      return false;
    }
  } catch (error: any) {
    recordResult('Places Autocomplete API', false, error.message);
    return false;
  }
}

// ============================================================================
// Test 7: Static Maps API
// ============================================================================
async function testStaticMapsAPI() {
  logSection('Test 7: Static Maps API');

  const center = `${TEST_LOCATION.lat},${TEST_LOCATION.lng}`;
  const url = `https://maps.googleapis.com/maps/api/staticmap?center=${center}&zoom=14&size=400x300&key=${API_KEY}`;

  try {
    log(`  Generating static map for Batangas City`, colors.blue);

    const response = await fetch(url);

    // Check content type - should be image/png for success
    const contentType = response.headers.get('content-type');
    const isImage = contentType?.includes('image');

    if (isImage && response.ok) {
      const size = response.headers.get('content-length');
      recordResult(
        'Static Maps API',
        true,
        `Image generated (${size ? Math.round(parseInt(size) / 1024) + 'KB' : 'size unknown'})`
      );
      return true;
    } else {
      // Try to get error message
      const text = await response.text();
      let errorMsg = 'Unknown error';
      try {
        const data = JSON.parse(text);
        errorMsg = data.error_message || data.status || errorMsg;
      } catch {}

      recordResult('Static Maps API', false, errorMsg);
      return false;
    }
  } catch (error: any) {
    recordResult('Static Maps API', false, error.message);
    return false;
  }
}

// ============================================================================
// Test 8: Time Zone API
// ============================================================================
async function testTimeZoneAPI() {
  logSection('Test 8: Time Zone API');

  const location = `${TEST_LOCATION.lat},${TEST_LOCATION.lng}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const url = `https://maps.googleapis.com/maps/api/timezone/json?location=${location}&timestamp=${timestamp}&key=${API_KEY}`;

  try {
    log(`  Getting timezone for Batangas City`, colors.blue);

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK') {
      recordResult(
        'Time Zone API',
        true,
        `Timezone: ${data.timeZoneId} (${data.timeZoneName})`
      );
      return true;
    } else if (data.status === 'REQUEST_DENIED') {
      recordResult('Time Zone API', false, `Denied: ${data.errorMessage || 'API not enabled'}`);
      return false;
    } else {
      recordResult('Time Zone API', false, `Status: ${data.status}`);
      return false;
    }
  } catch (error: any) {
    recordResult('Time Zone API', false, error.message);
    return false;
  }
}

// ============================================================================
// Run All Tests
// ============================================================================
async function runAllTests() {
  console.log('\n');
  log('╔══════════════════════════════════════════════════════════╗', colors.cyan);
  log('║         Google Maps API Key Test Suite                   ║', colors.cyan);
  log('║         BTS Delivery App                                 ║', colors.cyan);
  log('╚══════════════════════════════════════════════════════════╝', colors.cyan);

  log(`\n  API Key: ${API_KEY.substring(0, 10)}...${API_KEY.substring(API_KEY.length - 4)}`, colors.yellow);

  const startTime = Date.now();

  // Run tests
  await testGeocodingAPI();
  await testReverseGeocodingAPI();
  await testDistanceMatrixAPI();
  await testDirectionsAPI();
  await testPlacesNearbyAPI();
  await testPlacesAutocompleteAPI();
  await testStaticMapsAPI();
  await testTimeZoneAPI();

  // Summary
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  logSection('Test Summary');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`\n  Total Tests: ${total}`);
  log(`  Passed: ${passed}`, colors.green);
  if (failed > 0) {
    log(`  Failed: ${failed}`, colors.red);
  }
  console.log(`  Duration: ${duration}s\n`);

  // API Status Summary
  logSection('API Enablement Status');

  const enabledAPIs = results.filter(r => r.passed).map(r => r.name);
  const disabledAPIs = results.filter(r => !r.passed).map(r => r.name);

  if (enabledAPIs.length > 0) {
    log('\n  Enabled APIs:', colors.green);
    enabledAPIs.forEach(api => log(`    ✓ ${api}`, colors.green));
  }

  if (disabledAPIs.length > 0) {
    log('\n  Disabled/Not Enabled APIs:', colors.red);
    disabledAPIs.forEach(api => log(`    ✗ ${api}`, colors.red));
    log('\n  To enable these APIs, visit:', colors.yellow);
    log('  https://console.cloud.google.com/apis/library', colors.blue);
  }

  if (failed === 0) {
    log('\n  ✓ All APIs are working! Google Maps is fully configured.', colors.green);
  } else if (passed > 0) {
    log(`\n  ⚠ ${passed}/${total} APIs are working. Some APIs need to be enabled.`, colors.yellow);
  } else {
    log('\n  ✗ API key appears to be invalid or restricted.', colors.red);
  }

  console.log('\n');

  // Return success if at least core APIs work
  const coreAPIsWork = results.find(r => r.name === 'Geocoding API')?.passed &&
                       results.find(r => r.name === 'Distance Matrix API')?.passed;

  process.exit(coreAPIsWork ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
