import { listenOnMount, waitForElem } from "./utils/document.js";
import Animate from "./utils/animate.js";

const SLIDES_IDS = ["about-me", "home", "why"];
const SECTION_IDS = ["about-me", "why"];

export const getStartingSlide = () => {
    if (window.location.hash.length > 0) {
        const hash = window.location.hash.replace("#", "");
        return SLIDES_IDS.includes(hash) ? hash : "home";
    }
    return "home";
};

/**
 * this is the id of the slide that is in the center, e.g:
 * -----  -----  -----
 * | A |  | B |  | C |
 * -----  -----  -----
 * `currentCenterSlide = 1` aka `B`
 */
let currentCenterSlide = SLIDES_IDS.indexOf(getStartingSlide());

// when a slide is cloned and moved to the end we need to add to its current `left` value
// and not just set a new one
let leftValues = {};

let currentBgOffset = 0;
let slideWidth = 0;

// set by the --slider-cols css variable
// most of the time will be the same as SLIDE_IDS.length
let sliderCols = 0;

// incremented with every slide, and decremented when the anim is complete
// once it reaches 0, all the old children will be removed
// neccessary so if you spam the button you cant see the slides being removed
let activeAnimCount = 0;

let slider = null;

const getSlideById = (id) => {
    if (slider == null) return;

    return document.querySelector(
        `[data-slide-bg-id='${id}']:not(.disabled-slide)`
    );
};

const getLeftCenterRight = () => {
    const right =
        currentCenterSlide + 1 >= SLIDES_IDS.length
            ? 0
            : currentCenterSlide + 1;
    const left =
        currentCenterSlide - 1 < 0
            ? SLIDES_IDS.length - 1
            : currentCenterSlide - 1;

    return [left, currentCenterSlide, right];
};

// clips the text left/right depening on whether it is entering or exiting
/**
 *
 * @param {string} id
 * @param {"enter" | "exit"} enEx
 * @param {"left" | "right"} slideDir
 * @returns
 */
const clipTextEnterExit = (id, enEx, slideDir) => {
    const el = document.querySelector(`[data-slide-id='${id}']`);
    if (el == null) return;

    el.style.visibility = "visible";

    let to = "";
    let from = "";

    if (enEx == "enter") {
        el.ariaHidden = "false";

        if (slideDir == "right") {
            from = "inset(0 0 0 100%)";
            to = "inset(0 0 0 0)";
        } else {
            from = "inset(0 100% 0 0)";
            to = "inset(0 0 0 0)";
        }
    } else {
        el.ariaHidden = "true";

        if (slideDir == "right") {
            from = "inset(0 0 0 0)";
            to = "inset(0 100% 0 0)";
        } else {
            from = "inset(0 0 0 0)";
            to = "inset(0 0 0 100%)";
        }
    }

    new Animate(el)
        .from({
            clipPath: from,
        })
        .to({ clipPath: to })
        .duration(500)
        .begin();
};

const switchToSection = (sectionId) => {
    if (sectionId == "home") {
        for (const id of SECTION_IDS) {
            const section = document.querySelector(`[data-section='${id}']`);
            if (section == null) return;

            section.style.display = "none";
            document.body.style.overflowY = "hidden";

            history.replaceState(null, null, " ");
        }
    } else {
        document.body.style.overflowY = "scroll";

        const container = document.querySelector("#section-container");
        if (container == null) return;

        for (const id of SECTION_IDS) {
            const section = document.querySelector(`[data-section='${id}']`);
            if (section == null) return;

            if (id == sectionId) {
                const url = new URL(window.location);
                url.hash = `#${sectionId}`;
                history.pushState({}, "", url);
                section.style.display = "inherit";
            } else {
                section.style.display = "none";
                section.classList.remove("show-all");
            }
        }
    }
};

listenOnMount(".skip-nav", "click", () => {
    // set all sections visible
    for (const id of SECTION_IDS) {
        const section = document.querySelector(`[data-section='${id}']`);
        if (section == null) return;
        section.style.display = "inherit";
        document.body.style.overflowY = "scroll";
        section.classList.add("show-all");
    }

    const container = document.querySelector("#section-container");
    container.scrollIntoView({ behavior: "smooth" });
});
listenOnMount(".skip-nav", "focus", (e) => {
    e.target.style.left = "0";
});
listenOnMount(".skip-nav", "blur", (e) => {
    e.target.style.left = "-100%";
});

const SLIDE_ENTER_CBS = {
    home: (dir) => {
        clipTextEnterExit("home", "enter", dir);
        switchToSection("home");
    },
    "about-me": (dir) => {
        clipTextEnterExit("about-me", "enter", dir);
        switchToSection("about-me");
    },
    why: (dir) => {
        clipTextEnterExit("why", "enter", dir);
        switchToSection("why");
    },
};

const SLIDE_EXIT_CBS = {
    home: (dir) => {
        clipTextEnterExit("home", "exit", dir);
    },
    "about-me": (dir) => {
        clipTextEnterExit("about-me", "exit", dir);
    },
    why: (dir) => {
        clipTextEnterExit("why", "exit", dir);
    },
};

const removeOldChildren = () => {
    if (activeAnimCount == 0) {
        for (const child of document.querySelectorAll(".disabled-slide") ??
            []) {
            child.remove();
        }
    }
};

const updateSlideOrderAttr = () => {
    // const query = document.querySelectorAll(".active-slide") ?? [];

    // for (let i = 0; i < query.length; i++) {
    //     query[i].setAttribute("data-slide-order", i);
    // }

    const posses = getLeftCenterRight();

    for (let i = 0; i < posses.length; i++) {
        const slide = document.querySelector(
            `.active-slide[data-slide-bg-id='${SLIDES_IDS[posses[i]]}']`
        );
        if (slide == null) continue;

        slide.setAttribute("data-slide-order", i);
    }
};

