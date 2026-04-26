const screens = {
  home: document.getElementById("home-screen"),
  card: document.getElementById("card-screen"),
  hearts: document.getElementById("hearts-screen")
};

const startBtn = document.getElementById("start-btn");
const notificationsBtn = document.getElementById("notifications-btn");
const notifBadge = document.getElementById("notif-badge");
const showHeartsBtn = document.getElementById("show-hearts-btn");
const backToCardsBtn = document.getElementById("back-to-cards-btn");
const heartBtn = document.getElementById("heart-btn");
const skipBtn = document.getElementById("skip-btn");
const profileCard = document.getElementById("profile-card");
const sentHeartsList = document.getElementById("sent-hearts-list");
const receivedHeartsList = document.getElementById("received-hearts-list");
const feedback = document.getElementById("feedback");
const notificationToast = document.getElementById("notification-toast");

const SWIPE_THRESHOLD = 120;
const RECEIVE_POLLING_MS = 15000;

let students = [];
let currentUser = null;
let currentIndex = 0;
let lastUnreadCount = 0;
let toastTimerId;
const sentHeartIds = new Set();
const readReceivedIds = new Set();

const swipeState = {
  active: false,
  startX: 0,
  deltaX: 0
};

function showScreen(screenName) {
  Object.values(screens).forEach((screen) => screen.classList.remove("active"));
  screens[screenName].classList.add("active");
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getReceivedStudents() {
  return students.filter((student) => student.receivedFrom.includes(currentUser.id));
}

function showToast(message) {
  if (!message) return;

  if (toastTimerId) {
    window.clearTimeout(toastTimerId);
  }

  notificationToast.textContent = message;
  notificationToast.classList.add("show");

  toastTimerId = window.setTimeout(() => {
    notificationToast.classList.remove("show");
  }, 2800);
}

function updateNotificationState({ showToastOnIncrease = false } = {}) {
  const unreadStudents = getReceivedStudents().filter(
    (student) => !readReceivedIds.has(student.id)
  );
  const unreadCount = unreadStudents.length;

  notifBadge.textContent = String(unreadCount);
  notifBadge.classList.toggle("show", unreadCount > 0);

  if (showToastOnIncrease && unreadCount > lastUnreadCount) {
    const newest = unreadStudents[0];
    showToast(`💌 ${newest.name}さんから興味が届きました`);
  }

  lastUnreadCount = unreadCount;
}

function markReceivedAsRead() {
  getReceivedStudents().forEach((student) =>
    readReceivedIds.add(student.id)
  );
  updateNotificationState();
}

function applyCardDragStyle(deltaX) {
  const rotation = deltaX / 18;
  profileCard.style.transform = `translateX(${deltaX}px) rotate(${rotation}deg)`;

  const opacity = Math.min(Math.abs(deltaX) / SWIPE_THRESHOLD, 1);
  profileCard.dataset.swipe = deltaX > 0 ? "right" : deltaX < 0 ? "left" : "none";
  profileCard.style.setProperty("--swipe-opacity", opacity.toFixed(2));
}

function resetCardDragStyle(withTransition = true) {
  profileCard.classList.toggle("no-transition", !withTransition);
  profileCard.style.transform = "";
  profileCard.style.setProperty("--swipe-opacity", "0");
  profileCard.dataset.swipe = "none";
}

function renderCard() {
  const student = students[currentIndex];
  resetCardDragStyle(false);

  if (!student) {
    profileCard.innerHTML = `
      <div class="card-body">
        <h3>表示できる先輩がいません</h3>
        <p class="bio">もう一度最初から見たい場合はページを更新してください。</p>
      </div>
    `;
    heartBtn.disabled = true;
    skipBtn.disabled = true;
    return;
  }

  heartBtn.disabled = false;
  skipBtn.disabled = false;

  profileCard.innerHTML = `
    <div class="swipe-label swipe-like">興味あり ❤</div>
    <div class="swipe-label swipe-skip">また今度</div>
    <img class="profile-photo" src="${escapeHtml(student.photo)}" alt="${escapeHtml(student.name)}の写真" />
    <div class="card-body">
      <div class="name-row">
        <h3>${escapeHtml(student.name)}</h3>
        <span class="nickname">(${escapeHtml(student.nickname)})</span>
        <span class="grade">${escapeHtml(student.grade)}</span>
      </div>
      <p class="intro">${escapeHtml(student.intro)}</p>
      <p class="bio">${escapeHtml(student.bio)}</p>
      <div class="tags">
        ${student.hashtags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
      </div>
    </div>
  `;
}

function moveNextCard() {
  currentIndex += 1;
  renderCard();
}

function sendHeart(student) {
  if (sentHeartIds.has(student.id)) {
    feedback.textContent = `${student.name}さんにはすでにハートを送っています`;
    return false;
  }

  sentHeartIds.add(student.id);
  feedback.textContent = `ハートを送りました：${student.name}さんに興味を送りました`;
  renderHeartLists();
  return true;
}

function handleSkip() {
  feedback.textContent = "また今度にしました";
  moveNextCard();
}

function handleHeart() {
  const student = students[currentIndex];
  if (!student) return;

  if (!sendHeart(student)) return;

  moveNextCard();
}

function handleSwipeAction(direction) {
  const student = students[currentIndex];
  if (!student) return;

  if (direction === "right") {
    if (!sendHeart(student)) {
      resetCardDragStyle(true);
      return;
    }
  }

  if (direction === "left") {
    feedback.textContent = "また今度にしました";
  }

  profileCard.style.transform = `translateX(${direction === "right" ? 700 : -700}px)`;
  profileCard.style.opacity = "0";

  setTimeout(() => {
    profileCard.style.opacity = "1";
    moveNextCard();
  }, 180);
}

function createListItems(listElement, items, formatter) {
  listElement.innerHTML = "";
  if (items.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "まだありません";
    listElement.appendChild(li);
    return;
  }

  items.forEach(item => {
    const li = document.createElement("li");
    li.textContent = formatter(item);
    listElement.appendChild(li);
  });
}

function renderHeartLists() {
  const sentStudents = students.filter(student => sentHeartIds.has(student.id));
  createListItems(sentHeartsList, sentStudents, student => `${student.name} (${student.nickname})`);

  createListItems(
    receivedHeartsList,
    getReceivedStudents(),
    student => `${student.name}さんがあなたに興味を持っています`
  );
}

async function init() {
  const response = await fetch("./data/students.json");
  const data = await response.json();
  students = data.students;
  currentUser = data.currentUser;

  renderCard();
  renderHeartLists();
  updateNotificationState({ showToastOnIncrease: true });
}

startBtn.addEventListener("click", () => showScreen("card"));
showHeartsBtn.addEventListener("click", () => {
  renderHeartLists();
  showScreen("hearts");
  markReceivedAsRead();
});
backToCardsBtn.addEventListener("click", () => showScreen("card"));
heartBtn.addEventListener("click", handleHeart);
skipBtn.addEventListener("click", handleSkip);

init();