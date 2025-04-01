// Types related to API responses (matching backend DTOs)

export interface UserResponse {
  id: number; // Use number for IDs in frontend typically
  name: string;
  email: string;
  createdAt: string; // Dates often come as ISO strings
}

export interface JwtResponse {
  token: string;
  type: string;
  id: number;
  email: string;
  name: string;
}

export interface BalanceDto {
  otherUser: UserResponse; // Reusing UserResponse for the other user details
  netAmount: number; // Using number for frontend calculations/display
  currency: string;
}

export interface GroupResponseDto {
  id: number;
  name: string;
  createdAt: string;
  creator: UserResponse; // Added creator
  members: UserResponse[];
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

export interface ExpenseResponseDto {
    id: number;
    description: string;
    amount: number;
    currency: string;
    date: string;
    createdAt: string;
    payers: PayerResponseDto[];
    groupId?: number | null;
    splitType: 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARE';
    splits: SplitResponseDto[];
    notes?: string | null;
    receiptUrl?: string | null;
}

// --- Expense Request Types ---

// Corresponds to backend PayerDetailDto
export interface PayerDetailDto {
    userId: number;
    amountPaid: number;
}

// Corresponds to backend SplitDetailDto
export interface SplitDetailDto {
    userId: number;
    value?: number | string | null;
}

// Corresponds to backend ExpenseCreateRequest
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

export interface PaymentResponseDto {
    id: number;
    paidBy: UserResponse;
    paidTo: UserResponse;
    amount: number;
    date: string;
    currency: string;
    groupId?: number | null;
    createdAt: string;
}

// DTO for combined transaction list
export interface TransactionDto {
  id: number;
  type: 'expense' | 'payment';
  description: string;
  amount: number;
  currency: string;
  date: string;
  createdAt: string;

  // Expense specific details (optional)
  payers?: PayerResponseDto[];
  splits?: SplitResponseDto[];
  notes?: string | null;
  receiptUrl?: string | null;

  // Payment specific details (optional)
  paidBy?: UserResponse;
  paidTo?: UserResponse;
}