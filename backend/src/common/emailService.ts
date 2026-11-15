import nodemailer, { type Transporter } from 'nodemailer';
import env from '../config/env.js';

interface SendResetPasswordEmailOptions {
  to: string;
  resetUrl: string;
  fullName?: string;
}

let transporterInstance: Transporter | null = null;

export const getMailTransporter = (): Transporter | null => {
  if (!env.smtp.user || !env.smtp.pass) {
    return null;
  }

  if (!transporterInstance) {
    transporterInstance = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: {
        user: env.smtp.user,
        pass: env.smtp.pass,
      },
    });
  }

  return transporterInstance;
};

/**
 * Send password reset email to user's real email inbox.
 */
export const sendPasswordResetEmail = async ({
  to,
  resetUrl,
  fullName,
}: SendResetPasswordEmailOptions): Promise<{ sent: boolean; previewUrl?: string }> => {
  const recipientName = fullName?.trim() || 'Quý khách';
  const transporter = getMailTransporter();

  const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Yêu cầu đặt lại mật khẩu - ISOCAL</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f7fb;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f4f7fb;
      padding: 40px 16px;
      box-sizing: border-box;
    }
    .card {
      max-width: 580px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 4px 18px rgba(15, 23, 42, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #1a4ea6 0%, #2563eb 100%);
      padding: 30px 36px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 6px 0 0;
      font-size: 13px;
      opacity: 0.9;
    }
    .body {
      padding: 36px;
      line-height: 1.6;
      font-size: 15px;
      color: #334155;
    }
    .greeting {
      font-size: 17px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 16px;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #1a4ea6 0%, #2563eb 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 13px 32px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 15px;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.28);
    }
    .alt-link {
      background-color: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      padding: 14px;
      margin-top: 24px;
      word-break: break-all;
      font-size: 13px;
      color: #64748b;
    }
    .alt-link a {
      color: #2563eb;
      text-decoration: underline;
    }
    .notice {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px 16px;
      border-radius: 4px;
      font-size: 13.5px;
      color: #92400e;
      margin-top: 24px;
    }
    .footer {
      background-color: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 22px 36px;
      text-align: center;
      font-size: 12.5px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <h1>ISOCAL</h1>
        <p>Nền tảng Quản lý Hiệu chuẩn & Kiểm định</p>
      </div>
      <div class="body">
        <div class="greeting">Xin chào ${recipientName},</div>
        <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản ISOCAL liên kết với địa chỉ email này.</p>
        <p>Để tạo mật khẩu mới, vui lòng nhấn vào nút bên dưới:</p>
        
        <div class="btn-container">
          <a href="${resetUrl}" target="_blank" class="btn">Đặt lại mật khẩu</a>
        </div>

        <div class="notice">
          <strong>Lưu ý:</strong> Liên kết đặt lại mật khẩu chỉ có hiệu lực trong vòng <strong>15 phút</strong>.
        </div>

        <p style="margin-top: 20px; font-size: 14px; color: #64748b;">
          Nếu nút trên không bấm được, bạn có thể sao chép và dán liên kết sau vào trình duyệt:
        </p>
        <div class="alt-link">
          <a href="${resetUrl}" target="_blank">${resetUrl}</a>
        </div>

        <p style="margin-top: 24px; font-size: 13.5px; color: #64748b;">
          Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email. Mật khẩu hiện tại của bạn vẫn an toàn và không bị thay đổi.
        </p>
      </div>
      <div class="footer">
        <p style="margin: 0;">© ${new Date().getFullYear()} ISOCAL Calibration Management Platform. All rights reserved.</p>
        <p style="margin: 4px 0 0;">Email này được gửi tự động, vui lòng không phản hồi trực tiếp.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  const textContent = `
Xin chào ${recipientName},

Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản ISOCAL của bạn.
Vui lòng truy cập liên kết sau để tạo mật khẩu mới (có hiệu lực trong 15 phút):

${resetUrl}

Nếu bạn không yêu cầu đặt lại mật khẩu, xin vui lòng bỏ qua email này.

Trân trọng,
Đội ngũ ISOCAL
  `.trim();

  if (!transporter) {
    console.warn('\n======================================================');
    console.warn('[EmailService] SMTP credentials are not configured in .env');
    console.warn(`[EmailService] Simulated email to: ${to}`);
    console.warn(`[EmailService] Password reset URL: ${resetUrl}`);
    console.warn('======================================================\n');
    return { sent: false };
  }

  try {
    const info = await transporter.sendMail({
      from: env.smtp.from,
      to,
      subject: '[ISOCAL] Yêu cầu đặt lại mật khẩu / Password Reset Request',
      text: textContent,
      html: htmlContent,
    });

    console.log(`[EmailService] Real reset email successfully sent to ${to}. MessageId: ${info.messageId}`);
    return { sent: true };
  } catch (err) {
    console.error(`[EmailService] Failed to send email to ${to}:`, err);
    throw err;
  }
};

interface Send2FAOTPEmailOptions {
  to: string;
  otpCode: string;
  fullName?: string;
}

/**
 * Gửi mã OTP xác thực 2 yếu tố (2FA) qua email.
 */
export const send2FAOTPEmail = async ({
  to,
  otpCode,
  fullName,
}: Send2FAOTPEmailOptions): Promise<{ sent: boolean }> => {
  const recipientName = fullName?.trim() || 'Quý khách';
  const transporter = getMailTransporter();

  const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mã xác thực 2FA - ISOCAL</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f7fb;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
    }
    .wrapper {
      width: 100%;
      background-color: #f4f7fb;
      padding: 40px 16px;
      box-sizing: border-box;
    }
    .card {
      max-width: 540px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 4px 18px rgba(15, 23, 42, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
      padding: 28px 32px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
    }
    .header p {
      margin: 6px 0 0;
      font-size: 13px;
      opacity: 0.9;
    }
    .body {
      padding: 32px;
      line-height: 1.6;
      font-size: 15px;
      color: #334155;
    }
    .otp-box {
      margin: 28px 0;
      text-align: center;
      background: #f8fafc;
      border: 2px dashed #93c5fd;
      border-radius: 12px;
      padding: 20px;
    }
    .otp-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 34px;
      font-weight: 700;
      color: #1d4ed8;
      letter-spacing: 8px;
    }
    .notice {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px 16px;
      border-radius: 4px;
      font-size: 13.5px;
      color: #92400e;
      margin-top: 20px;
    }
    .footer {
      background-color: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 18px 32px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <h1>ISOCAL</h1>
        <p>Hệ thống Quản lý Hiệu chuẩn & Kiểm định</p>
      </div>
      <div class="body">
        <div style="font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 12px;">
          Xin chào ${recipientName},
        </div>
        <p>Bạn (hoặc ai đó) đang đăng nhập vào tài khoản ISOCAL có kích hoạt <strong>Xác thực hai yếu tố (2FA)</strong>.</p>
        <p>Mã xác thực OTP dùng một lần của bạn là:</p>
        
        <div class="otp-box">
          <div class="otp-code">${otpCode}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 6px;">Mã này có hiệu lực trong 5 phút</div>
        </div>

        <div class="notice">
          <strong>Cảnh báo bảo mật:</strong> Tuyệt đối không chia sẻ mã này với bất kỳ ai, bao gồm cả nhân viên hỗ trợ kỹ thuật ISOCAL.
        </div>

        <p style="margin-top: 20px; font-size: 13.5px; color: #64748b;">
          Nếu không phải bạn yêu cầu đăng nhập, vui lòng đổi mật khẩu ngay lập tức để bảo vệ tài khoản.
        </p>
      </div>
      <div class="footer">
        © ${new Date().getFullYear()} ISOCAL Calibration Management Platform.
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  const textContent = `
Xin chào ${recipientName},

Mã xác thực 2FA đăng nhập tài khoản ISOCAL của bạn là: ${otpCode}
Mã này có hiệu lực trong vòng 5 phút.

Tuyệt đối không chia sẻ mã này với bất kỳ ai.

Trân trọng,
Hệ thống ISOCAL
  `.trim();

  console.log(`\n======================================================`);
  console.log(`[2FA] Mã OTP đăng nhập cho ${to}: ${otpCode}`);
  console.log(`======================================================\n`);

  if (!transporter) {
    return { sent: false };
  }

  try {
    const info = await transporter.sendMail({
      from: env.smtp.from,
      to,
      subject: `[ISOCAL] Mã xác thực đăng nhập 2FA: ${otpCode}`,
      text: textContent,
      html: htmlContent,
    });
    console.log(`[EmailService] Real 2FA email sent to ${to}. MessageId: ${info.messageId}`);
    return { sent: true };
  } catch (err) {
    console.error(`[EmailService] Failed to send 2FA email to ${to}:`, err);
    return { sent: false };
  }
};
