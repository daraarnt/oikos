/*
 * Copyright (c) 2026 by Christian Kellner.
 * Licensed under Apache-2.0 with Commons Clause and Attribution/Naming Clause
 */

import { findNearbyPlaces } from './poiService.js';

/**
 * The federal first-pass screen for prospective Anbauvereinigung premises.
 *
 * KCanG § 12(1) no. 6 refers to a 200 metre area around the *entrance* of a
 * school, child/youth facility or playground. OpenStreetMap commonly records a
 * building centre or site geometry, not a legally authoritative entrance. This
 * service therefore deliberately returns a screening result, never clearance.
 */
export const CSC_EXCLUSION_RADIUS_METERS = 200;

export const CSC_PROTECTED_CATEGORIES = Object.freeze([
  { id: 'school', label: 'School' },
  { id: 'kindergarten', label: 'Kindergarten' },
  { id: 'childcare', label: 'Childcare facility' },
  { id: 'youthCentre', label: 'Youth facility' },
  { id: 'playground', label: 'Playground' },
]);

function validCoordinates(listing) {
  const lat = Number(listing?.latitude);
  const lng = Number(listing?.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat !== -1 && lng !== -1;
}

/**
 * Screen an already-authorised listing against OSM protected-place categories.
 *
 * `clearOnMapScreen` means only that the available OSM points did not fall inside
 * the radius. It must not be rendered as legal approval: both the property pin
 * and a facility pin can be approximate, and local rules may impose more checks.
 */
export async function screenCscSiting(listing) {
  if (!validCoordinates(listing)) {
    return {
      status: 'unavailable',
      radiusMeters: CSC_EXCLUSION_RADIUS_METERS,
      matches: [],
      reason: 'Listing has no usable coordinates.',
    };
  }

  const results = await Promise.all(
    CSC_PROTECTED_CATEGORIES.map(async (category) => {
      const places = await findNearbyPlaces({
        lat: Number(listing.latitude),
        lng: Number(listing.longitude),
        category: category.id,
      });
      return { category, places };
    }),
  );

  if (results.some(({ places }) => places == null)) {
    return {
      status: 'unavailable',
      radiusMeters: CSC_EXCLUSION_RADIUS_METERS,
      matches: [],
      reason: 'OpenStreetMap data could not be checked right now.',
    };
  }

  const matches = results.flatMap(({ category, places }) =>
    places
      .filter((place) => place.meters <= CSC_EXCLUSION_RADIUS_METERS)
      .map((place) => ({
        category: category.id,
        categoryLabel: category.label,
        name: place.name || category.label,
        meters: place.meters,
        latitude: place.lat,
        longitude: place.lng,
      })),
  );

  return {
    status: matches.length > 0 ? 'reviewRequired' : 'clearOnMapScreen',
    radiusMeters: CSC_EXCLUSION_RADIUS_METERS,
    matches: matches.sort((a, b) => a.meters - b.meters),
    source: 'OpenStreetMap',
  };
}
