// backend/controllers/paymentController.js
// Інтеграція з Monobank + (далі можна додати оновлення ROAPP при оплаті)

const axios = require('axios');
const asyncHandler = require('express-async-handler');
const roappApi = require('../utils/roappApi'); // якщо ROAPP ще не треба – можна тимчасово прибрати

const MONOBANK_API_URL = 'https://api.monobank.ua/api/merchant/invoice/create';
const MONOBANK_TOKEN = process.env.MONOBANK_TOKEN;

// URL, куди банк повертає користувача після оплати
const MONOBANK_RETURN_URL =
  process.env.MONOBANK_RETURN_URL || 'https://bitzone.com.ua/';

// Вебхук, який ти вказав у кабінеті Monobank
const MONOBANK_WEBHOOK_URL = process.env.MONOBANK_WEBHOOK_URL || null;

/**
 * POST /api/payments/monobank/invoice
 * Тіло: { orderId, amount }
 * Створює інвойс в Monobank і повертає посилання на сторінку оплати
 */
const createMonobankInvoice = asyncHandler(async (req, res) => {
  const { orderId, amount } = req.body;

  if (!MONOBANK_TOKEN) {
    console.error('[MONOBANK] MONOBANK_TOKEN не заданий у .env');
    res.status(500);
    throw new Error('Payment server is not configured (MONOBANK_TOKEN missing)');
  }

  if (!orderId || !amount) {
    res.status(400);
    throw new Error('orderId та amount є обовʼязковими');
  }

  // Monobank очікує суму у копійках (integer)
  const intAmount = parseInt(amount, 10);
  if (!Number.isFinite(intAmount) || intAmount <= 0) {
    res.status(400);
    throw new Error('Некоректна сума платежу');
  }

  const invoicePayload = {
    amount: intAmount,
    ccy: 980, // UAH
    merchantPaymInfo: {
      reference: String(orderId), // ми будемо по цьому id шукати замовлення/ROAPP
      destination: `Оплата замовлення №${orderId} в BitZone`,
      comment: `BitZone: оплата замовлення №${orderId}`,
      basketOrder: [],
    },
    redirectUrl: `${MONOBANK_RETURN_URL}payment-success?orderId=${orderId}`,
    webHookUrl: MONOBANK_WEBHOOK_URL || undefined,
  };

  try {
    const { data } = await axios.post(MONOBANK_API_URL, invoicePayload, {
      headers: {
        'X-Token': MONOBANK_TOKEN,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    console.log('[MONOBANK] Інвойс створено:', data);

    // Найважливіше для фронта — посилання на оплату
    res.json({
      success: true,
      invoiceId: data.invoiceId || data.invoice_id,
      pageUrl: data.pageUrl || data.page_url || data.url,
      data,
    });
  } catch (error) {
    console.error('[MONOBANK] Помилка створення інвойсу:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    res.status(500);
    throw new Error('Не вдалося створити платіж у Monobank');
  }
});

/**
 * POST /api/payments/monobank/webhook
 * Monobank викликає цей URL при зміні статусу платежу
 * Тут можна:
 *  - перевірити підпис (якщо налаштуєш)
 *  - знайти замовлення по reference
 *  - створити платіж/рахунок у ROAPP
 */
const handleMonobankWebhook = asyncHandler(async (req, res) => {
  const payload = req.body;
  console.log('[MONOBANK] Вебхук:', JSON.stringify(payload, null, 2));

  try {
    const reference =
      payload?.paymentInfo?.reference ||
      payload?.invoice?.reference ||
      payload?.merchantPaymInfo?.reference;

    const status =
      payload?.status ||
      payload?.invoice?.status ||
      payload?.paymentInfo?.status;

    const amount =
      payload?.amount ||
      payload?.paymentInfo?.amount ||
      payload?.invoice?.amount;

    console.log('[MONOBANK] Розібраний вебхук:', { reference, status, amount });

    // TODO: тут можна:
    // 1) знайти замовлення в ROAPP по reference (якщо використовуєш id ROAPP-замовлення)
    // 2) створити "оплату" у ROAPP / привʼязати рахунок
    // 3) змінити статус замовлення в ROAPP

    // Поки просто відповідаємо OK, щоб Monobank не повторював вебхук
    res.json({ ok: true });
  } catch (err) {
    console.error('[MONOBANK] Помилка обробки вебхука:', err);
    res.status(500).json({ ok: false });
  }
});

module.exports = {
  createMonobankInvoice,
  handleMonobankWebhook,
};
