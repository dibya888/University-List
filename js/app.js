// ============================================================
// Winter 2027 Dossier — app logic (vanilla JS, no build step)
// ============================================================

(function () {
  "use strict";

  const state = {
    search: "",
    tier: "all",
    stateFilter: "all",
    greFilter: "all",
    sortKey: "matchScore",
    sortDir: "desc",
  };

  function tierBucket(category) {
    if (!category) return "Unknown";
    if (category.startsWith("Safe")) return "Safe";
    if (category.startsWith("Moderate")) return "Moderate";
    return "Ambitious";
  }

  function isUnconfirmed(text) {
    return typeof text === "string" && text.indexOf("Not officially confirmed") !== -1;
  }

  function shortDeadline(text) {
    if (!text) return "—";
    // Take just the leading date-ish clause before the first " (" or " —" or ". "
    let cut = text.split(" — ")[0];
    cut = cut.split(". ")[0];
    if (cut.length > 30) cut = cut.slice(0, 28) + "…";
    return cut;
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // ------------------------------------------------------------
  // Populate filter dropdowns
  // ------------------------------------------------------------
  function populateStateFilter() {
    const states = Array.from(new Set(PROGRAMS.map((p) => p.state).filter(Boolean))).sort();
    const sel = document.getElementById("stateFilter");
    states.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s;
      sel.appendChild(opt);
    });
  }

  // ------------------------------------------------------------
  // Stat strip
  // ------------------------------------------------------------
  function renderStats() {
    const safe = PROGRAMS.filter((p) => tierBucket(p.category) === "Safe").length;
    const moderate = PROGRAMS.filter((p) => tierBucket(p.category) === "Moderate").length;
    const ambitious = PROGRAMS.filter((p) => tierBucket(p.category) === "Ambitious").length;
    const states = new Set(PROGRAMS.map((p) => p.state).filter(Boolean)).size;

    document.querySelector('[data-stat="safe"]').textContent = safe;
    document.querySelector('[data-stat="moderate"]').textContent = moderate;
    document.querySelector('[data-stat="ambitious"]').textContent = ambitious;
    document.querySelector('[data-stat="states"]').textContent = states;
  }

  // ------------------------------------------------------------
  // Explorer table
  // ------------------------------------------------------------
  function getFiltered() {
    let rows = PROGRAMS.slice();

    if (state.search.trim()) {
      const q = state.search.trim().toLowerCase();
      rows = rows.filter(
        (p) =>
          (p.university && p.university.toLowerCase().includes(q)) ||
          (p.program && p.program.toLowerCase().includes(q)) ||
          (p.city && p.city.toLowerCase().includes(q))
      );
    }

    if (state.tier !== "all") {
      rows = rows.filter((p) => tierBucket(p.category) === state.tier);
    }

    if (state.stateFilter !== "all") {
      rows = rows.filter((p) => p.state === state.stateFilter);
    }

    if (state.greFilter === "no") {
      rows = rows.filter((p) => p.greGmatRequired && /^no\b/i.test(p.greGmatRequired.trim()));
    } else if (state.greFilter === "yes") {
      rows = rows.filter((p) => p.greGmatRequired && /^yes\b/i.test(p.greGmatRequired.trim()));
    }

    rows.sort((a, b) => {
      let av = a[state.sortKey];
      let bv = b[state.sortKey];
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av === undefined || av === null) av = "";
      if (bv === undefined || bv === null) bv = "";
      if (av < bv) return state.sortDir === "asc" ? -1 : 1;
      if (av > bv) return state.sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return rows;
  }

  function renderTable() {
    const rows = getFiltered();
    const tbody = document.getElementById("tableBody");
    document.getElementById("resultCount").textContent = rows.length + " of " + PROGRAMS.length;

    if (rows.length === 0) {
      tbody.innerHTML =
        '<tr class="empty-row"><td colspan="6">No programs match these filters. Try widening your search.</td></tr>';
      return;
    }

    tbody.innerHTML = rows
      .map((p) => {
        const tier = tierBucket(p.category);
        const tierClass = "tier-" + tier.toLowerCase();
        return `
        <tr data-id="${p.id}">
          <td class="cell-university">${escapeHtml(p.university)}</td>
          <td class="cell-program">${escapeHtml(p.program)}</td>
          <td class="cell-city">${escapeHtml(p.city)}</td>
          <td><span class="tier-badge ${tierClass}">${escapeHtml(tier)}</span></td>
          <td class="cell-score">${p.matchScore !== undefined ? p.matchScore + "/10" : "—"}</td>
          <td class="cell-city">${escapeHtml(shortDeadline(p.deadlineWinter2027))}</td>
        </tr>`;
      })
      .join("");

    tbody.querySelectorAll("tr[data-id]").forEach((tr) => {
      tr.addEventListener("click", () => openDetail(parseInt(tr.getAttribute("data-id"), 10)));
    });
  }

  function updateSortHeaders() {
    document.querySelectorAll(".doc-table thead th[data-sort]").forEach((th) => {
      const key = th.getAttribute("data-sort");
      th.classList.toggle("sorted", key === state.sortKey);
      const arrow = th.querySelector(".sort-arrow");
      if (key === state.sortKey) {
        arrow.textContent = state.sortDir === "asc" ? "↑" : "↓";
      } else {
        arrow.textContent = "↕";
      }
    });
  }

  // ------------------------------------------------------------
  // Detail modal
  // ------------------------------------------------------------
  function fieldRow(label, value) {
    if (value === undefined || value === null || value === "") value = "—";
    const cls = isUnconfirmed(value) ? ' class="unconfirmed"' : "";
    return `<div class="detail-field"><dt>${escapeHtml(label)}</dt><dd${cls}>${escapeHtml(value)}</dd></div>`;
  }

  function openDetail(id) {
    const p = PROGRAMS.find((x) => x.id === id);
    if (!p) return;

    const tier = tierBucket(p.category);
    document.getElementById("modalEyebrow").textContent = p.city + ", " + p.state + " · " + tier + " tier";
    document.getElementById("modalTitle").textContent = p.university;

    const linkHtml = (url) =>
      url && url.startsWith("http")
        ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(url)}</a>`
        : escapeHtml(url);

    const body = `
      <p style="font-size:15px;color:var(--ink-soft);margin-bottom:20px;"><strong style="color:var(--ink);">${escapeHtml(
        p.program
      )}</strong> — ${escapeHtml(p.degree || "")}</p>

      <dl class="detail-grid">
        ${fieldRow("Match score", p.matchScore + "/10")}
        ${fieldRow("Industry orientation", p.industryScore + "/10")}
        ${fieldRow("Research orientation", p.researchScore + "/10")}
        ${fieldRow("Language of instruction", p.language)}
        ${fieldRow("Duration", p.duration)}
        ${fieldRow("ECTS", p.ects)}
        ${fieldRow("Winter intake offered", p.winterIntake)}
        ${fieldRow("Summer intake offered", p.summerIntake)}
        ${fieldRow("Winter 2027 deadline (projected)", p.deadlineWinter2027)}
        ${fieldRow("Summer 2027 deadline (projected)", p.deadlineSummer2027)}
        ${fieldRow("Reference-cycle deadline", p.deadlineReference)}
        ${fieldRow("Minimum academic requirement", p.minAcademic)}
        ${fieldRow("IELTS requirement", p.ielts)}
        ${fieldRow("TOEFL requirement", p.toefl)}
        ${fieldRow("APS required?", p.aps)}
        ${fieldRow("GRE/GMAT required?", p.greGmatRequired)}
        ${fieldRow("Required GRE score", p.greScore)}
        ${fieldRow("German language required?", p.germanRequired)}
        ${fieldRow("Interview required?", p.interview)}
        ${fieldRow("SOP / motivation letter?", p.sop)}
        ${fieldRow("Work experience required?", p.workExperience)}
        ${fieldRow("Tuition (per semester, non-EU)", p.tuition)}
        ${fieldRow("Semester contribution", p.semesterContribution)}
        ${fieldRow("DAAD compatible?", p.daad)}
        ${fieldRow("QS World Ranking", p.qsRanking)}
      </dl>

      <div class="detail-note">
        <div class="detail-note-title">Key notes</div>
        ${escapeHtml(p.notes || "—")}
      </div>

      <div style="margin-top:18px;display:flex;gap:10px;flex-wrap:wrap;">
        ${p.programPage ? `<a class="btn-outline-doc" href="${escapeHtml(p.programPage)}" target="_blank" rel="noopener">Official program page</a>` : ""}
        ${p.admissionPage ? `<a class="btn-outline-doc" href="${escapeHtml(p.admissionPage)}" target="_blank" rel="noopener">Official admission page</a>` : ""}
      </div>
    `;
    document.getElementById("modalBody").innerHTML = body;

    const modalEl = document.getElementById("detailModal");
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  }

  // ------------------------------------------------------------
  // Top 20 ranking
  // ------------------------------------------------------------
  function renderTop20() {
    const sorted = PROGRAMS.slice().sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      return (b.industryScore || 0) - (a.industryScore || 0);
    });
    const top20 = sorted.slice(0, 20);

    const list = document.getElementById("rankList");
    list.innerHTML = top20
      .map((p, i) => {
        const tier = tierBucket(p.category);
        return `
        <div class="rank-item" data-id="${p.id}">
          <div class="rank-num">${String(i + 1).padStart(2, "0")}</div>
          <div class="rank-info">
            <div class="rank-uni">${escapeHtml(p.university)}</div>
            <div class="rank-prog">${escapeHtml(p.program)}</div>
          </div>
          <div class="rank-meta">
            <span class="tier-badge tier-${tier.toLowerCase()}">${escapeHtml(tier)}</span>
            <span class="rank-score">${p.matchScore}/10</span>
          </div>
        </div>`;
      })
      .join("");

    list.querySelectorAll(".rank-item").forEach((el) => {
      el.addEventListener("click", () => openDetail(parseInt(el.getAttribute("data-id"), 10)));
    });
  }

  // ------------------------------------------------------------
  // Tier columns
  // ------------------------------------------------------------
  function renderTiers() {
    const tiers = { Safe: [], Moderate: [], Ambitious: [] };
    PROGRAMS.forEach((p) => {
      const t = tierBucket(p.category);
      if (tiers[t]) tiers[t].push(p);
    });

    Object.keys(tiers).forEach((t) => {
      tiers[t].sort((a, b) => {
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
        return (b.industryScore || 0) - (a.industryScore || 0);
      });
    });

    document.querySelector('[data-tier-count="Safe"]').textContent = tiers.Safe.length + " programs";
    document.querySelector('[data-tier-count="Moderate"]').textContent = tiers.Moderate.length + " programs";
    document.querySelector('[data-tier-count="Ambitious"]').textContent = tiers.Ambitious.length + " programs";

    const renderCol = (elId, list, cap) => {
      const el = document.getElementById(elId);
      el.innerHTML = list
        .slice(0, cap)
        .map(
          (p) => `
        <div class="tier-pick" data-id="${p.id}">
          <div class="tier-pick-uni">${escapeHtml(p.university)}</div>
          <div class="tier-pick-prog">${escapeHtml(p.program)} · ${p.matchScore}/10</div>
        </div>`
        )
        .join("");
      el.querySelectorAll(".tier-pick").forEach((item) => {
        item.addEventListener("click", () => openDetail(parseInt(item.getAttribute("data-id"), 10)));
      });
    };

    renderCol("tierSafe", tiers.Safe, 10);
    renderCol("tierModerate", tiers.Moderate, 10);
    renderCol("tierAmbitious", tiers.Ambitious, 10);
  }

  // ------------------------------------------------------------
  // Roadmap (static content — matches the Winter 2027 planning doc)
  // ------------------------------------------------------------
  const ROADMAP = [
    {
      time: "Jul – Aug 2026",
      focus: "Foundation & IELTS prep",
      desc:
        "Finalize your shortlist from the Explorer and Top 20 (aim for a realistic mix: 3–4 Safe, 3–4 Moderate, 1–2 Ambitious). Begin IELTS preparation — target 7.0+ overall to clear every bar in this dataset, including the highest ones. Register for your first attempt. Start mapping your NSU transcript's exact ECTS-equivalent credit breakdown against the specific thresholds flagged throughout the database.",
    },
    {
      time: "Sep – Oct 2026",
      focus: "IELTS exam + APS initiation",
      desc:
        "Sit your first IELTS attempt. Begin the APS certificate process at the German Embassy Dhaka immediately — consistently the longest lead-time item for Bangladeshi applicants. Start drafting your CV and a master Statement of Purpose template you can adapt per university.",
    },
    {
      time: "Nov – Dec 2026",
      focus: "APS progress + retake buffer",
      desc:
        "Continue APS processing. Retake IELTS in this window if your score needs improving. Begin requesting recommendation letters — give referees 2–3 months' notice. Shortlist 2–3 backup programs in case of APS delays or score issues.",
    },
    {
      time: "Jan – Feb 2027",
      focus: "Documents finalization",
      desc:
        "APS certificate should be progressing toward completion. Finalize your SOP per university — tailor the generic template to each program's framing (industry-focused for Safe-tier UAS programs, more academic for Ambitious-tier research universities). Polish your GitHub/portfolio where relevant. Note the earliest deadline on your shortlist — Siegen's ETI program closes 30 April, notably earlier than most.",
    },
    {
      time: "Mar – Apr 2027",
      focus: "Early deadline window opens",
      desc:
        "Several programs' Winter 2027/28 windows likely open here: RWTH Aachen (~1 Mar), Fulda (~1 Mar), OTH Amberg-Weiden (~mid-Apr), Hannover (~mid-Apr), TU Dresden (~1 Apr). Submit early-deadline applications. Siegen's 30 April cutoff falls in this window.",
    },
    {
      time: "May – Jun 2027",
      focus: "Main application wave",
      desc:
        "The busiest submission stretch: Paderborn (~31 May), Ruhr Bochum (~15 May), Saarland (~15 May), and the tail ends of the Dresden and Fulda windows. Submit your Safe- and Moderate-tier applications here, prioritized by deadline order. Double-check every same-name-different-program distinction flagged in this database before submitting.",
    },
    {
      time: "July 2027",
      focus: "Peak deadline cluster",
      desc:
        "The single busiest cluster in the dataset: KIT, TU Darmstadt, Rhine-Waal, Münster, TU Chemnitz, BTU Cottbus, BHT Berlin, Bamberg, and TH Deggendorf all fall around ~15 July. Prioritize your highest-match Ambitious picks here if you haven't already applied — this is your last realistic window for most programs.",
    },
    {
      time: "Aug – Sep 2027",
      focus: "Late window + decisions",
      desc:
        "Kiel UAS (~15 Sep) and Trier (~15 Sep, with 2-semester admission validity as a safety net) remain open into this period. Admission decisions start arriving. Begin the blocked-account (Sperrkonto) process — verify the current required amount directly, as it changes periodically.",
    },
    {
      time: "October 2027",
      focus: "Visa push",
      desc:
        "Once you hold at least one firm admission letter, book your visa appointment at the German Embassy Dhaka immediately — appointment availability, not document readiness, is usually the real bottleneck. Finalize health insurance, accommodation search, and travel.",
    },
    {
      time: "Nov 2027 →",
      focus: "Enrollment",
      desc:
        "Complete on-site enrollment formalities at your chosen university. Winter Semester 2027/28 begins.",
    },
  ];

  function renderRoadmap() {
    const el = document.getElementById("roadmapList");
    el.innerHTML = ROADMAP.map(
      (r) => `
      <div class="road-item">
        <div class="road-time">${escapeHtml(r.time)}</div>
        <div class="road-focus">${escapeHtml(r.focus)}</div>
        <div class="road-desc">${escapeHtml(r.desc)}</div>
      </div>`
    ).join("");
  }

  // ------------------------------------------------------------
  // Event wiring
  // ------------------------------------------------------------
  function wireEvents() {
    document.getElementById("searchInput").addEventListener("input", (e) => {
      state.search = e.target.value;
      renderTable();
    });

    document.querySelectorAll("#tierFilter button").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#tierFilter button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        state.tier = btn.getAttribute("data-tier");
        renderTable();
      });
    });

    document.getElementById("stateFilter").addEventListener("change", (e) => {
      state.stateFilter = e.target.value;
      renderTable();
    });

    document.getElementById("greFilter").addEventListener("change", (e) => {
      state.greFilter = e.target.value;
      renderTable();
    });

    document.querySelectorAll(".doc-table thead th[data-sort]").forEach((th) => {
      th.addEventListener("click", () => {
        const key = th.getAttribute("data-sort");
        if (state.sortKey === key) {
          state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
        } else {
          state.sortKey = key;
          state.sortDir = key === "matchScore" ? "desc" : "asc";
        }
        updateSortHeaders();
        renderTable();
      });
    });
  }

  // ------------------------------------------------------------
  // Init
  // ------------------------------------------------------------
  function init() {
    populateStateFilter();
    renderStats();
    updateSortHeaders();
    renderTable();
    renderTop20();
    renderTiers();
    renderRoadmap();
    wireEvents();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
