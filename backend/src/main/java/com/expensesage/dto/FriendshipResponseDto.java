package com.expensesage.dto;

import com.expensesage.model.Friendship.FriendshipStatus;

import lombok.Data;

@Data
public class FriendshipResponseDto {
    private Long id;
    private UserResponse otherUser; // Details of the other user in the friendship/request
    private FriendshipStatus status;
    private String direction; // "INCOMING" or "OUTGOING" (only relevant for PENDING)
    private Long actionUserId; // ID of user who needs to act (only relevant for PENDING)
    private java.math.BigDecimal netBalance; // Added field for balance (positive if otherUser owes currentUser)

    // Inner class for User Summary (if needed, but UserResponse might be sufficient)
    // @Data
    // public static class UserSummaryDto {
    //     private Long id;
    //     private String name;
    //     private String email;
    // }
}