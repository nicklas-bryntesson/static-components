import CoverCompositionVideo from "../partials/components/CoverCompositionVideo/CoverCompositionVideo.js";
import DateField from "../partials/components/DateField/DateField.js";
import svSE from "../partials/components/DateField/locales/sv-SE.json"; // Vite handles JSON imports natively

function load(entry) {
  console.log("loading...");
  entry.target.classList.add("inView");
}

// Select the target element
const imageGrid = document.querySelectorAll(".cta-module");

const imageGridOptions = {
  root: null,
  rootMargin: "0px",
  threshold: 0.5,
};

const imageGridObserver = new IntersectionObserver(function (entries, self) {
  entries.forEach((entry) => {
    console.log("IntersectionObserver call", entry);
    if (entry.isIntersecting || entry.intersectionRatio > 0) {
      console.log("IntersectionObserver unobserve", entry);
      self.unobserve(entry.target);
      load(entry);
    }
  });
}, imageGridOptions);

imageGrid.forEach((item) => {
  imageGridObserver.observe(item);
});

CoverCompositionVideo.attach();

DateField.registerLocale('sv-SE', svSE);
DateField.attach();

import('./debug-panel.js').then(({ init }) => init());
