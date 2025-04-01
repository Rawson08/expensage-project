package com.expensesage.mapper;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.expensesage.dto.BalanceDto;
import com.expensesage.dto.FriendshipResponseDto;
import com.expensesage.model.Friendship;
import com.expensesage.model.User;
import com.expensesage.service.BalanceService; // Added import

@Component
public class FriendshipMapper {

    @Autowired
    private UserMapper userMapper;
    @Autowired
    private BalanceService balanceService; // Inject BalanceService

    public FriendshipResponseDto toFriendshipResponseDto(Friendship friendship, User currentUser) {
        if (friendship == null) {
            return null;
        }

        FriendshipResponseDto dto = new FriendshipResponseDto();
        dto.setId(friendship.getId());
        dto.setStatus(friendship.getStatus()); // Use the Enum directly

        // Determine who the "other user" is from the perspective of the currentUser
        User otherUser = friendship.getUser1().equals(currentUser) ? friendship.getUser2() : friendship.getUser1();
        dto.setOtherUser(userMapper.toUserResponse(otherUser)); // Use UserResponse for other user details

        // Determine if the request is incoming or outgoing based on actionUserId
        if (friendship.getStatus() == Friendship.FriendshipStatus.PENDING) {
            if (friendship.getActionUserId() != null) {
                dto.setDirection(friendship.getActionUserId().equals(currentUser.getId()) ? "OUTGOING" : "INCOMING");
            } else {
                // Should not happen for PENDING, but handle defensively
                dto.setDirection("UNKNOWN");
            }
            dto.setActionUserId(friendship.getActionUserId()); // Include action user ID for pending requests
        } else {
            dto.setDirection(null); // Direction is irrelevant for accepted/rejected
            dto.setActionUserId(null);
        }

        // Calculate and set the net balance if the friendship is ACCEPTED
        if (friendship.getStatus() == Friendship.FriendshipStatus.ACCEPTED) {
            BalanceDto balance = balanceService.getBalanceBetweenUsers(currentUser, otherUser);
            dto.setNetBalance(balance.getNetAmount());
        } else {
            dto.setNetBalance(null); // No balance for pending/rejected
        }

        return dto;
    }
}