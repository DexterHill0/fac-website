/**
 *
 * @param {string | Element} selector
 * @returns {Promise<Element>}
 */
export function waitForElem(selector) {
    return new Promise((resolve) => {
        if (typeof selector != "string") {
            return resolve(selector);
        }

        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(() => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                resolve(document.querySelector(selector));
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    });
}

/**
 *
 * @param {string | Element} elem
 * @param {keyof ElementEventMap} event
 * @param {(this: Element, ev: Event) => any} cb
 */
export function listenOnMount(elem, event, cb) {
    waitForElem(elem).then((e) => {
        e.addEventListener(event, cb);
    });
}
