package com.swiftmove.controller;

import com.swiftmove.dto.FareDtos.*;
import com.swiftmove.model.FareLog;
import com.swiftmove.model.RateCard;
import com.swiftmove.service.DynamicFareService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// ── Fare calculation ──────────────────────────────────────────────────────────
@RestController
@RequestMapping("/api/fare")
@RequiredArgsConstructor
class FareController {

    private final DynamicFareService fareService;

    // POST /api/fare/calculate
    @PostMapping("/calculate")
    public ResponseEntity<FareResponse> calculate(@RequestBody FareRequest req) {
        String userId = getEmail();
        return ResponseEntity.ok(fareService.calculate(req, userId));
    }

    private String getEmail() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }
}

// ── Rate card management (admin)
// ──────────────────────────────────────────────
@RestController
@RequestMapping("/api/admin/rate-cards")
@RequiredArgsConstructor
class RateCardController {

    private final DynamicFareService fareService;

    // GET /api/admin/rate-cards — all rate cards
    @GetMapping
    public ResponseEntity<List<RateCard>> all() {
        return ResponseEntity.ok(fareService.getAllRateCards());
    }

    // GET /api/admin/rate-cards/{city} — rate cards for a city
    @GetMapping("/{city}")
    public ResponseEntity<List<RateCard>> byCity(@PathVariable String city) {
        return ResponseEntity.ok(fareService.getRateCardsForCity(city));
    }

    // PUT /api/admin/rate-cards/{id} — update a rate card
    @PutMapping("/{id}")
    public ResponseEntity<RateCard> update(
            @PathVariable String id,
            @RequestBody RateCardUpdateRequest req) {
        return ResponseEntity.ok(fareService.updateRateCard(id, req));
    }

    // GET /api/admin/fare-logs — audit log
    @GetMapping("/logs")
    public ResponseEntity<List<FareLog>> logs() {
        return ResponseEntity.ok(fareService.getAllLogs());
    }

}
