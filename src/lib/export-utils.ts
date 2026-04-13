import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Exports data to an Excel file (.xlsx)
 * @param data Array of objects to export
 * @param fileName Name of the file (without extension)
 * @param sheetName Name of the worksheet
 */
export const exportToExcel = (data: any[], fileName: string, sheetName: string = 'Sheet1') => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

/**
 * Exports data to a PDF file (.pdf)
 * @param title Title of the PDF document
 * @param headers Array of column headers
 * @param data Array of arrays representing table rows
 * @param fileName Name of the file (without extension)
 */
export const exportToPDF = (
    title: string,
    headers: string[],
    data: any[][],
    fileName: string,
    subtitle?: string
) => {
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text(title, 14, 22);

    // Add subtitle if provided
    if (subtitle) {
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(subtitle, 14, 30);
    }

    // Add timestamp
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, subtitle ? 36 : 30);

    // Create table
    autoTable(doc, {
        head: [headers],
        body: data,
        startY: subtitle ? 42 : 36,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { top: 40 },
    });

    doc.save(`${fileName}.pdf`);
};
