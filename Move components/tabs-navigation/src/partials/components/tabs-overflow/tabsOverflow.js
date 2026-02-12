class ScrollableTabs {
    constructor(containerSelector) {
      this.container = document.querySelector(containerSelector);
      this.list = this.container.querySelector(".list");
      this.leftButton = this.container.querySelector(".leftToggle");
      this.rightButton = this.container.querySelector(".rightToggle");
  
      this.init();
    }
  
    init() {
      // Initial button state check
      this.updateButtonStates();
  
      // Event listeners
      this.list.addEventListener("scroll", () => this.updateButtonStates());
      this.leftButton.addEventListener("click", () => this.scrollLeft());
      this.rightButton.addEventListener("click", () => this.scrollRight());
  
      // Update on window resize
      window.addEventListener("resize", () => this.updateButtonStates());
  
      // Update when content changes (optional)
      this.observeContentChanges();
    }
  
    updateButtonStates() {
      const scrollLeft = this.list.scrollLeft;
      const scrollWidth = this.list.scrollWidth;
      const clientWidth = this.list.clientWidth;
      const maxScrollLeft = scrollWidth - clientWidth;
  
      // Left button logic
      const showLeftButton = scrollLeft > 0;
      this.toggleButton(this.leftButton, showLeftButton);
  
      // Right button logic
      const showRightButton =
        scrollLeft < maxScrollLeft && scrollWidth > clientWidth;
      this.toggleButton(this.rightButton, showRightButton);
    }
  
    toggleButton(button, show) {
      if (show) {
        button.style.setProperty("--_opacity", "1");
        button.setAttribute("aria-hidden", "false");
        button.disabled = false;
      } else {
        button.style.setProperty("--_opacity", "0");
        button.setAttribute("aria-hidden", "true");
        button.disabled = true;
      }
    }
  
    scrollLeft() {
      const scrollAmount = this.list.clientWidth * 0.8;
      this.list.scrollBy({
        left: -scrollAmount,
        behavior: "smooth"
      });
    }
  
    scrollRight() {
      const scrollAmount = this.list.clientWidth * 0.8;
      this.list.scrollBy({
        left: scrollAmount,
        behavior: "smooth"
      });
    }
  
    observeContentChanges() {
      const observer = new MutationObserver(() => {
        setTimeout(() => this.updateButtonStates(), 10);
      });
  
      observer.observe(this.list, {
        childList: true,
        subtree: true
      });
    }
  }
  
  export default ScrollableTabs;
