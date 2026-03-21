// reports.js mein top pe add karo
let students = [];

document.addEventListener('DOMContentLoaded', async () => {
    if (typeof window.loadStudentsFromCloud === 'function') {
        await window.loadStudentsFromCloud();
        students = window.students || [];
    }
    
    loadMonthlyReport();
    loadTopStudents();
    loadLowAttendance();
    loadChart();
    loadSummaryStats();
});
// reports.js - Professional Reports Module

let students = JSON.parse(localStorage.getItem("students")) || [];

// ===============================
// Helper Functions
// ===============================
function getAttendancePercent(student) {
    if (!student.attendance) return 0;
    
    let total = Object.keys(student.attendance).length;
    if (total === 0) return 0;
    
    let present = Object.values(student.attendance).filter(status => status === "Present").length;
    return Math.round((present / total) * 100);
}

function getTotalClasses() {
    let allDates = new Set();
    students.forEach(student => {
        if (student.attendance) {
            Object.keys(student.attendance).forEach(date => allDates.add(date));
        }
    });
    return allDates.size;
}

// ===============================
// Monthly Report
// ===============================
function loadMonthlyReport() {
    let table = document.getElementById("monthlyReport");
    if (!table) return;
    
    table.innerHTML = "";
    let totalClasses = getTotalClasses();
    
    students.forEach(student => {
        let percent = getAttendancePercent(student);
        let presentCount = student.attendance ? 
            Object.values(student.attendance).filter(s => s === "Present").length : 0;
        
        let statusClass = percent >= 75 ? "high-attendance" : percent >= 50 ? "medium-attendance" : "low-attendance";
        let statusText = percent >= 75 ? "Good" : percent >= 50 ? "Needs Improvement" : "Critical";
        
        table.innerHTML += `
            <tr class="${statusClass}">
                <td><strong>${escapeHtml(student.name)}</strong><br><small>Roll: ${student.roll}</small></td>
                <td>
                    <div class="stat-circle" style="--percent: ${percent}">
                        <span>${percent}%</span>
                    </div>
                </td>
                <td>${presentCount}/${totalClasses}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            </tr>
        `;
    });
    
    if (students.length === 0) {
        table.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 40px;">No data available</td></tr>';
    }
}

// ===============================
// Top Students
// ===============================
function loadTopStudents() {
    let list = document.getElementById("topStudents");
    if (!list) return;
    
    list.innerHTML = "";
    let sorted = [...students].sort((a, b) => getAttendancePercent(b) - getAttendancePercent(a));
    
    sorted.slice(0, 5).forEach((student, index) => {
        let percent = getAttendancePercent(student);
        let medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "📌";
        
        list.innerHTML += `
            <li class="top-student">
                <span class="medal">${medal}</span>
                <div class="student-info">
                    <strong>${escapeHtml(student.name)}</strong>
                    <small>Roll: ${student.roll}</small>
                </div>
                <span class="percent">${percent}%</span>
                <div class="mini-progress">
                    <div class="mini-fill" style="width: ${percent}%"></div>
                </div>
            </li>
        `;
    });
}

// ===============================
// Low Attendance
// ===============================
function loadLowAttendance() {
    let list = document.getElementById("lowAttendance");
    if (!list) return;
    
    list.innerHTML = "";
    let lowStudents = students.filter(student => getAttendancePercent(student) < 75);
    
    lowStudents.sort((a, b) => getAttendancePercent(a) - getAttendancePercent(b));
    
    lowStudents.forEach(student => {
        let percent = getAttendancePercent(student);
        let warning = percent < 50 ? "⚠️ Critical" : "⚠️ Warning";
        
        list.innerHTML += `
            <li class="low-student">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <div class="student-info">
                    <strong>${escapeHtml(student.name)}</strong>
                    <small>Roll: ${student.roll}</small>
                </div>
                <span class="percent ${percent < 50 ? 'critical' : 'warning'}">${percent}%</span>
                <span class="warning-text">${warning}</span>
            </li>
        `;
    });
    
    if (lowStudents.length === 0) {
        list.innerHTML = '<li class="no-warning">🎉 All students have good attendance!</li>';
    }
}

// ===============================
// Chart
// ===============================
let reportChart;

