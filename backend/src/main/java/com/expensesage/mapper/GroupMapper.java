package com.expensesage.mapper;

import java.util.Collections; // Added
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.expensesage.dto.GroupResponseDto;
import com.expensesage.dto.PaymentResponseDto; // Added
import com.expensesage.dto.UserResponse;
import com.expensesage.model.Group;
import com.expensesage.model.Payment; // Added
import com.expensesage.model.User;
import com.expensesage.repository.PaymentRepository; // Added

@Component
public class GroupMapper {

    @Autowired
    private UserMapper userMapper; // Reuse UserMapper for member details

    @Autowired
    private PaymentRepository paymentRepository; // Added PaymentRepository

    @Autowired
    private PaymentMapper paymentMapper; // Added PaymentMapper
    public GroupResponseDto toGroupResponseDto(Group group) {
        if (group == null) {
            return null;
        }

        Set<UserResponse> memberDtos = group.getMembers().stream()
                .map(userMapper::toUserResponse) // Map each User to UserResponse
                .collect(Collectors.toSet());

        // Fetch and map payments for the group
        List<Payment> payments = paymentRepository.findByGroup(group);
        List<PaymentResponseDto> paymentDtos = payments != null ?
                payments.stream()
                        .map(paymentMapper::toPaymentResponseDto)
                        .collect(Collectors.toList()) :
                Collections.emptyList();

        return new GroupResponseDto(
                group.getId(),
                group.getName(),
                group.getCreatedAt(),
                userMapper.toUserResponse(group.getCreator()), // Map the creator
                memberDtos,
                paymentDtos); // Add mapped payments
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