/**
 * Routing API Endpoints
 *
 * Exposes MapsService functionality to the frontend for route calculation
 * without embedding API keys client-side.
 */

import { Router } from "express";
import { z } from "zod";
import { mapsService } from "../integrations/maps";

const router = Router();

// Location schema for validation
const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().optional(),
});

// ============= ROUTING API ENDPOINTS =============

/**
 * POST /api/routing/directions
 * Calculate route between two points
 */
router.post("/routing/directions", async (req, res) => {
  try {
    const requestSchema = z.object({
      origin: locationSchema,
      destination: locationSchema,
      waypoints: z.array(locationSchema).optional(),
    });

    const { origin, destination, waypoints } = requestSchema.parse(req.body);

    // Calculate route using MapsService
    const route = await mapsService.calculateRoute(origin, destination);

    if (!route) {
      return res.status(400).json({
        success: false,
        message: "Unable to calculate route between the specified locations",
      });
    }

    // If waypoints provided, optimize the route
    let optimizedWaypoints = null;
    if (waypoints && waypoints.length > 0) {
      optimizedWaypoints = await mapsService.optimizeRoute(origin, waypoints);
    }

    res.json({
      success: true,
      route: {
        distance: route.distance, // in meters
        duration: route.duration, // in seconds
        polyline: route.polyline || null,
        distanceKm: (route.distance / 1000).toFixed(2),
        durationMinutes: Math.ceil(route.duration / 60),
      },
      optimizedWaypoints,
      provider: mapsService.getProviderInfo().primary,
    });
  } catch (error: any) {
    console.error("[Routing API] Directions error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid request parameters",
        errors: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to calculate route",
    });
  }
});

/**
 * POST /api/routing/distance-matrix
 * Calculate distances for multiple origin-destination pairs
 */
router.post("/routing/distance-matrix", async (req, res) => {
  try {
    const requestSchema = z.object({
      origin: locationSchema,
      destinations: z.array(locationSchema).min(1).max(25),
    });

    const { origin, destinations } = requestSchema.parse(req.body);

    // Calculate distance matrix
    const results = await mapsService.getDistanceMatrix(origin, destinations);

    if (!results) {
      return res.status(400).json({
        success: false,
        message: "Unable to calculate distances for the specified locations",
      });
    }

    res.json({
      success: true,
      results: results.map((r, index) => ({
        destinationIndex: index,
        distance: r.distance, // in meters
        duration: r.duration, // in seconds
        distanceKm: (r.distance / 1000).toFixed(2),
        durationMinutes: Math.ceil(r.duration / 60),
      })),
      provider: mapsService.getProviderInfo().primary,
    });
  } catch (error: any) {
    console.error("[Routing API] Distance matrix error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid request parameters",
        errors: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to calculate distances",
    });
  }
});

/**
 * POST /api/routing/optimize
 * Optimize route for multiple stops (traveling salesman)
 */
router.post("/routing/optimize", async (req, res) => {
  try {
    const requestSchema = z.object({
      origin: locationSchema,
      destinations: z.array(locationSchema).min(1).max(10),
      returnToOrigin: z.boolean().default(false),
    });

    const { origin, destinations, returnToOrigin } = requestSchema.parse(req.body);

    // Optimize route
    const optimizedRoute = await mapsService.optimizeRoute(origin, destinations);

    if (!optimizedRoute) {
      return res.status(400).json({
        success: false,
        message: "Unable to optimize route for the specified locations",
      });
    }

    // Calculate total distance and duration for the optimized route
    let totalDistance = 0;
    let totalDuration = 0;
    const legs: any[] = [];

    let currentLocation = origin;
    for (const stop of optimizedRoute) {
      const leg = await mapsService.calculateRoute(currentLocation, stop);
      if (leg) {
        legs.push({
          from: currentLocation,
          to: stop,
          distance: leg.distance,
          duration: leg.duration,
          polyline: leg.polyline,
        });
        totalDistance += leg.distance;
        totalDuration += leg.duration;
      }
      currentLocation = stop;
    }

    // If return to origin
    if (returnToOrigin && optimizedRoute.length > 0) {
      const returnLeg = await mapsService.calculateRoute(currentLocation, origin);
      if (returnLeg) {
        legs.push({
          from: currentLocation,
          to: origin,
          distance: returnLeg.distance,
          duration: returnLeg.duration,
          polyline: returnLeg.polyline,
        });
        totalDistance += returnLeg.distance;
        totalDuration += returnLeg.duration;
      }
    }

    res.json({
      success: true,
      optimizedRoute,
      legs,
      totalDistance, // in meters
      totalDuration, // in seconds
      totalDistanceKm: (totalDistance / 1000).toFixed(2),
      totalDurationMinutes: Math.ceil(totalDuration / 60),
      provider: mapsService.getProviderInfo().primary,
    });
  } catch (error: any) {
    console.error("[Routing API] Route optimization error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid request parameters",
        errors: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to optimize route",
    });
  }
});

