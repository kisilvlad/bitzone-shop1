// backend/controllers/paymentController.js
// Контролер для роботи з оплатою через Monobank + створення платежу в ROAPP

const asyncHandler = require('express-async-handler');
const monobankApi = require('../utils/monobankApi');
const { createRoappPaymentForOrder } = require('../services/roappPaymentService');

// -----------------------------
// Внутрішнє сховище стану оплат
// -----------------------------
/**
 * monobankInvoices:
 *   key: orderId (string)
 *   value: {
 *     orderId: string | number,
 *     invoiceId: string,
 *     amount: number,           // у копійках
 *     ccy: number,              // ISO 4217, зазвичай 980
 *     status: string,           // created | success | fail | expired | ...
 *     roappPaymentCreated: boolean,
 *     lastUpdate: Date,
 *   }
 */
const monobankInvoices = new Map();

/**
 * Допоміжна функція: гарантує, що для переданого запису буде створено оплату в ROAPP.
 * Викликається як із webhook, так і з ручної перевірки статусу.
 */
async function ensureRoappPaymentForEntry(entry) {
  if (!entry) return null;

  if (entry.status !== 'success') {
    return null;
  }

  if (entry.roappPaymentCreated) {
    return null;
  }

  const amountInUAH = entry.amount ? entry.amount / 100 : null;

  if (!amountInUAH) {
    console.warn(
      '[MONO→ROAPP] Не вдалось обчислити суму в грн для створення платежу в ROAPP:',
      entry
    );
    return null;
  }

  try {
    const roappResult = await createRoappPaymentForOrder({
      orderId: entry.orderId,
      amount: amountInUAH,
      description: `Оплата через Monobank, invoiceId ${entry.invoiceId}`,
    });

    entry.roappPaymentCreated = true;
    entry.lastUpdate = new Date();

    console.log('[MONO→ROAPP] Створено оплату в ROAPP:', {
      orderId: entry.orderId,
      amountInUAH,
      roappPaymentId: roappResult?.id,
    });

    return roappResult;
  } catch (err) {
    console.error('[MONO→ROAPP] Помилка при створенні платежу в ROAPP:', {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    });
    // помилку не пробрасываем наверх, щоб не зламати основний сценарій
    return null;
  }
}

// --------------------------------------------------
// 1. Створення рахунку (інвойсу) в Monobank
//    POST /api/payments/monobank/invoice
//    body: { orderId, amount }  (amount у копійках)
// --------------------------------------------------
const createMonobankInvoice = asyncHandler(async (req, res) => {
  const { orderId, amount } = req.body;

  if (!orderId || !amount) {
    return res.status(400).json({
      ok: false,
      message: 'Потрібно передати orderId та amount (в копійках).',
    });
  }

  const orderIdStr = String(orderId);

  const FRONTEND_URL = process.env.FRONTEND_URL || 'https://bitzone.com.ua';
  const BACKEND_PUBLIC_URL =
    process.env.BACKEND_PUBLIC_URL || process.env.API_PUBLIC_URL || '';

  const baseRedirectUrl = `${FRONTEND_URL.replace(/\/$/, '')}/payment-result`;

  // Користувача все одно буде переадресовано на redirectUrl,
  // а successUrl / failUrl просто зручні, якщо ти захочеш їх обробляти окремо.
  const redirectUrl = `${baseRedirectUrl}?orderId=${encodeURIComponent(
    orderIdStr
  )}`;
  const successUrl = `${baseRedirectUrl}?orderId=${encodeURIComponent(
    orderIdStr
  )}&status=success`;
  const failUrl = `${baseRedirectUrl}?orderId=${encodeURIComponent(
    orderIdStr
  )}&status=fail`;

  const webHookUrl = BACKEND_PUBLIC_URL
    ? `${BACKEND_PUBLIC_URL.replace(/\/$/, '')}/api/payments/monobank/webhook`
    : undefined;

  try {
    const payload = {
      amount, // вже у копійках
      ccy: 980,
      merchantPaymInfo: {
        redirectUrl,
        successUrl,
        failUrl,
        ...(webHookUrl ? { webHookUrl } : {}),
      },
    };

    const { data } = await monobankApi.post('invoice/create', payload);

    if (!data || !data.invoiceId || !data.pageUrl) {
      console.error(
        '[MONOBANK] Неочікувана відповідь при створенні інвойсу:',
        data
      );
      return res.status(502).json({
        ok: false,
        message: 'Monobank повернув неочікувану відповідь при створенні інвойсу.',
      });
    }

    monobankInvoices.set(orderIdStr, {
      orderId: orderIdStr,
      invoiceId: data.invoiceId,
      amount,
      ccy: 980,
      status: 'created',
      roappPaymentCreated: false,
      lastUpdate: new Date(),
    });

    console.log('[MONOBANK] Створено інвойс:', {
      orderId: orderIdStr,
      invoiceId: data.invoiceId,
      pageUrl: data.pageUrl,
      amount,
    });

    return res.json({
      ok: true,
      invoiceId: data.invoiceId,
      pageUrl: data.pageUrl,
    });
  } catch (err) {
    console.error('[MONOBANK] Помилка при створенні інвойсу:', {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    });

    return res.status(502).json({
      ok: false,
      message: 'Не вдалося створити рахунок в Monobank.',
    });
  }
});

