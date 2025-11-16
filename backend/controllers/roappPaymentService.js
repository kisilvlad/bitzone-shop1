// backend/controllers/roappPaymentService.js

const roappApi = require('../utils/roappApi');

const ROAPP_CASHBOX_ID = process.env.ROAPP_CASHBOX_ID;       // 360320
const ROAPP_CASHFLOW_ITEM_ID = process.env.ROAPP_CASHFLOW_ITEM_ID; // 2811743
const ROAPP_PAID_STATUS_ID = process.env.ROAPP_PAID_STATUS_ID || null; // опційно

/**
 * Створює платіж у ROAPP, прив'язаний до замовлення.
 *
 * @param {Object} params
 * @param {number|string} params.orderId - ID замовлення в ROAPP (order.id / reference)
 * @param {number} params.amount - сума в гривнях (НЕ в копійках)
 * @param {string} params.description - опис платежу (видно в касі)
 * @param {string} [params.paymentMethod] - спосіб оплати (наприклад "Monobank")
 */
async function createRoappPayment({ orderId, amount, description, paymentMethod = 'Monobank' }) {
  if (!ROAPP_CASHBOX_ID || !ROAPP_CASHFLOW_ITEM_ID) {
    console.error(
      '[ROAPP] Не задані ROAPP_CASHBOX_ID або ROAPP_CASHFLOW_ITEM_ID в .env. ' +
      'Платіж не буде створено.'
    );
    return null;
  }

  const payload = {
    cashbox_id: Number(ROAPP_CASHBOX_ID),
    cashflowitem_id: Number(ROAPP_CASHFLOW_ITEM_ID),
    // Сума в гривнях
    amount: Number(amount.toFixed(2)),
    // 1 — прихід коштів
    type: 1,
    // 980 — UAH
    ccy: 980,
    // Прив'язка до замовлення
    order_id: Number(orderId),
    description: description || `Оплата замовлення №${orderId} через ${paymentMethod}`,
    payment_method: paymentMethod,
  };

  console.log('[ROAPP] Створюємо платіж. Payload:', payload);

  try {
    // Увага: baseURL = https://api.roapp.io/, тому додаємо префікс v1/
    const { data } = await roappApi.post('v1/payments', payload);
    console.log('[ROAPP] Платіж успішно створений:', data);
    return data;
  } catch (error) {
    console.error('[ROAPP] Помилка при створенні платежу:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    return null;
  }
}

/**
 * Опційно: оновлюємо статус замовлення якщо в .env заданий ROAPP_PAID_STATUS_ID
 */
async function markOrderAsPaid(orderId) {
  if (!ROAPP_PAID_STATUS_ID) {
    console.log('[ROAPP] ROAPP_PAID_STATUS_ID не заданий, статус замовлення не змінюємо.');
    return;
  }

  try {
    const payload = { status_id: Number(ROAPP_PAID_STATUS_ID) };
    console.log('[ROAPP] Оновлюємо статус замовлення:', { orderId, payload });

    await roappApi.post(`v1/orders/${orderId}/status`, payload);
    console.log('[ROAPP] Статус замовлення оновлено успішно');
  } catch (error) {
    console.error('[ROAPP] Помилка при зміні статусу замовлення:', {
      orderId,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
  }
}

module.exports = {
  createRoappPayment,
  markOrderAsPaid,
};
