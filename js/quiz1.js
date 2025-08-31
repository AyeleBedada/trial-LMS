// =====================
// Quiz 1 (40% weight)
// =====================
const quiz1Questions = [
  {
    question: "Architecture is both an art and a science.",
    options: ["True", "False"],
    answer: 0
  },
  {
    question: "Architecture does not reflect cultural identity.",
    options: ["True", "False"],
    answer: 1
  },
  {
    question: "Every building tells a story of its time and people.",
    options: ["True", "False"],
    answer: 0
  },
  {
    question: "Architects only design for beauty, not safety.",
    options: ["True", "False"],
    answer: 1
  }
];

let quiz1Attempts = JSON.parse(localStorage.getItem("quiz1Attempts")) || 0;
let quiz1Score = JSON.parse(localStorage.getItem("quiz1Score")) || 0;

function loadQuiz1() {
  const container = document.getElementById("quiz1-container");
  container.innerHTML = "";
  quiz1Questions.forEach((q, index) => {
    const div = document.createElement("div");
    div.classList.add("quiz-question");
    div.innerHTML = `<p>${index + 1}. ${q.question}</p>`;
    q.options.forEach((opt, i) => {
      div.innerHTML += `
        <label>
          <input type="radio" name="q${index}" value="${i}"> ${opt}
        </label><br>`;
    });
    container.appendChild(div);
  });
}

function submitQuiz1() {
  if (quiz1Attempts >= 3) {
    document.getElementById("quiz1-feedback").textContent =
      "You have used all 3 attempts!";
    return;
  }

  let score = 0;
  quiz1Questions.forEach((q, index) => {
    const selected = document.querySelector(
      `input[name="q${index}"]:checked`
    );
    if (selected) {
      if (parseInt(selected.value) === q.answer) {
        score += 10; // 4 Qs → 40 points
        selected.parentElement.classList.add("correct");
      } else {
        selected.parentElement.classList.add("incorrect");
      }
    }
  });

  quiz1Attempts++;
  quiz1Score = score;
  localStorage.setItem("quiz1Attempts", JSON.stringify(quiz1Attempts));
  localStorage.setItem("quiz1Score", JSON.stringify(quiz1Score));

  document.getElementById(
    "quiz1-feedback"
  ).textContent = `Score: ${score}/40. Attempt ${quiz1Attempts}/3`;

  updateProgress();
}

document.getElementById("quiz1-submit").addEventListener("click", submitQuiz1);

loadQuiz1();
updateProgress();