// --------------------------------------------------
// 2. Webhook від Monobank
//    POST /api/payments/monobank/webhook
//    Monobank шле тіло такого ж формату, як і відповідь invoice/status
// --------------------------------------------------
const monobankWebhook = asyncHandler(async (req, res) => {
  try {
    const payload = req.body;

    console.log('[MONOBANK][WEBHOOK] Отримано webhook:', payload);

    const invoiceId = payload?.invoiceId;
    const status = payload?.status;
    const amount = payload?.amount;
    const ccy = payload?.ccy;

    if (!invoiceId || !status) {
      console.warn(
        '[MONOBANK][WEBHOOK] В тілі webhook немає invoiceId або status.'
      );
      return res.json({ ok: true });
    }

    // шукаємо запис по orderId, у якого такий invoiceId
    let entry = null;
    let entryKey = null;

    for (const [key, value] of monobankInvoices.entries()) {
      if (value.invoiceId === invoiceId) {
        entry = value;
        entryKey = key;
        break;
      }
    }

    if (!entry) {
      console.warn(
        '[MONOBANK][WEBHOOK] Не знайшов запис по цьому invoiceId у локальному кеші:',
        invoiceId
      );
      // створимо "мінімальний" запис, щоб далі його міг прочитати /status
      entry = {
        orderId: null,
        invoiceId,
        amount: amount ?? null,
        ccy: ccy ?? 980,
        status,
        roappPaymentCreated: false,
        lastUpdate: new Date(),
      };
      entryKey = `invoice:${invoiceId}`;
      monobankInvoices.set(entryKey, entry);
    } else {
      entry.status = status;
      if (typeof amount === 'number') {
        entry.amount = amount;
      }
      if (typeof ccy === 'number') {
        entry.ccy = ccy;
      }
      entry.lastUpdate = new Date();

      monobankInvoices.set(entryKey, entry);
    }

    // якщо платіж успішний — пробуємо створити платіж у ROAPP
    if (entry.orderId && status === 'success') {
      await ensureRoappPaymentForEntry(entry);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[MONOBANK][WEBHOOK] Помилка обробки webhook:', {
      message: err.message,
    });
    // все одно повертаємо 200, щоб Monobank не ретраїв безкінечно
    res.json({ ok: true });
  }
});

// --------------------------------------------------
// 3. Перевірка статусу рахунку для фронтенда
//    GET /api/payments/monobank/status?orderId=123
//    Відповідь: { ok, paid, status, amount, ccy, invoiceId }
//    + при статусі success намагаємося створити платіж у ROAPP
// --------------------------------------------------
const getMonobankPaymentStatus = asyncHandler(async (req, res) => {
  const orderId = req.query.orderId;

  if (!orderId) {
    return res.status(400).json({
      ok: false,
      message: 'Не передано orderId.',
    });
  }

  const orderIdStr = String(orderId);
  let entry = monobankInvoices.get(orderIdStr);

  // якщо ще немає запису — можливо, сервер рестартнувся,
  // спробуємо напряму сходити в Monobank, якщо відомий invoiceId в query
  const directInvoiceId = req.query.invoiceId;

  try {
    if (!entry && directInvoiceId) {
      const { data } = await monobankApi.get('invoice/status', {
        params: { invoiceId: directInvoiceId },
      });

      entry = {
        orderId: orderIdStr,
        invoiceId: data.invoiceId || directInvoiceId,
        amount: data.amount,
        ccy: data.ccy || 980,
        status: data.status,
        roappPaymentCreated: false,
        lastUpdate: new Date(),
      };

      monobankInvoices.set(orderIdStr, entry);
    }

    if (!entry) {
      return res.json({
        ok: true,
        paid: false,
        status: 'not_found',
        amount: null,
        ccy: 980,
        invoiceId: null,
      });
    }

    // Якщо статус ще не success — можна додатково пересинхронізувати з Monobank
    if (entry.status !== 'success' && entry.invoiceId) {
      try {
        const { data } = await monobankApi.get('invoice/status', {
          params: { invoiceId: entry.invoiceId },
        });

        entry.status = data.status;
        if (typeof data.amount === 'number') {
          entry.amount = data.amount;
        }
        if (typeof data.ccy === 'number') {
          entry.ccy = data.ccy;
        }
        entry.lastUpdate = new Date();

        monobankInvoices.set(orderIdStr, entry);
      } catch (statusErr) {
        console.warn(
          '[MONOBANK] Не вдалося оновити статус інвойсу з Monobank:',
          statusErr.message
        );
      }
    }

    // Якщо платіж успішний — гарантуємо створення платежу в ROAPP
    let roappResult = null;
    if (entry.status === 'success') {
      roappResult = await ensureRoappPaymentForEntry(entry);
    }

    return res.json({
      ok: true,
      paid: entry.status === 'success',
      status: entry.status,
      amount: entry.amount,
      ccy: entry.ccy,
      invoiceId: entry.invoiceId,
      roappPaymentCreated: !!entry.roappPaymentCreated,
      roappPayment: roappResult || null,
    });
  } catch (err) {
    console.error('[MONOBANK] Помилка при перевірці статусу інвойсу:', {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    });

    return res.status(502).json({
      ok: false,
      message: 'Платіжний сервіс тимчасово недоступний.',
    });
  }
});

module.exports = {
  createMonobankInvoice,
  monobankWebhook,
  getMonobankPaymentStatus,
};
