import type { Metadata } from "next";
import Monogram from "@/components/Monogram";
import CvViewer from "@/components/CvViewer";
import { pageMeta } from "@/lib/site";
import "./cv.css";

export const metadata: Metadata = pageMeta({
  title: { absolute: "Milan Singla — CV (Curriculum Vitae)" },
  description:
    "The CV of Milan Singla: B.Tech Computer Science and Engineering at Chitkara University, full-stack projects (Termedu, Shipyard, VRxED Meet, VRxNuro), skills and achievements. View it here or download the PDF.",
  path: "/cv",
});

export default function CvPage() {
  return (
    <main className="cv">
      <header className="cv-top">
        <Monogram replay={false} />
        <a className="cv-back" href="/#contact">
          <span aria-hidden="true">←</span> Back to portfolio
        </a>
      </header>

      <div className="cv-head">
        <p className="cv-kicker">Curriculum vitae</p>
        <h1 className="cv-title">Milan Singla</h1>
        <p className="cv-sub">B.Tech Computer Science and Engineering · Chitkara University, Punjab</p>
        <div className="cv-actions">
          <a className="cv-dl" href="/Milan-Singla-CV.pdf" download="Milan-Singla-CV.pdf">
            <span>Download CV</span>
            <svg className="btn-arrow" viewBox="0 0 22 14" aria-hidden="true" focusable="false">
              <path d="M1 7.4 C6 6.6 12 7.6 20 7 M14.4 1.6 L20.2 7 L14.6 12.6" />
            </svg>
          </a>
          <a className="cv-open" href="/Milan-Singla-CV.pdf" target="_blank" rel="noopener noreferrer">
            Open the PDF in a new tab
          </a>
        </div>
      </div>

      <CvViewer />
    </main>
  );
}
