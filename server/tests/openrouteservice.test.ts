/**
 * OpenRouteService Integration Test Suite
 *
 * Tests the free maps API alternative to Google Maps.
 * Run with: npx tsx server/tests/openrouteservice.test.ts
 */

import 'dotenv/config';

// Colors for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '─'.repeat(60));
  log(`  ${title}`, colors.bold + colors.cyan);
  console.log('─'.repeat(60));
}

function logResult(name: string, status: 'pass' | 'fail' | 'warn' | 'skip', details?: string) {
  const icons = {
    pass: `${colors.green}✓${colors.reset}`,
    fail: `${colors.red}✗${colors.reset}`,
    warn: `${colors.yellow}⚠${colors.reset}`,
    skip: `${colors.dim}○${colors.reset}`,
  };
  console.log(`  ${icons[status]} ${name}`);
  if (details) {
    console.log(`    ${colors.dim}${details}${colors.reset}`);
  }
}

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warn' | 'skip';
  message: string;
}

const results: TestResult[] = [];

// ============================================================================
// Test: Environment Configuration
// ============================================================================
async function testEnvironment() {
  logSection('Environment Configuration');

  const apiKey = process.env.OPENROUTESERVICE_API_KEY;

  if (!apiKey) {
    logResult('OPENROUTESERVICE_API_KEY', 'skip', 'Not configured');
    log('\n  To get a free API key (2,000 requests/day):', colors.yellow);
    log('  1. Visit: https://openrouteservice.org/dev/#/signup', colors.blue);
    log('  2. Create a free account (no credit card required)', colors.dim);
    log('  3. Copy your API key and add to .env:', colors.dim);
    log('     OPENROUTESERVICE_API_KEY=your_key_here', colors.dim);
    results.push({ name: 'API Key', status: 'skip', message: 'Not configured' });
    return false;
  }

  const maskedKey = `${apiKey.substring(0, 8)}****${apiKey.substring(apiKey.length - 4)}`;
  logResult('OPENROUTESERVICE_API_KEY', 'pass', maskedKey);
  results.push({ name: 'API Key', status: 'pass', message: 'Configured' });
  return true;
}

// ============================================================================
// Test: Service Class Initialization
// ============================================================================
async function testServiceClass() {
  logSection('Service Class');

  try {
    const { openRouteService } = await import('../integrations/openrouteservice');

    const isEnabled = openRouteService.isEnabled();

    if (isEnabled) {
      logResult('Service Initialized', 'pass', 'API key loaded');
      results.push({ name: 'Service Init', status: 'pass', message: 'Initialized' });
    } else {
      logResult('Service Initialized', 'warn', 'Running without API key');
      results.push({ name: 'Service Init', status: 'warn', message: 'No API key' });
    }

    return isEnabled;
  } catch (error: any) {
    logResult('Service Class', 'fail', error.message);
    results.push({ name: 'Service Init', status: 'fail', message: error.message });
    return false;
  }
}

// ============================================================================
// Test: Geocoding
// ============================================================================
async function testGeocoding(enabled: boolean) {
  logSection('Geocoding API');

  if (!enabled) {
    logResult('Geocoding', 'skip', 'Service not enabled');
    return;
  }

  try {
    const { openRouteService } = await import('../integrations/openrouteservice');

    // Test forward geocoding
    const testAddresses = [
      'Batangas City, Philippines',
      'Lipa City, Batangas',
      'Manila, Philippines',
    ];

    for (const address of testAddresses) {
      const result = await openRouteService.geocode(address);

      if (result) {
        logResult(`Geocode: ${address}`, 'pass',
          `${result.lat.toFixed(4)}, ${result.lng.toFixed(4)} (confidence: ${(result.confidence * 100).toFixed(0)}%)`);
        results.push({ name: `Geocode ${address.split(',')[0]}`, status: 'pass', message: 'Found' });
      } else {
        logResult(`Geocode: ${address}`, 'warn', 'Not found');
        results.push({ name: `Geocode ${address.split(',')[0]}`, status: 'warn', message: 'Not found' });
      }
    }
  } catch (error: any) {
    logResult('Geocoding', 'fail', error.message);
    results.push({ name: 'Geocoding', status: 'fail', message: error.message });
  }
}

