import fs from "node:fs";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb } from "pdf-lib";

const fontPath = path.join(process.cwd(), "assets/fonts/NotoSansTC-Regular.ttf");
const outputPath = path.join(process.cwd(), "tmp-cjk-smoke.pdf");
const text = "測試業務 太平洋房屋員林站前店";

const pdfDoc = await PDFDocument.create();
pdfDoc.registerFontkit(fontkit);
const fontBytes = fs.readFileSync(fontPath);
const font = await pdfDoc.embedFont(fontBytes, { subset: false });
const page = pdfDoc.addPage([595, 842]);

page.drawText(text, {
  x: 48,
  y: 760,
  size: 18,
  font,
  color: rgb(0, 0, 0),
});

fs.writeFileSync(outputPath, await pdfDoc.save({ useObjectStreams: false }));

console.log(JSON.stringify({
  outputPath,
  fontPath,
  fontBytesLength: fontBytes.length,
  fontName: font.name,
  text,
}, null, 2));