const slideRight = () => {
    if (slider == null) return;

    window.scrollTo({
        left: 0,
        top: 0,
        behavior: "smooth",
    });

    // the slide that will transition off the left edge of the screen
    let slideLeavingScreen = currentCenterSlide - 1;
    if (slideLeavingScreen < 0) slideLeavingScreen = SLIDES_IDS.length - 1;

    const slideId = SLIDES_IDS[slideLeavingScreen];

    const exitingSlide = getSlideById(slideId);
    if (exitingSlide == null) return;
    exitingSlide.classList.remove("active-slide");
    exitingSlide.classList.add("disabled-slide");

    const newSlide = exitingSlide.cloneNode(true);

    // cant rely on the exiting slide to have correct classes if youre clicking fast
    // so adding/removing the manually is safer
    newSlide.classList.remove("disabled-slide");
    newSlide.classList.add("active-slide");

    // take the difference between the old and new pos to calculate how much slide needs to shift by
    // then add that to the current left value of the slide.
    // this is important since the parent container is translated. by default, the first slide is at `left: 0px`;
    // but when you slide left, for instance, the new first slide is actually at `left: -<slideWidth>px`, *NOT* 0.
    // so when you then slide right again, we dont want to put the slide back at `left: <3 * slideWidth>px`, we want it
    // at `left: <oldLeft> + <3 * slideWidth>` so its at the correct position even with the transforms
    const newLeft = leftValues[slideId] + SLIDES_IDS.length * slideWidth;
    leftValues[slideId] = newLeft;

    newSlide.style.left = `${newLeft}%`;

    slider.appendChild(newSlide);

    SLIDE_EXIT_CBS[SLIDES_IDS[currentCenterSlide]]("right");

    if (++currentCenterSlide >= SLIDES_IDS.length) currentCenterSlide = 0;

    updateSlideOrderAttr();

    SLIDE_ENTER_CBS[SLIDES_IDS[currentCenterSlide]]("right");

    currentBgOffset -= slideWidth;

    activeAnimCount++;
    new Animate(slider)
        .fromInitial("transform")
        .to({
            transform: `translateX(${currentBgOffset}%)`,
        })
        .duration(500)
        .begin()
        .then(() => {
            activeAnimCount--;
            removeOldChildren();
        });
};

const slideLeft = () => {
    if (slider == null) return;

    window.scrollTo({
        left: 0,
        top: 0,
        behavior: "smooth",
    });

    // the slide that will transition off the left edge of the screen
    let slideLeavingScreen = currentCenterSlide + 1;
    if (slideLeavingScreen >= SLIDES_IDS.length) slideLeavingScreen = 0;

    const slideId = SLIDES_IDS[slideLeavingScreen];

    const exitingSlide = getSlideById(slideId);
    if (exitingSlide == null) return;
    exitingSlide.classList.remove("active-slide");
    exitingSlide.classList.add("disabled-slide");

    const newSlide = exitingSlide.cloneNode(true);

    newSlide.classList.remove("disabled-slide");
    newSlide.classList.add("active-slide");

    const newLeft = leftValues[slideId] - SLIDES_IDS.length * slideWidth;
    leftValues[slideId] = newLeft;

    newSlide.style.left = `${newLeft}%`;

    slider.prepend(newSlide);

    SLIDE_EXIT_CBS[SLIDES_IDS[currentCenterSlide]]("left");

    if (--currentCenterSlide < 0) currentCenterSlide = SLIDES_IDS.length - 1;

    updateSlideOrderAttr();

    SLIDE_ENTER_CBS[SLIDES_IDS[currentCenterSlide]]("left");

    currentBgOffset += slideWidth;

    activeAnimCount++;
    new Animate(slider)
        .fromInitial("transform")
        .to({
            transform: `translateX(${currentBgOffset}%)`,
        })
        .duration(500)
        .begin()
        .then(() => {
            activeAnimCount--;
            removeOldChildren();
        });
};

listenOnMount("#move-left", "click", slideLeft);
listenOnMount("#move-right", "click", slideRight);

const DRAGGING_THRESHOLD = 30;
const dragging = {
    is: false,
    prevX: 0,
};

// allows the user to drag to change the slide
// nice for mobile
// user pointer events works for all inputs like touch, mouse, etc
listenOnMount(".slider", "pointerdown", (e) => {
    if (e.button == 0) {
        dragging.is = true;
        dragging.prevX = 0;
    }
});
listenOnMount(".slider", "pointerup", () => {
    dragging.is = false;
});
listenOnMount(".slider", "pointermove", (e) => {
    if (dragging.is) {
        const dir = e.movementX > 0;

        if (Math.abs(e.movementX) >= DRAGGING_THRESHOLD) {
            if (dir == 1) slideLeft();
            else slideRight();

            dragging.is = false;
        }

        dragging.prevX = e.clientX;
    }
});

waitForElem("#slides-bg").then((bg) => {
    slider = bg;
    sliderCols = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue(
            "--slider-cols"
        )
    );

    slideWidth = (1 / sliderCols) * 100;

    const posses = getLeftCenterRight();

    for (let i = 0; i < posses.length; i++) {
        const pos = posses[i];
        const slideId = SLIDES_IDS[pos];

        const slide = getSlideById(slideId);

        if (slideId != null) {
            const left = (i / sliderCols) * 100;

            slide.style.left = `${left}%`;
            slide.setAttribute("data-slide-order", i);

            leftValues[slideId] = left;
        }
    }

    switchToSection(getStartingSlide());
});
