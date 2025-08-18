import { DB_CONNECTION } from 'src/db/db-connection';
import { Database, DbTransaction } from 'src/db/types';
import { Inject, Injectable } from '@nestjs/common';
import {
  BalanceUpdate,
  CreateTransactionParams,
  UpdateTransactionParams,
} from '../types';
import {
  Balance,
  balances,
  balancesAudit,
  Transaction,
  TransactionAudit,
  TransactionAuditInsert,
  transactions,
  transactionsAudit,
} from 'src/db/schemas';
import { and, desc, eq } from 'drizzle-orm';

@Injectable()
export class InternalRevenueService {
  constructor(
    @Inject(DB_CONNECTION)
    private readonly db: Database,
  ) {}

  /**
   * `createTransaction()` is a convenient method for creating a transaction record while
   * taking care of the balance update & the audit operations.
   */
  async createTransaction(
    params: CreateTransactionParams,
  ): Promise<Transaction> {
    if (params.dbTx) {
      return this._createTransaction({ ...params, dbTx: params.dbTx });
    } else {
      return this.db.transaction(async (tx) =>
        this._createTransaction({ ...params, dbTx: tx }),
      );
    }
  }

  private async _createTransaction(
    params: Omit<CreateTransactionParams, 'dbTx'> & {
      dbTx: Exclude<CreateTransactionParams['dbTx'], undefined>;
    },
  ): Promise<Transaction> {
    let { dbTx: tx } = params;

    let prevBalance: Balance | undefined;
    if (params.txDetails.for === 'platform')
      prevBalance = await tx.query.balances.findFirst({
        where: eq(balances.for, 'platform'),
      });
    else if (params.txDetails.for === 'user')
      prevBalance = await tx.query.balances.findFirst({
        where: eq(balances.userId, params.txDetails.userId),
      });

    if (!prevBalance)
      throw new Error(
        'Balance record not found for: ' + params.txDetails.for === 'platform'
          ? 'platform'
          : params.txDetails.for === 'user'
            ? params.txDetails.userId.toString()
            : undefined,
      );

    // @ts-ignore
    let trxInsert: TransactionInsert = {
      for: params.txDetails.for,
      userId:
        params.txDetails.for === 'user' ? params.txDetails.userId : undefined,
      status: params.txDetails.statusToSet,
    };

    if (params.txDetails.type === 'order') {
      trxInsert = {
        ...trxInsert,
        type: 'order',
        balanceId: prevBalance.id,
        orderId: params.txDetails.orderId,
        productId: params.txDetails.productId,
        amount: params.txDetails.amount,
      };
    } else if (params.txDetails.type === 'subscription') {
      trxInsert = {
        ...trxInsert,
        type: 'subscription',
        balanceId: prevBalance.id,
        subscriptionId: params.txDetails.subscriptionId,
        amount: params.txDetails.amount,
      };
    } else if (params.txDetails.type === 'withdrawal') {
      trxInsert = {
        ...trxInsert,
        type: 'withdrawal',
        accountId: params.txDetails.accountId,
        balanceId: prevBalance.id,
        amount: params.txDetails.amount,
      };
    }

    let [trx] = await tx.insert(transactions).values(trxInsert).returning();

    if (!trx) throw new Error('Could not create transaction record');

    let auditInsert: TransactionAuditInsert = {
      transactionId: trx.id,
      prevStatus: trx.status,
      updatedStatus: trx.status,
      balanceUpdated: false,
    };

    if (
      params.type === 'available_to_locked' ||
      params.type === 'locked_to_available'
    ) {
      auditInsert.crossBalanceTransfer = params.type;
    } else {
      auditInsert.balanceUpdateMode = 'increment';
      auditInsert.balanceUpdateType = params.type;
    }

    // Inserting Transaction Audit
    const [txAuditInsert] = await tx
      .insert(transactionsAudit)
      .values(auditInsert)
      .returning({ id: transactionsAudit.id });

    // Updating Balance
    const balanceAudit = await this.updateBalance({
      prevBalance,
      txAuditId: txAuditInsert.id,
      amount: params.txDetails.amount,
      balanceUpdate:
        params.type === 'available_to_locked' ||
        params.type === 'locked_to_available'
          ? { crossTransfer: params.type }
          : {
              mode: 'increment',
              type: params.type,
              crossTransfer: undefined,
            },
      tx,
    });

    // Updating transaction audit
    await tx
      .update(transactionsAudit)
      .set({ balanceUpdated: true, balanceAuditId: balanceAudit.id })
      .where(eq(transactionsAudit.id, balanceAudit.txAuditId));

    return trx;
  }

