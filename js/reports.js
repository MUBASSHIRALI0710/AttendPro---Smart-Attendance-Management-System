// reports.js - FINAL (No variable redeclaration)

// ========== MAIN LOAD FUNCTION ==========
async function loadReportsData() {
  console.log("Loading reports data...");

  // Use global window.students directly
  let students = window.students || [];

  // If empty, try loading from cloud
  if (
    students.length === 0 &&
    typeof window.loadStudentsFromCloud === "function"
  ) {
    console.log("Fetching from Supabase...");
    await window.loadStudentsFromCloud();
    students = window.students || [];
  }

  // Fallback to localStorage
  if (students.length === 0) {
    const backup = localStorage.getItem("students_backup");
    if (backup) {
      students = JSON.parse(backup);
      window.students = students;
      console.log("Loaded from localStorage backup, count:", students.length);
    }
  }

  if (students.length > 0) {
    loadMonthlyReport(students);
    loadTopStudents(students);
    loadLowAttendance(students);
    loadChart(students);
    loadSummaryStats(students);
  } else {
    console.warn("No student data available");
    const monthlyTable = document.getElementById("monthlyReport");
    if (monthlyTable)
      monthlyTable.innerHTML =
        '<tr><td colspan="4" style="text-align:center; padding:40px;">⚠️ No data. Please add students first.</td></tr>';
    const topList = document.getElementById("topStudents");
    if (topList) topList.innerHTML = "<li>No data</li>";
    const lowList = document.getElementById("lowAttendance");
    if (lowList) lowList.innerHTML = "<li>No data</li>";
  }
}

// ========== INIT ==========
document.addEventListener("DOMContentLoaded", () => {
  loadReportsData();
});

// ========== Helper Functions ==========
function getAttendancePercent(student) {
  if (!student.attendance) return 0;
  let total = Object.keys(student.attendance).length;
  if (total === 0) return 0;
  let present = Object.values(student.attendance).filter(
    (s) => s === "Present",
  ).length;
  return Math.round((present / total) * 100);
}

function getTotalClasses(students) {
  let allDates = new Set();
  students.forEach((s) => {
    if (s.attendance) Object.keys(s.attendance).forEach((d) => allDates.add(d));
  });
  return allDates.size;
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function showNotification(msg, type) {
  const n = document.createElement("div");
  n.innerHTML = `<i class="fa-solid fa-${type === "success" ? "check-circle" : "info-circle"}"></i><span>${msg}</span>`;
  n.style.cssText = `position:fixed; bottom:20px; right:20px; padding:12px 20px; background:${type === "success" ? "#2ecc71" : "#3498db"}; color:white; border-radius:8px; z-index:1000;`;
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 3000);
}

// ========== Monthly Report ==========
function loadMonthlyReport(students) {
  let table = document.getElementById("monthlyReport");
  if (!table) return;
  table.innerHTML = "";
  let totalClasses = getTotalClasses(students);
  if (students.length === 0) {
    table.innerHTML =
      '<tr><td colspan="4" style="text-align:center; padding:40px;">No data</td></tr>';
    return;
  }
  students.forEach((s) => {
    let percent = getAttendancePercent(s);
    let presentCount = s.attendance
      ? Object.values(s.attendance).filter((v) => v === "Present").length
      : 0;
    let statusClass =
      percent >= 75
        ? "high-attendance"
        : percent >= 50
          ? "medium-attendance"
          : "low-attendance";
    let statusText =
      percent >= 75 ? "Good" : percent >= 50 ? "Needs Improvement" : "Critical";
    table.innerHTML += `<tr>
            <td><strong>${escapeHtml(s.name)}</strong><br><small>Roll: ${s.roll}</small></td>
            <td><div class="stat-circle" style="--percent:${percent}"><span>${percent}%</span></div></td>
            <td>${presentCount}/${totalClasses}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        </tr>`;
  });
}

// ========== Top Students ==========
function loadTopStudents(students) {
  let list = document.getElementById("topStudents");
  if (!list) return;
  list.innerHTML = "";
  if (students.length === 0) {
    list.innerHTML = "<li>No data</li>";
    return;
  }
  let sorted = [...students].sort(
    (a, b) => getAttendancePercent(b) - getAttendancePercent(a),
  );
  sorted.slice(0, 5).forEach((s, i) => {
    let percent = getAttendancePercent(s);
    let medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "📌";
    list.innerHTML += `<li class="top-student">
            <span class="medal">${medal}</span>
            <div class="student-info"><strong>${escapeHtml(s.name)}</strong><small>Roll: ${s.roll}</small></div>
            <span class="percent">${percent}%</span>
            <div class="mini-progress"><div class="mini-fill" style="width:${percent}%"></div></div>
        </li>`;
  });
}

