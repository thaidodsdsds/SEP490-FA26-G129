import crypto from 'node:crypto';
import { EntityManager } from 'typeorm';
import { ERROR_CODES } from '../../common/constants.js';
import { AppError } from '../../common/errors.js';
import dataSource from '../../database/dataSource.js';
import {
  Contract,
  DigitalSignature,
} from '../../database/entities.js';
import { saveSignedContractPdf } from './contract-pdf.service.js';

export const COMPANY_SIGNATURE_PURPOSE = 'CompanyApproval';
export const CUSTOMER_SIGNATURE_PURPOSE = 'CustomerApproval';

const SIGNATURE_PROVIDER = 'ISOCAL eSign';

export interface ContractSignatureInfo {
  id: number;
  purpose: string;
  signer_id: number;
  signer_name: string;
  signer_email: string | null;
  signer_role: string | null;
  provider: string | null;
  provider_transaction_id: string | null;
  document_hash: string;
  signed_file_url: string | null;
  status: string;
  signed_at: Date | null;
}

const mapSignature = (signature: DigitalSignature): ContractSignatureInfo => ({
  id: signature.id,
  purpose: signature.purpose,
  signer_id: signature.signer_id,
  signer_name: signature.signer?.full_name ?? '',
  signer_email: signature.signer?.email ?? null,
  signer_role: signature.signer?.role?.name ?? null,
  provider: signature.provider ?? null,
  provider_transaction_id: signature.provider_transaction_id ?? null,
  document_hash: signature.document_hash,
  signed_file_url: signature.signed_file_url ?? null,
  status: signature.status,
  signed_at: signature.signed_at ?? null,
});

export const listContractSignatures = async (
  contractId: number,
): Promise<ContractSignatureInfo[]> => {
  const signatures = await dataSource.getRepository(DigitalSignature).find({
    where: { contract_id: contractId },
    relations: { signer: { role: true } },
    order: { id: 'ASC' },
  });

  return signatures.map(mapSignature);
};

const buildSnapshotHash = (contract: Contract): string => {
  const payload = {
    contract_id: contract.id,
    contract_code: contract.contract_code,
    title: contract.title,
    status: contract.status,
    customer_id: contract.customer_id,
    sign_date: contract.sign_date,
    total_amount: contract.total_amount,
    party_a_name: contract.party_a_name,
    party_a_representative: contract.party_a_representative,
    party_b_name: contract.party_b_name,
    party_b_representative: contract.party_b_representative,
    items: [...(contract.items ?? [])]
      .sort((left, right) => left.line_no - right.line_no)
      .map((item) => ({
        line_no: item.line_no,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.amount,
      })),
  };

  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
};

const generateTransactionId = (): string => {
  const year = new Date().getFullYear();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `SIG-${year}-${random}`;
};

export const createSignatureRecord = async (
  manager: EntityManager,
  contract: Contract,
  purpose: typeof COMPANY_SIGNATURE_PURPOSE | typeof CUSTOMER_SIGNATURE_PURPOSE,
  signerId: number,
): Promise<DigitalSignature> => {
  const repository = manager.getRepository(DigitalSignature);
  const existing = await repository.findOne({
    where: { contract_id: contract.id, purpose },
  });

  if (existing) {
    const label =
      purpose === COMPANY_SIGNATURE_PURPOSE ? 'Bên B' : 'Bên A';
    throw new AppError(
      `Hợp đồng đã có chữ ký ${label}. Không thể ký lại.`,
      409,
      ERROR_CODES.CONFLICT,
    );
  }

  const signedAt = new Date();
  const signature = repository.create({
    contract_id: contract.id,
    purpose,
    signer_id: signerId,
    provider: SIGNATURE_PROVIDER,
    provider_transaction_id: generateTransactionId(),
    document_hash: buildSnapshotHash(contract),
    signed_file_url: null,
    status: 'Signed',
    signed_at: signedAt,
    created_at: signedAt,
  });

  return repository.save(signature);
};

export const hasSignature = async (
  contractId: number,
  purpose: string,
): Promise<boolean> => {
  const count = await dataSource.getRepository(DigitalSignature).count({
    where: { contract_id: contractId, purpose },
  });
  return count > 0;
};

export const finalizeSignedContract = async (
  contractId: number,
): Promise<void> => {
  await saveSignedContractPdf(contractId);
};
