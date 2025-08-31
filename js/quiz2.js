// =====================
// Quiz 2 (60% weight)
// =====================
const quiz2Questions = [
  {
    question: "Modern architecture often embraces minimalism.",
    options: ["True", "False"],
    answer: 0
  },
  {
    question: "Glass and steel are rarely used in modern architecture.",
    options: ["True", "False"],
    answer: 1
  },
  {
    question: "Sustainable design focuses on energy efficiency.",
    options: ["True", "False"],
    answer: 0
  },
  {
    question: "Climate adaptation is ignored in modern architecture.",
    options: ["True", "False"],
    answer: 1
  },
  {
    question: "The Sydney Opera House is an example of contemporary architecture.",
    options: ["True", "False"],
    answer: 0
  },
  {
    question: "The Burj Khalifa demonstrates ambition in global architecture.",
    options: ["True", "False"],
    answer: 0
  }
];

let quiz2Attempts = JSON.parse(localStorage.getItem("quiz2Attempts")) || 0;
let quiz2Score = JSON.parse(localStorage.getItem("quiz2Score")) || 0;

function loadQuiz2() {
  const container = document.getElementById("quiz2-container");
  container.innerHTML = "";
  quiz2Questions.forEach((q, index) => {
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

function submitQuiz2() {
  if (quiz2Attempts >= 3) {
    document.getElementById("quiz2-feedback").textContent =
      "You have used all 3 attempts!";
    return;
  }

  let score = 0;
  quiz2Questions.forEach((q, index) => {
    const selected = document.querySelector(
      `input[name="q${index}"]:checked`
    );
    if (selected) {
      if (parseInt(selected.value) === q.answer) {
        score += 10; // 6 Qs → 60 points
        selected.parentElement.classList.add("correct");
      } else {
        selected.parentElement.classList.add("incorrect");
      }
    }
  });

  quiz2Attempts++;
  quiz2Score = score;
  localStorage.setItem("quiz2Attempts", JSON.stringify(quiz2Attempts));
  localStorage.setItem("quiz2Score", JSON.stringify(quiz2Score));

  document.getElementById(
    "quiz2-feedback"
  ).textContent = `Score: ${score}/60. Attempt ${quiz2Attempts}/3`;

  updateProgress();
}

document.getElementById("quiz2-submit").addEventListener("click", submitQuiz2);

loadQuiz2();
updateProgress();
