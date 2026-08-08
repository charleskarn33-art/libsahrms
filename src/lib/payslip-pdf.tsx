import "server-only";
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

const AMOUNT_COL_WIDTH = 72;

const styles = StyleSheet.create({
  page: { padding: 26, fontSize: 9.5, fontFamily: "Times-Roman", color: "#000000" },
  outerBox: { borderWidth: 1.3, borderColor: "#000000" },

  logoSection: { minHeight: 56, justifyContent: "center", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1.3, borderColor: "#000000" },
  companyLogoImg: { height: 34, objectFit: "contain" },
  companyLogoText: { fontSize: 22, fontFamily: "Times-Bold" },

  titleBar: { paddingHorizontal: 14, paddingVertical: 6, borderBottomWidth: 1.3, borderColor: "#000000" },
  titleText: { fontSize: 11, fontFamily: "Times-Bold" },

  infoGrid: { flexDirection: "row", borderBottomWidth: 1.3, borderColor: "#000000" },
  infoCol: { flex: 1, paddingHorizontal: 14, paddingVertical: 10 },
  infoRow: { flexDirection: "row", marginBottom: 2 },
  infoLabelLeft: { width: 128, fontSize: 9.5 },
  infoValue: { fontSize: 9.5, flex: 1 },
  bold: { fontFamily: "Times-Bold" },

  tableSection: { flexDirection: "row" },
  earningsHalf: { flex: 1, borderRightWidth: 1.3, borderColor: "#000000", paddingHorizontal: 14, paddingVertical: 10 },
  deductionsHalf: { flex: 1, paddingHorizontal: 14, paddingVertical: 10 },

  headerRow: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#000000", paddingBottom: 3, marginBottom: 5 },
  headerLabel: { flex: 1, fontSize: 9.5, fontFamily: "Times-Bold" },
  headerAmount: { width: AMOUNT_COL_WIDTH, fontSize: 9.5, fontFamily: "Times-Bold", textAlign: "right" },

  lineRow: { flexDirection: "row", paddingVertical: 2.5 },
  lineLabel: { flex: 1, fontSize: 9.5 },
  lineAmount: { width: AMOUNT_COL_WIDTH, fontSize: 9.5, textAlign: "right" },

  totalRow: { flexDirection: "row", alignItems: "flex-end" },
  totalLabel: { flex: 1, fontSize: 9.5 },
  totalAmountBlock: { width: AMOUNT_COL_WIDTH },
  totalRule: { borderTopWidth: 1, borderColor: "#000000", marginBottom: 2 },
  totalAmount: { fontSize: 9.5, fontFamily: "Times-Bold", textAlign: "right" },
  doubleRule: { marginTop: 2 },
  ruleLine: { borderTopWidth: 0.8, borderColor: "#000000", marginTop: 1.5 },

  netPayRow: { flexDirection: "row", marginTop: 14 },
  netPayLabel: { flex: 1, fontSize: 10.5, fontFamily: "Times-Bold" },
  netPayAmount: { width: AMOUNT_COL_WIDTH, fontSize: 10.5, fontFamily: "Times-Bold", textAlign: "right" },

  nasscorpBox: { marginTop: 14 },
  nasscorpTitle: { fontSize: 9.5, fontFamily: "Times-Bold", marginBottom: 3 },

  footerBar: { minHeight: 26, borderTopWidth: 1.3, borderColor: "#000000" },
});

export interface PayslipPdfData {
  payslipNumber: string;
  company: {
    name: string;
    logoUrl: string | null;
    employeeNasscorpRate: number;
    employerNasscorpRate: number;
  };
  employee: {
    fullName: string;
    employeeNumber: string;
    employmentType: string;
    jobTitle: string | null;
    dateHired: string;
    bankName: string | null;
    bankAccountNumber: string | null;
    orangeMoneyNumber: string | null;
    paymentMethod: string;
    nasscorpNumber: string | null;
    tin: string | null;
  };
  period: {
    label: string;
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
  generatedAt: string;
}

function money(amount: number) {
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function employmentCategoryLabel(type: string) {
  switch (type) {
    case "contract":
      return "Contractor";
    case "intern":
      return "Intern";
    case "temporary":
      return "Temporary Staff";
    default:
      return "Employee";
  }
}

function formatHireDate(dateStr: string) {
  const d = new Date(dateStr);
  const day = d.getDate();
  const month = d.toLocaleString("en-US", { month: "short" });
  return `${day}-${month}-${d.getFullYear()}`;
}

function LineItem({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <View style={styles.lineRow}>
      <Text style={bold ? [styles.lineLabel, styles.bold] : styles.lineLabel}>{label}</Text>
      <Text style={bold ? [styles.lineAmount, styles.bold] : styles.lineAmount}>{money(value)}</Text>
    </View>
  );
}

function TotalLine({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.totalRow}>
      <Text style={styles.totalLabel}>{label}</Text>
      <View style={styles.totalAmountBlock}>
        <View style={styles.totalRule} />
        <Text style={styles.totalAmount}>{money(value)}</Text>
        <View style={styles.doubleRule}>
          <View style={styles.ruleLine} />
          <View style={styles.ruleLine} />
        </View>
      </View>
    </View>
  );
}

function InfoRow({ label, value, labelWidth, bold }: { label: string; value: string; labelWidth: number; bold?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabelLeft, { width: labelWidth }]}>{label}</Text>
      <Text style={bold ? [styles.infoValue, styles.bold] : styles.infoValue}>{value}</Text>
    </View>
  );
}

