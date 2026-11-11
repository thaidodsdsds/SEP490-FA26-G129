import type { NextFunction, Request, Response } from 'express';
import fs from 'node:fs';
import { ERROR_CODES } from '../../common/constants.js';
import { AppError } from '../../common/errors.js';
import { buildSuccessResponse } from '../../common/response.js';
import {
  approveContract,
  buildContractPrefill,
  cancelContract,
  createContract,
  getContractDetail,
  getDefaultCompanyProfile,
  getNextContractCode,
  liquidateContract,
  listAvailableQuotations,
  listContracts,
  signContractAsCustomer,
  submitContract,
  updateContract,
  type ContractActor,
  type CreateContractInput,
  type UpdateContractInput,
} from './contracts.service.js';
import { getSignedContractAbsolutePath } from './contract-pdf.service.js';
import { resolveAccountCustomerId } from '../service-requests/service-requests.service.js';

const getActor = (req: Request): ContractActor => {
  const user =
    typeof req.user === 'object' && req.user !== null
      ? (req.user as { id?: unknown; role?: unknown; customer_id?: unknown })
      : {};

  const id = Number(user.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError('Không xác định được người dùng.', 401, ERROR_CODES.UNAUTHORIZED);
  }

  return { id, role: String(user.role ?? '') };
};

const resolveCustomerFilter = async (req: Request): Promise<number | undefined> => {
  const user =
    typeof req.user === 'object' && req.user !== null
      ? (req.user as { id?: unknown; role?: unknown; customer_id?: unknown })
      : {};

  if (String(user.role ?? '').toLowerCase() !== 'customer') {
    return undefined;
  }

  const tokenCustomerId = Number(user.customer_id);
  if (Number.isInteger(tokenCustomerId) && tokenCustomerId > 0) {
    return tokenCustomerId;
  }

  const resolved = await resolveAccountCustomerId(Number(user.id));
  return resolved ?? undefined;
};

const parseContractBody = (body: unknown): CreateContractInput => {
  const payload = (body ?? {}) as Record<string, unknown>;

  return {
    quotation_id: Number(payload.quotation_id),
    contract_code: String(payload.contract_code ?? ''),
    title: payload.title as string | null | undefined,
    sign_date: payload.sign_date as string | null | undefined,
    start_date: payload.start_date as string | null | undefined,
    end_date: payload.end_date as string | null | undefined,
    duration_days: payload.duration_days as number | null | undefined,
    location: payload.location as string | null | undefined,
    payment_term_days: payload.payment_term_days as number | undefined,
    legal_basis: payload.legal_basis as string | null | undefined,
    notes: payload.notes as string | null | undefined,
    travel_fee: payload.travel_fee as number | undefined,
    party_a: (payload.party_a ?? {}) as CreateContractInput['party_a'],
    party_b: (payload.party_b ?? {}) as CreateContractInput['party_b'],
    items: (payload.items ?? []) as CreateContractInput['items'],
  };
};

const parseUpdateContractBody = (body: unknown): UpdateContractInput => {
  const input: Partial<CreateContractInput> = { ...parseContractBody(body) };
  delete input.quotation_id;
  return input as UpdateContractInput;
};

export const getNextContractCodeHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const code = await getNextContractCode();
    res.status(200).json(buildSuccessResponse({ contract_code: code }));
  } catch (error) {
    next(error);
  }
};

export const getCompanyProfileHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const profile = await getDefaultCompanyProfile();
    res.status(200).json(buildSuccessResponse(profile));
  } catch (error) {
    next(error);
  }
};

export const listAvailableQuotationsHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const quotations = await listAvailableQuotations();
    res.status(200).json(buildSuccessResponse(quotations));
  } catch (error) {
    next(error);
  }
};