// ========== Low Attendance ==========
function loadLowAttendance(students) {
  let list = document.getElementById("lowAttendance");
  if (!list) return;
  list.innerHTML = "";
  let low = students.filter((s) => getAttendancePercent(s) < 75);
  if (low.length === 0) {
    list.innerHTML =
      '<li class="no-warning">🎉 All students have good attendance!</li>';
    return;
  }
  low.sort((a, b) => getAttendancePercent(a) - getAttendancePercent(b));
  low.forEach((s) => {
    let percent = getAttendancePercent(s);
    let warning = percent < 50 ? "⚠️ Critical" : "⚠️ Warning";
    list.innerHTML += `<li class="low-student">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <div class="student-info"><strong>${escapeHtml(s.name)}</strong><small>Roll: ${s.roll}</small></div>
            <span class="percent ${percent < 50 ? "critical" : "warning"}">${percent}%</span>
            <span class="warning-text">${warning}</span>
        </li>`;
  });
}

// ========== Chart ==========
let reportChart;
function loadChart(students) {
  let ctx = document.getElementById("reportChart");
  if (!ctx) return;
  if (students.length === 0) return;
  let labels = students.map((s) =>
    s.name.length > 15 ? s.name.substring(0, 12) + "..." : s.name,
  );
  let data = students.map((s) => getAttendancePercent(s));
  if (reportChart) reportChart.destroy();
  reportChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Attendance Percentage",
          data,
          backgroundColor: data.map((p) =>
            p >= 75 ? "#2ecc71" : p >= 50 ? "#f39c12" : "#e74c3c",
          ),
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true, max: 100 } },
    },
  });
}

// ========== Summary Stats ==========
function loadSummaryStats(students) {
  let total = students.length;
  let classes = getTotalClasses(students);
  let avg =
    total === 0
      ? 0
      : Math.round(
          students.reduce((sum, s) => sum + getAttendancePercent(s), 0) / total,
        );
  let high = students.filter((s) => getAttendancePercent(s) >= 75).length;
  let critical = students.filter((s) => getAttendancePercent(s) < 50).length;
  if (document.getElementById("totalStudentsStat"))
    document.getElementById("totalStudentsStat").innerText = total;
  if (document.getElementById("totalClassesStat"))
    document.getElementById("totalClassesStat").innerText = classes;
  if (document.getElementById("avgAttendanceStat"))
    document.getElementById("avgAttendanceStat").innerText = avg + "%";
  if (document.getElementById("highAttendanceStat"))
    document.getElementById("highAttendanceStat").innerText = high;
  if (document.getElementById("criticalAttendanceStat"))
    document.getElementById("criticalAttendanceStat").innerText = critical;
}

// ========== Export ==========
function exportReport() {
  let students = window.students || [];
  if (students.length === 0) {
    showNotification("No data", "error");
    return;
  }
  let csv = "Name,Roll Number,Attendance Percentage,Status\n";
  students.forEach((s) => {
    let p = getAttendancePercent(s);
    csv += `"${s.name}",${s.roll},${p},${p >= 75 ? "Good" : p >= 50 ? "Needs Improvement" : "Critical"}\n`;
  });
  let blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  let a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `attendance_report_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  showNotification("Report exported", "success");
}

// ========== Manual Refresh (optional) ==========
window.refreshReports = function () {
  loadReportsData();
};

// Add styles if missing
if (!document.querySelector("#report-styles")) {
  const style = document.createElement("style");
  style.id = "report-styles";
  style.textContent = `
        .stat-circle{width:50px;height:50px;border-radius:50%;background:conic-gradient(#2ecc71 0% var(--percent,0%), #eef2f6 var(--percent,0%) 100%);display:flex;align-items:center;justify-content:center;}
        .stat-circle span{background:white;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:bold;}
        .status-badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:0.75rem;font-weight:600;}
        .status-badge.high-attendance{background:#e8f5e9;color:#2ecc71;}
        .status-badge.medium-attendance{background:#fff3e0;color:#f39c12;}
        .status-badge.low-attendance{background:#ffebee;color:#e74c3c;}
        .top-student,.low-student{display:flex;align-items:center;gap:12px;padding:12px;border-bottom:1px solid #eef2f6;}
        .top-student .medal{font-size:1.2rem;width:32px;}
        .student-info{flex:1;}
        .student-info strong{display:block;font-size:0.9rem;}
        .student-info small{font-size:0.7rem;color:#95a5a6;}
        .percent{font-weight:bold;min-width:50px;}
        .percent.warning{color:#f39c12;}
        .percent.critical{color:#e74c3c;}
        .mini-progress{width:80px;height:6px;background:#eef2f6;border-radius:3px;overflow:hidden;}
        .mini-fill{height:100%;background:#2ecc71;border-radius:3px;transition:width 0.3s;}
        .warning-text{font-size:0.7rem;padding:2px 8px;border-radius:12px;background:#ffebee;color:#e74c3c;}
        .no-warning{text-align:center;padding:20px;color:#2ecc71;}
    `;
  document.head.appendChild(style);
}
