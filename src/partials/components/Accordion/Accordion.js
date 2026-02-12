import generateRandomString from "./utillity";

class Accordion {
  constructor(element) {
    this.accordion = element;
    this.triggerTitles = this.accordion.querySelectorAll("h3");

    this.init();
  }

  init() {
    // Convert the NodeList to an array
    const triggerTitlesArray = Array.from(this.triggerTitles);

    triggerTitlesArray.forEach((triggerTitle) => {
      const accordionToggle = triggerTitle.querySelector("button");
      const accordionToggleText = triggerTitle.querySelector("span");
      const accordionPanel = triggerTitle.nextElementSibling;

      // Generate random ID for each accordion and enhance the accessibility of the accordion progressively
      const accordionToggleTextID = `accordionToggleText-${generateRandomString(
        5,
        { includeUppercase: true }
      )}`;
      accordionToggleText.setAttribute("id", accordionToggleTextID);

      const accordionPanelID = `accordionPanel-${generateRandomString(5, {
        includeUppercase: true,
      })}`;
      accordionPanel.setAttribute("id", accordionPanelID);

      // Set the accordion toggle aria-controls attribute to the ID of the accordion panel
      accordionToggle.setAttribute("aria-controls", accordionPanelID);

      // Set the accordion panel aria-labelledby attribute to the ID of the accordion toggle text
      accordionPanel.setAttribute("aria-labelledby", accordionToggleTextID);

      accordionToggle.addEventListener("click", () => {
        const isExpanded =
          accordionToggle.getAttribute("aria-expanded") === "true" || false;

        accordionToggle.setAttribute("aria-expanded", !isExpanded);

        isExpanded
          ? accordionPanel.classList.remove("expanded")
          : accordionPanel.classList.add("expanded");
        isExpanded
          ? accordionPanel.setAttribute("aria-hidden", "true")
          : accordionPanel.setAttribute("aria-hidden", "false");
      });
    });
  }
}

// Find all accordion elements and create instances of the Accordion class for each one
const dropdownAccordions = document.querySelectorAll(".accordion");
if (dropdownAccordions) {
  Array.from(dropdownAccordions).forEach(
    (accordion) => new Accordion(accordion)
  );
}