export const getContractPrefillHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const quotationId = Number(req.query.quotation_id ?? req.params.quotationId);
    if (!Number.isInteger(quotationId) || quotationId <= 0) {
      throw new AppError('quotation_id không hợp lệ.', 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const prefill = await buildContractPrefill(quotationId);
    res.status(200).json(buildSuccessResponse(prefill));
  } catch (error) {
    next(error);
  }
};

export const listContractsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const customerFilter = await resolveCustomerFilter(req);
    const all = await listContracts();

    if (customerFilter === undefined) {
      res.status(200).json(buildSuccessResponse(all));
      return;
    }

    res.status(200).json(
      buildSuccessResponse(all.filter((contract) => contract.customer_id === customerFilter)),
    );
  } catch (error) {
    next(error);
  }
};

export const getContractDetailHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const contractId = Number(req.params.contractId);
    if (!Number.isInteger(contractId) || contractId <= 0) {
      throw new AppError('contractId không hợp lệ.', 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const customerFilter = await resolveCustomerFilter(req);
    const actor = getActor(req);
    const detail = await getContractDetail(contractId, actor, customerFilter);
    res.status(200).json(buildSuccessResponse(detail));
  } catch (error) {
    next(error);
  }
};

export const createContractHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const actor = getActor(req);
    const input = parseContractBody(req.body);
    const contract = await createContract(input, actor);
    res.status(201).json(buildSuccessResponse(contract));
  } catch (error) {
    next(error);
  }
};

export const updateContractHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const contractId = Number(req.params.contractId);
    if (!Number.isInteger(contractId) || contractId <= 0) {
      throw new AppError('contractId không hợp lệ.', 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const actor = getActor(req);
    const input = parseUpdateContractBody(req.body);
    const contract = await updateContract(contractId, input, actor);
    res.status(200).json(buildSuccessResponse(contract));
  } catch (error) {
    next(error);
  }
};

const runTransition = async (
  req: Request,
  res: Response,
  next: NextFunction,
  action: (id: number, actor: ContractActor) => Promise<unknown>,
): Promise<void> => {
  try {
    const contractId = Number(req.params.contractId);
    if (!Number.isInteger(contractId) || contractId <= 0) {
      throw new AppError('contractId không hợp lệ.', 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const actor = getActor(req);
    const contract = await action(contractId, actor);
    res.status(200).json(buildSuccessResponse(contract));
  } catch (error) {
    next(error);
  }
};

export const submitContractHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => runTransition(req, res, next, submitContract);

export const approveContractHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => runTransition(req, res, next, approveContract);

export const cancelContractHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => runTransition(req, res, next, cancelContract);

export const liquidateContractHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => runTransition(req, res, next, liquidateContract);

export const customerSignContractHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const contractId = Number(req.params.contractId);
    if (!Number.isInteger(contractId) || contractId <= 0) {
      throw new AppError('contractId không hợp lệ.', 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const actor = getActor(req);
    const customerFilter = await resolveCustomerFilter(req);
    const contract = await signContractAsCustomer(contractId, actor, customerFilter);
    res.status(200).json(buildSuccessResponse(contract));
  } catch (error) {
    next(error);
  }
};

export const getSignedContractFileHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const contractId = Number(req.params.contractId);
    if (!Number.isInteger(contractId) || contractId <= 0) {
      throw new AppError('contractId không hợp lệ.', 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const actor = getActor(req);
    const customerFilter = await resolveCustomerFilter(req);
    const contract = await getContractDetail(contractId, actor, customerFilter);

    if (!contract.signed_file_url) {
      throw new AppError(
        'Hợp đồng chưa có file PDF đã ký. Vui lòng hoàn tất ký hai bên trước.',
        404,
        ERROR_CODES.NOT_FOUND,
      );
    }

    const filePath = getSignedContractAbsolutePath(contract.signed_file_url);
    if (!fs.existsSync(filePath)) {
      throw new AppError('File PDF đã ký không tồn tại trên máy chủ.', 404, ERROR_CODES.NOT_FOUND);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="contract-${contractId}-signed.pdf"`,
    );
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
};
