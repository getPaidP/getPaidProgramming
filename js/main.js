
document.addEventListener("DOMContentLoaded", () => {
  const money = document.querySelector(".money");
  setInterval(() => {
    if (money.style.color === "red") {
      money.style.color = "white";
      return;
    } else {
      money.style.color = "red";
      return;
    }
  }, 200)

  let map;
  async function initMap() {
    const position = { lat: -25.344, lng: 131.031 };
    const { Map } = await google.maps.importLibrary("maps");
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

    // The map, centered at Uluru
    map = new Map(document.getElementById("map"), {
      zoom: 1,
      center: position,
      mapId: "DEMO_MAP_ID",
      mapTypeId: "satellite",
    });
  }
  initMap()
})
