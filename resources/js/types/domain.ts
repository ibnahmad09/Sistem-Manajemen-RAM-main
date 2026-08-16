// Domain types for siSawit RAM Management System

export interface Farmer {
    id: number;
    name: string;
    phone: string | null;
    address: string | null;
    balance: number;
    status: 'active' | 'inactive';
    created_at: string;
    updated_at: string;
}

export interface PalmPrice {
    id: number;
    price_per_kg: number;
    effective_date: string;
    note: string | null;
    created_by: number;
    creator?: { id: number; name: string };
    created_at: string;
    updated_at: string;
}

export interface WeighingLoad {
    id: number;
    weighing_transaction_id: number;
    seq_no: number;
    gross_weight: number;
    tare_weight: number;
    initial_weight: number;
    deduction_weight: number;
    net_weight: number;
    has_sorting: boolean;
    sorting_weight: number;
    sorting_price_per_kg: number;
    sorting_total_amount: number;
    created_at: string;
    updated_at: string;
}

export interface WeighingTransaction {
    id: number;
    nota_number: string | null;
    farmer_id: number;
    farmer_name_snapshot: string;
    cashier_id: number;
    cashier_name_snapshot: string;
    transaction_date: string;
    gross_weight: number;
    tare_weight: number;
    initial_weight: number;
    has_deduction: boolean;
    deduction_percentage: number;
    deduction_weight: number;
    net_weight: number;
    palm_price_per_kg: number;
    palm_total_amount: number;
    has_sorting: boolean;
    sorting_weight: number;
    sorting_price_per_kg: number;
    sorting_total_amount: number;
    gross_total_amount: number;
    previous_debt_amount: number;
    debt_paid_amount: number;
    remaining_debt_amount: number;
    final_paid_amount: number;
    final_paid_amount_rounded: number;
    payment_method: 'cash' | 'transfer';
    cashier_balance_deducted: boolean;
    status: 'draft' | 'printed' | 'revised' | 'cancelled';
    printed_at: string | null;
    revision_of: number | null;
    revision_number: number;
    revision_reason: string | null;
    is_latest_version: boolean;
    created_by: number;
    farmer?: Farmer;
    cashier?: { id: number; name: string };
    loads?: WeighingLoad[];
    created_at: string;
    updated_at: string;
}

export interface FarmerDebt {
    id: number;
    farmer_id: number;
    farmer_name_snapshot: string;
    type: 'loan' | 'payment' | 'adjustment';
    amount: number;
    debt_date: string;
    description: string | null;
    transaction_id: number | null;
    created_by: number;
    farmer?: Farmer;
    transaction?: WeighingTransaction;
    creator?: { id: number; name: string };
    created_at: string;
    updated_at: string;
}

export interface CashierCashEntry {
    id: number;
    cashier_id: number;
    cashier_name_snapshot: string;
    type: 'cash_in' | 'expense' | 'farmer_payment';
    amount: number;
    payment_method: 'cash' | 'transfer';
    category: string;
    description: string | null;
    transaction_id: number | null;
    entry_date: string;
    created_by: number;
    cashier?: { id: number; name: string };
    transaction?: WeighingTransaction;
    created_at: string;
    updated_at: string;
}

export interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: { url: string | null; label: string; active: boolean }[];
}

// Calculation result type
export interface TransactionCalculation {
    initialWeight: number;
    deductionWeight: number;
    netWeight: number;
    palmTotalAmount: number;
    sortingTotalAmount: number;
    grossTotalAmount: number;
    remainingDebtAmount: number;
    finalPaidAmount: number;
    finalPaidAmountRounded: number;
}
