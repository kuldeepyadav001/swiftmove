package com.swiftmove.service;

import com.swiftmove.model.KycDocument;
import com.swiftmove.model.User;
import com.swiftmove.repository.KycRepository;
import com.swiftmove.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class KycService {

    private final KycRepository  kycRepository;
    private final UserRepository userRepository;
    private final EmailService   emailService;

    // ── Driver submits KYC ────────────────────────────────────────────────────
    public KycDocument submit(Map<String, String> req, String driverEmail) {

        User driver = userRepository.findByEmail(driverEmail)
                .orElseThrow(() -> new RuntimeException("Driver not found"));

        // Check if already submitted
        KycDocument existing = kycRepository.findByDriverId(driver.getId()).orElse(null);

        if (existing != null && "APPROVED".equals(existing.getStatus())) {
            throw new RuntimeException("Your KYC is already approved.");
        }

        KycDocument kyc = existing != null ? existing : new KycDocument();

        kyc.setDriverId(driver.getId());
        kyc.setDriverEmail(driver.getEmail());
        kyc.setDriverName(driver.getName());

        // Personal details
        kyc.setAadharNumber(mask(req.get("aadharNumber"), 4));
        kyc.setPanNumber(req.get("panNumber"));
        kyc.setLicenseNumber(req.get("licenseNumber"));
        kyc.setVehicleNumber(req.get("vehicleNumber"));
        kyc.setVehicleType(req.get("vehicleType"));

        // Document images (base64)
        if (req.containsKey("aadharFrontImage")) kyc.setAadharFrontImage(req.get("aadharFrontImage"));
        if (req.containsKey("aadharBackImage"))  kyc.setAadharBackImage(req.get("aadharBackImage"));
        if (req.containsKey("panImage"))         kyc.setPanImage(req.get("panImage"));
        if (req.containsKey("licenseImage"))     kyc.setLicenseImage(req.get("licenseImage"));
        if (req.containsKey("vehicleRcImage"))   kyc.setVehicleRcImage(req.get("vehicleRcImage"));
        if (req.containsKey("selfieImage"))      kyc.setSelfieImage(req.get("selfieImage"));

        kyc.setStatus("PENDING");
        kyc.setRejectionReason(null);
        kyc.setSubmittedAt(LocalDateTime.now());
        kyc.setUpdatedAt(LocalDateTime.now());

        KycDocument saved = kycRepository.save(kyc);

        // Send confirmation email
        emailService.sendEmail(
            driver.getEmail(),
            "KYC documents submitted — SwiftMove",
            kycSubmittedEmail(driver.getName())
        );

        log.info("KYC submitted by driver: {}", driverEmail);
        return saved;
    }

    // ── Get driver's own KYC status ───────────────────────────────────────────
    public Map<String, Object> getStatus(String driverEmail) {
        User driver = userRepository.findByEmail(driverEmail)
                .orElseThrow(() -> new RuntimeException("Driver not found"));

        return kycRepository.findByDriverId(driver.getId())
                .map(kyc -> Map.ofEntries(
                    Map.entry("status",          (Object) kyc.getStatus()),
                    Map.entry("submittedAt",     kyc.getSubmittedAt() != null ? kyc.getSubmittedAt().toString() : ""),
                    Map.entry("reviewedAt",      kyc.getReviewedAt()  != null ? kyc.getReviewedAt().toString()  : ""),
                    Map.entry("rejectionReason", kyc.getRejectionReason() != null ? kyc.getRejectionReason() : ""),
                    Map.entry("aadharNumber",    kyc.getAadharNumber() != null ? kyc.getAadharNumber() : ""),
                    Map.entry("panNumber",       kyc.getPanNumber()    != null ? kyc.getPanNumber()    : ""),
                    Map.entry("licenseNumber",   kyc.getLicenseNumber()!= null ? kyc.getLicenseNumber(): ""),
                    Map.entry("vehicleNumber",   kyc.getVehicleNumber()!= null ? kyc.getVehicleNumber(): ""),
                    Map.entry("hasAadhar",       kyc.getAadharFrontImage() != null),
                    Map.entry("hasPan",          kyc.getPanImage()     != null),
                    Map.entry("hasLicense",      kyc.getLicenseImage() != null)
                ))
                .orElse(Map.of("status", "NOT_SUBMITTED"));
    }

    // ── Admin: get all KYC submissions ────────────────────────────────────────
    public List<KycDocument> getAll() {
        return kycRepository.findAllByOrderBySubmittedAtDesc();
    }

    public List<KycDocument> getPending() {
        return kycRepository.findByStatusOrderBySubmittedAtDesc("PENDING");
    }

    // ── Admin: approve KYC ────────────────────────────────────────────────────
    public KycDocument approve(String kycId, String adminNote) {
        KycDocument kyc = kycRepository.findById(kycId)
                .orElseThrow(() -> new RuntimeException("KYC not found"));

        kyc.setStatus("APPROVED");
        kyc.setAdminNote(adminNote);
        kyc.setReviewedAt(LocalDateTime.now());
        kyc.setUpdatedAt(LocalDateTime.now());
        kycRepository.save(kyc);

        // Mark user as verified
        userRepository.findById(kyc.getDriverId()).ifPresent(user -> {
            user.setVerified(true);
            userRepository.save(user);
        });

        // Send approval email
        emailService.sendEmail(
            kyc.getDriverEmail(),
            "KYC Approved — You can now start accepting jobs!",
            kycApprovedEmail(kyc.getDriverName())
        );

        log.info("KYC approved for driver: {}", kyc.getDriverEmail());
        return kyc;
    }

    // ── Admin: reject KYC ─────────────────────────────────────────────────────
    public KycDocument reject(String kycId, String reason) {
        KycDocument kyc = kycRepository.findById(kycId)
                .orElseThrow(() -> new RuntimeException("KYC not found"));

        kyc.setStatus("REJECTED");
        kyc.setRejectionReason(reason);
        kyc.setReviewedAt(LocalDateTime.now());
        kyc.setUpdatedAt(LocalDateTime.now());
        kycRepository.save(kyc);

        // Send rejection email
        emailService.sendEmail(
            kyc.getDriverEmail(),
            "KYC Update Required — SwiftMove",
            kycRejectedEmail(kyc.getDriverName(), reason)
        );

        log.info("KYC rejected for driver: {} reason: {}", kyc.getDriverEmail(), reason);
        return kyc;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private String mask(String value, int visibleChars) {
        if (value == null || value.length() <= visibleChars) return value;
        return "*".repeat(value.length() - visibleChars) +
               value.substring(value.length() - visibleChars);
    }

    private String kycSubmittedEmail(String name) {
        return "<html><body style='font-family:system-ui,sans-serif;background:#f8fafc;padding:40px'>" +
               "<div style='max-width:520px;margin:0 auto;background:white;border-radius:16px;padding:40px'>" +
               "<h2 style='color:#1d4ed8'>Documents Received ✓</h2>" +
               "<p>Hi " + name + ",</p>" +
               "<p>We have received your KYC documents and they are under review.</p>" +
               "<p>We typically review documents within <strong>24-48 hours</strong>. " +
               "You will receive an email once your account is verified.</p>" +
               "<p style='color:#64748b;font-size:13px'>— SwiftMove Team</p>" +
               "</div></body></html>";
    }

    private String kycApprovedEmail(String name) {
        return "<html><body style='font-family:system-ui,sans-serif;background:#f8fafc;padding:40px'>" +
               "<div style='max-width:520px;margin:0 auto;background:white;border-radius:16px;padding:40px'>" +
               "<h2 style='color:#16a34a'>KYC Approved! 🎉</h2>" +
               "<p>Hi " + name + ",</p>" +
               "<p>Congratulations! Your KYC documents have been <strong>approved</strong>.</p>" +
               "<p>You can now go online and start accepting delivery jobs on SwiftMove.</p>" +
               "<div style='text-align:center;margin:28px 0'>" +
               "<a href='http://localhost:5173' style='background:#1d4ed8;color:white;padding:14px 32px;" +
               "border-radius:10px;text-decoration:none;font-weight:bold'>Start Earning →</a></div>" +
               "<p style='color:#64748b;font-size:13px'>— SwiftMove Team</p>" +
               "</div></body></html>";
    }

    private String kycRejectedEmail(String name, String reason) {
        return "<html><body style='font-family:system-ui,sans-serif;background:#f8fafc;padding:40px'>" +
               "<div style='max-width:520px;margin:0 auto;background:white;border-radius:16px;padding:40px'>" +
               "<h2 style='color:#dc2626'>Action Required</h2>" +
               "<p>Hi " + name + ",</p>" +
               "<p>We were unable to verify your KYC documents. Please resubmit with the following correction:</p>" +
               "<div style='background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0'>" +
               "<strong>Reason:</strong> " + reason + "</div>" +
               "<p>Please log in to SwiftMove and resubmit your documents.</p>" +
               "<p style='color:#64748b;font-size:13px'>— SwiftMove Team</p>" +
               "</div></body></html>";
    }
}
