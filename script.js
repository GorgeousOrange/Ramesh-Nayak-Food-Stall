// ===== Edit these details before publishing =====
const STALL = {
  address: "BITS Goa, D'Spine, Goa, India",
  mapQuery: "BITS Goa, D'Spine, Goa, India", // used for the Google Maps directions link
  openingHours: "Every day, 4 PM till midnight",
  phoneDisplay: "+91 82619 67763",
  phoneHref: "tel:+918261967763",
  // Replace with Ramesh's real listing pages once they exist.
  zomato: "https://www.zomato.com/goa",
  swiggy: "https://www.swiggy.com/"
};

// Paste a Formspree endpoint (e.g. "https://formspree.io/f/xxxxxxxx") to really receive feedback.
// While this is empty the form runs in DEMO mode: nothing is sent or stored.
const FEEDBACK_ENDPOINT = "";

document.getElementById("addressText").textContent = STALL.address;
document.getElementById("directionsLink").href =
  "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(STALL.mapQuery);
document.querySelector(".hours p").textContent = STALL.openingHours;
const phone = document.getElementById("phoneLink");
phone.href = STALL.phoneHref;
phone.textContent = STALL.phoneDisplay;
document.getElementById("zomatoLink").href = STALL.zomato;
document.getElementById("swiggyLink").href = STALL.swiggy;
document.getElementById("year").textContent = new Date().getFullYear();

// Copy address
document.getElementById("copyAddress").addEventListener("click", async () => {
  const button = document.getElementById("copyAddress");
  try {
    await navigator.clipboard.writeText(STALL.address);
    button.textContent = "Address copied!";
  } catch {
    button.textContent = "Copy unavailable";
  }
  setTimeout(() => (button.textContent = "Copy address"), 1800);
});

// Mobile nav
const menuToggle = document.getElementById("menuToggle");
const nav = document.getElementById("mainNav");
menuToggle.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(open));
});
nav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
  nav.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
}));

// Menu scroller arrows
const scroller = document.getElementById("menuScroller");
const prev = document.getElementById("menuPrev");
const next = document.getElementById("menuNext");
const step = () => {
  const card = scroller.querySelector(".menu-card");
  return card ? card.getBoundingClientRect().width + 20 : 300;
};
function updateArrows() {
  prev.disabled = scroller.scrollLeft <= 4;
  next.disabled = scroller.scrollLeft >= scroller.scrollWidth - scroller.clientWidth - 4;
}
prev.addEventListener("click", () => scroller.scrollBy({ left: -step(), behavior: "smooth" }));
next.addEventListener("click", () => scroller.scrollBy({ left: step(), behavior: "smooth" }));
scroller.addEventListener("scroll", updateArrows, { passive: true });
scroller.addEventListener("keydown", e => {
  if (e.key === "ArrowRight") scroller.scrollBy({ left: step(), behavior: "smooth" });
  if (e.key === "ArrowLeft") scroller.scrollBy({ left: -step(), behavior: "smooth" });
});
window.addEventListener("resize", updateArrows);
updateArrows();

// ===== Feedback form =====
const form = document.getElementById("feedbackForm");
const thanks = document.getElementById("thanks");
const errorBox = document.getElementById("formError");
const ratingLabels = { 1: "Poor", 2: "Could be better", 3: "Okay", 4: "Really good", 5: "Loved it!" };

// default visit date = today (local), no future dates
const dateInput = document.getElementById("visitDate");
function todayLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}
dateInput.value = todayLocal();
dateInput.max = todayLocal();

function updateProgress() {
  let done = 0, total = 0;
  form.querySelectorAll("[data-track]").forEach(el => { total++; if (el.value) done++; });
  total += 3; // visit type, dishes ordered, overall rating
  if (form.querySelector('[name="visit_type"]:checked')) done++;
  if (form.querySelector('[name="ordered"]:checked')) done++;
  if (form.querySelector('[name="rating"]:checked')) done++;
  const pct = Math.round((done / total) * 100);
  document.getElementById("progressBar").style.width = pct + "%";
  document.getElementById("progressText").textContent = pct + "% complete";
}
form.addEventListener("input", updateProgress);
form.addEventListener("change", e => {
  if (e.target.name === "rating") document.getElementById("ratingLabel").textContent = ratingLabels[e.target.value];
  const field = e.target.closest(".field");
  if (field) field.classList.remove("invalid");
  updateProgress();
});
updateProgress();

function validate() {
  const problems = [];
  const need = (name, msg, ok) => {
    const f = form.querySelector(`[data-field="${name}"]`);
    if (!ok) { f.classList.add("invalid"); problems.push({ f, msg }); } else f.classList.remove("invalid");
  };
  need("visit_type", "Please choose how you had your food.", !!form.querySelector('[name="visit_type"]:checked'));
  need("ordered", "Please pick at least one dish you ordered.", !!form.querySelector('[name="ordered"]:checked'));
  need("rating", "Please give an overall star rating.", !!form.querySelector('[name="rating"]:checked'));
  return problems;
}

function collect() {
  const fd = new FormData(form);
  const data = {};
  for (const [k, v] of fd.entries()) {
    if (k === "ordered") (data.ordered = data.ordered || []).push(v);
    else if (String(v).trim() !== "") data[k] = String(v).trim();
  }
  if (data.ordered) data.ordered = data.ordered.join(", ");
  return data;
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  errorBox.textContent = "";
  const problems = validate();
  if (problems.length) {
    errorBox.textContent = problems[0].msg;
    problems[0].f.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  const data = collect();
  const btn = document.getElementById("submitBtn");
  const demo = !FEEDBACK_ENDPOINT;

  if (!demo) {
    btn.disabled = true;
    try {
      const res = await fetch(FEEDBACK_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Request failed");
    } catch {
      errorBox.textContent = "Sorry, we couldn't send your feedback. Please check your connection and try again.";
      btn.disabled = false;
      return;
    }
    btn.disabled = false;
  }

  const name = data.name ? ", " + data.name : "";
  document.getElementById("thanksTitle").textContent = "Thank you" + name + "!";
  document.getElementById("thanksText").textContent =
    `You rated your visit ${data.rating} out of 5 and told us about ${data.ordered}. Every answer helps Ramesh decide what to improve first.`;
  document.getElementById("thanksDemo").textContent = demo
    ? "Demo mode: this response was not sent or saved anywhere. Connect a form service to receive real feedback."
    : "Your feedback has been sent to Ramesh.";
  form.hidden = true;
  thanks.hidden = false;
  thanks.scrollIntoView({ behavior: "smooth", block: "center" });
  thanks.focus({ preventScroll: true });
});

document.getElementById("againBtn").addEventListener("click", () => {
  form.reset();
  dateInput.value = todayLocal();
  document.getElementById("ratingLabel").textContent = "Tap a star";
  form.querySelectorAll(".invalid").forEach(el => el.classList.remove("invalid"));
  errorBox.textContent = "";
  updateProgress();
  thanks.hidden = true;
  form.hidden = false;
  form.scrollIntoView({ behavior: "smooth", block: "start" });
});
