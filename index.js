import { getStartingSlide } from "./slider.js";
import Animate, { EASINGS } from "./utils/animate.js";
import { waitForElem } from "./utils/document.js";

let widthOfOne = 0;
let prevReps = 0;

// duplicates the header text as many neccessary times to fill the full viewport width
/**
 * @param {Element} header
 */
const fixHeader = () => {
    const numberOfReps = Math.ceil(window.innerWidth / widthOfOne) - 2;

    if (numberOfReps != prevReps) {
        prevReps = numberOfReps;

        const left = document.querySelector("#header-left");
        const right = document.querySelector("#header-right");
        if (left == null || right == null) return;

        const text = document.createTextNode("WELCOME".repeat(numberOfReps));

        left.replaceChildren(text);
        right.replaceChildren(text.cloneNode());
    }
};

Animate.onMount(".header").then((anim) => {
    widthOfOne = anim.element.children[0].getBoundingClientRect().width;

    fixHeader();
    window.addEventListener("resize", () => fixHeader());

    anim.fromInitial("transform")
        .to({
            transform: "scaleY(2) translateY(0%)",
        })
        .easing(EASINGS.QUART_IN_OUT)
        .duration(1000)
        .begin();
});

waitForElem(".slide-text").then((e) => {
    const text = document.querySelector(
        `[data-slide-id='${getStartingSlide()}']`
    );
    if (text == null) return;

    e.style.visibility = "visible";
    text.style.visibility = "visible";
    text.ariaHidden = "false";

    new Animate(text)
        .fromInitial("clip-path")
        .to({
            clipPath: "inset(0 0 0 0)",
        })
        .easing(EASINGS.QUART_IN_OUT)
        .duration(1000)
        .begin();
});
