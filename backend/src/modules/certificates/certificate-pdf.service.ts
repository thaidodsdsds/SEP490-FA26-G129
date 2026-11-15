import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';

const PAGE_MARGIN = 40;
const CONTENT_WIDTH = 595.28 - PAGE_MARGIN * 2;

export interface CertificatePdfMeasurement {
  parameter_name: string | null;
  unit: string | null;
  point_no: number | null;
  nominal_value: string | number | null;
  tolerance: string | number | null;
  repeat_no: number | null;
  measured_value: string | number | null;
  reference_value: string | number | null;
  deviation: string | number | null;
  uncertainty: string | number | null;
  pass_fail: boolean | null;
}

export interface CertificatePdfData {
  certificate: {
    id: number;
    certificate_no: string;
    status: string;
    issued_at: Date | string | null;
    created_at: Date | string | null;
  };
  company: {
    name: string;
    address: string | null;
    phone: string | null;
    tax_code: string | null;
  };
  customer: {
    name: string | null;
    address: string | null;
    tax_code: string | null;
  };
  device: {
    name: string | null;
    model: string | null;
    manufacturer: string | null;
    serial_number: string | null;
    internal_code: string | null;
    measuring_range: string | null;
  };
  calibration: {
    record_id: number;
    service_name: string | null;
    service_code: string | null;
    procedure_version: string | null;
    result_status: string | null;
    environment_temp: string | number | null;
    environment_humidity: string | number | null;
    submitted_at: Date | string | null;
    reviewed_at: Date | string | null;
    technician_name: string | null;
    reviewer_name: string | null;
    standard_name: string | null;
    standard_serial: string | null;
  };
  measurements: CertificatePdfMeasurement[];
  signature: {
    signer_name: string | null;
    signed_at: Date | string | null;
    provider_transaction_id: string | null;
    document_hash: string | null;
  } | null;
}

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

const formatDate = (value: Date | string | null | undefined): string => {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const formatDateTime = (value: Date | string | null | undefined): string => {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatNumber = (value: unknown, digits = 4): string => {
  if (value === null || value === undefined || value === '') return '—';
  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) return String(value);
  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: digits,
  }).format(numberValue);
};

const measurementText = (
  value: string | number | null,
  unit: string | null,
  options?: { signed?: boolean },
): string => {
  const formatted = formatNumber(value);
  if (formatted === '—') return formatted;
  const prefix =
    options?.signed && Number(value) > 0 ? '+' : '';
  return `${prefix}${formatted}${unit ? ` ${unit}` : ''}`;
};

