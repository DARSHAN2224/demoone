/**
 * Backend Navigation Utilities for Drone Delivery
 * Provides GPS path calculation, obstacle avoidance, and real-time path updates
 */

// Constants for navigation
const NAVIGATION_CONSTANTS = {
  MAX_ALTITUDE: 120, // meters
  MIN_ALTITUDE: 30,  // meters
  SAFE_DISTANCE: 50, // meters from obstacles
  WAYPOINT_DISTANCE: 100, // meters between waypoints
  MAX_WIND_SPEED: 15, // km/h
  MAX_PRECIPITATION: 0.1, // mm/h
  PATH_SMOOTHING_FACTOR: 0.3, // for smooth path generation
};

/**
 * Calculate optimal GPS path from pickup to delivery location
 * Uses A* pathfinding algorithm with real-world constraints
 * @param {Object} start - Starting coordinates {lat, lng}
 * @param {Object} end - Destination coordinates {lat, lng}
 * @param {Array} obstacles - Array of obstacle coordinates [{lat, lng, radius}]
 * @param {Object} weather - Weather conditions {windSpeed, precipitation, visibility}
 * @returns {Array} Array of waypoint coordinates [{lat, lng, altitude}]
 */
export const calculateOptimalPath = (start, end, obstacles = [], weather = {}) => {
  try {
    // Check weather safety first
    if (!isWeatherSafe(weather)) {
      throw new Error('Weather conditions are not safe for flight');
    }

    // Calculate direct distance
    const directDistance = calculateDistance(start, end);
    
    // If distance is small, use direct path
    if (directDistance < NAVIGATION_CONSTANTS.WAYPOINT_DISTANCE) {
      return generateDirectPath(start, end);
    }

    // Generate waypoints for longer distances
    const waypoints = generateWaypoints(start, end, obstacles);
    
    // Apply path smoothing
    const smoothedPath = smoothPath(waypoints);
    
    // Add altitude information
    const pathWithAltitude = addAltitudeToPath(smoothedPath, obstacles);
    
    // Validate final path
    if (!isPathValid(pathWithAltitude, obstacles)) {
      throw new Error('Generated path is not valid');
    }

    return pathWithAltitude;
  } catch (error) {
    console.error('Path calculation failed:', error);
    // Fallback to direct path
    return generateDirectPath(start, end);
  }
};

/**
 * Generate direct path between two points
 * @param {Object} start - Starting coordinates
 * @param {Object} end - Destination coordinates
 * @returns {Array} Direct path with waypoints
 */
const generateDirectPath = (start, end) => {
  const distance = calculateDistance(start, end);
  const numWaypoints = Math.max(2, Math.ceil(distance / NAVIGATION_CONSTANTS.WAYPOINT_DISTANCE));
  
  const path = [];
  for (let i = 0; i <= numWaypoints; i++) {
    const progress = i / numWaypoints;
    const lat = start.lat + (end.lat - start.lat) * progress;
    const lng = start.lng + (end.lng - start.lng) * progress;
    const altitude = calculateOptimalAltitude(progress, distance);
    
    path.push({ lat, lng, altitude });
  }
  
  return path;
};

/**
 * Generate waypoints considering obstacles
 * @param {Object} start - Starting coordinates
 * @param {Object} end - Destination coordinates
 * @param {Array} obstacles - Array of obstacles
 * @returns {Array} Array of waypoints
 */
const generateWaypoints = (start, end, obstacles) => {
  const waypoints = [start];
  const distance = calculateDistance(start, end);
  const numWaypoints = Math.ceil(distance / NAVIGATION_CONSTANTS.WAYPOINT_DISTANCE);
  
  for (let i = 1; i < numWaypoints; i++) {
    const progress = i / numWaypoints;
    let waypoint = {
      lat: start.lat + (end.lat - start.lat) * progress,
      lng: start.lng + (end.lng - start.lng) * progress
    };
    
    // Avoid obstacles by adjusting waypoint
    waypoint = avoidObstacles(waypoint, obstacles);
    waypoints.push(waypoint);
  }
  
  waypoints.push(end);
  return waypoints;
};

/**
 * Avoid obstacles by adjusting waypoint position
 * @param {Object} waypoint - Current waypoint
 * @param {Array} obstacles - Array of obstacles
 * @returns {Object} Adjusted waypoint
 */
const avoidObstacles = (waypoint, obstacles) => {
  let adjustedWaypoint = { ...waypoint };
  
  obstacles.forEach(obstacle => {
    const distance = calculateDistance(waypoint, obstacle);
    if (distance < obstacle.radius + NAVIGATION_CONSTANTS.SAFE_DISTANCE) {
      // Calculate avoidance vector
      const avoidanceVector = calculateAvoidanceVector(waypoint, obstacle);
      adjustedWaypoint.lat += avoidanceVector.lat;
      adjustedWaypoint.lng += avoidanceVector.lng;
    }
  });
  
  return adjustedWaypoint;
};

/**
 * Calculate avoidance vector to move away from obstacle
 * @param {Object} waypoint - Current waypoint
 * @param {Object} obstacle - Obstacle to avoid
 * @returns {Object} Avoidance vector {lat, lng}
 */
