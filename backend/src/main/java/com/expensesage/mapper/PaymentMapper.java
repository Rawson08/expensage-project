package com.expensesage.mapper;

import com.expensesage.dto.PaymentResponseDto;
import com.expensesage.model.Payment;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class PaymentMapper {

    @Autowired
    private UserMapper userMapper; // Reuse UserMapper

    public PaymentResponseDto toPaymentResponseDto(Payment payment) {
        if (payment == null) {
            return null;
        }
        return new PaymentResponseDto(
                payment.getId(),
                userMapper.toUserResponse(payment.getPaidBy()),
                userMapper.toUserResponse(payment.getPaidTo()),
                payment.getAmount(),
                payment.getCurrency(),
                payment.getDate(),
                payment.getCreatedAt(),
                payment.getGroup() != null ? payment.getGroup().getId() : null);
    }

    public List<PaymentResponseDto> toPaymentResponseDtoList(List<Payment> payments) {
        if (payments == null) {
            return null;
        }
        return payments.stream()
                .map(this::toPaymentResponseDto)
                .collect(Collectors.toList());
    }
}