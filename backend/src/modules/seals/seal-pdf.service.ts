import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import env from '../../config/env.js';

const PAGE_WIDTH = 298.11; // A6 width (pt)
const PAGE_HEIGHT = 419.53; // A6 height (pt)
const PAGE_MARGIN = 16;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

export interface SealStickerData {
  seal_code: string;
  status: string;
  status_label: string;
  cal_date_formatted: string;
  due_date_formatted: string;
  issued_at_formatted: string;
  device_name: string;
  model: string | null;
  serial_number: string | null;
  internal_code: string | null;
  measuring_range: string | null;
  customer_name: string;
  customer_address: string | null;
  certificate_no: string;
  service_name: string | null;
  service_code: string | null;
  procedure_version: string | null;
  verify_url: string;
}

const STATUS_STYLES: Record<string, { background: string; color: string }> = {
  Active: { background: '#ecfdf5', color: '#047857' },
  PendingPayment: { background: '#fffbeb', color: '#b45309' },
  Expired: { background: '#fef2f2', color: '#b91c1c' },
  Revoked: { background: '#fef2f2', color: '#b91c1c' },
};

const resolveFontPath = (): string | null => {
  const candidates = [
    process.env.PDF_FONT_PATH,
    path.resolve(process.cwd(), 'src', 'assets', 'fonts', 'NotoSans-Regular.ttf'),
    path.resolve(process.cwd(), 'dist', 'assets', 'fonts', 'NotoSans-Regular.ttf'),
    'C:\\Windows\\Fonts\\arial.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  ].filter((candidate): candidate is string => Boolean(candidate));

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
};

export const buildSealVerifyUrl = (sealCode: string): string => {
  const baseUrl = env.frontendUrl.replace(/\/+$/, '');
  return `${baseUrl}/verify/${encodeURIComponent(sealCode)}`;
};

export const generateSealQrPng = async (
  sealCode: string,
  size = 512,
): Promise<Buffer> =>
  QRCode.toBuffer(buildSealVerifyUrl(sealCode), {
    type: 'png',
    width: size,
    margin: 1,
    errorCorrectionLevel: 'M',
  });

export const generateSealPdfBuffer = async (
  data: SealStickerData,
): Promise<Buffer> => {
  const qrBuffer = await generateSealQrPng(data.seal_code, 420);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: [PAGE_WIDTH, PAGE_HEIGHT],
        margin: PAGE_MARGIN,
        info: {
          Title: `Tem hiệu chuẩn ${data.seal_code}`,
          Author: data.customer_name,
          Subject: 'Tem xác thực hiệu chuẩn thiết bị đo lường',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const fontPath = resolveFontPath();
      if (fontPath) doc.registerFont('SealFont', fontPath);
      const font = fontPath ? 'SealFont' : 'Helvetica';

      const left = PAGE_MARGIN;
      let y = PAGE_MARGIN;

      const infoRow = (label: string, value: string) => {
        const text = value || '—';
        const labelWidth = 62;
        const valueWidth = CONTENT_WIDTH - labelWidth;
        const height = Math.max(
          doc.heightOfString(label, { width: labelWidth - 4 }),
          doc.heightOfString(text, { width: valueWidth }),
        );
        doc
          .font(font)
          .fontSize(7)
          .fillColor('#6b7280')
          .text(label, left, y, { width: labelWidth - 4 });
        doc
          .fontSize(7.6)
          .fillColor('#111827')
          .text(text, left + labelWidth, y, { width: valueWidth });
        y += height + 2.4;
      };

      doc
        .font(font)
        .fontSize(7)
        .fillColor('#4b5563')
        .text('HỆ THỐNG HIỆU CHUẨN ISOCAL', left, y, {
          width: CONTENT_WIDTH,
          align: 'center',
        });
      y += 11;

      doc
        .fontSize(12.5)
        .fillColor('#111827')
        .text('TEM HIỆU CHUẨN', left, y, {
          width: CONTENT_WIDTH,
          align: 'center',
        });
      y += 15;

      doc
        .fontSize(6.8)
        .fillColor('#6b7280')
        .text('CALIBRATION SEAL', left, y, {
          width: CONTENT_WIDTH,
          align: 'center',
        });
      y += 13;

      doc
        .fontSize(14)
        .fillColor('#1d4ed8')
        .text(data.seal_code, left, y, {
          width: CONTENT_WIDTH,
          align: 'center',
        });
      y += 20;

      const qrSize = 124;
      const qrX = left + (CONTENT_WIDTH - qrSize) / 2;
      doc.image(qrBuffer, qrX, y, { width: qrSize, height: qrSize });
      y += qrSize + 5;

      doc
        .font(font)
        .fontSize(6)
        .fillColor('#6b7280')
        .text(data.verify_url, left, y, {
          width: CONTENT_WIDTH,
          align: 'center',
        });
      y += 16;

      const style = STATUS_STYLES[data.status] ?? {
        background: '#f3f4f6',
        color: '#374151',
      };
      const pillWidth = 92;
      const pillHeight = 15;
      const pillX = left + (CONTENT_WIDTH - pillWidth) / 2;
      doc
        .roundedRect(pillX, y, pillWidth, pillHeight, 7)
        .fill(style.background);
      doc
        .font(font)
        .fontSize(7.5)
        .fillColor(style.color)
        .text(data.status_label, pillX, y + 4, {
          width: pillWidth,
          align: 'center',
        });
      y += pillHeight + 8;

      doc
        .moveTo(left, y)
        .lineTo(left + CONTENT_WIDTH, y)
        .lineWidth(0.6)
        .strokeColor('#cbd5e1')
        .stroke();
      y += 7;

      infoRow('Thiết bị', data.device_name);
      if (data.model) infoRow('Model', data.model);
      if (data.serial_number) infoRow('Số sê-ri', data.serial_number);
      if (data.internal_code) infoRow('Mã quản lý', data.internal_code);
      if (data.measuring_range) infoRow('Phạm vi đo', data.measuring_range);
      infoRow('Khách hàng', data.customer_name);
      if (data.customer_address) infoRow('Địa chỉ', data.customer_address);
      infoRow('Chứng nhận', data.certificate_no);
      if (data.service_name) {
        infoRow(
          'Dịch vụ',
          `${data.service_name}${
            data.service_code ? ` (${data.service_code})` : ''
          }`,
        );
      }
      if (data.procedure_version) {
        infoRow('Quy trình', data.procedure_version);
      }
      infoRow('Ngày hiệu chuẩn', data.cal_date_formatted);
      infoRow('Hạn hiệu lực', data.due_date_formatted);
      infoRow('Ngày phát hành', data.issued_at_formatted);

      y += 3;
      doc
        .moveTo(left, y)
        .lineTo(left + CONTENT_WIDTH, y)
        .lineWidth(0.6)
        .strokeColor('#cbd5e1')
        .stroke();
      y += 7;

      doc
        .font(font)
        .fontSize(6.4)
        .fillColor('#6b7280')
        .text(
          'Quét mã QR hoặc truy cập đường dẫn trên để tra cứu tính hợp lệ của tem. Tem không có giá trị khi đã hết hạn hoặc bị thu hồi.',
          left,
          y,
          { width: CONTENT_WIDTH, align: 'center' },
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
