// ======================
// LOAD STUDENT DATA
// ======================

let students = JSON.parse(localStorage.getItem("students")) || [];

let roll = localStorage.getItem("studentRoll");

let student = students.find(s => s.roll === roll);

if (!student) {
  alert("Student not found");
  window.location.href = "student-login.html";
}

// show name + roll
document.getElementById("studentName").innerText = student.name;
document.getElementById("studentRoll").innerText = student.roll;


// ======================
// CALCULATE ATTENDANCE
// ======================

let total = 0;
let present = 0;

if (student.attendance) {

  total = Object.keys(student.attendance).length;

  Object.values(student.attendance).forEach(status => {

    if (status === "Present") {
      present++;
    }

  });

}

let absent = total - present;

let percent = total === 0 ? 0 : Math.round((present / total) * 100);


// show stats
document.getElementById("studentPercent").innerText = percent + "%";
document.getElementById("studentTotal").innerText = total;
document.getElementById("studentPresent").innerText = present;
document.getElementById("studentAbsent").innerText = absent;



// ======================
// ATTENDANCE CHART
// ======================

let ctx = document.getElementById("studentChart");

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



// ======================
// ATTENDANCE HISTORY
// ======================

function showStudentAttendance() {

  let div = document.getElementById("studentAttendance");

  let html = "<h3>Attendance History</h3>";

  html += "<table border='1'>";
  html += "<tr><th>Date</th><th>Status</th></tr>";

  if (student.attendance) {

    for (let date in student.attendance) {

      html += `
            <tr>
            <td>${date}</td>
            <td>${student.attendance[date]}</td>
            </tr>
            `;

    }

  }

  html += "</table>";

  div.innerHTML = html;

}

showStudentAttendance();