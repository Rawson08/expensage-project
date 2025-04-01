package com.expensesage.model;

public enum SplitType {
    EQUAL, // Split the total amount equally among specified members
    EXACT, // Specify the exact amount each member owes
    PERCENTAGE, // Specify the percentage each member owes (must sum to 100%)
    SHARE // Split based on shares (e.g., User A owes 2 shares, User B owes 3 shares)
}