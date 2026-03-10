import generateRandomString from "../utillity/generateRandomString.js";

const heroBlocks = document.querySelectorAll(".heroBlock");

if (heroBlocks.length > 0) {
  /**
   * This is a MediaQueryList object representing the results of the specified media query string,
   * which checks whether the user has requested the system minimize the amount of animation or motion it uses.
   */
  const reducedMotionQuery = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );

  /**
   * These are SVG path strings for the play and pause icons.
   */
  const playPath = "M3 22v-20l18 10-18 10z";
  const pausePath = "M11 22h-4v-20h4v20zm6-20h-4v20h4v-20z";

  /**
   * Creates a SVG element and returns it after setting its attributes.
   * @returns {SVGElement} SVG element
   */
  function createSvg() {
    let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("fill", "currentColor");
    svg.setAttribute("viewBox", "0 0 24 24");
    return svg;
  }

  /**
   * Creates a SVG path and returns it after appending it to the passed SVG element.
   * @param {SVGElement} svg - The SVG element to which the path is appended.
   * @returns {SVGPathElement} SVG path element
   */
  function createSvgPath(svg) {
    let path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    svg.appendChild(path);
    return path;
  }

  /**
   * Creates a video control button with SVG icon and returns them.
   * @returns {{button: HTMLButtonElement, path: SVGPathElement}} An object containing the created button and SVG path elements.
   */
  function createVideoControl() {
    let button = document.createElement("button");
    button.type = "button";
    button.className = "videoToggle";
    button.setAttribute("aria-label", "Toggle video");

    let svg = createSvg();
    let path = createSvgPath(svg);

    button.appendChild(svg);
    return { button, path };
  }

  /**
   * Iterates over each 'heroBlock' and implements the control behavior.
   */
  heroBlocks.forEach((heroBlock) => {
    const heroTitle = heroBlock.querySelector(".title");
    const heroTitleID = `heroTitle-${generateRandomString(5, { includeUppercase: true })}`;
    heroTitle.setAttribute("id", heroTitleID);
    heroBlock.setAttribute("aria-labelledby", heroTitleID);

    const videoElement = heroBlock.querySelector(".videoBackground");

    /**
     * Check if the video element is present and if it can play mp4 format.
     */
    if (videoElement && videoElement.canPlayType("video/mp4")) {
      videoElement.removeAttribute("controls");

      const { button: videoControlButton, path: videoControlPath } =
        createVideoControl();

      const heroControls = document.createElement("div");
      heroControls.className = "heroControls";
      heroControls.appendChild(videoControlButton);
      heroBlock.prepend(heroControls);

      const videoID = `video-${generateRandomString(5, { includeUppercase: true })}`;
      videoElement.setAttribute("id", videoID);
      videoControlButton.setAttribute("aria-controls", videoID);

      /**
       * Checks for the 'reduced motion' setting and updates the video state and the button icon accordingly.
       */
      const checkReducedMotion = () => {
        if (reducedMotionQuery.matches) {
          videoElement.pause();
          videoControlPath.setAttribute("d", playPath);
        } else {
          if (videoElement.paused) {
            videoElement.play();
          }
          videoControlPath.setAttribute("d", pausePath);
        }
      };

      /**
       * Toggles the playing state of the video and updates the button icon.
       */
      const togglePlayPause = () => {
        if (videoElement.paused) {
          videoElement.play();
          videoControlPath.setAttribute("d", pausePath);
        } else {
          videoElement.pause();
          videoControlPath.setAttribute("d", playPath);
        }
      };

      /**
       * Add event listeners for the 'change' event on 'reducedMotionQuery' and the 'click' event on 'videoControlButton'.
       */
      reducedMotionQuery.addEventListener("change", checkReducedMotion);
      videoControlButton.addEventListener("click", togglePlayPause);
      checkReducedMotion();
    }
  });
}
