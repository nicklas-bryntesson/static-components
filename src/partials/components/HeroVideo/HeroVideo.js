export default class HeroVideo {
  static instanceCount = 0;

  constructor(heroVideoElement) {
    this.root = heroVideoElement;
    this.hero = this.root.querySelector(".Hero");
    this.mediaContainer = this.root.querySelector(".mediaContainer");
    this.video = this.root.querySelector("video");
    this.state = "idle";
    this.userPaused = false;
    this.policyPaused = false;
    this.isVisible = false;
    this.hasAttached = false;
    this.userHasStartedPlayback = false;
    this.intersectionObserver = null;
    this.reducedMotionQuery = null;
    this.connection = null;
    this.controls = null;
    this.controlButton = null;
    this.controlIconPath = null;
    this.pendingPauseDetail = null;
    this.playLabel = this.root.dataset.playText || "Play video";
    this.pauseLabel = this.root.dataset.pauseText || "Pause video";

    this.handleReducedMotionChange = this.handleReducedMotionChange.bind(this);
    this.handleConnectionChange = this.handleConnectionChange.bind(this);
    this.handleVisibilityEntries = this.handleVisibilityEntries.bind(this);
    this.handleCanPlay = this.handleCanPlay.bind(this);
    this.handleVideoError = this.handleVideoError.bind(this);
    this.handleVideoPlay = this.handleVideoPlay.bind(this);
    this.handleVideoPause = this.handleVideoPause.bind(this);
    this.handleControlToggle = this.handleControlToggle.bind(this);

    this.init();
  }

  static attach(parent = document) {
    const heroVideoElements = parent.querySelectorAll(
      '[data-component="HeroVideo"]'
    );

    heroVideoElements.forEach((element) => {
      if (element.__heroVideoInstance) {
        return;
      }

      element.__heroVideoInstance = new HeroVideo(element);
    });
  }

  init() {
    if (!this.video) {
      this.log("init aborted - no <video> found");
      return;
    }

    this.log("init start");
    this.hasAttached = true;
    this.setupVideoElement();
    this.setupControls();
    this.setupPolicySignals();
    this.setupVideoEvents();
    this.transition("INIT");
    this.log("init complete");
  }

  setupVideoElement() {
    this.video.controls = false;
    this.video.setAttribute("playsinline", "");
    this.video.setAttribute("preload", "metadata");
    this.ensureVideoId();
    this.log("video element configured", {
      autoplayMode: this.root.dataset.autoplay || "off",
      muted: this.video.muted,
      loop: this.video.loop,
      preload: this.video.preload,
      readyState: this.video.readyState,
      videoId: this.video.id,
    });
  }

  setupControls() {
    if (!this.mediaContainer) {
      this.log("setupControls skipped - no .mediaContainer root");
      return;
    }

    this.controls = document.createElement("div");
    this.controls.className = "heroVideoControls";

    this.controlButton = document.createElement("button");
    this.controlButton.type = "button";
    this.controlButton.className = "heroVideoToggle";
    this.controlButton.setAttribute("aria-label", this.playLabel);
    if (this.video?.id) {
      this.controlButton.setAttribute("aria-controls", this.video.id);
    }

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "currentColor");

    this.controlIconPath = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );
    svg.appendChild(this.controlIconPath);

    this.controlButton.appendChild(svg);
    this.controls.appendChild(this.controlButton);
    this.mediaContainer.prepend(this.controls);
    this.controlButton.addEventListener("click", this.handleControlToggle);
    this.updateControlsUI();
    this.log("controls injected");
  }

  setupPolicySignals() {
    this.reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );
    this.reducedMotionQuery.addEventListener(
      "change",
      this.handleReducedMotionChange
    );
    this.log("reduced motion signal attached", {
      matches: this.reducedMotionQuery.matches,
    });

    this.connection = navigator.connection || navigator.mozConnection || null;
    if (this.connection && this.connection.addEventListener) {
      this.connection.addEventListener("change", this.handleConnectionChange);
      this.log("connection signal attached", {
        effectiveType: this.connection.effectiveType || "unknown",
        saveData: Boolean(this.connection.saveData),
      });
    } else {
      this.log("connection signal unavailable");
    }

    if ("IntersectionObserver" in window) {
      this.intersectionObserver = new IntersectionObserver(
        this.handleVisibilityEntries,
        {
          threshold: 0.4,
        }
      );

      this.intersectionObserver.observe(this.root);
      this.log("intersection observer attached");
    } else {
      this.isVisible = true;
      this.log("intersection observer unavailable");
    }
  }

  setupVideoEvents() {
    this.video.addEventListener("canplay", this.handleCanPlay);
    this.video.addEventListener("error", this.handleVideoError);
    this.video.addEventListener("play", this.handleVideoPlay);
    this.video.addEventListener("pause", this.handleVideoPause);
    this.log("video events attached");
  }

  transition(eventName, detail = {}) {
    const currentState = this.state;
    const nextState = this.getNextState(currentState, eventName, detail);

    this.state = nextState;
    this.root.setAttribute("data-video-state", nextState);
    this.updateControlsUI();
    this.log("transition", {
      event: eventName,
      from: currentState,
      to: nextState,
      detail,
    });
    this.syncMediaPolicy();
  }

  getNextState(currentState, eventName, detail) {
    switch (eventName) {
      case "INIT":
        return "idle";
      case "CANPLAY":
        return currentState === "error" ? "error" : "ready";
      case "PLAY":
        return "playing";
      case "PAUSE":
        if (detail.byPolicy) {
          return "pausedByPolicy";
        }
        if (detail.byUser) {
          return "pausedByUser";
        }
        return currentState === "playing" ? "ready" : currentState;
      case "PLAY_REJECTED":
        return "blocked";
      case "POLICY_CHANGE":
        return currentState;
      case "ERROR":
        return "error";
      default:
        return currentState;
    }
  }

  syncMediaPolicy() {
    if (!this.video) {
      return;
    }

    const shouldAttemptAutoplay = this.shouldAttemptAutoplay();
    this.log("syncMediaPolicy", {
      shouldAttemptAutoplay,
      paused: this.video.paused,
      userPaused: this.userPaused,
      userHasStartedPlayback: this.userHasStartedPlayback,
      state: this.state,
    });

    if (shouldAttemptAutoplay && this.video.paused && !this.userPaused) {
      this.play({ byPolicy: true });
      return;
    }

    if (
      !shouldAttemptAutoplay &&
      !this.video.paused &&
      !this.userHasStartedPlayback
    ) {
      this.pause({ byPolicy: true });
    }
  }

  shouldAttemptAutoplay() {
    const autoplayMode = this.root.dataset.autoplay || "off";
    if (autoplayMode !== "policy") {
      return false;
    }

    if (this.reducedMotionQuery?.matches) {
      return false;
    }

    if (!this.isVisible) {
      return false;
    }

    if (this.connection?.saveData) {
      return false;
    }

    const effectiveType = this.connection?.effectiveType || "";
    if (effectiveType === "slow-2g" || effectiveType === "2g") {
      return false;
    }

    return true;
  }

  async play(options = {}) {
    if (!this.video) {
      return;
    }

    if (options.byUser) {
      this.userPaused = false;
      this.userHasStartedPlayback = true;
    }

    this.policyPaused = false;
    this.log("play() request", {
      byUser: Boolean(options.byUser),
      byPolicy: Boolean(options.byPolicy),
      paused: this.video.paused,
      muted: this.video.muted,
    });

    try {
      await this.video.play();
      this.log("play() resolved");
    } catch (error) {
      this.log("play() rejected", error);
      this.transition("PLAY_REJECTED");
    }
  }

  pause(options = {}) {
    if (!this.video) {
      return;
    }

    const byUser = Boolean(options.byUser);
    const byPolicy = Boolean(options.byPolicy);

    if (byUser) {
      this.userPaused = true;
      this.userHasStartedPlayback = false;
    }

    this.policyPaused = byPolicy;
    this.pendingPauseDetail = { byUser, byPolicy };
    this.log("pause() request", {
      byUser,
      byPolicy,
      paused: this.video.paused,
    });
    this.video.pause();
  }

  toggle() {
    if (!this.video) {
      return;
    }

    this.log("toggle() called", { paused: this.video.paused, state: this.state });
    if (this.video.paused) {
      this.play({ byUser: true });
      return;
    }

    this.pause({ byUser: true });
  }

  getState() {
    return this.state;
  }

  destroy() {
    if (!this.hasAttached || !this.video) {
      return;
    }

    this.video.removeEventListener("canplay", this.handleCanPlay);
    this.video.removeEventListener("error", this.handleVideoError);
    this.video.removeEventListener("play", this.handleVideoPlay);
    this.video.removeEventListener("pause", this.handleVideoPause);

    if (this.reducedMotionQuery) {
      this.reducedMotionQuery.removeEventListener(
        "change",
        this.handleReducedMotionChange
      );
    }

    if (this.connection && this.connection.removeEventListener) {
      this.connection.removeEventListener("change", this.handleConnectionChange);
    }

    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }

    if (this.controlButton) {
      this.controlButton.removeEventListener("click", this.handleControlToggle);
    }

    if (this.controls) {
      this.controls.remove();
    }

    delete this.root.__heroVideoInstance;
    this.hasAttached = false;
    this.log("destroy complete");
  }

  handleReducedMotionChange() {
    this.log("reduced-motion changed", {
      matches: this.reducedMotionQuery?.matches,
    });
    this.transition("POLICY_CHANGE");
  }

  handleConnectionChange() {
    this.log("connection changed", {
      effectiveType: this.connection?.effectiveType || "unknown",
      saveData: Boolean(this.connection?.saveData),
    });
    this.transition("POLICY_CHANGE");
  }

  handleVisibilityEntries(entries) {
    const entry = entries[0];
    if (!entry) {
      return;
    }

    this.isVisible = entry.isIntersecting && entry.intersectionRatio >= 0.4;
    this.log("visibility changed", {
      isVisible: this.isVisible,
      isIntersecting: entry.isIntersecting,
      intersectionRatio: entry.intersectionRatio,
    });
    this.transition("POLICY_CHANGE");
  }

  handleCanPlay() {
    this.log("video event: canplay", { readyState: this.video.readyState });
    this.transition("CANPLAY");
  }

  handleVideoError() {
    this.log("video event: error", this.video.error);
    this.transition("ERROR");
  }

  handleVideoPlay() {
    this.policyPaused = false;
    this.log("video event: play");
    this.transition("PLAY");
  }

  handleVideoPause() {
    const pauseDetail = this.pendingPauseDetail || {
      byPolicy: this.policyPaused,
      byUser: this.userPaused,
    };
    this.pendingPauseDetail = null;
    this.log("video event: pause", pauseDetail);
    this.transition("PAUSE", pauseDetail);
  }

  handleControlToggle(event) {
    event.preventDefault();
    this.log("control button click");
    this.toggle();
  }

  updateControlsUI() {
    if (!this.controlButton || !this.controlIconPath) {
      return;
    }

    const isPlaying = this.state === "playing";
    this.controlButton.setAttribute(
      "aria-label",
      isPlaying ? this.pauseLabel : this.playLabel
    );
    this.controlButton.setAttribute("data-icon", isPlaying ? "pause" : "play");
    this.controlIconPath.setAttribute(
      "d",
      isPlaying
        ? "M6 4h4v16H6zm8 0h4v16h-4z"
        : "M8 5v14l11-7z"
    );
  }

  log(message, payload) {
    void message;
    void payload;
  }

  ensureVideoId() {
    if (!this.video) {
      return;
    }

    if (this.video.id) {
      return;
    }

    HeroVideo.instanceCount += 1;
    this.video.id = `heroVideo-${HeroVideo.instanceCount}`;
  }
}
