import PDFDocument from "pdfkit"
import QRCode from "qrcode"

export type CertificatePdfParams = {
  studentName: string
  courseName: string
  certificateId: string
  issueDate: Date
  verificationUrl: string
}

function bufferFromDataUrl(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] || ""
  return Buffer.from(base64, "base64")
}

export async function generateCertificatePdfBuffer(params: CertificatePdfParams): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 48 })

  const chunks: Buffer[] = []
  doc.on("data", (c) => chunks.push(c))

  const qrDataUrl = await QRCode.toDataURL(params.verificationUrl, { margin: 1, scale: 6 })
  const qrBuffer = bufferFromDataUrl(qrDataUrl)

  // Border
  doc.rect(24, 24, doc.page.width - 48, doc.page.height - 48).lineWidth(2).stroke("#111827")
  doc.rect(34, 34, doc.page.width - 68, doc.page.height - 68).lineWidth(1).stroke("#E5E7EB")

  doc.fillColor("#111827")
  doc.fontSize(28).font("Helvetica-Bold").text("Certificate of Completion", { align: "center", valign: "center" })

  doc.moveDown(1.2)
  doc.fontSize(12).font("Helvetica").fillColor("#374151").text("This certifies that", { align: "center" })

  doc.moveDown(0.6)
  doc.fontSize(26).font("Helvetica-Bold").fillColor("#111827").text(params.studentName, { align: "center" })

  doc.moveDown(0.8)
  doc.fontSize(12).font("Helvetica").fillColor("#374151").text("has successfully completed the course", { align: "center" })

  doc.moveDown(0.6)
  doc.fontSize(18).font("Helvetica-Bold").fillColor("#111827").text(params.courseName, { align: "center" })

  doc.moveDown(1.2)
  doc.fontSize(11).font("Helvetica").fillColor("#374151").text(`Issued: ${params.issueDate.toDateString()}`, {
    align: "center",
  })
  doc.moveDown(0.2)
  doc.text(`Certificate ID: ${params.certificateId}`, { align: "center" })

  // QR + verification url
  const qrSize = 120
  const qrX = doc.page.width / 2 - qrSize / 2
  const qrY = doc.page.height - 220
  doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize })

  doc.moveTo(60, qrY + qrSize + 20)
  doc.fontSize(10)
  doc.fillColor("#6B7280")
  doc.text(`Verify at: ${params.verificationUrl}`, 60, qrY + qrSize + 20, { align: "center", width: doc.page.width - 120 })

  doc.end()

  await new Promise<void>((resolve, reject) => {
    doc.on("end", () => resolve())
    doc.on("error", reject)
  })

  return Buffer.concat(chunks)
}

