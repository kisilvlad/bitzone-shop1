// backend/controllers/paymentController.js
// Monobank + ROAPP інтеграція

const asyncHandler = require('express-async-handler');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const roappApi = require('../utils/roappApi');

const MONOBANK_API_URL = 'https://api.monobank.ua/api/merchant/invoice/create';
const MONOBANK_TOKEN = process.env.MONOBANK_TOKEN;
const MONOBANK_WEBHOOK_URL = process.env.MONOBANK_WEBHOOK_URL;

// 🔹 1) Створення інвойсу Monobank
// POST /api/payments/monobank/invoice
// body: { orderId, amount }
const createMonobankInvoice = asyncHandler(async (req, res) => {
  const { orderId, amount } = req.body;

  if (!MONOBANK_TOKEN) {
    res.status(500);
    throw new Error('MONOBANK_TOKEN не налаштований у .env');
  }

  if (!orderId || !amount) {
    res.status(400);
    throw new Error('orderId та amount є обовʼязковими для створення інвойсу');
  }

  const reference = `order-${orderId}-${uuidv4()}`;

  const payload = {
    amount: Number(amount), // у копійках!
    ccy: 980,
    merchantPaymInfo: {
      reference,
      destination: `Оплата замовлення #${orderId} в BitZone`,
      comment: 'Онлайн-оплата на bitzone.com.ua',
      // ⬇️ СЮДИ Monobank буде повертати користувача після оплати
      redirectUrl: `https://bitzone.com.ua/cart?paymentStatus=success&orderId=${orderId}`,
      webHookUrl: MONOBANK_WEBHOOK_URL,
    },
  };

  try {
    const { data } = await axios.post(MONOBANK_API_URL, payload, {
      headers: {
        'X-Token': MONOBANK_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    // Monobank повертає pageUrl для редіректу на сторінку оплати
    return res.json({
      invoiceId: data.invoiceId,
      pageUrl: data.pageUrl,
      reference,
    });
  } catch (error) {
    console.error('[MONOBANK] Помилка при створенні інвойсу:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    res.status(500);
    throw new Error('Не вдалося створити інвойс Monobank');
  }
});

// 🔹 2) Webhook від Monobank
// POST /api/payments/monobank/webhook
// Цей URL ти вже вказав у MONOBANK_WEBHOOK_URL
const monobankWebhook = asyncHandler(async (req, res) => {
  const event = req.body;

  console.log('[MONOBANK] Webhook отримано:', JSON.stringify(event, null, 2));

  // Типовий payload Monobank (спрощено):
  // {
  //   "invoiceId": "...",
  //   "status": "success" | "failure" | "expired",
  //   "amount": 12345,
  //   "ccy": 980,
  //   "reference": "order-<orderId>-uuid",
  //   ...
  // }

  const { status, amount, invoiceId, reference } = event || {};

  // Витягаємо orderId з reference: "order-12345-...."
  let orderId = null;
  if (reference && reference.startsWith('order-')) {
    const parts = reference.split('-');
    if (parts[1]) {
      orderId = parts[1];
    }
  }

  if (!orderId) {
    console.warn(
      '[MONOBANK] Не вдалося визначити orderId з reference:',
      reference
    );
    // все одно відповідаємо 200, щоб Mono не ретраїв вічно
    return res.json({ ok: true });
  }

  // Реагуємо тільки на успішну оплату
  if (status === 'success') {
    console.log(
      `[MONOBANK] Успішна оплата для orderId=${orderId}, сума=${amount}`
    );

    // 1) Додаємо коментар в замовлення ROAPP, щоб в замовленні було видно оплату
    try {
      const text = `Онлайн-оплата через Monobank на суму ${
        amount / 100
      } грн. Invoice: ${invoiceId}`;

      await roappApi.post(`orders/${orderId}/comments`, { text });

      console.log(
        `[ROAPP] Додано коментар про оплату до замовлення ${orderId}`
      );
    } catch (err) {
      console.error(
        '[ROAPP] Помилка при створенні коментаря про оплату:',
        {
          orderId,
          status: err.response?.status,
          data: err.response?.data,
          message: err.message,
        }
      );
      // тут не валимо webhook, просто логуємо
    }

    // ⚠️ Якщо потім захочеш, можемо додати ще й Create Payment
    // (вкладка "Рахунки та платежі") через endpoint "Create Payment".
    // Для цього треба буде:
    //  - мати ROAPP_CASHBOX_ID у .env
    //  - один раз зловити текст помилки валідації, щоб докрутити payload.
  }

  // Monobank очікує 200 OK
  res.json({ ok: true });
});

module.exports = {
  createMonobankInvoice,
  monobankWebhook,
};