  /**
   * `updateTransaction()`
   * @param params
   * @returns [updatedTx, balanceUpdated, balanceUpdateError]
   */
  async updateTransaction(params: UpdateTransactionParams) {
    if (params.dbTx) {
      return this._updateTransaction({ ...params, dbTx: params.dbTx });
    } else {
      return this.db.transaction(async (dbTx) =>
        this._updateTransaction({ ...params, dbTx }),
      );
    }
  }

  private async _updateTransaction(
    params: Omit<UpdateTransactionParams, 'dbTx'> & {
      dbTx: Exclude<UpdateTransactionParams['dbTx'], undefined>;
    },
  ) {
    const { dbTx: tx } = params;

    let balanceUpdateResponse: [boolean, string] = [false, '']; // [balanceUpdated, notUpdateReason]

    const prevTrx = await tx.query.transactions.findFirst({
      where: eq(transactions.id, params.txDetails.transactionId),
    });

    if (!prevTrx) throw new Error('Transaction not found');

    const [updated] = await tx
      .update(transactions)
      .set({
        status: params.txDetails.statusToUpdate,
      })
      .where(eq(transactions.id, prevTrx.id))
      .returning();

    // Transaction Audit

    let auditInsert: TransactionAuditInsert = {
      transactionId: prevTrx.id,
      prevStatus: prevTrx.status,
      updatedStatus: params.txDetails.statusToUpdate,
      balanceUpdated: false,
    };
    if (params.balanceUpdate) {
      if (params.balanceUpdate.crossTransfer)
        auditInsert.crossBalanceTransfer = params.balanceUpdate.crossTransfer;
      else {
        auditInsert.balanceUpdateType = params.balanceUpdate.type;
        auditInsert.balanceUpdateMode = params.balanceUpdate.mode;
      }
    }

    const [txAuditInsert] = await tx
      .insert(transactionsAudit)
      .values(auditInsert)
      .returning({ id: transactionsAudit.id });

    if (params.balanceUpdate) {
      let prevBalance: Balance | undefined;
      if (prevTrx.for === 'platform')
        prevBalance = await tx.query.balances.findFirst({
          where: eq(balances.for, 'platform'),
        });
      else if (prevTrx.for === 'user')
        prevBalance = await tx.query.balances.findFirst({
          where: eq(balances.userId, prevTrx.userId || 0),
        });

      if (!prevBalance)
        throw new Error(
          'Balance record not found for: ' + prevTrx.for === 'platform'
            ? 'platform'
            : prevTrx.for === 'user'
              ? prevTrx.userId?.toString()
              : undefined,
        );

      let proceedWithUpdate = false;

      if (params.balanceUpdate.validate) {
        const prevAuditTrxs = await tx.query.transactionsAudit.findMany({
          where: and(
            eq(transactionsAudit.transactionId, prevTrx.id),
            eq(transactionsAudit.balanceUpdated, true),
          ),
          columns: {
            balanceUpdateMode: true,
            balanceUpdateType: true,
            crossBalanceTransfer: true,
          },
          orderBy: desc(transactionsAudit.createdAt),
        });

        let targetBalanceType = params.balanceUpdate.crossTransfer
          ? params.balanceUpdate.crossTransfer.split('-')[0]
          : params.balanceUpdate.type;

        let otherBalanceType = params.balanceUpdate.crossTransfer
          ? params.balanceUpdate.crossTransfer.split('-')[2]
          : params.balanceUpdate.type === 'available'
            ? 'locked'
            : 'available';

        let incrementStatuses = [
          'increment',
          `${otherBalanceType}-to-${targetBalanceType}`,
        ];
        let decrementStatuses = [
          'decrement',
          `${targetBalanceType}-to-${otherBalanceType}`,
        ];

        let currentOpMode: Exclude<TransactionAudit['balanceUpdateMode'], null>;

        if (params.balanceUpdate.crossTransfer) {
          currentOpMode = incrementStatuses.includes(
            params.balanceUpdate.crossTransfer,
          )
            ? 'increment'
            : 'decrement';
        } else {
          currentOpMode = params.balanceUpdate.mode;
        }

        let incrementedCount = 0;
        let decrementedCount = 0;

        for (let audit of prevAuditTrxs) {
          if (
            incrementStatuses.includes(`${audit.balanceUpdateMode}`) ||
            incrementStatuses.includes(`${audit.crossBalanceTransfer}`)
          )
            incrementedCount += 1;
          if (
            decrementStatuses.includes(`${audit.balanceUpdateMode}`) ||
            decrementStatuses.includes(`${audit.crossBalanceTransfer}`)
          )
            decrementedCount += 1;
        }

        // Check if last decrement was a transfer to another balance
        // if yes, then can't do both increment or decrement
        // can only transfer back
        if (
          prevAuditTrxs[0].crossBalanceTransfer === decrementStatuses[1] &&
          params.balanceUpdate.crossTransfer !== incrementStatuses[1]
        ) {
          balanceUpdateResponse[1] = `Cannot ${currentOpMode} for this transaction now. last decrement was a transfer to another balance. can only transfer back`;
        }
        // Similarly, transfers from another account can only be happen
        // - at the creation of the transaction
        // - and after the last decrement was a transfer to another balance
        else if (
          params.balanceUpdate.crossTransfer === incrementStatuses[1] &&
          prevAuditTrxs[0].crossBalanceTransfer !== decrementStatuses[1]
        ) {
          balanceUpdateResponse[1] = `Cannot ${currentOpMode} for this transaction now. last decrement was a transfer to another balance. can only transfer back`;
        }
        // As start of a transaction is always an increment
        // and the rule is that one operation (inc/dec) can't be done twice in a row
        // that's why on increment: incrementCount will be greater than decrementedCount
        // and on decrement: decrementedCount will be equal to incrementedCount
        // that's how we know if to proceed
        else if (
          currentOpMode === 'increment' &&
          incrementedCount > decrementedCount
        ) {
          balanceUpdateResponse[1] = `Cannot increment again for this transaction because last update was an increment `;
        } else if (
          currentOpMode === 'decrement' &&
          decrementedCount === incrementedCount
        ) {
          balanceUpdateResponse[1] = `Cannot decrement again for this transaction because last update was an decrement `;
        }
        // -------------------------
        else proceedWithUpdate = true;
      } else proceedWithUpdate = true;

      if (proceedWithUpdate) {
        const balanceAudit = await this.updateBalance({
          prevBalance,
          txAuditId: txAuditInsert.id,
          amount: prevTrx.amount,
          balanceUpdate: params.balanceUpdate,
          tx,
        });
        // Updating transaction audit
        await tx
          .update(transactionsAudit)
          .set({ balanceUpdated: true, balanceAuditId: balanceAudit.id })
          .where(eq(transactionsAudit.id, balanceAudit.txAuditId));
        balanceUpdateResponse = [true, ''];
      }
    }

    return [updated, ...balanceUpdateResponse];
  }

