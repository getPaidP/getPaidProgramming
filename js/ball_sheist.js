document.addEventListener("DOMContentLoaded", () => {
  const money = document.querySelector(".money");


  document.addEventListener("click", (e) => {
    if (e.target === money) {
    console.log("click")
    window.location.href = money.href;
    }
  })
})
