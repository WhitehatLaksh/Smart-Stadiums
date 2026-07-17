/**
 * FanPulse pure logic — geometry, classification, and intent-detection functions
 * with no dependency on the DOM or app state. Shared between the browser (loaded
 * via <script src="js/logic.js"> before the main app script) and the Node test
 * suite in tests/logic.test.js, so the exact same code is what gets tested.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.FanPulseLogic = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function densityLevel(v) {
    if (v >= 85) return 'critical';
    if (v >= 65) return 'busy';
    if (v >= 35) return 'moderate';
    return 'calm';
  }

  function formatCountdown(diffMs) {
    var diff = Math.max(0, diffMs);
    var m = Math.floor(diff / 60000);
    var s = Math.floor((diff % 60000) / 1000);
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function getKickoffState(targetTime, now) {
    var diff = targetTime - now;
    if (diff <= 0) {
      return {
        isLive: true,
        countdownText: '00:00',
        advisory: 'late entry gates open',
        title: 'LIVE'
      };
    }
    return {
      isLive: false,
      countdownText: formatCountdown(diff),
      advisory: 'arrival window closing',
      title: 'PRE-MATCH'
    };
  }

  function getHeatIndex(tempC, crowdBoostC) {
    return +(tempC + clamp(crowdBoostC || 0, 0, 6)).toFixed(1);
  }

  function shouldHydrationWatch(tempC, heatIndex) {
    return (heatIndex === undefined ? tempC : heatIndex) >= 32;
  }

  function shouldShowLocationWarning(originKey, mode, hasUserLocation) {
    var fixedOrigin = originKey === 'airport' || originKey === 'railway';
    var fixedMode = mode === 'airport' || mode === 'railway';
    return !hasUserLocation && !fixedOrigin && !fixedMode;
  }

  function toRad(d) {
    return (d * Math.PI) / 180;
  }

  // Haversine great-circle distance, in meters.
  function distanceMeters(lat1, lon1, lat2, lon2) {
    var R = 6371000;
    var dLat = toRad(lat2 - lat1);
    var dLon = toRad(lon2 - lon1);
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Initial compass bearing from point 1 to point 2, in degrees [0, 360).
  function bearingDeg(lat1, lon1, lat2, lon2) {
    var y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
    var x =
      Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
      Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  }

  function compassFrom(deg) {
    var dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(deg / 45) % 8];
  }

  // Fruin's pedestrian Level-of-Service scale (persons/m²) — an established
  // crowd-safety engineering standard, not a made-up rating.
  var LOS_BANDS = [
    { code: 'A', max: 0.4, desc: 'Free flow — no one has to adjust their path.' },
    { code: 'B', max: 0.7, desc: 'Comfortable — occasional minor speed adjustments.' },
    { code: 'C', max: 1.0, desc: 'Constrained — path choice is restricted, walking speed drops.' },
    { code: 'D', max: 1.4, desc: 'Restricted — frequent contact with others, shuffling pace.' },
    { code: 'E', max: 2.2, desc: 'Very slow — occasional unavoidable contact, hard to turn around.' },
    { code: 'F', max: Infinity, desc: 'Crowd-crush risk — near-static, involuntary contact, unsafe to remain.' }
  ];
  function losFor(perM2) {
    for (var i = 0; i < LOS_BANDS.length; i++) {
      if (perM2 < LOS_BANDS[i].max) return LOS_BANDS[i];
    }
    return LOS_BANDS[LOS_BANDS.length - 1];
  }

  // Intent detection for the chat assistant — pure string matching, no app state.
  function detectIntent(text) {
    var t = String(text || '').toLowerCase();
    if (/wheelchair|accessib|disab|hearing|visual|sign language/.test(t)) return 'accessibility';
    if (/leave|depart|transport|train|metro|bus|when should/.test(t)) return 'transport';
    if (/safe|busy|crowd|density|how full/.test(t)) return 'safety';
    if (/hot|water|heat|sun|hydrat/.test(t)) return 'weather';
    if (/gate|route|way to|navigat|direction|fastest/.test(t)) return 'navigation';
    return 'general';
  }

  return {
    clamp: clamp,
    densityLevel: densityLevel,
    formatCountdown: formatCountdown,
    getKickoffState: getKickoffState,
    getHeatIndex: getHeatIndex,
    shouldHydrationWatch: shouldHydrationWatch,
    shouldShowLocationWarning: shouldShowLocationWarning,
    distanceMeters: distanceMeters,
    bearingDeg: bearingDeg,
    compassFrom: compassFrom,
    LOS_BANDS: LOS_BANDS,
    losFor: losFor,
    detectIntent: detectIntent
  };
});