function loadChart() {
    let labels = [];
    let data = [];
    
    students.forEach(student => {
        labels.push(student.name.length > 15 ? student.name.substring(0, 12) + "..." : student.name);
        data.push(getAttendancePercent(student));
    });
    
    let ctx = document.getElementById("reportChart");
    if (!ctx) return;
    
    if (reportChart) {
        reportChart.destroy();
    }
    
    reportChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "Attendance Percentage",
                data: data,
                backgroundColor: data.map(percent => 
                    percent >= 75 ? "#2ecc71" : percent >= 50 ? "#f39c12" : "#e74c3c"
                ),
                borderRadius: 8,
                barPercentage: 0.7,
                categoryPercentage: 0.8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: { size: 12, weight: 'bold' }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let value = context.raw;
                            return `Attendance: ${value}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: '#eef2f6'
                    },
                    title: {
                        display: true,
                        text: 'Attendance Percentage (%)',
                        font: { size: 12 }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });
}

// ===============================
// Summary Statistics
// ===============================
function loadSummaryStats() {
    let totalStudents = students.length;
    let totalClasses = getTotalClasses();
    let avgAttendance = totalStudents === 0 ? 0 : 
        Math.round(students.reduce((sum, s) => sum + getAttendancePercent(s), 0) / totalStudents);
    let highAttendance = students.filter(s => getAttendancePercent(s) >= 75).length;
    let criticalAttendance = students.filter(s => getAttendancePercent(s) < 50).length;
    
    if (document.getElementById("totalStudentsStat")) {
        document.getElementById("totalStudentsStat").innerText = totalStudents;
    }
    if (document.getElementById("totalClassesStat")) {
        document.getElementById("totalClassesStat").innerText = totalClasses;
    }
    if (document.getElementById("avgAttendanceStat")) {
        document.getElementById("avgAttendanceStat").innerText = avgAttendance + "%";
    }
    if (document.getElementById("highAttendanceStat")) {
        document.getElementById("highAttendanceStat").innerText = highAttendance;
    }
    if (document.getElementById("criticalAttendanceStat")) {
        document.getElementById("criticalAttendanceStat").innerText = criticalAttendance;
    }
}

// ===============================
// Export Report
// ===============================
function exportReport() {
    let reportData = [];
    
    students.forEach(student => {
        reportData.push({
            Name: student.name,
            Roll: student.roll,
            AttendancePercentage: getAttendancePercent(student),
            Status: getAttendancePercent(student) >= 75 ? "Good" : getAttendancePercent(student) >= 50 ? "Needs Improvement" : "Critical"
        });
    });
    
    let csv = "Name,Roll Number,Attendance Percentage,Status\n";
    reportData.forEach(row => {
        csv += `"${row.Name}",${row.Roll},${row.AttendancePercentage},${row.Status}\n`;
    });
    
    let blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    let url = URL.createObjectURL(blob);
    let a = document.createElement("a");
    a.href = url;
    a.download = `attendance_report_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification("Report exported successfully", "success");
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification-toast notification-${type}`;
    notification.innerHTML = `<i class="fa-solid fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i><span>${message}</span>`;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#2ecc71' : '#3498db'};
        color: white;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = "slideOut 0.3s ease-out";
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add styles for reports
const reportStyles = document.createElement('style');
reportStyles.textContent = `
    .stat-circle {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: conic-gradient(#2ecc71 0% var(--percent, 0%), #eef2f6 var(--percent, 0%) 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
    }
    
    .stat-circle span {
        background: white;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.8rem;
        font-weight: bold;
    }
    
    .status-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
    }
    
    .status-badge.high-attendance { background: #e8f5e9; color: #2ecc71; }
    .status-badge.medium-attendance { background: #fff3e0; color: #f39c12; }
    .status-badge.low-attendance { background: #ffebee; color: #e74c3c; }
    
    .top-student, .low-student {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border-bottom: 1px solid #eef2f6;
    }
    
    .top-student .medal { font-size: 1.2rem; width: 32px; }
    .student-info { flex: 1; }
    .student-info strong { display: block; font-size: 0.9rem; }
    .student-info small { font-size: 0.7rem; color: #95a5a6; }
    .percent { font-weight: bold; min-width: 50px; }
    .percent.warning { color: #f39c12; }
    .percent.critical { color: #e74c3c; }
    
    .mini-progress {
        width: 80px;
        height: 6px;
        background: #eef2f6;
        border-radius: 3px;
        overflow: hidden;
    }
    
    .mini-fill {
        height: 100%;
        background: #2ecc71;
        border-radius: 3px;
        transition: width 0.3s ease;
    }
    
    .warning-text {
        font-size: 0.7rem;
        padding: 2px 8px;
        border-radius: 12px;
        background: #ffebee;
        color: #e74c3c;
    }
    
    .no-warning {
        text-align: center;
        padding: 20px;
        color: #2ecc71;
    }
`;
document.head.appendChild(reportStyles);

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
    loadMonthlyReport();
    loadTopStudents();
    loadLowAttendance();
    loadChart();
    loadSummaryStats();
});