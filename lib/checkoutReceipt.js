// lib/checkoutReceipt.js
// Canvas-rendered PNG receipt for the checkout success screen — no extra
// dependency, no React. Pure DOM/Canvas, so it lives outside the component.
// Extracted from CheckoutForm.js (behaviour unchanged).

// Renders the success details into a downloadable receipt image (PNG).
// `data.siteName` comes from Settings -> Branding & SEO via useBranding() at the
// call site, so a downloaded receipt never carries a stale brand name.
const fileSlug = (name) => (String(name || '').replace(/[^A-Za-z0-9]+/g, '').toLowerCase() || 'site');

export function buildReceiptCanvas(data) {
  const siteName = data.siteName || 'Receipt';
  const rupee = (n) => "Rs. " + Number(n || 0).toLocaleString("en-IN");

  const dateStr = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const rows = [
    ["Date", dateStr],
    ["Name", data.name],
    ["Email", data.email],
    ["Mobile", data.phone],
  ];
  if (data.gotra) rows.push(["Gotra", data.gotra]);
  if (!data.isEnquiry) {
    rows.push(["Category", data.category]);
    rows.push(["Attendees", `${data.attendees} Person(s)`]);
    rows.push(["Status", data.partial ? "Advance Paid" : "Paid"]);
    if (data.partial) {
      rows.push(["Advance Paid", rupee(data.paidNow)]);
      rows.push(["Balance Due", rupee(data.balance)]);
      rows.push(["Total", rupee(data.amount)]);
    } else {
      rows.push(["Amount", rupee(data.amount)]);
    }
    if (data.orderId) rows.push(["Order ID", data.orderId]);
    if (data.paymentId) rows.push(["Payment Ref", data.paymentId]);
  }

  // Layout constants (logical px; scaled up for crisp output).
  const scale = 2;
  const W = 440;
  const padX = 36;
  const rowH = 38;
  const headerH = 150;
  const footerH = 96;
  const H = headerH + rows.length * rowH + footerH;

  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Top accent bar
  ctx.fillStyle = "#ea580c";
  ctx.fillRect(0, 0, W, 8);

  // Brand + title
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#0a0a0a";
  ctx.font = "800 26px Arial, sans-serif";
  ctx.fillText(siteName, padX, 56);

  ctx.fillStyle = "#737373";
  ctx.font = "600 13px Arial, sans-serif";
  ctx.fillText(
    data.isEnquiry ? "ENQUIRY RECEIPT" : "REGISTRATION RECEIPT",
    padX,
    80,
  );

  // Status pill
  const pillText = data.isEnquiry
    ? "Enquiry Received"
    : data.partial
      ? "Advance Received"
      : "Payment Successful";
  ctx.font = "700 12px Arial, sans-serif";
  const pillW = ctx.measureText(pillText).width + 24;
  const pillColor = data.partial ? "#b45309" : "#16a34a";
  const pillBg = data.partial ? "#fffbeb" : "#f0fdf4";
  ctx.fillStyle = pillBg;
  ctx.beginPath();
  ctx.roundRect(padX, 98, pillW, 28, 14);
  ctx.fill();
  ctx.fillStyle = pillColor;
  ctx.fillText(pillText, padX + 12, 117);

  // Divider
  ctx.strokeStyle = "#e5e5e5";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padX, headerH - 6);
  ctx.lineTo(W - padX, headerH - 6);
  ctx.stroke();

  // Rows
  rows.forEach(([label, value], i) => {
    const y = headerH + i * rowH + 18;
    ctx.fillStyle = "#737373";
    ctx.font = "500 14px Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(label, padX, y);

    ctx.fillStyle = "#0a0a0a";
    ctx.font = "700 14px Arial, sans-serif";
    ctx.textAlign = "right";
    // Truncate long values (e.g. payment ref) to fit.
    let text = String(value ?? "");
    const maxW = W - padX * 2 - ctx.measureText(label).width - 16;
    while (ctx.measureText(text).width > maxW && text.length > 4) {
      text = text.slice(0, -2);
    }
    if (text !== String(value ?? "")) text += "…";
    ctx.fillText(text, W - padX, y);
    ctx.textAlign = "left";
  });

  // Footer
  const fy = headerH + rows.length * rowH;
  ctx.strokeStyle = "#e5e5e5";
  ctx.beginPath();
  ctx.moveTo(padX, fy + 8);
  ctx.lineTo(W - padX, fy + 8);
  ctx.stroke();

  ctx.fillStyle = "#a3a3a3";
  ctx.font = "500 11px Arial, sans-serif";
  ctx.fillText("Keep this receipt for your records.", padX, fy + 34);
  ctx.fillText(
    "A confirmation has also been sent to your email.",
    padX,
    fy + 52,
  );

  return canvas;
}

export function downloadReceipt(data) {
  const siteName = data.siteName || 'Receipt';
  const canvas = buildReceiptCanvas(data);
  const safeName = String(data.name || "receipt")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  const link = document.createElement("a");
  link.download = `${fileSlug(siteName)}-receipt-${safeName || "receipt"}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