function PayslipDocument({ data }: { data: PayslipPdfData }) {
  const { company, employee, period, earnings, deductions } = data;
  const isOrangeMoney = employee.paymentMethod === "orange_money";

  const earningLines: { label: string; value: number }[] = [{ label: "Basic pay", value: earnings.basicSalary }];
  if (earnings.housingAllowance) earningLines.push({ label: "Housing Allowance", value: earnings.housingAllowance });
  if (earnings.transportAllowance) earningLines.push({ label: "Transport Allowance", value: earnings.transportAllowance });
  if (earnings.relocationAllowance) earningLines.push({ label: "Relocation Allowance", value: earnings.relocationAllowance });
  if (earnings.bonus) earningLines.push({ label: "Bonus", value: earnings.bonus });
  if (earnings.commission) earningLines.push({ label: "Commission", value: earnings.commission });
  if (earnings.overtimePay) earningLines.push({ label: "Overtime", value: earnings.overtimePay });

  const deductionLines: { label: string; value: number }[] = [
    { label: "Withholding Tax", value: deductions.incomeTax },
    { label: `NASSCORP Contribution -${company.employeeNasscorpRate}%`, value: deductions.employeeNasscorp },
  ];
  if (deductions.loanDeductions) deductionLines.push({ label: "Loan Deductions", value: deductions.loanDeductions });
  if (deductions.otherDeductions) deductionLines.push({ label: "Other Deductions", value: deductions.otherDeductions });
  if (deductions.orangeMoneyFee) deductionLines.push({ label: "Orange Money Fee", value: deductions.orangeMoneyFee });

  const maxLines = Math.max(earningLines.length, deductionLines.length);
  const spacerHeight = Math.max(20, 96 - maxLines * 14);

  const totalNasscorp = deductions.employeeNasscorp + data.employerNasscorp;

  return (
    <Document title={`Payslip ${data.payslipNumber}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.outerBox}>
          <View style={styles.logoSection}>
            {company.logoUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer's Image has no alt prop; this isn't next/image
              <Image src={company.logoUrl} style={styles.companyLogoImg} />
            ) : (
              <Text style={styles.companyLogoText}>{company.name}</Text>
            )}
          </View>

          <View style={styles.titleBar}>
            <Text style={styles.titleText}>END OF MONTH PAYSLIP</Text>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoCol}>
              <InfoRow label="Emp. Category/Status" value={employmentCategoryLabel(employee.employmentType)} labelWidth={128} />
              <InfoRow label="Employment ID No" value={employee.employeeNumber} labelWidth={128} />
              <InfoRow label="Employee Name" value={employee.fullName} labelWidth={128} bold />
              <InfoRow label="Job Title" value={employee.jobTitle ?? "—"} labelWidth={128} />
              <InfoRow label="Date of Hire" value={formatHireDate(employee.dateHired)} labelWidth={128} />
            </View>
            <View style={styles.infoCol}>
              <InfoRow label="Period:" value={period.label.toUpperCase()} labelWidth={92} />
              {isOrangeMoney ? (
                <>
                  <InfoRow label="Payment Method" value="Orange Money" labelWidth={92} />
                  <InfoRow label="Orange Money #" value={employee.orangeMoneyNumber ?? "—"} labelWidth={92} />
                </>
              ) : (
                <>
                  <InfoRow label="Bank" value={employee.bankName ?? "—"} labelWidth={92} />
                  <InfoRow label="Bank Account" value={employee.bankAccountNumber ?? "—"} labelWidth={92} />
                </>
              )}
              <InfoRow label="NASSCORP No." value={employee.nasscorpNumber ?? "—"} labelWidth={92} />
              <InfoRow label="TIN" value={employee.tin ?? "—"} labelWidth={92} />
            </View>
          </View>

          <View style={styles.tableSection}>
            <View style={styles.earningsHalf}>
              <View style={styles.headerRow}>
                <Text style={styles.headerLabel}>EARNINGS</Text>
                <Text style={styles.headerAmount}>AMOUNT ({data.currency})</Text>
              </View>
              {earningLines.map((line) => (
                <LineItem key={line.label} label={line.label} value={line.value} />
              ))}
              <View style={{ height: spacerHeight }} />
              <TotalLine label="Gross income" value={earnings.grossSalary} />
              <View style={styles.netPayRow}>
                <Text style={styles.netPayLabel}>End of month net pay - {data.currency}</Text>
                <Text style={styles.netPayAmount}>{money(data.netSalary)}</Text>
              </View>
            </View>

            <View style={styles.deductionsHalf}>
              <View style={styles.headerRow}>
                <Text style={styles.headerLabel}>DEDUCTIONS</Text>
                <Text style={styles.headerAmount}>AMOUNT ({data.currency})</Text>
              </View>
              {deductionLines.map((line) => (
                <LineItem key={line.label} label={line.label} value={line.value} />
              ))}
              <View style={{ height: spacerHeight }} />
              <TotalLine label="Total deductions" value={deductions.totalDeductions} />
              <View style={styles.nasscorpBox}>
                <Text style={styles.nasscorpTitle}>NASSCORP CONTRIBUTION</Text>
                <LineItem label={`${company.employeeNasscorpRate}% EMPLOYEE`} value={deductions.employeeNasscorp} />
                <LineItem label={`${company.employerNasscorpRate}% EMPLOYER`} value={data.employerNasscorp} />
                <LineItem label="TOTAL CONTRIBUTION" value={totalNasscorp} bold />
              </View>
            </View>
          </View>

          <View style={styles.footerBar} />
        </View>
      </Page>
    </Document>
  );
}

export async function renderPayslipPdf(data: PayslipPdfData): Promise<Buffer> {
  return renderToBuffer(<PayslipDocument data={data} />);
}
