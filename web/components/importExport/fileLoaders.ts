// Shared dynamic script loaders for the Import/Export page. These mirror the
// loaders already used by ImportTransactionsModal so we get identical
// CSV/XLSX parsing, PDF text extraction, and OCR behavior without pulling in
// new npm dependencies.

export const loadPdfJs = (): Promise<any> => {
    return new Promise((resolve, reject) => {
        if ((window as any).pdfjsLib) {
            resolve((window as any).pdfjsLib);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
        script.onload = () => {
            const pdfjsLib = (window as any).pdfjsLib;
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
            resolve(pdfjsLib);
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
};

export const loadXlsx = (): Promise<any> => {
    return new Promise((resolve, reject) => {
        if ((window as any).XLSX) {
            resolve((window as any).XLSX);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        script.onload = () => resolve((window as any).XLSX);
        script.onerror = reject;
        document.head.appendChild(script);
    });
};

export const loadTesseract = (): Promise<any> => {
    return new Promise((resolve, reject) => {
        if ((window as any).Tesseract) {
            resolve((window as any).Tesseract);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
        script.onload = () => resolve((window as any).Tesseract);
        script.onerror = reject;
        document.head.appendChild(script);
    });
};

// Extracts text from a (possibly password-protected) PDF. `requestPassword`
// is called with the current attempt number (0-based) whenever pdf.js
// reports the file needs a password; return null from it to cancel.
// Gives up after 3 attempts, mirroring ImportTransactionsModal.
export const extractTextFromPdf = async (
    pdfFile: File,
    requestPassword: (attempt: number) => Promise<string | null>
): Promise<string> => {
    const pdfjsLib = await loadPdfJs();
    const arrayBuffer = await pdfFile.arrayBuffer();
    let pdfDoc;
    let password = '';
    let attempts = 0;

    while (attempts < 3) {
        try {
            // pdf.js transfers `data` to its worker, detaching the ArrayBuffer after
            // use — pass a fresh copy on every attempt or the retry (e.g. with the
            // correct password) fails on a zero-length buffer with a confusing error.
            pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0), password }).promise;
            break;
        } catch (err: any) {
            if (err.name === 'PasswordException' || String(err.message || '').toLowerCase().includes('password')) {
                const userPassword = await requestPassword(attempts);
                if (userPassword === null) {
                    throw new Error('Password extraction cancelled by user.');
                }
                password = userPassword;
                attempts++;
            } else {
                throw err;
            }
        }
    }

    if (!pdfDoc) {
        throw new Error('Too many password attempts or failed to open PDF.');
    }

    let fullText = '';
    for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += `\n--- Page ${i} ---\n` + pageText;
    }
    return fullText;
};
