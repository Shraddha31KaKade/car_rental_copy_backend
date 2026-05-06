const Razorpay = require("razorpay");
const crypto = require("crypto");
const prisma = require("../config/prisma");
const { createEscrowRecord } = require("../services/marketplaceService");

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.createRazorpayOrder = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await prisma.booking.findUnique({
      where: { id: Number(bookingId) },
      include: { car: true },
    });

    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.status !== "APPROVED" && booking.status !== "PAYMENT_PENDING") {
      return res.status(400).json({ error: "Booking is not ready for payment" });
    }

    const options = {
      amount: Math.round(booking.totalAmount * 100), // amount in the smallest currency unit (paise)
      currency: "INR",
      receipt: `receipt_booking_${booking.id}`,
    };

    const order = await razorpayInstance.orders.create(options);

    if (booking.status === "APPROVED") {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: "PAYMENT_PENDING" },
      });
    }

    res.json({
      orderId: order.id,
      amount: options.amount,
      currency: options.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("RAZORPAY ORDER ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      // Payment is verified
      const booking = await prisma.booking.findUnique({ where: { id: Number(bookingId) } });
      if (booking && booking.status === "PAYMENT_PENDING") {
        // Flow 1: Escrow record created immediately after signature verification, BEFORE booking update
        await createEscrowRecord(Number(bookingId), booking.totalAmount);

        await prisma.booking.update({
          where: { id: Number(bookingId) },
          data: { status: "CONFIRMED", paymentId: razorpay_payment_id },
        });
      }
      res.json({ success: true, message: "Payment verified successfully" });
    } else {
      res.status(400).json({ success: false, error: "Invalid signature" });
    }
  } catch (error) {
    console.error("PAYMENT VERIFICATION ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.razorpayWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(req.body)
      .digest("hex");

    if (expectedSignature === signature) {
      const parsedBody = JSON.parse(req.body);
      const event = parsedBody.event;
      
      if (event === "payment.captured") {
        const paymentId = parsedBody.payload.payment.entity.id;
        
        // Flow 2: Idempotency check. If paymentId already exists, return 200 immediately.
        const existingBooking = await prisma.booking.findFirst({
          where: { paymentId: paymentId }
        });

        if (existingBooking) {
          console.log(`Webhook ignored: Payment ${paymentId} already processed.`);
          return res.status(200).json({ status: "already_processed" });
        }

        console.log("Payment captured via webhook:", paymentId);
      }
      res.status(200).json({ status: "ok" });
    } else {
      res.status(400).json({ error: "Invalid signature" });
    }
  } catch (error) {
    console.error("RAZORPAY WEBHOOK ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};
