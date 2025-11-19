// backend/services/roappPaymentService.js
// Сервіс для створення платежів у ROAPP, прив'язаних до замовлень.

const roappApi = require('../utils/roappApi');

const ROAPP_CASHBOX_ID = process.env.ROAPP_CASHBOX_ID; // наприклад: 360320
const ROAPP_CASHFLOW_ITEM_ID = process.env.ROAPP_CASHFLOW_ITEM_ID; // наприклад: 2811743

/**
 * Створює платіж у ROAPP, прив'язаний до конкретного замовлення.
 *
 * @param {Object} params
 * @param {string|number} params.orderId    - ID замовлення в ROAPP (order.id / reference)
 * @param {number}        params.amount     - сума в гривнях (НЕ в копійках)
 * @param {string}        [params.description] - опис платежу, який буде видно в касі
 *
 * Повертає data з ROAPP.
 */
async function createRoappPaymentForOrder({ orderId, amount, description }) {
  if (!ROAPP_CASHBOX_ID || !ROAPP_CASHFLOW_ITEM_ID) {
    console.warn(
      '[ROAPP][PAYMENT] Не налаштовані ROAPP_CASHBOX_ID або ROAPP_CASHFLOW_ITEM_ID. ' +
        'Платіж у ROAPP створений не буде.'
    );
    return null;
  }

  if (!orderId || !amount) {
    throw new Error(
      '[ROAPP][PAYMENT] Потрібно передати orderId та amount для створення платежу.'
    );
  }

  const numericOrderId = Number(orderId);
  const amountNumber = Number(amount);

  if (!Number.isFinite(numericOrderId) || !Number.isFinite(amountNumber)) {
    throw new Error(
      '[ROAPP][PAYMENT] orderId та amount мають бути числовими значеннями.'
    );
  }

  const payload = {
    amount: Number(amountNumber.toFixed(2)), // сума в гривнях, з двома знаками після коми
    cashflow_item_id: Number(ROAPP_CASHFLOW_ITEM_ID),
    order_id: numericOrderId,
    comment:
      description ||
      `Оплата за замовлення #${numericOrderId} з інтернет-магазину BitZone`,
  };

  try {
    const { data } = await roappApi.post(
      `/cashbox/${ROAPP_CASHBOX_ID}/payment`,
      payload
    );

    console.log('[ROAPP][PAYMENT] Створено платіж:', {
      orderId: numericOrderId,
      amount: payload.amount,
      cashboxId: ROAPP_CASHBOX_ID,
      cashflowItemId: ROAPP_CASHFLOW_ITEM_ID,
      roappPaymentId: data?.id,
    });

    return data;
  } catch (err) {
    console.error('[ROAPP][PAYMENT] Помилка при створенні платежу в ROAPP:', {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    });

    // пробрасываем помилку наверх — її вже акуратно обробить контролер
    throw err;
  }
}

module.exports = {
  createRoappPaymentForOrder,
};
