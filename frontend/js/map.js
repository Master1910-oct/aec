/*************************************************
 * Live Hospital Map – Leaflet + Socket.IO
 *************************************************/

// 1️⃣ Initialize Map
const map = L.map("map").setView([12.9716, 77.5946], 6);

// 2️⃣ Load OpenStreetMap tiles
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors"
}).addTo(map);

// 3️⃣ Store hospital markers by ID
const hospitalMarkers = {};

// 4️⃣ Function to add hospital marker
function addHospitalMarker(hospital) {
  const color = hospital.status === "GREEN" ? "green" : "red";

  // If marker already exists, update it
  if (hospitalMarkers[hospital.id]) {
    hospitalMarkers[hospital.id].setStyle({
      color: color,
      fillColor: color
    });

    hospitalMarkers[hospital.id].setPopupContent(`
      <b>${hospital.name}</b><br>
      Beds Available: ${hospital.available_beds}<br>
      Status: ${hospital.status}
    `);
    return;
  }

  // Create new marker
  const marker = L.circleMarker(
    [hospital.latitude, hospital.longitude],
    {
      radius: 10,
      color: color,
      fillColor: color,
      fillOpacity: 0.8
    }
  ).addTo(map);

  marker.bindPopup(`
    <b>${hospital.name}</b><br>
    Beds Available: ${hospital.available_beds}<br>
    Status: ${hospital.status}
  `);

  hospitalMarkers[hospital.id] = marker;
}

// 5️⃣ Load existing hospitals from backend
fetch("http://127.0.0.1:5001/api/hospitals")
  .then(response => response.json())
  .then(hospitals => {
    hospitals.forEach(hospital => {
      addHospitalMarker(hospital);
    });
  })
  .catch(error => {
    console.error("Error loading hospitals:", error);
  });

// 6️⃣ Connect to Socket.IO backend
const socket = io("http://127.0.0.1:5001");

// 7️⃣ Listen for new hospital additions
socket.on("hospital_added", (data) => {
  console.log("New hospital received:", data);
  addHospitalMarker(data);
});

// 8️⃣ (Optional) Listen for bed availability updates (future-ready)
socket.on("availability_updated", (data) => {
  console.log("Live bed update:", data);

  if (hospitalMarkers[data.id]) {
    const color = data.status === "GREEN" ? "green" : "red";

    hospitalMarkers[data.id].setStyle({
      color: color,
      fillColor: color
    });

    hospitalMarkers[data.id].setPopupContent(`
      <b>Hospital ID: ${data.id}</b><br>
      Beds Available: ${data.available_beds}<br>
      Status: ${data.status}
    `);
  }
});
