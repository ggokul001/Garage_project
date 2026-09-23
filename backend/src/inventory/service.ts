import { PoolConnection, RowDataPacket } from 'mysql2/promise';

type Movement = {
  companyId: number;
  branchId: number;
  productId: number;
  quantity: number;
  rate?: number;
  movementType: 'GRN_RECEIPT' | 'WORK_ORDER_ISSUE' | 'WORK_ORDER_RETURN' | 'PURCHASE_RETURN';
  sourceType: string;
  sourceId: number;
  referenceNo?: string | null;
  userId: number;
};

const inbound = new Set(['GRN_RECEIPT', 'WORK_ORDER_RETURN']);

export async function applyStockMovement(conn: PoolConnection, movement: Movement) {
  const signed = inbound.has(movement.movementType) ? movement.quantity : -movement.quantity;
  if (signed < 0) {
    const [balance] = await conn.query<RowDataPacket[]>(
      'SELECT quantity FROM inventory_balances WHERE company_id=? AND branch_id=? AND product_id=? FOR UPDATE',
      [movement.companyId, movement.branchId, movement.productId],
    );
    const available = Number(balance[0]?.quantity ?? 0);
    if (available + signed < -0.0005)
      throw new Error(available <= 0 ? 'Out of stock' : `Only ${available} available`);
  }
  await conn.execute(
    `INSERT INTO inventory_balances(company_id,branch_id,product_id,quantity)
     VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE quantity=quantity+VALUES(quantity)`,
    [movement.companyId, movement.branchId, movement.productId, signed],
  );
  await conn.execute(
    `INSERT INTO stock_ledger(company_id,branch_id,product_id,movement_type,quantity,rate,source_type,source_id,reference_no,created_by)
     VALUES(?,?,?,?,?,?,?,?,?,?)`,
    [movement.companyId, movement.branchId, movement.productId, movement.movementType, movement.quantity, movement.rate ?? 0, movement.sourceType, movement.sourceId, movement.referenceNo ?? null, movement.userId],
  );
}

export async function sourceQuantity(conn: PoolConnection, companyId: number, sourceType: string, sourceId: number, productId: number) {
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT COALESCE(SUM(CASE WHEN source_type='WORK_ORDER' THEN CASE WHEN movement_type='WORK_ORDER_ISSUE' THEN quantity ELSE -quantity END ELSE CASE WHEN movement_type='GRN_RECEIPT' THEN quantity ELSE -quantity END END),0) quantity
     FROM stock_ledger WHERE company_id=? AND source_type=? AND source_id=? AND product_id=?`,
    [companyId, sourceType, sourceId, productId],
  );
  return Number(rows[0]?.quantity ?? 0);
}

export async function syncSourceQuantity(conn: PoolConnection, input: Omit<Movement, 'quantity' | 'movementType'> & { desiredQuantity: number }) {
  const current = await sourceQuantity(conn, input.companyId, input.sourceType, input.sourceId, input.productId);
  const delta = input.desiredQuantity - current;
  if (Math.abs(delta) < 0.0005) return;
  await applyStockMovement(conn, {
    ...input,
    quantity: Math.abs(delta),
    movementType: delta > 0 ? (input.sourceType === 'STORE_ENTRY' ? 'GRN_RECEIPT' : 'WORK_ORDER_ISSUE') : (input.sourceType === 'STORE_ENTRY' ? 'PURCHASE_RETURN' : 'WORK_ORDER_RETURN'),
  });
}

export async function syncWorkOrderReservations(conn: PoolConnection, input: {
  companyId: number;
  branchId: number;
  workOrderId: number;
  productQuantities: Map<number, number>;
  userId: number;
}) {
  const [existing] = await conn.query<RowDataPacket[]>(
    'SELECT product_id FROM stock_reservations WHERE company_id=? AND work_order_id=? AND status="RESERVED" FOR UPDATE',
    [input.companyId, input.workOrderId],
  );
  const productIds = new Set<number>(existing.map(row => Number(row.product_id)));
  for (const productId of input.productQuantities.keys()) productIds.add(productId);

  for (const productId of productIds) {
    const desired = Number(input.productQuantities.get(productId) ?? 0);
    const [balanceRows] = await conn.query<RowDataPacket[]>(
      'SELECT quantity FROM inventory_balances WHERE company_id=? AND branch_id=? AND product_id=? FOR UPDATE',
      [input.companyId, input.branchId, productId],
    );
    const stock = Number(balanceRows[0]?.quantity ?? 0);
    const [reservedRows] = await conn.query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(quantity),0) quantity FROM stock_reservations
       WHERE company_id=? AND branch_id=? AND product_id=? AND status='RESERVED' AND work_order_id<>?`,
      [input.companyId, input.branchId, productId, input.workOrderId],
    );
    const available = stock - Number(reservedRows[0]?.quantity ?? 0);
    if (desired > available + 0.0005)
      throw new Error(available <= 0 ? 'Out of stock' : `Only ${available} available`);

    await conn.execute(
      `INSERT INTO stock_reservations(company_id,branch_id,work_order_id,product_id,quantity,status,created_by,updated_by)
       VALUES(?,?,?,?,?,'RESERVED',?,?)
       ON DUPLICATE KEY UPDATE branch_id=VALUES(branch_id),quantity=VALUES(quantity),status='RESERVED',updated_by=VALUES(updated_by)`,
      [input.companyId, input.branchId, input.workOrderId, productId, desired, input.userId, input.userId],
    );
  }
}

export async function releaseWorkOrderReservations(conn: PoolConnection, companyId: number, workOrderId: number, userId: number) {
  await conn.execute(
    `UPDATE stock_reservations SET quantity=0,status='RELEASED',updated_by=?
     WHERE company_id=? AND work_order_id=? AND status='RESERVED'`,
    [userId, companyId, workOrderId],
  );
}

export async function consumeWorkOrderReservations(conn: PoolConnection, input: {
  companyId: number;
  workOrderId: number;
  referenceNo: string;
  userId: number;
}) {
  const [reservations] = await conn.query<RowDataPacket[]>(
    `SELECT id,branch_id,product_id,quantity FROM stock_reservations
     WHERE company_id=? AND work_order_id=? AND status='RESERVED' AND quantity>0 FOR UPDATE`,
    [input.companyId, input.workOrderId],
  );
  for (const row of reservations) {
    await applyStockMovement(conn, {
      companyId: input.companyId,
      branchId: Number(row.branch_id),
      productId: Number(row.product_id),
      quantity: Number(row.quantity),
      movementType: 'WORK_ORDER_ISSUE',
      sourceType: 'WORK_ORDER',
      sourceId: input.workOrderId,
      referenceNo: input.referenceNo,
      userId: input.userId,
    });
    await conn.execute('UPDATE stock_reservations SET status="CONSUMED",updated_by=? WHERE id=?', [input.userId, row.id]);
  }
}
