export default class Accordion {
  constructor(accordionElement) {
    this.accordion = accordionElement;
    this.init();
  }

  static attach(parent) {
    parent = parent || document;
    const accordionElements = parent.querySelectorAll(".accordion");

    accordionElements.forEach((element) => {
      new Accordion(element);
    });
  }

  init() {
    this.setupAccordion();
  }

  setupAccordion() {
    const accordionItems = this.accordion.querySelectorAll(".AccordionItem");

    accordionItems.forEach((item) => {
      const accordionToggle = item.querySelector(".button");
      const accordionPanel = item.querySelector(".panel");

      const isInitiallyExpanded =
        accordionToggle.getAttribute("aria-expanded") === "true";
      accordionPanel.setAttribute(
        "data-expanded",
        isInitiallyExpanded.toString()
      );

      accordionToggle.addEventListener("click", (event) => {
        this.toggleAccordion(event, accordionToggle, accordionPanel);
      });
    });
  }

  toggleAccordion(event, accordionToggle, accordionPanel) {
    event.stopPropagation();

    const isOpen = accordionToggle.getAttribute("aria-expanded") === "true";
    if (isOpen) {
      Accordion.closePanel(accordionToggle, accordionPanel);
    } else {
      Accordion.openPanel(accordionToggle, accordionPanel);
    }
  }

  static openPanel(accordionToggle, accordionPanel) {
    accordionToggle.setAttribute("aria-expanded", "true");
    accordionPanel.setAttribute("data-expanded", "true");
  }

  static closePanel(accordionToggle, accordionPanel) {
    accordionToggle.setAttribute("aria-expanded", "false");
    accordionPanel.classList.add("animating");

    setTimeout(() => {
      accordionPanel.classList.remove("animating");
      accordionPanel.setAttribute("data-expanded", "false");
    }, 400); // Synced with the CSS animation duration
  }

  static closeAllPanels(container = document) {
    const accordionItems = container.querySelectorAll(".AccordionItem");

    accordionItems.forEach((item) => {
      const accordionToggle = item.querySelector(".button");
      const accordionPanel = item.querySelector(".panel");

      Accordion.closePanel(accordionToggle, accordionPanel);
    });
  }

  static openAllPanels(container = document) {
    const accordionItems = container.querySelectorAll(".AccordionItem");

    accordionItems.forEach((item) => {
      const accordionToggle = item.querySelector(".button");
      const accordionPanel = item.querySelector(".panel");

      Accordion.openPanel(accordionToggle, accordionPanel);
    });
  }
}
