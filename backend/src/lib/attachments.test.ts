import { describe, expect, it } from "vitest";
import { attachmentHash, detectAttachment, safeOriginalName } from "./attachments.js";

describe("transaction attachments", () => {
  it("detects supported file signatures", () => {
    expect(detectAttachment(Buffer.from("%PDF-1.7"))?.mimeType).toBe("application/pdf");
    expect(detectAttachment(Buffer.from([0xff, 0xd8, 0xff, 0x00]))?.extension).toBe(".jpg");
    expect(detectAttachment(Buffer.from("arquivo falso"))).toBeNull();
  });
  it("removes directory traversal from original names", () => {
    expect(safeOriginalName("../../comprovante.pdf")).toBe("comprovante.pdf");
  });
  it("creates stable SHA-256 hashes", () => {
    expect(attachmentHash(Buffer.from("teste"))).toHaveLength(64);
    expect(attachmentHash(Buffer.from("teste"))).toBe(attachmentHash(Buffer.from("teste")));
  });
});
