// backend/controllers/paymentController.js

const axios = require('axios');
const asyncHandler = require('express-async-handler');
const roappApi = require('../utils/roappApi');

const MONOBANK_TOKEN = process.env.MONOBANK_TOKEN;
const MONOBANK_API_BASE = 'https://api.monobank.ua/api/merchant';

// ROAPP payment settings (із .env)
const ROAPP_PAYMENT_CASHBOX_ID = process.env.ROAPP_PAYMENT_CASHBOX_ID;
const ROAPP_PAYMENT_CASHFLOWITEM_ID = process.env.ROAPP_PAYMENT_CASHFLOWITEM_ID;

// ================== SANITY CHECKS ==================

if (!MONOBANK_TOKEN) {
  console.warn(
    '[MONOBANK] Увага: MONOBANK_TOKEN не налаштований в .env. ' +
      'Оплата карткою працювати не буде.'
  );
}

if (!ROAPP_PAYMENT_CASHBOX_ID || !ROAPP_PAYMENT_CASHFLOWITEM_ID) {
  console.warn(
    '[ROAPP] Увага: ROAPP_PAYMENT_CASHBOX_ID або ROAPP_PAYMENT_CASHFLOWITEM_ID не налаштовані в .env. ' +
      'Автоматичне створення платежів у ROAPP працювати не буде.'
  );
}

// ================== HELPER: створення платежу в ROAPP ==================

/**
 * Створює платіж у ROAPP, який буде видно у вкладці
 * "Рахунки та платежі" в замовленні.
 *
 * @param {Object} params
 * @param {string|number} params.orderId - ID замовлення в ROAPP
 * @param {number} params.amount - сума платежу (в гривнях, НЕ в копійках)
 * @param {number} params.ccy - код валюти (наприклад, 980 для UAH)
 * @param {number} params.timestampSec - unix timestamp (секунди) з Monobank
 */
async function createRoappPaymentForOrder({
  orderId,
  amount,
  ccy,
  timestampSec,
}) {
  if (!ROAPP_PAYMENT_CASHBOX_ID || !ROAPP_PAYMENT_CASHFLOWITEM_ID) {
    console.warn(
      '[ROAPP] Не задані ROAPP_PAYMENT_CASHBOX_ID або ROAPP_PAYMENT_CASHFLOWITEM_ID, платіж не буде створено.'
    );
    return;
  }

  try {
    const paymentDate = timestampSec
      ? new Date(timestampSec * 1000)
      : new Date();

    const isoDate = paymentDate.toISOString().slice(0, 10); // YYYY-MM-DD

    const payload = {
      // тип операції: дохід
      type: 'income',

      // з якої каси
      cashbox_id: Number(ROAPP_PAYMENT_CASHBOX_ID),

      // стаття руху коштів – "Оплата клієнтом послуги, товару"
      cashflowitem_id: Number(ROAPP_PAYMENT_CASHFLOWITEM_ID),

      // сума платежу (в гривнях)
      amount: Number(amount),

      // код валюти (Monobank повертає 980 для UAH)
      currency: ccy || 980,

      // дата операції
      payment_date: isoDate,

      // прив'язка до замовлення
      order_id: Number(orderId),

      // опис
      description: `Оплата замовлення №${orderId} через Monobank`,

      // одразу затверджуємо платіж
      is_approved: true,
    };

    console.log('[ROAPP] Створюємо платіж для замовлення:', payload);

    const { data } = await roappApi.post('/v1/payments', payload);

    console.log('[ROAPP] Платіж успішно створено:', data);
  } catch (err) {
    console.error('[ROAPP] Помилка при створенні платежу:', {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    });
  }
}

// ================== MONOBANK: створення інвойсу ==================

/**
 * POST /api/payments/monobank/invoice
 * Створюємо інвойс Monobank під конкретне замовлення.
 * Очікуємо body: { orderId, amount } (amount у копійках).
 */
