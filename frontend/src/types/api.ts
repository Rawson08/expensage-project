// Types related to API responses (matching backend DTOs)

export interface UserResponse {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

export interface JwtResponse {
  token: string;
  type: string;
  id: number;
  email: string;
  name: string;
}

export interface BalanceDto {
  otherUser: UserResponse;
  netAmount: number;
  currency: string;
}

export interface GroupResponseDto {
  id: number;
  name: string;
  createdAt: string;
  creator: UserResponse;
  members: UserResponse[];
  payments: PaymentResponseDto[]; // Added payments list
}

export interface GroupCreateRequest {
  name: string;
}

export interface AddMemberRequest {
  memberEmail: string;
}

export interface PayerResponseDto {
    user: UserResponse;
    amountPaid: number;
}

export interface SplitResponseDto {
    splitId: number;
    owedBy: UserResponse;
    amountOwed: number;
}

// Base interface for common transaction properties
interface BaseTransactionDto {
    id: number;
    amount: number;
    currency: string;
    date: string;
    createdAt: string;
    groupId?: number | null;
}

// Extend BaseTransactionDto for Expense
export interface ExpenseResponseDto extends BaseTransactionDto {
    type: 'expense';
    description: string;
    payers: PayerResponseDto[];
    splitType: 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARE';
    splits: SplitResponseDto[];
    notes?: string | null;
    receiptUrl?: string | null;
}

// --- Expense Request Types ---

export interface PayerDetailDto {
    userId: number;
    amountPaid: number;
}

export interface SplitDetailDto {
    userId: number;
    value?: number | string | null;
}

export interface ExpenseCreateRequest {
    description: string;
    amount: number;
    currency?: string;
    date?: string;
    groupId?: number | null;
    splitType: 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARE';
    payers: PayerDetailDto[];
    splits: SplitDetailDto[];
    notes?: string | null;
}


// --- Friendship Types ---

export interface FriendRequestDto {
    recipientEmail: string;
}

export interface FriendshipResponseDto {
    id: number;
    otherUser: UserResponse;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    direction?: 'INCOMING' | 'OUTGOING';
    actionUserId?: number;
    netBalance?: number | null;
}

// DTO for Overall Balance Summary
export interface OverallBalanceSummaryDto {
    totalOwedToUser: number;
    totalOwedByUser: number;
    currency: string;
}

// --- Payment Types ---

export interface PaymentCreateRequest {
    paidToUserId: number;
    amount: number;
    date: string;
    currency?: string;
    groupId?: number | null;
}

// Extend BaseTransactionDto for Payment
export interface PaymentResponseDto extends BaseTransactionDto {
    type: 'payment'; 
    paidBy: UserResponse;
    paidTo: UserResponse;
    description?: string;
}

// Union type for combined transaction list
export type TransactionDto = ExpenseResponseDto | PaymentResponseDto;

// --- Comment Types ---

export interface CommentCreateRequest {
    content: string;
}

export interface CommentResponseDto {
    id: number;
    content: string;
    createdAt: string; // Assuming ISO string format
    author: UserResponse;
    expenseId: number;
}