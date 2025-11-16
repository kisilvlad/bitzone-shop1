// backend/controllers/paymentController.js

const axios = require('axios');
const asyncHandler = require('express-async-handler');
const roappApi = require('../utils/roappApi');

const { createRoappPayment, markOrderAsPaid } = require('./roappPaymentService');

const MONOBANK_TOKEN = process.env.MONOBANK_TOKEN;
const MONOBANK_API_BASE = 'https://api.monobank.ua/api/merchant';

// ⛔ На всякий випадок — щоб відразу бачити, якщо токен не підтягується
if (!MONOBANK_TOKEN) {
  console.warn(
    '[MONOBANK] Увага: MONOBANK_TOKEN не налаштований в .env. ' +
      'Оплата карткою працювати не буде.'
  );
}

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
      reference: String(orderId), // це будемо шукати у виписці (statement) і бачити в webhook
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

/**
 * POST /api/payments/monobank/webhook
 * Webhook від Monobank (успішний/неуспішний платіж).
 * Тут:
 *  - читаємо статус
 *  - дістаємо reference (це наш orderId в ROAPP)
 *  - створюємо коментар до замовлення в ROAPP
 *  - створюємо платіж у ROAPP (каса)
 *  - опційно — міняємо статус замовлення на "Оплачено"
 */
const monobankWebhook = asyncHandler(async (req, res) => {
  try {
    const body = req.body || {};
    console.log('[MONOBANK][WEBHOOK] Отримано webhook:', body);

    // Підстрахуємося на різні варіанти структури
    const invoiceId = body.invoiceId || body.invoice?.invoiceId || null;
    const status = body.status || body.invoice?.status || null;
    const reference =
      body.reference || body.invoice?.reference || body.orderId || null;
    const amountCents = body.amount || body.invoice?.amount || 0;
    const ccy = body.ccy || body.invoice?.ccy || 980;

    console.log('[MONOBANK][WEBHOOK] Розібрана подія:', {
      invoiceId,
      status,
      reference,
      amountCents,
      ccy,
    });

    // Цікавить тільки успішна оплата
    if (status !== 'success' && status !== 'hold') {
      console.log(
        '[MONOBANK][WEBHOOK] Статус не success/hold, нічого не робимо.'
      );
      return res.status(200).json({ ok: true });
    }

    const orderId = Number(reference);
    if (!orderId) {
      console.warn(
        '[MONOBANK][WEBHOOK] Не вдалося отримати orderId з reference:',
        reference
      );
      return res.status(200).json({ ok: true });
    }

    const amount = amountCents / 100;

    // ✅ 1) Коментар до замовлення в ROAPP
    try {
      const commentText = `Оплата через Monobank: ${amount.toFixed(
        2
      )} грн. Invoice ID: ${invoiceId || '—'}`;

      console.log('[ROAPP] Додаємо коментар до замовлення:', {
        orderId,
        commentText,
      });

      await roappApi.post(`v1/orders/${orderId}/comments`, {
        comment: commentText,
      });

      console.log('[ROAPP] Коментар успішно додано до замовлення', orderId);
    } catch (commentErr) {
      console.error('[ROAPP] Не вдалося створити коментар до замовлення:', {
        orderId,
        status: commentErr.response?.status,
        data: commentErr.response?.data,
        message: commentErr.message,
      });
    }

    // ✅ 2) Створюємо платіж у ROAPP в касі
    await createRoappPayment({
      orderId,
      amount,
      description: `Оплата замовлення №${orderId} через Monobank`,
      paymentMethod: 'Monobank',
    });

    // ✅ 3) (опційно) змінюємо статус замовлення на "Оплачено", якщо ROAPP_PAID_STATUS_ID заданий
    await markOrderAsPaid(orderId);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[MONOBANK][WEBHOOK] Помилка обробки webhook:', {
      message: err.message,
      stack: err.stack,
    });
    // Відповідаємо 200, щоб Monobank не почав ретраїти безкінечно
    return res.status(200).json({ ok: true });
  }
});

/**
 * GET /api/payments/monobank/status?orderId=XXXX
 *
 * Перевіряємо оплату через виписку Monobank (statement) по полю "reference",
 * яке ми задаємо = orderId при створенні інвойсу.
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

    console.log('[MONOBANK] Перевірка оплати по orderId (reference):', orderId, {
      from: fromSec,
      to: nowSec,
    });

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
    console.error('[MONOBANK] Помилка при перевірці оплати через statement:', {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    });

    return res.status(500).json({
      message: 'Не вдалося перевірити оплату. Спробуйте ще раз пізніше.',
    });
  }
});

module.exports = {
  createMonobankInvoice,
  monobankWebhook,
  getMonobankPaymentStatus,
};
