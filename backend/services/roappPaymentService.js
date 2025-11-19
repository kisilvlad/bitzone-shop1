// backend/services/roappPaymentService.js
// Сервіс для створення платежів в ROAPP, привʼязаних до замовлення

const roappClient = require('../utils/roappClient');

const CASHBOX_ID = process.env.ROAPP_CASHBOX_ID;
const CASHFLOW_ITEM_ID = process.env.ROAPP_CASHFLOW_ITEM_ID;

/**
 * Створює платіж в ROAPP, привʼязаний до замовлення.
 *
 * @param {Object} params
 * @param {string|number} params.orderId   - номер замовлення в ROAPP
 * @param {number}        params.amount    - сума в гривнях (НЕ в копійках!)
 * @param {string}        [params.description] - опис платежу
 *
 * ПРИМІТКА:
 *  - direction: 0 => дохід (Income)
 *  - cashflow_item_id: id категорії руху коштів (з /cashflowitems)
 *  - reference: можемо передати номер замовлення (для зручного пошуку)
 *  - order_id: пробуємо явно привʼязати до замовлення (якщо поле підтримується)
 */
async function createRoappPaymentForOrder({ orderId, amount, description }) {
  if (!CASHBOX_ID || !CASHFLOW_ITEM_ID) {
    console.warn('[ROAPP][PAYMENT] Не заповнені ROAPP_CASHBOX_ID або ROAPP_CASHFLOW_ITEM_ID в .env');
    return null;
  }

  if (!orderId) {
    console.warn('[ROAPP][PAYMENT] Не передано orderId для створення платежу');
    return null;
  }

  if (!amount || Number.isNaN(Number(amount))) {
    console.warn('[ROAPP][PAYMENT] Некоректна сума для платежу в ROAPP:', amount);
    return null;
  }

  const orderIdStr = String(orderId);
  const amountNumber = Number(amount);

  const endpoint = `/cashbox/${CASHBOX_ID}/payment`;

  // ⚙️ Формуємо payload згідно з логікою ROAPP Payments
  const payload = {
    // сума в гривнях (з копійками як 0.99, 499.5 тощо)
    amount: amountNumber,
    // 0 - Income; 1 - Expense
    direction: 0,
    // категорія руху коштів (з /cashflowitems)
    cashflow_item_id: Number(CASHFLOW_ITEM_ID),
    // текстовий опис для каси
    comment:
      description ||
      `Оплата замовлення №${orderIdStr} через Monobank`,
    // зручно мати reference = номер замовлення
    reference: orderIdStr,

    // 🧷 Спроба жорстко привʼязати до замовлення (якщо бек ROAPP це підтримує)
    order_id: Number(orderIdStr),
  };

  console.log('[ROAPP][PAYMENT] Створюємо оплату в ROAPP:', {
    endpoint,
    payload,
  });

  try {
    const response = await roappClient.post(endpoint, payload);

    // Логуємо ВСЕ, що повернув ROAPP
    console.log('[ROAPP][PAYMENT] Відповідь від ROAPP:', {
      status: response.status,
      data: response.data,
    });

    // Повертаємо те, що дав ROAPP, щоб контролер міг витягнути id
    return response.data || null;
  } catch (err) {
    console.error('[ROAPP][PAYMENT] Помилка при створенні платежу в ROAPP:', {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    });
    throw err;
  }
}

module.exports = {
  createRoappPaymentForOrder,
};
