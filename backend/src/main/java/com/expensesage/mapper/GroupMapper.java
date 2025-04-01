package com.expensesage.mapper;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.expensesage.dto.GroupResponseDto;
import com.expensesage.dto.UserResponse;
import com.expensesage.model.Group;
import com.expensesage.model.User;

@Component
public class GroupMapper {

    @Autowired
    private UserMapper userMapper; // Reuse UserMapper for member details

    public GroupResponseDto toGroupResponseDto(Group group) {
        if (group == null) {
            return null;
        }

        Set<UserResponse> memberDtos = group.getMembers().stream()
                .map(userMapper::toUserResponse) // Map each User to UserResponse
                .collect(Collectors.toSet());

        return new GroupResponseDto(
                group.getId(),
                group.getName(),
                group.getCreatedAt(),
                userMapper.toUserResponse(group.getCreator()), // Map the creator
                memberDtos);
    }

    public List<GroupResponseDto> toGroupResponseDtoList(List<Group> groups) {
        return groups.stream()
                .map(this::toGroupResponseDto)
                .collect(Collectors.toList());
    }

    // Optional: Map just members if needed separately
    public Set<UserResponse> toUserResponseSet(Set<User> members) {
        return members.stream()
                .map(userMapper::toUserResponse)
                .collect(Collectors.toSet());
    }
}