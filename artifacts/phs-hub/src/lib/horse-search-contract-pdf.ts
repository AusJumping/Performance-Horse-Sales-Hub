import { generateContractHtml, openContractPrintWindow } from "./contract-pdf";
import type { ContractPdfData } from "./contract-pdf";

export interface HorseSearchContractPdfData {
  id: number;
  status?: string;
  horseName: string;
  salesPrice?: string | null;
  holdingDepositAmount?: string | null;
  horseDescription?: string | null;
  customClauses?: string | null;
  sellerName?: string | null;
  sellerEmail?: string | null;
  sellerAddress?: string | null;
  sellerPhone?: string | null;
  sellerBankAccountName?: string | null;
  sellerBankBsb?: string | null;
  sellerBankAccount?: string | null;
  buyerName?: string | null;
  buyerEmail?: string | null;
  buyerAddress?: string | null;
  buyerPhone?: string | null;
  fillerName?: string | null;
  fillerEmail?: string | null;
  fillerRole?: string | null;
  buyerSignature?: string | null;
  sellerSignature?: string | null;
  agreedSalesPrice?: boolean;
  agreedHoldingDeposit?: boolean;
  agreedDescription?: boolean;
  agreedSection3?: boolean;
  agreedSection4?: boolean;
  agreedSellerDeclaration?: boolean;
  agreedBuyerDeclaration?: boolean;
  createdAt?: string;
  submittedAt?: string | null;
}

export function openHorseSearchContractPrintWindow(data: HorseSearchContractPdfData): void {
  const contractData: ContractPdfData = {
    horseName: data.horseName,
    salesPrice: data.salesPrice,
    holdingDepositAmount: data.holdingDepositAmount,
    orcText: data.horseDescription,
    customClauses: data.customClauses,
    status: data.status,
    createdAt: data.createdAt,
    submittedAt: data.submittedAt,
    fillerName: data.fillerName,
    fillerEmail: data.fillerEmail,
    fillerRole: data.fillerRole,
    sellerName: data.sellerName,
    sellerEmail: data.sellerEmail,
    sellerAddress: data.sellerAddress,
    sellerPhone: data.sellerPhone,
    sellerBankAccountName: data.sellerBankAccountName,
    sellerBankBsb: data.sellerBankBsb,
    sellerBankAccount: data.sellerBankAccount,
    buyerName: data.buyerName,
    buyerEmail: data.buyerEmail,
    buyerAddress: data.buyerAddress,
    buyerPhone: data.buyerPhone,
    buyerSignature: data.buyerSignature,
    sellerSignature: data.sellerSignature,
  };
  openContractPrintWindow(contractData);
}
