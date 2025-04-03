package com.expensesage.controller;

import com.expensesage.dto.PushSubscriptionRequest;
import com.expensesage.model.User;
import com.expensesage.repository.UserRepository;
import com.expensesage.service.NotificationService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private static final Logger logger = LoggerFactory.getLogger(NotificationController.class);

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    @Autowired
    public NotificationController(NotificationService notificationService, UserRepository userRepository) {
        this.notificationService = notificationService;
        this.userRepository = userRepository;
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String currentPrincipalName = authentication.getName();
        return userRepository.findByEmail(currentPrincipalName)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + currentPrincipalName));
    }

    @PostMapping("/subscribe")
    public ResponseEntity<?> subscribe(@Valid @RequestBody PushSubscriptionRequest subscriptionRequest) {
        try {
            User currentUser = getCurrentUser();
            notificationService.subscribe(currentUser, subscriptionRequest);
            return ResponseEntity.ok().body(Map.of("message", "Subscription successful"));
        } catch (UsernameNotFoundException e) {
             logger.warn("Subscription attempt failed: User not found for authenticated principal.");
             return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "User not authenticated"));
        } catch (Exception e) {
            logger.error("Error subscribing user: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Failed to subscribe"));
        }
    }

    // Optional: Add an endpoint to explicitly unsubscribe if needed
    // The service currently handles removal on send failure (404/410)
    /*
    @PostMapping("/unsubscribe")
    public ResponseEntity<?> unsubscribe(@RequestBody Map<String, String> payload) {
        String endpoint = payload.get("endpoint");
        if (endpoint == null || endpoint.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Endpoint is required"));
        }
        try {
            // Optional: Verify the user owns this endpoint before unsubscribing?
            notificationService.unsubscribe(endpoint);
            return ResponseEntity.ok().body(Map.of("message", "Unsubscribed successfully"));
        } catch (Exception e) {
            logger.error("Error unsubscribing endpoint {}: {}", endpoint, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Failed to unsubscribe"));
        }
    }
    */
}