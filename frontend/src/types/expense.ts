// Types related to Expense API requests

// Matches backend SplitType enum
export enum SplitType {
    EQUAL = 'EQUAL',
    EXACT = 'EXACT',
    PERCENTAGE = 'PERCENTAGE',
    SHARE = 'SHARE'
}

export interface PayerDetailDto {
    userId: number;
    amountPaid: number;
}

export interface SplitDetailDto {
    userId: number;
    value?: number | null;
}

export interface ExpenseCreateRequest {
    description: string;
    amount: number;
    date: string;
    currency?: string;
    groupId?: number | null;
    payers: PayerDetailDto[];
    splitType: SplitType;
    splits: SplitDetailDto[];
}