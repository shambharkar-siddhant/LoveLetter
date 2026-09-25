const storyTarget = document.querySelector("#story-content");
const letterTarget = document.querySelector("#letter-content");
const memoryTemplate = document.querySelector("#memory-template");

const memories = [
  { after: 96, file: "assets/airport.jpg", label: "The airport", caption: "The moment you became real." },
  { after: 78, file: "assets/five-days.jpg", label: "Our five days", caption: "Little moments, now my favourite memories." },
];

const closingMemory = {
  file: "assets/together.jpg",
  label: "Us, together",
  caption: "And then there was you.",
};

function inlineMarkdown(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

function makeMemory(memory, animate = true) {
  const fragment = memoryTemplate.content.cloneNode(true);
  const figure = fragment.querySelector("figure");
  const img = fragment.querySelector("img");
  const placeholder = fragment.querySelector(".memory-placeholder");
  img.alt = memory.caption;
  fragment.querySelector(".placeholder-label").textContent = memory.label;
  fragment.querySelector("figcaption").textContent = memory.caption;
  img.addEventListener("load", () => placeholder.remove());
  img.addEventListener("error", () => img.remove());
  img.src = memory.file;
  if (img.complete && img.naturalWidth > 0) placeholder.remove();
  if (!animate) figure.classList.remove("reveal");
  return { fragment, figure };
}

function parseDraft(markdown) {
  const parts = markdown.trim().split(/\n---\n/);
  const storyMarkdown = parts.slice(0, -1).join("\n\n---\n\n");
  const letterMarkdown = parts.at(-1);
  renderStory(storyMarkdown);
  renderLetter(letterMarkdown);
  observeReveals();
}

function renderStory(markdown) {
  const blocks = markdown.split(/\n\s*\n/).filter(Boolean);
  const wrapper = document.createElement("div");
  wrapper.className = "prose";
  let paragraphNumber = 0;

  blocks.forEach((block) => {
    if (/^#{1,2} /.test(block)) return;
    if (block === "---") {
      const divider = document.createElement("hr");
      divider.className = "section-break";
      wrapper.append(divider);
      return;
    }

    paragraphNumber += 1;
    const paragraph = document.createElement("p");
    paragraph.innerHTML = inlineMarkdown(block.replace(/\n/g, " "));
    if (paragraphNumber === 1) paragraph.classList.add("opening");
    if (/^<em>.*<\/em>$/.test(paragraph.innerHTML) && block.length < 100) paragraph.classList.add("beat");
    wrapper.append(paragraph);

    const memory = memories.find((item) => item.after === paragraphNumber);
    if (memory) wrapper.append(makeMemory(memory).fragment);
  });
  storyTarget.replaceChildren(wrapper);
}

function renderLetter(markdown) {
  const blocks = markdown.split(/\n\s*\n/).filter(Boolean);
  blocks.forEach((block) => {
    const element = block.startsWith("### ") ? document.createElement("h2") : document.createElement("p");
    const content = block.replace(/^### /, "").replace(/\n/g, " ");
    element.innerHTML = inlineMarkdown(content);
    letterTarget.append(element);
    if (element.tagName === "H2") letterTarget.append(makeMemory(closingMemory, false).fragment);
  });
}

function observeReveals() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
}

const embeddedDraft = document.querySelector("#draft-source")?.textContent.trim();

if (window.location.protocol === "file:" && embeddedDraft) {
  parseDraft(embeddedDraft);
} else {
  fetch("assets/initial_draft.md")
    .then((response) => {
      if (!response.ok) throw new Error("The letter could not be loaded.");
      return response.text();
    })
    .then(parseDraft)
    .catch(() => {
      if (embeddedDraft) parseDraft(embeddedDraft);
      else storyTarget.innerHTML = '<p class="error">The letter could not be loaded.</p>';
    });
}