const createMonobankInvoice = asyncHandler(async (req, res) => {
  const { orderId, amount } = req.body;

  if (!orderId || !amount) {
    return res.status(400).json({
      message: 'Необхідні параметри: orderId та amount (у копійках).',
    });
  }

  if (!MONOBANK_TOKEN) {
    return res.status(500).json({
      message: 'Платіжний сервіс тимчасово недоступний.',
    });
  }

  const redirectUrl = `https://bitzone.com.ua/payment-result?orderId=${orderId}`;
  const webHookUrl = `https://bitzone.com.ua/api/payments/monobank/webhook`;

  const payload = {
    amount: Number(amount),
    ccy: 980, // UAH
    merchantPaymInfo: {
      reference: String(orderId), // це будемо шукати у виписці (statement)
      destination: `Оплата замовлення №${orderId} на BitZone`,
      comment: `Оплата замовлення №${orderId} на BitZone`,
    },
    redirectUrl,
    webHookUrl,
  };

  console.log('[MONOBANK] Створюємо інвойс. Payload:', payload);

  try {
    const { data } = await axios.post(
      `${MONOBANK_API_BASE}/invoice/create`,
      payload,
      {
        headers: {
          'X-Token': MONOBANK_TOKEN,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('[MONOBANK] Інвойс створено:', data);

    return res.status(201).json({
      invoiceId: data.invoiceId,
      pageUrl: data.pageUrl,
    });
  } catch (err) {
    console.error('[MONOBANK] Помилка при створенні інвойсу:', {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    });

    return res.status(500).json({
      message:
        'Не вдалося створити платіж. Спробуйте ще раз або виберіть інший спосіб оплати.',
    });
  }
});

// ================== MONOBANK: webhook ==================

/**
 * POST /api/payments/monobank/webhook
 * Webhook від Monobank (успішний/неуспішний платіж, reversals тощо).
 * Зараз — просто лог, логіку можемо розширити пізніше.
 */
const monobankWebhook = asyncHandler(async (req, res) => {
  try {
    console.log('[MONOBANK][WEBHOOK] Отримано webhook:', req.body);

    // Тут при бажанні теж можна викликати createRoappPaymentForOrder(...)
    // якщо webhook міститиме достатньо інформації (invoiceId, reference тощо).

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[MONOBANK][WEBHOOK] Помилка обробки webhook:', err);
    res.status(500).json({ ok: false });
  }
});

// ================== MONOBANK: перевірка оплати ==================

/**
 * GET /api/payments/monobank/status?orderId=XXXX
 *
 * 1. Тягнемо statement Monobank за останні 3 дні.
 * 2. Шукаємо транзакцію, де `reference === orderId`.
 * 3. Якщо `status === 'success'`:
 *    - повертаємо на фронт paid: true
 *    - створюємо платіж у ROAPP.
 */
const getMonobankPaymentStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.query;

  if (!orderId) {
    return res.status(400).json({ message: 'Не передано orderId.' });
  }

  if (!MONOBANK_TOKEN) {
    console.error('[MONOBANK] MONOBANK_TOKEN не налаштовано в .env');
    return res
      .status(500)
      .json({ message: 'Платіжний сервіс тимчасово недоступний.' });
  }

  try {
    const nowSec = Math.floor(Date.now() / 1000);
    const fromSec = nowSec - 3 * 24 * 60 * 60; // останні 3 дні з запасом

    console.log(
      '[MONOBANK] Перевірка оплати по orderId (reference):',
      orderId,
      {
        from: fromSec,
        to: nowSec,
      }
    );

    const { data } = await axios.get(`${MONOBANK_API_BASE}/statement`, {
      headers: {
        'X-Token': MONOBANK_TOKEN,
      },
      params: {
        from: fromSec,
        to: nowSec,
      },
    });

    const list = Array.isArray(data?.list) ? data.list : [];

    // шукаємо всі транзакції з reference == orderId
    const related = list.filter(
      (tx) => String(tx.reference) === String(orderId)
    );

    if (!related.length) {
      console.log(
        '[MONOBANK] Не знайдено платежу з reference = orderId:',
        orderId
      );
      return res.json({
        ok: true,
        paid: false,
        status: 'not_found',
      });
    }

    // беремо останню транзакцію по часу
    const payment = related[related.length - 1];
    const isSuccess = payment.status === 'success';

    console.log('[MONOBANK] Знайдено платіж:', payment);

    // Якщо платіж успішний — створюємо платіж у ROAPP
    if (isSuccess) {
      try {
        // Monobank повертає amount у копійках → переводимо в гривні
        const amountUAH = payment.amount / 100;

        await createRoappPaymentForOrder({
          orderId,
          amount: amountUAH,
          ccy: payment.ccy,
          timestampSec: payment.date,
        });
      } catch (roErr) {
        console.error(
          '[ROAPP] Помилка при створенні платежу після успішної оплати Monobank:',
          roErr
        );
      }
    }

    return res.json({
      ok: true,
      paid: isSuccess,
      status: payment.status, // success / reversed / processing / fail ...
      amount: payment.amount,
      ccy: payment.ccy,
      invoiceId: payment.invoiceId,
      maskedPan: payment.maskedPan,
      date: payment.date,
    });
  } catch (err) {
    console.error(
      '[MONOBANK] Помилка при перевірці оплати через statement:',
      {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      }
    );

    return res.status(500).json({
      message: 'Не вдалося перевірити оплату. Спробуйте ще раз пізніше.',
    });
  }
});

// ================== EXPORTS ==================

module.exports = {
  createMonobankInvoice,
  monobankWebhook,
  getMonobankPaymentStatus,
};
