package com.expensesage.service;

import java.util.List;

import com.expensesage.model.Friendship;
import com.expensesage.model.User;

public interface FriendshipService {

    /**
     * Sends a friend request from the requester to the recipient based on email.
     * If the recipient doesn't exist, an error might be thrown or handled gracefully.
     * Creates a Friendship record with PENDING status.
     *
     * @param requester The user sending the request.
     * @param recipientEmail The email of the user to send the request to.
     * @return The newly created Friendship entity.
     * @throws RuntimeException if users are already friends, request already pending, or recipient not found.
     */
    Friendship sendFriendRequest(User requester, String recipientEmail);

    /**
     * Accepts a pending friend request.
     * Updates the Friendship status to ACCEPTED.
     *
     * @param friendshipId The ID of the pending friendship request.
     * @param currentUser The user accepting the request (must be user2 in the Friendship record).
     * @return The updated Friendship entity.
     * @throws RuntimeException if friendship not found, not pending, or user is not the recipient.
     */
    Friendship acceptFriendRequest(Long friendshipId, User currentUser);

    /**
     * Rejects a pending friend request.
     * Updates the Friendship status to REJECTED (or deletes the record).
     *
     * @param friendshipId The ID of the pending friendship request.
     * @param currentUser The user rejecting the request (must be user2).
     * @return The updated (or indication of deletion) Friendship entity.
     * @throws RuntimeException if friendship not found, not pending, or user is not the recipient.
     */
    Friendship rejectFriendRequest(Long friendshipId, User currentUser);

    /**
     * Removes an existing friendship (unfriends).
     * Deletes the Friendship record.
     *
     * @param friendshipId The ID of the friendship to remove.
     * @param currentUser The user initiating the removal (must be user1 or user2).
     * @throws RuntimeException if friendship not found or user is not part of the friendship.
     */
    void removeFriendship(Long friendshipId, User currentUser);

    /**
     * Gets a list of users who are friends with the current user (status = ACCEPTED).
     *
     * @param currentUser The user whose friends to list.
     * @return A list of Friendship entities representing accepted friendships.
     */
    List<Friendship> getFriends(User currentUser); // Changed return type

    /**
     * Gets a list of pending incoming friend requests for the current user.
     *
     * @param currentUser The user whose incoming requests to list.
     * @return A list of Friendship entities with PENDING status where currentUser is user2.
     */
    List<Friendship> getPendingIncomingRequests(User currentUser);

     /**
     * Gets a list of pending outgoing friend requests sent by the current user.
     *
     * @param currentUser The user whose outgoing requests to list.
     * @return A list of Friendship entities with PENDING status where currentUser is user1.
     */
    List<Friendship> getPendingOutgoingRequests(User currentUser);

}