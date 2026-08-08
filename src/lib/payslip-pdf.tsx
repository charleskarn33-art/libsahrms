import "server-only";
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { qrCodeDataUri } from "@/lib/payslip";

const COLORS = {
  primary: "#0057FF",
  secondary: "#00B894",
  danger: "#E53935",
  text: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
  bg: "#F8FAFC",
};

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9, color: COLORS.text, fontFamily: "Helvetica" },
  watermark: {
    position: "absolute",
    top: 320,
    left: 90,
    fontSize: 64,
    color: "#EEF3FF",
    transform: "rotate(-35deg)",
    zIndex: -1,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 },
  companyName: { fontSize: 16, fontWeight: 700, color: COLORS.primary },
  companySub: { fontSize: 8, color: COLORS.muted, marginTop: 2 },
  payslipTitle: { fontSize: 14, fontWeight: 700, textAlign: "right" },
  payslipNumber: { fontSize: 8, color: COLORS.muted, textAlign: "right", marginTop: 2 },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoCell: { width: "33%", marginBottom: 8 },
  infoLabel: { fontSize: 7, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  infoValue: { fontSize: 9.5, fontWeight: 700, marginTop: 2 },
  sectionTitle: { fontSize: 10, fontWeight: 700, marginBottom: 6, marginTop: 4 },
  table: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, overflow: "hidden", marginBottom: 14 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingVertical: 6, paddingHorizontal: 10 },
  tableRowLast: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 10, backgroundColor: COLORS.bg },
  tableLabel: { flex: 1, color: COLORS.muted },
  tableValue: { width: 90, textAlign: "right", fontWeight: 700 },
  twoCol: { flexDirection: "row", gap: 14 },
  col: { flex: 1 },
  netBox: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  netLabel: { color: "#FFFFFF", fontSize: 10 },
  netValue: { color: "#FFFFFF", fontSize: 18, fontWeight: 700 },
  footerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 24 },
  signatureLine: { width: 160, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 4, fontSize: 8, color: COLORS.muted },
  qrBlock: { alignItems: "center" },
  qrCaption: { fontSize: 6, color: COLORS.muted, marginTop: 4, width: 90, textAlign: "center" },
  disclaimer: { fontSize: 7, color: COLORS.muted, marginTop: 18, textAlign: "center" },
});

export interface PayslipPdfData {
  payslipNumber: string;
  company: {
    name: string;
    address: string | null;
    logoUrl: string | null;
  };
  employee: {
    fullName: string;
    employeeNumber: string;
    department: string | null;
    position: string | null;
    bankName: string | null;
    bankAccountNumber: string | null;
    orangeMoneyNumber: string | null;
    paymentMethod: string;
  };
  period: {
    label: string;
    paymentDate: string | null;
  };
  currency: string;
  earnings: {
    basicSalary: number;
    housingAllowance: number;
    transportAllowance: number;
    relocationAllowance: number;
    bonus: number;
    commission: number;
    overtimePay: number;
    grossSalary: number;
  };
  deductions: {
    employeeNasscorp: number;
    incomeTax: number;
    loanDeductions: number;
    otherDeductions: number;
    orangeMoneyFee: number;
    totalDeductions: number;
  };
  employerNasscorp: number;
  netSalary: number;
  qrCodeData: string;
  generatedAt: string;
}

