package com.expensesage.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class ReceiptResponse {
    private String storeName;
    private String date; // Consider using LocalDate or Instant if consistent format is guaranteed
    private double totalAmount;
    private List<Item> items;

    @Getter
    @Setter
    @NoArgsConstructor
    public static class Item {
        private String name;
        private double price;
    }
}