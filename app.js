const screens = {
  home: document.getElementById("home-screen"),
  card: document.getElementById("card-screen"),
  hearts: document.getElementById("hearts-screen")
};

const startBtn = document.getElementById("start-btn");
const showHeartsBtn = document.getElementById("show-hearts-btn");
const backToCardsBtn = document.getElementById("back-to-cards-btn");
const heartBtn = document.getElementById("heart-btn");
const skipBtn = document.getElementById("skip-btn");
const profileCard = document.getElementById("profile-card");
const sentHeartsList = document.getElementById("sent-hearts-list");
const receivedHeartsList = document.getElementById("received-hearts-list");
const feedback = document.getElementById("feedback");

let students = [];
let currentUser = null;
let currentIndex = 0;
const sentHeartIds = new Set();

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

function renderCard() {
  const student = students[currentIndex];
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
        ${student.hashtags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
      </div>
    </div>
  `;
}

function moveNextCard() {
  currentIndex += 1;
  renderCard();
}

function handleSkip() {
  feedback.textContent = "スキップしました";
  moveNextCard();
}

function handleHeart() {
  const student = students[currentIndex];
  if (!student) {
    return;
  }

  if (sentHeartIds.has(student.id)) {
    feedback.textContent = `${student.name}さんにはすでにハートを送っています`;
    return;
  }

  sentHeartIds.add(student.id);
  feedback.textContent = `ハートを送りました：${student.name}さんに興味を送りました`;
  renderHeartLists();
  moveNextCard();
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

  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = formatter(item);
    listElement.appendChild(li);
  });
}

function renderHeartLists() {
  const sentStudents = students.filter((student) => sentHeartIds.has(student.id));
  createListItems(sentHeartsList, sentStudents, (student) => `${student.name} (${student.nickname})`);

  const receivedStudents = students.filter((student) => student.receivedFrom.includes(currentUser.id));
  createListItems(
    receivedHeartsList,
    receivedStudents,
    (student) => `${student.name}さんがあなたに興味を持っています`
  );
}

async function init() {
  const response = await fetch("./data/students.json");
  const data = await response.json();
  students = data.students;
  currentUser = data.currentUser;

  renderCard();
  renderHeartLists();
}

startBtn.addEventListener("click", () => showScreen("card"));
showHeartsBtn.addEventListener("click", () => {
  renderHeartLists();
  showScreen("hearts");
});
backToCardsBtn.addEventListener("click", () => showScreen("card"));
heartBtn.addEventListener("click", handleHeart);
skipBtn.addEventListener("click", handleSkip);

init().catch((error) => {
  profileCard.innerHTML = `
    <div class="card-body">
      <h3>データ読み込みエラー</h3>
      <p class="bio">${escapeHtml(error.message)}</p>
    </div>
  `;
});
