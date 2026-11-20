// ============================================================
// Winter 2027 Dossier — app logic (vanilla JS, no build step)
// ============================================================

(function () {
  "use strict";

  const state = {
    search: "",
    tier: "all",
    country: "all",
    stateFilter: "all",
    greFilter: "all",
    sortKey: "matchScore",
    sortDir: "desc",
  };

  function tierBucket(category) {
    if (!category) return "Unknown";
    if (category.startsWith("Safe")) return "Safe";
    if (category.startsWith("Moderate")) return "Moderate";
    if (category.startsWith("Backup")) return "Backup";
    return "Ambitious";
  }

  function isUnconfirmed(text) {
    return typeof text === "string" && text.indexOf("Not officially confirmed") !== -1;
  }

  function shortDeadline(text) {
    if (!text) return "—";
    // Drop a leading status tag such as "[CONFIRMED (official WS 2027/28)]", then take the leading date-ish clause
    let cut = text.replace(/^\[[^\]]*\]\s*/, "").split(" — ")[0];
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
  function populateCountryFilter() {
    const countries = Array.from(new Set(PROGRAMS.map((p) => p.country).filter(Boolean))).sort();
    const sel = document.getElementById("countryFilter");

    // Only one country in the dataset today (Germany) — the filter still
    // renders so it's ready the moment a second country is added.
    countries.forEach((c) => {
      const meta = typeof getCountryMeta === "function" ? getCountryMeta(c) : { flag: "", label: c };
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = meta.flag ? meta.flag + " " + meta.label : meta.label;
      sel.appendChild(opt);
    });
  }

  // Rebuilds the state/region dropdown, scoped to the currently
  // selected country (or all countries if none is selected).
  function populateStateFilter() {
    const sel = document.getElementById("stateFilter");
    const previous = state.stateFilter;

    const pool =
      state.country === "all" ? PROGRAMS : PROGRAMS.filter((p) => p.country === state.country);
    const states = Array.from(new Set(pool.map((p) => p.state).filter(Boolean))).sort();

    sel.innerHTML = '<option value="all">All states</option>';
    states.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s;
      sel.appendChild(opt);
    });

    // Keep the previous selection if it's still valid for this country;
    // otherwise fall back to "all" rather than showing an empty result set.
    if (states.includes(previous)) {
      sel.value = previous;
      state.stateFilter = previous;
    } else {
      sel.value = "all";
      state.stateFilter = "all";
    }
  }

  // ------------------------------------------------------------
  // Stat strip
  // ------------------------------------------------------------
  function renderStats() {
    const safe = PROGRAMS.filter((p) => tierBucket(p.category) === "Safe").length;
    const moderate = PROGRAMS.filter((p) => tierBucket(p.category) === "Moderate").length;
    const ambitious = PROGRAMS.filter((p) => tierBucket(p.category) === "Ambitious").length;
    const states = new Set(PROGRAMS.map((p) => p.state).filter(Boolean)).size;
    const countries = new Set(PROGRAMS.map((p) => p.country).filter(Boolean)).size;

    document.querySelector('[data-stat="total"]').textContent = PROGRAMS.length;
    document.querySelector('[data-stat="safe"]').textContent = safe;
    document.querySelector('[data-stat="moderate"]').textContent = moderate;
    document.querySelector('[data-stat="ambitious"]').textContent = ambitious;
    document.querySelector('[data-stat="states"]').textContent = states;
    const countriesEl = document.querySelector('[data-stat="countries"]');
    if (countriesEl) countriesEl.textContent = countries;
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

    if (state.country !== "all") {
      rows = rows.filter((p) => p.country === state.country);
    }

    if (state.stateFilter !== "all") {
      rows = rows.filter((p) => p.state === state.stateFilter);
    }

    if (state.greFilter === "no") {
      rows = rows.filter((p) => p.greGmatRequired && /^no\b/i.test(p.greGmatRequired.replace(/^\[[^\]]*\]\s*/, "").trim()));
    } else if (state.greFilter === "yes") {
      rows = rows.filter((p) => p.greGmatRequired && /^yes\b/i.test(p.greGmatRequired.replace(/^\[[^\]]*\]\s*/, "").trim()));
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
    const multiCountry = new Set(PROGRAMS.map((x) => x.country).filter(Boolean)).size > 1;
    const countryMeta = typeof getCountryMeta === "function" ? getCountryMeta(p.country) : { label: p.country };
    const locationBits = [p.city, p.state];
    if (multiCountry && countryMeta.label) locationBits.push(countryMeta.label);
    document.getElementById("modalEyebrow").textContent = locationBits.filter(Boolean).join(", ") + " · " + tier + " tier";
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
        ${fieldRow("Country", countryMeta.flag ? countryMeta.flag + " " + countryMeta.label : countryMeta.label)}
        ${fieldRow("Realistic score (fit + eligibility + verification)", p.matchScore + "/10")}
        ${fieldRow("Industry orientation", p.industryScore + "/10")}
        ${fieldRow("Research orientation", p.researchScore + "/10")}
        ${fieldRow("Language of instruction", p.language)}
        ${fieldRow("Duration", p.duration)}
        ${fieldRow("ECTS", p.ects)}
        ${fieldRow("Winter intake offered", p.winterIntake)}
        ${fieldRow("Summer intake offered", p.summerIntake)}
        ${fieldRow("Winter 2027/28 deadline (status tag in brackets)", p.deadlineWinter2027)}
        ${fieldRow("Summer 2027 deadline (reference only)", p.deadlineSummer2027)}
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
          "time": "(past) Sep 2026 (NOW, from 25 Sep)",
          "focus": "Reality check + IELTS booking + VPD audit",
          "desc": "1) Find out whether you are already on the German Embassy Dhaka OLD waiting list or registered in the Consular Services Portal (CSP). New CSP registration needs a valid admission letter, and the embassy states the wait for master's students WITHOUT a German/EU-funded scholarship is 'more than 27 months' (page dated 4 Jun 2026). This decides whether an Oct 2027 arrival is possible. 2) Book IELTS Academic (in person; the embassy accepts in-person certificates only). Pick the earliest slot in Oct - early Nov 2026 so a retake fits before mid-Feb 2027. Paper results come ~13 days after the test; computer-delivered results are usually faster (confirm when booking). 3) Check the ISSUE DATE of your uni-assist VPD (valid 1 year) and the ECTS it shows for your NSU degree; note the 2.25 grade. 4) Start collecting: transcripts, degree certificate, HSC/SSC, translations, syllabus/module descriptions, employer letters (SQA experience), passport, CV, portfolio. — URGENT: (a) embassy queue status, (b) IELTS booking, (c) VPD date. DAAD EPOS 2027/28: most remaining course deadlines fall 1 Oct - 15 Dec 2026 - check the official list now (few/no CS courses; requires >=2 yrs professional experience)."
      },
      {
          "time": "(past) Oct 2026",
          "focus": "IELTS preparation + scholarship scan + GRE decision",
          "desc": "1) IELTS prep: aim for 6.5+ overall with no band below 6.0 for B2 programmes; ~7.0 if you want Munster/Hannover/Potsdam (C1) - conversion to be confirmed with each university. 2) Scholarships (German-government or EU-funded = 'qualified student' fast lane): check DAAD EPOS 2027/28 list, DAAD Bangladesh scholarship database, Erasmus Mundus joint masters (typical deadlines Jan-Feb; verify), publicly funded university scholarships (tuition waivers alone do NOT count). 3) Decide on GRE: needed for Kiel (Q>=55th pct), HSRW (TestAS>=100 or GRE 160/145/4.5), Paderborn (Q>=157, AWA>=3.5, or dMat>=50%), Munster (GMAT/GRE). Bamberg (V153/Q164/AWA4.0) is probably not worth the effort given the grade cut-off. 4) Draft master SOP + CV; ask 2-3 referees now (Saarland/RPTU need 2 letters). — URGENT: EPOS deadlines (Oct-Dec 2026). Email Worms, Deggendorf, THI (Sociotechnical Cybersecurity: is there a winter intake?), Bamberg, HSRW to resolve conflicting information."
      },
      {
          "time": "Nov 2026 (NOW, from 19 Nov; IELTS plan starts 25 Nov)",
          "focus": "IELTS booking + prep start + document readiness",
          "desc": "1) IELTS: book Academic (computer-delivered, in person) for 16-19 Jan 2027 and start the 8-week plan on 25 Nov - see sheet 'IELTS Roadmap 25Nov-20Jan'. IDP Bangladesh no longer offers paper-based IELTS (after 31 Jan 2026); computer results usually take 2-5 days. 2) Embassy: on 16 Nov 2026 the Dhaka embassy announced a digital Consular Services Portal for all student-visa applications from 1 Jan 2027; reports say the old waiting list is discontinued and a fresh application is required. Read digital.diplo.de and the embassy page now. Do not assume the earlier 'more than 27 months' figure still applies - no new waiting-time figure has been published. 3) Documents: transcripts, degree certificate, HSC/SSC, translations, module descriptions, employer letters (Eclectic Sep 2024 - Feb 2026, Dream71 Jan - Sep 2024, George Design IT support 2021-2023), passport, CV with the Jun 2023 - Jan 2024 and Feb 2026 - present gaps explained. 4) Check whether South Westphalia (est. window from ~15 Nov 2026) is already open and whether a certificate may be uploaded later. 5) Check the ISSUE DATE of your uni-assist VPD (valid 1 year) and the ECTS it shows. — MUST DO: book the IELTS slot this week; read digital.diplo.de. Only BTU has officially published WS 2027/28 dates so far (see Deadline Status Register)."
      },
      {
          "time": "Dec 2026",
          "focus": "IELTS prep (weeks 2-5) + GRE decision + scholarship check",
          "desc": "1) Follow the weekly IELTS plan: baseline mock by 1 Dec, second full mock by 22 Dec; fix the weakest band first. 2) GRE: decide by 15 Dec. Needed for Kiel (Quant >=55th percentile); TestAS/GATE/GRE for HSRW; GRE or dMat (>=50%) for Paderborn. ETS runs the General Test year-round (centre or at home), US$249 since 1 Aug 2026, scores about 8-10 days after the test, 21 days between attempts. Book a slot for 25 Jan - 28 Feb 2027 so it does not collide with IELTS week. 3) Request recommendation letters and draft the SOP/CV. 4) DAAD EPOS 2027/28: first deadlines passed 15 Oct 2026; the remaining course deadlines vary (most by mid-Dec) and the courses are development-related, not CS - low probability. 5) Fulda GSD: start preparing for the online aptitude test (programming, algorithms/data structures, software engineering, databases). — MUST NOT MISS: IELTS slot confirmed; baseline mock done by 1 Dec; second full mock done by 22 Dec."
      },
      {
          "time": "Jan 2027",
          "focus": "IELTS exam + embassy portal + early windows",
          "desc": "1) IELTS: taper 13-15 Jan; sit the exam 16-19 Jan (20 Jan = last buffer day); results online within days - order the e-certificate/TRF copies needed for uni-assist uploads. 2) Embassy: the new digital student-visa process is reported to start 1 Jan 2027. Create the account on digital.diplo.de and read what is required for a master's application, including whether an admission letter is needed before you can queue (not confirmed). 3) Siegen portal opens ~1 Jan (one page says 15 Jan). Trier's summer-2027 window and THI Sociotechnical Cybersecurity both close 15 Jan - not reachable with a mid-Jan exam; skip them. 4) Finalise ECTS/course-content mapping for Lubeck (28 CP maths, 60 CP core CS, 12 CP IT security), TU Berlin (12 CP), Kiel (max 15 ECTS missing), Fulda; finish SOP drafts. 5) Start the GRE/TestAS/dMat sitting window (25 Jan - 28 Feb). — MUST NOT MISS: IELTS sitting by 20 Jan; GRE/TestAS/dMat taken by the end of Feb at the latest."
      },
      {
          "time": "Feb 2027",
          "focus": "Lubeck window",
          "desc": "Lubeck non-EU window ~15 Feb - 1 Apr (est.; 2026: 15 Feb - 1 Apr, extended to 15 Apr) via uni-assist: submit early with the IELTS result in hand. If the result is below target, a retake must be booked by ~10 Feb. Re-check every official page for WS 2027/28 dates (they typically appear Jan-May). — MUST NOT MISS (estimated): Lubeck opens ~15 Feb."
      },
      {
          "time": "Mar 2027",
          "focus": "BTU + early portals",
          "desc": "BTU portal opens 1 Mar (CONFIRMED on BTU's WS 2027/28 schedule): Cyber Security closes 15 May, Artificial Intelligence 15 Jul - submit via uni-assist. RWTH deadline ~1 Mar (est., reach). Keep collecting scholarship decisions. — MUST NOT MISS (confirmed): BTU Cyber Security closes 15 May 2027; AI closes 15 Jul 2027."
      },
      {
          "time": "Apr 2027",
          "focus": "Second wave opens",
          "desc": "Lubeck closes ~1 Apr (est.). Dresden and Chemnitz open ~1 Apr; Paderborn opens 15 Apr (closes 31 May, official); Hannover ~15 Apr; Goettingen ~15 Apr (2026 date, est.); OTH Amberg-Weiden ~15 Apr (est.). Siegen closes ~30 Apr (est.) - online test + interview follow. Prepare Fulda documents (window opens 1 May). — MUST NOT MISS (estimated): Siegen ~30 Apr; Lubeck ~1 Apr."
      },
      {
          "time": "May 2027",
          "focus": "Main application wave",
          "desc": "Fulda window 1 - 31 May (official current cycle; online test mid-July). Kiel window opens (May - 15 Jul). BTU Cyber Security 15 May (confirmed); Saarland/RUB ~15 May (est.); Trier 31 May (non-EU); Paderborn 31 May (official); Dresden ~31 May; TUM ~31 May (unofficial). HSRW opens ~May (to 15 Jul). Bamberg portal opens mid-May (only if you decide to attempt it). — MUST NOT MISS (estimated): Fulda 31 May; Trier 31 May; BTU CS 15 May."
      },
      {
          "time": "Jun 2027",
          "focus": "Decisions begin",
          "desc": "KIT closes 15 Jun (official KIT Informatik page - the earlier 15 Jul estimate is corrected). Potsdam ~1 Jun (reach); OTH ~8 Jun; TU Berlin window not established (aggregators: 1 Jun - 31 Aug vs ~15 May) - check the official page. Early admission letters (Lubeck/BTU/Trier) may arrive. As soon as you hold a valid admission letter, check whether the new embassy portal wants it for registration (scholarship holders from German/EU funds are prioritised). — Check what the new embassy portal requires the day you get an admission letter (under the old system an admission letter was needed to register; the new rules are not confirmed)."
      },
      {
          "time": "Jul 2027",
          "focus": "Peak deadline cluster",
          "desc": "~15 Jul (est.): Kiel (statutory; documents must be RECEIVED by uni-assist), Darmstadt, BTU AI (confirmed 15 Jul), Munster, Chemnitz (official: all documents received by 15 Jul), Kassel, BHT, HSRW, Bamberg. Fulda online test mid-July. uni-assist needs 6-8 weeks - documents in by late May. — MUST NOT MISS (estimated): 15 July cluster. uni-assist needs 6-8 weeks - documents in by late May."
      },
      {
          "time": "Aug 2027",
          "focus": "Decisions + financial proof",
          "desc": "Collect admission letters; confirm scholarship funding. Open the blocked account (embassy requirement: EUR 11,904 with EUR 992/month release - confirm current figure). Arrange travel health insurance valid from arrival to enrolment (min. 3 months). — Blocked account + insurance ready before the visa appointment."
      },
      {
          "time": "Sep 2027",
          "focus": "Visa appointment (only if queue allows)",
          "desc": "Process note: the embassy moves student visas to the digital Consular Services Portal from 1 Jan 2027 - follow the portal's instructions. If the embassy allocates an appointment: submit via VFS with admission letter, IELTS, transcripts, motivation letter, CV, insurance, blocked-account proof. Processing ~4 weeks; the visa is issued only within 3 months of your arrival date. The embassy does NOT take enrolment or exam dates into account. Trier enrolment deadline 15 Sep; its admission stays valid for 2 semesters. — Do not book flights until the visa is issued."
      },
      {
          "time": "Oct 2027",
          "focus": "Semester start (only if visa issued)",
          "desc": "Winter semesters start 1 Oct (lectures typically first two weeks of Oct; BTU WS 2027/28: lectures from 4 Oct 2027 (official schedule)). Enrol on arrival; Anmeldung within 14 days; statutory health insurance. — If no appointment yet: keep the admission valid (Trier 2 semesters) or re-apply for Summer 2028 / Winter 2028."
      },
      {
          "time": "Nov 2027 →",
          "focus": "Enrollment",
          "desc": "Complete on-site enrollment formalities at your chosen university (only if the visa was issued in time; otherwise keep the admission valid or move to Summer/Winter 2028)."
      }
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

    document.getElementById("countryFilter").addEventListener("change", (e) => {
      state.country = e.target.value;
      populateStateFilter(); // state options depend on which country is selected
      renderTable();
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
    populateCountryFilter();
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
