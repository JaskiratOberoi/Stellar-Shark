/**
 * Camera barcode scan with native BarcodeDetector when available; otherwise @zxing/browser.
 * @param {{ videoEl: HTMLVideoElement, onCode: (code: string) => void }} opts
 * @returns {Promise<{ stop: () => void }>}
 */
export async function startBarcodeScanner({ videoEl, onCode }) {
    const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
    });
    if (typeof videoEl.srcObject !== 'undefined') {
        videoEl.srcObject = stream;
    } else {
        // eslint-disable-next-line no-param-reassign
        videoEl.src = URL.createObjectURL(stream);
    }
    await videoEl.play();

    let stopped = false;
    const stopStreams = () => {
        try {
            stream.getTracks().forEach((t) => t.stop());
        } catch {
            // ignore
        }
    };

    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
        const Ctor = window.BarcodeDetector;
        const formats = [
            'ean_13',
            'ean_8',
            'code_128',
            'code_39',
            'itf',
            'qr_code',
            'data_matrix',
            'upc_a',
            'upc_e'
        ];
        let detector;
        try {
            detector = new Ctor({ formats });
        } catch {
            detector = new Ctor();
        }
        const loop = async () => {
            if (stopped) return;
            if (videoEl.readyState >= 2) {
                try {
                    const list = await detector.detect(videoEl);
                    if (list && list.length > 0) {
                        const raw = list[0].rawValue ?? list[0].value;
                        if (raw) {
                            onCode(String(raw));
                            return;
                        }
                    }
                } catch {
                    // keep scanning
                }
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
        return {
            stop: () => {
                stopped = true;
                stopStreams();
            }
        };
    }

    const { BrowserMultiFormatReader } = await import('@zxing/browser');
    const reader = new BrowserMultiFormatReader();
    const controls = await reader.decodeFromStream(stream, videoEl, (result, _err) => {
        if (stopped || !result) return;
        onCode(result.getText());
    });
    return {
        stop: () => {
            stopped = true;
            try {
                controls.stop();
            } catch {
                // ignore
            }
            stopStreams();
        }
    };
}