export const generateCertificatePdfBuffer = async (
  data: CertificatePdfData,
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: PAGE_MARGIN,
        bufferPages: true,
        info: {
          Title: `Chứng nhận hiệu chuẩn ${data.certificate.certificate_no}`,
          Author: data.company.name,
          Subject: 'Giấy chứng nhận hiệu chuẩn thiết bị đo lường',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const fontPath = resolveFontPath();
      if (fontPath) doc.registerFont('CertificateFont', fontPath);
      const font = fontPath ? 'CertificateFont' : 'Helvetica';

      const left = PAGE_MARGIN;
      let y = PAGE_MARGIN;

      const ensureSpace = (height: number) => {
        if (y + height > doc.page.height - PAGE_MARGIN - 24) {
          doc.addPage();
          y = PAGE_MARGIN;
        }
      };

      const sectionTitle = (title: string) => {
        ensureSpace(26);
        doc
          .font(font)
          .fontSize(10)
          .fillColor('#111827')
          .text(title, left, y, { width: CONTENT_WIDTH });
        y += 15;
        doc
          .moveTo(left, y)
          .lineTo(left + CONTENT_WIDTH, y)
          .lineWidth(0.6)
          .strokeColor('#cbd5e1')
          .stroke();
        y += 7;
      };

      const infoRow = (label: string, value: string) => {
        const text = value || '—';
        const labelWidth = 118;
        const valueWidth = CONTENT_WIDTH - labelWidth;
        const height = Math.max(
          doc.heightOfString(label, { width: labelWidth - 6 }),
          doc.heightOfString(text, { width: valueWidth }),
        );
        ensureSpace(height + 4);
        doc
          .font(font)
          .fontSize(9)
          .fillColor('#4b5563')
          .text(label, left, y, { width: labelWidth - 6 });
        doc
          .fontSize(9.5)
          .fillColor('#111827')
          .text(text, left + labelWidth, y, { width: valueWidth });
        y += height + 4;
      };

      // ===== Header =====
      doc
        .font(font)
        .fontSize(13)
        .fillColor('#111827')
        .text(data.company.name.toUpperCase(), left, y, {
          width: CONTENT_WIDTH,
          align: 'center',
        });
      y += 19;

      const companyLine = [
        data.company.address,
        data.company.phone ? `ĐT: ${data.company.phone}` : null,
        data.company.tax_code ? `MST: ${data.company.tax_code}` : null,
      ]
        .filter(Boolean)
        .join('  ·  ');

      if (companyLine) {
        doc
          .font(font)
          .fontSize(8)
          .fillColor('#4b5563')
          .text(companyLine, left, y, { width: CONTENT_WIDTH, align: 'center' });
        y += 14;
      }

      y += 6;
      doc
        .moveTo(left, y)
        .lineTo(left + CONTENT_WIDTH, y)
        .lineWidth(1)
        .strokeColor('#111827')
        .stroke();
      y += 14;

      doc
        .font(font)
        .fontSize(17)
        .fillColor('#111827')
        .text('GIẤY CHỨNG NHẬN HIỆU CHUẨN', left, y, {
          width: CONTENT_WIDTH,
          align: 'center',
        });
      y += 21;

      doc
        .font(font)
        .fontSize(9)
        .fillColor('#4b5563')
        .text('CERTIFICATE OF CALIBRATION', left, y, {
          width: CONTENT_WIDTH,
          align: 'center',
        });
      y += 18;

      doc
        .fontSize(11)
        .fillColor('#111827')
        .text(`Số: ${data.certificate.certificate_no}`, left, y, {
          width: CONTENT_WIDTH,
          align: 'center',
        });
      y += 16;

      doc
        .fontSize(8.5)
        .fillColor('#4b5563')
        .text(
          `Ngày cấp: ${formatDate(data.certificate.issued_at ?? data.certificate.created_at)}  ·  Trạng thái: ${
            data.certificate.status === 'Released' ? 'Đã phát hành' : 'Bản nháp'
          }`,
          left,
          y,
          { width: CONTENT_WIDTH, align: 'center' },
        );
      y += 18;

      // ===== Customer =====
      sectionTitle('THÔNG TIN KHÁCH HÀNG');
      infoRow('Khách hàng', data.customer.name ?? '—');
      infoRow('Địa chỉ', data.customer.address ?? '—');
      infoRow('Mã số thuế', data.customer.tax_code ?? '—');

      // ===== Device =====
      sectionTitle('THÔNG TIN THIẾT BỊ ĐO');
      infoRow('Tên thiết bị', data.device.name ?? '—');
      infoRow('Model', data.device.model ?? '—');
      infoRow('Hãng sản xuất', data.device.manufacturer ?? '—');
      infoRow('Số sê-ri', data.device.serial_number ?? '—');
      infoRow('Mã quản lý', data.device.internal_code ?? '—');
      infoRow('Phạm vi đo', data.device.measuring_range ?? '—');

      // ===== Calibration =====
      sectionTitle('THÔNG TIN HIỆU CHUẨN');
      infoRow('Dịch vụ', data.calibration.service_name ?? '—');
      infoRow(
        'Quy trình áp dụng',
        data.calibration.service_code
          ? `${data.calibration.service_code}${data.calibration.procedure_version ? ` (${data.calibration.procedure_version})` : ''}`
          : '—',
      );
      infoRow(
        'Chuẩn đo lường',
        data.calibration.standard_name
          ? `${data.calibration.standard_name}${
              data.calibration.standard_serial
                ? ` (SN: ${data.calibration.standard_serial})`
                : ''
            }`
          : '—',
      );
      infoRow(
        'Điều kiện môi trường',
        `${
          data.calibration.environment_temp !== null &&
          data.calibration.environment_temp !== undefined
            ? `${formatNumber(data.calibration.environment_temp)}°C`
            : '—'
        } / ${
          data.calibration.environment_humidity !== null &&
          data.calibration.environment_humidity !== undefined
            ? `${formatNumber(data.calibration.environment_humidity)}% RH`
            : '—'
        }`,
      );
      infoRow('Ngày thực hiện', formatDate(data.calibration.submitted_at));
      infoRow('Ngày soát xét', formatDate(data.calibration.reviewed_at));
      infoRow('Kỹ thuật viên', data.calibration.technician_name ?? '—');
      infoRow('Người soát xét', data.calibration.reviewer_name ?? '—');

      // ===== Measurements =====
      sectionTitle('KẾT QUẢ ĐO KIỂM');

      const columns = [
        { key: 'no', label: 'STT', x: left, width: 26, align: 'center' as const },
        {
          key: 'point',
          label: 'Điểm đo',
          x: left + 26,
          width: 118,
          align: 'left' as const,
        },
        {
          key: 'nominal',
          label: 'Danh nghĩa',
          x: left + 144,
          width: 56,
          align: 'right' as const,
        },
        {
          key: 'tolerance',
          label: 'Dung sai',
          x: left + 200,
          width: 52,
          align: 'right' as const,
        },
        {
          key: 'repeat',
          label: 'Lần',
          x: left + 252,
          width: 26,
          align: 'center' as const,
        },
        {
          key: 'measured',
          label: 'Giá trị đo',
          x: left + 278,
          width: 62,
          align: 'right' as const,
        },
        {
          key: 'deviation',
          label: 'Sai lệch',
          x: left + 340,
          width: 56,
          align: 'right' as const,
        },
        {
          key: 'uncertainty',
          label: 'Độ KĐB',
          x: left + 396,
          width: 56,
          align: 'right' as const,
        },
        {
          key: 'result',
          label: 'Kết quả',
          x: left + 452,
          width: CONTENT_WIDTH - 452,
          align: 'center' as const,
        },
      ];

      const drawTableHeader = () => {
        ensureSpace(24);
        doc
          .rect(left, y, CONTENT_WIDTH, 20)
          .fillAndStroke('#eef2f7', '#cbd5e1');
        doc.font(font).fontSize(8).fillColor('#111827');
        columns.forEach((column) => {
          doc.text(column.label, column.x + 2, y + 6, {
            width: column.width - 4,
            align: column.align,
          });
        });
        y += 20;
      };

      drawTableHeader();

      if (data.measurements.length === 0) {
        ensureSpace(22);
        doc
          .font(font)
          .fontSize(8.5)
          .fillColor('#6b7280')
          .text('Chưa ghi nhận kết quả đo kiểm.', left, y + 6, {
            width: CONTENT_WIDTH,
            align: 'center',
          });
        y += 24;
      }

      data.measurements.forEach((measurement, index) => {
        const unit = measurement.unit ?? '';
        const pointLabel = measurement.parameter_name
          ? `${measurement.parameter_name}${
              measurement.point_no !== null ? ` · Điểm ${measurement.point_no}` : ''
            }`
          : measurement.point_no !== null
            ? `Điểm ${measurement.point_no}`
            : '—';

        const values: Record<string, string> = {
          no: String(index + 1),
          point: pointLabel,
          nominal: measurementText(measurement.nominal_value, unit),
          tolerance:
            measurement.tolerance !== null && measurement.tolerance !== undefined
              ? `±${formatNumber(measurement.tolerance)}${unit ? ` ${unit}` : ''}`
              : '—',
          repeat:
            measurement.repeat_no !== null && measurement.repeat_no !== undefined
              ? String(measurement.repeat_no)
              : '—',
          measured: measurementText(measurement.measured_value, unit),
          deviation: measurementText(measurement.deviation, unit, { signed: true }),
          uncertainty:
            measurement.uncertainty !== null && measurement.uncertainty !== undefined
              ? `±${formatNumber(measurement.uncertainty)}${unit ? ` ${unit}` : ''}`
              : '—',
          result:
            measurement.pass_fail === true
              ? 'Đạt'
              : measurement.pass_fail === false
                ? 'Không đạt'
                : '—',
        };

        const rowHeight = Math.max(
          18,
          doc.heightOfString(values.point, { width: columns[1].width - 4 }) + 6,
        );

        if (y + rowHeight > doc.page.height - PAGE_MARGIN - 24) {
          doc.addPage();
          y = PAGE_MARGIN;
          drawTableHeader();
        }

        doc
          .rect(left, y, CONTENT_WIDTH, rowHeight)
          .lineWidth(0.4)
          .strokeColor('#e5e7eb')
          .stroke();

        doc.font(font).fontSize(8).fillColor('#111827');
        columns.forEach((column) => {
          doc.text(values[column.key] ?? '', column.x + 2, y + 4, {
            width: column.width - 4,
            align: column.align,
          });
        });

        y += rowHeight;
      });

      // ===== Conclusion =====
      y += 10;
      ensureSpace(30);
      const hasFailure = data.measurements.some(
        (measurement) => measurement.pass_fail === false,
      );
      const conclusion =
        data.calibration.result_status === 'Fail' || hasFailure
          ? 'KHÔNG ĐẠT'
          : 'ĐẠT';
      doc
        .font(font)
        .fontSize(10)
        .fillColor(conclusion === 'ĐẠT' ? '#047857' : '#b91c1c')
        .text(`KẾT LUẬN: ${conclusion}`, left, y, { width: CONTENT_WIDTH });
      y += 20;

      doc
        .font(font)
        .fontSize(8)
        .fillColor('#6b7280')
        .text(
          'Kết quả hiệu chuẩn chỉ có giá trị cho thiết bị và điều kiện đo nêu trên tại thời điểm thực hiện.',
          left,
          y,
          { width: CONTENT_WIDTH },
        );
      y += 20;

      // ===== Signatures =====
      const boxHeight = 118;
      ensureSpace(boxHeight + 34);
      const gap = 24;
      const boxWidth = (CONTENT_WIDTH - gap) / 2;

      const drawSignatureBox = (
        x: number,
        title: string,
        name: string | null,
        options?: {
          signedAt?: Date | string | null;
          transactionId?: string | null;
          documentHash?: string | null;
          highlight?: boolean;
        },
      ) => {
        doc
          .rect(x, y, boxWidth, boxHeight)
          .lineWidth(0.7)
          .strokeColor('#cbd5e1')
          .stroke();

        doc
          .font(font)
          .fontSize(8.5)
          .fillColor('#4b5563')
          .text(title, x + 8, y + 8, { width: boxWidth - 16, align: 'center' });

        doc
          .fontSize(11)
          .fillColor(options?.highlight ? '#1d4ed8' : '#111827')
          .text(name ?? '(Chưa cập nhật)', x + 8, y + 30, {
            width: boxWidth - 16,
            align: 'center',
          });

        doc
          .moveTo(x + 26, y + 56)
          .lineTo(x + boxWidth - 26, y + 56)
          .lineWidth(0.6)
          .strokeColor('#cbd5e1')
          .stroke();

        if (options?.signedAt) {
          doc
            .fontSize(8)
            .fillColor('#047857')
            .text('Đã ký số', x + 8, y + 62, {
              width: boxWidth - 16,
              align: 'center',
            });
          doc
            .fontSize(7.5)
            .fillColor('#4b5563')
            .text(formatDateTime(options.signedAt), x + 8, y + 74, {
              width: boxWidth - 16,
              align: 'center',
            });
          if (options.transactionId) {
            doc.text(options.transactionId, x + 8, y + 86, {
              width: boxWidth - 16,
              align: 'center',
            });
          }
          if (options.documentHash) {
            doc.text(options.documentHash.slice(0, 32), x + 8, y + 97, {
              width: boxWidth - 16,
              align: 'center',
            });
          }
        } else {
          doc
            .fontSize(8)
            .fillColor('#9ca3af')
            .text('(Chưa ký)', x + 8, y + 66, {
              width: boxWidth - 16,
              align: 'center',
            });
        }
      };

      drawSignatureBox(
        left,
        'NGƯỜI THỰC HIỆN',
        data.calibration.technician_name,
      );
      drawSignatureBox(
        left + boxWidth + gap,
        'NGƯỜI PHÁT HÀNH CHỨNG NHẬN',
        data.signature?.signer_name ?? data.calibration.reviewer_name,
        {
          signedAt: data.signature?.signed_at ?? null,
          transactionId: data.signature?.provider_transaction_id ?? null,
          documentHash: data.signature?.document_hash ?? null,
          highlight: Boolean(data.signature),
        },
      );

      y += boxHeight + 12;

      // ===== Footer =====
      const pages = doc.bufferedPageRange();
      for (
        let pageIndex = pages.start;
        pageIndex < pages.start + pages.count;
        pageIndex += 1
      ) {
        doc.switchToPage(pageIndex);
        doc
          .font(font)
          .fontSize(7.5)
          .fillColor('#9ca3af')
          .text(
            `Chứng nhận ${data.certificate.certificate_no}  ·  Trang ${pageIndex + 1}/${pages.count}  ·  Tra cứu tính xác thực bằng số chứng nhận trên hệ thống ISOCAL`,
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

export const saveCertificatePdf = async (
  data: CertificatePdfData,
): Promise<{ fileUrl: string; hash: string; absolutePath: string }> => {
  const buffer = await generateCertificatePdfBuffer(data);
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');

  const storageDir = path.resolve(process.cwd(), 'storage', 'certificates');
  fs.mkdirSync(storageDir, { recursive: true });

  const safeNo = data.certificate.certificate_no.replace(/[^A-Za-z0-9_-]/g, '_');
  const fileName = `certificate-${safeNo}.pdf`;
  const absolutePath = path.join(storageDir, fileName);
  fs.writeFileSync(absolutePath, buffer);

  return {
    fileUrl: path.posix.join('storage', 'certificates', fileName),
    hash,
    absolutePath,
  };
};

export const getCertificateAbsolutePath = (fileUrl: string): string =>
  path.resolve(process.cwd(), fileUrl);
