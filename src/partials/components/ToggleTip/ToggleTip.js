export function generateRandomString(length, options = {}) {
  // Define the default set of characters to be used
  const defaultCharacters = "abcdefghijklmnopqrstuvwxyz0123456789";

  // Override the default options with the user-specified options
  let {
    characters = defaultCharacters,
    includeUppercase = false,
    includeSymbols = false
  } = options;

  // Add uppercase letters and symbols if requested
  if (includeUppercase) {
    characters += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  }
  if (includeSymbols) {
    characters += "!@#$%^&*()_-+={}[]\\|;:'\",.<>/?";
  }

  // Check that the characters string is not empty or null
  if (!characters) {
    throw new Error("Characters string cannot be empty or null");
  }

  // Define the variable to store the random string
  let randomString = "";

  // Generate a random string of the specified length
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    const index = randomValues[i] % characters.length;
    randomString += characters.charAt(index);
  }

  return randomString;
}

class ToggleTip {
  constructor(element) {
    this.element = element;
    this.direction = element.getAttribute("direction") || "top";
    this.icon = element.getAttribute("icon") || "info";
    this.title = element.getAttribute("title") || "";
    this.headingLevel = element.getAttribute("heading-level") || "3";
    this.init();
  }

  init = () => {
    setTimeout(this.createTooltip, 200);
  };