// ============================================================================
// Test: Reverse Geocoding
// ============================================================================
async function testReverseGeocoding(enabled: boolean) {
  logSection('Reverse Geocoding API');

  if (!enabled) {
    logResult('Reverse Geocoding', 'skip', 'Service not enabled');
    return;
  }

  try {
    const { openRouteService } = await import('../integrations/openrouteservice');

    // Test coordinates (Batangas City center)
    const testCoords = [
      { lat: 13.7565, lng: 121.0583, name: 'Batangas City' },
      { lat: 13.9411, lng: 121.1625, name: 'Lipa City' },
    ];

    for (const coord of testCoords) {
      const address = await openRouteService.reverseGeocode(coord.lat, coord.lng);

      if (address) {
        logResult(`Reverse: ${coord.name}`, 'pass', address.substring(0, 50) + '...');
        results.push({ name: `Reverse ${coord.name}`, status: 'pass', message: 'Found' });
      } else {
        logResult(`Reverse: ${coord.name}`, 'warn', 'No address found');
        results.push({ name: `Reverse ${coord.name}`, status: 'warn', message: 'Not found' });
      }
    }
  } catch (error: any) {
    logResult('Reverse Geocoding', 'fail', error.message);
    results.push({ name: 'Reverse Geocoding', status: 'fail', message: error.message });
  }
}

// ============================================================================
// Test: Directions/Routing
// ============================================================================
async function testDirections(enabled: boolean) {
  logSection('Directions API');

  if (!enabled) {
    logResult('Directions', 'skip', 'Service not enabled');
    return;
  }

  try {
    const { openRouteService } = await import('../integrations/openrouteservice');

    // Test route: Batangas City to Lipa City
    const origin = { lat: 13.7565, lng: 121.0583 };
    const destination = { lat: 13.9411, lng: 121.1625 };

    const route = await openRouteService.getDirections(origin, destination);

    if (route) {
      const distKm = (route.distance / 1000).toFixed(1);
      const timeMin = Math.round(route.duration / 60);
      logResult('Route Calculation', 'pass', `${distKm} km, ~${timeMin} min`);

      if (route.steps && route.steps.length > 0) {
        logResult('Turn-by-turn Instructions', 'pass', `${route.steps.length} steps`);
      }

      if (route.polyline) {
        logResult('Route Geometry', 'pass', 'Polyline available');
      }

      results.push({ name: 'Directions', status: 'pass', message: `${distKm} km route` });
    } else {
      logResult('Route Calculation', 'warn', 'No route found');
      results.push({ name: 'Directions', status: 'warn', message: 'No route' });
    }

    // Test different profiles
    const profiles = ['driving-car', 'cycling-regular', 'foot-walking'];
    for (const profile of profiles) {
      const profileRoute = await openRouteService.getDirections(origin, destination, profile);
      if (profileRoute) {
        const mins = Math.round(profileRoute.duration / 60);
        logResult(`Profile: ${profile}`, 'pass', `~${mins} min`);
      }
    }
  } catch (error: any) {
    logResult('Directions', 'fail', error.message);
    results.push({ name: 'Directions', status: 'fail', message: error.message });
  }
}

// ============================================================================
// Test: Distance Matrix
// ============================================================================
async function testDistanceMatrix(enabled: boolean) {
  logSection('Distance Matrix API');

  if (!enabled) {
    logResult('Distance Matrix', 'skip', 'Service not enabled');
    return;
  }

  try {
    const { openRouteService } = await import('../integrations/openrouteservice');

    // Test: 1 origin, 3 destinations (delivery scenario)
    const origin = { lat: 13.7565, lng: 121.0583 }; // Batangas City (warehouse)
    const destinations = [
      { lat: 13.9411, lng: 121.1625 }, // Lipa
      { lat: 14.0853, lng: 121.1496 }, // Tanauan
      { lat: 13.8333, lng: 120.6833 }, // Nasugbu
    ];

    const matrix = await openRouteService.getDistanceMatrix([origin], destinations);

    if (matrix) {
      logResult('Matrix Calculation', 'pass', `1 origin × ${destinations.length} destinations`);

      // Show distances
      const destNames = ['Lipa', 'Tanauan', 'Nasugbu'];
      for (let i = 0; i < destinations.length; i++) {
        const distKm = (matrix.distances[0][i] / 1000).toFixed(1);
        const timeMin = Math.round(matrix.durations[0][i] / 60);
        logResult(`  → ${destNames[i]}`, 'pass', `${distKm} km, ${timeMin} min`);
      }

      results.push({ name: 'Distance Matrix', status: 'pass', message: 'Working' });
    } else {
      logResult('Distance Matrix', 'warn', 'No results');
      results.push({ name: 'Distance Matrix', status: 'warn', message: 'No results' });
    }
  } catch (error: any) {
    logResult('Distance Matrix', 'fail', error.message);
    results.push({ name: 'Distance Matrix', status: 'fail', message: error.message });
  }
}

