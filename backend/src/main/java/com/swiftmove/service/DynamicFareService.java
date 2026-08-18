package com.swiftmove.service;

import com.swiftmove.dto.FareDtos.FareRequest;
import com.swiftmove.dto.FareDtos.FareResponse;
import com.swiftmove.model.FareLog;
import com.swiftmove.model.RateCard;
import com.swiftmove.repository.FareLogRepository;
import com.swiftmove.repository.RateCardRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class DynamicFareService {

    private final FareLogRepository fareLogRepository;
    private final RateCardRepository rateCardRepository;
    private final RestTemplate restTemplate;

    @Value("${ors.api.key}")
    private String orsApiKey;

    private static final String ORS_GEOCODE = "https://api.openrouteservice.org/geocode/search?api_key=%s&text=%s&size=1";
    private static final String ORS_DIRECTIONS = "https://api.openrouteservice.org/v2/directions/driving-car";

    // ── Known Indian city coordinates (haversine fallback) ───────────────────
    private static final Map<String, double[]> CITY_COORDS = Map.ofEntries(
            Map.entry("kanpur", new double[] { 26.4499, 80.3319 }),
            Map.entry("delhi", new double[] { 28.6139, 77.2090 }),
            Map.entry("lucknow", new double[] { 26.8467, 80.9462 }),
            Map.entry("agra", new double[] { 27.1767, 78.0081 }),
            Map.entry("varanasi", new double[] { 25.3176, 82.9739 }),
            Map.entry("mumbai", new double[] { 19.0760, 72.8777 }),
            Map.entry("pune", new double[] { 18.5204, 73.8567 }),
            Map.entry("hyderabad", new double[] { 17.3850, 78.4867 }),
            Map.entry("bangalore", new double[] { 12.9716, 77.5946 }),
            Map.entry("chennai", new double[] { 13.0827, 80.2707 }),
            Map.entry("kolkata", new double[] { 22.5726, 88.3639 }),
            Map.entry("jaipur", new double[] { 26.9124, 75.7873 }),
            Map.entry("allahabad", new double[] { 25.4358, 81.8463 }),
            Map.entry("ghaziabad", new double[] { 28.6692, 77.4538 }),
            Map.entry("noida", new double[] { 28.5355, 77.3910 }),
            Map.entry("gurugram", new double[] { 28.4595, 77.0266 }),
            Map.entry("indore", new double[] { 22.7196, 75.8577 }),
            Map.entry("bhopal", new double[] { 23.2599, 77.4126 }),
            Map.entry("nagpur", new double[] { 21.1458, 79.0882 }),
            Map.entry("surat", new double[] { 21.1702, 72.8311 }));

    // ── Main calculation entry point ─────────────────────────────────────────
    public FareResponse calculate(FareRequest req, String userId) {
        String city = detectCity(req.getPickup(), req.getCity());

        // 1. Get rate card
        RateCard rc = getRateCard(city, req.getVehicleType());

        // 2. Get distance
        double distanceKm;
        long durationMins;
        boolean orsUsed = false;

        // Precise coordinates from the map picker take priority — they're
        // exact (house/gate level) whereas re-geocoding the address text
        // can drift, especially for addresses ORS's free geocoder can't
        // resolve precisely (society names, landmarks, etc).
        boolean hasPreciseCoords = req.getPickupLat() != null && req.getPickupLng() != null
                && req.getDropLat() != null && req.getDropLng() != null;

        if (hasPreciseCoords) {
            double[] from = { req.getPickupLat(), req.getPickupLng() };
            double[] to = { req.getDropLat(), req.getDropLng() };
            if (isOrsReady()) {
                try {
                    double[] route = getOrsDistance(from, to);
                    distanceKm = route[0];
                    durationMins = (long) route[1];
                    orsUsed = true;
                    log.info("ORS (precise coords): {} → {} = {} km", req.getPickup(), req.getDrop(), distanceKm);
                } catch (Exception e) {
                    log.warn("ORS failed on precise coords, using haversine: {}", e.getMessage());
                    distanceKm = haversineCoords(from, to);
                    durationMins = estimateDuration(distanceKm);
                }
            } else {
                distanceKm = haversineCoords(from, to);
                durationMins = estimateDuration(distanceKm);
            }
        } else if (isOrsReady()) {
            try {
                double[] from = geocodeOrs(req.getPickup());
                double[] to = geocodeOrs(req.getDrop());
                double[] route = getOrsDistance(from, to);
                distanceKm = route[0];
                durationMins = (long) route[1];
                orsUsed = true;
                log.info("ORS: {} → {} = {} km", req.getPickup(), req.getDrop(), distanceKm);
            } catch (Exception e) {
                log.warn("ORS failed, using haversine: {}", e.getMessage());
                distanceKm = haversine(req.getPickup(), req.getDrop());
                durationMins = estimateDuration(distanceKm);
            }
        } else {
            distanceKm = haversine(req.getPickup(), req.getDrop());
            durationMins = estimateDuration(distanceKm);
        }

        // 3. Calculate fare components — SIMPLIFIED pricing.
        // Just base fare + distance. No surge pricing, no waiting charges —
        // predictable, easy-to-explain pricing instead of the old
        // surge-multiplier / waiting-minute complexity.
        long baseFare = Math.round(rc.getBaseFare());

        // Distance charge — only for km BEYOND included distance
        long distanceCharge = 0;
        if (distanceKm > rc.getIncludedDistanceKm()) {
            double extraKm = distanceKm - rc.getIncludedDistanceKm();
            distanceCharge = Math.round(extraKm * rc.getPerKmRate());
        }

        long subtotal = baseFare + distanceCharge;

        // Surge & waiting charges are disabled — kept as zeroed/neutral
        // fields (rather than removed) so the response shape, FareLog
        // schema, and admin rate-card screen don't need to change.
        int waitingMins = 0;
        long waitingCharge = 0;
        double surgeMultiplier = 1.0;
        boolean surgeApplied = false;
        String surgeReason = "";
        long surgeCharge = 0;

        double rawTotal = subtotal;

        // 5. Round to nearest ₹5
        long totalFare = roundToNearest5(rawTotal);

        // Ensure minimum fare = base fare
        totalFare = Math.max(totalFare, baseFare);

        // 6. Commission split
        double commPct = rc.getCommissionPct();
        long platformCommission = Math.round(totalFare * commPct);
        long driverPayout = totalFare - platformCommission;

        // 7. Build breakdown string
        String breakdown = buildBreakdown(
                rc, distanceKm, distanceCharge, waitingMins, waitingCharge,
                surgeApplied, surgeCharge, totalFare);

        // 8. Log for audit
        logCalculation(userId, req, city, rc, distanceKm, waitingMins,
                baseFare, distanceCharge, waitingCharge,
                surgeMultiplier, surgeReason, subtotal,
                totalFare, platformCommission, driverPayout, orsUsed);

        return FareResponse.builder()
                .pickup(req.getPickup()).drop(req.getDrop()).city(city)
                .distanceKm(Math.round(distanceKm * 10.0) / 10.0)
                .durationMins(durationMins).orsApiUsed(orsUsed)
                .vehicleType(rc.getVehicleType()).vehicleLabel(rc.getVehicleLabel())
                .capacity(rc.getCapacity())
                .baseFare(baseFare).distanceCharge(distanceCharge)
                .waitingCharge(waitingCharge).subtotal(subtotal)
                .surgeApplied(surgeApplied).surgeMultiplier(surgeMultiplier)
                .surgeReason(surgeReason).surgeCharge(surgeCharge)
                .totalFare(totalFare)
                .platformCommission(platformCommission).driverPayout(driverPayout)
                .commissionPct(commPct)
                .breakdown(breakdown)
                .includedDistanceKm(rc.getIncludedDistanceKm())
                .includedWaitingMins(rc.getIncludedWaitingMins())
                .perKmRate(rc.getPerKmRate())
                .perMinWaitingRate(rc.getPerMinWaitingRate())
                .build();
    }

    // ── Get rate card or seed default ─────────────────────────────────────────
    public RateCard getRateCard(String city, String vehicleType) {
        return rateCardRepository
                .findByCityAndVehicleTypeAndActiveTrue(city, vehicleType)
                .orElseGet(() -> {
                    RateCard def = buildDefault(city, vehicleType);
                    return rateCardRepository.save(def);
                });
    }

    public List<RateCard> getRateCardsForCity(String city) {
        return rateCardRepository.findByCityOrderByVehicleType(city);
    }

    public List<RateCard> getAllRateCards() {
        return rateCardRepository.findAllByOrderByCityAscVehicleTypeAsc();
    }

    public RateCard updateRateCard(String id,
            com.swiftmove.dto.FareDtos.RateCardUpdateRequest req) {
        RateCard rc = rateCardRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Rate card not found"));
        rc.setBaseFare(req.getBaseFare());
        rc.setPerKmRate(req.getPerKmRate());
        rc.setPerMinWaitingRate(req.getPerMinWaitingRate());
        rc.setCommissionPct(req.getCommissionPct());
        rc.setPeakHourMultiplier(req.getPeakHourMultiplier());
        rc.setWeekendMultiplier(req.getWeekendMultiplier());
        rc.setIncludedDistanceKm(req.getIncludedDistanceKm());
        rc.setIncludedWaitingMins(req.getIncludedWaitingMins());
        rc.setUpdatedAt(LocalDateTime.now());
        return rateCardRepository.save(rc);
    }

    public List<FareLog> getAllLogs() {
        return fareLogRepository.findAllByOrderByCalculatedAtDesc();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private String detectCity(String pickup, String cityOverride) {
        if (cityOverride != null && !cityOverride.isBlank())
            return cityOverride.toLowerCase().trim();
        if (pickup == null)
            return "kanpur";
        String p = pickup.toLowerCase();
        for (String city : CITY_COORDS.keySet()) {
            if (p.contains(city))
                return city;
        }
        return "kanpur"; // default
    }

    private long roundToNearest5(double amount) {
        return Math.round(amount / 5.0) * 5;
    }

    private long estimateDuration(double km) {
        return Math.round((km / 45.0) * 60); // 45 km/h avg
    }

    private boolean isOrsReady() {
        return orsApiKey != null && !orsApiKey.equals("NOT_SET") && !orsApiKey.isBlank();
    }

    private String buildBreakdown(RateCard rc, double distKm, long distCharge,
            int waitMins, long waitCharge, boolean surge, long surgeCharge, long total) {
        StringBuilder sb = new StringBuilder();
        sb.append(String.format("Base fare (%.0f km + %d min incl.): ₹%.0f",
                rc.getIncludedDistanceKm(), rc.getIncludedWaitingMins(), rc.getBaseFare()));
        if (distKm > rc.getIncludedDistanceKm())
            sb.append(String.format(" + %.1f km × ₹%.0f/km: ₹%d",
                    distKm - rc.getIncludedDistanceKm(), rc.getPerKmRate(), distCharge));
        if (waitMins > rc.getIncludedWaitingMins())
            sb.append(String.format(" + %d min × ₹%.1f/min: ₹%d",
                    waitMins - rc.getIncludedWaitingMins(), rc.getPerMinWaitingRate(), waitCharge));
        if (surge)
            sb.append(String.format(" + surge: ₹%d", surgeCharge));
        sb.append(String.format(" = ₹%d", total));
        return sb.toString();
    }

    private void logCalculation(String userId, FareRequest req, String city,
            RateCard rc, double distKm, int waitMins,
            long base, long distCharge, long waitCharge,
            double surge, String surgeReason, long subtotal,
            long total, long commission, long driverPayout, boolean orsUsed) {
        try {
            fareLogRepository.save(FareLog.builder()
                    .userId(userId).pickup(req.getPickup()).drop(req.getDrop())
                    .city(city).vehicleType(req.getVehicleType())
                    .distanceKm(distKm).waitingMins(waitMins)
                    .baseFare(base).distanceCharge(distCharge).waitingCharge(waitCharge)
                    .surgeMultiplier(surge).surgeReason(surgeReason)
                    .subtotal(subtotal).totalFareRounded(total)
                    .platformCommission(commission).driverPayout(driverPayout)
                    .commissionPct(rc.getCommissionPct()).orsApiUsed(orsUsed)
                    .calculatedAt(LocalDateTime.now()).build());
        } catch (Exception e) {
            log.warn("Failed to save fare log: {}", e.getMessage());
        }
    }

    private RateCard buildDefault(String city, String vehicleType) {
        return switch (vehicleType) {
            case "bike" -> RateCard.defaultBike(city);
            case "three-wheeler" -> RateCard.defaultThreeWheeler(city);
            case "pickup" -> RateCard.defaultPickup(city);
            case "large-truck" -> RateCard.defaultLargeTruck(city);
            default -> RateCard.defaultTataAce(city);
        };
    }

    // ── ORS API calls ─────────────────────────────────────────────────────────
    @SuppressWarnings("unchecked")
    private double[] geocodeOrs(String place) {
    String url = String.format(ORS_GEOCODE, orsApiKey, place.replace(" ", "+"));
    Map<String, Object> response = (Map<String, Object>) restTemplate.getForObject(url, Map.class);
        List<Object> features = (List<Object>) response.get("features");
        if (features == null || features.isEmpty())
            throw new RuntimeException("Cannot geocode: " + place);
        Map<String, Object> feature = (Map<String, Object>) features.get(0);
        Map<String, Object> geometry = (Map<String, Object>) feature.get("geometry");
        List<Object> coords = (List<Object>) geometry.get("coordinates");
        return new double[] { ((Number) coords.get(1)).doubleValue(), ((Number) coords.get(0)).doubleValue() };
    }

    @SuppressWarnings("unchecked")
   private double[] getOrsDistance(double[] from, double[] to) {
    Map<String, Object> body = Map.of(...);
    HttpHeaders headers = new HttpHeaders();
    headers.set("Authorization", orsApiKey);
    headers.setContentType(MediaType.APPLICATION_JSON);
    Map<String, Object> response = (Map<String, Object>) restTemplate.postForObject(ORS_DIRECTIONS,
                new HttpEntity<>(body, headers), Map.class);
        List<Object> routes = (List<Object>) response.get("routes");
        Map<String, Object> route = (Map<String, Object>) routes.get(0);
        Map<String, Object> summary = (Map<String, Object>) route.get("summary");
        return new double[] {
                ((Number) summary.get("distance")).doubleValue() / 1000.0,
                ((Number) summary.get("duration")).doubleValue() / 60.0
        };
    }

    // ── Haversine ─────────────────────────────────────────────────────────────
    private double haversine(String pickup, String drop) {
        double[] from = getCoords(pickup);
        double[] to = getCoords(drop);
        return haversineCoords(from, to);
    }

    private double haversineCoords(double[] from, double[] to) {
        double R = 6371.0;
        double dLat = Math.toRadians(to[0] - from[0]);
        double dLng = Math.toRadians(to[1] - from[1]);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(from[0])) * Math.cos(Math.toRadians(to[0]))
                        * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.3;
    }

    private double[] getCoords(String place) {
        if (place == null)
            return new double[] { 26.4499, 80.3319 };
        String key = place.toLowerCase().split(",")[0].trim();
        return CITY_COORDS.getOrDefault(key, new double[] { 26.4499, 80.3319 });
    }
}