  createTooltip = () => {
    const content = Array.from(this.element.childNodes)
      .map((node) => node.outerHTML)
      .join("");

    // Remove the content from the element
    this.element.innerHTML = "";

    // Generate a unique ID for the content container
    const randomId = `toggleContent-${generateRandomString(5, {
      includeUppercase: true
    })}`;

    // Determine if there is a title and create the heading span if so
    const titleSpan = this.title
      ? `<span class="title" role="heading" aria-level="${this.headingLevel}">${this.title}</span>`
      : "";

    // Create the HTML structure using template literals
    const template = `
      <button
        aria-label="${"open tooltip"}" 
        aria-expanded="false"
        aria-controls="${randomId}"
      >
        ${this.generateIconSVG(this.icon)}
      </button>
      <div class="slideContainer">
        <div class="innerSlider">
          <div id="${randomId}" class="toggleTipContent" role="tooltip" aria-hidden="true">
            ${titleSpan}
            ${content}
            <div class="arrowSlider">
              <div class="arrow"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Insert the template into the element
    this.element.innerHTML = template;

    // Select elements for further manipulation
    const button = this.element.querySelector("button");
    const slideContainer = this.element.querySelector(".slideContainer");
    const contentContainer = this.element.querySelector(".toggleTipContent");

    // Set initial position of the slideContainer
    this.calculateSliderContainerPosition(slideContainer);
    this.calculateTooltipContentPosition(contentContainer);

    // Attach event listeners
    button.onclick = this.toggle;
    window.addEventListener("resize", this.handleResize);
    document.addEventListener("mousedown", this.handleClickOutside);
    this.element.addEventListener("focusout", this.handleFocusOut);

    this.element.setAttribute("initialized", "true");
  };

  logHalfButtonWidth = (button) => {
    const buttonWidth = button.getBoundingClientRect().width;
    const halfButtonWidth = buttonWidth / 2;
  };

  handleClickOutside = (event) => {
    if (!this.element.contains(event.target)) {
      this.closeToggletip();
    }
  };

  handleFocusOut = (event) => {
    if (!this.element.contains(event.relatedTarget)) {
      this.closeToggletip();
    }
  };

  handleResize = () => {
    const slideContainer = this.element.querySelector(".slideContainer");
    const contentContainer = this.element.querySelector(".toggleTipContent");
    this.calculateSliderContainerPosition(slideContainer);
    this.calculateTooltipContentPosition(contentContainer);
  };

  calculateSliderContainerPosition = (slideContainer) => {
    const viewportWidth = window.innerWidth;
    const elementRect = this.element.getBoundingClientRect();
    const elementCenter = elementRect.left + elementRect.width / 2;
    const viewportCenter = viewportWidth / 2;
    const leftOffset = viewportCenter - elementCenter;

    slideContainer.style.setProperty(
      "--insetInlineStartOffset",
      `${leftOffset}px`
    );

    console.log("slideContainer leftOffset", leftOffset);
  };

  calculateTooltipContentPosition = (contentContainer) => {
    const viewportWidth = window.innerWidth;
    const slideContainer = this.element.querySelector(".slideContainer");
    const slideContainerWidth = slideContainer.getBoundingClientRect().width;

    const toggletipWidth = this.element.getBoundingClientRect().width;
    const toggltipHalfWidth = toggletipWidth / 2;

    const elementLeft = this.element.getBoundingClientRect().left;
    const slideContainerLeft = slideContainer.getBoundingClientRect().left;

    const elementPosition = elementLeft - slideContainerLeft;

    let marginInlineStart;

    // Calculate the position in percentage
    const percentage =
      ((elementPosition + toggltipHalfWidth) / slideContainerWidth) * 100;

    // Check if there is enough space to center the toggle tip
    if (
      elementLeft + toggltipHalfWidth < viewportWidth &&
      elementLeft - toggltipHalfWidth > 0
    ) {
      marginInlineStart = percentage;
    } else if (elementLeft + toggletipWidth > viewportWidth) {
      // If it overflows on the right
      marginInlineStart = 100;
    } else if (elementLeft < 0) {
      // If it overflows on the left
      marginInlineStart = 0;
    } else {
      marginInlineStart = percentage;
    }

    contentContainer.style.setProperty(
      "--_tt--marginInlineStart",
      `${marginInlineStart}%`
    );

    console.log("viewportWidth", viewportWidth);
    console.log("slideContainerWidth", slideContainerWidth);
    console.log("toggletipWidth", toggletipWidth);
    console.log("elementPosition", elementPosition);
    console.log("toggletip contentContainer margin-left", marginInlineStart);
  };

  toggle = () => {
    const content = this.element.querySelector(".toggleTipContent");
    const isVisible = content.getAttribute("aria-hidden") === "false";
    if (isVisible) {
      this.closeToggletip();
    } else {
      this.openToggletip();
    }
  };

  openToggletip = () => {
    const content = this.element.querySelector(".toggleTipContent");
    content.setAttribute("aria-hidden", "false");
    this.element.querySelector("button").setAttribute("aria-expanded", "true");
  };

  closeToggletip = () => {
    const content = this.element.querySelector(".toggleTipContent");
    content.setAttribute("aria-hidden", "true");
    this.element.querySelector("button").setAttribute("aria-expanded", "false");
  };

  generateIconSVG = (iconType) => {
    const pathInfo =
      "M15.655 2.686C12.33.02 7.19.746 4.152 3.32c-3.04 2.574-4.08 8.442-1.166 12.196 1.986 2.558 5.432 3.9 8.629 3.361 6.6-1.112 9.715-9.622 5.39-14.706m-9.997 9.827s4.542-.192 6.525 0m-3.067-.086c-.055-2.955.195-5.284.195-5.284H7.753m1.495-2.973c.81.003 1.463 0 2.028-.028";

    const pathQuestion =
      "M17.028 4.242C21.3 9.265 18.224 17.67 11.705 18.77c-3.157.533-6.56-.793-8.521-3.32-2.88-3.708-1.85-9.504 1.151-12.047C7.337.858 12.413.142 15.697 2.775m-7.71 5.31c.882-2.761 3.344-2.648 4.255-1.251.838 1.286-.658 2.822-1.097 3.41-.566.758-.567 1.759-.567 1.759m-.117 3.19c.018-.406.102-1.348.102-1.88";
    const path = iconType === "info" ? pathInfo : pathQuestion;

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 21" fill="none" class="toggleTipIcon">
        <path d="${path}"/>
      </svg>
    `;
  };
}

// Using DOMContentLoaded to ensure the script executes when the document is ready
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("toggle-tip").forEach((el) => new ToggleTip(el));
});