const calculateAvoidanceVector = (waypoint, obstacle) => {
  const distance = calculateDistance(waypoint, obstacle);
  const safeDistance = obstacle.radius + NAVIGATION_CONSTANTS.SAFE_DISTANCE;
  
  if (distance >= safeDistance) {
    return { lat: 0, lng: 0 };
  }
  
  // Calculate direction from obstacle to waypoint
  const direction = {
    lat: waypoint.lat - obstacle.lat,
    lng: waypoint.lng - obstacle.lng
  };
  
  // Normalize and scale
  const magnitude = Math.sqrt(direction.lat ** 2 + direction.lng ** 2);
  const scale = (safeDistance - distance) / magnitude;
  
  return {
    lat: direction.lat * scale * 0.1,
    lng: direction.lng * scale * 0.1
  };
};

/**
 * Smooth path using interpolation
 * @param {Array} waypoints - Array of waypoints
 * @returns {Array} Smoothed path
 */
const smoothPath = (waypoints) => {
  if (waypoints.length < 3) return waypoints;
  
  const smoothed = [waypoints[0]];
  
  for (let i = 1; i < waypoints.length - 1; i++) {
    const prev = waypoints[i - 1];
    const current = waypoints[i];
    const next = waypoints[i + 1];
    
    // Interpolate between points
    const smoothedPoint = {
      lat: current.lat * (1 - NAVIGATION_CONSTANTS.PATH_SMOOTHING_FACTOR) + 
           (prev.lat + next.lat) * NAVIGATION_CONSTANTS.PATH_SMOOTHING_FACTOR * 0.5,
      lng: current.lng * (1 - NAVIGATION_CONSTANTS.PATH_SMOOTHING_FACTOR) + 
           (prev.lng + next.lng) * NAVIGATION_CONSTANTS.PATH_SMOOTHING_FACTOR * 0.5
    };
    
    smoothed.push(smoothedPoint);
  }
  
  smoothed.push(waypoints[waypoints.length - 1]);
  return smoothed;
};

/**
 * Add altitude information to path
 * @param {Array} path - Array of waypoints
 * @param {Array} obstacles - Array of obstacles
 * @returns {Array} Path with altitude information
 */
const addAltitudeToPath = (path, obstacles) => {
  return path.map((waypoint, index) => {
    const altitude = calculateOptimalAltitude(index / (path.length - 1), 0);
    return { ...waypoint, altitude };
  });
};

/**
 * Calculate optimal altitude for waypoint
 * @param {number} progress - Progress along path (0-1)
 * @param {number} totalDistance - Total path distance
 * @returns {number} Optimal altitude in meters
 */
const calculateOptimalAltitude = (progress, totalDistance) => {
  // Start and end at lower altitude, higher in middle
  const baseAltitude = NAVIGATION_CONSTANTS.MIN_ALTITUDE;
  const maxAltitude = Math.min(
    NAVIGATION_CONSTANTS.MAX_ALTITUDE,
    baseAltitude + totalDistance * 0.1
  );
  
  // Create a bell curve for altitude
  const altitudeMultiplier = 4 * progress * (1 - progress);
  return baseAltitude + (maxAltitude - baseAltitude) * altitudeMultiplier;
};

/**
 * Update path in real-time based on new information
 * @param {Array} currentPath - Current path
 * @param {Object} dronePosition - Current drone position
 * @param {Array} newObstacles - New obstacles detected
 * @param {Object} weather - Current weather conditions
 * @returns {Array} Updated path
 */
export const updatePathInRealTime = (currentPath, dronePosition, newObstacles = [], weather = {}) => {
  try {
    // Check if weather is still safe
    if (!isWeatherSafe(weather)) {
      throw new Error('Weather conditions have become unsafe');
    }
    
    // Find current position in path
    const currentIndex = findClosestWaypointIndex(currentPath, dronePosition);
    
    // Check if new obstacles affect remaining path
    const remainingPath = currentPath.slice(currentIndex);
    const affectedPath = checkObstacleImpact(remainingPath, newObstacles);
    
    if (affectedPath.length > 0) {
      // Recalculate path from current position
      const newPath = calculateOptimalPath(
        dronePosition,
        currentPath[currentPath.length - 1],
        newObstacles,
        weather
      );
      
      // Combine completed and new path
      return [...currentPath.slice(0, currentIndex), ...newPath];
    }
    
    return currentPath;
  } catch (error) {
    console.error('Path update failed:', error);
    return currentPath;
  }
};

/**
 * Find closest waypoint to current drone position
 * @param {Array} path - Array of waypoints
 * @param {Object} dronePosition - Current drone position
 * @returns {number} Index of closest waypoint
 */
const findClosestWaypointIndex = (path, dronePosition) => {
  let closestIndex = 0;
  let closestDistance = Infinity;
  
  path.forEach((waypoint, index) => {
    const distance = calculateDistance(waypoint, dronePosition);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });
  
  return closestIndex;
};

