document.addEventListener("DOMContentLoaded", () => {

  /*------------ creating elements -----------*/
  const changeBackgroundDiv = document.createElement("div");
  changeBackgroundDiv.classList.add("change-background-pic");
  document.body.insertBefore(changeBackgroundDiv, document.body.firstChild);

  const urlInput = document.createElement("input");
  urlInput.type = "url";
  urlInput.id = "url-input";
  urlInput.classList.add("custom-input");
  urlInput.placeholder = "enter url to image";
  changeBackgroundDiv.appendChild(urlInput);

  const clearInputBtn = document.createElement("button");
  clearInputBtn.innerText = "X";
  clearInputBtn.classList.add("custom-input");
  changeBackgroundDiv.appendChild(clearInputBtn);

  const urlBtn = document.createElement("button");
  urlBtn.innerText = ">";
  urlBtn.classList.add("custom-input");
  changeBackgroundDiv.appendChild(urlBtn);

  const urlMessages = document.createElement("div");
  urlMessages.classList.add("url-messages");
  changeBackgroundDiv.appendChild(urlMessages);
  /* ---------------------------------------- */


  /* ---------- check local storage ---------*/
  const storedPicData = JSON.parse(localStorage.getItem("page-bg-link")) || {};
  if (storedPicData[window.location.pathname]) {
    urlInput.value = storedPicData[window.location.pathname];
    changeBackgroundPic();
  }
  /* ----------------------------------------*/


  /* -------------- event listeners --------------- */
  async function changeBackgroundPic() {
    const res = await replaceUrl(urlInput.value);
    if (res.success) {
      storedPicData[window.location.pathname] = urlInput.value;
      localStorage.setItem("page-bg-link", JSON.stringify(storedPicData));
    }
    urlMessages.innerHTML = res.message;
    setTimeout(() => {
      urlMessages.innerHTML = "";
    }, 1000)
  }
  urlBtn.addEventListener("click", changeBackgroundPic);

  function clearUrlInput() {
    urlInput.value = "";
  }
  clearInputBtn.addEventListener("click", clearUrlInput);
  /* ----------------------------------------*/
})


async function replaceUrl(url) {
  const urlPattern = /(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp|svg))/i;
  if (!urlPattern.test(url)) {
    return { success: false, message: "invalid url" };
  }
  const img = new Image();
  img.src = url;

  return new Promise(resolve => {
    img.onload = () => {
      // if image loads correctly
      document.body.style.backgroundImage = `url(${url})`;
      resolve({ success: true, message: "changed background image" });
    }
    img.onerror = () => {
      // if image fails to load
      resolve({ success: false, message: "failed to load image" });
    }
  })
}

