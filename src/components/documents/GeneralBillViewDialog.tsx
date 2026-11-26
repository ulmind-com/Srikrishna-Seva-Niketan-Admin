import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Download, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { MonthlyBillGroup } from "@/services/billing.service";
import { GeneralBillSheet } from "./GeneralBillSheet";

import { formatBillNo } from "@/lib/utils";

interface GeneralBillViewDialogProps {
  bill: MonthlyBillGroup | null;
  onClose: () => void;
  authorizedSignatureUrl?: string | null;
}

export function GeneralBillViewDialog({
  bill,
  onClose,
  authorizedSignatureUrl,
}: GeneralBillViewDialogProps) {
  const [downloading, setDownloading] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!sheetRef.current) {
      window.print();
      return;
    }
    // Print specifically this bill sheet inside an iframe or native window
    const node = sheetRef.current;
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow!.document;
    doc.open();
    doc.write(`
      <!doctype html>
      <html>
        <head>
          <title>Bill - ${bill?.customer_name || "Customer"}</title>
          <style>
            @page { size: portrait; margin: 10mm; }
            body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; background: #fff; color: #111; }
            .bill-sheet { width: 100% !important; max-width: 152mm; margin: 0 auto; min-height: auto !important; box-shadow: none !important; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 6px 8px; font-size: 11px; }
            th { background-color: #f3f4f6; }
          </style>
          <link rel="stylesheet" href="/src/index.css">
        </head>
        <body>
          <div class="print-container">
            ${node.outerHTML}
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow!.focus();
      iframe.contentWindow!.print();
      setTimeout(() => iframe.remove(), 1000);
    }, 400);
  };

  const handleDownloadImage = async () => {
    if (!sheetRef.current || !bill) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(sheetRef.current, {
        pixelRatio: 2.5,
        backgroundColor: "#ffffff",
        cacheBust: true,
      });
      const link = document.createElement("a");
      const cleanName = (bill.customer_name || "Client").replace(/\s+/g, "_");
      link.download = `Bill_${cleanName}_${bill.bill_no != null ? formatBillNo(bill.bill_no) : "SSN"}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Bill downloaded as high-resolution image.");
    } catch (err) {
      console.error("Failed to download bill image:", err);
      toast.error("Could not download bill image.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={Boolean(bill)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[94vh] overflow-y-auto p-4 sm:p-6 bg-muted/20">
        <DialogHeader className="no-print flex flex-row items-center justify-between pb-3 border-b border-border">
          <div>
            <DialogTitle className="text-base font-bold">
              General Bill — {bill?.customer_name}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Official printed pad format with itemized duty details &amp; signatures.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadImage}
              disabled={downloading}
              className="h-8 text-xs gap-1.5"
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Download PDF / PNG
            </Button>
            <Button size="sm" onClick={handlePrint} className="h-8 text-xs gap-1.5">
              <Printer className="h-3.5 w-3.5" />
              Print Bill
            </Button>
          </div>
        </DialogHeader>

        {bill && (
          <div className="py-4 flex justify-center overflow-x-auto">
            <div className="shadow-xl rounded-sm">
              <GeneralBillSheet
                ref={sheetRef}
                bill={bill}
                authorizedSignatureUrl={authorizedSignatureUrl}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
