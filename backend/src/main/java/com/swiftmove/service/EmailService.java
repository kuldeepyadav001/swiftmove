package com.swiftmove.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.name:SwiftMove}")
    private String appName;

    @Async
    public void sendEmail(String to, String subject, String htmlBody) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail, appName);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(message);
            log.info("Email sent to {}: {}", to, subject);
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
        }
    }

    public void sendDeliveryOtp(String to, String shipperName, String otp, String bookingId) {
        String subject = "Delivery OTP for Booking " + bookingId;
        String body = emailTemplate(
            "Confirm Delivery",
            "Hi " + shipperName + ",",
            "Your driver has arrived at the drop location. Share the OTP below with the driver <strong>only if</strong> you have received your goods safely.",
            "<div style='text-align:center;margin:32px 0'>" +
            "<div style='display:inline-block;background:#f59e0b;color:#0a0f1e;font-size:36px;" +
            "font-weight:bold;letter-spacing:12px;padding:20px 40px;border-radius:12px'>" +
            otp + "</div>" +
            "<p style='color:#ef4444;font-size:12px;margin-top:10px'>Valid for 30 minutes</p></div>",
            "If there is an issue, do not share the OTP and report it in the app."
        );
        sendEmail(to, subject, body);
    }

    public void sendOtp(String to, String name, String otp) {
        String subject = "Your SwiftMove password reset OTP";
        String body = emailTemplate(
            "Password Reset",
            "Hi " + name + ",",
            "Use the OTP below to reset your password. This code expires in 10 minutes.",
            "<div style='text-align:center;margin:32px 0'>" +
            "<div style='display:inline-block;background:#1d4ed8;color:white;font-size:36px;" +
            "font-weight:bold;letter-spacing:12px;padding:20px 40px;border-radius:12px'>" +
            otp + "</div></div>",
            "If you did not request this, ignore this email."
        );
        sendEmail(to, subject, body);
    }

    public void sendWelcome(String to, String name, String role) {
        String subject = "Welcome to SwiftMove!";
        String roleMsg = role.equalsIgnoreCase("DRIVER") ? "Start accepting jobs." : "Book your first shipment.";
        String body = emailTemplate("Welcome aboard!", "Hi " + name + ",", "Your account is ready.", "", roleMsg);
        sendEmail(to, subject, body);
    }

    public void sendBookingConfirmed(String to, String name, String bookingId, String pickup, String drop, String vehicle, long fare) {
        String subject = "Booking confirmed — " + bookingId;
        String body = emailTemplate("Booking Confirmed", "Hi " + name + ",", "Shipment booked successfully.", detailsTable(new String[][]{{"Booking ID", bookingId}, {"Route", pickup + " → " + drop}, {"Fare", "₹" + fare}}), "Track it live in app.");
        sendEmail(to, subject, body);
    }

    public void sendDriverAssigned(String to, String shipperName, String bookingId, String driverName, String pickup, String drop) {
        String subject = "Driver assigned for " + bookingId;
        String body = emailTemplate("Driver Assigned", "Hi " + shipperName + ",", driverName + " is on the way.", detailsTable(new String[][]{{"Driver", driverName}, {"Job", bookingId}}), "Track live in app.");
        sendEmail(to, subject, body);
    }

    public void sendJobAccepted(String to, String driverName, String bookingId, String pickup, String drop, long payout) {
        String subject = "New job — " + bookingId;
        String body = emailTemplate("Job Accepted", "Hi " + driverName + ",", "New job accepted.", detailsTable(new String[][]{{"Pickup", pickup}, {"Payout", "₹" + payout}}), "Start moving!");
        sendEmail(to, subject, body);
    }

    public void sendDeliveryCompleted(String to, String name, String bookingId, String driverName, long fare) {
        String subject = "Delivery completed — " + bookingId;
        String body = emailTemplate("Delivery Completed ✓", "Hi " + name + ",", "Shipment delivered successfully.", detailsTable(new String[][]{{"ID", bookingId}, {"Fare", "₹" + fare}}), "Rate your experience!");
        sendEmail(to, subject, body);
    }

    private String emailTemplate(String heading, String greeting, String intro, String content, String footer) {
        return "<!DOCTYPE html><html><head><meta charset='UTF-8'/></head><body style='margin:0;padding:0;background:#f8fafc;font-family:sans-serif'>" +
            "<table width='100%' style='background:#f8fafc;padding:40px 0'><tr><td align='center'>" +
            "<table width='560' style='background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06)'>" +
            "<tr><td style='background:#1d4ed8;padding:28px 40px'><p style='margin:0;color:white;font-size:22px;font-weight:bold'>SwiftMove</p></td></tr>" +
            "<tr><td style='padding:36px 40px'><p style='font-weight:600'>" + greeting + "</p><p>" + intro + "</p>" + content + "<p style='font-size:13px;color:#94a3b8'>" + footer + "</p></td></tr>" +
            "</table></td></tr></table></body></html>";
    }

    private String detailsTable(String[][] rows) {
        StringBuilder sb = new StringBuilder("<table width='100%' style='background:#f8fafc;border-radius:10px;margin:20px 0'>");
        for (String[] row : rows) {
            sb.append("<tr><td style='padding:10px;color:#64748b'>").append(row[0]).append("</td><td style='padding:10px;font-weight:600'>").append(row[1]).append("</td></tr>");
        }
        sb.append("</table>");
        return sb.toString();
    }
}