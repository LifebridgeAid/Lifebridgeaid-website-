// Netlify Function — creates a Stripe Checkout Session for a custom donation amount.
// No external dependencies (uses the built-in fetch available on Netlify's Node runtime),
// so it works with a plain drag-and-drop deploy — no "npm install" step required.

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { amount } = JSON.parse(event.body || '{}');
    const amountCents = Math.round(parseFloat(amount) * 100);

    if (!amountCents || amountCents < 200) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Minimum donation is $2.' })
      };
    }

    const siteUrl = process.env.URL || 'https://lifebridgeaidinc.org';

    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('success_url', siteUrl + '/?donation=success');
    params.append('cancel_url', siteUrl + '/');
    params.append('line_items[0][price_data][currency]', 'usd');
    params.append('line_items[0][price_data][product_data][name]', 'Donation to LifeBridge Aid');
    params.append('line_items[0][price_data][unit_amount]', String(amountCents));
    params.append('line_items[0][quantity]', '1');

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.STRIPE_SECRET_KEY,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const session = await stripeRes.json();

    if (!stripeRes.ok) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: (session.error && session.error.message) || 'Stripe error' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
