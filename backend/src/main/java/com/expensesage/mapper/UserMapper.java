package com.expensesage.mapper;

import com.expensesage.dto.UserResponse;
import com.expensesage.model.User;
import org.springframework.stereotype.Component;

@Component // Or just use static methods if preferred
public class UserMapper {

    public UserResponse toUserResponse(User user) {
        if (user == null) {
            return null;
        }
        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getCreatedAt());
    }

    // Could add methods here to map lists or other DTOs later
}