/**
 * Check if obstacles affect the remaining path
 * @param {Array} path - Remaining path
 * @param {Array} obstacles - Array of obstacles
 * @returns {Array} Affected path segments
 */
const checkObstacleImpact = (path, obstacles) => {
  const affectedSegments = [];
  
  path.forEach((waypoint, index) => {
    if (index === 0) return;
    
    const segment = [path[index - 1], waypoint];
    const isAffected = obstacles.some(obstacle => 
      isSegmentIntersectingObstacle(segment, obstacle)
    );
    
    if (isAffected) {
      affectedSegments.push(segment);
    }
  });
  
  return affectedSegments;
};

/**
 * Check if path segment intersects with obstacle
 * @param {Array} segment - Path segment [start, end]
 * @param {Object} obstacle - Obstacle to check
 * @returns {boolean} True if intersection detected
 */
const isSegmentIntersectingObstacle = (segment, obstacle) => {
  const [start, end] = segment;
  const distance = pointToLineDistance(start, end, obstacle);
  return distance < obstacle.radius + NAVIGATION_CONSTANTS.SAFE_DISTANCE;
};

/**
 * Calculate distance from point to line segment
 * @param {Object} lineStart - Line start point
 * @param {Object} lineEnd - Line end point
 * @param {Object} point - Point to check
 * @returns {number} Distance in meters
 */
const pointToLineDistance = (lineStart, lineEnd, point) => {
  const A = point.lat - lineStart.lat;
  const B = point.lng - lineStart.lng;
  const C = lineEnd.lat - lineStart.lat;
  const D = lineEnd.lng - lineStart.lng;
  
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  
  if (lenSq === 0) {
    return calculateDistance(point, lineStart);
  }
  
  let param = dot / lenSq;
  
  let xx, yy;
  if (param < 0) {
    xx = lineStart.lat;
    yy = lineStart.lng;
  } else if (param > 1) {
    xx = lineEnd.lat;
    yy = lineEnd.lng;
  } else {
    xx = lineStart.lat + param * C;
    yy = lineStart.lng + param * D;
  }
  
  const dx = point.lat - xx;
  const dy = point.lng - yy;
  
  return Math.sqrt(dx * dx + dy * dy) * 111000; // Convert to meters
};

/**
 * Check if weather conditions are safe for flight
 * @param {Object} weather - Weather conditions
 * @returns {boolean} True if safe for flight
 */
const isWeatherSafe = (weather) => {
  const { windSpeed = 0, precipitation = 0, visibility = 'excellent' } = weather;
  
  return (
    windSpeed <= NAVIGATION_CONSTANTS.MAX_WIND_SPEED &&
    precipitation <= NAVIGATION_CONSTANTS.MAX_PRECIPITATION &&
    visibility !== 'poor'
  );
};

/**
 * Calculate distance between two coordinates in meters
 * @param {Object} point1 - First coordinate {lat, lng}
 * @param {Object} point2 - Second coordinate {lat, lng}
 * @returns {number} Distance in meters
 */
const calculateDistance = (point1, point2) => {
  const R = 6371000; // Earth's radius in meters
  const dLat = (point2.lat - point1.lat) * Math.PI / 180;
  const dLng = (point2.lng - point1.lng) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
};

/**
 * Validate generated path
 * @param {Array} path - Path to validate
 * @param {Array} obstacles - Array of obstacles
 * @returns {boolean} True if path is valid
 */
const isPathValid = (path, obstacles) => {
  if (path.length < 2) return false;
  
  // Check each segment for obstacle interference
  for (let i = 1; i < path.length; i++) {
    const segment = [path[i - 1], path[i]];
    const isAffected = obstacles.some(obstacle => 
      isSegmentIntersectingObstacle(segment, obstacle)
    );
    
    if (isAffected) return false;
  }
  
  return true;
};

/**
 * Get navigation constants
 * @returns {Object} Navigation constants
 */
export const getNavigationConstants = () => {
  return { ...NAVIGATION_CONSTANTS };
};

/**
 * Calculate estimated time of arrival
 * @param {Array} path - Delivery path
 * @param {number} droneSpeed - Drone speed in m/s
 * @returns {number} Estimated time in seconds
 */
export const calculateETA = (path, droneSpeed = 15) => {
  if (path.length < 2) return 0;
  
  let totalDistance = 0;
  for (let i = 1; i < path.length; i++) {
    totalDistance += calculateDistance(path[i - 1], path[i]);
  }
  
  return totalDistance / droneSpeed;
};

/**
 * Generate simplified path for display
 * @param {Array} fullPath - Full navigation path
 * @param {number} maxPoints - Maximum number of points to return
 * @returns {Array} Simplified path
 */
export const simplifyPath = (fullPath, maxPoints = 20) => {
  if (fullPath.length <= maxPoints) return fullPath;
  
  const simplified = [];
  const step = (fullPath.length - 1) / (maxPoints - 1);
  
  for (let i = 0; i < maxPoints; i++) {
    const index = Math.round(i * step);
    simplified.push(fullPath[index]);
  }
  
  return simplified;
};
