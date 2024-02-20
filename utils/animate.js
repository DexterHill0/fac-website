import { waitForElem } from "./document.js";

export const EASINGS = {
    SINE_IN_OUT: "ease-in-out",
    CUBIC_IN_OUT: "cubic-bezier(0.65, 0, 0.35, 1)",
    BACK_IN_OUT: "cubic-bezier(0.68, -0.6, 0.32, 1.6)",
    QUART_IN_OUT: "cubic-bezier(0.76, 0, 0.24, 1)",
};

export const FILL = {
    FORWARDS: "forwards",
};

export default class Animate {
    #elem = null;
    #from = null;
    #to = null;
    #ops = {
        easing: EASINGS.SINE_IN_OUT,
        duration: 0,
        iterations: 1,
        fill: FILL.FORWARDS,
    };
    #initial = null;
    #onMounted = null;
    #after = [];
    #reducedMotion = true;

    /**
     *
     * @param {Element} elem
     */
    constructor(elem) {
        this.#elem = elem;

        this.#reducedMotion = window.matchMedia(
            "(prefers-reduced-motion)"
        ).matches;
    }

    /**
     *
     * @param {string | Element} elem
     * @returns {Promise<Animate>}
     */
    static onMount(elem) {
        return new Promise(async (resolve) => {
            const e = await waitForElem(elem);
            resolve(new Animate(e));
        });
    }

    /**
     *
     * @param {Element} elem
     */
    setElem(elem) {
        this.#elem = elem;
    }

    /**
     *
     * @param {string | string[]} props
     * @returns
     */
    fromInitial(props) {
        this.#onMounted = null;
        if (typeof props == "string") {
            this.#initial = {
                [props]: getComputedStyle(this.#elem)[props],
            };
        } else {
            this.#initial = {};
            for (let key of props) {
                this.#initial[key] = getComputedStyle(this.#elem)[key];
            }
        }

        return this;
    }

    from(definition) {
        this.#from = definition;
        return this;
    }

    to(definition) {
        this.#to = definition;
        return this;
    }

    /**
     *
     * @param {number} duration
     * @returns
     */
    duration(duration) {
        this.#ops.duration = duration;
        return this;
    }

    /**
     *
     * @param {number} count
     * @returns
     */
    repeat(count) {
        this.#ops.iterations = count;
        return this;
    }

    /**
     *
     * @param {keyof FILL} fill
     * @returns
     */
    fill(fill) {
        this.#ops.fill = fill;
        return this;
    }

    /**
     *
     * @param {keyof EASINGS} easing
     * @returns
     */
    easing(easing) {
        this.#ops.easing = easing;
        return this;
    }

    /**
     *
     * @param {boolean} allow
     */
    reducedMotion(allow) {
        this.#reducedMotion = allow;
        return thisl;
    }

    /**
     *
     * @param {number} duration
     * @param {Animate | Animate[]} anims
     */
    chainAfter(duration, anims) {
        if (anims instanceof Animate) {
            this.#after.push({
                dur: duration,
                cb: () => {
                    anims.begin();
                },
            });
        } else {
            for (let anim of anims) {
                this.#after.push({
                    dur: duration,
                    cb: () => {
                        anim.begin();
                    },
                });
            }
        }
    }

    reverse() {
        const from = { ...this.#from };
        this.#from = { ...this.#to };
        this.#to = from;
        return this;
    }

    begin() {
        if (this.#elem != null) {
            const slf = this;
            return new Promise((res) => {
                const anim = this.#elem.animate(
                    [this.#initial ?? this.#from ?? {}, this.#to ?? {}],
                    {
                        duration: this.#reducedMotion ? 0 : this.#ops.duration,
                        easing: this.#ops.easing,
                        iterations: this.#ops.iterations,
                        fill: this.#ops.fill,
                    }
                );

                anim.addEventListener("finish", () => res(slf));
                anim.addEventListener("cancel", () => res(slf));
                anim.addEventListener("remove", () => res(slf));
            });
        }
        for (let after of this.#after) {
            setTimeout(after.cb, after.dur);
        }
    }

    /**
     * @returns {Element | null}
     */
    get element() {
        return this.#elem;
    }
}
