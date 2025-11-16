// backend/services/roappPaymentService.js

const roappApi = require('../utils/roappApi');

const ROAPP_CASHBOX_ID = process.env.ROAPP_CASHBOX_ID;        // 360320
const ROAPP_CASHFLOWITEM_ID = process.env.ROAPP_CASHFLOWITEM_ID; // 2811743 "Оплата клієнтом послуги, товару"

if (!ROAPP_CASHBOX_ID) {
  console.warn(
    '[ROAPP][PAYMENT] Увага: ROAPP_CASHBOX_ID не налаштований в .env — створення оплат неможливе.'
  );
}

if (!ROAPP_CASHFLOWITEM_ID) {
  console.warn(
    '[ROAPP][PAYMENT] Увага: ROAPP_CASHFLOWITEM_ID не налаштований в .env — створення оплат неможливе.'
  );
}

/**
 * Створює платіж в ROAPP, який привʼязується до замовлення (order_id).
 *
 * ПАРАМЕТРИ:
 *   - orderId: ID замовлення в ROAPP (у тебе це той самий номер, який ми передаємо в Monobank як reference)
 *   - amount: сума в гривнях (НЕ в копійках)
 *   - customerName: (необовʼязково) імʼя клієнта для коментаря
 */
async function createRoappPaymentForOrder({ orderId, amount, customerName }) {
  if (!ROAPP_CASHBOX_ID || !ROAPP_CASHFLOWITEM_ID) {
    console.warn(
      '[ROAPP][PAYMENT] Пропущено створення платежу — не задані ROAPP_CASHBOX_ID або ROAPP_CASHFLOWITEM_ID.'
    );
    return null;
  }

  const numericAmount = Number(amount);
  if (!numericAmount || !Number.isFinite(numericAmount)) {
    console.warn(
      '[ROAPP][PAYMENT] Некоректна сума для платежу:',
      amount
    );
    return null;
  }

  const comment = `Оплата замовлення №${orderId} через Monobank (BitZone${customerName ? `, клієнт: ${customerName}` : ''
    })`;

  // ⚠ Структура тіла базується на документації Create Payment:
  // мінімально: amount, cashflow_item_id, order_id, comment
  const payload = {
    amount: numericAmount,                      // сума в гривнях
    cashflow_item_id: Number(ROAPP_CASHFLOWITEM_ID),
    order_id: Number(orderId),
    comment,
    // date можна не задавати — ROAPP візьме поточну, але на всяк випадок:
    date: new Date().toISOString(),
  };

  console.log('[ROAPP][PAYMENT] Створюємо платіж для замовлення в ROAPP:', {
    cashboxId: ROAPP_CASHBOX_ID,
    payload,
  });

  try {
    const { data } = await roappApi.post(
      `cashbox/${ROAPP_CASHBOX_ID}/payment`,
      payload
    );

    console.log('[ROAPP][PAYMENT] Платіж успішно створено в ROAPP:', data);

    return data;
  } catch (err) {
    console.error('[ROAPP][PAYMENT] Помилка при створенні платежу в ROAPP:', {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    });

    // Не валимо весь процес — просто даємо знати, що в ROAPP не записано
    throw err;
  }
}

module.exports = {
  createRoappPaymentForOrder,
};
