package com.swiftmove.controller;

import com.swiftmove.model.KycDocument;
import com.swiftmove.service.KycService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/kyc")
@RequiredArgsConstructor
public class KycController {

    private final KycService kycService;

    // POST /api/kyc/submit — driver submits documents
    @PostMapping("/submit")
    public ResponseEntity<KycDocument> submit(@RequestBody Map<String, String> req) {
        return ResponseEntity.ok(kycService.submit(req, getEmail()));
    }

    // GET /api/kyc/status — driver checks their own status
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status() {
        return ResponseEntity.ok(kycService.getStatus(getEmail()));
    }

    // GET /api/admin/kyc — admin sees all submissions
    @GetMapping("/admin/all")
    public ResponseEntity<List<KycDocument>> all() {
        return ResponseEntity.ok(kycService.getAll());
    }

    // GET /api/admin/kyc/pending — admin sees pending only
    @GetMapping("/admin/pending")
    public ResponseEntity<List<KycDocument>> pending() {
        return ResponseEntity.ok(kycService.getPending());
    }

    // PUT /api/kyc/admin/{id}/approve
    @PutMapping("/admin/{id}/approve")
    public ResponseEntity<KycDocument> approve(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body) {
        String note = body != null ? body.getOrDefault("note", "") : "";
        return ResponseEntity.ok(kycService.approve(id, note));
    }

    // PUT /api/kyc/admin/{id}/reject
    @PutMapping("/admin/{id}/reject")
    public ResponseEntity<KycDocument> reject(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(
            kycService.reject(id, body.getOrDefault("reason", "Documents unclear")));
    }

    private String getEmail() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }
}
