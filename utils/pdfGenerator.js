const puppeteer = require('puppeteer');

/**
 * Generates a PDF ledger with running balance.
 * 
 * @param {Array} transactions - List of transaction objects (sorted by date ASC).
 * @param {string} title - Title of the report.
 * @param {string} type - 'CASH' or 'SILVER'.
 * @returns {Promise<Buffer>} - The generated PDF buffer.
 */
const generateLedgerPDF = async (transactions, title, type) => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  // Calculate running balance and prepare data
  let balance = 0;
  const rows = transactions.map(t => {
    const isJama = t.type === 'JAMA';

    // Determine the value based on report type
    // For Cash: uses 'amount'
    // For Silver: uses 'totalSilver' (assuming fine weight) or 'silverWeight'
    let value = 0;
    if (type === 'CASH') {
      value = parseFloat(t.amount || 0);
    } else {
      // For Silver, try totalSilver first, then silverWeight
      value = parseFloat(t.totalSilver || t.silverWeight || 0);
    }

    if (isJama) {
      balance += value;
    } else {
      balance -= value;
    }

    return {
      date: new Date(t.date).toLocaleDateString('en-IN'),
      name: t.name,
      description: t.description || '-',
      type: t.type,
      formNo: t.formNo || '-',
      grossWeight: t.grossWeight ? parseFloat(t.grossWeight).toFixed(3) : '-',
      touch: t.touch ? parseFloat(t.touch).toFixed(2) : '-',
      credit: isJama ? value.toFixed(3) : '-',
      debit: !isJama ? value.toFixed(3) : '-',
      balance: balance.toFixed(3)
    };
  });

  const isSilver = type === 'SILVER';
  const colSpan = isSilver ? 9 : 6; // Adjusted colspan for footer

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; font-size: 10px; }
        h2 { text-align: center; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
        th { background-color: #f2f2f2; }
        .text-right { text-align: right; }
        .bold { font-weight: bold; }
        .jama { color: green; }
        .kharcha { color: red; }
      </style>
    </head>
    <body>
      <h2>${title}</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Name</th>
            <th>Description</th>
            ${isSilver ? '<th>Form No</th><th>G Weight</th><th>Touch</th>' : ''}
            <th>Type</th>
            <th class="text-right">Jama (+)</th>
            <th class="text-right">Kharcha (-)</th>
            <th class="text-right">Balance</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr>
              <td>${row.date}</td>
              <td>${row.name}</td>
              <td>${row.description}</td>
              ${isSilver ? `<td>${row.formNo}</td><td>${row.grossWeight}</td><td>${row.touch}</td>` : ''}
              <td>${row.type}</td>
              <td class="text-right ${row.credit !== '-' ? 'jama' : ''}">${row.credit}</td>
              <td class="text-right ${row.debit !== '-' ? 'kharcha' : ''}">${row.debit}</td>
              <td class="text-right bold">${row.balance}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
           <tr>
             <td colspan="${colSpan}" class="text-right bold">Final Balance</td>
             <td class="text-right bold">${balance.toFixed(3)}</td>
           </tr>
        </tfoot>
      </table>
      <div style="margin-top: 20px; text-align: right; font-size: 10px; color: #666;">
        Generated on: ${new Date().toLocaleString('en-IN')}
      </div>
    </body>
    </html>
  `;

  await page.setContent(htmlContent);
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
  });

  await browser.close();
  return pdfBuffer;
};

module.exports = { generateLedgerPDF };
