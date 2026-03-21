// dashboard.js mein top pe add karo
let students = [];

// Load data from Firebase
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof window.loadStudentsFromCloud === 'function') {
        await window.loadStudentsFromCloud();
        students = window.students || [];
    }
    
    loadDashboard();
    createChart();
});

function loadDashboard() {
    let total = students.length;
    let today = new Date().toISOString().split("T")[0];
    let present = students.filter(s => s.attendance && s.attendance[today] === "Present").length;
    let absent = total - present;
    let percent = total === 0 ? 0 : Math.round((present / total) * 100);
    
    // Update UI...
    if (document.getElementById("totalStudents")) {
        document.getElementById("totalStudents").innerText = total;
        document.getElementById("absentCount").innerText = absent;
        document.getElementById("attendancePercent").innerText = percent + "%";
    }
}
// ======================
// ROLE SECURITY
// ======================

let role = localStorage.getItem("role");

if (role !== "teacher") {
  alert("Access Denied. Teacher login required.");
  window.location.href = "teacher-login.html";
}
// Load students from localStorage
let students = JSON.parse(localStorage.getItem("students")) || [];

function loadDashboard() {

  // Refresh data
  students = JSON.parse(localStorage.getItem("students")) || [];

  let total = students.length;

  let today = new Date().toISOString().split("T")[0];

  let present = 0;

  students.forEach(student => {

    if (student.attendance && student.attendance[today] === "Present") {
      present++;
    }

  });

  let absent = total - present;

  let percent = total === 0 ? 0 : Math.round((present / total) * 100);

  // Update dashboard
  document.getElementById("totalStudents").innerText = total;
  document.getElementById("absentCount").innerText = absent;
  document.getElementById("attendancePercent").innerText = percent + "%";

}

// ===============================
// Chart Analytics
// ===============================
function createChart() {

  students = JSON.parse(localStorage.getItem("students")) || [];

  let today = new Date().toISOString().split("T")[0];

  let present = 0;

  students.forEach(student => {

    if (student.attendance && student.attendance[today] === "Present") {
      present++;
    }

  });

  let absent = students.length - present;

  let ctx = document.getElementById("attendanceChart");

  if (!ctx) return;

  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Present", "Absent"],
      datasets: [{
        data: [present, absent],
        backgroundColor: [
          "#2ecc71",
          "#e74c3c"
        ]
      }]
    }
  });

}


// Run when page loads
window.onload = function () {

  loadDashboard();
  createChart();

};