// ============================================================================
// Test: Route Optimization (TSP)
// ============================================================================
async function testRouteOptimization(enabled: boolean) {
  logSection('Route Optimization API (Delivery Route)');

  if (!enabled) {
    logResult('Route Optimization', 'skip', 'Service not enabled');
    return;
  }

  try {
    const { openRouteService } = await import('../integrations/openrouteservice');

    // Simulate delivery scenario: warehouse + 4 delivery stops
    const warehouse = { lat: 13.7565, lng: 121.0583, address: 'Warehouse (Batangas City)' };
    const deliveryStops = [
      { lat: 13.9411, lng: 121.1625, address: 'Stop 1 (Lipa)' },
      { lat: 14.0853, lng: 121.1496, address: 'Stop 2 (Tanauan)' },
      { lat: 13.8500, lng: 121.0833, address: 'Stop 3 (San Jose)' },
      { lat: 13.8333, lng: 121.2167, address: 'Stop 4 (Rosario)' },
    ];

    log('\n  Input order:', colors.dim);
    deliveryStops.forEach((stop, i) => {
      log(`    ${i + 1}. ${stop.address}`, colors.dim);
    });

    const optimized = await openRouteService.optimizeRoute(warehouse, deliveryStops);

    if (optimized) {
      const totalKm = (optimized.totalDistance / 1000).toFixed(1);
      const totalMin = Math.round(optimized.totalDuration / 60);

      logResult('Optimization', 'pass', `Total: ${totalKm} km, ${totalMin} min`);

      log('\n  Optimized order:', colors.green);
      optimized.route.forEach((stop, i) => {
        log(`    ${i + 1}. ${stop.address || `${stop.lat.toFixed(4)}, ${stop.lng.toFixed(4)}`}`, colors.dim);
      });

      results.push({ name: 'Route Optimization', status: 'pass', message: `${totalKm} km optimized route` });
    } else {
      logResult('Route Optimization', 'warn', 'No optimized route');
      results.push({ name: 'Route Optimization', status: 'warn', message: 'No results' });
    }
  } catch (error: any) {
    logResult('Route Optimization', 'fail', error.message);
    results.push({ name: 'Route Optimization', status: 'fail', message: error.message });
  }
}

// ============================================================================
// Test: Isochrones (Delivery Zones)
// ============================================================================
async function testIsochrones(enabled: boolean) {
  logSection('Isochrones API (Delivery Zones)');

  if (!enabled) {
    logResult('Isochrones', 'skip', 'Service not enabled');
    return;
  }

  try {
    const { openRouteService } = await import('../integrations/openrouteservice');

    // Test: areas reachable within 10, 20, 30 minutes from Batangas City
    const center = { lat: 13.7565, lng: 121.0583 };
    const rangeMinutes = [10, 20, 30];

    const isochrones = await openRouteService.getIsochrone(
      center,
      rangeMinutes.map(m => m * 60) // Convert to seconds
    );

    if (isochrones && isochrones.length > 0) {
      logResult('Isochrone Generation', 'pass', `${isochrones.length} zones generated`);

      for (let i = 0; i < isochrones.length; i++) {
        const zone = isochrones[i];
        const minutes = rangeMinutes[i];
        const coordCount = zone.geometry?.coordinates?.[0]?.length || 0;
        logResult(`  ${minutes}-minute zone`, 'pass', `${coordCount} boundary points`);
      }

      results.push({ name: 'Isochrones', status: 'pass', message: 'Zones generated' });
    } else {
      logResult('Isochrones', 'warn', 'No zones generated');
      results.push({ name: 'Isochrones', status: 'warn', message: 'No results' });
    }
  } catch (error: any) {
    logResult('Isochrones', 'fail', error.message);
    results.push({ name: 'Isochrones', status: 'fail', message: error.message });
  }
}

