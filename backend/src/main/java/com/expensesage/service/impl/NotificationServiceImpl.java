package com.expensesage.service.impl;

import com.expensesage.dto.PushSubscriptionRequest;
import com.expensesage.model.PushSubscription;
import com.expensesage.model.User;
import com.expensesage.repository.PushSubscriptionRepository;
import com.expensesage.repository.UserRepository;
import com.expensesage.service.NotificationService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import nl.martijndwars.webpush.Subscription;
import org.apache.http.HttpResponse;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.jose4j.lang.JoseException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.security.Security;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ExecutionException;

@Service
public class NotificationServiceImpl implements NotificationService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationServiceImpl.class);

    private final PushSubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository; // To fetch user if needed
    private final ObjectMapper objectMapper; // For JSON payload serialization
    private PushService pushService; // Initialized in @PostConstruct

    @Value("${app.vapid.public-key}")
    private String vapidPublicKey;
    @Value("${app.vapid.private-key}")
    private String vapidPrivateKey;
    @Value("${app.vapid.subject}")
    private String vapidSubject;

    @Autowired
    public NotificationServiceImpl(PushSubscriptionRepository subscriptionRepository,
                                   UserRepository userRepository,
                                   ObjectMapper objectMapper) {
        this.subscriptionRepository = subscriptionRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    private void initializePushService() {
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
        try {
            pushService = new PushService(vapidPublicKey, vapidPrivateKey, vapidSubject);
            logger.info("PushService initialized successfully.");
        } catch (GeneralSecurityException e) {
            logger.error("Failed to initialize PushService. VAPID keys might be invalid.", e);
            // Handle initialization failure appropriately - maybe disable push?
        }
    }

    @Override
    @Transactional
    public void subscribe(User user, PushSubscriptionRequest request) {
        // Check if this specific endpoint already exists to prevent duplicates
        Optional<PushSubscription> existing = subscriptionRepository.findByEndpoint(request.getEndpoint());
        if (existing.isPresent()) {
            // Optional: Update user association if endpoint exists but belongs to someone else?
            // Or just log and return. For simplicity, we'll log and return.
            logger.warn("Subscription endpoint already exists: {}", request.getEndpoint());
            if (!existing.get().getUser().getId().equals(user.getId())) {
                 logger.warn("Existing subscription endpoint {} belongs to a different user ({}). Ignoring new subscription request from user {}.",
                           request.getEndpoint(), existing.get().getUser().getId(), user.getId());
            }
            return;
        }

        PushSubscription subscription = new PushSubscription(
                user,
                request.getEndpoint(),
                request.getKeys().getP256dh(),
                request.getKeys().getAuth()
        );
        subscriptionRepository.save(subscription);
        logger.info("User {} subscribed with endpoint: {}", user.getEmail(), request.getEndpoint());
    }

    @Override
    @Transactional
    public void unsubscribe(String endpoint) {
        Optional<PushSubscription> existing = subscriptionRepository.findByEndpoint(endpoint);
        if (existing.isPresent()) {
            subscriptionRepository.deleteByEndpoint(endpoint);
            logger.info("Subscription removed for endpoint: {}", endpoint);
        } else {
            logger.warn("Attempted to unsubscribe non-existent endpoint: {}", endpoint);
        }
    }

    @Override
    @Async // Send notifications asynchronously
    public void sendNotification(User user, String title, String body, Object payload) {
        List<PushSubscription> subscriptions = subscriptionRepository.findByUser(user);
        if (subscriptions.isEmpty()) {
            logger.debug("No push subscriptions found for user: {}", user.getEmail());
            return;
        }

        String jsonPayload;
        try {
            // Construct a standard payload structure
            Map<String, Object> notificationData = new HashMap<>();
            notificationData.put("title", title);
            notificationData.put("body", body);
            if (payload != null) {
                notificationData.put("data", payload); // Embed custom payload under 'data'
            }
            jsonPayload = objectMapper.writeValueAsString(notificationData);
        } catch (JsonProcessingException e) {
            logger.error("Failed to serialize notification payload for user {}: {}", user.getEmail(), e.getMessage());
            return; // Don't send if payload fails
        }


        logger.info("Sending notification '{}' to user {} ({} subscriptions)", title, user.getEmail(), subscriptions.size());

        for (PushSubscription sub : subscriptions) {
            try {
                // Correctly create Subscription object with nested Keys
                Subscription.Keys keys = new Subscription.Keys(sub.getP256dh(), sub.getAuth());
                Subscription webPushSubscription = new Subscription(sub.getEndpoint(), keys);
                HttpResponse response = pushService.send(new Notification(webPushSubscription, jsonPayload));
                int statusCode = response.getStatusLine().getStatusCode();
                if (statusCode >= 200 && statusCode < 300) {
                    logger.debug("Push notification sent successfully to endpoint: {}", sub.getEndpoint());
                } else {
                    logger.warn("Failed to send push notification to endpoint {}. Status: {}", sub.getEndpoint(), statusCode);
                    // Handle specific statuses like 404 or 410 (Not Found / Gone) -> subscription expired/invalid
                    if (statusCode == 404 || statusCode == 410) {
                        logger.warn("Subscription endpoint {} seems invalid or expired. Removing.", sub.getEndpoint());
                        // Use separate transaction or async task for removal to avoid rollback issues
                        removeSubscriptionAsync(sub.getEndpoint());
                    }
                }
            } catch (GeneralSecurityException | IOException | JoseException | ExecutionException | InterruptedException e) {
                logger.error("Error sending push notification to endpoint {}: {}", sub.getEndpoint(), e.getMessage());
            } catch (Exception e) { // Catch broader exceptions during sending
                 logger.error("Unexpected error sending push notification to endpoint {}: {}", sub.getEndpoint(), e.getMessage(), e);
            }
        }
    }

     @Override
     @Async
     public void sendNotificationToUsers(Iterable<User> users, String title, String body, Object payload) {
         for (User user : users) {
             // Avoid sending notification to the user who triggered the action if they are in the list
             Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
             String currentUsername = null;
             if (principal instanceof UserDetails) {
                 currentUsername = ((UserDetails)principal).getUsername();
             } else if (principal instanceof String) {
                 currentUsername = (String) principal;
             }

             if (user.getEmail().equals(currentUsername)) {
                 logger.debug("Skipping notification for triggering user: {}", currentUsername);
                 continue;
             }
             sendNotification(user, title, body, payload);
         }
     }

    @Async
    @Transactional
    protected void removeSubscriptionAsync(String endpoint) {
        try {
            subscriptionRepository.deleteByEndpoint(endpoint);
            logger.info("Asynchronously removed invalid subscription: {}", endpoint);
        } catch (Exception e) {
            logger.error("Error during async removal of subscription {}: {}", endpoint, e.getMessage());
        }
    }
}