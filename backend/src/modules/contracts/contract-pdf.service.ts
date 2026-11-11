import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import { ERROR_CODES } from '../../common/constants.js';
import { AppError } from '../../common/errors.js';
import dataSource from '../../database/dataSource.js';
import {
  Contract,
  DigitalSignature,
} from '../../database/entities.js';

const PAGE_MARGIN = 40;
const CONTENT_WIDTH = 595.28 - PAGE_MARGIN * 2;

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

const formatMoney = (value: number | string): string =>
  `${new Intl.NumberFormat('vi-VN').format(Number(value) || 0)} đ`;

const formatDate = (value: Date | string | null | undefined): string => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const formatDateTime = (value: Date | string | null | undefined): string => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const registerFont = (doc: PDFKit.PDFDocument): string => {
  const fontPath = resolveFontPath();
  if (fontPath) {
    doc.registerFont('ContractFont', fontPath);
    return 'ContractFont';
  }
  return 'Helvetica';
};

const drawSignatureBox = (
  doc: PDFKit.PDFDocument,
  options: {
    x: number;
    y: number;
    width: number;
    height: number;
    title: string;
    partyName: string;
    representative: string | null;
    position: string | null;
    signature: DigitalSignature | null;
  },
) => {
  const { x, y, width, height, title, partyName, representative, position, signature } = options;

  doc
    .save()
    .lineWidth(0.8)
    .strokeColor('#9ca3af')
    .rect(x, y, width, height)
    .stroke()
    .restore();

  doc
    .fillColor('#111827')
    .fontSize(10)
    .text(title, x + 8, y + 8, { width: width - 16, align: 'center' });

  doc
    .fillColor('#374151')
    .fontSize(8)
    .text(partyName, x + 8, y + 24, { width: width - 16, align: 'center' });

  const signerName = signature?.signer?.full_name ?? representative ?? '';

  if (signature) {
    doc
      .fillColor('#1d4ed8')
      .fontSize(16)
      .text(signerName, x + 8, y + 46, { width: width - 16, align: 'center' });

    doc
      .moveTo(x + 24, y + 72)
      .lineTo(x + width - 24, y + 72)
      .lineWidth(0.6)
      .strokeColor('#1d4ed8')
      .stroke();

    doc
      .fillColor('#047857')
      .fontSize(9)
      .text('Đã ký số', x + 8, y + 78, { width: width - 16, align: 'center' });

    doc
      .fillColor('#6b7280')
      .fontSize(7)
      .text(formatDateTime(signature.signed_at), x + 8, y + 92, {
        width: width - 16,
        align: 'center',
      })
      .text(signature.provider_transaction_id ?? '', x + 8, y + 103, {
        width: width - 16,
        align: 'center',
      });
  } else {
    doc
      .fillColor('#9ca3af')
      .fontSize(10)
      .text('(Chưa ký)', x + 8, y + 58, { width: width - 16, align: 'center' });
  }

  doc
    .fillColor('#374151')
    .fontSize(8)
    .text(position ?? '', x + 8, y + height - 26, { width: width - 16, align: 'center' });
};