/**
 * POST /api/routing/geocode
 * Geocode an address to coordinates
 */
router.post("/routing/geocode", async (req, res) => {
  try {
    const requestSchema = z.object({
      address: z.string().min(3).max(500),
    });

    const { address } = requestSchema.parse(req.body);

    const location = await mapsService.geocodeAddress(address);

    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    res.json({
      success: true,
      location: {
        lat: location.lat,
        lng: location.lng,
        address: location.address,
      },
      provider: mapsService.getProviderInfo().primary,
    });
  } catch (error: any) {
    console.error("[Routing API] Geocode error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid request parameters",
        errors: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to geocode address",
    });
  }
});

/**
 * POST /api/routing/reverse-geocode
 * Reverse geocode coordinates to an address
 */
router.post("/routing/reverse-geocode", async (req, res) => {
  try {
    const requestSchema = z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    });

    const { lat, lng } = requestSchema.parse(req.body);

    const address = await mapsService.reverseGeocode(lat, lng);

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Unable to find address for the specified coordinates",
      });
    }

    res.json({
      success: true,
      address,
      location: { lat, lng },
      provider: mapsService.getProviderInfo().primary,
    });
  } catch (error: any) {
    console.error("[Routing API] Reverse geocode error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid request parameters",
        errors: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to reverse geocode coordinates",
    });
  }
});

/**
 * GET /api/routing/provider
 * Get current maps provider information
 */
router.get("/routing/provider", (_req, res) => {
  try {
    const providerInfo = mapsService.getProviderInfo();
    res.json({
      success: true,
      provider: providerInfo,
    });
  } catch (error) {
    console.error("[Routing API] Provider info error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get provider info",
    });
  }
});

/**
 * POST /api/routing/delivery-estimate
 * Get delivery fee and time estimate
 */
router.post("/routing/delivery-estimate", async (req, res) => {
  try {
    const requestSchema = z.object({
      origin: locationSchema,
      destination: locationSchema,
      preparationTime: z.number().min(0).max(120).default(15),
    });

    const { origin, destination, preparationTime } = requestSchema.parse(req.body);

    // Calculate route
    const route = await mapsService.calculateRoute(origin, destination);

    if (!route) {
      return res.status(400).json({
        success: false,
        message: "Unable to calculate route for delivery estimate",
      });
    }

    // Calculate delivery fee and time
    const deliveryFee = mapsService.calculateDeliveryFee(route.distance);
    const estimatedTime = mapsService.estimateDeliveryTime(route.distance, preparationTime);

    res.json({
      success: true,
      estimate: {
        distance: route.distance, // meters
        distanceKm: (route.distance / 1000).toFixed(2),
        deliveryFee, // PHP
        estimatedTime, // minutes (includes prep time)
        travelTime: Math.ceil(route.duration / 60), // minutes (travel only)
        preparationTime,
        polyline: route.polyline,
      },
      provider: mapsService.getProviderInfo().primary,
    });
  } catch (error: any) {
    console.error("[Routing API] Delivery estimate error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid request parameters",
        errors: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to calculate delivery estimate",
    });
  }
});

/**
 * POST /api/routing/check-delivery-zone
 * Check if a location is within the delivery zone of a restaurant
 */
router.post("/routing/check-delivery-zone", async (req, res) => {
  try {
    const requestSchema = z.object({
      customerLocation: locationSchema,
      restaurantLocation: locationSchema,
      maxRadiusKm: z.number().min(1).max(50).default(15),
    });

    const { customerLocation, restaurantLocation, maxRadiusKm } = requestSchema.parse(req.body);

    const isWithinZone = mapsService.isWithinDeliveryZone(
      customerLocation,
      restaurantLocation,
      maxRadiusKm
    );

    // Calculate actual distance for reference
    const route = await mapsService.calculateRoute(restaurantLocation, customerLocation);
    const actualDistanceKm = route ? route.distance / 1000 : null;

    res.json({
      success: true,
      isWithinZone,
      maxRadiusKm,
      actualDistanceKm: actualDistanceKm?.toFixed(2) || null,
      provider: mapsService.getProviderInfo().primary,
    });
  } catch (error: any) {
    console.error("[Routing API] Delivery zone check error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid request parameters",
        errors: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to check delivery zone",
    });
  }
});

export default router;
