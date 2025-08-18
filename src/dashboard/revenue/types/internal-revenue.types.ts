import type { Transaction, TransactionAudit } from 'src/db/schemas';
import type { DbTransaction } from 'src/db/types';

type WithdrawalTransaction = {
  type: Extract<Transaction['type'], 'withdrawal'>;
  accountId: number;
};

type CorrectionTransaction = {
  type: Extract<Transaction['type'], 'correction'>;
};

type OrderTransaction = {
  type: Extract<Transaction['type'], 'order'>;
  orderId: number;
  productId: number;
};

type SubscriptionTransaction = {
  type: Extract<Transaction['type'], 'subscription'>;
  subscriptionId: number;
};

type PlatformTransaction = {
  for: Extract<Transaction['for'], 'platform'>;
};

type UserTransaction = {
  for: Extract<Transaction['for'], 'user'>;
  userId: number;
};

type TransactionParam = {
  amount: number;
  statusToSet: Transaction['status'];
} & (PlatformTransaction | UserTransaction) &
  (OrderTransaction | SubscriptionTransaction | WithdrawalTransaction);

export type BalanceUpdate = { validate?: true } & (
  | {
      crossTransfer: undefined;
      mode: Exclude<TransactionAudit['balanceUpdateMode'], null>;
      type: Exclude<TransactionAudit['balanceUpdateType'], null>;
    }
  | { crossTransfer: Exclude<TransactionAudit['crossBalanceTransfer'], null> }
);

export type CreateTransactionParams = {
  txDetails: TransactionParam;
  type:
    | Exclude<TransactionAudit['balanceUpdateType'], null>
    | Exclude<TransactionAudit['crossBalanceTransfer'], null>;
  dbTx?: DbTransaction;
};

export type UpdateTransactionParams = {
  txDetails: {
    transactionId: number;
    statusToUpdate: Transaction['status'];
  };
  balanceUpdate?: BalanceUpdate;
  dbTx?: DbTransaction;
};
