import { applyPercentageTax, type TaxProvider } from "@/lib/payroll/providers/tax-provider";

/** V1 US flat-percentage tax provider — extensible for ADP/Gusto later. */
export const usTaxProvider: TaxProvider = {
  id: "us-default",
  label: "United States (configurable %)",
  calculateEmployeeTaxes(gross, rates) {
    return applyPercentageTax(gross, rates);
  },
};