function money(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function PayslipDocument({ data, qrDataUri }: { data: PayslipPdfData; qrDataUri: string }) {
  const { company, employee, period, currency, earnings, deductions } = data;

  return (
    <Document title={`Payslip ${data.payslipNumber}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.watermark}>{company.name.toUpperCase()}</Text>

        <View style={styles.headerRow}>
          <View>
            {company.logoUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer's Image has no alt prop; this isn't next/image
              <Image src={company.logoUrl} style={{ width: 100, height: 32, objectFit: "contain", marginBottom: 6 }} />
            ) : (
              <Text style={styles.companyName}>{company.name}</Text>
            )}
            {company.address && <Text style={styles.companySub}>{company.address}</Text>}
          </View>
          <View>
            <Text style={styles.payslipTitle}>PAYSLIP</Text>
            <Text style={styles.payslipNumber}>{data.payslipNumber}</Text>
            <Text style={styles.payslipNumber}>{period.label}</Text>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>Employee Name</Text>
            <Text style={styles.infoValue}>{employee.fullName}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>Employee Number</Text>
            <Text style={styles.infoValue}>{employee.employeeNumber}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>Department</Text>
            <Text style={styles.infoValue}>{employee.department ?? "—"}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>Position</Text>
            <Text style={styles.infoValue}>{employee.position ?? "—"}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>Payroll Month</Text>
            <Text style={styles.infoValue}>{period.label}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>Payment Date</Text>
            <Text style={styles.infoValue}>{period.paymentDate ?? "—"}</Text>
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Earnings</Text>
            <View style={styles.table}>
              <Row label="Basic Salary" value={money(earnings.basicSalary, currency)} />
              <Row label="Housing Allowance" value={money(earnings.housingAllowance, currency)} />
              <Row label="Transport Allowance" value={money(earnings.transportAllowance, currency)} />
              <Row label="Relocation Allowance" value={money(earnings.relocationAllowance, currency)} />
              <Row label="Bonus" value={money(earnings.bonus, currency)} />
              <Row label="Commission" value={money(earnings.commission, currency)} />
              <Row label="Overtime Pay" value={money(earnings.overtimePay, currency)} />
              <Row label="Gross Salary" value={money(earnings.grossSalary, currency)} last />
            </View>
          </View>

          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Deductions</Text>
            <View style={styles.table}>
              <Row label="Employee NASSCORP (4%)" value={money(deductions.employeeNasscorp, currency)} />
              <Row label="Income Tax (WHT)" value={money(deductions.incomeTax, currency)} />
              <Row label="Loan Deductions" value={money(deductions.loanDeductions, currency)} />
              <Row label="Other Deductions" value={money(deductions.otherDeductions, currency)} />
              <Row label="Orange Money Fee" value={money(deductions.orangeMoneyFee, currency)} />
              <Row label="Total Deductions" value={money(deductions.totalDeductions, currency)} last />
            </View>

            <Text style={styles.sectionTitle}>Employer Contribution</Text>
            <View style={styles.table}>
              <Row label="Employer NASSCORP (6%)" value={money(data.employerNasscorp, currency)} last />
            </View>
          </View>
        </View>

        <View style={styles.netBox}>
          <Text style={styles.netLabel}>Net Salary</Text>
          <Text style={styles.netValue}>{money(data.netSalary, currency)}</Text>
        </View>

        <Text style={styles.sectionTitle}>Bank Details</Text>
        <View style={styles.table}>
          <Row label="Payment Method" value={employee.paymentMethod.replace("_", " ")} />
          {employee.paymentMethod === "orange_money" ? (
            <Row label="Orange Money Number" value={employee.orangeMoneyNumber ?? "—"} last />
          ) : (
            <>
              <Row label="Bank Name" value={employee.bankName ?? "—"} />
              <Row label="Account Number" value={employee.bankAccountNumber ?? "—"} last />
            </>
          )}
        </View>

        <View style={styles.footerRow}>
          <View style={styles.signatureLine}>
            <Text>Authorized Signature — Human Resources</Text>
          </View>
          <View style={styles.qrBlock}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer's Image has no alt prop; this isn't next/image */}
            <Image src={qrDataUri} style={{ width: 56, height: 56 }} />
            <Text style={styles.qrCaption}>Scan to verify this payslip</Text>
          </View>
        </View>

        <Text style={styles.disclaimer}>
          This is a computer-generated payslip and does not require a physical signature. Generated on {data.generatedAt}.
          Confidential — for the named employee only.
        </Text>
      </Page>
    </Document>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={last ? styles.tableRowLast : styles.tableRow}>
      <Text style={styles.tableLabel}>{label}</Text>
      <Text style={last ? [styles.tableValue, { color: COLORS.primary }] : styles.tableValue}>{value}</Text>
    </View>
  );
}

export async function renderPayslipPdf(data: PayslipPdfData): Promise<Buffer> {
  const qrDataUri = await qrCodeDataUri(data.qrCodeData);
  return renderToBuffer(<PayslipDocument data={data} qrDataUri={qrDataUri} />);
}