  private async updateBalance(params: {
    amount: number;
    prevBalance: Balance;
    balanceUpdate: BalanceUpdate;
    txAuditId: number;
    tx: DbTransaction;
  }) {
    // @ts-ignore
    let updatedBalance: Pick<Balance, 'availableBalance' | 'lockedBalance'>;

    if (params.balanceUpdate.crossTransfer) {
      let available =
        params.prevBalance.availableBalance +
        (params.balanceUpdate.crossTransfer === 'available_to_locked'
          ? -params.amount
          : params.amount);
      let locked =
        params.prevBalance.lockedBalance +
        (params.balanceUpdate.crossTransfer === 'locked_to_available'
          ? -params.amount
          : params.amount);

      // check if any balance is in negative.
      // that means the balance isn't enough
      if (available < 0 || locked < 0) {
        throw new Error('Insufficient balance');
      }

      [updatedBalance] = await params.tx
        .update(balances)
        .set({
          availableBalance: available,
          lockedBalance: locked,
        })
        .where(eq(balances.id, params.prevBalance.id))
        .returning({
          availableBalance: balances.availableBalance,
          lockedBalance: balances.lockedBalance,
        });
    } else {
      let updatedAmount =
        (params.balanceUpdate.type === 'available'
          ? params.prevBalance.availableBalance
          : params.prevBalance.lockedBalance) +
        (params.balanceUpdate.mode === 'increment'
          ? params.amount
          : -params.amount);

      // check if any balance is in negative.
      // that means the balance isn't enough
      if (updatedAmount < 0) {
        throw new Error('Insufficient balance');
      }

      [updatedBalance] = await params.tx
        .update(balances)
        .set({
          availableBalance:
            params.balanceUpdate.type === 'available'
              ? updatedAmount
              : params.prevBalance.availableBalance,
          lockedBalance:
            params.balanceUpdate.type === 'locked'
              ? updatedAmount
              : params.prevBalance.lockedBalance,
        })
        .where(eq(balances.id, params.prevBalance.id))
        .returning({
          availableBalance: balances.availableBalance,
          lockedBalance: balances.lockedBalance,
        });
    }

    // Balance Audit
    const [audit] = await params.tx
      .insert(balancesAudit)
      .values({
        balanceId: params.prevBalance.id,
        txAuditId: params.txAuditId,
        prevAvailableBalance: params.prevBalance.availableBalance,
        prevLockedBalance: params.prevBalance.lockedBalance,
        updatedAvailableBalance: updatedBalance.availableBalance,
        updatedLockedBalance: updatedBalance.lockedBalance,
      })
      .returning({ id: balancesAudit.id, txAuditId: balancesAudit.txAuditId });

    return audit;
  }
}
