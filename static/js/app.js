/* PageTurner client-side glue.
   Everything submits to the Django backend via fetch + CSRF token. */

(function () {
  "use strict";

  // ----- CSRF token helper ------------------------------------------------
  function getCookie(name) {
    const v = `; ${document.cookie}`;
    const parts = v.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
    return "";
  }
  const csrftoken = getCookie("csrftoken");

  function postJSON(url, data) {
    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrftoken,
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(data || {}),
      credentials: "same-origin",
    }).then(async (r) => {
      let payload = {};
      try { payload = await r.json(); } catch (_) {}
      return { ok: r.ok, status: r.status, data: payload };
    });
  }

  function postForm(url, formData) {
    return fetch(url, {
      method: "POST",
      headers: { "X-CSRFToken": csrftoken, "X-Requested-With": "XMLHttpRequest" },
      body: formData,
      credentials: "same-origin",
    }).then(async (r) => {
      let payload = {};
      try { payload = await r.json(); } catch (_) {}
      return { ok: r.ok, status: r.status, data: payload };
    });
  }

  // ----- Toast ------------------------------------------------------------
  function showToast(msg, kind) {
    const t = document.getElementById("toast");
    if (!t) { console.log(msg); return; }
    document.getElementById("toastMsg").textContent = msg;
    t.classList.add("show");
    const icon = t.querySelector("i");
    if (icon) {
      icon.className = kind === "error" ? "ti ti-alert-circle" : "ti ti-check";
    }
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove("show"), 2600);
  }
  window.showToast = showToast;

  // ----- Star rendering --------------------------------------------------
  function renderStars(rating, size) {
    size = size || 12;
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    let html = "";
    for (let i = 0; i < full; i++) html += `<i class="ti ti-star-filled star-icon" style="font-size:${size}px"></i>`;
    if (half) html += `<i class="ti ti-star-half-filled star-icon" style="font-size:${size}px"></i>`;
    for (let i = 0; i < empty; i++) html += `<i class="ti ti-star star-icon empty" style="font-size:${size}px"></i>`;
    return html;
  }
  window.renderStars = renderStars;

  // ----- Book modal -------------------------------------------------------
  let currentBookId = null;
  let userRating = 0;
  let selectedShelf = "";

  function openBook(id) {
    fetch(`/api/book/${id}/`, { credentials: "same-origin" })
      .then((r) => r.json())
      .then((b) => {
        currentBookId = b.id;
        userRating = b.user_rating || 0;
        selectedShelf = "";

        document.getElementById("modalTitle").textContent = b.title;
        document.getElementById("modalBookTitle").textContent = b.title;
        document.getElementById("modalBookAuthor").textContent = b.author;
        const cover = document.getElementById("modalCover");
        cover.style.background = b.cover_bg;
        cover.style.color = b.cover_color;
        cover.textContent = b.title;
        document.getElementById("modalStars").innerHTML = renderStars(b.avg_rating, 14);
        document.getElementById("modalRating").textContent = b.avg_rating.toFixed(1) + " avg";
        document.getElementById("modalMeta").textContent =
          (b.pages ? b.pages + " pages · " : "") + (b.year || "");
        document.getElementById("modalDesc").textContent = b.description || "";

        // Shelf badges
        const shelfMap = {
          reading: "Reading",
          read: "Read",
          want: "Want to Read",
          favorites: "Favorites",
        };
        document.querySelectorAll(".shelf-badge").forEach((badge) => {
          badge.classList.remove("active");
          if (shelfMap[b.user_shelf] && badge.dataset.shelf === shelfMap[b.user_shelf]) {
            badge.classList.add("active");
            selectedShelf = shelfMap[b.user_shelf];
          }
        });

        // Star rating input
        const sr = document.getElementById("modalStarRating");
        sr.innerHTML = [1, 2, 3, 4, 5]
          .map((n) => `<i class="ti ti-star" data-n="${n}" aria-label="${n} stars"></i>`)
          .join("");
        updateStarUI(userRating);

        document.getElementById("reviewText").value = b.user_review || "";
        document.getElementById("bookModal").style.display = "flex";
      })
      .catch((e) => {
        console.error(e);
        showToast("Couldn't load that book.", "error");
      });
  }
  window.openBook = openBook;

  function closeModal(e) {
    if (!e || e.target.id === "bookModal") {
      document.getElementById("bookModal").style.display = "none";
    }
  }
  window.closeModal = closeModal;

  function updateStarUI(n) {
    document.querySelectorAll("#modalStarRating i").forEach((s, i) => {
      const lit = i < n;
      s.className = `ti ${lit ? "ti-star-filled" : "ti-star"}`;
      s.classList.toggle("lit", lit);
    });
  }

  function saveBook() {
    if (!currentBookId) return;
    const review = document.getElementById("reviewText").value.trim();
    postJSON(`/api/book/${currentBookId}/save/`, {
      shelf: selectedShelf,
      rating: userRating,
      review,
    }).then(({ ok, data }) => {
      if (ok && data.ok) {
        showToast(data.message || "Saved.");
        closeModal();
        // Refresh page if we're on shelves/feed so it reflects the change
        if (/shelves|feed|home|profile/.test(window.location.pathname) || window.location.pathname === "/") {
          setTimeout(() => window.location.reload(), 800);
        }
      } else {
        showToast(data.error || "Couldn't save. Pick a shelf or add a rating.", "error");
      }
    });
  }
  window.saveBook = saveBook;

  // ----- Modal interactions (delegated) -----------------------------------
  document.addEventListener("click", (e) => {
    // Star rating
    const star = e.target.closest("#modalStarRating i");
    if (star) {
      userRating = parseInt(star.dataset.n, 10);
      updateStarUI(userRating);
    }
    // Shelf badge
    const badge = e.target.closest(".shelf-badge");
    if (badge) {
      document.querySelectorAll(".shelf-badge").forEach((b) => b.classList.remove("active"));
      badge.classList.add("active");
      selectedShelf = badge.dataset.shelf;
    }
  });

  document.addEventListener("mouseover", (e) => {
    const star = e.target.closest("#modalStarRating i");
    if (star && !userRating) {
      updateStarUI(parseInt(star.dataset.n, 10));
    }
  });
  document.addEventListener("mouseout", (e) => {
    if (e.target.closest("#modalStarRating") && !e.relatedTarget?.closest("#modalStarRating")) {
      updateStarUI(userRating);
    }
  });

  // ----- Like (visual only — no backend persistence on this MVP) ---------
  window.likePost = function (btn) {
    btn.classList.toggle("liked");
    const span = btn.querySelector("span");
    if (span) span.textContent = btn.classList.contains("liked") ? "Liked" : "Like";
  };

  // ----- Notifications ----------------------------------------------------
  window.markNotifRead = function (el, id) {
    if (!el.classList.contains("unread")) return;
    postJSON(`/api/notification/${id}/read/`, {}).then(({ ok }) => {
      if (!ok) return;
      el.classList.remove("unread");
      const remaining = document.querySelectorAll(".notif.unread").length;
      const sub = document.getElementById("notif-sub");
      if (sub) {
        sub.textContent = remaining
          ? `You have ${remaining} unread notification${remaining > 1 ? "s" : ""}.`
          : "All caught up!";
      }
      const badge = document.querySelector("#sb-notifications .badge");
      if (badge) {
        if (remaining) badge.textContent = remaining;
        else badge.remove();
      }
    });
  };

  // ----- Challenge goal slider ------------------------------------------
  let goalTimer = null;
  window.updateGoal = function (val) {
    const goalDisplay = document.getElementById("goalDisplay");
    if (goalDisplay) goalDisplay.textContent = val + " books";
    // Optimistically update ring
    const read = parseInt(document.getElementById("chRead").textContent, 10) || 0;
    const pct = Math.min(100, Math.round((read / val) * 100));
    const ring = document.getElementById("challengeRing");
    if (ring) {
      const c = 263.9;
      ring.style.strokeDashoffset = c * (1 - pct / 100);
    }
    document.getElementById("chGoal").textContent = "of " + val;
    document.getElementById("chPct").textContent = pct + "%";
    document.getElementById("chLeft").textContent = Math.max(0, val - read);
    // Debounced persist
    clearTimeout(goalTimer);
    goalTimer = setTimeout(() => {
      const fd = new FormData();
      fd.append("goal", val);
      postForm("/api/challenge/goal/", fd).then(({ ok }) => {
        if (ok) showToast("Goal updated.");
      });
    }, 500);
  };

  // ----- Friends: request / accept / decline / unfriend ------------------
  window.addFriend = function (btn, userId) {
    postJSON(`/api/user/${userId}/friend-request/`, {}).then(({ ok, data, status }) => {
      if (!ok) {
        showToast((data && data.error) || "Could not send request.");
        return;
      }
      if (data.status === "friends" || data.status === "already_friends") {
        btn.classList.add("following");
        btn.textContent = "Friends";
        btn.onclick = () => unfriendUser(btn, userId);
        showToast("You're now friends.");
      } else if (data.status === "pending" || data.status === "already_pending") {
        btn.classList.add("following");
        btn.textContent = "Request sent";
        btn.disabled = true;
      }
    });
  };

  window.unfriendUser = function (btn, userId) {
    if (!confirm("Remove this friend?")) return;
    postJSON(`/api/user/${userId}/unfriend/`, {}).then(({ ok }) => {
      if (!ok) return;
      btn.classList.remove("following");
      btn.disabled = false;
      btn.textContent = "Add friend";
      btn.onclick = () => addFriend(btn, userId);
      showToast("Friend removed.");
    });
  };

  window.respondRequest = function (reqId, decision) {
    const fd = new FormData();
    fd.append("decision", decision);
    postForm(`/api/friend-request/${reqId}/respond/`, fd).then(({ ok, data }) => {
      if (!ok) return;
      const card = document.getElementById(`req-${reqId}`);
      if (card) card.remove();
      showToast(decision === "accept" ? "You're now friends." : "Request declined.");
      if (decision === "accept") setTimeout(() => window.location.reload(), 600);
    });
  };

  // Legacy alias — older templates may still call toggleFollow.
  window.toggleFollow = function (btn, userId) { return addFriend(btn, userId); };

  // ----- Import a remote search result (Google Books / Open Library) -----
  window.importAndOpen = function (volumeId, source) {
    showToast("Loading book…");
    postJSON("/api/book/import/", { volume_id: volumeId, source: source || "" }).then(({ ok, data }) => {
      if (!ok || !data || !data.book) {
        showToast((data && data.error) || "Could not load that book.");
        return;
      }
      openBook(data.book.id);
    });
  };

  // ----- Report content --------------------------------------------------
  window.reportContent = function (targetType, targetId) {
    const reason = prompt("Reason (spam / harassment / inappropriate / fake / other):", "spam");
    if (!reason) return;
    const detail = prompt("Optional details:", "") || "";
    postJSON("/api/report/", { target_type: targetType, target_id: targetId, reason, detail })
      .then(({ ok, data }) => {
        showToast((data && data.message) || (ok ? "Reported." : "Could not report."));
      });
  };

  // ----- Search: enter to submit -----------------------------------------
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const q = searchInput.value.trim();
        window.location.href = "/discover/" + (q ? "?q=" + encodeURIComponent(q) : "");
      }
    });
  }

  // ----- Close modal on Escape -------------------------------------------
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
})();
