// backend/controllers/paymentController.js
const asyncHandler = require('express-async-handler');
const axios = require('axios');
const crypto = require('crypto');

const MONOBANK_TOKEN = process.env.MONOBANK_TOKEN;
const MONOBANK_WEBHOOK_URL = process.env.MONOBANK_WEBHOOK_URL;

if (!MONOBANK_TOKEN) {
  console.warn('[MONOBANK] ⚠️ MONOBANK_TOKEN не заданий у .env');
}

/**
 * Створення інвойсу Monobank
 * POST /api/payments/monobank/invoice
 * body: { amount (копійки), orderId }
 */
const createMonobankInvoice = asyncHandler(async (req, res) => {
  const { amount, orderId } = req.body;

  if (!amount || !orderId) {
    res.status(400);
    throw new Error('Потрібні amount та orderId для створення інвойсу');
  }

  // URL, куди Monobank поверне клієнта після оплати/відміни
  // Monobank додасть до нього ?invoiceId=...
  const redirectUrl = `https://bitzone.com.ua/payment-result?orderId=${encodeURIComponent(
    orderId
  )}`;

  const payload = {
    amount,              // в копійках
    ccy: 980,            // UAH
    merchantPaymInfo: {
      reference: String(orderId),
      destination: `Оплата замовлення №${orderId} на BitZone`,
      comment: `Оплата замовлення №${orderId} на BitZone`,
    },
    redirectUrl,
    webHookUrl: MONOBANK_WEBHOOK_URL,
  };

  console.log('[MONOBANK] Створюємо інвойс. Payload:', payload);

  const { data } = await axios.post(
    'https://api.monobank.ua/api/merchant/invoice/create',
    payload,
    {
      headers: {
        'X-Token': MONOBANK_TOKEN,
        'Content-Type': 'application/json',
      },
    }
  );

  console.log('[MONOBANK] Інвойс створено:', data);

  res.json({
    invoiceId: data.invoiceId,
    pageUrl: data.pageUrl,
    redirectUrl,
  });
});

/**
 * Перевірка статусу інвойсу
 * GET /api/payments/monobank/status?invoiceId=...
 */
const getMonobankInvoiceStatus = asyncHandler(async (req, res) => {
  const { invoiceId } = req.query;

  if (!invoiceId) {
    res.status(400);
    throw new Error('invoiceId є обовʼязковим параметром');
  }

  console.log('[MONOBANK] Перевіряємо статус інвойсу:', invoiceId);

  const { data } = await axios.post(
    'https://api.monobank.ua/api/merchant/invoice/status',
    { invoiceId },
    {
      headers: {
        'X-Token': MONOBANK_TOKEN,
        'Content-Type': 'application/json',
      },
    }
  );

  // Очікувані статуси: created | processing | hold | success | failure | reversed | expired
  const status = data.status;
  const isSuccess = status === 'success' || status === 'hold';

  console.log('[MONOBANK] Статус інвойсу:', { invoiceId, status });

  res.json({
    status,
    isSuccess,
    data,
  });
});

/**
 * Webhook від Monobank
 * POST /api/payments/monobank-webhook
 * На цьому етапі просто лог, трохи пізніше тут будемо:
 *   - відмічати замовлення як оплачене
 *   - створювати платіж у ROAPP
 */
const monobankWebhook = asyncHandler(async (req, res) => {
  const rawBody = JSON.stringify(req.body);
  const signature = req.header('X-Signature');

  console.log('[MONOBANK][WEBHOOK] Отримано payload:', req.body);

  // Якщо захочеш — тут можна валідувати підпис (HMAC) згідно з докою Monobank.
  // Зараз — просто приймаємо та логуємо.

  const event = req.body;

  // TODO: тут пізніше:
  // 1) знайти замовлення по event.invoiceId / reference
  // 2) якщо event.status === 'success', помітити як оплачене
  // 3) створити оплату у ROAPP

  res.json({ ok: true });
});

module.exports = {
  createMonobankInvoice,
  getMonobankInvoiceStatus,
  monobankWebhook,
};
