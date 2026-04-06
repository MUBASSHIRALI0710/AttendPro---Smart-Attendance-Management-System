// student-dashboard.js - Fixed
let student = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Ensure students are loaded from cloud
    if (window.students.length === 0) {
        if (typeof window.loadStudentsFromCloud === 'function') {
            await window.loadStudentsFromCloud();
        }
    }
    // Use global students array
    const students = window.students;
    
    let roll = localStorage.getItem("studentRoll");
    if (!roll) {
        alert("No student logged in. Please login again.");
        window.location.href = "student-login.html";
        return;
    }
    
    student = students.find(s => s.roll == roll);
    
    if (!student) {
        alert("Student not found. Please login again.");
        localStorage.removeItem("studentRoll");
        window.location.href = "student-login.html";
        return;
    }
    
    document.getElementById("studentName").innerText = student.name;
    document.getElementById("studentRoll").innerText = student.roll;
    
    calculateAndShowStats();
    createStudentChart();
    showStudentAttendance();
});

function calculateAndShowStats() {
    if (!student) return;
    let total = 0;
    let present = 0;
    
    if (student.attendance) {
        total = Object.keys(student.attendance).length;
        present = Object.values(student.attendance).filter(s => s === "Present").length;
    }
    
    let absent = total - present;
    let percent = total === 0 ? 0 : Math.round((present / total) * 100);
    
    const percentElem = document.getElementById("studentPercent");
    const totalElem = document.getElementById("studentTotal");
    const presentElem = document.getElementById("studentPresent");
    const absentElem = document.getElementById("studentAbsent");
    
    if (percentElem) percentElem.innerText = percent + "%";
    if (totalElem) totalElem.innerText = total;
    if (presentElem) presentElem.innerText = present;
    if (absentElem) absentElem.innerText = absent;
}

function createStudentChart() {
    if (!student) return;
    let total = 0;
    let present = 0;
    
    if (student.attendance) {
        total = Object.keys(student.attendance).length;
        present = Object.values(student.attendance).filter(s => s === "Present").length;
    }
    
    let absent = total - present;
    let ctx = document.getElementById("studentChart");
    if (!ctx) return;
    
    // Destroy existing chart if any
    if (window.studentChartInstance) window.studentChartInstance.destroy();
    
    window.studentChartInstance = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: ["Present", "Absent"],
            datasets: [{ data: [present, absent], backgroundColor: ["#2ecc71", "#e74c3c"] }]
        }
    });
}

function showStudentAttendance() {
    if (!student) return;
    let div = document.getElementById("studentAttendance");
    if (!div) return;
    
    let html = "<h3>Attendance History</h3>";
    html += "<div style='overflow-x:auto;'><table style='width:100%; border-collapse:collapse;'>";
    html += "<tr style='background:#f0f0f0;'><th style='padding:10px; text-align:left;'>Date</th><th style='padding:10px; text-align:left;'>Status</th></tr>";
    
    if (student.attendance && Object.keys(student.attendance).length > 0) {
        let dates = Object.keys(student.attendance).sort().reverse();
        for (let date of dates) {
            let status = student.attendance[date];
            let color = status === "Present" ? "green" : "red";
            html += `<tr>
                        <td style='padding:8px; border-bottom:1px solid #ddd;'>${date}</td>
                        <td style='padding:8px; border-bottom:1px solid #ddd; color:${color}; font-weight:bold;'>${status}</td>
                    </tr>`;
        }
    } else {
        html += `<tr><td colspan='2' style='padding:20px; text-align:center;'>No attendance records found</td></tr>`;
    }
    html += "</table></div>";
    div.innerHTML = html;
}