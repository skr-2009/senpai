const screens = {
  home: document.getElementById("home-screen"),
  card: document.getElementById("card-screen"),
  hearts: document.getElementById("hearts-screen"),
  notifications: document.getElementById("notifications-screen")
};

const startBtn = document.getElementById("start-btn");
const notificationsBtn = document.getElementById("notifications-btn");
const backFromNotificationsBtn = document.getElementById("back-from-notifications-btn");
const notifBadge = document.getElementById("notif-badge");
const showHeartsBtn = document.getElementById("show-hearts-btn");
const backToCardsBtn = document.getElementById("back-to-cards-btn");
const heartBtn = document.getElementById("heart-btn");
const skipBtn = document.getElementById("skip-btn");
const profileCard = document.getElementById("profile-card");
const sentHeartsList = document.getElementById("sent-hearts-list");
const receivedHeartsList = document.getElementById("received-hearts-list");
const inboxList = document.getElementById("inbox-list");
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
  getReceivedStudents().forEach((student) => readReceivedIds.add(student.id));
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
    <img class="profile-photo" src="${escapeHtml(student.photo)}" />
    <div class="card-body">
      <h3>${escapeHtml(student.name)}</h3>
      <p>${escapeHtml(student.bio)}</p>
    </div>
  `;
}

function moveNextCard() {
  currentIndex++;
  renderCard();
}

function handleHeart() {
  const student = students[currentIndex];
  if (!student) return;

  sentHeartIds.add(student.id);
  feedback.textContent = `ハートを送りました`;
  moveNextCard();
}

function handleSkip() {
  feedback.textContent = "また今度にしました";
  moveNextCard();
}

startBtn.addEventListener("click", () => showScreen("card"));
heartBtn.addEventListener("click", handleHeart);
skipBtn.addEventListener("click", handleSkip);

init();

async function init() {
  const res = await fetch("./data/students.json");
  const data = await res.json();
  students = data.students;
  currentUser = data.currentUser;
  renderCard();
}