export const generateContractPdfBuffer = async (
  contract: Contract,
  signatures: DigitalSignature[],
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: PAGE_MARGIN,
        bufferPages: true,
        info: {
          Title: `Hợp đồng ${contract.contract_code}`,
          Author: contract.party_b_name || 'ISOCAL',
          Subject: 'Hợp đồng cung cấp dịch vụ kiểm định, hiệu chuẩn',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const font = registerFont(doc);
      const fontBold = font;
      const left = PAGE_MARGIN;
      const right = PAGE_MARGIN + CONTENT_WIDTH;
      let y = PAGE_MARGIN;

      const ensureSpace = (height: number) => {
        if (y + height > doc.page.height - PAGE_MARGIN - 24) {
          doc.addPage();
          y = PAGE_MARGIN;
        }
      };

      // ===== Header =====
      doc
        .font(fontBold)
        .fillColor('#111827')
        .fontSize(13)
        .text(contract.party_b_name || 'CÔNG TY CỔ PHẦN ISOCAL', left, y, {
          width: CONTENT_WIDTH,
          align: 'center',
        });
      y += 20;

      doc
        .fontSize(12)
        .text('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', left, y, {
          width: CONTENT_WIDTH,
          align: 'center',
        });
      y += 17;

      doc
        .fontSize(11)
        .text('Độc lập - Tự do - Hạnh phúc', left, y, {
          width: CONTENT_WIDTH,
          align: 'center',
        });
      y += 16;

      doc
        .moveTo(left + CONTENT_WIDTH / 2 - 80, y)
        .lineTo(left + CONTENT_WIDTH / 2 + 80, y)
        .lineWidth(0.8)
        .strokeColor('#111827')
        .stroke();
      y += 22;

      const title = contract.title || 'Hợp đồng cung cấp dịch vụ kiểm định, hiệu chuẩn thiết bị đo lường';
      doc
        .font(fontBold)
        .fontSize(15)
        .fillColor('#111827')
        .text(title.toUpperCase(), left, y, {
          width: CONTENT_WIDTH,
          align: 'center',
        });
      y += doc.heightOfString(title.toUpperCase(), { width: CONTENT_WIDTH, align: 'center' }) + 6;

      doc
        .font(font)
        .fontSize(10)
        .fillColor('#374151')
        .text(`Số hợp đồng: ${contract.contract_code}`, left, y, {
          width: CONTENT_WIDTH,
          align: 'center',
        });
      y += 16;
      doc.text(
        `Ngày lập: ${formatDate(contract.created_at)}${contract.sign_date ? `  ·  Ngày ký: ${formatDate(contract.sign_date)}` : ''}`,
        left,
        y,
        { width: CONTENT_WIDTH, align: 'center' },
      );
      y += 24;

      // ===== Parties =====
      const partyBlock = (
        label: string,
        party: {
          name: string;
          representative: string | null;
          position: string | null;
          address: string | null;
          phone: string | null;
          tax_code: string | null;
          bank_account?: string | null;
          bank_name?: string | null;
        },
      ) => {
        ensureSpace(78);
        doc.font(fontBold).fontSize(11).fillColor('#111827').text(label, left, y);
        y += 16;
        doc.font(font).fontSize(9.5).fillColor('#1f2937');
        const rows: Array<[string, string]> = [
          ['Tên đơn vị', party.name],
          ['Người đại diện', party.representative ?? ''],
          ['Chức vụ', party.position ?? ''],
          ['Địa chỉ', party.address ?? ''],
          ['Điện thoại', party.phone ?? ''],
          ['Mã số thuế', party.tax_code ?? ''],
        ];
        if (party.bank_account) rows.push(['Số tài khoản', party.bank_account]);
        if (party.bank_name) rows.push(['Ngân hàng', party.bank_name]);
        rows.forEach(([key, value]) => {
          if (!value) return;
          const text = `${key}: ${value}`;
          const height = doc.heightOfString(text, { width: CONTENT_WIDTH });
          ensureSpace(height + 2);
          doc.text(text, left, y, { width: CONTENT_WIDTH });
          y += height + 2;
        });
        y += 8;
      };

      partyBlock('BÊN A (KHÁCH HÀNG)', {
        name: contract.party_a_name,
        representative: contract.party_a_representative,
        position: contract.party_a_position,
        address: contract.party_a_address,
        phone: contract.party_a_phone,
        tax_code: contract.party_a_tax_code,
        bank_account: contract.party_a_bank_account,
        bank_name: contract.party_a_bank_name,
      });

      partyBlock('BÊN B (ĐƠN VỊ CUNG CẤP DỊCH VỤ)', {
        name: contract.party_b_name,
        representative: contract.party_b_representative,
        position: contract.party_b_position,
        address: contract.party_b_address,
        phone: contract.party_b_phone,
        tax_code: contract.party_b_tax_code,
        bank_account: contract.party_b_bank_account,
        bank_name: contract.party_b_bank_name,
      });

      // ===== Items table =====
      ensureSpace(40);
      doc.font(fontBold).fontSize(11).fillColor('#111827').text('DANH MỤC THIẾT BỊ / DỊCH VỤ', left, y);
      y += 17;

      const columns = {
        no: { x: left, width: 28 },
        name: { x: left + 28, width: 235 },
        quantity: { x: left + 263, width: 40 },
        unitPrice: { x: left + 303, width: 90 },
        amount: { x: left + 393, width: CONTENT_WIDTH - 393 },
      };

      const drawTableHeader = () => {
        ensureSpace(24);
        doc
          .rect(left, y, CONTENT_WIDTH, 22)
          .fillAndStroke('#eef2f7', '#cbd5e1');
        doc.fillColor('#111827').font(fontBold).fontSize(8.5);
        doc.text('STT', columns.no.x + 4, y + 7, { width: columns.no.width - 4, align: 'center' });
        doc.text('Tên thiết bị / dịch vụ', columns.name.x + 4, y + 7, { width: columns.name.width - 8 });
        doc.text('SL', columns.quantity.x, y + 7, { width: columns.quantity.width, align: 'center' });
        doc.text('Đơn giá', columns.unitPrice.x, y + 7, { width: columns.unitPrice.width, align: 'right' });
        doc.text('Thành tiền', columns.amount.x, y + 7, { width: columns.amount.width - 4, align: 'right' });
        y += 22;
      };

      drawTableHeader();

      const items = [...(contract.items ?? [])].sort((a, b) => a.line_no - b.line_no);
      items.forEach((item, index) => {
        const nameText = [item.name, item.description].filter(Boolean).join('\n');
        const nameHeight = doc.heightOfString(nameText, {
          width: columns.name.width - 8,
          align: 'left',
        });
        const rowHeight = Math.max(22, nameHeight + 8);

        if (y + rowHeight > doc.page.height - PAGE_MARGIN - 24) {
          doc.addPage();
          y = PAGE_MARGIN;
          drawTableHeader();
        }

        doc
          .rect(left, y, CONTENT_WIDTH, rowHeight)
          .lineWidth(0.5)
          .strokeColor('#d1d5db')
          .stroke();

        doc.fillColor('#111827').font(font).fontSize(8.5);
        doc.text(String(index + 1), columns.no.x + 4, y + 4, {
          width: columns.no.width - 4,
          align: 'center',
        });
        doc.text(nameText, columns.name.x + 4, y + 4, {
          width: columns.name.width - 8,
        });
        doc.text(String(Number(item.quantity)), columns.quantity.x, y + 4, {
          width: columns.quantity.width,
          align: 'center',
        });
        doc.text(formatMoney(item.unit_price), columns.unitPrice.x, y + 4, {
          width: columns.unitPrice.width,
          align: 'right',
        });
        doc.text(formatMoney(item.amount), columns.amount.x, y + 4, {
          width: columns.amount.width - 4,
          align: 'right',
        });

        y += rowHeight;
      });

      // ===== Totals =====
      y += 10;
      ensureSpace(100);
      const totalRows: Array<[string, string]> = [
        ['Tạm tính', formatMoney(contract.subtotal)],
        ['Chiết khấu', `- ${formatMoney(contract.discount_amount)}`],
        ['Phí đi lại', formatMoney(contract.travel_fee)],
        ['Thuế GTGT', formatMoney(contract.tax_amount)],
        ['TỔNG CỘNG', formatMoney(contract.total_amount)],
      ];

      totalRows.forEach(([label, value], index) => {
        const isTotal = index === totalRows.length - 1;
        doc
          .font(isTotal ? fontBold : font)
          .fontSize(isTotal ? 10 : 9)
          .fillColor(isTotal ? '#111827' : '#374151');
        doc.text(label, left + CONTENT_WIDTH - 250, y, { width: 140, align: 'right' });
        doc.text(value, left + CONTENT_WIDTH - 100, y, { width: 100, align: 'right' });
        y += isTotal ? 18 : 14;
      });

      if (contract.total_in_words) {
        ensureSpace(30);
        doc
          .font(font)
          .fontSize(8.5)
          .fillColor('#374151')
          .text(`Bằng chữ: ${contract.total_in_words}`, left, y, { width: CONTENT_WIDTH });
        y += 18;
      }

      // ===== Terms =====
      const terms: Array<[string, string | null]> = [
        ['Thời hạn thanh toán', `${contract.payment_term_days} ngày kể từ ngày nhận hóa đơn`],
        ['Căn cứ pháp lý', contract.legal_basis],
        ['Ghi chú', contract.notes],
      ];

      terms.forEach(([label, value]) => {
        if (!value) return;
        ensureSpace(26);
        doc.font(fontBold).fontSize(9.5).fillColor('#111827').text(`${label}:`, left, y);
        y += 14;
        doc.font(font).fontSize(9).fillColor('#374151');
        const height = doc.heightOfString(value, { width: CONTENT_WIDTH });
        doc.text(value, left, y, { width: CONTENT_WIDTH });
        y += height + 6;
      });

      // ===== Signatures =====
      const companySignature =
        signatures.find((signature) => signature.purpose === 'CompanyApproval') ?? null;
      const customerSignature =
        signatures.find((signature) => signature.purpose === 'CustomerApproval') ?? null;

      const signatureBoxHeight = 145;
      ensureSpace(signatureBoxHeight + 40);
      y += 10;
      doc.font(fontBold).fontSize(10).fillColor('#111827').text('CHỮ KÝ CÁC BÊN', left, y, {
        width: CONTENT_WIDTH,
        align: 'center',
      });
      y += 18;

      const gap = 24;
      const boxWidth = (CONTENT_WIDTH - gap) / 2;
      drawSignatureBox(doc, {
        x: left,
        y,
        width: boxWidth,
        height: signatureBoxHeight,
        title: 'ĐẠI DIỆN BÊN A',
        partyName: contract.party_a_name,
        representative: contract.party_a_representative,
        position: contract.party_a_position,
        signature: customerSignature,
      });
      drawSignatureBox(doc, {
        x: left + boxWidth + gap,
        y,
        width: boxWidth,
        height: signatureBoxHeight,
        title: 'ĐẠI DIỆN BÊN B',
        partyName: contract.party_b_name,
        representative: contract.party_b_representative,
        position: contract.party_b_position,
        signature: companySignature,
      });
      y += signatureBoxHeight + 12;

      // ===== Footer =====
      const pages = doc.bufferedPageRange();
      for (let pageIndex = pages.start; pageIndex < pages.start + pages.count; pageIndex += 1) {
        doc.switchToPage(pageIndex);
        doc
          .font(font)
          .fontSize(7.5)
          .fillColor('#9ca3af')
          .text(
            `Hợp đồng ${contract.contract_code}  ·  Trang ${pageIndex + 1}/${pages.count}`,
            left,
            doc.page.height - PAGE_MARGIN + 8,
            { width: CONTENT_WIDTH, align: 'center' },
          );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });

export const saveSignedContractPdf = async (
  contractId: number,
): Promise<{ fileUrl: string; hash: string }> => {
  const contract = await dataSource.getRepository(Contract).findOne({
    where: { id: contractId },
    relations: { customer: true, items: true },
  });

  if (!contract) {
    throw new AppError('Hợp đồng không tồn tại.', 404, ERROR_CODES.NOT_FOUND);
  }

  const signatures = await dataSource.getRepository(DigitalSignature).find({
    where: { contract_id: contractId },
    relations: { signer: true },
    order: { id: 'ASC' },
  });

  const buffer = await generateContractPdfBuffer(contract, signatures);
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');

  const storageDir = path.resolve(process.cwd(), 'storage', 'contracts');
  fs.mkdirSync(storageDir, { recursive: true });
  const fileName = `contract-${contract.id}-signed.pdf`;
  fs.writeFileSync(path.join(storageDir, fileName), buffer);

  const fileUrl = path.posix.join('storage', 'contracts', fileName);
  const now = new Date();

  await dataSource.transaction(async (manager) => {
    await manager.getRepository(Contract).update(
      { id: contractId },
      { signed_file_url: fileUrl, updated_at: now },
    );
    await manager.getRepository(DigitalSignature).update(
      { contract_id: contractId },
      { document_hash: hash, signed_file_url: fileUrl },
    );
  });

  return { fileUrl, hash };
};

export const getSignedContractAbsolutePath = (fileUrl: string): string =>
  path.resolve(process.cwd(), fileUrl);
