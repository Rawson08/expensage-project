package com.expensesage.service;

import com.expensesage.dto.PushSubscriptionRequest;
import com.expensesage.model.User;

public interface NotificationService {

    /**
     * Subscribes a user to push notifications.
     *
     * @param user      The user subscribing.
     * @param request   The subscription details from the client.
     */
    void subscribe(User user, PushSubscriptionRequest request);

    /**
     * Unsubscribes a user based on the subscription endpoint.
     *
     * @param endpoint The unique endpoint URL of the subscription to remove.
     */
    void unsubscribe(String endpoint);

    /**
     * Sends a push notification to a specific user.
     *
     * @param user    The user to notify.
     * @param title   The notification title.
     * @param body    The notification body text.
     * @param payload Optional JSON payload to include with the notification.
     */
    void sendNotification(User user, String title, String body, Object payload);

     /**
     * Sends a push notification to multiple users.
     *
     * @param users   The list of users to notify.
     * @param title   The notification title.
     * @param body    The notification body text.
     * @param payload Optional JSON payload to include with the notification.
     */
    void sendNotificationToUsers(Iterable<User> users, String title, String body, Object payload);
}