// ============================================================================
// Test: Maps Service Integration
// ============================================================================
async function testMapsServiceIntegration() {
  logSection('Maps Service Integration');

  try {
    const { mapsService } = await import('../integrations/maps');

    // Test that the unified maps service works
    const location = await mapsService.geocodeAddress('Batangas City');

    if (location) {
      logResult('Unified Geocoding', 'pass', `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`);
    } else {
      logResult('Unified Geocoding', 'warn', 'No result (using fallback)');
    }

    // Test route calculation
    const origin = { lat: 13.7565, lng: 121.0583 };
    const dest = { lat: 13.9411, lng: 121.1625 };
    const route = await mapsService.calculateRoute(origin, dest);

    if (route) {
      const distKm = (route.distance / 1000).toFixed(1);
      logResult('Unified Route', 'pass', `${distKm} km`);
    } else {
      logResult('Unified Route', 'warn', 'No result (using fallback)');
    }

    // Test delivery fee calculation
    const fee = mapsService.calculateDeliveryFee(10000); // 10km
    logResult('Delivery Fee (10km)', 'pass', `₱${fee}`);

    results.push({ name: 'Maps Service', status: 'pass', message: 'Integration working' });
  } catch (error: any) {
    logResult('Maps Service', 'fail', error.message);
    results.push({ name: 'Maps Service', status: 'fail', message: error.message });
  }
}

// ============================================================================
// Summary
// ============================================================================
function printSummary() {
  console.log('\n' + '═'.repeat(60));
  log('  OPENROUTESERVICE TEST SUMMARY', colors.bold + colors.cyan);
  console.log('═'.repeat(60) + '\n');

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warned = results.filter(r => r.status === 'warn').length;
  const skipped = results.filter(r => r.status === 'skip').length;

  // Results table
  console.log('  Test Results:');
  console.log('  ' + '─'.repeat(50));

  for (const result of results) {
    const statusColors = {
      pass: colors.green,
      fail: colors.red,
      warn: colors.yellow,
      skip: colors.dim,
    };
    const statusText = {
      pass: 'PASS',
      fail: 'FAIL',
      warn: 'WARN',
      skip: 'SKIP',
    };

    console.log(`  ${result.name.padEnd(25)} ${statusColors[result.status]}${statusText[result.status].padEnd(6)}${colors.reset} ${result.message}`);
  }

  console.log('  ' + '─'.repeat(50));
  console.log(`\n  ${colors.green}Passed: ${passed}${colors.reset}  ${colors.yellow}Warnings: ${warned}${colors.reset}  ${colors.red}Failed: ${failed}${colors.reset}  ${colors.dim}Skipped: ${skipped}${colors.reset}`);

  // Overall status
  if (failed === 0 && passed > 0) {
    log('\n  ✓ OpenRouteService is working correctly!', colors.green);
    log('    Free tier: 2,000 requests/day', colors.dim);
  } else if (skipped > passed) {
    log('\n  ⚠ OpenRouteService needs API key configuration.', colors.yellow);
    log('\n  To enable:');
    log('  1. Get free API key at: https://openrouteservice.org/dev/#/signup', colors.blue);
    log('  2. Add to .env: OPENROUTESERVICE_API_KEY=your_key', colors.dim);
  } else if (failed > 0) {
    log('\n  ✗ Some tests failed. Check the errors above.', colors.red);
  }

  console.log('\n');
}

// ============================================================================
// Run All Tests
// ============================================================================
async function runAllTests() {
  console.log('\n');
  log('╔══════════════════════════════════════════════════════════╗', colors.cyan);
  log('║       OpenRouteService Integration Tests                 ║', colors.cyan);
  log('║       Free Maps API (2,000 requests/day)                 ║', colors.cyan);
  log('╚══════════════════════════════════════════════════════════╝', colors.cyan);

  const hasApiKey = await testEnvironment();
  const serviceEnabled = await testServiceClass();

  await testGeocoding(serviceEnabled);
  await testReverseGeocoding(serviceEnabled);
  await testDirections(serviceEnabled);
  await testDistanceMatrix(serviceEnabled);
  await testRouteOptimization(serviceEnabled);
  await testIsochrones(serviceEnabled);
  await testMapsServiceIntegration();

  printSummary();

  // Exit with appropriate code
  const failed = results.filter(r => r.status === 'fail').length;
  process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
