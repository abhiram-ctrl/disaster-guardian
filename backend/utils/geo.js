// Earth radius in km
const R = 6371;

// Convert degrees to radians
function toRad(deg) {
  return (deg * Math.PI) / 180;
}

// Haversine distance in km between two lat/lng points
function distanceKm(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Approx distance (km) from point P to line segment AB (lat/lng)
function distancePointToSegmentKm(p, a, b) {
  // Convert lat/lng to approximate x/y in km
  const lat0 = toRad((a.lat + b.lat) / 2);
  const kx = R * Math.cos(lat0);
  const ky = R;

  const Ax = a.lng * kx;
  const Ay = a.lat * ky;
  const Bx = b.lng * kx;
  const By = b.lat * ky;
  const Px = p.lng * kx;
  const Py = p.lat * ky;

  const ABx = Bx - Ax;
  const ABy = By - Ay;
  const APx = Px - Ax;
  const APy = Py - Ay;

  const ab2 = ABx * ABx + ABy * ABy;
  if (ab2 === 0) {
    // A and B are same point
    const dx = Px - Ax;
    const dy = Py - Ay;
    return Math.sqrt(dx * dx + dy * dy);
  }

  let t = (APx * ABx + APy * ABy) / ab2;
  t = Math.max(0, Math.min(1, t));

  const Cx = Ax + t * ABx;
  const Cy = Ay + t * ABy;

  const dx = Px - Cx;
  const dy = Py - Cy;
  return Math.sqrt(dx * dx + dy * dy);
}

module.exports = {
  distanceKm,
  distancePointToSegmentKm,
};
