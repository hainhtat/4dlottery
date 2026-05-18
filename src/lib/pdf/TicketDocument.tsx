import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { formatGrandPrize } from "./format-prize";

const gold = "#c9a227";
const navy = "#0f172a";
const slate = "#1e293b";
const muted = "#94a3b8";
const white = "#f8fafc";

const styles = StyleSheet.create({
  page: {
    backgroundColor: navy,
    padding: 14,
    fontFamily: "Helvetica",
  },
  frame: {
    flex: 1,
    borderWidth: 2,
    borderColor: gold,
    padding: 14,
    flexDirection: "column",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  brand: {
    color: gold,
    fontSize: 7,
    letterSpacing: 2.5,
  },
  serial: {
    color: gold,
    fontSize: 7,
    letterSpacing: 0.5,
  },
  title: {
    color: white,
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 2,
  },
  roundName: {
    color: muted,
    fontSize: 8,
    textAlign: "center",
    marginBottom: 10,
  },
  prizeBlock: {
    backgroundColor: slate,
    borderWidth: 1.5,
    borderColor: gold,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 10,
    alignItems: "center",
  },
  prizeLabel: {
    color: gold,
    fontSize: 9,
    letterSpacing: 3,
    marginBottom: 4,
  },
  prizeAmount: {
    color: white,
    fontSize: 22,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  prizeSub: {
    color: muted,
    fontSize: 7,
    marginTop: 2,
  },
  numberBlock: {
    backgroundColor: slate,
    borderWidth: 1,
    borderColor: "#475569",
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginBottom: 10,
    alignItems: "center",
  },
  numberLabel: {
    color: muted,
    fontSize: 7,
    letterSpacing: 2,
    marginBottom: 4,
  },
  number: {
    color: white,
    fontSize: 32,
    fontWeight: "bold",
    letterSpacing: 6,
  },
  details: {
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  detailLabel: {
    width: 58,
    color: "#64748b",
    fontSize: 8,
  },
  detailValue: {
    flex: 1,
    color: white,
    fontSize: 8,
  },
  qrRow: {
    alignItems: "center",
    marginTop: "auto",
    paddingTop: 6,
  },
  qr: {
    width: 72,
    height: 72,
    marginBottom: 4,
  },
  verifyHint: {
    color: muted,
    fontSize: 7,
    textAlign: "center",
    marginBottom: 2,
  },
  verifyId: {
    color: "#64748b",
    fontSize: 6,
    textAlign: "center",
  },
  footer: {
    color: "#475569",
    fontSize: 5.5,
    textAlign: "center",
    marginTop: 6,
  },
});

export interface TicketPdfLabels {
  holder: string;
  contact: string;
  agent: string;
  drawDate: string;
  issued: string;
  grandPrize: string;
  prizeSub: string;
  yourNumber: string;
  officialTicket: string;
  scanVerify: string;
  footer: string;
}

export interface TicketPdfData {
  roundName: string;
  prizeAmount: number;
  number: string;
  buyerName: string;
  buyerContact: string;
  agentName: string;
  drawDate: string;
  issuedAt: string;
  publicId: string;
  qrDataUrl: string;
  labels: TicketPdfLabels;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export function TicketDocument({ tickets }: { tickets: TicketPdfData[] }) {
  return (
    <Document>
      {tickets.map((t, i) => (
        <Page key={i} size="A6" style={styles.page} wrap={false}>
          <View style={styles.frame}>
            <View>
              <View style={styles.topRow}>
                <Text style={styles.brand}>PREMIUM LOTTERY</Text>
                <Text style={styles.serial}>{t.publicId}</Text>
              </View>
              <Text style={styles.title}>{t.labels.officialTicket}</Text>
              <Text style={styles.roundName}>{t.roundName}</Text>

              <View style={styles.prizeBlock}>
                <Text style={styles.prizeLabel}>{t.labels.grandPrize}</Text>
                <Text style={styles.prizeAmount}>{formatGrandPrize(t.prizeAmount)}</Text>
                <Text style={styles.prizeSub}>{t.labels.prizeSub}</Text>
              </View>

              <View style={styles.numberBlock}>
                <Text style={styles.numberLabel}>{t.labels.yourNumber}</Text>
                <Text style={styles.number}>{t.number}</Text>
              </View>

              <View style={styles.details}>
                <DetailRow label={t.labels.holder} value={t.buyerName} />
                <DetailRow label={t.labels.contact} value={t.buyerContact} />
                <DetailRow label={t.labels.agent} value={t.agentName} />
                <DetailRow label={t.labels.drawDate} value={t.drawDate} />
                <DetailRow label={t.labels.issued} value={t.issuedAt} />
              </View>
            </View>

            <View style={styles.qrRow}>
              <Image style={styles.qr} src={t.qrDataUrl} />
              <Text style={styles.verifyHint}>{t.labels.scanVerify}</Text>
              <Text style={styles.verifyId}>ID {t.publicId}</Text>
            </View>

            <Text style={styles.footer}>{t.labels.footer}</Text>
          </View>
        </Page>
      ))}
    </Document>
  );
}
