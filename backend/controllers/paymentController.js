// backend/controllers/paymentController.js
// Інтеграція Monobank: створення інвойсу + webhook

const asyncHandler = require('express-async-handler');
const monobankApi = require('../utils/monobankApi');

// Якщо захочеш пізніше дописати інтеграцію з ROAPP по оплаті
// const roappApi = require('../utils/roappApi');

/**
 * POST /api/payments/monobank/invoice
 * Створює інвойс Monobank для конкретного замовлення
 * body: { orderId: number|string, amount: number(в копійках) }
 */
const createMonobankInvoice = asyncHandler(async (req, res) => {
  const { orderId, amount } = req.body;

  if (!orderId || !amount) {
    res.status(400);
    throw new Error('orderId та amount є обовʼязковими полями');
  }

  const amountInt = parseInt(amount, 10);

  if (!Number.isInteger(amountInt) || amountInt <= 0) {
    res.status(400);
    throw new Error('Некоректна сума платежу для Monobank');
  }

  const clientBaseUrl = process.env.BASE_CLIENT_URL || 'https://bitzone.com.ua';

  // Цей reference потім прийде у webhook — по ньому можна знайти замовлення
  const reference = `order-${orderId}`;

  const payload = {
    amount: amountInt, // копійки
    ccy: 980,          // гривня
    merchantPaymInfo: {
      reference,
      destination: `Оплата замовлення #${orderId} на BitZone`,
      // Куди повернути клієнта після оплати/відміни
      redirectUrl: `${clientBaseUrl}/account/orders/${orderId}`,
      successUrl: `${clientBaseUrl}/account/orders/${orderId}?paid=1`,
      failUrl: `${clientBaseUrl}/account/orders/${orderId}?paid=0`,
      // Вебхук для нотифікацій від Monobank (опціонально, але ми його задаємо)
      webHookUrl: process.env.MONOBANK_WEBHOOK_URL,
    },
  };

  try {
    console.log('[MONOBANK] Створюємо інвойс:', payload);

    const { data } = await monobankApi.post('invoice/create', payload);

    console.log('[MONOBANK] Інвойс успішно створено:', data);

    // Зазвичай у відповіді є invoiceId та pageUrl (посилання на оплату)
    return res.json({
      invoiceId: data.invoiceId,
      pageUrl: data.pageUrl,
      raw: data,
    });
  } catch (error) {
    console.error('[MONOBANK] Помилка при створенні інвойсу:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    res.status(500);
    throw new Error('Не вдалося створити платіж в Monobank');
  }
});

/**
 * POST /api/payments/monobank/webhook
 * Вебхук від Monobank — тут можна відмічати оплату замовлення
 * Зараз просто лог, щоб нічого не ламати.
 */
const monobankWebhook = asyncHandler(async (req, res) => {
  const body = req.body;
  console.log('[MONOBANK] Webhook отримано:', JSON.stringify(body, null, 2));

  // TODO: тут можна розібрати body, дістати reference, знайти orderId
  //       та додати комент/статус в ROAPP по цьому замовленню.

  // Приклад:
  // const reference = body?.invoice?.reference || body?.reference;
  // if (reference && reference.startsWith('order-')) {
  //   const orderId = reference.replace('order-', '');
  //   const status = body.status; // наприклад "success", "failure" тощо
  //   await roappApi.post(`orders/${orderId}/comments`, {
  //     text: `Онлайн-оплата Monobank: статус ${status}`,
  //   });
  // }

  res.json({ ok: true });
});

module.exports = {
  createMonobankInvoice,
  monobankWebhook,
};
