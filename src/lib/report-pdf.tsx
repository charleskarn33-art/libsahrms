import "server-only";
import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

const COLORS = {
  primary: "#0057FF",
  text: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
  bg: "#F8FAFC",
};

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 8.5, color: COLORS.text, fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  companyName: { fontSize: 13, fontWeight: 700, color: COLORS.primary },
  title: { fontSize: 12, fontWeight: 700, textAlign: "right" },
  subtitle: { fontSize: 8, color: COLORS.muted, textAlign: "right", marginTop: 2 },
  table: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, overflow: "hidden" },
  headRow: { flexDirection: "row", backgroundColor: COLORS.primary, paddingVertical: 6, paddingHorizontal: 8 },
  headCell: { fontSize: 7.5, fontWeight: 700, color: "#FFFFFF", textTransform: "uppercase" },
  row: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  rowAlt: { backgroundColor: COLORS.bg },
  cell: { fontSize: 8 },
  totalsRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopWidth: 1.5,
    borderTopColor: COLORS.primary,
    backgroundColor: "#EEF3FF",
  },
  totalsCell: { fontSize: 8, fontWeight: 700, color: COLORS.primary },
  footer: { position: "absolute", bottom: 20, left: 32, right: 32, fontSize: 7, color: COLORS.muted, textAlign: "center" },
});

export interface ReportPdfColumn {
  key: string;
  label: string;
  align?: "left" | "right";
  width?: number;
}

export interface ReportPdfData {
  title: string;
  subtitle?: string;
  companyName: string;
  generatedAt: string;
  columns: ReportPdfColumn[];
  rows: Record<string, string>[];
  totalsRow?: Record<string, string>;
}

function ReportDocument({ data }: { data: ReportPdfData }) {
  const { title, subtitle, companyName, generatedAt, columns, rows, totalsRow } = data;
  const flexOf = (c: ReportPdfColumn) => c.width ?? 1;

  return (
    <Document title={title}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.headerRow}>
          <Text style={styles.companyName}>{companyName}</Text>
          <View>
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.headRow}>
            {columns.map((c) => (
              <Text key={c.key} style={[styles.headCell, { flex: flexOf(c), textAlign: c.align ?? "left" }]}>
                {c.label}
              </Text>
            ))}
          </View>
          {rows.map((row, i) => (
            <View key={i} style={i % 2 === 1 ? [styles.row, styles.rowAlt] : styles.row}>
              {columns.map((c) => (
                <Text key={c.key} style={[styles.cell, { flex: flexOf(c), textAlign: c.align ?? "left" }]}>
                  {row[c.key] ?? ""}
                </Text>
              ))}
            </View>
          ))}
          {totalsRow && (
            <View style={styles.totalsRow}>
              {columns.map((c) => (
                <Text key={c.key} style={[styles.totalsCell, { flex: flexOf(c), textAlign: c.align ?? "left" }]}>
                  {totalsRow[c.key] ?? ""}
                </Text>
              ))}
            </View>
          )}
        </View>

        <Text style={styles.footer} fixed>
          Generated on {generatedAt} by LIBSA HRMS — Confidential
        </Text>
      </Page>
    </Document>
  );
}

export async function renderReportPdf(data: ReportPdfData): Promise<Buffer> {
  return renderToBuffer(<ReportDocument data={data} />);
}
