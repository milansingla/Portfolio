"use client";

import { useEffect, useState } from "react";

const PDF = "/Milan-Singla-CV.pdf";

/**
 * The CV inside the page. Wide screens with a pointer get the real PDF in an
 * <object> (the browser's own renderer, framed by the site). Everything else —
 * phones, touch tablets, no JavaScript — gets a sharp one-page preview image,
 * which is the dependable way to read an A4 page on a phone. Both sit next to a
 * download link, and the <object> carries its own fallback.
 */
export default function CvViewer() {
  const [pdf, setPdf] = useState(false);
  useEffect(() => {
    try {
      setPdf(matchMedia("(min-width: 820px) and (hover: hover) and (pointer: fine)").matches);
    } catch {
      /* the image is the safe default */
    }
  }, []);
  return (
    <section className="cv-viewer" aria-label="Curriculum vitae">
      {pdf ? (
        <div className="cv-frame-wrap">
          <object className="cv-frame" data={`${PDF}#view=FitH&toolbar=1`} type="application/pdf" aria-label="Milan Singla's CV, PDF">
            <p className="cv-fallback">
              This browser can’t show the PDF here. <a href={PDF} download="Milan-Singla-CV.pdf">Download the CV</a> or{" "}
              <a href={PDF} target="_blank" rel="noopener noreferrer">
                open it in a new tab
              </a>
              .
            </p>
          </object>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="cv-img"
          src="/cv-preview.png"
          width={1240}
          height={1754}
          alt="Milan Singla's CV, one A4 page: education at Chitkara University, experience, four projects (Termedu, Shipyard, VRxED Meet, VRxNuro), technical skills and achievements. The same content is in the downloadable PDF."
        />
      )}
      <p className="cv-note">
        Having trouble viewing it? <a href={PDF} download="Milan-Singla-CV.pdf">Download the PDF</a>.
      </p>
    </section>
  );
}
