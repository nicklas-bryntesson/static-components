export default class CoverCompositionVideo {
  static instanceCount = 0;

  constructor(componentElement) {
    this.root = componentElement;
    this.coverComposition = this.root;
    this.mediaContainer = this.root.querySelector(".mediaContainer");
    this.video = this.root.querySelector("video");
    this.state = "idle";
    this.userPaused = false;
    this.policyPaused = false;
    this.isVisible = false;
    this.hasAttached = false;
    this.userHasStartedPlayback = false;
    this.userReducedMotionOverride = false;
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
    const componentElements = parent.querySelectorAll(
      '[data-component="CoverCompositionVideo"]'
    );

    componentElements.forEach((element) => {
      if (element.__coverCompositionVideoInstance) {
        return;
      }

      element.__coverCompositionVideoInstance = new CoverCompositionVideo(
        element
      );
    });
  }

  init() {
    if (!this.video) {
      return;
    }

    this.hasAttached = true;
    this.setupVideoElement();
    this.setupControls();
    this.setupPolicySignals();
    this.setupVideoEvents();
    this.transition("INIT");
  }

  setupVideoElement() {
    this.video.controls = false;
    this.video.setAttribute("playsinline", "");
    this.video.setAttribute("preload", "metadata");
    this.ensureVideoId();
  }

  setupControls() {
    if (!this.mediaContainer) {
      return;
    }

    this.controls = document.createElement("div");
    this.controls.className = "coverCompositionVideoControls";

    this.controlButton = document.createElement("button");
    this.controlButton.type = "button";
    this.controlButton.className = "coverCompositionVideoToggle";
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
  }

  setupPolicySignals() {
    this.reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );
    this.reducedMotionQuery.addEventListener(
      "change",
      this.handleReducedMotionChange
    );

    this.connection = navigator.connection || navigator.mozConnection || null;
    if (this.connection && this.connection.addEventListener) {
      this.connection.addEventListener("change", this.handleConnectionChange);
    }

    if ("IntersectionObserver" in window) {
      this.intersectionObserver = new IntersectionObserver(
        this.handleVisibilityEntries,
        {
          threshold: 0.4,
        }
      );

      this.intersectionObserver.observe(this.root);
    } else {
      this.isVisible = true;
    }
  }

  setupVideoEvents() {
    this.video.addEventListener("canplay", this.handleCanPlay);
    this.video.addEventListener("error", this.handleVideoError);
    this.video.addEventListener("play", this.handleVideoPlay);
    this.video.addEventListener("pause", this.handleVideoPause);
  }

  transition(eventName, detail = {}) {
    const currentState = this.state;
    const nextState = this.getNextState(currentState, eventName, detail);

    this.state = nextState;
    this.root.setAttribute("data-video-state", nextState);
    this.updateControlsUI();
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

    const blockers = this.getPolicyBlockers();
    const shouldAttemptAutoplay = !Object.values(blockers).some(Boolean);

    if (shouldAttemptAutoplay && this.video.paused && !this.userPaused) {
      this.play({ byPolicy: true });
      return;
    }

    if (!shouldAttemptAutoplay && !this.video.paused) {
      const blockedOnlyByReducedMotion =
        blockers.reducedMotion &&
        !blockers.autoplayDisabled &&
        !blockers.notVisible &&
        !blockers.saveData &&
        !blockers.slowConnection;

      const canBypassWithUserIntent =
        blockedOnlyByReducedMotion && this.userReducedMotionOverride;

      if (!canBypassWithUserIntent) {
        this.pause({ byPolicy: true });
      }
    }
  }

  async play(options = {}) {
    if (!this.video) {
      return;
    }

    if (options.byUser) {
      this.userPaused = false;
      this.userHasStartedPlayback = true;
      this.userReducedMotionOverride = Boolean(this.reducedMotionQuery?.matches);
    }

    this.policyPaused = false;

    try {
      await this.video.play();
    } catch (_error) {
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
      this.userReducedMotionOverride = false;
    }

    this.policyPaused = byPolicy;
    this.pendingPauseDetail = { byUser, byPolicy };
    this.video.pause();
  }

  toggle() {
    if (!this.video) {
      return;
    }

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

    delete this.root.__coverCompositionVideoInstance;
    this.hasAttached = false;
  }

  handleReducedMotionChange() {
    this.userReducedMotionOverride = false;
    this.transition("POLICY_CHANGE");
  }

  handleConnectionChange() {
    this.transition("POLICY_CHANGE");
  }

  handleVisibilityEntries(entries) {
    const entry = entries[0];
    if (!entry) {
      return;
    }

    this.isVisible = entry.isIntersecting && entry.intersectionRatio >= 0.4;
    this.transition("POLICY_CHANGE");
  }

  handleCanPlay() {
    this.transition("CANPLAY");
  }

  handleVideoError() {
    this.transition("ERROR");
  }

  handleVideoPlay() {
    this.policyPaused = false;
    this.transition("PLAY");
  }

  handleVideoPause() {
    const pauseDetail = this.pendingPauseDetail || {
      byPolicy: this.policyPaused,
      byUser: this.userPaused,
    };
    this.pendingPauseDetail = null;
    this.transition("PAUSE", pauseDetail);
  }

  handleControlToggle(event) {
    event.preventDefault();
    this.toggle();
  }

  updateControlsUI() {
    if (!this.controlButton || !this.controlIconPath) {
      return;
    }

    const isPlaying = this.video ? !this.video.paused : this.state === "playing";
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

  ensureVideoId() {
    if (!this.video) {
      return;
    }

    if (this.video.id) {
      return;
    }

    CoverCompositionVideo.instanceCount += 1;
    this.video.id = `coverCompositionVideo-${CoverCompositionVideo.instanceCount}`;
  }

  getPolicyBlockers() {
    const autoplayMode = this.root.dataset.autoplay || "off";
    const effectiveType = this.connection?.effectiveType || "";

    return {
      autoplayDisabled: autoplayMode !== "policy",
      reducedMotion: Boolean(this.reducedMotionQuery?.matches),
      notVisible: !this.isVisible,
      saveData: Boolean(this.connection?.saveData),
      slowConnection: effectiveType === "slow-2g" || effectiveType === "2g",
    };
  }
}
